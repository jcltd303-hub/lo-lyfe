# Source and listing policy

## Allowed sources

Ingest only public pages when automated access is permitted, or use an official API with its required credentials and published terms. Settlement administrators, government refund pages, public assistance programs, and first-party merchant replacement programs are potential sources. A listing is published only after a reviewer verifies its original claim URL, administrator or sponsor, eligibility text, deadline, and whether any fee is required.

## Access rules

- Identify the crawler; respect each host's robots.txt, published API quotas, terms, `Retry-After`, and rate limits. Never bypass sign-in, CAPTCHAs, paywalls, or access controls.
- Store source attribution and canonical original URLs. Do not present scraped content as an official endorsement.
- Do not ingest private messages or communities. Reddit, Telegram, and Discord require approved official APIs and explicit permission for the public content collected.
- Stop crawling a source on takedown request or repeated errors until a person reviews it.

## Listing review

- An LLM extraction is a draft, never a verified fact. Reject records missing a trustworthy claim URL or deadline; route ambiguous eligibility, payment claims, and low confidence to human review.
- Treat fee requests, lookalike domains, and requests for bank details or Social Security numbers as warning signals. Never collect those details in Lo-lyfe.
- Expire listings at their published deadline and recheck links. Surface the official source, review date, and uncertainty to users.
- Never auto-submit a claim. The user reads the original terms, checks the filled information, and attests for each submission.

## Reviews and advertising

A sponsored listing or affiliate link must be disclosed. Product-test participation may require an honest review with any rating and a disclosure of the material connection. Do not exchange rewards for a positive rating. Ads require the proper hosting plan, consent, and partner terms before activation.

This policy is an engineering operating rule and needs legal review before public launch.
