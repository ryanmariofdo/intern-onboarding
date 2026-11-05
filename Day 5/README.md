# Receipt Categoriser

Suggests an expense category (Meals, Travel, Lodging, Office Supplies, Other) for an uploaded receipt in GreenChit. An LLM does it, with a rule-based fallback.

## Run the tests
1. Install Node.js 24 or newer. Check with `node --version`.
2. Open a terminal in this folder (`receipt-categoriser/`).
3. Run `node --test tests/acceptance.test.ts`.
4. Expect `pass 20` and `fail 0`. No `npm install` is needed.

## What is here
- `spec/`: the feature spec and the acceptance criteria.
- `src/`: `categoriser.ts` (main), `llm-categoriser.ts`, `rule-based-categoriser.ts`.
- `tests/acceptance.test.ts`: tests with fake Azure OpenAI and Document Intelligence. No real Azure is called.
- `ai-session/`: the prompts and replies, word for word.
- `src/ai-implementation-prompt.md`: my review of what the AI produced.
