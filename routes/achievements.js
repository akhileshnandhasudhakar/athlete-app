const express = require('express')
const router = express.Router()
const pool = require('../db')
const auth = require('../middleware/auth')

// GET /achievements — dynamically computed badge statuses
router.get('/', auth, async (req, res) => {
  const userId = req.user.id
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM workouts WHERE user_id = $1)                                          AS total_workouts,
        (SELECT MIN(workout_date)::text FROM workouts WHERE user_id = $1)                                AS first_workout_date,
        (SELECT COUNT(DISTINCT measurement_type_id)::int FROM performance_logs WHERE user_id = $1)       AS unique_pr_types,
        (SELECT MIN(logged_at)::text FROM performance_logs WHERE user_id = $1)                           AS first_log_date,
        (SELECT COUNT(*)::int FROM athlete_goals WHERE user_id = $1 AND completed_at IS NOT NULL)        AS goals_completed,
        (SELECT COUNT(*)::int FROM meals WHERE user_id = $1)                                             AS total_meals,
        (
          WITH days AS (
            SELECT DISTINCT workout_date::date AS d
            FROM workouts WHERE user_id = $1 AND workout_date <= CURRENT_DATE
          ),
          numbered AS (
            SELECT d, (EXTRACT(EPOCH FROM d)::bigint / 86400) -
              ROW_NUMBER() OVER (ORDER BY d ASC) AS grp
            FROM days
          ),
          anchor AS (
            SELECT grp FROM numbered WHERE d >= CURRENT_DATE - INTERVAL '1 day'
            ORDER BY d DESC LIMIT 1
          )
          SELECT COALESCE(
            (SELECT COUNT(*)::int FROM numbered WHERE grp = (SELECT grp FROM anchor)), 0
          )
        ) AS current_streak,
        (
          SELECT MAX(streak_len) FROM (
            WITH days AS (
              SELECT DISTINCT workout_date::date AS d FROM workouts WHERE user_id = $1
            ),
            numbered AS (
              SELECT d, (EXTRACT(EPOCH FROM d)::bigint / 86400) - ROW_NUMBER() OVER (ORDER BY d) AS grp
              FROM days
            )
            SELECT COUNT(*)::int AS streak_len FROM numbered GROUP BY grp
          ) s
        ) AS best_streak
    `, [userId])

    const s = rows[0]

    const badges = [
      // Training volume
      { id: 'first_workout',  icon: '🏋️', name: 'First Rep',      desc: 'Log your first workout',          earned: s.total_workouts >= 1,   earnedDate: s.first_workout_date },
      { id: 'workouts_10',    icon: '💪',  name: 'Getting Started', desc: '10 workouts logged',             earned: s.total_workouts >= 10  },
      { id: 'workouts_25',    icon: '🔥',  name: 'On Fire',         desc: '25 workouts logged',             earned: s.total_workouts >= 25  },
      { id: 'workouts_50',    icon: '⚡',  name: 'Grinder',         desc: '50 workouts logged',             earned: s.total_workouts >= 50  },
      { id: 'workouts_100',   icon: '🏆',  name: 'Century Club',    desc: '100 workouts logged',            earned: s.total_workouts >= 100 },
      // PRs
      { id: 'first_pr',       icon: '🎯',  name: 'First PR',        desc: 'Log your first performance test', earned: s.unique_pr_types >= 1,  earnedDate: s.first_log_date },
      { id: 'prs_5',          icon: '🚀',  name: 'PR Collector',    desc: 'Track PRs in 5 different metrics', earned: s.unique_pr_types >= 5  },
      { id: 'prs_10',         icon: '💎',  name: 'Elite',           desc: 'Track PRs in 10 different metrics', earned: s.unique_pr_types >= 10 },
      // Streaks
      { id: 'streak_7',       icon: '📅',  name: 'Week Warrior',    desc: '7-day training streak',          earned: s.best_streak >= 7      },
      { id: 'streak_30',      icon: '🌟',  name: 'Iron Discipline', desc: '30-day training streak',         earned: s.best_streak >= 30     },
      // Goals
      { id: 'first_goal',     icon: '✅',  name: 'Goal Getter',     desc: 'Complete your first goal',       earned: s.goals_completed >= 1  },
      { id: 'goals_5',        icon: '🎖️',  name: 'Achiever',        desc: 'Complete 5 goals',               earned: s.goals_completed >= 5  },
      // Nutrition
      { id: 'first_meal',     icon: '🥗',  name: 'Fueled Right',    desc: 'Log your first meal',            earned: s.total_meals >= 1      },
    ]

    res.json({ badges, stats: s })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
