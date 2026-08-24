# AI Trade Finder

AI Trade Finder is embedded at `/marketplace`. An authenticated customer can type a natural-language request such as:

```text
Looking for a plumber around NW6 5YT, Gas Safe and available
```

The server extracts the trade, UK postcode, credential requirement, availability, emergency-call-out need and minimum rating. It searches the verified `trade_repair_profiles` records and returns public profile details only.

## Matching rules

- Capability and insurance must be verified and unexpired.
- The provider must have configured a service-area prefix that covers the requested postcode.
- `available` means the provider has marked themselves as accepting work. It is not a confirmed appointment.
- Gas work requires a verified, unexpired credential whose type contains `Gas Safe`.
- Electrical work requires a verified, unexpired electrical credential.
- Gas Safe registration and permitted work categories must still be checked against the engineer's ID before work begins.
- Credential numbers, private addresses, phone numbers and emails are never returned by the search function.

## Fair usage

Usage is enforced atomically in the database, so browser changes cannot bypass it:

| Account tier | Searches per UTC day |
| --- | ---: |
| Free | 5 |
| Basic | 30 |
| Premium | 100 |
| Administrator | 500 |

`ai_trade_search_events` stores only a SHA-256 query fingerprint, parsed filters and the result count. Raw search wording is not retained.

## AI configuration

The search works immediately with the deterministic UK trade/postcode parser. A private AI gateway can improve interpretation of longer conversational requests by setting the secrets `TRADE_SEARCH_AI_URL` and `TRADE_SEARCH_AI_SECRET`.

The gateway receives a `parse_trade_search` task, the query, allowed trade values and output schema. It should return JSON:

```json
{
  "filters": {
    "trade": "plumber",
    "postcode": "NW6 5YT",
    "gas_safe": true,
    "available_only": true,
    "emergency": false,
    "minimum_rating": null
  }
}
```

Server-side validation restricts the AI response to supported trades and valid UK postcodes. If the gateway is missing or fails, the rules-based parser is used automatically.

## Deployment

The migration `supabase/migrations/20260824233000_ai_trade_search.sql` and the `trade-agent-search` function are already applied and deployed. The function relies on the platform-provided `SUPABASE_URL` and service-role runtime secrets.
