# Craftvaro project address privacy — staged release and role acceptance
Date: 1 November 2026
Status: **source candidate only; Craftvaro hosted database and production are unchanged.**

## Threat confirmed in source
The historic `subscribed trades view ordinary project jobs` SELECT policy disclosed every readable column of the `jobs` table to subscribing tradespeople. In addition to title, trade and area, those rows contained `address_line1`, the full `postcode`, `customer_profile_id`, private project descriptions and planning details. A browser's visible truncation of the postcode was not a server-side privacy control. The previous `job_awards` table did not have a clearly defined role-scoped RLS/write boundary in the canonical initial migration.

## Architecture of the fix
- **Full job:** the customer, administrator and accepted project contractor can read the real row using a narrowly scoped jobs RLS policy, based on the server-owned `job_awards` record. The existing repair award disclosure policy is left in place.
- **Prospective lead:** a verified, KYC-approved, actively subscribed trader can call `list_project_job_previews(p_job_id)` for an unawarded, open project. This deliberately privileged function validates identity/role/subscription on the server and selects only fixed, non-address fields. `SELECT * FROM jobs` is never used for prospective leads.
- **Privacy defaults:** preview title is generated from trade type, not from arbitrary customer-supplied title/description. Only the UK postcode **outward district** is returned for a validated UK postcode. The public preview excludes street, full postcode, customer profile ID, attachments, private scope, and other user-authored text that might contain an address.
- **Awards:** `job_awards` has RLS scoped to the administrator or actual trade-company owner. Direct API INSERT/UPDATE/DELETE is denied to authenticated/anonymous roles; controlled acceptance RPCs continue as server-owned authority.
- **UI:** job board combines RLS-approved private rows with server-approved lead previews, with private records taking precedence; detail view does not fetch sensitive subresources unless an authorised full row is visible; quote form accepts a generic approved preview; trader dashboard shows safe recent leads.

## Staged release sequence
1. Select **Craftvaro staging**, not DISHBEE, and compare the deployed migration ledger/policies/grants with the GitHub repository. Confirm all award/acceptance functions have server-side job-owner validation and correct `SECURITY DEFINER` ownership.
2. Back up staging and rehearse `supabase/migrations/20261101070000_project_job_lead_privacy.sql` with rollback. Inspect dependencies on `job_awards`, jobs SELECT policies, quotation acceptance, repair dispatch, evidence permissions, notifications and subcontracts.
3. Apply the migration, refresh Data API schema cache, and **then** publish the exact matching frontend branch. No old frontend must continue expecting full unawarded `jobs` rows.
4. Verify a direct PostgREST query to `jobs?select=id,address_line1,postcode,customer_profile_id` with real signed-in JWTs for six roles: owner, awarded contractor, unselected paid trader, unpaid trader, admin and unrelated customer. Unselected users must receive no private row. Do not test a customer JWT using service-role credentials.
5. Verify `rpc/list_project_job_previews` with real signed-in JWTs and assert that the JSON keys never include address, full postcode, owner ID, raw user-authored title/description or file paths. It must be empty for ineligible users, awarded/closed projects, and repair jobs. The `anon` role must not execute it.
6. Verify role-locked awards: unselected trade cannot insert or edit `job_awards`. The customer can accept a legitimate quote through `accept_project_quote`; after commit, only the selected trader can see the site address. Repair award and address-release rules remain unchanged.
7. Test customer portal, subcontracting, evidence, notifications, dashboard, quote acceptance and PDF/invoice routes at 360/390px mobile, 768px tablet and 1440px desktop. Test unexpected backend errors without falling back to unrestricted queries.
8. Run Supabase security/performance advisors and account-holder signoff before controlled production deployment. Confirm incident response and rollback plan.

## Outstanding design decisions
- Prospective leads intentionally omit customer-authored full project descriptions to avoid accidentally leaking personal details typed into free text. A dedicated, **customer-reviewed public brief** with a moderation/PII review step is a separate next phase; do not auto-copy historic descriptions into a public field.
- A specifically **assigned subcontractor** needs a new scoped permission path; merely being a subscribing trade or being listed as company staff is insufficient to release the customer address.
- A market selector is a browsing preference, never a source for contracting entity, job jurisdiction, RLS, or payments. German localisation, professional credentials and legal review are separately gated.
- Existing contact details already sent in messages/exports cannot be retrospectively revoked by this job-table migration. Audit other exposed tables, public views, storage URLs and connected APIs before calling the entire platform privacy-complete.
- This migration is independent of draft PRs #11 (fulfilment), #14 (atomic quotes), #17 (UK/DE), and #18 (onboarding security). Test their combined schemas in staging and resolve feature-branch overlap before merging any of them.

## Verification evidence
PGlite fixture: `src/test/project-job-privacy.test.ts` first reproduces the old subscribed-trader private-address leak; then tests denied direct row access, whitelisted previews, recipient/award isolation, selected contractor and customer access, admin access, denied anonymous/unverified/unpaid previews and blocked client-created awards.

Automated source tests are not equivalent to a live authenticated JWT, production database permission audit or physical-device acceptance.
