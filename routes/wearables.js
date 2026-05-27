const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../db');
const authenticateToken = require('../middleware/auth');

// ─── GOOGLE HEALTH (covers Fitbit + Google Fit) ───────────────────────────

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
  'https://www.googleapis.com/auth/fitness.nutrition.read',
].join(' ');

// Start Google OAuth flow
router.get('/connect/google', authenticateToken, (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: req.user.id.toString(),
  });
  res.redirect(`${GOOGLE_AUTH_URL}?${params}`);
});

// Google OAuth callback
router.get('/callback/google', async (req, res) => {
  const { code, state } = req.query;
  try {
    const { data } = await axios.post(GOOGLE_TOKEN_URL, {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    });

    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    await pool.query(`
      INSERT INTO wearable_connections 
        (user_id, platform, access_token, refresh_token, expires_at, scope)
      VALUES ($1, 'google', $2, $3, $4, $5)
      ON CONFLICT (user_id, platform) DO UPDATE SET
        access_token = $2, refresh_token = $3,
        expires_at = $4, scope = $5, updated_at = NOW()
    `, [state, data.access_token, data.refresh_token, expiresAt, GOOGLE_SCOPES]);

    res.redirect('/#health?connected=google');
  } catch (err) {
    console.error('Google OAuth error:', err.message);
    res.redirect('/#health?error=google');
  }
});

// ─── GARMIN ───────────────────────────────────────────────────────────────
// Garmin uses OAuth 1.0a — routes will be wired once credentials arrive

router.get('/connect/garmin', authenticateToken, (req, res) => {
  res.json({ message: 'Garmin integration coming soon — awaiting API approval' });
});

// ─── APPLE HEALTH (XML upload) ────────────────────────────────────────────

const multer = require('multer');
const xml2js = require('xml2js');
const upload = multer({ storage: multer.memoryStorage() });

router.post('/import/apple', authenticateToken, upload.single('healthExport'), async (req, res) => {
  try {
    const xml = req.file.buffer.toString('utf8');
    const parsed = await xml2js.parseStringPromise(xml);
    const records = parsed?.HealthData?.Record || [];

    const stepsByDate = {};
    const heartByDate = {};
    const sleepByDate = {};

    for (const r of records) {
      const attr = r.$;
      const date = attr.startDate?.slice(0, 10);
      if (!date) continue;

      if (attr.type === 'HKQuantityTypeIdentifierStepCount') {
        stepsByDate[date] = (stepsByDate[date] || 0) + parseFloat(attr.value || 0);
      }
      if (attr.type === 'HKQuantityTypeIdentifierHeartRate') {
        if (!heartByDate[date]) heartByDate[date] = [];
        heartByDate[date].push(parseFloat(attr.value || 0));
      }
      if (attr.type === 'HKCategoryTypeIdentifierSleepAnalysis') {
        const start = new Date(attr.startDate);
        const end = new Date(attr.endDate);
        const hours = (end - start) / 3600000;
        sleepByDate[date] = (sleepByDate[date] || 0) + hours;
      }
    }

    const dates = new Set([
      ...Object.keys(stepsByDate),
      ...Object.keys(heartByDate),
      ...Object.keys(sleepByDate),
    ]);

    for (const date of dates) {
      const heartArr = heartByDate[date] || [];
      const heartAvg = heartArr.length
        ? Math.round(heartArr.reduce((a, b) => a + b) / heartArr.length)
        : null;
      const heartMax = heartArr.length ? Math.round(Math.max(...heartArr)) : null;

      await pool.query(`
        INSERT INTO wearable_data
          (user_id, platform, date, steps, heart_rate_avg, heart_rate_max, sleep_hours)
        VALUES ($1, 'apple', $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, platform, date) DO UPDATE SET
          steps = $3, heart_rate_avg = $4,
          heart_rate_max = $5, sleep_hours = $6, synced_at = NOW()
      `, [req.user.id, date, stepsByDate[date] || null, heartAvg, heartMax,
          sleepByDate[date] ? sleepByDate[date].toFixed(2) : null]);
    }

    res.json({ message: 'Apple Health data imported', daysImported: dates.size });
  } catch (err) {
    console.error('Apple Health import error:', err.message);
    res.status(500).json({ error: 'Failed to parse Apple Health export' });
  }
});

// ─── GOOGLE FITNESS DATA SYNC ─────────────────────────────────────────────

async function getValidGoogleToken(userId) {
  const { rows } = await pool.query(
    `SELECT access_token, refresh_token, expires_at
     FROM wearable_connections WHERE user_id = $1 AND platform = 'google'`,
    [userId]
  );
  if (!rows.length) throw new Error('Google not connected');

  let { access_token, refresh_token, expires_at } = rows[0];

  if (new Date(expires_at) <= new Date()) {
    const { data } = await axios.post(GOOGLE_TOKEN_URL, {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token,
      grant_type: 'refresh_token',
    });
    access_token = data.access_token;
    const newExpiry = new Date(Date.now() + data.expires_in * 1000);
    await pool.query(
      `UPDATE wearable_connections SET access_token = $1, expires_at = $2, updated_at = NOW()
       WHERE user_id = $3 AND platform = 'google'`,
      [access_token, newExpiry, userId]
    );
  }

  return access_token;
}

router.get('/sync/google', authenticateToken, async (req, res) => {
  try {
    const token = await getValidGoogleToken(req.user.id);

    const days = parseInt(req.query.days) || 7;
    const endMs = Date.now();
    const startMs = endMs - days * 86400000;

    const fitnessUrl = 'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate';
    const headers = { Authorization: `Bearer ${token}` };

    const [stepsRes, heartRes, sleepRes] = await Promise.all([
      axios.post(fitnessUrl, {
        aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startMs,
        endTimeMillis: endMs,
      }, { headers }),
      axios.post(fitnessUrl, {
        aggregateBy: [{ dataTypeName: 'com.google.heart_rate.bpm' }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startMs,
        endTimeMillis: endMs,
      }, { headers }),
      axios.post(fitnessUrl, {
        aggregateBy: [{ dataTypeName: 'com.google.sleep.segment' }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startMs,
        endTimeMillis: endMs,
      }, { headers }),
    ]);

    const byDate = {};

    for (const bucket of stepsRes.data.bucket || []) {
      const date = new Date(parseInt(bucket.startTimeMillis)).toISOString().slice(0, 10);
      const val = bucket.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0;
      if (!byDate[date]) byDate[date] = {};
      byDate[date].steps = val;
    }

    for (const bucket of heartRes.data.bucket || []) {
      const date = new Date(parseInt(bucket.startTimeMillis)).toISOString().slice(0, 10);
      const points = bucket.dataset?.[0]?.point || [];
      if (points.length) {
        const avgs = points.map(p => p.value?.[0]?.fpVal || 0).filter(Boolean);
        const maxs = points.map(p => p.value?.[1]?.fpVal || 0).filter(Boolean);
        if (!byDate[date]) byDate[date] = {};
        byDate[date].heart_rate_avg = avgs.length ? Math.round(avgs.reduce((a, b) => a + b) / avgs.length) : null;
        byDate[date].heart_rate_max = maxs.length ? Math.round(Math.max(...maxs)) : null;
      }
    }

    for (const bucket of sleepRes.data.bucket || []) {
      const date = new Date(parseInt(bucket.startTimeMillis)).toISOString().slice(0, 10);
      const points = bucket.dataset?.[0]?.point || [];
      const totalMs = points.reduce((sum, p) => {
        const end = parseInt(p.endTimeNanos) / 1e6;
        const start = parseInt(p.startTimeNanos) / 1e6;
        return sum + (end - start);
      }, 0);
      if (!byDate[date]) byDate[date] = {};
      byDate[date].sleep_hours = totalMs ? (totalMs / 3600000).toFixed(2) : null;
    }

    for (const [date, d] of Object.entries(byDate)) {
      await pool.query(`
        INSERT INTO wearable_data
          (user_id, platform, date, steps, heart_rate_avg, heart_rate_max, sleep_hours)
        VALUES ($1, 'google', $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, platform, date) DO UPDATE SET
          steps = $3, heart_rate_avg = $4,
          heart_rate_max = $5, sleep_hours = $6, synced_at = NOW()
      `, [req.user.id, date, d.steps || null, d.heart_rate_avg || null,
          d.heart_rate_max || null, d.sleep_hours || null]);
    }

    res.json({ message: 'Google Fitness data synced', daysSynced: Object.keys(byDate).length });
  } catch (err) {
    console.error('Google Fitness sync error:', err.response?.data || err.message);
    const status = err.message === 'Google not connected' ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

// ─── SHARED ───────────────────────────────────────────────────────────────

// Get all connected platforms for current user
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT platform, connected_at, updated_at 
       FROM wearable_connections WHERE user_id = $1`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// Get wearable data for a specific date
router.get('/data', authenticateToken, async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  try {
    const { rows } = await pool.query(
      `SELECT * FROM wearable_data 
       WHERE user_id = $1 AND date = $2
       ORDER BY platform`,
      [req.user.id, date]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch wearable data' });
  }
});

module.exports = router;