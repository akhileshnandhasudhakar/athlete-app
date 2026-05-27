-- Planned training sessions for the calendar view
CREATE TABLE IF NOT EXISTS planned_sessions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  sport      VARCHAR(100),
  notes      TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planned_sessions_user_date ON planned_sessions(user_id, date);
