CREATE TABLE payment_receipts (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
 payment_id text NOT NULL REFERENCES payments(id),
 actor_id text NOT NULL REFERENCES users(id),
 direction text NOT NULL CHECK(direction IN ('RECEIPT','REFUND')),
 method text NOT NULL CHECK(method IN ('Bank transfer','Cash')),
 external_reference text UNIQUE NOT NULL,
 amount integer NOT NULL CHECK(amount>0),
 created_at timestamptz NOT NULL DEFAULT now()
)
