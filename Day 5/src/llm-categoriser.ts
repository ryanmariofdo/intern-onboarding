// LLM (Azure OpenAI) path. Independent of the rule-based path.
import type { Category } from "./rule-based-categoriser.ts";

export interface LlmSuggestion {
  category: Category;
  confidence: number;
}

// Injectable client; the real one would call Azure OpenAI (gpt-4.1 family).
// It receives OCR text only. Implementations throw on 5xx / 429 / failure.
export interface LlmClient {
  classify(receiptText: string): Promise<LlmSuggestion>;
}

// Thrown for any reason the LLM could not give a usable answer
// (5xx, 429, timeout, or malformed output). Callers fall back to rules.
export class LlmUnavailableError extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super(`LLM unavailable: ${reason}`);
    this.name = "LlmUnavailableError";
    this.reason = reason;
  }
}

const CATEGORIES: readonly string[] = ["Meals", "Travel", "Lodging", "Office Supplies", "Other"];

export async function categoriseWithLlm(
  receiptText: string,
  client: LlmClient,
  timeoutMs: number,
): Promise<LlmSuggestion> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new LlmUnavailableError("timeout")), timeoutMs);
  });

  let result: LlmSuggestion;
  try {
    result = await Promise.race([client.classify(receiptText), timeout]);
  } catch (err) {
    if (err instanceof LlmUnavailableError) throw err;
    const status = (err as { status?: unknown } | null)?.status;
    throw new LlmUnavailableError(typeof status === "number" ? `status ${status}` : "error");
  } finally {
    clearTimeout(timer);
  }

  if (
    result === null ||
    typeof result !== "object" ||
    !CATEGORIES.includes(result.category) ||
    typeof result.confidence !== "number" ||
    !Number.isFinite(result.confidence) ||
    result.confidence < 0 ||
    result.confidence > 1
  ) {
    throw new LlmUnavailableError("malformed response");
  }
  return { category: result.category, confidence: result.confidence };
}
