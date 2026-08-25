# Trader directory import and claim workflow

## Commercial rule

An imported profile is a limited factual directory record. It is not a Craftvaro member and must never receive a lead, appear in AI results, expose contact details, display copied reviews, or carry a Craftvaro verification badge.

A trader enters lead delivery and AI matching only after all of the following are true:

1. The business owner claims the directory profile.
2. Craftvaro approves ownership and completes the applicable identity, insurance, capability and regulated-trade checks.
3. The trader activates a paid subscription that is current and not on the free tier.
4. The trader marks the relevant capability and service area as available.

Claim approval creates the trade account and company record, but deliberately does not set marketplace verification or activate a subscription.

## Lawful source policy

Import only factual business information from a source Craftvaro is legally permitted to use, such as an official public register, an appropriately licensed open dataset, a direct business submission, or a contracted data supplier. Record the source URL, source record ID, and date checked for every profile.

Do not scrape or copy competitor profiles, descriptions, photos, ratings or reviews. Do not imply endorsement by Checkatrade, TrustATrader, MyHammer, a regulator, or a trade body. Obtain UK and German legal advice before large-scale collection or outbound claim campaigns, including advice on database rights, privacy, direct marketing, platform terms, and the source-specific reuse licence.

## Import process

1. Sign in as an administrator and open `/admin/trader-directory`.
2. Download the CSV template.
3. Add no more than 500 records per batch.
4. Keep personal and business contact data to the minimum needed for verification. Contacts are stored in the private `trader_directory_contacts` table and never in a public view.
5. Preview and import. Invalid URLs, dates, email addresses, trades and postcodes are rejected.
6. Review the imported record and source link before marking any registration evidence as checked.

Required CSV fields are `source_name`, `source_record_id`, `source_url`, `business_name`, `trade`, `city`, and `postcode_district`. Use the outward code for the UK, such as `NW6`, and a five-digit postcode for Germany, such as `10115`.

## Claim lifecycle

- A trader selects **Claim this profile**, signs in, and supplies their role and verification method.
- The profile remains contact-free and excluded from AI while the claim is pending.
- An administrator verifies the claimant independently using the private contact or official register—not only the information typed by the claimant.
- Approval links the profile to the claimant and creates the basic company record.
- KYC, insurance, qualification checks, service coverage and paid subscription are completed through the normal trader onboarding flow.
- Rejected claims return the directory record to an unclaimed state when no other claim is pending.

## Review integrity

Only the customer who owns a completed job can review the trader awarded that job. Public ratings and marketplace averages use these verified-job reviews only. Imported ratings and competitor reviews are never accepted.
