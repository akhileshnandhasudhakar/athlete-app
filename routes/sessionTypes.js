// routes/sessionTypes.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

// GET /session-types?sport=Basketball
// Returns global defaults + user's custom types for the given sport
router.get('/', authenticateToken, async (req, res) => {
  const { sport } = req.query;
  const userId = req.user.id;

  try {
    let query, params;

    if (sport) {
      // Return types for the requested sport + General types + user's custom types
      query = `
        SELECT id, sport, name,
               CASE WHEN user_id IS NULL THEN 'default' ELSE 'custom' END AS type
        FROM session_types
        WHERE (sport = $1 OR sport = 'General')
          AND (user_id IS NULL OR user_id = $2)
        ORDER BY
          CASE WHEN user_id IS NULL THEN 0 ELSE 1 END,
          sport,
          name
      `;
      params = [sport, userId];
    } else {
      // Return all types for the user's sport (from profile) + general
      query = `
        SELECT st.id, st.sport, st.name,
               CASE WHEN st.user_id IS NULL THEN 'default' ELSE 'custom' END AS type
        FROM session_types st
        JOIN profiles p ON p.user_id = $1
        WHERE (st.sport = p.sport OR st.sport = 'General')
          AND (st.user_id IS NULL OR st.user_id = $1)
        ORDER BY
          CASE WHEN st.user_id IS NULL THEN 0 ELSE 1 END,
          st.sport,
          st.name
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching session types:', err);
    res.status(500).json({ error: 'Failed to fetch session types' });
  }
});

// POST /session-types
// Create a custom session type for the logged-in user
router.post('/', authenticateToken, async (req, res) => {
  const { sport, name } = req.body;
  const userId = req.user.id;

  if (!sport || !name) {
    return res.status(400).json({ error: 'sport and name are required' });
  }

  if (name.trim().length < 2) {
    return res.status(400).json({ error: 'Session type name must be at least 2 characters' });
  }

  if (name.trim().length > 100) {
    return res.status(400).json({ error: 'Session type name must be under 100 characters' });
  }

  try {
    // Check for duplicate (global or user's own)
    const existing = await pool.query(
      `SELECT id FROM session_types
       WHERE sport = $1 AND LOWER(name) = LOWER($2)
         AND (user_id IS NULL OR user_id = $3)`,
      [sport, name.trim(), userId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A session type with this name already exists for this sport' });
    }

    const result = await pool.query(
      `INSERT INTO session_types (sport, name, user_id)
       VALUES ($1, $2, $3)
       RETURNING id, sport, name, 'custom' AS type`,
      [sport, name.trim(), userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating session type:', err);
    res.status(500).json({ error: 'Failed to create session type' });
  }
});

// DELETE /session-types/:id
// Delete a user's own custom session type
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `DELETE FROM session_types
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session type not found or not yours to delete' });
    }

    res.json({ message: 'Session type deleted', id: result.rows[0].id });
  } catch (err) {
    console.error('Error deleting session type:', err);
    res.status(500).json({ error: 'Failed to delete session type' });
  }
});

module.exports = router;
