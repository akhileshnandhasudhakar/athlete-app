const express = require('express')
const router = express.Router()
const pool = require('../db')
const auth = require('../middleware/auth')

// GET /dashboard/summary — aggregated data for the home screen
router.get('/summary', auth, async (req, res) => {
  const userId = req.user.id
  const today = new Date().toISOString().slice(0, 10)

  // Monday of the current week
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() + diff)
  const weekStartStr = weekStart.toISOString().slice(0, 10)

  try {
    const [weekRes, streakRes, nutrRes, wearableRes, prsRes, goalsRes, goalsCountRes] = await Promise.all([

      // Workouts this week
      pool.query(
        `SELECT COUNT(*)::int AS count FROM workouts
         WHERE user_id = $1 AND workout_date >= $2`,
        [userId, weekStartStr]
      ),

      // Workout streak (consecutive days with at least one workout, ending today or yesterday)
      pool.query(`
        WITH days AS (
          SELECT DISTINCT workout_date::date AS d
          FROM workouts WHERE user_id = $1 AND workout_date <= CURRENT_DATE
        ),
        numbered AS (
          SELECT d,
            (EXTRACT(EPOCH FROM d)::bigint / 86400) -
            ROW_NUMBER() OVER (ORDER BY d ASC) AS grp
          FROM days
        ),
        anchor AS (
          SELECT grp FROM numbered
          WHERE d >= CURRENT_DATE - INTERVAL '1 day'
          ORDER BY d DESC LIMIT 1
        )
        SELECT COALESCE(
          (SELECT COUNT(*)::int FROM numbered WHERE grp = (SELECT grp FROM anchor)),
          0
        ) AS streak
      `, [userId]),

      // Today's nutrition totals
      pool.query(`
        SELECT
          COALESCE(SUM(mi.calories),  0)::int     AS calories,
          COALESCE(SUM(mi.protein_g), 0)::numeric AS protein,
          COALESCE(SUM(mi.carbs_g),   0)::numeric AS carbs,
          COALESCE(SUM(mi.fats_g),    0)::numeric AS fats
        FROM meals m
        JOIN meal_items mi ON mi.meal_id = m.id
        WHERE m.user_id = $1 AND m.date = $2
      `, [userId, today]),

      // Today's wearable stats
      pool.query(`
        SELECT steps, sleep_hours, heart_rate_avg
        FROM wearable_data
        WHERE user_id = $1 AND date = $2
        ORDER BY synced_at DESC LIMIT 1
      `, [userId, today]),

      // Recent PRs (last 90 days) using running best window function
      pool.query(`
        WITH ordered AS (
          SELECT
            pl.*,
            mt.name  AS measurement_name,
            mt.lower_is_better,
            mt.unit  AS default_unit,
            CASE WHEN mt.lower_is_better
              THEN MIN(pl.value) OVER (
                PARTITION BY pl.measurement_type_id
                ORDER BY pl.logged_at ASC, pl.id ASC
                ROWS UNBOUNDED PRECEDING)
              ELSE MAX(pl.value) OVER (
                PARTITION BY pl.measurement_type_id
                ORDER BY pl.logged_at ASC, pl.id ASC
                ROWS UNBOUNDED PRECEDING)
            END AS running_best
          FROM performance_logs pl
          JOIN measurement_types mt ON pl.measurement_type_id = mt.id
          WHERE pl.user_id = $1
        )
        SELECT measurement_name, value, default_unit, lower_is_better, logged_at
        FROM ordered
        WHERE value = running_best
          AND logged_at >= CURRENT_DATE - INTERVAL '90 days'
        ORDER BY logged_at DESC
        LIMIT 5
      `, [userId]),

      // Active goals with progress
      pool.query(`
        SELECT
          g.*,
          mt.name  AS measurement_name,
          mt.unit  AS measurement_unit,
          mt.lower_is_better,
          (
            SELECT value FROM performance_logs
            WHERE user_id = g.user_id AND measurement_type_id = g.measurement_type_id
            ORDER BY logged_at DESC LIMIT 1
          ) AS current_value
        FROM athlete_goals g
        LEFT JOIN measurement_types mt ON g.measurement_type_id = mt.id
        WHERE g.user_id = $1 AND g.completed_at IS NULL
        ORDER BY g.target_date ASC NULLS LAST
        LIMIT 4
      `, [userId]),

      // Total goal counts for badge
      pool.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::int AS completed
         FROM athlete_goals WHERE user_id = $1`,
        [userId]
      )
    ])

    // Nutrition goals
    let nutritionGoals = null
    try {
      const { rows } = await pool.query(
        `SELECT * FROM nutrition_goals WHERE user_id = $1`, [userId]
      )
      nutritionGoals = rows[0] || null
    } catch {}

    res.json({
      workouts_this_week: weekRes.rows[0]?.count ?? 0,
      streak:             streakRes.rows[0]?.streak ?? 0,
      today_nutrition:    nutrRes.rows[0] || { calories: 0, protein: 0, carbs: 0, fats: 0 },
      nutrition_goals:    nutritionGoals,
      today_wearable:     wearableRes.rows[0] || null,
      recent_prs:         prsRes.rows,
      active_goals:       goalsRes.rows,
      goals_count:        goalsCountRes.rows[0]
    })
  } catch (err) {
    console.error('Dashboard summary error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
