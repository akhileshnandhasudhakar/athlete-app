const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

router.post('/', authenticateToken, async (req, res) => {
  const { full_name, sport, age, height_cm, weight_kg } = req.body;
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      'INSERT INTO profiles (user_id, full_name, sport, age, height_cm, weight_kg) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [user_id, full_name, sport, age, height_cm, weight_kg]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  const user_id = req.user.id;

  try {
    const result = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [user_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;