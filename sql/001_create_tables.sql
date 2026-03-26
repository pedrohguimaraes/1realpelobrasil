-- 1 Real pelo Brasil — schema inicial (Postgres)

CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  photo_path TEXT NOT NULL,
  color_class TEXT NOT NULL,
  ring_class TEXT NOT NULL,
  min_cents INTEGER NOT NULL,
  amount_presets INTEGER[] NOT NULL,
  provocation TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id TEXT NOT NULL REFERENCES candidates (id),
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  gateway_tx_id TEXT NOT NULL,
  pix_copia_cola TEXT NOT NULL,
  pix_qrcode_base64 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS votes_gateway_tx_id_idx ON votes (gateway_tx_id);
CREATE INDEX IF NOT EXISTS votes_candidate_id_idx ON votes (candidate_id);
CREATE INDEX IF NOT EXISTS votes_status_idx ON votes (status);
CREATE INDEX IF NOT EXISTS votes_paid_at_idx ON votes (paid_at);

CREATE TABLE IF NOT EXISTS stats_cache (
  candidate_id TEXT PRIMARY KEY REFERENCES candidates (id),
  total_votes INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_tx_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_events_gateway_tx_id_idx ON webhook_events (gateway_tx_id);
