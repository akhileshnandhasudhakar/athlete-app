-- =============================================
-- PERFORMANCE TRACKING TABLES
-- =============================================

-- Measurement type definitions (seeded below)
CREATE TABLE IF NOT EXISTS measurement_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  unit VARCHAR(20),
  unit_alt VARCHAR(20),
  lower_is_better BOOLEAN DEFAULT false,
  sport_id INT REFERENCES session_types(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Athlete performance log entries
CREATE TABLE IF NOT EXISTS performance_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  measurement_type_id INT REFERENCES measurement_types(id) ON DELETE CASCADE,
  value DECIMAL(8,2) NOT NULL,
  unit VARCHAR(20),
  notes TEXT,
  logged_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_logs_user_id ON performance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_logs_measurement_type ON performance_logs(measurement_type_id);
CREATE INDEX IF NOT EXISTS idx_performance_logs_logged_at ON performance_logs(logged_at);