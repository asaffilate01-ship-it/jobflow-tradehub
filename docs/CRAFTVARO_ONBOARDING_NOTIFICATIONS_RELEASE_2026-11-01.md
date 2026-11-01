# Craftvaro signup and notification security — release plan
Date: 1 November 2026. **Code and migration staged only; not deployed to the Craftvaro database.**

## Confirmed original problems
- Browser signup attempted to insert user_roles after auth.signUp, even though email-confirmation signups do not have an authenticated session yet. The attempted write ignored errors; some users could end up with no role.
- The user-facing driver option was not compatible with the legacy self-role-insert policy (driver excluded), while login screens treated the role as already assigned.
- The customer phone step called signInWithOtp(phone), which is a sign-in/new-user flow, not linking an email account, and then attempted to mark phone_verified despite a server-side trust-field guard.
- The historical `System inserts notifications` RLS policy allowed any authenticated browser to insert an arbitrary in-app message for any recipient. All platform-generated messages need to pass the authenticated dispatch-notification service instead.
- The notification Edge Function returned success even when one or more channel requests failed. This is a request-receipt problem; email/SMS delivery itself still requires provider webhook reconciliation.
- Profile setup could show "complete" despite a failed company, coverage or vehicle record write.

## Changes in this branch
1. Forward-only migration `20261101064000_signup_role_and_notification_security.sql` replaces the *existing* auth.users signup trigger function, preserving trigger name/history. It writes the profile and initial role together in the signup database transaction, with a strict allowlist (customer/trade/driver); any admin, staff or unknown signup preference becomes customer.
2. Existing accounts without any role are backfilled as **customer** only, never upgraded based on mutable metadata. An administrator must explicitly review and grant higher roles where warranted.
3. Direct authenticated self-role assignment is closed. The existing admin RLS policy remains for controlled role management.
4. Direct authenticated INSERT into notifications is denied, retaining service_role ability to create messages through dispatch-notification. Recipient read/read-marker policies remain unchanged.
5. Signup no longer calls phone signInWithOtp nor pretends phone verification is MFA. A real, authenticated phone-change or TOTP MFA flow can be built separately and must be tested before marketing.
6. The notification Edge Function returns non-2xx on any failed channel request and describes accepted/failed channels. This does **not** claim delivery confirmation.
7. Profile setup fails visibly and can retry when a company, trade coverage or driver profile write fails.
8. PGlite regression tests cover signup role race, admin-role spoofing, legacy backfill, self-grant denial and notification insert denial.

## Security model and limits
- A requested trade/driver role is **only a category**. It does not verify ID, a licence, service area, subscription or driver readiness. Existing KYC, profile verification, RLS and transactional RPC gates must continue to enforce those separately.
- `auth.users.raw_user_meta_data` is user-editable. Its role value is consumed **only once in an allowlisted signup transaction**; never use it directly for RLS or later authorisation. Persisted, administrator-controlled verification fields remain authoritative.
- A signup attempt for an existing email may return an obfuscated account. UI gives a non-enumerating response and requires email confirmation/login.
- This release does not enable German signup. German market restrictions remain isolated in PR #17, and country selection cannot grant a role or verified credential.
- The Edge Function uses a server-side service-role key. No service-role credentials are sent to the browser.
- The notification policy fix is a security priority but **must be coordinated** with Edge Function deployment; otherwise direct browser inserts (which were insecure) stop while the backend dispatcher is unavailable.

## Required release sequence
1. Connect the **Craftvaro** Supabase staging project (the linked account checked on 31 October exposed DISHBEE only). Verify current migration ledger, existing on_auth_user_created trigger, RLS policies, table grants and Edge Function deployment.
2. Rehearse migration in a rolled-back staging transaction and run security advisors. Confirm `auth.users` signup trigger creation does not fail due to role/schema ownership. Record the exact migration version on deployment.
3. Deploy updated `dispatch-notification` Edge Function with the SQL migration and client in a coordinated release. Confirm service_role notification inserts and denied direct authenticated inserts.
4. Verify real email-confirmation signup for customer, trade and driver, then sign in and inspect role, KYC status and company/driver records. Test that admin/staff spoofing is denied, and an old roleless account becomes customer only.
5. Exercise partial notification channel failure, denied recipient access, role-scoped broadcasts, authenticated profile setup retries, KYC upload and active-subscription gates.
6. Verify signed-in browser/mobile flows and incident/error logging. Do not move to production until staging and legal/security signoff.

No hosted database, account, user data, merchant purchase or customer payment was modified by source commits in this PR.
