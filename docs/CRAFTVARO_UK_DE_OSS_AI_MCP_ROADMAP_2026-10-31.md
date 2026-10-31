# Craftvaro UK + Germany: OSS, agent and MCP improvement register
Last repository audit: 31 October 2026. This is a prioritised shortlist, **not** a claim that thousands of upstream repositories have been individually audited or installed.

## Actual platform baseline
Canonical product: `jobflow-tradehub` (React 18, Vite, TypeScript, Tailwind, shadcn/Radix, Supabase/Postgres/RLS, Edge Functions, Capacitor, Playwright and Vitest). SaaS/Omniqora Factory is a future orchestration/tenant service, not the source of truth for Craftvaro domain records.

Implemented or in source: public trades directory and claim flow, jobs and quotations, subscriptions, KYC gates, projects, subcontracting, materials, delivery pricing, driver workflows, AI repair and UK AI trade search, evidence, basic accounting, Dokuvera integrations, country-specific design assets. **This list is not a live deployment or signed-in acceptance certificate.**

Pending/blocked: PR #14 atomic quote RPC requires a matching staged migration; draft PR #11 merchant confirmation/controlled dispatch requires a separate staged migration and coordinated client release. German signup, German credentials, country-specific prices, payment settlement, real supplier APIs, multilingual operational routes and signed mobile acceptance remain unverified.

## Design research and adoption decision
| Source | Fit | Decision |
|---|---|---|
| https://github.com/Leonxlnx/taste-skill | Existing React site redesign, hierarchy, spacing, premium trade-specific visual language | Use the current `design-taste-frontend` existing-project browser-audit workflow first; keep Craftvaro assets; do not replace navigation or form contracts blindly |
| https://github.com/pbakaus/impeccable | Deterministic source detectors plus critique/polish/UX refinement | Existing advisory GitHub Action retained. Upgrade detector only after pin review and baseline; source scan is not browser QA |
| https://github.com/VoltAgent/awesome-design-md | DESIGN.md reference structures and token patterns | Structure/inspiration only; use project-owned DESIGN.md and original brand identity |
| https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | Pattern and component comparison | Use for exceptional workflows, avoid duplicated instruction packs and generic dashboard generation |
| https://github.com/emilkowalski/skills | Motion ergonomics, intentional feedback and reduced-motion principles | Apply selectively to transitions; no animation that delays quote/payment actions |
| https://github.com/shadcn-ui/ui | React component reference | **Already uses** Radix/shadcn; extend current components, do not add a second conflicting design system |
| https://github.com/dequelabs/axe-core | WCAG checks | Adopt Playwright/axe accessibility smoke suite at 360, 390, 768 and 1440 px, with manual keyboard and screen-reader acceptance |
| https://github.com/microsoft/playwright | Browser automation and Playwright MCP | Add signed-in UK and DE exploratory tests; screenshots and keyboard outcomes are evidence, not proof of server rights |

### Craftvaro UX priorities
1. **True territory, separate translation.** Persistent UK/DE marketplace selection must not change when EN/DE language is switched; country drives the regional logo and the correct market listing filter. Business/operator information is display-only; server jobs/contractual entities remain authoritative.
2. **Job/quote confidence.** Mobile scope/price/exclusions/line totals; prominent draft vs sent vs accepted vs invoiced/paid states, explicit retries and accessible validation; wait for atomic quote RPC before backend claim.
3. **Materials and drivers.** Supplier confirmation, substitution acceptance, pickup readiness, real delivery cost, proof-of-delivery and cancellation state. No fictitious purchase, delivery or payout states.
4. **Customer project timeline.** Plain-language milestones, supplier/dependency status, evidence attachments, variations and signed approval with transparent role permissions.
5. **German operational quality.** Translate complete forms, validation/errors, profile, messaging, onboarding, invoicing and support; German phone/address, VAT/reverse-charge rules where appropriate, and local professional licensing/insurance checks. Legal counsel must verify German company/operator and tax disclosures before launch.
6. **Reliability/accessibility.** Skeletons, server errors, stale-response suppression, recovery actions, copyable IDs, proper focus management, reduced motion, 200% zoom and realistic offline/low-bandwidth conditions.

## High-value functional open-source shortlist
| Capability | Candidate | Integration constraint |
|---|---|---|
| Interactive project dependency/phase map | https://github.com/xyflow/xyflow | Consider only when project graph persistence and role edit rights exist; retain list/table alternative |
| Delivery/site availability map | https://github.com/maplibre/maplibre-gl-js | Maps need licensed tiles/routing and consent; privacy-first geocoding, no public raw customer coordinates |
| Accessibility regressions | https://github.com/dequelabs/axe-core | Integrate as test dependency, not visual decoration |
| Durable AI workflows | https://github.com/langchain-ai/langgraphjs | Use behind Omniqora, never directly from the public React browser; checkpoint and approval state per tenant |
| Quotation/scope signing | https://github.com/documenso/documenso | Assess licence, audit evidence and UK/eIDAS legal applicability before procurement/integration |
| Adyen-based platform payments | https://github.com/Adyen/adyen-node-api-library | Zoryn Pay is future/conditional; existing subscriptions use Stripe. Payment onboarding, legal entity, approval, signatures and reconciliation are mandatory |
| Automated operational monitoring | https://github.com/getsentry/toolkit | MCP for dev/support triage only, scoped access and PII scrubbing; incidents never trigger a payout or contractor acceptance |
| Evidence and browser QA | https://github.com/microsoft/playwright | Existing Playwright dependency; add real mobile and authenticated state coverage before native releases |

## Craftvaro AI agent roadmap (Omniqora-owned)
Agents are features with **read, propose, verify, approve, execute, reconcile** boundaries, not autonomous actors with open database access.

1. **Job Brief Assistant:** drafts the job scope, asks for site details, separates materials/labour, highlights unknowns, flags safety risks; customer confirms before posting.
2. **Trade Matching Agent:** ranks **authorised, subscribed, actually eligible** local providers using distance, skills, independently checked credentials, availability and verified job outcomes. Never fabricate Gas Safe/Handwerksrolle certification or rankings.
3. **Quote Comparison Agent:** normalises each submitted quote into VAT, exclusions, milestone dates, material allowances, change-order terms and comparable scope; no unilateral acceptance.
4. **Materials Procurement Assistant:** suggests equivalent SKUs, checks supplier catalogues only through approved APIs, estimates delivery and substitutes; merchant/operator approval before real purchase.
5. **Schedule and Dispatch Copilot:** proposes task order, vehicle fit, pickup time, route and site access windows; server authorisation, merchant readiness and driver acceptance before dispatch.
6. **Repair/Triage Agent:** indicative cause, severity and service category with emergency stop gates and region-specific safety instructions; human professionals remain responsible.
7. **Invoice/Accounting Agent:** drafts invoices from accepted work records, flags VAT/inconsistency and reconciles authorised payment-provider events; never marks paid from chat text.
8. **Compliance and Evidence Agent:** collects certificates, expiry reminders, incident/media metadata and redaction tasks; no invented verification or regulator approval.
9. **Support/Dispute Agent:** assembles timestamped evidence, customer/trader messaging and appeals; human resolves liability or refunds.

### MCP connector shortlist
- **Model Context Protocol standards/reference:** https://github.com/modelcontextprotocol/servers — reference servers are educational, not production-ready.
- **Playwright MCP:** https://github.com/microsoft/playwright-mcp — browser QA of real hosted builds; no privileged production session in public AI chat.
- **Sentry MCP:** https://github.com/getsentry/toolkit — limited-read error triage; redact account, customer address, tokens and attachment payloads.
- **GitHub tools:** for PR review, CI status, checks and release evidence; avoid unreviewed direct-to-main agents.
- **Approved supplier, routing and payment tools:** implement in Omniqora via typed, tenant-scoped connectors with explicit action ACL, country scopes, versioned schemas and audited approvals; public unauthenticated MCP endpoints are prohibited.

## Release gates and separation
**P0 — current safe changes:** Country selection/display decoupling, DE UK-only AI disclaimer, explicit DE gates for UK-only signup/job posting, UI reliability; no database migration. Validate CI/build and manual browser before merge.

**P1 — transactional correctness:** Stage and verify atomic quote submission PR #14 with signed-in tests; do not merge/publish frontend before migration. Rehearse draft PR #11 separately with strict sequencing, event logging and driver permissions.

**P2 — controlled UK pilot:** End-to-end jobs, projects, quotes, supplier-ready materials, delivery proofs, payment status read from provider, customer notifications/retries, accessible mobile acceptance and admin support audit.

**P3 — DE pilot:** Registered legal/operator and country tax/compliance counsel, DE-specific credentials, German OTP/onboarding and invoices, exact translations and local provider density. A displayed DE selector is **not** evidence that those workflows are available.

**P4 — Omniqora agents and MCP:** Shadow-mode suggestions, tenant RLS/credential scopes, prompt-injection/red-team tests, quotas, data retention, no cross-tenant memory, strict approval for purchases, pricing overrides, booking, offers, fulfilment and payouts.

**P5 — native and growth:** Signed iOS/Android, 200% zoom/accessibility, camera permissions, push delivery, offline safeguards, German and UK search growth, merchant API contracts and unified business analytics.

### Evaluation rules for new repositories
Do not blindly import thousands of skills/repos. For each candidate: verify maintainer and recent releases, inspect licence and transitive dependencies, measure bundle impact, document threats to RLS/privacy, require staged proof on the Craftvaro stack, pin versions, add rollback and record human owner. Choose one tool per capability whenever possible.

This document is a plan and inventory, not a declaration that integrations, German legal approval, payments, or production cutovers have been completed.
