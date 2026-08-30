# Craftvaro go-live phases

This runbook separates code that is ready to deploy from work that needs production credentials, external contracts or operational approval. Never publish the frontend ahead of its matching database migration and Edge Functions.

## Phase 0 — Release control (completed in this branch)

- Claimable factual directory profiles remain visible, with contact and lead actions locked until the profile is claimed, verified and subscribed.
- Paid/trial traders only in AI search, lead dispatch, job access and offers.
- Forward-only account-deletion migration; existing marketplace and Lovable storage migrations are unchanged.
- Lovable-managed `.env` and preview authentication storage are preserved unchanged.
- CI uses Bun and the committed Bun lockfile to run type-check, lint, tests and build.
- Canonical URL, robots rules, public-only sitemap and protected-route `noindex` handling.

Exit gate: CI green and `bun run launch:preflight` has no failures.

Operational tooling now available:

- `/admin/launch-readiness` checks the deployed environment without exposing secrets and provisions `repair-intake` through the Storage API.
- `/admin/deletion-requests` tracks review, cancellation and confirmed completion with audit events; it does not perform automatic destructive deletion.
- `/admin/integration-operations` exposes delivery failures without payload contents and provides administrator-only retries for Gabley, Immoviq and Dokuvera.
- `/admin/pilot-runs` creates postcode-specific pilot runs, stores evidence and prevents sign-off until every required check passes. Signed runs are immutable.

## Phase 1 — Staging backend (operator action)

1. Create or select a separate Supabase staging project.
2. Set all secrets listed in `docs/PRODUCTION_DEPLOYMENT.md`.
3. Apply all migrations, including `20260830223000_launch_pilot_signoff.sql`.
4. Deploy every Edge Function.
5. Create or update the private `repair-intake` bucket with Lovable/Supabase storage tools; do not insert into `storage.buckets` through this migration path.
6. Schedule the existing `integration-outbox-worker` with its approved cron secret.

Exit gate: a fresh database deploy succeeds, webhook signature rejection tests pass, and originals cannot be read by an invited provider.

## Phase 2 — Marketplace pilot

- Onboard 10–20 real subscribing traders in one postcode area.
- Admin verifies identity, insurance, Gas Safe/regulated credentials and expiry.
- Each trader sets service area, accepting-work status and realistic availability.
- Test the customer flow: search → profile → job → up to four offers → acceptance → address release.
- Confirm expired/cancelled/unpaid traders disappear immediately and cannot receive or quote on a lead.

Exit gate: record five complete pilot jobs with no privacy or subscription bypass, attach the evidence in `/admin/pilot-runs`, and pass every required check.

The live readiness gate reports zero paid traders as a blocker, 1–9 as a pilot warning, and 10+ as ready for the controlled marketplace pilot. Repair dispatch reports zero verified/available providers as a blocker, 1–3 as a warning, and 4+ as ready for four-provider dispatch testing. It continues to report a warning until an administrator signs off a fully passed pilot run.

## Phase 3 — AI Repair and Dokuvera pilot

- Configure the private vision gateway and choose/approve the media-redaction implementation before enabling media sharing.
- Confirm AI output is labelled possible/indicative and emergency stops take priority.
- Configure the agreed Dokuvera endpoint, authentication, signing and webhook contract.
- Verify only `safe` redacted copies are delivered; originals remain in private storage.
- Run idempotency and partial-outage tests for Dokuvera, Gabley and Immoviq using the existing integration/outbox design.

Exit gate: ten staged repair cases, including gas/electrical safety stops, redaction rejection and a recovered Dokuvera outage.

## Phase 4 — Commercial and compliance approval

- Confirm Stripe price IDs and test subscriptions, renewal, cancellation and failed-payment removal from leads.
- Have UK/German counsel approve privacy, terms, cookies, contractor wording, AI disclaimers and retention schedule.
- Enter the registered company number/address in the final policies before public marketing.
- Test account deletion and the administrator completion process.
- Complete ICO/GDPR, cookie-vendor, accessibility and incident-response checks.

Exit gate: legal approval recorded, finance reconciliation signed off and no unapproved non-essential tracking enabled.

## Phase 5 — Production release

1. Freeze merges and tag the approved commit.
2. Back up production and test restore instructions.
3. Run the manual **Deploy Supabase production** GitHub Action.
4. Smoke-test migrations and functions, then publish the same commit through Lovable.
5. Verify auth redirects, subscription checkout/webhook, marketplace, Repair Assist and mobile layout for the controlled UK launch.
6. Enable monitoring, alerting and a 24-hour rollback/on-call window.

Exit gate: production smoke test signed off and no Sev-1/Sev-2 issue during the controlled pilot window.

## Phase 6 — Scale after launch

- Expand postcode coverage only when paying trader density can satisfy customer requests.
- Complete German translation of every customer and back-office route before enabling a German public launch; the shared language switcher and new legal pages alone are not sufficient.
- Add browser and native-device end-to-end coverage, performance budgets and accessibility automation.
- Submit signed iOS/Android builds only after physical-device camera, push, deep-link and privacy tests.
- Review search fairness, AI accuracy, complaints, cancellations and provider response time monthly.

## Deliberately not represented as complete

- Live Gas Safe Register verification: current status is administrator-verified evidence.
- Customer-to-trader marketplace payment and payout: Stripe currently covers trader subscriptions; escrow/payout needs a separate commercial and regulated design.
- Legal approval: included policy text is an operational draft for counsel review.
- Production secrets, DNS, Lovable publish and Supabase deployment: these require account-holder access.
