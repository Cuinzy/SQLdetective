-- SQL Detective: esquema de la aplicación (datos de estudiantes, investigaciones y administración)
-- Los datos de los casos viven en esquemas separados (case_00 ... case_15) creados por scripts/seed-cases.ts

CREATE SCHEMA IF NOT EXISTS game;
REVOKE ALL ON SCHEMA game FROM PUBLIC;

CREATE TABLE IF NOT EXISTS game.players (
  id              uuid PRIMARY KEY,
  full_name       text NOT NULL CHECK (char_length(full_name) BETWEEN 3 AND 120),
  group_name      text NOT NULL CHECK (char_length(group_name) BETWEEN 1 AND 60),
  student_code    text CHECK (student_code IS NULL OR char_length(student_code) <= 40),
  badge_code      text NOT NULL UNIQUE,
  token_hash      text NOT NULL UNIQUE,
  recovery_hash   text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game.investigations (
  id                      uuid PRIMARY KEY,
  player_id               uuid NOT NULL REFERENCES game.players(id) ON DELETE CASCADE,
  case_id                 integer NOT NULL CHECK (case_id BETWEEN 0 AND 15),
  verification_code       text NOT NULL,
  status                  text NOT NULL DEFAULT 'en_proceso' CHECK (status IN ('en_proceso','resuelto','no_resuelto')),
  student_name            text NOT NULL,
  group_name              text NOT NULL,
  student_code            text,
  started_at              timestamptz NOT NULL DEFAULT now(),
  finished_at             timestamptz,
  last_activity_at        timestamptz NOT NULL DEFAULT now(),
  total_queries           integer NOT NULL DEFAULT 0,
  valid_queries           integer NOT NULL DEFAULT 0,
  invalid_queries         integer NOT NULL DEFAULT 0,
  failed_accusations      integer NOT NULL DEFAULT 0,
  hints_used              integer NOT NULL DEFAULT 0,
  paste_attempts          integer NOT NULL DEFAULT 0,
  final_suspect_id        text,
  solved                  boolean NOT NULL DEFAULT false,
  evidence_at_last_accusation integer NOT NULL DEFAULT 0,
  consecutive_valid       integer NOT NULL DEFAULT 0,
  best_consecutive_valid  integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS investigations_code_uq ON game.investigations (verification_code);
CREATE INDEX IF NOT EXISTS investigations_player_idx ON game.investigations (player_id);
CREATE INDEX IF NOT EXISTS investigations_case_idx ON game.investigations (case_id);
CREATE UNIQUE INDEX IF NOT EXISTS investigations_one_active_uq
  ON game.investigations (player_id, case_id) WHERE status = 'en_proceso';

CREATE TABLE IF NOT EXISTS game.queries (
  id                bigserial PRIMARY KEY,
  investigation_id  uuid NOT NULL REFERENCES game.investigations(id) ON DELETE CASCADE,
  seq               integer NOT NULL,
  sql_text          text NOT NULL,
  executed_at       timestamptz NOT NULL DEFAULT now(),
  duration_ms       integer,
  syntax_valid      boolean NOT NULL,
  executed          boolean NOT NULL,
  counted           boolean NOT NULL,
  reject_reason     text,
  error_message     text,
  error_hint        text,
  tables_used       text[] NOT NULL DEFAULT '{}',
  features          text[] NOT NULL DEFAULT '{}',
  row_count         integer,
  truncated         boolean NOT NULL DEFAULT false,
  columns           text[] NOT NULL DEFAULT '{}',
  result_preview    jsonb,
  result_hash       text,
  normalized_hash   text,
  template_hash     text,
  shape_hash        text,
  evidence_ids      text[] NOT NULL DEFAULT '{}',
  objective_ids     text[] NOT NULL DEFAULT '{}',
  UNIQUE (investigation_id, seq)
);
CREATE INDEX IF NOT EXISTS queries_inv_idx ON game.queries (investigation_id, seq);

CREATE TABLE IF NOT EXISTS game.evidence_found (
  investigation_id  uuid NOT NULL REFERENCES game.investigations(id) ON DELETE CASCADE,
  evidence_id       text NOT NULL,
  query_id          bigint REFERENCES game.queries(id) ON DELETE SET NULL,
  found_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (investigation_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS game.hints_used (
  investigation_id  uuid NOT NULL REFERENCES game.investigations(id) ON DELETE CASCADE,
  hint_id           text NOT NULL,
  level             smallint NOT NULL CHECK (level BETWEEN 1 AND 3),
  used_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (investigation_id, hint_id, level)
);

CREATE TABLE IF NOT EXISTS game.interrogations (
  id                bigserial PRIMARY KEY,
  investigation_id  uuid NOT NULL REFERENCES game.investigations(id) ON DELETE CASCADE,
  character_id      text NOT NULL,
  question_id       text NOT NULL,
  asked_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (investigation_id, character_id, question_id)
);

CREATE TABLE IF NOT EXISTS game.accusations (
  id                bigserial PRIMARY KEY,
  investigation_id  uuid NOT NULL REFERENCES game.investigations(id) ON DELETE CASCADE,
  suspect_id        text NOT NULL,
  evidence_ids      text[] NOT NULL,
  justification     text NOT NULL,
  correct           boolean NOT NULL,
  valid_queries_at  integer NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (investigation_id, suspect_id)
);

CREATE TABLE IF NOT EXISTS game.achievements (
  player_id       uuid NOT NULL REFERENCES game.players(id) ON DELETE CASCADE,
  achievement_id  text NOT NULL,
  investigation_id uuid REFERENCES game.investigations(id) ON DELETE SET NULL,
  unlocked_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS game.reports (
  id                uuid PRIMARY KEY,
  investigation_id  uuid NOT NULL REFERENCES game.investigations(id) ON DELETE CASCADE,
  format            text NOT NULL,
  payload_sha256    text NOT NULL,
  signature         text NOT NULL,
  generated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reports_inv_idx ON game.reports (investigation_id);

CREATE TABLE IF NOT EXISTS game.admin_users (
  id              uuid PRIMARY KEY,
  username        text NOT NULL UNIQUE,
  password_hash   text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game.admin_sessions (
  token_hash      text PRIMARY KEY,
  admin_id        uuid NOT NULL REFERENCES game.admin_users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS game.audit_log (
  id                bigserial PRIMARY KEY,
  at                timestamptz NOT NULL DEFAULT now(),
  actor_type        text NOT NULL,
  actor_id          text,
  action            text NOT NULL,
  investigation_id  uuid,
  ip                text,
  details           jsonb
);
CREATE INDEX IF NOT EXISTS audit_action_idx ON game.audit_log (action, at);

CREATE TABLE IF NOT EXISTS game.schema_migrations (
  name        text PRIMARY KEY,
  applied_at  timestamptz NOT NULL DEFAULT now()
);
