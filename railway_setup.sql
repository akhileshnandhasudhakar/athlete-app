--
-- PostgreSQL database dump
--


-- Dumped from database version 15.18 (Homebrew)
-- Dumped by pg_dump version 15.18 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: athlete_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.athlete_goals (
    id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(200) NOT NULL,
    measurement_type_id integer,
    target_value numeric(10,2),
    target_date date,
    notes text,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: athlete_goals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.athlete_goals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: athlete_goals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.athlete_goals_id_seq OWNED BY public.athlete_goals.id;


--
-- Name: meal_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meal_items (
    id integer NOT NULL,
    meal_id integer NOT NULL,
    food_name character varying(200) NOT NULL,
    calories numeric(7,1),
    protein_g numeric(6,1),
    carbs_g numeric(6,1),
    fats_g numeric(6,1),
    quantity numeric(7,2) DEFAULT 1 NOT NULL,
    unit character varying(50),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: meal_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.meal_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: meal_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.meal_items_id_seq OWNED BY public.meal_items.id;


--
-- Name: meals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meals (
    id integer NOT NULL,
    user_id integer NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    meal_type character varying(20) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT meals_meal_type_check CHECK (((meal_type)::text = ANY ((ARRAY['breakfast'::character varying, 'lunch'::character varying, 'dinner'::character varying, 'snack'::character varying])::text[])))
);


--
-- Name: meals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.meals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: meals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.meals_id_seq OWNED BY public.meals.id;


--
-- Name: measurement_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.measurement_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    category character varying(50) NOT NULL,
    unit character varying(20),
    unit_alt character varying(20),
    lower_is_better boolean DEFAULT false,
    sport_id integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: measurement_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.measurement_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: measurement_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.measurement_types_id_seq OWNED BY public.measurement_types.id;


--
-- Name: nutrition_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nutrition_goals (
    id integer NOT NULL,
    user_id integer NOT NULL,
    daily_calories integer,
    protein_g numeric(6,1),
    carbs_g numeric(6,1),
    fats_g numeric(6,1),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: nutrition_goals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nutrition_goals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nutrition_goals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nutrition_goals_id_seq OWNED BY public.nutrition_goals.id;


--
-- Name: performance_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.performance_logs (
    id integer NOT NULL,
    user_id integer,
    measurement_type_id integer,
    value numeric(8,2) NOT NULL,
    unit character varying(20),
    notes text,
    logged_at date DEFAULT CURRENT_DATE,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: performance_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.performance_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: performance_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.performance_logs_id_seq OWNED BY public.performance_logs.id;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id integer NOT NULL,
    user_id integer,
    full_name character varying(100),
    sport character varying(100),
    age integer,
    height_cm numeric,
    weight_kg numeric,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.profiles_id_seq OWNED BY public.profiles.id;


--
-- Name: program_days; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_days (
    id integer NOT NULL,
    program_id integer NOT NULL,
    day_number integer NOT NULL,
    label character varying(100),
    exercises jsonb DEFAULT '[]'::jsonb
);


--
-- Name: program_days_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.program_days_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: program_days_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.program_days_id_seq OWNED BY public.program_days.id;


--
-- Name: session_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_types (
    id integer NOT NULL,
    sport character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    user_id integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: session_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.session_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: session_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.session_types_id_seq OWNED BY public.session_types.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'athlete'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: wearable_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wearable_connections (
    id integer NOT NULL,
    user_id integer NOT NULL,
    platform character varying(50) NOT NULL,
    access_token text,
    refresh_token text,
    expires_at timestamp without time zone,
    scope text,
    connected_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: wearable_connections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wearable_connections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wearable_connections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wearable_connections_id_seq OWNED BY public.wearable_connections.id;


--
-- Name: wearable_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wearable_data (
    id integer NOT NULL,
    user_id integer NOT NULL,
    platform character varying(50) NOT NULL,
    date date NOT NULL,
    steps integer,
    heart_rate_avg integer,
    heart_rate_max integer,
    calories_burned integer,
    sleep_hours numeric(4,2),
    sleep_score integer,
    hrv integer,
    strain_score numeric(4,2),
    recovery_score integer,
    raw_data jsonb,
    synced_at timestamp without time zone DEFAULT now()
);


--
-- Name: wearable_data_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.wearable_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: wearable_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.wearable_data_id_seq OWNED BY public.wearable_data.id;


--
-- Name: workout_exercises; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workout_exercises (
    id integer NOT NULL,
    workout_id integer,
    exercise_name character varying(100) NOT NULL,
    sets integer,
    reps integer,
    weight_kg numeric
);


--
-- Name: workout_exercises_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workout_exercises_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workout_exercises_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workout_exercises_id_seq OWNED BY public.workout_exercises.id;


--
-- Name: workout_programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workout_programs (
    id integer NOT NULL,
    user_id integer,
    title character varying(200) NOT NULL,
    sport character varying(100),
    days_per_week integer,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: workout_programs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workout_programs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workout_programs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workout_programs_id_seq OWNED BY public.workout_programs.id;


--
-- Name: workouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workouts (
    id integer NOT NULL,
    user_id integer,
    sport character varying(100) NOT NULL,
    workout_date date DEFAULT CURRENT_DATE NOT NULL,
    duration_minutes integer,
    distance_km numeric,
    notes text,
    sport_stats jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now(),
    session_type_id integer,
    session_type_name character varying(100)
);


--
-- Name: workouts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.workouts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: workouts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.workouts_id_seq OWNED BY public.workouts.id;


--
-- Name: athlete_goals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_goals ALTER COLUMN id SET DEFAULT nextval('public.athlete_goals_id_seq'::regclass);


--
-- Name: meal_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_items ALTER COLUMN id SET DEFAULT nextval('public.meal_items_id_seq'::regclass);


--
-- Name: meals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meals ALTER COLUMN id SET DEFAULT nextval('public.meals_id_seq'::regclass);


--
-- Name: measurement_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.measurement_types ALTER COLUMN id SET DEFAULT nextval('public.measurement_types_id_seq'::regclass);


--
-- Name: nutrition_goals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_goals ALTER COLUMN id SET DEFAULT nextval('public.nutrition_goals_id_seq'::regclass);


--
-- Name: performance_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_logs ALTER COLUMN id SET DEFAULT nextval('public.performance_logs_id_seq'::regclass);


--
-- Name: profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles ALTER COLUMN id SET DEFAULT nextval('public.profiles_id_seq'::regclass);


--
-- Name: program_days id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_days ALTER COLUMN id SET DEFAULT nextval('public.program_days_id_seq'::regclass);


--
-- Name: session_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_types ALTER COLUMN id SET DEFAULT nextval('public.session_types_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: wearable_connections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wearable_connections ALTER COLUMN id SET DEFAULT nextval('public.wearable_connections_id_seq'::regclass);


--
-- Name: wearable_data id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wearable_data ALTER COLUMN id SET DEFAULT nextval('public.wearable_data_id_seq'::regclass);


--
-- Name: workout_exercises id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_exercises ALTER COLUMN id SET DEFAULT nextval('public.workout_exercises_id_seq'::regclass);


--
-- Name: workout_programs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_programs ALTER COLUMN id SET DEFAULT nextval('public.workout_programs_id_seq'::regclass);


--
-- Name: workouts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts ALTER COLUMN id SET DEFAULT nextval('public.workouts_id_seq'::regclass);


--
-- Name: athlete_goals athlete_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_goals
    ADD CONSTRAINT athlete_goals_pkey PRIMARY KEY (id);


--
-- Name: meal_items meal_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_items
    ADD CONSTRAINT meal_items_pkey PRIMARY KEY (id);


--
-- Name: meals meals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meals
    ADD CONSTRAINT meals_pkey PRIMARY KEY (id);


--
-- Name: measurement_types measurement_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.measurement_types
    ADD CONSTRAINT measurement_types_pkey PRIMARY KEY (id);


--
-- Name: nutrition_goals nutrition_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_goals
    ADD CONSTRAINT nutrition_goals_pkey PRIMARY KEY (id);


--
-- Name: nutrition_goals nutrition_goals_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_goals
    ADD CONSTRAINT nutrition_goals_user_id_key UNIQUE (user_id);


--
-- Name: performance_logs performance_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_logs
    ADD CONSTRAINT performance_logs_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: program_days program_days_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_days
    ADD CONSTRAINT program_days_pkey PRIMARY KEY (id);


--
-- Name: session_types session_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_types
    ADD CONSTRAINT session_types_pkey PRIMARY KEY (id);


--
-- Name: session_types session_types_sport_name_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_types
    ADD CONSTRAINT session_types_sport_name_user_id_key UNIQUE (sport, name, user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wearable_connections wearable_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wearable_connections
    ADD CONSTRAINT wearable_connections_pkey PRIMARY KEY (id);


--
-- Name: wearable_connections wearable_connections_user_id_platform_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wearable_connections
    ADD CONSTRAINT wearable_connections_user_id_platform_key UNIQUE (user_id, platform);


--
-- Name: wearable_data wearable_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wearable_data
    ADD CONSTRAINT wearable_data_pkey PRIMARY KEY (id);


--
-- Name: wearable_data wearable_data_user_id_platform_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wearable_data
    ADD CONSTRAINT wearable_data_user_id_platform_date_key UNIQUE (user_id, platform, date);


--
-- Name: workout_exercises workout_exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_exercises
    ADD CONSTRAINT workout_exercises_pkey PRIMARY KEY (id);


--
-- Name: workout_programs workout_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_programs
    ADD CONSTRAINT workout_programs_pkey PRIMARY KEY (id);


--
-- Name: workouts workouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts
    ADD CONSTRAINT workouts_pkey PRIMARY KEY (id);


--
-- Name: idx_athlete_goals_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_athlete_goals_user ON public.athlete_goals USING btree (user_id);


--
-- Name: idx_meals_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meals_user_date ON public.meals USING btree (user_id, date);


--
-- Name: idx_performance_logs_logged_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_performance_logs_logged_at ON public.performance_logs USING btree (logged_at);


--
-- Name: idx_performance_logs_measurement_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_performance_logs_measurement_type ON public.performance_logs USING btree (measurement_type_id);


--
-- Name: idx_performance_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_performance_logs_user_id ON public.performance_logs USING btree (user_id);


--
-- Name: idx_wearable_connections_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wearable_connections_user ON public.wearable_connections USING btree (user_id);


--
-- Name: idx_wearable_data_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wearable_data_user_date ON public.wearable_data USING btree (user_id, date);


--
-- Name: athlete_goals athlete_goals_measurement_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_goals
    ADD CONSTRAINT athlete_goals_measurement_type_id_fkey FOREIGN KEY (measurement_type_id) REFERENCES public.measurement_types(id) ON DELETE SET NULL;


--
-- Name: athlete_goals athlete_goals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athlete_goals
    ADD CONSTRAINT athlete_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: meal_items meal_items_meal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meal_items
    ADD CONSTRAINT meal_items_meal_id_fkey FOREIGN KEY (meal_id) REFERENCES public.meals(id) ON DELETE CASCADE;


--
-- Name: meals meals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meals
    ADD CONSTRAINT meals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: measurement_types measurement_types_sport_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.measurement_types
    ADD CONSTRAINT measurement_types_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.session_types(id) ON DELETE SET NULL;


--
-- Name: nutrition_goals nutrition_goals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nutrition_goals
    ADD CONSTRAINT nutrition_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: performance_logs performance_logs_measurement_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_logs
    ADD CONSTRAINT performance_logs_measurement_type_id_fkey FOREIGN KEY (measurement_type_id) REFERENCES public.measurement_types(id) ON DELETE CASCADE;


--
-- Name: performance_logs performance_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_logs
    ADD CONSTRAINT performance_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: program_days program_days_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_days
    ADD CONSTRAINT program_days_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.workout_programs(id) ON DELETE CASCADE;


--
-- Name: session_types session_types_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_types
    ADD CONSTRAINT session_types_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: wearable_connections wearable_connections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wearable_connections
    ADD CONSTRAINT wearable_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: wearable_data wearable_data_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wearable_data
    ADD CONSTRAINT wearable_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: workout_exercises workout_exercises_workout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_exercises
    ADD CONSTRAINT workout_exercises_workout_id_fkey FOREIGN KEY (workout_id) REFERENCES public.workouts(id) ON DELETE CASCADE;


--
-- Name: workout_programs workout_programs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workout_programs
    ADD CONSTRAINT workout_programs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: workouts workouts_session_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts
    ADD CONSTRAINT workouts_session_type_id_fkey FOREIGN KEY (session_type_id) REFERENCES public.session_types(id);


--
-- Name: workouts workouts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts
    ADD CONSTRAINT workouts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


--
-- PostgreSQL database dump
--


-- Dumped from database version 15.18 (Homebrew)
-- Dumped by pg_dump version 15.18 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: session_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.session_types (id, sport, name, user_id, created_at) FROM stdin;
1	Basketball	Practice	\N	2026-05-21 16:54:57.035924
2	Basketball	Scrimmage	\N	2026-05-21 16:54:57.035924
3	Basketball	Game	\N	2026-05-21 16:54:57.035924
4	Basketball	Strength & Conditioning	\N	2026-05-21 16:54:57.035924
5	Basketball	Film Review	\N	2026-05-21 16:54:57.035924
6	Basketball	Shooting Drills	\N	2026-05-21 16:54:57.035924
7	Basketball	Recovery	\N	2026-05-21 16:54:57.035924
8	Baseball	Practice	\N	2026-05-21 16:54:57.035924
9	Baseball	Game	\N	2026-05-21 16:54:57.035924
10	Baseball	Bullpen Session	\N	2026-05-21 16:54:57.035924
11	Baseball	Batting Practice	\N	2026-05-21 16:54:57.035924
12	Baseball	Fielding Drills	\N	2026-05-21 16:54:57.035924
13	Baseball	Strength & Conditioning	\N	2026-05-21 16:54:57.035924
14	Baseball	Recovery	\N	2026-05-21 16:54:57.035924
15	Cricket	Practice	\N	2026-05-21 16:54:57.035924
16	Cricket	Match	\N	2026-05-21 16:54:57.035924
17	Cricket	Batting Nets	\N	2026-05-21 16:54:57.035924
18	Cricket	Bowling Nets	\N	2026-05-21 16:54:57.035924
19	Cricket	Fielding Drills	\N	2026-05-21 16:54:57.035924
20	Cricket	Strength & Conditioning	\N	2026-05-21 16:54:57.035924
21	Cricket	Recovery	\N	2026-05-21 16:54:57.035924
22	Football	Practice	\N	2026-05-21 16:54:57.035924
23	Football	Scrimmage	\N	2026-05-21 16:54:57.035924
24	Football	Game	\N	2026-05-21 16:54:57.035924
25	Football	Film Review	\N	2026-05-21 16:54:57.035924
26	Football	Strength & Conditioning	\N	2026-05-21 16:54:57.035924
27	Football	Special Teams	\N	2026-05-21 16:54:57.035924
28	Football	Recovery	\N	2026-05-21 16:54:57.035924
29	Soccer	Practice	\N	2026-05-21 16:54:57.035924
30	Soccer	Scrimmage	\N	2026-05-21 16:54:57.035924
31	Soccer	Match	\N	2026-05-21 16:54:57.035924
32	Soccer	Shooting Drills	\N	2026-05-21 16:54:57.035924
33	Soccer	Strength & Conditioning	\N	2026-05-21 16:54:57.035924
34	Soccer	Set Piece Work	\N	2026-05-21 16:54:57.035924
35	Soccer	Recovery	\N	2026-05-21 16:54:57.035924
36	General	Open Gym / Free Training	\N	2026-05-21 16:54:57.035924
37	General	Mobility & Flexibility	\N	2026-05-21 16:54:57.035924
38	General	Mental Performance / Visualization	\N	2026-05-21 16:54:57.035924
\.


--
-- Data for Name: measurement_types; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.measurement_types (id, name, category, unit, unit_alt, lower_is_better, sport_id, created_at) FROM stdin;
1	Vertical Jump	power	inches	cm	f	\N	2026-05-26 22:57:34.57787
2	Broad Jump	power	inches	cm	f	\N	2026-05-26 22:57:34.57787
3	Medicine Ball Throw	power	ft	m	f	\N	2026-05-26 22:57:34.57787
4	40-Yard Dash	speed	seconds	\N	t	\N	2026-05-26 22:57:34.57787
5	10-Yard Split	speed	seconds	\N	t	\N	2026-05-26 22:57:34.57787
6	20-Yard Split	speed	seconds	\N	t	\N	2026-05-26 22:57:34.57787
7	5-10-5 Pro Agility	speed	seconds	\N	t	\N	2026-05-26 22:57:34.57787
8	L-Drill	speed	seconds	\N	t	\N	2026-05-26 22:57:34.57787
9	3-Cone Drill	speed	seconds	\N	t	\N	2026-05-26 22:57:34.57787
10	1RM Bench Press	strength	lbs	kg	f	\N	2026-05-26 22:57:34.57787
11	1RM Squat	strength	lbs	kg	f	\N	2026-05-26 22:57:34.57787
12	1RM Deadlift	strength	lbs	kg	f	\N	2026-05-26 22:57:34.57787
13	Max Pull-ups	strength	reps	\N	f	\N	2026-05-26 22:57:34.57787
14	Max Push-ups	strength	reps	\N	f	\N	2026-05-26 22:57:34.57787
15	Grip Strength	strength	kg	\N	f	\N	2026-05-26 22:57:34.57787
16	1-Mile Run	endurance	min:sec	\N	t	\N	2026-05-26 22:57:34.57787
17	VO2 Max	endurance	ml/kg/min	\N	f	\N	2026-05-26 22:57:34.57787
18	Beep Test Level	endurance	level	\N	f	\N	2026-05-26 22:57:34.57787
19	Yo-Yo Test Level	endurance	level	\N	f	\N	2026-05-26 22:57:34.57787
20	Body Weight	body	lbs	kg	f	\N	2026-05-26 22:57:34.57787
21	Body Fat %	body	%	\N	f	\N	2026-05-26 22:57:34.57787
22	Chest	body	inches	cm	f	\N	2026-05-26 22:57:34.57787
23	Waist	body	inches	cm	f	\N	2026-05-26 22:57:34.57787
24	Hips	body	inches	cm	f	\N	2026-05-26 22:57:34.57787
25	Arms	body	inches	cm	f	\N	2026-05-26 22:57:34.57787
26	Thighs	body	inches	cm	f	\N	2026-05-26 22:57:34.57787
27	Standing Reach	athleticism	inches	cm	f	\N	2026-05-26 22:57:34.57787
28	Wingspan	athleticism	inches	cm	f	\N	2026-05-26 22:57:34.57787
29	Hand Length	athleticism	inches	cm	f	\N	2026-05-26 22:57:34.57787
30	Hand Width	athleticism	inches	cm	f	\N	2026-05-26 22:57:34.57787
31	No-Step Vertical	power	inches	cm	f	\N	2026-05-26 22:57:34.57787
32	Max Verticals in Session	power	count	\N	f	\N	2026-05-26 22:57:34.57787
33	Lane Agility Drill	speed	seconds	\N	t	\N	2026-05-26 22:57:34.57787
34	3/4 Court Sprint	speed	seconds	\N	t	\N	2026-05-26 22:57:34.57787
35	Full Court Sprint	speed	seconds	\N	t	\N	2026-05-26 22:57:34.57787
36	Free Throw %	shooting	%	\N	f	\N	2026-05-26 22:57:34.57787
37	3-Point %	shooting	%	\N	f	\N	2026-05-26 22:57:34.57787
38	Field Goal %	shooting	%	\N	f	\N	2026-05-26 22:57:34.57787
39	Exit Velocity	hitting	mph	\N	f	\N	2026-05-26 22:57:34.57787
40	Batting Average	hitting	avg	\N	f	\N	2026-05-26 22:57:34.57787
41	On-Base %	hitting	%	\N	f	\N	2026-05-26 22:57:34.57787
42	Slugging %	hitting	%	\N	f	\N	2026-05-26 22:57:34.57787
43	Pitch Velocity	pitching	mph	\N	f	\N	2026-05-26 22:57:34.57787
44	Spin Rate	pitching	rpm	\N	f	\N	2026-05-26 22:57:34.57787
45	Command Rating	pitching	rating	\N	f	\N	2026-05-26 22:57:34.57787
46	Pop Time	fielding	seconds	\N	t	\N	2026-05-26 22:57:34.57787
47	Throw Velocity	fielding	mph	\N	f	\N	2026-05-26 22:57:34.57787
48	Fielding %	fielding	%	\N	f	\N	2026-05-26 22:57:34.57787
49	Bench Press Reps (225lbs)	strength	reps	\N	f	\N	2026-05-26 22:57:34.57787
50	Throw Velocity	position	mph	\N	f	\N	2026-05-26 22:57:34.57787
51	Route Run Time	position	seconds	\N	t	\N	2026-05-26 22:57:34.57787
52	Blocking Efficiency	position	rating	\N	f	\N	2026-05-26 22:57:34.57787
53	30m Sprint	speed	seconds	\N	t	\N	2026-05-26 22:57:34.57787
54	60m Sprint	speed	seconds	\N	t	\N	2026-05-26 22:57:34.57787
55	Shot Velocity	technical	mph	\N	f	\N	2026-05-26 22:57:34.57787
56	Passing Accuracy %	technical	%	\N	f	\N	2026-05-26 22:57:34.57787
57	Dribble Course Time	technical	seconds	\N	t	\N	2026-05-26 22:57:34.57787
58	Batting Average	batting	avg	\N	f	\N	2026-05-26 22:57:34.57787
59	Strike Rate	batting	rate	\N	f	\N	2026-05-26 22:57:34.57787
60	Top Score	batting	runs	\N	f	\N	2026-05-26 22:57:34.57787
61	Sixes Hit	batting	count	\N	f	\N	2026-05-26 22:57:34.57787
62	Fours Hit	batting	count	\N	f	\N	2026-05-26 22:57:34.57787
63	Ball Speed Off Bat	batting	mph	\N	f	\N	2026-05-26 22:57:34.57787
64	Bowling Average	bowling	avg	\N	t	\N	2026-05-26 22:57:34.57787
65	Economy Rate	bowling	rate	\N	t	\N	2026-05-26 22:57:34.57787
66	Bowling Speed	bowling	mph	\N	f	\N	2026-05-26 22:57:34.57787
67	Spin RPM	bowling	rpm	\N	f	\N	2026-05-26 22:57:34.57787
68	Wickets Per Match	bowling	count	\N	f	\N	2026-05-26 22:57:34.57787
69	Throw Distance	fielding	meters	\N	f	\N	2026-05-26 22:57:34.57787
70	Reaction Time	fielding	seconds	\N	t	\N	2026-05-26 22:57:34.57787
71	Catches Taken	fielding	count	\N	f	\N	2026-05-26 22:57:34.57787
72	30m Sprint	fitness	seconds	\N	t	\N	2026-05-26 22:57:34.57787
73	20m Shuttle Run	fitness	seconds	\N	t	\N	2026-05-26 22:57:34.57787
74	Crease-to-Crease Run Time	fitness	seconds	\N	t	\N	2026-05-26 22:57:34.57787
75	Wicket-to-Wicket Run Time	fitness	seconds	\N	t	\N	2026-05-26 22:57:34.57787
\.


--
-- Name: measurement_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.measurement_types_id_seq', 75, true);


--
-- Name: session_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.session_types_id_seq', 38, true);


--
-- PostgreSQL database dump complete
--



CREATE TABLE IF NOT EXISTS public.planned_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sport VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_planned_sessions_user_date ON public.planned_sessions(user_id, date);
