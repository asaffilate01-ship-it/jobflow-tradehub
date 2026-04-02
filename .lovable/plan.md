## Phase 1: Navigation Overhaul

### 1a. Trader Sidebar (Desktop) + Bottom Nav (Mobile)
- Create `TraderLayout.tsx` with shadcn Sidebar for desktop (collapsible icon mode)
- Bottom nav bar for mobile with key trader actions (Dashboard, Jobs, Materials, Evidence, Messages)
- Replace `AppLayout` usage for all trade-only routes in `App.tsx`
- Keep `AppLayout` (top nav) for public/customer pages

### 1b. Driver Layout
- Similar pattern: compact sidebar desktop, bottom nav mobile
- Key nav: Dashboard, Active Deliveries, Earnings, Profile

### 2. Rename "Basic CAM" → "Site Evidence"
- Rename the page title, nav labels, and route from `/basic-cam` to `/site-evidence`
- Update all references

## Phase 2: UI/UX Polish

### 3. Trader Dashboard Polish
- Better KPI cards with sparklines/progress indicators
- Recent activity feed (quotes, orders, messages)
- Job status chips with consistent color coding
- Responsive card grid improvements

### 4. Driver Dashboard Polish
- Cleaner delivery cards with route info
- Earnings summary with period selector
- Available jobs map placeholder

### 5. Materials Page Polish
- Step-by-step wizard flow (Select Job → Browse Catalog → Compare Prices → Checkout)
- Better price comparison table layout
- Clearer delivery mode selection with cost breakdown

### 6. General Polish
- Consistent glass-card styling with subtle gradients
- Loading skeletons everywhere
- Empty states with CTAs
- Breadcrumbs on detail pages

## Phase 3: Spec Gap Fills

### 7. Multi-Merchant Price Comparison (per spec)
- Show itemised report: cheapest per product across merchants
- Factor in delivery costs + trade account discounts
- Allow trader to pick best option per item

### 8. Job Visibility Rules (per spec)
- Free users: title, trade type, area code, property type only
- Subscribed: full address, budget, customer contact, description
