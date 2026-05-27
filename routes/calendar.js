const express = require('express')
const router = express.Router()
const pool = require('../db')
const auth = require('../middleware/auth')

// GET /calendar?year=2026&month=5
router.get('/', auth, async (req, res) => {
  const year  = parseInt(req.query.year)  || new Date().getFullYear()
  const month = parseInt(req.query.month) || (new Date().getMonth() + 1)
  const userId = req.user.id

  const pad = n => String(n).padStart(2, '0')
  const start = `${year}-${pad(month)}-01`
  // Use first day of next month as exclusive upper bound
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`

  try {
    const [workRes, planRes] = await Promise.all([
      pool.query(`
        SELECT id, workout_date::text AS date, sport, duration_minutes,
          (SELECT COUNT(*) FROM workout_exercises WHERE workout_id = w.id)::int AS exercise_count
        FROM workouts w
        WHERE user_id = $1 AND workout_date >= $2 AND workout_date < $3
        ORDER BY workout_date
      `, [userId, start, nextMonth]),

      pool.query(`
        SELECT id, date::text, sport, notes
        FROM planned_sessions
        WHERE user_id = $1 AND date >= $2 AND date < $3
        ORDER BY date
      `, [userId, start, nextMonth])
    ])

    res.json({ workouts: workRes.rows, planned: planRes.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /calendar/planned — create a planned session
router.post('/planned', auth, async (req, res) => {
  const { date, sport, notes } = req.body
  if (!date) return res.status(400).json({ error: 'Date is required' })
  try {
    const { rows } = await pool.query(
      `INSERT INTO planned_sessions (user_id, date, sport, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, date, sport || null, notes || null]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /calendar/planned/:id
router.delete('/planned/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM planned_sessions WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    )
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' })
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
