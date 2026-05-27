require('dotenv').config()
const express = require('express')
const authRoutes = require('./routes/auth')
const profileRoutes = require('./routes/profile')
const workoutRoutes = require('./routes/workouts')
const sessionTypesRoutes = require('./routes/sessionTypes')  // ← add this
const nutritionRouter = require('./routes/nutrition');
const wearablesRouter = require('./routes/wearables');
const performanceRoutes = require('./routes/performance');
const goalsRoutes = require('./routes/goals');
const programsRoutes = require('./routes/programs');
const dashboardRoutes = require('./routes/dashboard');

const app = express()

app.use(express.json())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.send('Welcome to the Athlete App!')
})

app.use('/auth', authRoutes)
app.use('/profile', profileRoutes)
app.use('/workouts', workoutRoutes)
app.use('/session-types', sessionTypesRoutes)                // ← add this
app.use('/nutrition', nutritionRouter);
app.use('/foods',     nutritionRouter.foodRouter);
app.use('/wearables', wearablesRouter);
app.use('/performance', performanceRoutes);
app.use('/goals', goalsRoutes);
app.use('/programs', programsRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/ai', require('./routes/ai'));
app.use('/calendar', require('./routes/calendar'));
app.use('/achievements', require('./routes/achievements'));

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Athlete App is running on port ${PORT}`)
})