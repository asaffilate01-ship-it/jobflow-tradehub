# Craftvaro production deployment

## Marketplace rule

Only verified traders with an active non-free Craftvaro subscription are visible or matchable. This is enforced by the public marketplace projection, AI Trade Finder, four-provider repair matcher, job notification targeting and repair-offer trigger. External or non-subscribing traders are not searched.

## Required deployment order

1. Review the target project's migration history. `20260824215000_repair_hub_dokuvera.sql` is intentionally a no-op marker because the canonical Lovable migration is `20260824221602_75248a38-3b14-48fc-90b8-6c87fdaf6b58.sql`.
2. Apply migrations through `20260825113000_marketplace_directory_claims.sql`.
3. Deploy every function under `supabase/functions`; deploy `stripe-webhook`, `dokuvera-webhook` and `integration-outbox-worker` without Supabase JWT verification because each uses its own signature/cron authentication.
4. Configure secrets and test each integration in a non-production environment.
5. Run `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` before release.

The manual **Deploy Supabase production** GitHub Action performs a database dry run, applies pending migrations, and deploys all Edge Functions. Create a protected GitHub `production` environment and add encrypted `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, and `SUPABASE_PROJECT_ID` secrets before running it. Keep the workflow manually approved until a separate staging project is available.

The Supabase workflow does not publish the Vite frontend. After the backend action succeeds, publish the same commit through Lovable so the live UI and database contract cannot drift.

## Required server secrets

- Supabase platform: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Public app: `PUBLIC_APP_URL` (the canonical HTTPS origin used for safe Stripe redirects)
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_BASIC_PRICE_ID`, `STRIPE_PREMIUM_PRICE_ID`
- Scheduled jobs: `SCHEDULED_SYNC_SECRET`, `INTEGRATION_OUTBOX_CRON_SECRET`
- Merchant credentials: `MERCHANT_CREDENTIALS_ENCRYPTION_KEY`, `BROWSERLESS_API_KEY`
- Web Push: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- Notifications: `RESEND_API_KEY`, `EMAIL_FROM`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Dokuvera: `DOKUVERA_API_URL`, `DOKUVERA_API_TOKEN`, `DOKUVERA_SIGNING_SECRET`, `DOKUVERA_WEBHOOK_SECRET`
- Repair AI: `REPAIR_VISION_GATEWAY_URL`, `REPAIR_VISION_GATEWAY_SECRET`
- Trade-search AI parser: `TRADE_SEARCH_AI_URL`, `TRADE_SEARCH_AI_SECRET`
- Product events: `GABLEY_WEBHOOK_URL`, `GABLEY_WEBHOOK_SECRET`, `IMMOVIQ_WEBHOOK_URL`, `IMMOVIQ_WEBHOOK_SECRET`

Generate independent random values for each secret. Never reuse the Supabase service-role key as an encryption key. Never expose these values through a `VITE_*` variable.

## Webhook and cron checks

- Stripe webhook rejects requests if the Stripe signing secret or signature is missing.
- Dokuvera webhook requires `X-Dokuvera-Signature`.
- Gabley/Immoviq deliveries use `X-Craftvaro-Signature` and `Idempotency-Key`.
- Scheduled price sync requires either an administrator JWT or `X-Cron-Secret` matching `SCHEDULED_SYNC_SECRET`.
- The outbox worker requires either an administrator JWT or its separate cron secret.

## Mobile release

`capacitor.config.ts` packages the local `dist` output under `com.craftvaro.app`; it no longer loads a mutable Lovable preview or permits clear-text traffic. Android and iOS projects are included with camera/microphone purpose declarations and clear-text/backup hardening. Before store submission, run `npx cap sync`, configure signing, store privacy declarations and production deep links, then test on physical Android and iOS devices.
