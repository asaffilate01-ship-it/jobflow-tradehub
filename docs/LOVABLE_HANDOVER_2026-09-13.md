# Craftvaro — Lovable handover, 13 September 2026

## What this package includes

This is an update to `asaffilate01-ship-it/jobflow-tradehub`, not a new standalone project. It includes the property-project, subcontractor and permissions work already merged through PR #5, plus subcontractor activity history and in-app notifications. Apply the files at their existing repository paths. Keep the project's existing environment settings and assets.

The new phase adds:
- Immutable, timestamped work-package activity: assignment, progress, review, sign-off, cancellation and recorded payment.
- In-app alerts to the other participant, written in the same database transaction as the change. Identical progress saves do not duplicate alerts.
- A collapsible activity timeline on each work package, with a 30-second refresh while open.
- Notification refresh fallback when realtime delivery is unavailable.
- Database tests for privacy, immutable history, correct alert recipients and failed/no-op actions.

No email, SMS or payment-transfer provider is required for these in-app features. No emails or text messages are sent by this update. Payment entries still record payments made outside Craftvaro.

## Paste into Lovable

Apply the attached Craftvaro update files to this existing project, preserving existing environment variables, assets, authentication and unrelated changes. Do not create a new app.

First inspect migration history in the connected Supabase/Lovable backend. Apply only pending migrations in chronological order; do not rerun migrations already recorded as applied. The package contains:

1. `20260912080000_property_project_opportunities.sql`
2. `20260912090000_subcontract_work_orders.sql`
3. `20260912100000_trader_business_metrics.sql`
4. `20260912110000_verification_write_guards.sql`
5. `20260912120000_job_evidence_access.sql`
6. `20260913080000_subcontract_activity_notifications.sql`

Resolve any missing earlier migration dependencies from the repository before applying these. Do not drop live tables or reset the database to resolve a migration mismatch. Regenerate Supabase types after applying the migrations, retaining all existing schema types.

Deploy the updated `launch-readiness` Edge Function. The new activity/notification feature itself uses database triggers and needs no additional Edge Function or secret.

Run `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`. Verify the customer project form and job detail; main-trader subcontract assignment; linked-subcontractor progress; main-trader sign-off; payment record; activity history; and notification bell with separate test accounts. Confirm another trader/customer cannot read the work package, payment records or activity history. Check mobile and desktop before publishing.

Publish only after the database changes and checks succeed. The existing marketing preview gate remains unchanged; do not treat it as a security boundary.

## Test scenario

1. Main trader owns an active/awarded job and adds a subcontractor record.
2. Assign a work package using an existing Craftvaro trader's email. That account receives an in-app assignment alert.
3. Sign into the linked trader account, open Subcontractors, start the work and submit it for review. The main trader receives an alert.
4. The main trader approves completion. The subcontractor cannot approve it themselves.
5. Record an actual external payment using a unique reference. The linked trader receives an in-app alert; no money is moved.
6. Both participants can view activity history. A different company's account cannot.
7. Saving identical progress again must not add a duplicate activity event or notification. Negative/over-agreement payments must fail without an activity entry.

## Remaining external work

Automated council/planning feeds, live Gabley retrofit and DOMUREVA bridges, actual customer/subcontractor money movement, complete bank-reconciled financial reporting and email/push delivery still require further integrations. Do not describe those as live. Existing historic jobs do not receive fabricated activity: the timeline begins with changes made after this migration.

The source opportunity section supports manually reviewed records now. No data-provider agreement or API key is included.

## Local verification

TypeScript checks and production build pass. All 29 tests pass, including the new activity/notification database cases. ESLint reports zero errors and 143 existing warnings. Production migration application and live account/browser checks remain for your Lovable deployment.
