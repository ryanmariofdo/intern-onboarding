# Receipt Categoriser — Acceptance Criteria

## AC-01 happy path: clear meal receipt
**Given** a receipt image of a restaurant bill totalling LKR 2,400
**When** the claimant uploads it via POST /claims/{id}/receipts/categorise
**Then** the response is 200 OK with `{ "category": "Meals", "confidence": >= 0.7, "source": "llm" }`
**And** an Application Insights customEvent `categoriser.suggested` is emitted within 5 seconds

## AC-02 ambiguous receipt
**Given** a receipt with mixed items (food + stationery)
**When** the claimant uploads it via POST /claims/{id}/receipts/categorise
**Then** the response is 200 OK with a `category` and a `confidence` between 0.0 and 1.0
**And** `needs_review` is `true` if `confidence` is below 0.6, and `false` if it is 0.6 or higher

## AC-03 LLM unavailable — fallback
**Given** Azure OpenAI is returning 503
**When** the claimant uploads a receipt
**Then** the response is 200 OK with `source: "rule-based"` and confidence <= 0.5
**And** the response has a `category` and no error
**And** `needs_review` is `true`

## AC-04 OCR failure
**Given** an image that Document Intelligence cannot parse
**When** the claimant uploads it via POST /claims/{id}/receipts/categorise
**Then** the response is 200 OK with `category: "Other"`, `confidence: 0.0` and `needs_review: true`
**And** `message` is "We couldn't read this receipt. Please choose a category yourself."

## AC-05 oversized payload
**Given** a PNG file of 14 MB ( > 10 MB )
**When** the claimant uploads it via POST /claims/{id}/receipts/categorise
**Then** the response is 413 and has no `category` or `confidence`
**And** the error body says "Photo file size exceeds 10 MB"

## AC-06 PII boundary
**Given** a receipt with a customer name and credit card last 4
**When** the request is processed
**Then** the customEvent payload contains no PII and no full card number
**And** the payload does not contain the customer name, the card digits, the image, or the receipt text
**And** the payload only has the claim ID, category, confidence, source, needs_review and time taken
**And** the receipt is only sent to BISTEC's own Azure OpenAI and Document Intelligence
