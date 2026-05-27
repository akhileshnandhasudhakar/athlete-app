const express = require('express')
const router = express.Router()
const pool = require('../db')
const auth = require('../middleware/auth')

const PRESETS = [
  {
    id: 'preset_0',
    title: '4-Day Basketball Offseason',
    sport: 'Basketball',
    days_per_week: 4,
    description: 'Build explosiveness, vertical jump, and court endurance',
    days: [
      { day_number: 1, label: 'Lower Power', exercises: [
        { name: 'Back Squat', sets: 4, reps: 5, note: 'Heavy — 80-85% 1RM' },
        { name: 'Romanian Deadlift', sets: 3, reps: 8 },
        { name: 'Box Jump', sets: 4, reps: 5 },
        { name: 'Calf Raise', sets: 3, reps: 15 },
      ]},
      { day_number: 2, label: 'Upper Push + Core', exercises: [
        { name: 'Bench Press', sets: 4, reps: 6 },
        { name: 'Overhead Press', sets: 3, reps: 8 },
        { name: 'Tricep Dips', sets: 3, reps: 12 },
        { name: 'Plank', sets: 3, reps: 1, note: '60 sec hold' },
        { name: 'Ab Wheel Rollout', sets: 3, reps: 10 },
      ]},
      { day_number: 3, label: 'Court Conditioning', exercises: [
        { name: 'Shuttle Run', sets: 6, reps: 1, note: '28m, 90 sec rest' },
        { name: 'Jump Rope', sets: 5, reps: 1, note: '2 min' },
        { name: 'Lateral Bound', sets: 4, reps: 10, note: 'Each leg' },
      ]},
      { day_number: 4, label: 'Upper Pull + Vertical', exercises: [
        { name: 'Pull-Up', sets: 4, reps: 8 },
        { name: 'Barbell Row', sets: 3, reps: 8 },
        { name: 'Depth Jump', sets: 4, reps: 5 },
        { name: 'Hang Clean', sets: 3, reps: 5 },
      ]},
    ]
  },
  {
    id: 'preset_1',
    title: '3-Day Full Body Strength',
    sport: 'Weightlifting',
    days_per_week: 3,
    description: 'Classic 3-day compound strength program for intermediate lifters',
    days: [
      { day_number: 1, label: 'Day A', exercises: [
        { name: 'Back Squat', sets: 3, reps: 5 },
        { name: 'Bench Press', sets: 3, reps: 5 },
        { name: 'Deadlift', sets: 1, reps: 5 },
      ]},
      { day_number: 2, label: 'Day B', exercises: [
        { name: 'Back Squat', sets: 3, reps: 5 },
        { name: 'Overhead Press', sets: 3, reps: 5 },
        { name: 'Barbell Row', sets: 3, reps: 5 },
      ]},
      { day_number: 3, label: 'Day C', exercises: [
        { name: 'Back Squat', sets: 3, reps: 5 },
        { name: 'Bench Press', sets: 3, reps: 5 },
        { name: 'Deadlift', sets: 1, reps: 5 },
      ]},
    ]
  },
  {
    id: 'preset_2',
    title: '5-Day Running Plan',
    sport: 'Track & Field',
    days_per_week: 5,
    description: 'Build aerobic base and speed for competitive distance runners',
    days: [
      { day_number: 1, label: 'Easy Run', exercises: [{ name: 'Easy Jog', sets: 1, reps: 1, note: '5-8 km at conversational pace' }] },
      { day_number: 2, label: 'Speed Work', exercises: [
        { name: '400m Repeats', sets: 6, reps: 1, note: '90 sec rest between each' },
        { name: 'Cool-Down Jog', sets: 1, reps: 1, note: '2 km easy' },
      ]},
      { day_number: 3, label: 'Tempo Run', exercises: [{ name: 'Tempo Run', sets: 1, reps: 1, note: '5 km at threshold pace (comfortably hard)' }] },
      { day_number: 4, label: 'Cross Training', exercises: [
        { name: 'Cycling', sets: 1, reps: 1, note: '45 min easy' },
        { name: 'Core Circuit', sets: 3, reps: 15 },
      ]},
      { day_number: 5, label: 'Long Run', exercises: [{ name: 'Long Run', sets: 1, reps: 1, note: '10-15 km at easy pace' }] },
    ]
  },
  {
    id: 'preset_3',
    title: '4-Day Soccer Fitness',
    sport: 'Soccer',
    days_per_week: 4,
    description: 'Sprint speed, change of direction, and 90-minute match endurance',
    days: [
      { day_number: 1, label: 'Speed & Agility', exercises: [
        { name: '30m Sprint Drills', sets: 6, reps: 1, note: 'Max effort, full recovery' },
        { name: 'Cone Agility Course', sets: 5, reps: 1 },
        { name: 'Lateral Shuffle', sets: 4, reps: 20 },
      ]},
      { day_number: 2, label: 'Lower Strength', exercises: [
        { name: 'Back Squat', sets: 4, reps: 8 },
        { name: 'Single-Leg Deadlift', sets: 3, reps: 10, note: 'Each leg' },
        { name: 'Hip Thrust', sets: 3, reps: 12 },
        { name: 'Nordic Hamstring Curl', sets: 3, reps: 6 },
      ]},
      { day_number: 3, label: 'Aerobic Endurance', exercises: [
        { name: '1km Repeats', sets: 5, reps: 1, note: '2 min rest between' },
        { name: 'Cool Down', sets: 1, reps: 1, note: '10 min easy jog' },
      ]},
      { day_number: 4, label: 'Power + Core', exercises: [
        { name: 'Box Jump', sets: 4, reps: 5 },
        { name: 'Medicine Ball Slam', sets: 3, reps: 12 },
        { name: 'Plank', sets: 3, reps: 1, note: '60 sec' },
        { name: 'Russian Twist', sets: 3, reps: 20 },
      ]},
    ]
  }
]

// GET preset programs
router.get('/presets', auth, (req, res) => {
  res.json(PRESETS)
})

// GET user's saved programs
router.get('/', auth, async (req, res) => {
  try {
    const { rows: programs } = await pool.query(
      `SELECT * FROM workout_programs WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    )
    const result = await Promise.all(programs.map(async p => {
      const { rows: days } = await pool.query(
        `SELECT * FROM program_days WHERE program_id = $1 ORDER BY day_number`,
        [p.id]
      )
      return { ...p, days }
    }))
    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST save a program (custom or clone from preset)
router.post('/', auth, async (req, res) => {
  const { title, sport, days_per_week, description, days } = req.body
  if (!title) return res.status(400).json({ error: 'Title required' })
  try {
    const { rows } = await pool.query(
      `INSERT INTO workout_programs (user_id, title, sport, days_per_week, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, title, sport || null, days_per_week || null, description || null]
    )
    const program = rows[0]
    if (days && days.length) {
      for (const d of days) {
        await pool.query(
          `INSERT INTO program_days (program_id, day_number, label, exercises)
           VALUES ($1, $2, $3, $4)`,
          [program.id, d.day_number, d.label || null, JSON.stringify(d.exercises || [])]
        )
      }
    }
    const { rows: savedDays } = await pool.query(
      `SELECT * FROM program_days WHERE program_id = $1 ORDER BY day_number`,
      [program.id]
    )
    res.status(201).json({ ...program, days: savedDays })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE a program
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM workout_programs WHERE id = $1 AND user_id = $2 RETURNING id`,
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
