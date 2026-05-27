-- =============================================
-- SEED: UNIVERSAL MEASUREMENTS (sport_id = NULL)
-- =============================================

-- POWER
INSERT INTO measurement_types (name, category, unit, unit_alt, lower_is_better, sport_id) VALUES
('Vertical Jump', 'power', 'inches', 'cm', false, NULL),
('Broad Jump', 'power', 'inches', 'cm', false, NULL),
('Medicine Ball Throw', 'power', 'ft', 'm', false, NULL);

-- SPEED & AGILITY
INSERT INTO measurement_types (name, category, unit, lower_is_better, sport_id) VALUES
('40-Yard Dash', 'speed', 'seconds', true, NULL),
('10-Yard Split', 'speed', 'seconds', true, NULL),
('20-Yard Split', 'speed', 'seconds', true, NULL),
('5-10-5 Pro Agility', 'speed', 'seconds', true, NULL),
('L-Drill', 'speed', 'seconds', true, NULL),
('3-Cone Drill', 'speed', 'seconds', true, NULL);

-- STRENGTH
INSERT INTO measurement_types (name, category, unit, unit_alt, lower_is_better, sport_id) VALUES
('1RM Bench Press', 'strength', 'lbs', 'kg', false, NULL),
('1RM Squat', 'strength', 'lbs', 'kg', false, NULL),
('1RM Deadlift', 'strength', 'lbs', 'kg', false, NULL);

INSERT INTO measurement_types (name, category, unit, lower_is_better, sport_id) VALUES
('Max Pull-ups', 'strength', 'reps', false, NULL),
('Max Push-ups', 'strength', 'reps', false, NULL),
('Grip Strength', 'strength', 'kg', false, NULL);

-- ENDURANCE
INSERT INTO measurement_types (name, category, unit, lower_is_better, sport_id) VALUES
('1-Mile Run', 'endurance', 'min:sec', true, NULL),
('VO2 Max', 'endurance', 'ml/kg/min', false, NULL),
('Beep Test Level', 'endurance', 'level', false, NULL),
('Yo-Yo Test Level', 'endurance', 'level', false, NULL);

-- BODY COMPOSITION
INSERT INTO measurement_types (name, category, unit, unit_alt, lower_is_better, sport_id) VALUES
('Body Weight', 'body', 'lbs', 'kg', false, NULL),
('Body Fat %', 'body', '%', NULL, false, NULL),
('Chest', 'body', 'inches', 'cm', false, NULL),
('Waist', 'body', 'inches', 'cm', false, NULL),
('Hips', 'body', 'inches', 'cm', false, NULL),
('Arms', 'body', 'inches', 'cm', false, NULL),
('Thighs', 'body', 'inches', 'cm', false, NULL);


-- =============================================
-- SEED: BASKETBALL MEASUREMENTS
-- =============================================
INSERT INTO measurement_types (name, category, unit, unit_alt, lower_is_better, sport_id) VALUES
('Standing Reach', 'athleticism', 'inches', 'cm', false, (SELECT id FROM session_types WHERE name = 'Basketball' AND user_id IS NULL LIMIT 1)),
('Wingspan', 'athleticism', 'inches', 'cm', false, (SELECT id FROM session_types WHERE name = 'Basketball' AND user_id IS NULL LIMIT 1)),
('Hand Length', 'athleticism', 'inches', 'cm', false, (SELECT id FROM session_types WHERE name = 'Basketball' AND user_id IS NULL LIMIT 1)),
('Hand Width', 'athleticism', 'inches', 'cm', false, (SELECT id FROM session_types WHERE name = 'Basketball' AND user_id IS NULL LIMIT 1)),
('No-Step Vertical', 'power', 'inches', 'cm', false, (SELECT id FROM session_types WHERE name = 'Basketball' AND user_id IS NULL LIMIT 1)),
('Max Verticals in Session', 'power', 'count', NULL, false, (SELECT id FROM session_types WHERE name = 'Basketball' AND user_id IS NULL LIMIT 1));

INSERT INTO measurement_types (name, category, unit, lower_is_better, sport_id) VALUES
('Lane Agility Drill', 'speed', 'seconds', true, (SELECT id FROM session_types WHERE name = 'Basketball' AND user_id IS NULL LIMIT 1)),
('3/4 Court Sprint', 'speed', 'seconds', true, (SELECT id FROM session_types WHERE name = 'Basketball' AND user_id IS NULL LIMIT 1)),
('Full Court Sprint', 'speed', 'seconds', true, (SELECT id FROM session_types WHERE name = 'Basketball' AND user_id IS NULL LIMIT 1)),
('Free Throw %', 'shooting', '%', false, (SELECT id FROM session_types WHERE name = 'Basketball' AND user_id IS NULL LIMIT 1)),
('3-Point %', 'shooting', '%', false, (SELECT id FROM session_types WHERE name = 'Basketball' AND user_id IS NULL LIMIT 1)),
('Field Goal %', 'shooting', '%', false, (SELECT id FROM session_types WHERE name = 'Basketball' AND user_id IS NULL LIMIT 1));


-- =============================================
-- SEED: BASEBALL MEASUREMENTS
-- =============================================
INSERT INTO measurement_types (name, category, unit, lower_is_better, sport_id) VALUES
('Exit Velocity', 'hitting', 'mph', false, (SELECT id FROM session_types WHERE name = 'Baseball' AND user_id IS NULL LIMIT 1)),
('Batting Average', 'hitting', 'avg', false, (SELECT id FROM session_types WHERE name = 'Baseball' AND user_id IS NULL LIMIT 1)),
('On-Base %', 'hitting', '%', false, (SELECT id FROM session_types WHERE name = 'Baseball' AND user_id IS NULL LIMIT 1)),
('Slugging %', 'hitting', '%', false, (SELECT id FROM session_types WHERE name = 'Baseball' AND user_id IS NULL LIMIT 1)),
('Pitch Velocity', 'pitching', 'mph', false, (SELECT id FROM session_types WHERE name = 'Baseball' AND user_id IS NULL LIMIT 1)),
('Spin Rate', 'pitching', 'rpm', false, (SELECT id FROM session_types WHERE name = 'Baseball' AND user_id IS NULL LIMIT 1)),
('Command Rating', 'pitching', 'rating', false, (SELECT id FROM session_types WHERE name = 'Baseball' AND user_id IS NULL LIMIT 1)),
('Pop Time', 'fielding', 'seconds', true, (SELECT id FROM session_types WHERE name = 'Baseball' AND user_id IS NULL LIMIT 1)),
('Throw Velocity', 'fielding', 'mph', false, (SELECT id FROM session_types WHERE name = 'Baseball' AND user_id IS NULL LIMIT 1)),
('Fielding %', 'fielding', '%', false, (SELECT id FROM session_types WHERE name = 'Baseball' AND user_id IS NULL LIMIT 1));


-- =============================================
-- SEED: FOOTBALL MEASUREMENTS
-- =============================================
INSERT INTO measurement_types (name, category, unit, lower_is_better, sport_id) VALUES
('Bench Press Reps (225lbs)', 'strength', 'reps', false, (SELECT id FROM session_types WHERE name = 'Football' AND user_id IS NULL LIMIT 1)),
('Throw Velocity', 'position', 'mph', false, (SELECT id FROM session_types WHERE name = 'Football' AND user_id IS NULL LIMIT 1)),
('Route Run Time', 'position', 'seconds', true, (SELECT id FROM session_types WHERE name = 'Football' AND user_id IS NULL LIMIT 1)),
('Blocking Efficiency', 'position', 'rating', false, (SELECT id FROM session_types WHERE name = 'Football' AND user_id IS NULL LIMIT 1));


-- =============================================
-- SEED: SOCCER MEASUREMENTS
-- =============================================
INSERT INTO measurement_types (name, category, unit, lower_is_better, sport_id) VALUES
('30m Sprint', 'speed', 'seconds', true, (SELECT id FROM session_types WHERE name = 'Soccer' AND user_id IS NULL LIMIT 1)),
('60m Sprint', 'speed', 'seconds', true, (SELECT id FROM session_types WHERE name = 'Soccer' AND user_id IS NULL LIMIT 1)),
('Shot Velocity', 'technical', 'mph', false, (SELECT id FROM session_types WHERE name = 'Soccer' AND user_id IS NULL LIMIT 1)),
('Passing Accuracy %', 'technical', '%', false, (SELECT id FROM session_types WHERE name = 'Soccer' AND user_id IS NULL LIMIT 1)),
('Dribble Course Time', 'technical', 'seconds', true, (SELECT id FROM session_types WHERE name = 'Soccer' AND user_id IS NULL LIMIT 1));


-- =============================================
-- SEED: CRICKET MEASUREMENTS
-- =============================================
INSERT INTO measurement_types (name, category, unit, lower_is_better, sport_id) VALUES
('Batting Average', 'batting', 'avg', false, (SELECT id FROM session_types WHERE name = 'Cricket' AND user_id IS NULL LIMIT 1)),
('Strike Rate', 'batting', 'rate', false, (SELECT id FROM session_types WHERE name = 'Cricket' AND user_id IS NULL LIMIT 1)),
('Top Score', 'batting', 'runs', false, (SELECT id FROM session_types WHERE name = 'Cricket' AND user_id IS NULL LIMIT 1)),
('Sixes Hit', 'batting', 'count', false, (SELECT id FROM session_types WHERE name = 'Cricket' AND user_id IS NULL LIMIT 1)),
('Fours Hit', 'batting', 'count', false, (SELECT id FROM session_types WHERE name = 'Cricket' AND user_id IS NULL LIMIT 1)),
('Ball Speed Off Bat', 'batting', 'mph', false, (SELECT id FROM session_types WHERE name = 'Cricket' AND user_id IS NULL LIMIT 1)),
('Bowling Average', 'bowling', 'avg', true, (SELECT id FROM session_types WHERE name = 'Cricket' AND user_id IS NULL LIMIT 1)),
('Economy Rate', 'bowling', 'rate', true, (SELECT id FROM session_types WHERE name = 'Cricket' AND user_id IS NULL LIMIT 1)),
('Bowling Speed', 'bowling', 'mph', false, (SELECT id FROM session_types WHERE name = 'Cricket' AND user_id IS NULL LIMIT 1)),
('Spin RPM', 'bowling', 'rpm', false, (SELECT id FROM session_types WHERE name = 'Cricket' AND user_id IS NULL LIMIT 1)),
('Wickets Per Match', 'bowling', 'count', false, (SELECT id FROM session_types WHERE name = 'Cricket' AND user_id IS NULL LIMIT 1)),
('Throw Distance', 'fielding', 'meters', false, (SELECT id FROM session_types WHERE name = 'Cricket' AND user_id IS NULL LIMIT 1)),
('Reaction Time', 'fielding', 'seconds', true, (SELECT id FROM session_types WHERE name = 'Cricket' AND user_id IS NULL LIMIT 1)),
('Catches Taken', 'fielding', 'count', false, (SELECT id FROM session_types WHERE name = 'Cricket' AND user_id IS NULL LIMIT 1)),
('30m Sprint', 'fitness', 'seconds', true, (SELECT id FROM session_types WHERE name = 'Cricket' AND user_id IS NULL LIMIT 1)),
('20m Shuttle Run', 'fitness', 'seconds', true, (SELECT id FROM session_types WHERE name = 'Cricket' AND user_id IS NULL LIMIT 1)),
('Crease-to-Crease Run Time', 'fitness', 'seconds', true, (SELECT id FROM session_types WHERE name = 'Cricket' AND user_id IS NULL LIMIT 1)),
('Wicket-to-Wicket Run Time', 'fitness', 'seconds', true, (SELECT id FROM session_types WHERE name = 'Cricket' AND user_id IS NULL LIMIT 1));
