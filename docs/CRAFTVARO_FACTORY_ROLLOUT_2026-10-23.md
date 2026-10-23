# Craftvaro core fixes and Factory rollout — 23 October 2026

Craftvaro is the canonical trades and project product, backed by jobflow-tradehub and Lovable project 27b4c132-3281-4ca4-a913-7ce0f7915510. It retains domain records and local authority. Factory owns catalogue, country templates and future governed shared services.

## Deployed and verified

The five 20260912 migrations and 20261023073508 transactional-workflow migration were first rehearsed in a rolled-back transaction, then applied together through the authorised Lovable SQL connector. Their exact SQL and versions were recorded in supabase_migrations.schema_migrations in the same transaction. Schema reload was requested. Subsequent reads confirmed all six migration records and the project, subcontract, business-metrics and material/award RPCs. No historical migration identifiers were rewritten and no existing customer rows were replaced.

The separate Omniqora migration 20261023073521 registers Craftvaro and its external core service, with draft GB/DE country blueprints. Its deployment and disabled automatic provisioning were independently verified. This is Factory registration, not a tenant or shared-service cutover.

## Released core changes

- KYC uploads remain authenticated but do not require prior KYC approval. Missing or failed lookups no longer approve access.
- Ordinary project awards execute atomically with ownership, availability, verification and paid-subscription checks; repair awards keep their existing RPC.
- Material requests save header/items/delivery atomically, validate company/job/merchant/account, calculate delivery rates on the server and deduplicate retries.
- Smart comparison saves collection requests atomically. It does not claim merchant acceptance or payment. Delivery booking from comparison remains gated pending route/rate confirmation.
- compare-prices forwards the user session and checks company, Premium subscription, job ownership and item bounds. The Edge Function was deployed separately and rejects missing/invalid sessions.
- Driver board uses a narrow RPC and withholds exact addresses before acceptance. Server transitions reject unavailable offers, competing acceptance and skipped steps. Migration 20261023074153 is applied and both updated driver screens are released.

## Fulfilment controls prepared, pending coordinated deployment

The material fulfilment implementation adds an admin-only board, offline merchant confirmation evidence, pickup readiness, verified quote-distance dispatch, cancellation before assignment, collection and merchant delivery completion. Every action uses a retry key and an append-only audit record. Driver transitions now atomically record delivery events and advance the parent material order. Direct client writes to material orders, items, deliveries and delivery events are revoked; the transactional RPCs remain the write boundary.

Migration `20261023155012_material_fulfilment_controls.sql` and its frontend must release together. The Lovable SQL connector returned `Database is possibly not accessible at the moment` during this phase, including a minimal health query. The new migration has therefore NOT been applied or recorded in the live migration ledger. Keep this change on its feature branch until backend access is restored; removing the driver's old event inserts before the trigger is installed would lose event logging.

Deployment sequence:

1. Rehearse the new migration in a rolled-back transaction against the matching backend, then apply it and record the exact SQL/version in the migration ledger in one transaction. Reload the API schema cache.
2. Release the matching frontend and verify admin/non-admin access and one confirmed request through dispatch and delivery using approved test accounts.
3. Confirm duplicate retries do not create extra audit events; failed actions must leave order and delivery unchanged.

Local database tests cover role denial, blocked direct writes, required evidence, price/distance mismatch, sequencing, retry deduplication, cancellation and the complete competing-driver acceptance/collection/delivery journey. Local tests are not production-account acceptance evidence.

## Next phases

- Reconcile PR #7 subcontract activity/notifications; email recovery and notification delivery reliability remain separate work.
- Establish verified tenant mappings, signed adapter credentials, replay/idempotency tests and event minimisation before Factory shadow mode. Keep local authority until parity and approved cutover.
- Integrate actual merchant ordering and route-distance providers. Manual confirmations do not contact suppliers or reserve stock.
- Implement marketplace payment collection, refunds and driver settlement; current actions move no money.
- Finish German workflows/prices and signed-in acceptance across customer, pending trader, approved Premium trader and verified driver roles, plus physical mobile devices.
- PR #6 Veyumo remains optional and gated.

## Limits

Material requests retain manually entered/catalogue estimate prices. An admin must obtain supplier confirmation and match the saved total; changed prices or route distances require a new agreed request. New platform deliveries stay unassigned until that workflow releases them. Broader legacy permissions and verification history still require review. Factory GB/DE templates do not provision actual tenants or introduce German prices. Existing basic/premium billing stays local. The public homepage and core release were previously published; this fulfilment phase is not live yet.
