const express = require('express')
const router = express.Router()
const pool = require('../db')
const auth = require('../middleware/auth')
const axios = require('axios')

const GEMINI_MODEL = 'gemini-2.5-flash'

// Per-user context cache — avoids re-fetching 6 DB queries on every chat message
const contextCache = new Map()
const CONTEXT_TTL = 5 * 60 * 1000 // 5 minutes

function checkKey(res) {
  if (!process.env.GEMINI_API_KEY) {
    res.status(503).json({ error: 'GEMINI_API_KEY not set in .env' })
    return false
  }
  return true
}

async function callGemini(systemText, messages, maxTokens = 500, jsonMode = false) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }))

  const generationConfig = { maxOutputTokens: maxTokens }
  if (jsonMode) generationConfig.responseMimeType = 'application/json'

  const { data } = await axios.post(url, {
    systemInstruction: { parts: [{ text: systemText }] },
    contents,
    generationConfig
  })

  return data.candidates[0].content.parts[0].text
}

// Retries up to 3 times on 429 with exponential backoff
async function callGeminiWithRetry(systemText, messages, maxTokens = 500, jsonMode = false) {
  let delay = 2000
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await callGemini(systemText, messages, maxTokens, jsonMode)
    } catch (err) {
      if (err.response?.status === 429 && attempt < 2) {
        await new Promise(r => setTimeout(r, delay))
        delay *= 2
      } else {
        throw err
      }
    }
  }
}

async function getChatContext(userId) {
  const cached = contextCache.get(userId)
  if (cached && Date.now() - cached.ts < CONTEXT_TTL) return cached.data

  const [profRes, wktRes, prRes, goalRes, wearRes, nutrRes] = await Promise.all([
    pool.query(`SELECT full_name, sport, age, height_cm, weight_kg FROM profiles WHERE user_id = $1`, [userId]),
    pool.query(`
      SELECT w.sport, w.workout_date::text, w.duration_minutes,
        (SELECT COUNT(*) FROM workout_exercises WHERE workout_id = w.id)::int AS exercise_count
      FROM workouts w WHERE user_id = $1 ORDER BY workout_date DESC LIMIT 5
    `, [userId]),
    pool.query(`
      SELECT DISTINCT ON (mt.id) mt.name AS measurement_name, pl.value, mt.unit
      FROM performance_logs pl JOIN measurement_types mt ON mt.id = pl.measurement_type_id
      WHERE pl.user_id = $1 ORDER BY mt.id, pl.logged_at DESC
    `, [userId]),
    pool.query(`
      SELECT ag.title, ag.target_value, ag.target_date::text,
        mt.name AS measurement_name, mt.unit,
        (SELECT pl.value FROM performance_logs pl
         WHERE pl.measurement_type_id = ag.measurement_type_id AND pl.user_id = $1
         ORDER BY pl.logged_at DESC LIMIT 1) AS current_value
      FROM athlete_goals ag
      LEFT JOIN measurement_types mt ON mt.id = ag.measurement_type_id
      WHERE ag.user_id = $1 AND ag.completed_at IS NULL
      ORDER BY ag.target_date ASC NULLS LAST LIMIT 5
    `, [userId]),
    pool.query(`SELECT steps, sleep_hours, heart_rate_avg FROM wearable_data WHERE user_id = $1 ORDER BY date DESC LIMIT 1`, [userId]),
    pool.query(`
      SELECT COALESCE(SUM(mi.calories),0)::int AS calories,
        COALESCE(SUM(mi.protein_g),0)::int AS protein,
        COALESCE(SUM(mi.carbs_g),0)::int AS carbs,
        COALESCE(SUM(mi.fats_g),0)::int AS fats
      FROM meals m JOIN meal_items mi ON mi.meal_id = m.id
      WHERE m.user_id = $1 AND m.date = CURRENT_DATE
    `, [userId])
  ])

  const prof = profRes.rows[0] || {}
  const wear = wearRes.rows[0] || {}
  const nutr = nutrRes.rows[0] || {}

  const wktLines = wktRes.rows.length
    ? wktRes.rows.map(w => `  - ${w.workout_date}: ${w.sport}, ${w.duration_minutes || '?'} min, ${w.exercise_count} exercises`).join('\n')
    : '  - No workouts logged yet'

  const prLines = prRes.rows.length
    ? prRes.rows.map(p => `  - ${p.measurement_name}: ${p.value} ${p.unit || ''}`).join('\n')
    : '  - No performance records yet'

  const goalLines = goalRes.rows.length
    ? goalRes.rows.map(g => {
        const prog = g.current_value && g.target_value
          ? ` (current: ${g.current_value}, target: ${g.target_value} ${g.unit || ''})`
          : ''
        return `  - ${g.title}${prog}${g.target_date ? ', due ' + g.target_date : ''}`
      }).join('\n')
    : '  - No active goals'

  const data = {
    systemText: `You are a personal AI coach for ${prof.full_name || 'this athlete'}, a ${prof.sport || 'multi-sport'} athlete.

ATHLETE PROFILE:
  Sport: ${prof.sport || 'Not specified'}
  Age: ${prof.age || '?'}  Height: ${prof.height_cm ? prof.height_cm + ' cm' : '?'}  Weight: ${prof.weight_kg ? parseFloat(prof.weight_kg).toFixed(1) + ' kg' : '?'}

RECENT WORKOUTS (last 5):
${wktLines}

PERSONAL RECORDS (current bests):
${prLines}

ACTIVE GOALS:
${goalLines}

TODAY:
  Nutrition: ${nutr.calories} kcal | ${nutr.protein}g protein | ${nutr.carbs}g carbs | ${nutr.fats}g fats
  Steps: ${wear.steps ? Number(wear.steps).toLocaleString() : 'no data'} | Sleep: ${wear.sleep_hours || 'no data'} hrs | HR avg: ${wear.heart_rate_avg ? wear.heart_rate_avg + ' bpm' : 'no data'}

Be conversational, specific, and supportive. Reference the athlete's actual data when relevant. Keep responses concise (2-4 sentences unless a detailed breakdown is asked for).`
  }

  contextCache.set(userId, { data, ts: Date.now() })
  return data
}

// ── POST /ai/generate-program ──────────────────────────────────────────────
router.post('/generate-program', auth, async (req, res) => {
  if (!checkKey(res)) return
  const { goal, sport, days_per_week } = req.body
  if (!goal) return res.status(400).json({ error: 'Goal description is required' })

  const systemText = `You are an elite strength and conditioning coach. Generate evidence-based, periodized workout programs.

Respond with ONLY valid JSON matching this exact schema:
{
  "title": "string",
  "description": "string (2-3 sentences on goal and approach)",
  "days_per_week": number,
  "sport": "string",
  "days": [
    {
      "day_number": 1,
      "label": "string (e.g. Lower Power, Upper Push + Core)",
      "exercises": [
        { "name": "string", "sets": number, "reps": number, "note": "string (optional)" }
      ]
    }
  ]
}
Rules: 4-7 exercises per day. Sets 2-5. Reps 1-20. Include load cues, rest periods, or technique notes where helpful.`

  try {
    const text = await callGeminiWithRetry(
      systemText,
      [{ role: 'user', content: `Create a ${days_per_week || 4}-day/week workout program. Goal: ${goal}${sport ? '. Sport: ' + sport : ''}` }],
      2000,
      true
    )
    const program = JSON.parse(text)
    res.json({ program })
  } catch (err) {
    console.error('AI generate-program error:', err.message)
    if (err instanceof SyntaxError) return res.status(500).json({ error: 'AI returned invalid response — try again' })
    res.status(500).json({ error: 'Failed to generate program' })
  }
})

// ── GET /ai/weekly-summary ─────────────────────────────────────────────────
router.get('/weekly-summary', auth, async (req, res) => {
  if (!checkKey(res)) return
  const userId = req.user.id

  try {
    const [wkRes, nutrRes, wearRes, prRes] = await Promise.all([
      pool.query(`
        SELECT sport, workout_date::text, duration_minutes,
          (SELECT COUNT(*) FROM workout_exercises WHERE workout_id = w.id)::int AS exercise_count
        FROM workouts w WHERE user_id = $1 AND workout_date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY workout_date
      `, [userId]),
      pool.query(`
        SELECT m.date::text, COALESCE(SUM(mi.calories),0)::int AS calories
        FROM meals m JOIN meal_items mi ON mi.meal_id = m.id
        WHERE m.user_id = $1 AND m.date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY m.date ORDER BY m.date
      `, [userId]),
      pool.query(`
        SELECT date::text, steps, sleep_hours
        FROM wearable_data WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY date
      `, [userId]),
      pool.query(`
        WITH ordered AS (
          SELECT pl.value, mt.name AS metric, pl.logged_at,
            CASE WHEN mt.lower_is_better
              THEN MIN(pl.value) OVER (PARTITION BY pl.measurement_type_id ORDER BY pl.logged_at ASC ROWS UNBOUNDED PRECEDING)
              ELSE MAX(pl.value) OVER (PARTITION BY pl.measurement_type_id ORDER BY pl.logged_at ASC ROWS UNBOUNDED PRECEDING)
            END AS running_best
          FROM performance_logs pl JOIN measurement_types mt ON mt.id = pl.measurement_type_id
          WHERE pl.user_id = $1
        )
        SELECT metric, value FROM ordered
        WHERE value = running_best AND logged_at >= CURRENT_DATE - INTERVAL '7 days'
      `, [userId])
    ])

    const workouts = wkRes.rows
    const nutr     = nutrRes.rows
    const wearable = wearRes.rows
    const prs      = prRes.rows

    const avgSleep = wearable.length ? (wearable.reduce((s, r) => s + parseFloat(r.sleep_hours || 0), 0) / wearable.length).toFixed(1) : null
    const avgSteps = wearable.length ? Math.round(wearable.reduce((s, r) => s + (r.steps || 0), 0) / wearable.length) : null
    const avgCals  = nutr.length ? Math.round(nutr.reduce((s, r) => s + r.calories, 0) / nutr.length) : null

    const data = `WEEKLY TRAINING REPORT:
Workouts (${workouts.length} sessions):
${workouts.length ? workouts.map(w => `  - ${w.workout_date}: ${w.sport}, ${w.duration_minutes || '?'} min, ${w.exercise_count} exercises`).join('\n') : '  - No workouts logged'}

Performance PRs:
${prs.length ? prs.map(p => `  - New ${p.metric} PR: ${p.value}`).join('\n') : '  - No new PRs'}

Nutrition (${nutr.length} days tracked):
  Average daily calories: ${avgCals ?? 'no data'}

Recovery (${wearable.length} days of wearable data):
  Average sleep: ${avgSleep ?? 'no data'} hrs/night
  Average steps: ${avgSteps ? avgSteps.toLocaleString() : 'no data'}/day`

    const systemText = `You are a personal athletic coach giving a weekly review. Write 3 short paragraphs:
1) Training assessment (quality, volume, what stood out)
2) Recovery & health observations
3) One specific focus for next week
Be direct, specific about numbers, and encouraging. Max 180 words total.`

    const summary = await callGeminiWithRetry(systemText, [{ role: 'user', content: data }], 400)
    res.json({ summary })
  } catch (err) {
    console.error('AI weekly-summary error:', err.message)
    res.status(500).json({ error: 'Failed to generate summary' })
  }
})

// ── GET /ai/exercise-tips?exercise= ───────────────────────────────────────
router.get('/exercise-tips', auth, async (req, res) => {
  if (!checkKey(res)) return
  const { exercise } = req.query
  if (!exercise) return res.status(400).json({ error: 'exercise query param required' })

  try {
    const systemText = 'You are a certified personal trainer. Respond with ONLY a JSON array of exactly 3 short form cue strings (max 12 words each). Example: ["Brace your core throughout the movement","Keep elbows at 45°","Drive through your heels"]. No markdown, no explanation.'
    const text = await callGeminiWithRetry(
      systemText,
      [{ role: 'user', content: `Form cues for: ${exercise}` }],
      200,
      true
    )
    const tips = JSON.parse(text)
    res.json({ tips })
  } catch (err) {
    console.error('AI exercise-tips error:', err.message)
    res.status(500).json({ error: 'Failed to fetch tips' })
  }
})

// ── POST /ai/chat ──────────────────────────────────────────────────────────
router.post('/chat', auth, async (req, res) => {
  if (!checkKey(res)) return
  const { message, history = [] } = req.body
  if (!message) return res.status(400).json({ error: 'Message required' })

  const userId = req.user.id
  try {
    const { systemText } = await getChatContext(userId)
    const messages = [...history.slice(-10), { role: 'user', content: message }]
    const reply = await callGeminiWithRetry(systemText, messages, 500)
    res.json({ reply })
  } catch (err) {
    console.error('AI chat error:', err.message)
    res.status(500).json({ error: 'Failed to get response' })
  }
})

module.exports = router
