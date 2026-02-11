CREATE TABLE IF NOT EXISTS escrow (
  id bigserial PRIMARY KEY,
  escrow_id varchar(128) NOT NULL UNIQUE,
  initializer varchar(64),
  beneficiary varchar(64),
  arbiter varchar(64),
  amount bigint,
  tx_sig varchar(256),
  event_type varchar(32),
  created_at timestamptz DEFAULT now(),
  raw_json jsonb
);
