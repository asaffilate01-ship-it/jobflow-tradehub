# Craftvaro property projects and launch review — 12 September 2026

## Release position

This branch adds usable project intake, source curation, subcontract work packages, scoped progress/payment records and company metrics. It is **not a production go-live sign-off**. No production database migration, Edge Function deployment, Stripe transaction, external data contract or Lovable publication was performed. The supplied live URL did not open through the web lookup. Repository inspection and local tests are the evidence for this report.

## Included

- `/property-projects`: UK project categories for maintenance, renovation/extension, retrofit, empty homes, adaptations, commercial fit-outs and council/housing work.
- `/post-job`: structured funding/planning stage, council, reference, scope, qualifications and site-visit requirement; saved on the existing job, so existing quote, task, milestone, evidence, snag and variation screens remain connected.
- Job board category filter and brief display on the job detail page.
- `/project-opportunities`: subscriber-gated planning/tender source records; `/funding-opportunities`: authenticated access to funding records. Filter by type, project category, nation, council/postcode/reference text; save records to an individual account.
- `/admin/project-opportunities`: create/edit unpublished records, record source and reuse basis, review and publish/unpublish. No fabricated records are seeded. Editing removes publication until reviewed again.
- `/subcontractors`: company-specific directory, assignment of awarded/active jobs, scoped work packages, optional link to an existing trader account by email, assignee progress reporting, main-contractor sign-off, immutable payment records with date/reference and remaining-agreement limits. Linking an account does not send email. Unlinked work orders are internal tracking records.
- `/business-performance`: database-calculated all-time counts, quote pipeline, invoice metrics, subcontract commitments and recorded payments. This is operational reporting, not full statutory accounts, bank reconciliation or automatic CIS filing.
- Trader dashboard distinguishes accepted quote value from revenue; admin job/subscriber counts use exact queries and the server subscription table. Recent accounting summaries are labelled as partial records.
- Private evidence now uses expiring signed URLs rather than public URLs. Storage policies match the camera's job-ID folder structure and restrict access to actual job parties. Private job evidence is no longer treated as a public portfolio.
- Database guards prevent ordinary profile owners self-approving KYC/phone/driver verification. Existing verification records are preserved; historical approved profiles still need operator review.
- Full trader and admin sidebar menus can be opened on mobile.
- CI uses npm with a repaired lockfile; typecheck explicitly checks the application and tooling tsconfigs.

## Permission matrix

| Actor | Customer projects | Opportunities | Subcontract work | Payments and metrics |
| --- | --- | --- | --- | --- |
| Signed out | Existing public directory/marketing only | No new source records | None | None |
| Customer | Own projects under existing RLS | Published funding | No private subcontract packages | Own customer-facing records only |
| Paid trader | Existing subscribed job discovery and awarded-job operations | Published planning/tenders/funding | Own company assignments; explicitly assigned incoming scope | Own company metrics; main contractor records payments |
| Expired/free trader | Existing subscription restrictions | Funding only at database level | Existing assignments remain accessible subject to route/KYC gates | Own records only |
| Linked subcontractor | Does not receive parent-job access from the assignment | According to own subscription | Assigned scope and progress; cannot approve completion, change scope or set pay | Reads own package payment records; cannot create them |
| Other company | No access granted to private package or financial data | According to subscription | None for another company | No other-company metrics |
| Admin | Existing administration | Curate and publish | Read for oversight; cannot use owner-only assignment/payment RPCs as another company | Company metrics authorised; no impersonated payments |
| Staff | Existing staff scope | No new publishing permission | No company ownership privileges automatically | No global financial access automatically |

RLS tests use an isolated Postgres-compatible PGlite database with representative existing tables and the new migrations. They test the new policies/functions, not the entire historical migration chain or deployed Supabase configuration. Existing per-table policies and historical records need a staging deployment test with actual customer/trader/admin accounts before a claim of complete RLS certification.

## Remaining work before launch

### Backend and access

1. Apply all pending historical migrations plus the five `20260912...` migrations in this branch to staging, then production using the existing deployment workflow. Deploy the updated `launch-readiness` function with other pending functions.
2. Supply deployment secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`. The local preflight reports these as unavailable; this does not establish whether GitHub already holds them.
3. Run `/admin/launch-readiness` against the deployed backend. Verify private storage, correct auth redirect domains, recovery emails, verified provider supply, subscribed trader eligibility and integration queues.
4. Run real role tests covering customer → quote → award → milestone → evidence, plus main trader → linked subbie → progress → sign-off → external payment record. New subbies require an existing trader account and applicable KYC approval.
5. Review historical self-approved/legacy-default KYC states. New guards prevent future self-approval but do not retroactively establish validity.
6. Decide when to remove the existing browser-side preview password gate. It is a marketing preview gate, not authentication or a security boundary; it remains unchanged.

### External project and funding sources

- Current opportunity records are manually curated; no council-wide automated feed is claimed. Contract with a planning-data supplier or agree council feeds, confirm fields/coverage/update frequency, and obtain rights for in-app redistribution to subscribing traders. Build and test the chosen provider adapter after its contract is known.
- Planning approval is source intelligence, not confirmed demand, budget or a marketing opt-in. Records hold no applicant email/phone and have no bulk-contact button. Contact workflows require channel-specific compliance and opt-out handling.
- Funding needs council/nation-specific eligibility, scheme currency and conditions. An applicant's reported approval is not verified by Craftvaro. Admin review remains manual.
- Gabley/Immoviq repair outbox code already exists. New retrofit project intake does not claim a live Gabley assessment API or a DOMUREVA funding bridge. These contracts/credentials and project-level events still need implementation and end-to-end verification.
- No live council procurement registration, framework approval or installer-register verification is created by adding a Craftvaro account.

### Payments and full financials

- Stripe currently supports trader subscriptions. Confirm live price IDs, webhook signing, checkout, renewal, cancellation and failed-payment enforcement with the production account.
- Customer-to-trader and trader-to-subbie money movement requires payment-provider onboarding, payout design and reconciliation. New payment entries record payments already made elsewhere; they do not initiate transfers.
- Full financial reporting still needs complete customer receipts (including partial payments), supplier bills, expenses/materials, VAT/CIS handling, payroll where relevant, ledger entries and bank reconciliation. Do not infer profit from accepted quotes or subtract VAT-inclusive subcontract commitments from ex-VAT invoices.
- Package payment records are append-only; administrative correction/reversal handling and attachments need a subsequent controlled workflow. No payment documents are exposed to customers or unrelated subcontractors.

### Customer, trader and admin completion

- Customer dashboard already contains projects, quotes, milestones, tasks, logs, evidence and snags. Validate every action and its notifications on the deployed backend; local code presence alone does not prove live delivery.
- Trader dashboard now links projects, opportunities, subcontractors and performance. Subcontract progress is a work-package record, not real-time GPS tracking. Email/push for these new assignments, attachments and richer activity history remain to be added.
- Admin has existing KYC, users, directory, readiness, deletion, audit and integration operations plus source curation. Detailed permission templates for separate support/compliance/finance staff need a dedicated design; the new code does not grant all staff admin powers.
- Publish only after migration compatibility, live role smoke tests, source contracts, payment reconciliation and the existing go-live runbook gates are satisfied.

## Validation

- Application and tooling TypeScript checks pass.
- Production Vite build passes.
- 26 tests pass, including 11 new database cases for source publication/subscription, saved-record isolation, company ownership, subcontractor progress limits, payment validation, verification guards, private evidence and unauthenticated access.
- ESLint: no errors; 143 warnings remain in the repository.
- Static launch preflight passes with three deployment-secret warnings.
- Lockfile dry-run clean install passes. Browser screenshots were not obtained: Chromium was unavailable locally and its download timed out. Mobile/desktop visual and authenticated end-to-end checks remain a deployment gate.

## Official reference routes

- Planning data API: https://www.planning.data.gov.uk/docs
- Disabled Facilities Grants: https://www.gov.uk/disabled-facilities-grants
- Warm Homes Local Grant guidance: https://www.gov.uk/government/publications/warm-homes-local-grant
- Public tenders: https://www.gov.uk/find-tender
- Public-data marketing rules: https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/direct-marketing-guidance/collect-information-and-generate-leads/
