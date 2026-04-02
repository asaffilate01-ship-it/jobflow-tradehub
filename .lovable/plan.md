
## Features to Build

### 1. Multi-Merchant Price Comparison
- When ordering materials, search `merchant_catalog_items` across multiple merchants for the same/similar items
- Show a comparison table: merchant name, price, stock status, delivery options
- Highlight cheapest option per item, factor in delivery cost
- Trader picks best combination

### 2. Merchant Catalog Integration
- Seed `merchant_catalog_items` with sample products across key merchants (timber, cement, plumbing fittings, etc.)
- Build a browsable catalog UI on the Materials page — search/filter by category, merchant
- Allow adding catalog items directly to an order (auto-fills name, price, SKU)

### 3. Distance Auto-Calculation
- Use postcode-based distance estimation (lookup table or Haversine formula)
- Seed merchant_branches with lat/lng coordinates
- When a job + merchant branch are selected, auto-calculate miles and update delivery pricing
- Replace manual miles input with auto-calculated value (with manual override)

### 4. Driver Broadcast & Acceptance Flow
- **Driver Dashboard**: Show available (broadcast) deliveries with pickup/dropoff, payout, vehicle requirement
- Accept delivery → updates status to "assigned" and sets driver_profile_id
- Delivery status progression: assigned → arrived_at_pickup → collected → en_route → delivered
- Status update buttons with timestamps
- Delivery event log (already has table)

### 5. Merchant Confirmation Flow
- After trader submits order (status: submitted), merchant needs to confirm
- Add order detail view showing items, status timeline
- Status progression: draft → submitted → confirmed → ready_for_pickup → collected → delivered
- Trader can see real-time status updates on their orders

### Implementation Order
1. Seed catalog data (DB insert)
2. Merchant catalog browsing + add-to-order UI
3. Multi-merchant comparison on Materials page
4. Distance auto-calc (seed branch coords + Haversine)
5. Driver delivery acceptance flow (DriverDashboard)
6. Order status timeline + confirmation flow
