
## Phase 1: Database & Infrastructure ✅
- Notifications table + realtime
- Broadcast channels & messages
- Group messaging

## Phase 2: In-App Notification UI ✅
- Bell icon with unread count
- Notification dropdown with mark-as-read
- Realtime subscription

## Phase 3: PWA Setup ✅
- manifest.json, mobile meta tags
- Installable web app

## Phase 4: Capacitor Setup ✅
- Native shell configured

## Phase 5: Marketplace & Procurement ✅
- Smart Order comparison engine
- Trade account credential storage (AES-GCM encrypted)
- Price quotes & itemised reports

## Phase 6: Customer Portal & Trust ✅
- Customer project dashboard (My Projects)
- Trader portfolio with reviews
- Budget tracker on job detail
- Postcode outcode on marketplace cards

## Phase 7: Merchant Integrations ✅ (stubs ready)
- `scrape-merchant-prices` edge function — Firecrawl scraping + API adapter pattern
- `sync-merchant-catalog` edge function — CSV/JSON bulk catalog upload
- API adapter stubs for Travis Perkins, Jewson, Toolstation, Screwfix

## Phase 8: Email & SMS Notifications (next)
- Email domain setup for transactional emails
- Twilio connector for SMS alerts
- Edge function to dispatch notifications across channels

## Phase 9: Push Notifications (next)
- Web Push API integration for PWA
- Capacitor Push Notifications plugin for native

## Phase 10: OWASP Top 10 Security Audit (next)
- Run security scan
- Review all RLS policies
- Check for injection, XSS, broken auth, CSRF
- Fix findings and document

## Phase 11: Live Merchant API Integrations (future)
- Travis Perkins API credentials + real adapter
- Jewson API integration
- Toolstation product feed
- Screwfix catalog sync
- Automated daily price sync via cron/scheduled function
