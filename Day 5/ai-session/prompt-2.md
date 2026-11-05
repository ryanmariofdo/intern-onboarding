This is a follow-up to your first implementation. In your plan you left out one
in-scope item: logging the claimant's final category. Implement it now. Do not
change anything else.

Constraints (unchanged):
- Touch only the four files you created under `src/` and `tests/`
- Do not add new dependencies
- Do NOT invent fields, endpoints, or behaviour not in the spec or in the change below

Spec change (v0.2), Side effects:

When the claimant submits the claim, their final category is logged next to the
suggested one, so we can tell accepted from overridden. This is a second
customEvent named `categoriser.resolved` with exactly these properties:
- `claim_id`
- `suggested_category`
- `final_category`
- `accepted` (true when the two categories are the same, otherwise false)

Requirements:
- Add an exported function `recordFinalChoice(...)` in `src/categoriser.ts`. It
  takes the claim ID, the suggested category, the final category and the injected
  `Logger`.
- Reuse the existing `Logger` interface. Do not add an endpoint or a web layer.
- The event must never contain the image, the OCR text, a customer name, or any
  card number (PII), as in AC-06.
- A `Logger` that throws must not make the function throw.
- Do not change `categorise()` or the `categoriser.suggested` event.

Tests:
- Add tests in `tests/acceptance.test.ts` for: accepted (same category),
  overridden (different category), exact property names only, and a throwing
  `Logger`.
- Re-run `node --test tests/acceptance.test.ts` and show the result.

Before editing, tell me if this conflicts with the spec. Then reply with a short
list of what you changed in each file.
