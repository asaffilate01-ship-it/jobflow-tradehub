
## Phase 1: Security & Database Hardening
1. **Add `profiles` public read policy** for marketplace trader cards (only non-sensitive fields via a view)
2. **Add `service_radius` and `services_description` columns** to profiles for trader marketplace cards
3. **Make trader profiles publicly browsable** while keeping PII behind auth walls

## Phase 2: Landing Page + Public Marketplace
4. **Landing page** — Checkatrade-inspired hero with search, category cards, recommended jobs preview
5. **Public marketplace** — Browse trader cards by category with ratings, services, areas, verification badges
6. **Trader profile detail page** — Full card with services, past work, trade body memberships, contact (gated by subscription)

## Phase 3: Auth & Role-Based Routing  
7. **Role-aware navigation** — Different nav items per role (customer sees Post Job, trader sees Dashboard, driver sees Jobs)
8. **Protected routes** — Wrap pages with role guards, redirect unauthorized users
9. **Profile setup flow** — After signup, prompt to complete profile (trader: services/radius, driver: vehicle, customer: basic info)

## Phase 4: Customer Flow
10. **Post a job form** — Title, description, trade type, location, budget, photos, urgency
11. **Job detail page** — Shows quotes received, progress, milestone payments (for job owner)
12. **Job visibility rules** — Free traders see title + area code only, subscribed see full details

## Phase 5: Trader Dashboard
13. **Dashboard home** — KPIs (active jobs, revenue, pending quotes, upcoming deliveries)
14. **Trade accounts management** — Add/manage merchant trade accounts (TradePoint, Wickes, Selco etc.)
15. **Job browser** — View available jobs, filter by trade/location/budget, submit quotes
16. **Active jobs** — Kanban board with task lists, progress tracking
17. **Materials ordering** — Search items, compare merchant prices, order with delivery options

## Phase 6: Delivery & Driver Flow
18. **Delivery pricing engine** — Edge function using rate card data from DB
19. **Driver job feed** — Available delivery jobs to accept
20. **Delivery tracking** — Status updates, proof of delivery

## Files to create/modify:
- `src/pages/LandingPage.tsx` — Public landing page
- `src/pages/MarketplacePage.tsx` — Rewrite with real DB data  
- `src/pages/TraderProfilePage.tsx` — Individual trader profile
- `src/pages/PostJobPage.tsx` — Customer job posting
- `src/pages/JobDetailPage.tsx` — Job detail with quotes/progress
- `src/pages/TraderDashboard.tsx` — Trader home dashboard
- `src/pages/TradeAccountsPage.tsx` — Manage merchant accounts
- `src/pages/ProfileSetupPage.tsx` — Post-signup profile completion
- `src/components/ProtectedRoute.tsx` — Role-based route guard
- `src/components/marketplace/TraderCard.tsx` — Checkatrade-style card
- `src/components/marketplace/CategoryFilter.tsx` — Trade category filter
- `src/components/jobs/JobCard.tsx` — Job listing card with visibility gating
- `src/components/dashboard/KpiCards.tsx` — Dashboard stats
- Update `src/App.tsx` — New routes
- Update `src/components/AppNav.tsx` — Role-aware navigation
- DB migration: Add trader_profile fields, public profile view
