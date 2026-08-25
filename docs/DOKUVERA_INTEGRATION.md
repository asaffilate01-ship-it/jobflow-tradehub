# Repair Assist and Dokuvera integration

## Product boundary

Craftvaro owns provider matching, dispatch, offers and awards. Gabley can launch the same intake for an individual property owner; Immoviq can launch it for a managed property or tenancy. Dokuvera is the evidence system of record: original media, redacted derivatives, checksums, certificates, audit history and the final evidence pack.

All products should use the Craftvaro `job.id` as the stable external repair identifier. Do not copy evidence into separate product databases. The migration adds `source_product`, `source_reference`, `property_reference` and `tenancy_reference` to link everything to the same repair and Dokuvera case.

## Implemented flow

1. The customer creates a `jobs` row with `job_kind = 'repair'` and uploads media to the private `repair-intake` bucket.
2. `repair-diagnose` checks ownership, applies emergency rules, calls the optional vision gateway, creates `repair_diagnoses` and queues Dokuvera events.
3. Safety-stop cases are paused and are not dispatched automatically.
4. Non-emergency cases call `match_repair_providers`. It returns at most four providers with an active non-free Craftvaro subscription, verified capability and insurance, valid regulated credentials where needed, availability and postcode coverage.
5. Each `repair_dispatch_invites.scoped_payload` contains only the description, trade, approximate postcode sector, risk level and indicative cost. It never contains the street address.
6. Dokuvera processes the original media and calls `dokuvera-webhook` with redaction/checksum results. Providers receive only short-lived signed URLs for media marked `safe` with a redacted storage path.
7. A provider submits a structured offer through the `submit_repair_offer` database function.
8. The owner accepts or declines. `accept_repair_offer` changes the quote, award, dispatch and job in one transaction, rejects competing offers and then releases the exact address to the winner.
9. `dokuvera-sync` sends the current repair, diagnosis, media, offers and certificates to Dokuvera. The UI shows the Dokuvera status and evidence-pack link.

## Supabase deployment

Apply migrations and deploy the functions from the repository root:

```bash
supabase db push
supabase functions deploy repair-diagnose
supabase functions deploy repair-provider-media
supabase functions deploy dokuvera-sync
supabase functions deploy dokuvera-webhook --no-verify-jwt
supabase functions deploy integration-outbox-worker --no-verify-jwt
```

Set secrets in the Supabase project:

```bash
supabase secrets set \
  DOKUVERA_API_URL=https://api.dokuvera.example \
  DOKUVERA_API_TOKEN=replace-me \
  DOKUVERA_SIGNING_SECRET=replace-with-a-long-random-secret \
  DOKUVERA_WEBHOOK_SECRET=replace-with-a-different-long-random-secret
```

The vision integration is optional. Without it, the workflow provides text-based safety triage, low-confidence possible causes and provider matching, and the UI must describe this as rules-based rather than image AI:

```bash
supabase secrets set \
  REPAIR_VISION_GATEWAY_URL=https://your-private-ai-gateway.example/repair/analyse \
  REPAIR_VISION_GATEWAY_SECRET=replace-me
```

The vision gateway should return:

```json
{
  "summary": "Visible water staining beneath a compression fitting",
  "hazard_terms": ["water near electrics"]
}
```

Keep the vision gateway server-side. It must not return a definitive diagnosis and must not override the deterministic safety stop.

## Provider activation

The migration creates a repair profile for each existing trade company whose owner has a trade specialism. Before that company can be matched, it must hold an active paid/trial Craftvaro subscription and an administrator must validate its capability and insurance; gas and electrical work also requires an appropriate, unexpired regulated credential. Providers can change coverage and availability, but database protection prevents them from self-verifying. Changing insurance or credential details automatically clears the relevant verification.

Until an admin screen is added, an authorised backend/admin process can activate a checked provider with:

```sql
update public.trade_repair_profiles
set service_postcode_prefixes = array['SW', 'SE'],
    capability_verified = true,
    insurance_verified = true,
    insurance_expires_at = date '2027-08-31',
    available = true,
    emergency_work = true
where trade_company_id = '<verified-company-uuid>'
  and trade = 'plumber';
```

For `gas_engineer` or `electrician`, also set `credential_type`, `credential_number`, `credential_verified` and `credential_expires_at` from the verifier service—not from browser input.

## Dokuvera outbound adapter

`dokuvera-sync` sends `POST {DOKUVERA_API_URL}/v1/cases/upsert` with:

```http
Authorization: Bearer <DOKUVERA_API_TOKEN>
X-Dokuvera-Signature: sha256=<HMAC-SHA256 of raw request body>
Idempotency-Key: craftvaro:<job_uuid>
Content-Type: application/json
```

The body contains:

```json
{
  "external_system": "craftvaro",
  "external_case_id": "job-uuid",
  "existing_dokuvera_case_id": null,
  "property": {
    "address_line1": "owner-and-Dokuvera-only until award",
    "city": "London",
    "postcode": "SW1A 1AA",
    "country": "GB"
  },
  "repair": {
    "title": "Water or leak",
    "description": "...",
    "status": "posted",
    "priority": "normal",
    "requested_trade": "plumber",
    "created_at": "ISO-8601"
  },
  "source": {
    "product": "craftvaro",
    "reference": null,
    "property_reference": null,
    "tenancy_reference": null
  },
  "diagnosis": {},
  "media": [
    {
      "source_id": "media-uuid",
      "media_type": "image",
      "captured_at": "ISO-8601",
      "checksum": null,
      "redaction_status": "pending",
      "signed_url": "10-minute-private-url",
      "expires_in": 600
    }
  ],
  "offers": [],
  "certificates": []
}
```

Dokuvera should answer with:

```json
{
  "case_id": "dokuvera-case-id",
  "status": "synced",
  "evidence_pack_url": "https://dokuvera.example/evidence-pack/authorised-link",
  "version": 1
}
```

The example route is the adapter contract introduced by this repository; point `DOKUVERA_API_URL` at the real Dokuvera API or a small adapter service that implements it.

## Dokuvera webhook

Configure Dokuvera to call:

```text
POST https://<supabase-project>.supabase.co/functions/v1/dokuvera-webhook
```

Sign the exact raw JSON request bytes with `DOKUVERA_WEBHOOK_SECRET` and send the digest as `X-Dokuvera-Signature: sha256=<hex>`.

```json
{
  "event_id": "globally-unique-event-id",
  "event_type": "evidence.processed",
  "job_id": "craftvaro-job-uuid",
  "case_id": "dokuvera-case-id",
  "status": "synced",
  "evidence_pack_url": "https://dokuvera.example/evidence-pack/authorised-link",
  "evidence_updates": [
    {
      "source_id": "repair-media-uuid",
      "evidence_id": "dokuvera-evidence-id",
      "redaction_status": "safe",
      "redacted_storage_path": "owner-uuid/job-uuid/redacted/file.jpg",
      "checksum": "sha256-hex"
    }
  ],
  "metadata": {}
}
```

`redacted_storage_path` must identify a derivative already written into Craftvaro's private `repair-intake` bucket. A provider never receives the original object path. Webhooks are deduplicated by `event_id`.

## Gabley and Immoviq

Gabley or Immoviq should include these fields when their authenticated backend creates the repair job:

```json
{
  "source_product": "gabley",
  "source_reference": "customer-case-id",
  "property_reference": "shared-property-id",
  "tenancy_reference": null
}
```

The adapter should create the Craftvaro repair with the signed-in user's delegated consent. `repair-diagnose` writes status events addressed to the originating product into `repair_integration_outbox`, and `dokuvera-sync` includes the same source references in the evidence case. `integration-outbox-worker` delivers Gabley/Immoviq events with HMAC signatures, idempotency keys, bounded batches and exponential retry. Route customer-facing status to Gabley, portfolio/work-order status to Immoviq, provider offers to Craftvaro, and evidence/certification events to Dokuvera.

Configure the product webhooks and worker authentication:

```bash
supabase secrets set \
  GABLEY_WEBHOOK_URL=https://gabley.example/api/craftvaro/events \
  GABLEY_WEBHOOK_SECRET=replace-with-a-long-random-secret \
  IMMOVIQ_WEBHOOK_URL=https://immoviq.example/api/craftvaro/events \
  IMMOVIQ_WEBHOOK_SECRET=replace-with-a-different-long-random-secret \
  INTEGRATION_OUTBOX_CRON_SECRET=replace-with-another-random-secret
```

Schedule a POST to `/functions/v1/integration-outbox-worker` every minute with the matching `X-Cron-Secret` header. Receiving products must verify `X-Craftvaro-Signature` against the exact request bytes and deduplicate `Idempotency-Key`.

## Security and operational rules

- Never expose service-role, Dokuvera or vision secrets to the browser.
- Use a different HMAC secret in each direction and rotate them independently.
- Keep signed media URLs short-lived (the implementation uses 2, 5 and 10 minutes by purpose).
- Require Dokuvera malware scanning and privacy redaction before provider viewing.
- Human confirmation is mandatory for diagnosis, regulated work and final price.
- Gas and electrical matching requires verified, unexpired credentials in addition to insurance.
- Monitor `repair_integration_outbox` retries and `dokuvera_case_links.last_error`.
- Treat `999` and `0800 111 999` guidance as emergency signposting, not as a booked service.

## Receiving side: what to build in the Dokuvera project

Craftvaro is ready; the Dokuvera project currently has no inbound evidence API. Build there:

### 1. `craftvaro-evidence-intake` (public, `verify_jwt = false`)

- Route: `POST /functions/v1/craftvaro-evidence-intake`, treated by Craftvaro as `{DOKUVERA_API_URL}/v1/cases/upsert` (set `DOKUVERA_API_URL` to `https://<dokuvera-functions-host>/functions/v1/craftvaro-evidence-intake` and have the function ignore any trailing path, or expose a `/v1/cases/upsert` rewrite).
- Auth: require `Authorization: Bearer <CRAFTVARO_API_TOKEN>` and verify
  `X-Dokuvera-Signature: sha256=<hex>` as HMAC-SHA256 of the **raw** body using
  `CRAFTVARO_SIGNING_SECRET`. Compare in constant time. Reject with 401 on mismatch.
- Idempotency: dedupe on the `Idempotency-Key` header (`craftvaro:<job_uuid>`).
- Body: the payload documented above (`external_system`, `external_case_id`, `property`,
  `repair`, `source`, `diagnosis`, `media[]` with short-lived `signed_url`, `offers[]`,
  `certificates[]`). Download each `signed_url` immediately (10-minute expiry), scan it,
  redact faces/plates/identifiers, store checksums.
- Response: `{ "case_id": "...", "status": "synced", "evidence_pack_url": "...", "version": 1 }`.

### 2. Callback to Craftvaro after processing

`POST https://<craftvaro-functions-host>/functions/v1/dokuvera-webhook` with
`X-Dokuvera-Signature: sha256=<HMAC-SHA256(raw body, CRAFTVARO_WEBHOOK_SECRET)>` and the
`evidence.processed` body documented above. `redacted_storage_path` must be a derivative
written into Craftvaro's private `repair-intake` bucket, so Dokuvera also needs Craftvaro
storage write access (service credentials or a dedicated upload endpoint).

### 3. Credential mapping

| Craftvaro secret | Dokuvera secret | Who generates |
| --- | --- | --- |
| `DOKUVERA_API_URL` | n/a (its own function URL) | Dokuvera project |
| `DOKUVERA_API_TOKEN` | `CRAFTVARO_API_TOKEN` | one random value, saved in both |
| `DOKUVERA_SIGNING_SECRET` | `CRAFTVARO_SIGNING_SECRET` | one random value, saved in both |
| `DOKUVERA_WEBHOOK_SECRET` | `CRAFTVARO_WEBHOOK_SECRET` | one random value, saved in both |

Generate each with `openssl rand -hex 32` and store the identical string on both sides.
