// routes/nutrition.js
// Mount in app.js: app.use('/nutrition', require('./routes/nutrition'));
//                  app.use('/foods',     require('./routes/nutrition').foodRouter);

const express = require('express');
const router  = express.Router();
const pool    = require('../db');            // your existing pg Pool export
const auth    = require('../middleware/auth'); // your existing JWT middleware
const fetch   = (...args) => import('node-fetch').then(({ default: f }) => f(...args));

router.use(auth); // all nutrition routes require login

// ─────────────────────────────────────────────
// NUTRITION GOALS
// ─────────────────────────────────────────────

// GET /nutrition/goals
router.get('/goals', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM nutrition_goals WHERE user_id = $1',
      [req.user.id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /nutrition/goals  (creates or fully replaces)
router.post('/goals', async (req, res) => {
  const { daily_calories, protein_g, carbs_g, fats_g } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO nutrition_goals (user_id, daily_calories, protein_g, carbs_g, fats_g, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET daily_calories = EXCLUDED.daily_calories,
             protein_g      = EXCLUDED.protein_g,
             carbs_g        = EXCLUDED.carbs_g,
             fats_g         = EXCLUDED.fats_g,
             updated_at     = NOW()
       RETURNING *`,
      [req.user.id, daily_calories, protein_g, carbs_g, fats_g]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// MEALS
// ─────────────────────────────────────────────

// GET /nutrition/meals?date=YYYY-MM-DD
router.get('/meals', async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  try {
    // Fetch meals with their items in one round-trip using JSON aggregation
    const { rows } = await pool.query(
      `SELECT
         m.id, m.date, m.meal_type, m.notes, m.created_at,
         COALESCE(
           JSON_AGG(
             JSON_BUILD_OBJECT(
               'id',        mi.id,
               'food_name', mi.food_name,
               'calories',  mi.calories,
               'protein_g', mi.protein_g,
               'carbs_g',   mi.carbs_g,
               'fats_g',    mi.fats_g,
               'quantity',  mi.quantity,
               'unit',      mi.unit
             ) ORDER BY mi.id
           ) FILTER (WHERE mi.id IS NOT NULL),
           '[]'
         ) AS items
       FROM meals m
       LEFT JOIN meal_items mi ON mi.meal_id = m.id
       WHERE m.user_id = $1 AND m.date = $2
       GROUP BY m.id
       ORDER BY m.created_at`,
      [req.user.id, date]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /nutrition/meals
// Body: { date, meal_type, notes, items: [{food_name, calories, protein_g, carbs_g, fats_g, quantity, unit}] }
router.post('/meals', async (req, res) => {
  const { date, meal_type, notes, items = [] } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [meal] } = await client.query(
      `INSERT INTO meals (user_id, date, meal_type, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, date || new Date().toISOString().slice(0, 10), meal_type, notes]
    );

    const savedItems = [];
    for (const item of items) {
      const { rows: [mi] } = await client.query(
        `INSERT INTO meal_items (meal_id, food_name, calories, protein_g, carbs_g, fats_g, quantity, unit)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [meal.id, item.food_name, item.calories, item.protein_g, item.carbs_g, item.fats_g,
         item.quantity ?? 1, item.unit]
      );
      savedItems.push(mi);
    }

    await client.query('COMMIT');
    res.status(201).json({ ...meal, items: savedItems });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

// DELETE /nutrition/meals/:id
router.delete('/meals/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM meals WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Meal not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// DAILY SUMMARY
// ─────────────────────────────────────────────

// GET /nutrition/summary?date=YYYY-MM-DD
router.get('/summary', async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  try {
    const [goalsRes, totalsRes] = await Promise.all([
      pool.query('SELECT * FROM nutrition_goals WHERE user_id = $1', [req.user.id]),
      pool.query(
        `SELECT
           COALESCE(SUM(mi.calories  * mi.quantity), 0) AS total_calories,
           COALESCE(SUM(mi.protein_g * mi.quantity), 0) AS total_protein,
           COALESCE(SUM(mi.carbs_g   * mi.quantity), 0) AS total_carbs,
           COALESCE(SUM(mi.fats_g    * mi.quantity), 0) AS total_fats
         FROM meals m
         JOIN meal_items mi ON mi.meal_id = m.id
         WHERE m.user_id = $1 AND m.date = $2`,
        [req.user.id, date]
      )
    ]);

    res.json({
      date,
      goals:  goalsRes.rows[0]  || null,
      totals: totalsRes.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// FOOD SEARCH  (Open Food Facts)
// Mounted separately as foodRouter
// ─────────────────────────────────────────────

const foodRouter = express.Router();
foodRouter.use(auth);

// GET /foods/search?q=chicken+breast&page=1
foodRouter.get('/search', async (req, res) => {
  const { q = '', page = 1 } = req.query;
  if (!q.trim()) return res.json({ products: [] });

  try {
    const url =
      `https://world.openfoodfacts.org/cgi/search.pl` +
      `?search_terms=${encodeURIComponent(q)}` +
      `&search_simple=1&action=process&json=1` +
      `&page=${page}&page_size=10` +
      `&fields=id,product_name,brands,nutriments,serving_size,image_small_url`;

    const offRes  = await fetch(url, { headers: { 'User-Agent': 'AthleteApp/1.0' } });
    const offData = await offRes.json();

    const products = (offData.products || []).map(p => ({
      id:         p.id,
      name:       p.product_name || 'Unknown',
      brand:      p.brands || '',
      serving:    p.serving_size || '100g',
      image:      p.image_small_url || null,
      per100g: {
        calories: p.nutriments?.['energy-kcal_100g'] ?? null,
        protein:  p.nutriments?.proteins_100g        ?? null,
        carbs:    p.nutriments?.carbohydrates_100g   ?? null,
        fats:     p.nutriments?.fat_100g             ?? null,
      }
    }));

    res.json({ products });
  } catch (err) {
    console.error('OFF search error:', err);
    res.status(502).json({ error: 'Food search unavailable' });
  }
});

module.exports = router;
module.exports.foodRouter = foodRouter;
