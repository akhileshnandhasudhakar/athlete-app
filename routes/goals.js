const express = require('express')
const router = express.Router()
const pool = require('../db')
const auth = require('../middleware/auth')

// GET all goals with current progress
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        g.*,
        mt.name  AS measurement_name,
        mt.unit  AS measurement_unit,
        mt.lower_is_better,
        (
          SELECT value FROM performance_logs
          WHERE user_id = g.user_id AND measurement_type_id = g.measurement_type_id
          ORDER BY logged_at DESC, created_at DESC LIMIT 1
        ) AS current_value,
        (
          SELECT logged_at FROM performance_logs
          WHERE user_id = g.user_id AND measurement_type_id = g.measurement_type_id
          ORDER BY logged_at DESC, created_at DESC LIMIT 1
        ) AS last_logged_at
      FROM athlete_goals g
      LEFT JOIN measurement_types mt ON g.measurement_type_id = mt.id
      WHERE g.user_id = $1
      ORDER BY g.completed_at NULLS FIRST, g.target_date ASC NULLS LAST, g.created_at DESC
    `, [req.user.id])
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST create a goal
router.post('/', auth, async (req, res) => {
  const { title, measurement_type_id, target_value, target_date, notes } = req.body
  if (!title) return res.status(400).json({ error: 'Title is required' })
  try {
    const { rows } = await pool.query(`
      INSERT INTO athlete_goals (user_id, title, measurement_type_id, target_value, target_date, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [req.user.id, title, measurement_type_id || null, target_value || null, target_date || null, notes || null])
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH toggle goal complete/incomplete
router.patch('/:id/complete', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      UPDATE athlete_goals
      SET completed_at = CASE WHEN completed_at IS NULL THEN NOW() ELSE NULL END
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [req.params.id, req.user.id])
    if (!rows.length) return res.status(404).json({ error: 'Goal not found' })
    res.json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE a goal
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM athlete_goals WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    )
    if (!result.rows.length) return res.status(404).json({ error: 'Goal not found' })
    res.json({ message: 'Deleted' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
