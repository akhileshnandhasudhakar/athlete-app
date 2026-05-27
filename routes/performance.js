const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET all measurement types (optionally filtered by sport)
router.get('/measurement-types', auth, async (req, res) => {
  try {
    const { sport_id, universal } = req.query;
    let query, params;

    if (universal === 'true') {
      query = `SELECT * FROM measurement_types WHERE sport_id IS NULL ORDER BY category, name`;
      params = [];
    } else if (sport_id) {
      query = `
        SELECT * FROM measurement_types
        WHERE sport_id = $1 OR sport_id IS NULL
        ORDER BY sport_id NULLS LAST, category, name
      `;
      params = [sport_id];
    } else {
      query = `SELECT * FROM measurement_types ORDER BY category, name`;
      params = [];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET all performance logs for the logged-in user
router.get('/logs', auth, async (req, res) => {
  try {
    const { measurement_type_id, range } = req.query;
    let dateFilter = '';
    const params = [req.user.id];

    if (range) {
      const days = parseInt(range);
      dateFilter = `AND pl.logged_at >= NOW() - INTERVAL '${days} days'`;
    }

    let typeFilter = '';
    if (measurement_type_id) {
      params.push(measurement_type_id);
      typeFilter = `AND pl.measurement_type_id = $${params.length}`;
    }

    const result = await pool.query(`
      SELECT
        pl.id,
        pl.value,
        pl.unit,
        pl.notes,
        pl.logged_at,
        pl.created_at,
        mt.name AS measurement_name,
        mt.category,
        mt.unit AS default_unit,
        mt.lower_is_better
      FROM performance_logs pl
      JOIN measurement_types mt ON pl.measurement_type_id = mt.id
      WHERE pl.user_id = $1
      ${dateFilter}
      ${typeFilter}
      ORDER BY pl.logged_at DESC, pl.created_at DESC
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET personal records (best value per measurement type)
router.get('/records', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ON (pl.measurement_type_id)
        pl.id,
        pl.measurement_type_id,
        pl.value,
        pl.unit,
        pl.logged_at,
        mt.name AS measurement_name,
        mt.category,
        mt.unit AS default_unit,
        mt.lower_is_better
      FROM performance_logs pl
      JOIN measurement_types mt ON pl.measurement_type_id = mt.id
      WHERE pl.user_id = $1
      ORDER BY
        pl.measurement_type_id,
        CASE WHEN mt.lower_is_better THEN pl.value END ASC,
        CASE WHEN NOT mt.lower_is_better THEN pl.value END DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET progress chart data for a single measurement type
router.get('/progress/:measurement_type_id', auth, async (req, res) => {
  try {
    const { measurement_type_id } = req.params;
    const { range } = req.query;
    const params = [req.user.id, measurement_type_id];
    let dateFilter = '';

    if (range) {
      const days = parseInt(range);
      dateFilter = `AND pl.logged_at >= NOW() - INTERVAL '${days} days'`;
    }

    const result = await pool.query(`
      SELECT
        pl.value,
        pl.unit,
        pl.logged_at,
        mt.name AS measurement_name,
        mt.lower_is_better
      FROM performance_logs pl
      JOIN measurement_types mt ON pl.measurement_type_id = mt.id
      WHERE pl.user_id = $1 AND pl.measurement_type_id = $2
      ${dateFilter}
      ORDER BY pl.logged_at ASC
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST a new performance log entry
router.post('/logs', auth, async (req, res) => {
  try {
    const { measurement_type_id, value, unit, notes, logged_at } = req.body;

    if (!measurement_type_id || value === undefined) {
      return res.status(400).json({ error: 'measurement_type_id and value are required' });
    }

    const result = await pool.query(`
      INSERT INTO performance_logs (user_id, measurement_type_id, value, unit, notes, logged_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [req.user.id, measurement_type_id, value, unit, notes, logged_at || new Date()]);

    const prCheck = await pool.query(`
      SELECT mt.lower_is_better,
        CASE
          WHEN mt.lower_is_better THEN (
            SELECT MIN(value) FROM performance_logs
            WHERE user_id = $1 AND measurement_type_id = $2
          )
          ELSE (
            SELECT MAX(value) FROM performance_logs
            WHERE user_id = $1 AND measurement_type_id = $2
          )
        END AS best_value
      FROM measurement_types mt WHERE mt.id = $2
    `, [req.user.id, measurement_type_id]);

    const isPR = prCheck.rows[0] &&
      parseFloat(prCheck.rows[0].best_value) === parseFloat(value);

    res.status(201).json({ ...result.rows[0], is_pr: isPR });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET PR history — logs that set a new best at the time of logging
router.get('/pr-history', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      WITH ordered AS (
        SELECT
          pl.*,
          mt.name     AS measurement_name,
          mt.category,
          mt.unit     AS default_unit,
          mt.lower_is_better,
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
      SELECT measurement_name, category, value, default_unit, lower_is_better, logged_at
      FROM ordered
      WHERE value = running_best
      ORDER BY logged_at DESC
      LIMIT 50
    `, [req.user.id])
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET body metrics progress (category = 'body')
router.get('/body-metrics', auth, async (req, res) => {
  try {
    const { rows: types } = await pool.query(
      `SELECT * FROM measurement_types WHERE category = 'body' ORDER BY name`,
      []
    )
    res.json(types)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE a performance log entry
router.delete('/logs/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      DELETE FROM performance_logs
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [req.params.id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Log not found' });
    }

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
