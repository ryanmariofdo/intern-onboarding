// Rule-based fallback path. Independent of the LLM path.
// Spec: rule-based confidence is never above 0.5, so it always shows "Needs review".

export type Category = "Meals" | "Travel" | "Lodging" | "Office Supplies" | "Other";

export interface RuleBasedResult {
  category: Category;
  confidence: number;
}

export const RULE_BASED_MAX_CONFIDENCE = 0.5;
const MATCH_CONFIDENCE = 0.4;
const NO_MATCH_CONFIDENCE = 0.2;

// Fixed order doubles as the tie-break order.
const KEYWORDS: ReadonlyArray<readonly [Exclude<Category, "Other">, readonly string[]]> = [
  ["Meals", ["restaurant", "cafe", "coffee", "lunch", "dinner", "breakfast", "meal", "pizza", "burger", "bar", "diner", "bistro"]],
  ["Travel", ["taxi", "uber", "pickme", "cab", "fare", "flight", "airline", "train", "bus", "fuel", "petrol", "parking", "toll", "airport"]],
  ["Lodging", ["hotel", "inn", "resort", "hostel", "motel", "lodging", "accommodation", "room charge", "night stay", "check-in", "check-out"]],
  ["Office Supplies", ["stationery", "stationary", "pen", "paper", "notebook", "stapler", "toner", "ink", "printer", "folder", "office"]],
];

function countMatches(text: string, words: readonly string[]): number {
  let n = 0;
  for (const w of words) {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`).test(text)) n++;
  }
  return n;
}

export function categoriseRuleBased(text: string): RuleBasedResult {
  const lower = text.toLowerCase();
  let best: Category = "Other";
  let bestCount = 0;
  for (const [category, words] of KEYWORDS) {
    const n = countMatches(lower, words);
    if (n > bestCount) {
      best = category;
      bestCount = n;
    }
  }
  const confidence = bestCount > 0 ? MATCH_CONFIDENCE : NO_MATCH_CONFIDENCE;
  return { category: best, confidence: Math.min(confidence, RULE_BASED_MAX_CONFIDENCE) };
}
