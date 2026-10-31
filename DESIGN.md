# TraderOS DESIGN.md

## What this is
Tradespeople, customers, quote/dispatch operators and materials delivery drivers use this product for job discovery, scoped quotes, scheduling, evidence uploads, trade assignments, materials and payments.

## Visual language
Current src/index.css uses slate-blue HSL 216 62% 20% primary, warm orange accent HSL 29 78% 52% and dedicated dark states; prioritise legible trade operations.

## Data truth and UX priority
Real job/quote price, scope and exclusions, dates and contractor identities must be clear. Distinguish estimates from accepted quotes, verified licence from self-description, and paid from requested payments.

## Requirements
- Public pages have one primary task and truthful content. SaaS workspaces show queues, status, owner, cost/time, action and recoverable errors before ornamental charts.
- Preserve server-side role checks, private data, legal settings, audit trails and real money state; never substitute fake production values or disable gates for screenshots.
- Match current CSS tokens and component library, with coherent status colours and accessible text hierarchy.
- Validate at mobile 360/390px, tablet 768px, desktop 1440px; keyboard, screen reader, 200% zoom, focus, contrast and reduced motion. Inspect long text and missing records.
- Distinguish mockups, sandbox actions, queued jobs, deployed features and verified user outcomes.

## Tools
- Taste Skill: https://github.com/Leonxlnx/taste-skill; `npx skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend` for supported agents.
- Impeccable: https://github.com/pbakaus/impeccable; `npx impeccable install` for targeted critique/audit/harden/polish. Advisory source scan: `npx impeccable detect src/`.
- Awesome DESIGN.md: https://github.com/VoltAgent/awesome-design-md; borrow structure for a project-owned design document, not another company’s visuals.

## Ship gate
Existing tests, lint and build, role-and-transaction acceptance, rendered breakpoints and keyboard UX. Do not force push or use Lovable credits.

## UK and German markets (31 October 2026)
- Keep **market/country** (GB or DE) independent of **interface language** (en or de). A German-speaking UK visitor must see the UK regional mark/operator, and an English-speaking German-market visitor the DE variant.
- Country preference is a display/search preference only. Server-owned merchant country, registered contracting entity, VAT, prices, permissions, job jurisdiction and payment mandate must never be inferred from a browser selector.
- The visible country selector must be keyboard accessible, available in mobile navigation, and persist across public pages. Deep links may express the initial display preference with ?country=DE; official country domains take priority.
- Never present UK-only Gas Safe search, UK SMS verification, Stripe subscriptions or fulfilment as complete German operations. German workflows require separate acceptance and legal approval.
- Regional-brand assets are owned by Craftvaro; use Awesome DESIGN.md as structural reference, not as a licence to copy another company's identity.
