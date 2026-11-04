# Receipt Categoriser — Feature Spec v0.1

## 1. Why
- **User outcome:** When a claimant uploads a receipt in GreenChit, they should not have to work out the expense category themselves. With the help of AI, the system should suggest a category (Meals, Travel, Lodging, Office Supplies, Other). The claimant confirms or changes it in one click before submitting.
- **Business outcome:** Fewer wrongly categorised claims reaching managers and finance, so less back-and-forth and rework and saving time.
- **Metric this should move:** Suggestions that claimants keep without changing the category. For example, if 80 out of 100 claimants keep the suggested category, the rate is 80%. A higher rate means better suggestions.

## 2. Scope
- **In scope**
  1. Suggest one category plus a confidence score for one uploaded receipt image.
  2. The claimant can accept or change the suggestion before submitting. The final choice is logged for future model evaluation.
  3. Fall back to rule-based suggestion if Azure OpenAI is unavailable.
- **Affects (Day 4 containers / services)**
  - **API Service**: A new categoriser sits inside it, next to the Receipts component. It reuses the Auth component for the claim access check.
  - **Web app**: Shows the suggestion, the "Needs review" label, and the accept/change control on the claim form.
  - **Claims component / Azure SQL**: Must store the claimant's final category on the claim. I need to check whether the Day 4 claim model already has a category field.
  - **New Azure services, all inside the BISTEC tenant:** Azure OpenAI (gpt-4.1 family), Azure AI Document Intelligence for OCR, Application Insights (events).
  - **Not affected:** Notification service, Entra ID, SharePoint export.

## 3. Contract

API Endpoint: `POST /claims/{id}/receipts/categorise`

### Inputs
- `id` (path): claim ID. The caller must be the claimant who owns the claim (checked by the existing Auth component).
- `receipt` (body): one image, JPEG or PNG, <= 10 MB.

### Outputs
`200 OK` with:

```json
{
  "category": "Meals | Travel | Lodging | Office Supplies | Other",
  "confidence": 0.0,
  "source": "llm | rule-based",
  "needs_review": false,
  "message": null
}
```

- `confidence` is a number from 0.0 to 1.0.
- `needs_review` is `true` when `confidence` is below 0.6, and `false` when it is 0.6 or higher. The Web app UI shows this as "Needs review".
- `message` is `null` normally. It holds a plain-language message for the claimant when the receipt could not be read.

### Behaviour rules
- **LLM unavailable** (Azure OpenAI returns 5xx or 429, or does not answer in time): return `200` with `source: "rule-based"` and `confidence` of 0.5 or less.
- **Receipt unreadable** (Document Intelligence works but cannot extract usable text): return `200` with `category: "Other"`, `confidence: 0.0`, `needs_review: true`, and `message` set to exactly "We couldn't read this receipt. Please choose a category yourself."
- **Rule-based answers are never above 0.5**, so they always show as "Needs review".
- **Flag off:** the endpoint returns `404` and the Web app hides the suggestion UI.

### Errors
| Status | When |
|---|---|
| 400 | Missing file, not JPEG/PNG, corrupt image |
| 413 | File larger than 10 MB |
| 502 | Document Intelligence is unavailable, so no text can be extracted at all |
| 401 / 403 / 404 | Not signed in, not the claim owner, or claim not found (existing Auth and Claims behaviour, unchanged) |

An LLM outage is **not** an error. It falls back to rule-based and returns 200.

### Side effects
- Application Insights customEvent emitted.
- It must never contain the image, the OCR text, a customer name, or any card number (PII).
- When the claimant submits, their final category is logged alongside the suggested one, so we can tell accepted from overridden. This is a second customEvent named `categoriser.resolved` with these properties: `claim_id`, `suggested_category`, `final_category`, `accepted` (true when the two categories are the same).
- No receipt text or image is stored by the categoriser. The receipt itself still goes to Blob Storage.

## 4. Acceptance criteria
Available in `ryan-day5-receipt-categoriser-acceptance.md`

## 5. Examples

**Example 1 - Happy Path (Restaurant bill)**
- Input: `POST /claims/{id}/receipts/categorise` with a JPEG/PNG of a restaurant bill.
- Output: `200`
```json
{ 
  "category": "Meals", 
  "confidence": 0.93, 
  "source": "llm",
  "needs_review": false,
  "message": null 
}
```

**Example 2 — Ambiguous (Grocery Bill with mixed items)**
- Input: a supermarket receipt with food and grocery items.
- Output: `200`
```json
{ "category": "Other",
  "confidence": 0.40,
  "source": "llm",
  "needs_review": true,
  "message": null
}
```
- The claimant sees "Needs review" and picks the category.

**Example 3 — LLM Outage (Fallback Rule-based)**
- Input: a taxi receipt while Azure OpenAI returns 503.
- Output: `200`
```json
{ "category": "Travel",
  "confidence": 0.4,
  "source": "rule-based",
  "needs_review": true,
  "message": null
}
```

**Example 4 — error: unreadable receipt**
- Input: low quality pixelated image or dark image.
- Output: `200`
```json
{ 
  "category": "Other",
  "confidence": 0.0,
  "source": "rule-based",
  "needs_review": true,
  "message": "We couldn't read this receipt. Please choose a category yourself."
}
```

**Example 5 — error: file too large**
- Input: a 14 MB PNG ( > 10 MB).
- Output: `413` with a short error body. No suggestion, no LLM call.

## 6. Out of scope
- Multi-receipt batch upload. One image per request.
- Auto-submission without claimant confirmation. The claimant always decides.
- Image formats other than JPEG and PNG, such as PDF.
- Pre-filling amount, date or merchant on the claim from the OCR result. Category only.
- One category per line item. This feature gives one category per receipt.
- Custom category lists. The five categories are fixed (only preset categories).
- An evaluation dashboard.

## 7. Open questions

1. **Do we learn from category overrides?** Today they are only logged. Using them to improve prompts or rules is undecided.
2. Should "Needs review" block submission, or only warn?
