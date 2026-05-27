-- Goals table
CREATE TABLE IF NOT EXISTS athlete_goals (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            VARCHAR(200) NOT NULL,
  measurement_type_id INTEGER REFERENCES measurement_types(id) ON DELETE SET NULL,
  target_value     DECIMAL(10,2),
  target_date      DATE,
  notes            TEXT,
  completed_at     TIMESTAMP,
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_athlete_goals_user ON athlete_goals(user_id);

-- Workout programs
CREATE TABLE IF NOT EXISTS workout_programs (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title            VARCHAR(200) NOT NULL,
  sport            VARCHAR(100),
  days_per_week    INTEGER,
  description      TEXT,
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS program_days (
  id               SERIAL PRIMARY KEY,
  program_id       INTEGER NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
  day_number       INTEGER NOT NULL,
  label            VARCHAR(100),
  exercises        JSONB DEFAULT '[]'
);
