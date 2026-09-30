ALTER TABLE refund_requests ADD COLUMN IF NOT EXISTS idempotency_key UUID UNIQUE;
ALTER TABLE refund_requests ADD COLUMN IF NOT EXISTS request_hash TEXT;
ALTER TABLE refund_requests ADD COLUMN IF NOT EXISTS ai_mode TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_per_order ON refund_requests(order_id) WHERE review_status='pending';
