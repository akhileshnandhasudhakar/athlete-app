-- ============================================================
-- Nutrition Logging Tables
-- Run as: psql -U athlete_user -d athlete_app -f nutrition_migration.sql
-- ============================================================

-- Nutrition Goals (one active row per user)
CREATE TABLE IF NOT EXISTS nutrition_goals (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  daily_calories INTEGER,
  protein_g   NUMERIC(6,1),
  carbs_g     NUMERIC(6,1),
  fats_g      NUMERIC(6,1),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)          -- upsert-friendly
);

-- Meals (a logged meal occasion)
CREATE TABLE IF NOT EXISTS meals (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type   VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals (user_id, date);

-- Meal Items (individual food entries within a meal)
CREATE TABLE IF NOT EXISTS meal_items (
  id          SERIAL PRIMARY KEY,
  meal_id     INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  food_name   VARCHAR(200) NOT NULL,
  calories    NUMERIC(7,1),
  protein_g   NUMERIC(6,1),
  carbs_g     NUMERIC(6,1),
  fats_g      NUMERIC(6,1),
  quantity    NUMERIC(7,2) NOT NULL DEFAULT 1,
  unit        VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
