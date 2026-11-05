import { test } from "node:test";
import assert from "node:assert/strict";
import { categorise, MAX_FILE_BYTES, recordFinalChoice, UNREADABLE_MESSAGE } from "../src/categoriser.ts";
import type {
  AuthDecision,
  CategoriseDeps,
  CategoriseRequest,
  DocumentIntelligence,
  LlmClient,
  LlmSuggestion,
  Logger,
} from "../src/categoriser.ts";
import { categoriseRuleBased } from "../src/rule-based-categoriser.ts";

// ---------- fakes ----------

class FakeDocIntel implements DocumentIntelligence {
  calls = 0;
  textOrError: string | Error;
  constructor(textOrError: string | Error) {
    this.textOrError = textOrError;
  }
  async extractText(_image: Uint8Array): Promise<string> {
    this.calls++;
    if (this.textOrError instanceof Error) throw this.textOrError;
    return this.textOrError;
  }
}

type LlmBehaviour = LlmSuggestion | { status: number } | "hang" | "malformed";

class FakeLlm implements LlmClient {
  calls = 0;
  receivedTexts: string[] = [];
  behaviour: LlmBehaviour;
  constructor(behaviour: LlmBehaviour) {
    this.behaviour = behaviour;
  }
  async classify(text: string): Promise<LlmSuggestion> {
    this.calls++;
    this.receivedTexts.push(text);
    const b = this.behaviour;
    if (b === "hang") return new Promise<LlmSuggestion>(() => {});
    if (b === "malformed") return { category: "Groceries", confidence: 7 } as unknown as LlmSuggestion;
    if ("status" in b) throw Object.assign(new Error(`Azure OpenAI ${b.status}`), { status: b.status });
    return b;
  }
}

class RecordingLogger implements Logger {
  events: Array<{ name: string; props: Record<string, string | number | boolean> }> = [];
  event(name: string, props: Record<string, string | number | boolean>): void {
    this.events.push({ name, props });
  }
}

// ---------- helpers ----------

const jpeg = (size = 1024): Uint8Array => {
  const b = new Uint8Array(size);
  b.set([0xff, 0xd8, 0xff, 0xe0]);
  return b;
};
const png = (size = 1024): Uint8Array => {
  const b = new Uint8Array(size);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return b;
};

const request = (over: Partial<CategoriseRequest> = {}): CategoriseRequest => ({
  claimId: "claim-123",
  caller: "claimant-1",
  file: { bytes: jpeg(), contentType: "image/jpeg" },
  ...over,
});

interface Harness {
  deps: CategoriseDeps;
  doc: FakeDocIntel;
  llm: FakeLlm;
  logger: RecordingLogger;
}

function harness(opts: {
  ocr?: string | Error;
  llm?: LlmBehaviour;
  flagEnabled?: boolean;
  auth?: AuthDecision;
  llmTimeoutMs?: number;
} = {}): Harness {
  const doc = new FakeDocIntel(opts.ocr ?? "Restaurant bill. Total LKR 2,400");
  const llm = new FakeLlm(opts.llm ?? { category: "Meals", confidence: 0.93 });
  const logger = new RecordingLogger();
  const deps: CategoriseDeps = {
    flagEnabled: opts.flagEnabled ?? true,
    authorise: () => opts.auth ?? { ok: true },
    documentIntelligence: doc,
    llm,
    logger,
    llmTimeoutMs: opts.llmTimeoutMs ?? 50,
  };
  return { deps, doc, llm, logger };
}

// ---------- acceptance criteria ----------

test("AC-01 happy path: clear meal receipt", async () => {
  const h = harness({ llm: { category: "Meals", confidence: 0.93 } });
  const res = await categorise(request(), h.deps);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, {
    category: "Meals",
    confidence: 0.93,
    source: "llm",
    needs_review: false,
    message: null,
  });
  assert.equal(h.logger.events.length, 1);
  assert.equal(h.logger.events[0].name, "categoriser.suggested");
  assert.ok((h.logger.events[0].props.duration_ms as number) < 5000, "event emitted within 5 seconds");
});

test("AC-02 ambiguous receipt: needs_review follows the 0.6 threshold", async () => {
  const cases: Array<[number, boolean]> = [
    [0.0, true],
    [0.4, true],
    [0.59, true],
    [0.6, false],
    [0.95, false],
    [1.0, false],
  ];
  for (const [confidence, expected] of cases) {
    const h = harness({ llm: { category: "Other", confidence } });
    const res = await categorise(request(), h.deps);
    assert.equal(res.status, 200);
    if (res.status !== 200) return;
    assert.ok(res.body.confidence >= 0 && res.body.confidence <= 1);
    assert.equal(res.body.needs_review, expected, `confidence ${confidence}`);
  }
});

test("AC-03 LLM unavailable (503, 429, timeout, malformed): falls back to rule-based", async () => {
  const behaviours: LlmBehaviour[] = [{ status: 503 }, { status: 500 }, { status: 429 }, "hang", "malformed"];
  for (const b of behaviours) {
    const h = harness({ ocr: "Yellow Cab taxi fare Colombo to Airport", llm: b });
    const res = await categorise(request(), h.deps);
    assert.equal(res.status, 200, JSON.stringify(b));
    if (res.status !== 200) return;
    assert.equal(res.body.source, "rule-based");
    assert.ok(res.body.confidence <= 0.5);
    assert.equal(res.body.category, "Travel");
    assert.equal(res.body.needs_review, true);
    assert.equal(res.body.message, null);
    assert.ok(!("error" in res.body));
  }
});

test("AC-04 OCR failure: unreadable receipt returns Other / 0.0 / message, no LLM call", async () => {
  for (const ocr of ["", "   \n\t "]) {
    const h = harness({ ocr });
    const res = await categorise(request(), h.deps);
    assert.equal(res.status, 200);
    if (res.status !== 200) return;
    assert.equal(res.body.category, "Other");
    assert.equal(res.body.confidence, 0.0);
    assert.equal(res.body.needs_review, true);
    assert.equal(res.body.message, "We couldn't read this receipt. Please choose a category yourself.");
    assert.equal(res.body.message, UNREADABLE_MESSAGE);
    assert.equal(res.body.source, "rule-based");
    assert.equal(h.llm.calls, 0);
  }
});

test("AC-05 oversized payload: 413, exact error, no category/confidence, no downstream calls", async () => {
  const h = harness();
  const res = await categorise(
    request({ file: { bytes: png(14 * 1024 * 1024), contentType: "image/png" } }),
    h.deps,
  );
  assert.equal(res.status, 413);
  assert.deepEqual(res.body, { error: "Photo file size exceeds 10 MB" });
  assert.ok(!("category" in res.body));
  assert.ok(!("confidence" in res.body));
  assert.equal(h.doc.calls, 0);
  assert.equal(h.llm.calls, 0);
  assert.equal(h.logger.events.length, 0);
});

test("AC-05 boundary: exactly 10 MB is accepted", async () => {
  const h = harness();
  const res = await categorise(request({ file: { bytes: png(MAX_FILE_BYTES), contentType: "image/png" } }), h.deps);
  assert.equal(res.status, 200);
});

test("AC-06 PII boundary: event has only the allowed fields and no PII", async () => {
  const ocr = "Restaurant Bill\nCustomer: Nimal Perera\nVISA ending 4242\nTotal LKR 2,400";
  const h = harness({ ocr, llm: { category: "Meals", confidence: 0.9 } });
  const res = await categorise(request(), h.deps);
  assert.equal(res.status, 200);
  assert.equal(h.logger.events.length, 1);
  const { name, props } = h.logger.events[0];
  assert.equal(name, "categoriser.suggested");
  assert.deepEqual(
    Object.keys(props).sort(),
    ["category", "claim_id", "confidence", "duration_ms", "needs_review", "source"],
  );
  assert.equal(props.claim_id, "claim-123");
  const serialised = JSON.stringify(h.logger.events);
  for (const forbidden of ["Nimal", "Perera", "4242", "VISA", "Restaurant Bill", "2,400"]) {
    assert.ok(!serialised.includes(forbidden), `event leaks "${forbidden}"`);
  }
  // Response body also carries no receipt text.
  assert.ok(!JSON.stringify(res.body).includes("Nimal"));
});

test("AC-06 PII boundary also holds on the rule-based fallback and unreadable paths", async () => {
  const fallback = harness({ ocr: "Taxi fare. Customer: Nimal Perera card 4242", llm: { status: 503 } });
  await categorise(request(), fallback.deps);
  const unreadable = harness({ ocr: "" });
  await categorise(request(), unreadable.deps);
  for (const h of [fallback, unreadable]) {
    assert.equal(h.logger.events.length, 1);
    assert.deepEqual(
      Object.keys(h.logger.events[0].props).sort(),
      ["category", "claim_id", "confidence", "duration_ms", "needs_review", "source"],
    );
    assert.ok(!JSON.stringify(h.logger.events).includes("Nimal"));
    assert.ok(!JSON.stringify(h.logger.events).includes("4242"));
  }
});

// ---------- extra behaviour from the spec's rules / errors table ----------

test("flag off: 404, nothing is called", async () => {
  const h = harness({ flagEnabled: false });
  const res = await categorise(request(), h.deps);
  assert.equal(res.status, 404);
  assert.equal(h.doc.calls, 0);
  assert.equal(h.llm.calls, 0);
});

test("auth failures 401/403/404 pass through and stop processing", async () => {
  for (const status of [401, 403, 404] as const) {
    const h = harness({ auth: { ok: false, status } });
    const res = await categorise(request(), h.deps);
    assert.equal(res.status, status);
    assert.equal(h.doc.calls, 0);
    assert.equal(h.llm.calls, 0);
  }
});

test("400: missing file, wrong type, corrupt image", async () => {
  const missing = harness();
  assert.equal((await categorise(request({ file: undefined }), missing.deps)).status, 400);

  const pdf = harness();
  assert.equal(
    (await categorise(request({ file: { bytes: jpeg(), contentType: "application/pdf" } }), pdf.deps)).status,
    400,
  );

  const corrupt = harness();
  assert.equal(
    (await categorise(request({ file: { bytes: new Uint8Array(512), contentType: "image/png" } }), corrupt.deps)).status,
    400,
  );

  const mismatch = harness();
  assert.equal(
    (await categorise(request({ file: { bytes: png(), contentType: "image/jpeg" } }), mismatch.deps)).status,
    400,
  );

  for (const h of [missing, pdf, corrupt, mismatch]) {
    assert.equal(h.doc.calls, 0);
    assert.equal(h.llm.calls, 0);
  }
});

test("PNG is accepted", async () => {
  const h = harness();
  const res = await categorise(request({ file: { bytes: png(), contentType: "image/png" } }), h.deps);
  assert.equal(res.status, 200);
});

test("502 when Document Intelligence is unavailable; LLM not called", async () => {
  const h = harness({ ocr: new Error("Document Intelligence 503") });
  const res = await categorise(request(), h.deps);
  assert.equal(res.status, 502);
  assert.equal(h.llm.calls, 0);
  assert.equal(h.logger.events.length, 0);
});

test("LLM outage is not an error, and the LLM only receives OCR text", async () => {
  const h = harness({ ocr: "Hotel Grand room charge 2 nights", llm: { status: 503 } });
  const res = await categorise(request(), h.deps);
  assert.equal(res.status, 200);
  if (res.status !== 200) return;
  assert.equal(res.body.category, "Lodging");
  assert.equal(h.llm.receivedTexts[0], "Hotel Grand room charge 2 nights");
});

test("rule-based answers are never above 0.5, including no-match", () => {
  const samples = ["taxi fare", "hotel room charge", "stationery pen paper", "restaurant lunch", "zzz nothing here", "x"];
  for (const s of samples) {
    const r = categoriseRuleBased(s);
    assert.ok(r.confidence <= 0.5, s);
    assert.ok(r.confidence >= 0, s);
  }
  assert.equal(categoriseRuleBased("zzz nothing here").category, "Other");
});

test("a throwing Logger does not break the response", async () => {
  const h = harness();
  h.deps.logger = {
    event() {
      throw new Error("App Insights down");
    },
  };
  const res = await categorise(request(), h.deps);
  assert.equal(res.status, 200);
});

// ---------- spec v0.2: categoriser.resolved ----------

test("recordFinalChoice: accepted when final equals suggested", () => {
  const logger = new RecordingLogger();
  recordFinalChoice("claim-123", "Meals", "Meals", logger);
  assert.equal(logger.events.length, 1);
  assert.equal(logger.events[0].name, "categoriser.resolved");
  assert.deepEqual(logger.events[0].props, {
    claim_id: "claim-123",
    suggested_category: "Meals",
    final_category: "Meals",
    accepted: true,
  });
});

test("recordFinalChoice: overridden when final differs from suggested", () => {
  const logger = new RecordingLogger();
  recordFinalChoice("claim-456", "Other", "Travel", logger);
  assert.equal(logger.events.length, 1);
  assert.equal(logger.events[0].name, "categoriser.resolved");
  assert.deepEqual(logger.events[0].props, {
    claim_id: "claim-456",
    suggested_category: "Other",
    final_category: "Travel",
    accepted: false,
  });
});

test("recordFinalChoice: exactly the four spec property names, nothing else", () => {
  const logger = new RecordingLogger();
  recordFinalChoice("claim-789", "Lodging", "Office Supplies", logger);
  assert.deepEqual(
    Object.keys(logger.events[0].props).sort(),
    ["accepted", "claim_id", "final_category", "suggested_category"],
  );
});

test("recordFinalChoice: a throwing Logger does not make it throw", () => {
  const throwing: Logger = {
    event() {
      throw new Error("App Insights down");
    },
  };
  assert.doesNotThrow(() => recordFinalChoice("claim-123", "Meals", "Travel", throwing));
});
