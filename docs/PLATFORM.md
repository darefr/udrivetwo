# U Drive rental platform — operator handoff

The original U Drive website, vehicle photography, rental planner, account forms, destination carousel and design system remain in place. `/account` and `/admin` are the new private workspaces. No production credential or pre-created administrator is required to develop the system.

## Start in development

Use this update in the existing U Drive repository, not in a new blank app. The downloadable update archive preserves relative paths and excludes private development records, installed dependencies and build artifacts. In v0, open the existing project Preview. In a local checkout from GitHub or the project’s shadcn CLI installation, use Node 24 and the pnpm version in `package.json`:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Visit `/create-account`, then `/account`. An actual embedded PostgreSQL database (PGlite) is initialized under `.udrive/postgres` on first use. Reloads and application restarts retain records on the same disk. This is not an in-memory imitation or browser storage. The original four cars, their galleries, eight destination guides, Bhaktapur, Lalitpur and a custom Nepal pickup option are seeded once. Existing records are never overwritten by a repeat migration. No customer accounts, bookings, payments or verified reviews are fabricated.

**Embedded databases are single-process development resources.** Never share a PGlite directory between processes, run maintenance commands against it while the dev server is open, or use it on a multi-instance/serverless deployment. Use the authenticated jobs endpoint for an already running process. Preview sandbox disks are not backups. Deleting `.udrive` destroys development data.

### First administrator — no default credentials

1. Register an ordinary account and sign in with it. Registration never assigns a staff role, even to the first registrant.
2. Open `/admin/setup`. In local development this prepares a random one-time code in `.udrive/owner-code`, readable only by the server’s OS account. Read that file in your **private local checkout**, not in a public page.
3. Alternatively, set your own **random 32+ character** `ADMIN_SETUP_TOKEN` in project **Settings → Vars**. This is the setup method for a hosted preview or production installation; no terminal in the preview is needed. Do not paste the code in chat or commit it.
4. Enter that code on `/admin/setup`. An atomic transaction grants this account `SUPER_ADMIN` and closes installation. Remove `ADMIN_SETUP_TOKEN` afterwards. Creating another account or reusing the code cannot create another owner.
5. In **Admin → Staff & access**, assign roles to existing accounts. Role changes invalidate the affected user’s sessions. A user cannot edit their own role here or remove the last enabled owner.

The development email/WhatsApp inbox is **not exposed as a public API**. Local operators can inspect `.udrive/mailbox/*.json`: these files explicitly say the message was *not delivered*. Reset and verification links there are sensitive. In an isolated hosted preview, use a private test SMTP mailbox if you need to exercise recovery from a browser without filesystem access. Do not expose that directory with a web server.

## Customer and rental workflows

- **Account:** email/password registration, login, persistent “Remember me”, logout, profile/phone editing, email verification, verified email changes, password changes and password recovery. Sessions are random opaque credentials stored as hashes in PostgreSQL; no JWT signing key or `AUTH_SECRET` is needed. Password reset links are single-use, expire in 30 minutes and revoke existing sessions. Email changes require password reauthentication plus a link sent to the new address. A social-only account can use email recovery to establish a password.
- **Booking:** choose the car, mode, pickup, dates, handover and contact details in the original planner. A server quote validates the calendar and computes the estimate. Review and submit to receive a unique `UD-…` reference and `PENDING` status. The optional WhatsApp handoff and downloadable summary remain available; neither substitutes for database submission.
- **Guests:** a request does not require signup. A short-lived HTTP-only claim cookie allows the same browser to link its latest guest request to an account using the booking email. Email matching **alone** never claims an existing booking. For other guest requests contact the desk with the reference.
- **Account workspace:** overview, bookings with status filters, upcoming/active rentals, history, individual details, cancellation, notifications, profile and threaded support. Completed rentals permit one review per booking.
- **Staff:** search a booking, open its details, contact the customer, change the rental or record a private note. Version checks prevent one desk operator from silently overwriting another’s work. Confirming/rejecting/updating a request writes history and customer notifications in the same transaction.
- **Reviews:** only a completed, owned rental can be reviewed. New reviews are pending. Approval publishes them; rejection/hiding removes them; featuring changes ordering. When there are no approved reviews, the original carousel retains its explicitly labelled *illustrative stories*, never presented as verified reviews.

### Calendar and pricing invariants

Dates are Nepal calendar dates, with an inclusive pickup and an **exclusive return date**. The default maximum is 365 days. Each day for one physical rental unit has one unique inventory key. Pending, confirmed and active rentals occupy dates; staff blocks use the same table. A database trigger and primary key protect against overlapping writes even when two requests race. Adjacent rentals are allowed. To represent two physical cars of the same model, create two distinct vehicle records/identifiers.

The server selects the configured mode rate or the vehicle base rate, multiplies by whole rental days, applies an eligible percentage offer to the vehicle subtotal, and adds configured delivery and other fees. Currency, rates, days, discounts, fees and total are snapshotted on the booking. A missing chauffeur-inclusive price means a supplement needs agreement; it is not invented. Changing the configured currency does not perform foreign-exchange conversion: the operator must enter the corresponding tariffs. Prior booking snapshots keep their original currency. A changed estimate requires review. Browser totals cannot create a payment or override a booking price.

Normal transitions: pending → confirmed/rejected/cancelled; confirmed → active/cancelled; active → completed. Completed, cancelled and rejected states are terminal. Releasing the booking releases its occupied days. Pending holds expire during worker processing after the configured hold duration (48 hours by default). A quote is a point-in-time check, not a reservation.

## Database schema and boundaries

The executable DDL is **`db/001_platform.sql`** plus **`db/002_receipts.sql`**. `scripts/platform.ts` and `lib/platform/database.ts` apply migrations transactionally, with a migration lock and version table. Both database drivers execute the same SQL. Identifiers are UUID-based except stable catalog slugs, unique offer codes and readable booking references.

| Domain | Tables and relationships |
| --- | --- |
| Identity | `users` owns `sessions`, `verification_tokens` and `oauth_identities`; `oauth_attempts` contains expiring authorization state. Roles and enabled status belong to the user. |
| Customers | `customers.user_id` is unique and optional for guest profiles. Customer notes never appear in customer-facing booking queries. |
| Catalog | `vehicles.location` references `locations`; `vehicle_images.vehicle_id` references vehicles. Structured specs preserve the original UI fields. `media_assets` stores sanitized image bytes. |
| Rentals | `bookings` references customer, vehicle, pickup location and optional offer. Contact/handover details and the price snapshot are on the booking, avoiding a second conflicting copy of its dates. `booking_history` records transitions. |
| Inventory | `availability_blocks` and bookings both feed `occupied_days`; primary key `(vehicle_id, day)` is the final conflict arbiter. |
| Finance | One `payments` balance per booking. `payment_receipts` stores append-only staff-entered records of verified real-world cash/bank receipts or refunds. References are unique. Gateway and desk settlements are not mixed. |
| Communication | `notifications` target a customer or staff permission; `notification_reads` is per-user. `threads` references a customer and optional booking; `messages` references its thread and author. |
| Publication | `reviews` references its user, vehicle and unique completed booking. `locations` can be pickup-only or published as destination guides. |
| Operations | `outbox`, `reminders`, `activity_log`, `rate_limits`, `settings`, `installations`, `schema_versions`. Owner setup, delivery leases, reminder deduplication and rate limits survive process restarts. |

`lib/platform/contracts.ts` holds validation, transitions and permission policy. SQL uses positional parameters. Interpolated SQL fragments are fixed, application-owned expressions and allowlisted identifiers. Production uses server-side PostgreSQL connections; no database credentials or raw SQL endpoint are shipped to the browser.

## Backend/API map

The App Router dispatcher is `app/api/platform/[...path]/route.ts`. The services are separated by domain in `lib/platform/`; the dispatcher is not the business logic. All mutation examples below require JSON and a trusted same-origin request. Authenticated operations derive identity from the HTTP-only cookie, not supplied user IDs. Private responses use `Cache-Control: private, no-store`.

| Route | Purpose |
| --- | --- |
| `GET /api/platform/catalog` | Published fleet, pickup locations, destination records and approved reviews. |
| `GET /api/platform/quote` | Parameters: `vehicle`, `mode`, `pickup`, `start`, `end`, `delivery`, optional `offer`. Returns the checked quote or a validation/conflict response. |
| `POST /api/platform/bookings` | Quote selections plus `name`, `email`, `phone`, handover details, optional `message`, `waConsent`, `expectedTotal`, UUID `requestKey`. Repeated identical keys return the same request. |
| `POST /api/platform/auth/{action}` | `register`, `login`, `logout`, `forgot`, `reset`, `verify`, `verify-again`, `profile`, `email`, `password`, `claim`, `bootstrap`. Input schemas are in `identity.ts`. |
| `GET /api/platform/session` | Current authenticated customer/staff identity, or null. |
| `POST /api/platform/oauth/{google,facebook}` | Start a configured OAuth flow. `/api/oauth/[provider]/callback` validates the response and issues a real session. |
| `GET /api/platform/account/{overview,bookings,profile,notifications,messages}` | Customer-scoped data; booking lists accept `status`, `view` and zero-based `page`. |
| `GET /api/platform/account/bookings/:id` | Owned rental, estimate, contacts, payment state and history; never includes internal notes. |
| `PATCH /api/platform/account/bookings/:id` | Cancel an eligible owned request, passing its current `version`. |
| `POST /api/platform/account/{reviews,messages}` | Completed-rental review or a new support conversation. Append `/:threadId` to messages to reply. |
| `POST /api/platform/account/notifications/:id` | Mark an accessible notification read for this user only. |
| `POST /api/platform/support` | Submit a reviewed contact enquiry, including guest enquiries. |
| `GET /api/platform/admin/:section` | Permission-scoped data for all 16 desk sections. `id`, `search`, `page`, `status`, `vehicle`, `from`, `to` apply where relevant. |
| `POST/PATCH/DELETE /api/platform/admin/:section[/:id]` | Domain mutations: add/update/deactivate vehicles or locations, manage offers and pricing, block/unblock days, change bookings, manage customers/reviews, reply, configure settings, assign roles, reconcile verified receipts. Deactivation preserves rental history. |
| `POST /api/media`; `GET /api/media/:hash` | Authorized staff upload a raw image; public catalog route serves only its sanitized WebP result. |
| `POST /api/rental-assistant` | Validated bilingual conversation. Prices, calendar answers and owned booking status are grounded server-side. |
| `POST /api/platform/account/checkout/:bookingId`; `GET /api/payments/return` | Optional hosted checkout and provider-side verification. Disabled without configuration. |
| `GET /api/jobs` | Bearer-authenticated reminders, pending-hold expiry, token/rate-window cleanup and delivery retries. |

Common responses: 400 malformed data/expired link; 401 sign-in required; 403 access/origin failure; 404 inaccessible/missing rental; 409 date conflict, stale version or invalid transition; 413 excess request size; 415 unsupported format; 422 validation; 429 throttled; 503 optional service unavailable. User-facing responses never contain connection strings or provider tokens.

## Admin roles and reporting

| Role | Access |
| --- | --- |
| Customer | Own profile, rentals, messages, reviews and notifications only. |
| Super Admin | All operations, staff roles and access. |
| Admin | All desk sections except staff-role administration. |
| Booking Manager | Booking operations, customers, calendar, messages and notifications. |
| Fleet Manager | Vehicles, availability, rates, offers, locations and scoped notifications. |
| Support Staff | Customers, support messages, reviews and scoped notifications; cannot suspend customers. |

Overview totals and recent records respect these permissions. A fleet manager does not receive customer booking details merely by opening Overview. Reports group bookings by Nepal date, vehicle, rental mode, outcome and pickup location. Customer growth is grouped by month. Estimated revenue includes confirmed, active and completed rentals, separated by currency; it is **not** reported as cash collected.

## Service adapters and exact configuration

See **`.env.example`** for the complete blank configuration. Only enable providers you intend to use. Secret values belong in a secrets manager or project Vars, never in source or a `NEXT_PUBLIC_` variable.

| Service | Development behavior | Production connection |
| --- | --- | --- |
| Database | Disk-backed PostgreSQL via PGlite at `UDRIVE_DATA_DIR` (default `.udrive`). | `DATABASE_URL` for PostgreSQL 15+; use verified TLS. `DATABASE_CA` optionally supplies a private CA. Use a pooled endpoint appropriate to deployment concurrency. |
| Sessions | Same real authentication as production. OS randomness, scrypt, token hashes, expiring DB sessions and HTTP-only cookies. | Set `APP_ORIGIN` to the exact HTTPS origin. Opaque sessions do not require a signing secret. Do not configure shared wildcard origins. |
| Initial owner | Private generated code or operator-set setup credential. | `ADMIN_SETUP_TOKEN` once; remove after installation. No built-in administrator email/password. |
| Google | Button explains unavailability and leaves email/password usable. No mocked Google identity. | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. Register `APP_ORIGIN/api/oauth/google/callback`. OIDC discovery, PKCE, state, nonce and verified email. |
| Facebook | Same safe fallback. | `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`, `FACEBOOK_GRAPH_VERSION` (supported `vN.0`). Register `APP_ORIGIN/api/oauth/facebook/callback`; enable public profile/email permission. An existing account is never silently linked by email. |
| Transactional email | Persist job, then capture a private test message marked `DEV_CAPTURED`. | `SMTP_URL` using `smtps://` and an authorized, verified `EMAIL_FROM`. Configure the company desk email in Settings or `ADMIN_EMAIL`. Escape special characters in SMTP URL credentials. |
| WhatsApp Business | Private capture; manual `wa.me` actions remain available. No browser automation. | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_GRAPH_VERSION`, `WHATSAPP_TEMPLATE`, `WHATSAPP_LANGUAGE`. Use an approved utility template with two text body parameters: event title and single-line details. Confirm organization/customer opt-ins, recipients and template language with Meta. Initial company number is **+9779800899505**. |
| AI assistant | Deterministic, multilingual replies from actual catalog records and inventory checks. Offline mode does not quote stale numbers. | `AI_MODE=gateway`; select a current supported `AI_MODEL`. Uses the Vercel AI SDK and runtime-managed Gateway authentication. The model classifies unfamiliar questions; it does not invent amounts, calendar results or booking statuses. No AI credential is exposed to the client. |
| Payments | `PAYMENT_PROVIDER=disabled`. Bookings create pending balances but never pretend to charge money. | Optional `PAYMENT_PROVIDER=khalti`, `KHALTI_ENV=sandbox` first, and `KHALTI_SECRET_KEY`. Use `KHALTI_ENV=production` only after merchant acceptance testing. Hosted checkout supports confirmed NPR rentals. |
| Image storage | Actual sanitized image bytes persist in the development database. | The same `ImageStorage` adapter stores catalog photos in production PostgreSQL using `DATABASE_URL`; no additional storage credential is required. `lib/platform/storage.ts` provides the `put/get` interface for a future object store. |
| Maintenance | Inline-after-response dispatch; local scripts or authenticated jobs endpoint for scheduled work. | Random 32+ character `CRON_SECRET`. `vercel.json` schedules a daily job at 00:15 UTC. For prompt retries/hold release, schedule the endpoint every 5–15 minutes on a suitable scheduler/plan. Maintenance is bounded; monitor backlog. |
| Proxy/IP handling | Shared local bucket protects development routes. | Vercel uses its edge-supplied address. On a self-hosted trusted reverse proxy only, `TRUST_PROXY=1` uses `X-Real-IP`; the proxy must strip/replace client-supplied headers. |

### Notification delivery semantics

Booking, history, payment balance, website notifications, audit entry and external delivery jobs are committed together. The worker runs **after commit**. Provider failure does not erase or roll back the booking. Website notifications are immediate database records; open dashboards revalidate on focus and poll every 15 seconds.

`notifications.ts` composes customer and desk messages for booking received, confirmed, rejected, changed, cancelled, active, completed and reminder events, as well as account and support emails. Booking notifications contain the reference, vehicle, mode, dates, pickup, handover and estimate. The staff version includes contact details. Customer WhatsApp jobs require booking-level consent. In production an unconfigured adapter **does not silently mark delivery successful**. Failures retry with backoff; repeated failures produce a system alert. Authorized operators can requeue failed jobs in Notifications.

`QUEUED` → `PROCESSING` → `DEV_CAPTURED` or `SENT` (provider accepted), or `RETRY` → `FAILED`. `SENT` does not certify that the recipient read a message. Lease recovery provides **at-least-once** delivery; a provider accepting a message immediately before a worker crash can result in a duplicate. SMTP uses a stable Message-ID. Do not describe unverified delivery as exactly-once. Reset links are redacted from completed outbox records.

### Payments and reconciliation

The authoritative balance is linked to the booking. Amounts are stored in whole configured currency units; the Khalti adapter converts NPR to paisa server-side. Pending, partial, paid, failed and refunded states are supported. The callback ignores browser-supplied success/amount fields and checks the recorded reference, server-issued amount, provider lookup and transaction identifier. A callback URL by itself cannot mark a rental paid. Duplicate lookups are safe.

Desk operators may record a **receipt for an actual external cash/bank settlement**, with a unique reference and explicit confirmation; no money is moved by that action. Underpayments become `PARTIAL`; amounts cannot exceed the balance or refundable receipts. Every entry is audited. A gateway-backed payment cannot be overwritten by a manual receipt. If initiation times out after the provider may have accepted it, the record remains locked for reconciliation: check the merchant dashboard before retrying. Refunds of online payments must be processed by the provider, not invented locally.

### Assistant context and privacy

The original text interface, suggested questions, editable microphone dictation, English/Nepali/Romanized Nepali support and handoff actions remain. A full date-range availability check requires an identifiable car and two explicit ISO dates. Answers are time-of-check only; submission rechecks availability. Booking-status lookups are scoped to the signed-in customer, including when a reference is supplied. Chat history is tab-session scoped and separated by account. Clearing chat removes that local transcript, not rental records. No audio recording or identity-document upload is required.

## Production activation checklist

1. Use a separate PostgreSQL database and backups for each production/staging environment. Do not transfer test customers, captured messages or setup codes to production.
2. Set the infrastructure variables above. `UDRIVE_MODE=test` exists only for isolated browser tests running a production build; **never set it for deployed production**. Missing production database configuration fails closed rather than writing ephemeral files.
3. From a trusted release job with migration privileges, run `pnpm db:migrate` once. The script is repeatable and seeds only on first installation. Run the application with a restricted runtime database role; do not grant it database-owner or schema-creation permissions. Grant only necessary table/sequence privileges. Do not grant update/delete access to the audit/receipt ledgers. Do not set `UDRIVE_MIGRATE=1` on ordinary runtime traffic.
4. Set the project’s `APP_ORIGIN` and canonical website domain, configure HTTPS and correct callback allowlists, then run `pnpm platform:check`, `pnpm build` and the release smoke tests. The configuration check validates presence/shape; it is not a live provider acceptance test.
5. Bootstrap the first owner. Configure business settings, contact email/number, currency, operating hours, policy text, fees, hold duration, service locations and fleet availability. The original prices are seed values; verify commercial terms before opening bookings.
6. Verify SMTP delivery to owned staging addresses, domain authentication, password recovery, email change and link expiry. Enroll/approve official WhatsApp templates and test only opted-in numbers. A private local capture is not evidence of live delivery.
7. If enabled, complete Google/Facebook callback testing on your exact domain, confirm consent text and provider app review. Test disabled-provider fallback too.
8. If enabling hosted payment, test merchant sandbox initiation, successful verification, cancellation, timeout, mismatched amount, replay and refunds before switching to a live merchant account. Validate your refund/deposit policy and local tax requirements.
9. Enable and monitor the scheduler, queue depth, failed deliveries, pending holds and system alerts. Enable database monitoring, regular backups and restore drills. Set a retention/deletion schedule appropriate to Nepal rental and accounting obligations, including backup/media retention.
10. Review staff permissions, secret rotation, emergency owner recovery and authorized data requests. Verify public images contain no private customer material. Disable unused channels. Review security and privacy configuration against your deployment environment before accepting real customers.

## Verification commands (local checkout / CI)

```sh
pnpm test:platform       # Isolated SQL, concurrency, pricing, authorization and accounting checks
pnpm exec tsc --noEmit  # Type checking
pnpm test               # Production build + Playwright journeys, product checks, routes and accessibility
```

The default Playwright server uses an isolated temporary database and disables outbound providers. Do not point mutation tests at a live rental database. `tests/product.spec.ts` uses the actual signup, session, staff, recovery and booking endpoints. Never expose test fixtures, local SQL files, mailboxes, reset tokens or owner codes as public assets.
