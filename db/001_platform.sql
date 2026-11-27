CREATE TABLE schema_versions (version integer PRIMARY KEY, installed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE users (
 id text PRIMARY KEY DEFAULT gen_random_uuid()::text, name text NOT NULL, email text UNIQUE NOT NULL CHECK(email=lower(email)), password_hash text, email_verified boolean NOT NULL DEFAULT false,
 role text NOT NULL DEFAULT 'CUSTOMER' CHECK(role IN ('CUSTOMER','SUPER_ADMIN','ADMIN','BOOKING_MANAGER','FLEET_MANAGER','SUPPORT_STAFF')),
 enabled boolean NOT NULL DEFAULT true, terms_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE customers (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, user_id text UNIQUE REFERENCES users(id), name text NOT NULL, email text NOT NULL, phone text NOT NULL DEFAULT '', note text NOT NULL DEFAULT '', enabled boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX customer_email ON customers(lower(email));
CREATE TABLE sessions (token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX session_owner ON sessions(user_id);
CREATE TABLE verification_tokens (token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE, purpose text NOT NULL, target text, expires_at timestamptz NOT NULL);
CREATE TABLE oauth_identities (provider text NOT NULL, subject text NOT NULL, user_id text NOT NULL REFERENCES users(id), PRIMARY KEY(provider,subject));
CREATE TABLE oauth_attempts (state_hash text PRIMARY KEY, provider text NOT NULL, verifier text NOT NULL, nonce text NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE rate_limits (bucket text PRIMARY KEY, count integer NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE locations (slug text PRIMARY KEY, name text UNIQUE NOT NULL, details jsonb NOT NULL DEFAULT '{}', active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE vehicles (
 slug text PRIMARY KEY, name text NOT NULL, brand text NOT NULL, model text NOT NULL, specs jsonb NOT NULL, location text REFERENCES locations(slug),
 daily_rate integer NOT NULL CHECK(daily_rate BETWEEN 1 AND 1000000), self_rate integer CHECK(self_rate BETWEEN 1 AND 1000000), driver_rate integer CHECK(driver_rate BETWEEN 1 AND 1000000),
 available boolean NOT NULL DEFAULT true, active boolean NOT NULL DEFAULT true, featured boolean NOT NULL DEFAULT false, popular boolean NOT NULL DEFAULT false, sort_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE media_assets (id text PRIMARY KEY, bytes bytea NOT NULL, mime text NOT NULL CHECK(mime='image/webp'), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE vehicle_images (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, vehicle_id text NOT NULL REFERENCES vehicles(slug), path text NOT NULL, label text NOT NULL, sort_order integer NOT NULL DEFAULT 0);
CREATE INDEX image_vehicle ON vehicle_images(vehicle_id,sort_order);
CREATE TABLE offers (code text PRIMARY KEY, description text NOT NULL, percent integer NOT NULL CHECK(percent BETWEEN 1 AND 100), starts_on date NOT NULL, ends_on date NOT NULL CHECK(ends_on>=starts_on), active boolean NOT NULL DEFAULT true);
CREATE TABLE settings (id integer PRIMARY KEY CHECK(id=1), value jsonb NOT NULL);
CREATE TABLE bookings (
 id text PRIMARY KEY, customer_id text NOT NULL REFERENCES customers(id), vehicle_id text NOT NULL REFERENCES vehicles(slug), location_id text NOT NULL REFERENCES locations(slug),
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','CONFIRMED','REJECTED','CANCELLED','ACTIVE','COMPLETED')), mode text NOT NULL CHECK(mode IN ('self-drive','with-driver')),
 pickup_date date NOT NULL, return_date date NOT NULL CHECK(return_date>pickup_date AND return_date-pickup_date<=365),
 delivery text NOT NULL CHECK(delivery IN ('pickup','delivery')), address text NOT NULL DEFAULT '', return_point text NOT NULL DEFAULT '',
 contact_name text NOT NULL, contact_email text NOT NULL, contact_phone text NOT NULL, message text NOT NULL DEFAULT '', wa_consent boolean NOT NULL DEFAULT false,
 quote jsonb NOT NULL, total integer NOT NULL CHECK(total>=0), currency text NOT NULL DEFAULT 'NPR', offer_code text REFERENCES offers(code), internal_note text NOT NULL DEFAULT '',
 request_key uuid NOT NULL UNIQUE, fingerprint text NOT NULL, guest_claim_hash text, version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX booking_owner ON bookings(customer_id, created_at DESC);
CREATE INDEX booking_operations ON bookings(status,pickup_date,vehicle_id);
CREATE TABLE availability_blocks (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, vehicle_id text NOT NULL REFERENCES vehicles(slug), starts_on date NOT NULL, ends_on date NOT NULL CHECK(ends_on>starts_on AND ends_on-starts_on<=365), reason text NOT NULL, created_by text REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now());
-- A single unique inventory ledger covers both staff blocks and customer requests. The return day is free.
CREATE TABLE occupied_days (vehicle_id text NOT NULL REFERENCES vehicles(slug), day date NOT NULL, booking_id text REFERENCES bookings(id) ON DELETE CASCADE, block_id text REFERENCES availability_blocks(id) ON DELETE CASCADE, CHECK(num_nonnulls(booking_id,block_id)=1), PRIMARY KEY(vehicle_id,day));
CREATE INDEX occupied_booking ON occupied_days(booking_id);
CREATE INDEX occupied_block ON occupied_days(block_id);
CREATE FUNCTION reserve_booking_days() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 DELETE FROM occupied_days WHERE booking_id=NEW.id;
 IF NEW.status IN ('PENDING','CONFIRMED','ACTIVE') THEN
 INSERT INTO occupied_days(vehicle_id,day,booking_id) SELECT NEW.vehicle_id, NEW.pickup_date+n, NEW.id FROM generate_series(0,NEW.return_date-NEW.pickup_date-1) n;
 END IF; RETURN NEW; END $$;
CREATE TRIGGER booking_inventory AFTER INSERT OR UPDATE OF pickup_date,return_date,vehicle_id,status ON bookings FOR EACH ROW EXECUTE FUNCTION reserve_booking_days();
CREATE FUNCTION reserve_block_days() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 DELETE FROM occupied_days WHERE block_id=NEW.id;
 INSERT INTO occupied_days(vehicle_id,day,block_id) SELECT NEW.vehicle_id,NEW.starts_on+n,NEW.id FROM generate_series(0,NEW.ends_on-NEW.starts_on-1) n;
 RETURN NEW; END $$;
CREATE TRIGGER block_inventory AFTER INSERT OR UPDATE ON availability_blocks FOR EACH ROW EXECUTE FUNCTION reserve_block_days();
CREATE TABLE booking_history (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, booking_id text NOT NULL REFERENCES bookings(id), actor_id text REFERENCES users(id), event text NOT NULL, status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE payments (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, booking_id text NOT NULL UNIQUE REFERENCES bookings(id), status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','PARTIAL','PAID','FAILED','REFUNDED')), currency text NOT NULL, due integer NOT NULL CHECK(due>=0), received integer NOT NULL DEFAULT 0 CHECK(received>=0), provider text, provider_ref text UNIQUE, checkout_url text, transaction_ref text UNIQUE, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE notifications (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, user_id text REFERENCES users(id), permission text, kind text NOT NULL, title text NOT NULL, body text NOT NULL, booking_id text REFERENCES bookings(id), link text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), CHECK(num_nonnulls(user_id,permission)=1));
CREATE INDEX notifications_inbox ON notifications(user_id,permission,created_at DESC);
CREATE TABLE notification_reads (notification_id text REFERENCES notifications(id) ON DELETE CASCADE, user_id text REFERENCES users(id), read_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(notification_id,user_id));
CREATE TABLE outbox (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, channel text NOT NULL CHECK(channel IN ('email','whatsapp')), recipient text NOT NULL, subject text NOT NULL, body text NOT NULL, kind text NOT NULL, booking_id text REFERENCES bookings(id), status text NOT NULL DEFAULT 'QUEUED', attempts integer NOT NULL DEFAULT 0, next_attempt timestamptz NOT NULL DEFAULT now(), lease text, last_error text, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX outbox_due ON outbox(status,next_attempt);
CREATE TABLE reminders (booking_id text REFERENCES bookings(id), pickup_date date NOT NULL, PRIMARY KEY(booking_id,pickup_date));
CREATE TABLE reviews (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, booking_id text UNIQUE NOT NULL REFERENCES bookings(id), user_id text NOT NULL REFERENCES users(id), vehicle_id text NOT NULL REFERENCES vehicles(slug), rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5), body text NOT NULL, state text NOT NULL DEFAULT 'PENDING' CHECK(state IN ('PENDING','APPROVED','REJECTED','HIDDEN')), featured boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX published_reviews ON reviews(state,featured,created_at DESC);
CREATE TABLE threads (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, customer_id text REFERENCES customers(id), booking_id text REFERENCES bookings(id), name text NOT NULL, email text NOT NULL, topic text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE messages (id text PRIMARY KEY DEFAULT gen_random_uuid()::text, thread_id text NOT NULL REFERENCES threads(id), sender_id text REFERENCES users(id), staff boolean NOT NULL DEFAULT false, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX message_thread ON messages(thread_id,created_at);
CREATE TABLE activity_log (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id text REFERENCES users(id), action text NOT NULL, entity text NOT NULL, entity_id text, detail jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX activity_entity ON activity_log(entity,entity_id,created_at DESC);
CREATE TABLE installations (name text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
INSERT INTO schema_versions(version) VALUES(1);
