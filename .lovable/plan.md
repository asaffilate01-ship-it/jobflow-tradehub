
## Phase 1: Database & Infrastructure (this message)

### 1A. Notifications table + realtime
- Create `notifications` table (type, title, body, recipient_id, read_at, link, metadata)
- RLS: users see only their own notifications
- Enable realtime on notifications table

### 1B. Broadcast channels
- Create `broadcast_channels` table (name, audience_role, created_by)
- Create `broadcast_messages` table (channel_id, title, body, sent_at, sent_by)
- Admin/trade can broadcast to drivers, traders, etc.

### 1C. Group messaging
- Add `channel` concept to existing messages (job-scoped stays, add broadcast channels)

## Phase 2: In-App Notification UI (this message)
- Bell icon component with unread count badge
- Notification dropdown/panel with mark-as-read
- Wire to realtime subscription for instant updates
- Add to TraderLayout, DriverLayout, AppNav

## Phase 3: PWA Setup (this message)
- Add `manifest.json` with icons and `display: standalone`
- Add mobile meta tags to `index.html`
- Simple installable web app (no service worker to avoid preview issues)

## Phase 4: Capacitor Setup (this message)
- Install Capacitor dependencies
- Configure `capacitor.config.ts` with hot-reload URL
- Instructions for user to build native

## Phase 5: Email & SMS Notifications (next message)
- Email domain setup for transactional emails
- Twilio connector for SMS alerts
- Edge function to dispatch notifications across channels

## Phase 6: Push Notifications (next message)
- Web Push API integration for PWA
- Capacitor Push Notifications plugin for native

## Phase 7: OWASP Top 10 Security Audit (next message)
- Run security scan
- Review all RLS policies
- Check for injection, XSS, broken auth, CSRF
- Fix findings and document
