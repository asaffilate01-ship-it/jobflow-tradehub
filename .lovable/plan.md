
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

## Phase 8: Email & SMS Notifications ✅
- `dispatch-notification` edge function — multi-channel (in-app, email, SMS)
- Email: uses Lovable email infra (send_email_message RPC) — needs domain setup
- SMS: Twilio integration ready — needs TWILIO secrets
- Supports single-recipient and broadcast modes

## Phase 9: Push Notifications ✅
- Service worker (`public/sw.js`) with push event handling + notification click
- `push_subscriptions` table with RLS (user-scoped)
- `usePushNotifications` hook — subscribe/unsubscribe with VAPID keys
- `send-push` edge function — sends Web Push to all user devices
- Auto-cleanup of expired subscriptions
- Needs VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT secrets

## Phase 10: OWASP Top 10 Security Audit ✅
- Removed public material_orders read policy → verify_order_status() RPC
- Replaced public profiles policy → authenticated only
- Tightened jobs RLS → posted visible to all, other statuses to related users
- Removed duplicate storage INSERT policy on job-evidence
- Added storage UPDATE policy for job-evidence
- Realtime channel scoping: Supabase-managed limitation documented

## Phase 11: Live Merchant API Integrations ✅
- Travis Perkins — REST API with Basic auth, multi-category fetch
- Jewson — OAuth2 client credentials flow, paginated catalog
- Toolstation — API key product feed
- Screwfix — API key catalog with category iteration
- `scheduled-price-sync` edge function — automated daily sync across all merchants
- All adapters handle auth, pagination, error recovery, and catalog upsert
