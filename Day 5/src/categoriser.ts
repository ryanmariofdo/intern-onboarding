// Receipt categoriser: orchestration, validation, logging.
// No HTTP framework. Azure services are injected so fakes can stand in.
import { categoriseWithLlm } from "./llm-categoriser.ts";
import type { LlmClient } from "./llm-categoriser.ts";
import { categoriseRuleBased } from "./rule-based-categoriser.ts";
import type { Category } from "./rule-based-categoriser.ts";

export type { Category } from "./rule-based-categoriser.ts";
export type { LlmClient, LlmSuggestion } from "./llm-categoriser.ts";

export interface Logger {
  event(name: string, props: Record<string, string | number | boolean>): void;
}

// Injectable Azure AI Document Intelligence. Throws if the service is unavailable;
// returns empty/whitespace text if it works but cannot extract usable text.
export interface DocumentIntelligence {
  extractText(image: Uint8Array): Promise<string>;
}

export type AuthDecision = { ok: true } | { ok: false; status: 401 | 403 | 404 };

export interface CategoriseRequest {
  claimId: string;
  caller: string;
  file?: { bytes: Uint8Array; contentType: string };
}

export interface CategoriseBody {
  category: Category;
  confidence: number;
  source: "llm" | "rule-based";
  needs_review: boolean;
  message: string | null;
}

export type CategoriseResponse =
  | { status: 200; body: CategoriseBody }
  | { status: 400 | 401 | 403 | 404 | 413 | 502; body: { error: string } };

export interface CategoriseDeps {
  flagEnabled: boolean;
  authorise(claimId: string, caller: string): AuthDecision | Promise<AuthDecision>;
  documentIntelligence: DocumentIntelligence;
  llm: LlmClient;
  logger: Logger;
  llmTimeoutMs?: number;
  now?: () => number;
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const NEEDS_REVIEW_THRESHOLD = 0.6;
export const UNREADABLE_MESSAGE = "We couldn't read this receipt. Please choose a category yourself.";
export const DEFAULT_LLM_TIMEOUT_MS = 3000;

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  return bytes.length >= magic.length && magic.every((b, i) => bytes[i] === b);
}

function validateFile(file: CategoriseRequest["file"]): CategoriseResponse | null {
  if (!file || file.bytes.length === 0) {
    return { status: 400, body: { error: "A receipt image is required" } };
  }
  if (file.bytes.length > MAX_FILE_BYTES) {
    return { status: 413, body: { error: "Photo file size exceeds 10 MB" } };
  }
  const type = file.contentType.toLowerCase();
  if (type !== "image/jpeg" && type !== "image/png") {
    return { status: 400, body: { error: "Receipt must be a JPEG or PNG image" } };
  }
  const matches = type === "image/jpeg" ? startsWith(file.bytes, JPEG_MAGIC) : startsWith(file.bytes, PNG_MAGIC);
  if (!matches) {
    return { status: 400, body: { error: "Receipt image is corrupt" } };
  }
  return null;
}

// Called when the claimant submits the claim. Logs the final category next to the
// suggested one so accepted vs overridden can be told apart. Only the four allowed
// properties are emitted (no image, OCR text, name or card number).
export function recordFinalChoice(
  claimId: string,
  suggestedCategory: Category,
  finalCategory: Category,
  logger: Logger,
): void {
  try {
    logger.event("categoriser.resolved", {
      claim_id: claimId,
      suggested_category: suggestedCategory,
      final_category: finalCategory,
      accepted: suggestedCategory === finalCategory,
    });
  } catch {
    // Logging must never break the claimant's submission.
  }
}

export async function categorise(req: CategoriseRequest, deps: CategoriseDeps): Promise<CategoriseResponse> {
  const now = deps.now ?? Date.now;
  const startedAt = now();

  if (!deps.flagEnabled) {
    return { status: 404, body: { error: "Not found" } };
  }

  const auth = await deps.authorise(req.claimId, req.caller);
  if (!auth.ok) {
    const messages = { 401: "Not signed in", 403: "Not allowed", 404: "Not found" } as const;
    return { status: auth.status, body: { error: messages[auth.status] } };
  }

  const invalid = validateFile(req.file);
  if (invalid) return invalid;
  const file = req.file!;

  let text: string;
  try {
    text = await deps.documentIntelligence.extractText(file.bytes);
  } catch {
    return { status: 502, body: { error: "Receipt text extraction is unavailable" } };
  }

  let body: CategoriseBody;
  if (typeof text !== "string" || text.trim() === "") {
    body = {
      category: "Other",
      confidence: 0.0,
      source: "rule-based",
      needs_review: true,
      message: UNREADABLE_MESSAGE,
    };
  } else {
    let category: Category;
    let confidence: number;
    let source: "llm" | "rule-based";
    try {
      const s = await categoriseWithLlm(text, deps.llm, deps.llmTimeoutMs ?? DEFAULT_LLM_TIMEOUT_MS);
      ({ category, confidence } = s);
      source = "llm";
    } catch {
      ({ category, confidence } = categoriseRuleBased(text));
      source = "rule-based";
    }
    body = { category, confidence, source, needs_review: confidence < NEEDS_REVIEW_THRESHOLD, message: null };
  }

  // PII boundary: only these fields. Never the image, OCR text, name or card digits.
  try {
    deps.logger.event("categoriser.suggested", {
      claim_id: req.claimId,
      category: body.category,
      confidence: body.confidence,
      source: body.source,
      needs_review: body.needs_review,
      duration_ms: now() - startedAt,
    });
  } catch {
    // Logging must never break the claimant's response.
  }

  return { status: 200, body };
}
