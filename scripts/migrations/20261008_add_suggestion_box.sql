BEGIN;

ALTER TABLE wickspend_users
  ADD COLUMN IF NOT EXISTS suggestion_prompt_dismissed_until TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS wickspend_suggestions (
  id BIGSERIAL PRIMARY KEY,
  suggestion_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  user_id BIGINT NOT NULL REFERENCES wickspend_users(id) ON DELETE CASCADE,
  user_email TEXT,
  category TEXT NOT NULL CHECK (category IN ('new_idea','broken','easier','other')),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 3 AND 500),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','planned','completed','ignored')),
  current_path TEXT,
  device_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  request_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wickspend_suggestions_user_request_key_idx
  ON wickspend_suggestions(user_id, request_key)
  WHERE request_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS wickspend_suggestions_status_created_idx
  ON wickspend_suggestions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS wickspend_suggestions_category_created_idx
  ON wickspend_suggestions(category, created_at DESC);

CREATE INDEX IF NOT EXISTS wickspend_suggestions_user_created_idx
  ON wickspend_suggestions(user_id, created_at DESC);

COMMIT;
