-- MartX refund support: schema
-- Runs unchanged on local Postgres 16 (docker-compose) and Supabase (SQL editor).

CREATE TABLE IF NOT EXISTS customers (
  id          SERIAL PRIMARY KEY,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  customer_id   INT NOT NULL REFERENCES customers(id),
  status        TEXT NOT NULL CHECK (status IN ('processing', 'in_transit', 'delivered', 'refunded')),
  order_date    TIMESTAMPTZ NOT NULL,
  delivered_at  TIMESTAMPTZ,
  refunded_at   TIMESTAMPTZ,
  total_amount  NUMERIC(10, 2) NOT NULL,
  currency      CHAR(3) NOT NULL DEFAULT 'USD'
);

CREATE TABLE IF NOT EXISTS order_items (
  id          SERIAL PRIMARY KEY,
  order_id    TEXT NOT NULL REFERENCES orders(id),
  sku         TEXT NOT NULL,
  name        TEXT NOT NULL,
  quantity    INT NOT NULL DEFAULT 1,
  unit_price  NUMERIC(10, 2) NOT NULL,
  final_sale  BOOLEAN NOT NULL DEFAULT FALSE
);

-- order_id is not a foreign key on purpose: customers may submit IDs that do not exist.
CREATE TABLE IF NOT EXISTS refund_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email      TEXT NOT NULL,
  order_id            TEXT,
  raw_message         TEXT NOT NULL,
  verdict             TEXT NOT NULL CHECK (verdict IN ('Approved', 'Denied', 'Escalated')),
  refund_amount       NUMERIC(10, 2) NOT NULL DEFAULT 0,
  rule_ids            TEXT[] NOT NULL DEFAULT '{}',
  customer_reply      TEXT,
  injection_flagged   BOOLEAN NOT NULL DEFAULT FALSE,
  review_status       TEXT NOT NULL DEFAULT 'none' CHECK (review_status IN ('none', 'pending', 'resolved')),
  final_verdict       TEXT CHECK (final_verdict IN ('Approved', 'Denied')),
  resolution_note     TEXT,
  resolved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  request_id  UUID NOT NULL REFERENCES refund_requests(id) ON DELETE CASCADE,
  step        TEXT NOT NULL,   -- e.g. prefilter, extraction, lookup, policy, reply, resolution
  payload     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_requests_created ON refund_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_verdict ON refund_requests(verdict);
CREATE INDEX IF NOT EXISTS idx_audit_request ON audit_logs(request_id);
