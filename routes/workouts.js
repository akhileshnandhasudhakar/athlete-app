const express = require('express')
const router = express.Router()
const db = require('../db')
const axios = require('axios')
const authenticateToken = require('../middleware/auth')

// ── Exercise database cache (free-exercise-db, ~873 exercises) ───────────
const EXERCISE_DB_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
let exerciseCache = []
let cacheExpiry = 0

async function getExerciseDb() {
  if (Date.now() < cacheExpiry && exerciseCache.length) return exerciseCache
  const { data } = await axios.get(EXERCISE_DB_URL, { timeout: 10000 })
  exerciseCache = data.map(e => ({
    name: e.name,
    category: e.category,
    muscles: (e.primaryMuscles || []).join(', '),
  }))
  cacheExpiry = Date.now() + 24 * 3600 * 1000
  return exerciseCache
}
// Pre-warm cache at startup (non-blocking)
getExerciseDb().catch(() => {})

// GET /workouts/exercises/search?q=
router.get('/exercises/search', authenticateToken, async (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase()
  if (q.length < 2) return res.json([])
  try {
    const db = await getExerciseDb()
    const matches = db
      .filter(e => e.name.toLowerCase().includes(q))
      .slice(0, 8)
    res.json(matches)
  } catch (err) {
    console.error('Exercise search error:', err.message)
    res.json([])
  }
})

// POST /workouts — log a new workout
router.post('/', authenticateToken, async (req, res) => {
  const { sport, workout_date, duration_minutes, distance_km, notes, sport_stats, exercises } = req.body
  const user_id = req.user.id

  if (!sport) return res.status(400).json({ error: 'Sport is required' })

  try {
    // Insert the workout session
    const workoutResult = await db.query(
      `INSERT INTO workouts (user_id, sport, workout_date, duration_minutes, distance_km, notes, sport_stats)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        user_id,
        sport,
        workout_date || new Date().toISOString().split('T')[0],
        duration_minutes || null,
        distance_km || null,
        notes || null,
        sport_stats ? JSON.stringify(sport_stats) : '{}'
      ]
    )

    const workout = workoutResult.rows[0]

    // Insert exercises if provided
    if (exercises && exercises.length > 0) {
      for (const ex of exercises) {
        await db.query(
          `INSERT INTO workout_exercises (workout_id, exercise_name, sets, reps, weight_kg)
           VALUES ($1, $2, $3, $4, $5)`,
          [workout.id, ex.exercise_name, ex.sets || null, ex.reps || null, ex.weight_kg || null]
        )
      }
    }

    // Return workout with exercises
    const exercisesResult = await db.query(
      `SELECT * FROM workout_exercises WHERE workout_id = $1`,
      [workout.id]
    )

    res.status(201).json({ workout: { ...workout, exercises: exercisesResult.rows } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to log workout' })
  }
})

// GET /workouts — get all workouts for the logged-in user
router.get('/', authenticateToken, async (req, res) => {
  const user_id = req.user.id

  try {
    const workoutsResult = await db.query(
      `SELECT * FROM workouts WHERE user_id = $1 ORDER BY workout_date DESC, created_at DESC`,
      [user_id]
    )

    // Attach exercises to each workout
    const workouts = await Promise.all(
      workoutsResult.rows.map(async (workout) => {
        const exercisesResult = await db.query(
          `SELECT * FROM workout_exercises WHERE workout_id = $1`,
          [workout.id]
        )
        return { ...workout, exercises: exercisesResult.rows }
      })
    )

    res.json({ workouts })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch workouts' })
  }
})

// ── Analytics helpers ─────────────────────────────────────────────────────
function rangeToInterval(range) {
  return { '7d': '7 days', '30d': '30 days', '90d': '90 days' }[range] || '30 days'
}

// GET /workouts/analytics/volume
router.get('/analytics/volume', authenticateToken, async (req, res) => {
  const interval = rangeToInterval(req.query.range)
  try {
    const { rows } = await db.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('week', w.workout_date), 'YYYY-MM-DD') AS week,
        COUNT(DISTINCT w.id)::int                                  AS sessions,
        COALESCE(SUM(we.sets), 0)::int                            AS total_sets,
        COALESCE(SUM(we.sets * we.reps), 0)::int                  AS total_reps
      FROM workouts w
      LEFT JOIN workout_exercises we ON we.workout_id = w.id
      WHERE w.user_id = $1
        AND w.workout_date >= NOW() - $2::interval
      GROUP BY week
      ORDER BY week
    `, [req.user.id, interval])
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch volume analytics' })
  }
})

// GET /workouts/analytics/strength
router.get('/analytics/strength', authenticateToken, async (req, res) => {
  const interval = rangeToInterval(req.query.range)
  try {
    const { rows: exerciseRows } = await db.query(`
      SELECT DISTINCT we.exercise_name
      FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE w.user_id = $1 AND we.weight_kg IS NOT NULL
      ORDER BY we.exercise_name
    `, [req.user.id])

    let points = []
    if (req.query.exercise) {
      const { rows } = await db.query(`
        SELECT
          w.workout_date::text          AS date,
          MAX(we.weight_kg)::float      AS max_weight
        FROM workouts w
        JOIN workout_exercises we ON we.workout_id = w.id
        WHERE w.user_id = $1
          AND LOWER(we.exercise_name) = LOWER($2)
          AND w.workout_date >= NOW() - $3::interval
          AND we.weight_kg IS NOT NULL
        GROUP BY w.workout_date
        ORDER BY w.workout_date
      `, [req.user.id, req.query.exercise, interval])
      points = rows
    }

    res.json({ exercises: exerciseRows.map(r => r.exercise_name), points })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch strength analytics' })
  }
})

// GET /workouts/analytics/trends
router.get('/analytics/trends', authenticateToken, async (req, res) => {
  const interval = rangeToInterval(req.query.range)
  try {
    const { rows } = await db.query(`
      SELECT
        w.workout_date::text                                  AS date,
        w.duration_minutes,
        COALESCE(SUM(we.sets * we.reps), 0)::int             AS volume,
        COUNT(we.id)::int                                    AS exercises
      FROM workouts w
      LEFT JOIN workout_exercises we ON we.workout_id = w.id
      WHERE w.user_id = $1
        AND w.workout_date >= NOW() - $2::interval
      GROUP BY w.id, w.workout_date, w.duration_minutes
      ORDER BY w.workout_date
    `, [req.user.id, interval])
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch trends analytics' })
  }
})

// GET /workouts/export/csv — download all workouts as CSV
router.get('/export/csv', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        w.workout_date::text,
        w.sport,
        w.duration_minutes,
        w.distance_km,
        w.notes,
        STRING_AGG(
          we.exercise_name ||
          COALESCE(' ' || we.sets::text || 'x' || we.reps::text, '') ||
          COALESCE(' @' || we.weight_kg::text || 'kg', ''),
          '; '
        ) AS exercises
      FROM workouts w
      LEFT JOIN workout_exercises we ON we.workout_id = w.id
      WHERE w.user_id = $1
      GROUP BY w.id, w.workout_date, w.sport, w.duration_minutes, w.distance_km, w.notes
      ORDER BY w.workout_date DESC
    `, [req.user.id])

    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const header = 'Date,Sport,Duration (min),Distance (km),Notes,Exercises\n'
    const csvRows = rows.map(r => [
      r.workout_date,
      escape(r.sport),
      r.duration_minutes ?? '',
      r.distance_km ?? '',
      escape(r.notes),
      escape(r.exercises)
    ].join(','))

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="workout-history.csv"')
    res.send(header + csvRows.join('\n'))
  } catch (err) {
    console.error('CSV export error:', err)
    res.status(500).json({ error: 'Failed to export' })
  }
})

// GET /workouts/:id — get a single workout
router.get('/:id', authenticateToken, async (req, res) => {
  const user_id = req.user.id
  const { id } = req.params

  try {
    const workoutResult = await db.query(
      `SELECT * FROM workouts WHERE id = $1 AND user_id = $2`,
      [id, user_id]
    )

    if (workoutResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workout not found' })
    }

    const workout = workoutResult.rows[0]
    const exercisesResult = await db.query(
      `SELECT * FROM workout_exercises WHERE workout_id = $1`,
      [workout.id]
    )

    res.json({ workout: { ...workout, exercises: exercisesResult.rows } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch workout' })
  }
})

// DELETE /workouts/:id — delete a workout
router.delete('/:id', authenticateToken, async (req, res) => {
  const user_id = req.user.id
  const { id } = req.params

  try {
    const result = await db.query(
      `DELETE FROM workouts WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, user_id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workout not found' })
    }

    res.json({ message: 'Workout deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete workout' })
  }
})

module.exports = router