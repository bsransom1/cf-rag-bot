/**
 * Parse stakeholder Google Doc exports (plain text) into FAQ entries.
 *
 * CodiceFiscale: PART 1 only (`Q:` / `A:` / optional `Plain English:`).
 * ItalianNotary: skip CONFIG; PART 1+ (`Q:` then answer body, optional `Plain English:`).
 */

import type { FaqEntry } from "@/types";

export type KbDocKind = "italian_immigration" | "italian_notary";

export interface ParsedKbDoc {
  configText: string | null;
  entries: FaqEntry[];
}

export interface FaqDiff {
  unchanged: number;
  changed: Array<{ question: string; fields: string[] }>;
  added: string[];
  onlyInJson: string[];
}

const CF_SECTION_CATEGORY: Record<string, string> = {
  "1.1": "definition",
  "1.2": "usage",
  "1.3": "acquisition",
  "1.4": "edge-cases",
  "1.5": "generator",
  "1.6": "business",
};

const IN_PART_CATEGORY: Record<number, string> = {
  1: "overview",
  2: "pricing",
  3: "eligibility",
  4: "process",
  5: "apostille",
  6: "translation",
  7: "documents",
  8: "use-cases",
  9: "legal-assistance",
  10: "validity",
  11: "mistakes",
  12: "contact",
};

export function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .replace(/[?]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripBomAndNormalize(text: string): string {
  return text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

interface DraftEntry {
  question: string;
  answerLines: string[];
  plainLines: string[];
  collecting: "answer" | "plain";
  section: string;
  category: string;
}

function flushDraft(draft: DraftEntry | null): FaqEntry | null {
  if (!draft) return null;
  const question = draft.question.trim();
  const answer = draft.answerLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!question || !answer) return null;
  const plain = draft.plainLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return {
    question,
    answer,
    plain_english: plain.length > 0 ? plain : undefined,
    section: draft.section,
    category: draft.category,
    tags: [],
  };
}

export function parseGoogleKbDoc(text: string, kind: KbDocKind): ParsedKbDoc {
  const lines = stripBomAndNormalize(text).split("\n");
  const entries: FaqEntry[] = [];
  const configLines: string[] = [];

  let mode: "pre" | "config" | "body" | "done" = "pre";
  let section = kind === "italian_immigration" ? "1.1" : "1";
  let category =
    kind === "italian_immigration" ? "definition" : IN_PART_CATEGORY[1];
  let draft: DraftEntry | null = null;

  const pushDraft = () => {
    const entry = flushDraft(draft);
    if (entry) entries.push(entry);
    draft = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (kind === "italian_immigration") {
      if (/^PART\s+1\b/i.test(trimmed)) {
        mode = "body";
        continue;
      }
      if (/^PART\s+2\b/i.test(trimmed)) {
        pushDraft();
        mode = "done";
        break;
      }
    } else {
      if (/^CONFIG\b/i.test(trimmed) && mode === "pre") {
        mode = "config";
        continue;
      }
      if (/^PART\s+1\b/i.test(trimmed)) {
        pushDraft();
        mode = "body";
        section = "1";
        category = IN_PART_CATEGORY[1];
        continue;
      }
    }

    if (mode === "config") {
      configLines.push(line);
      continue;
    }
    if (mode !== "body") continue;

    if (/^_{5,}$/.test(trimmed) || /^End of knowledge base/i.test(trimmed)) {
      continue;
    }

    const partMatch = trimmed.match(/^PART\s+(\d+)\s*:\s*(.*)$/i);
    if (partMatch && kind === "italian_notary") {
      pushDraft();
      const n = Number(partMatch[1]);
      section = String(n);
      category = IN_PART_CATEGORY[n] ?? "overview";
      continue;
    }

    const cfSection = trimmed.match(/^(\d+\.\d+)\s+\S/);
    if (cfSection && kind === "italian_immigration") {
      pushDraft();
      section = cfSection[1];
      category = CF_SECTION_CATEGORY[section] ?? "definition";
      continue;
    }

    if (/^Q:\s*/i.test(trimmed)) {
      pushDraft();
      draft = {
        question: trimmed.replace(/^Q:\s*/i, ""),
        answerLines: [],
        plainLines: [],
        collecting: "answer",
        section,
        category,
      };
      continue;
    }

    if (!draft) continue;

    if (/^Plain English:\s*/i.test(trimmed)) {
      draft.collecting = "plain";
      const rest = trimmed.replace(/^Plain English:\s*/i, "");
      if (rest.length > 0) draft.plainLines.push(rest);
      continue;
    }

    if (kind === "italian_immigration" && /^A:\s*/i.test(trimmed)) {
      draft.collecting = "answer";
      const rest = trimmed.replace(/^A:\s*/i, "");
      if (rest.length > 0) draft.answerLines.push(rest);
      continue;
    }

    if (draft.collecting === "plain") {
      draft.plainLines.push(line);
    } else {
      draft.answerLines.push(line);
    }
  }

  pushDraft();

  return {
    configText:
      kind === "italian_notary" && configLines.length > 0
        ? configLines.join("\n").trim()
        : null,
    entries,
  };
}

const LATER_POLICY_MARKERS = [
  "ItalianCodiceFiscale.com",
  "ItalianTaxes.com",
  "does not currently provide translation",
  "single ItalianNotary.com order can contain multiple documents",
  "pricing for that add-on has not yet been finalized",
  "booking-appointments",
];

function offersTranslationAsService(text: string): boolean {
  return (
    /translation is available as an add-on/i.test(text) ||
    /you can add translation to your order/i.test(text) ||
    /apostilles, international shipping, and translations/i.test(text) ||
    /notary, apostille, translation, shipping/i.test(text) ||
    /witness service, apostille, translation, shipping/i.test(text) ||
    /optional add-ons[^.]*translation/i.test(text)
  );
}

function jsonKeepsLaterPolicy(json: FaqEntry, doc: FaqEntry): boolean {
  const jsonText = `${json.answer}\n${json.plain_english ?? ""}`;
  const docText = `${doc.answer}\n${doc.plain_english ?? ""}`;
  if (/booking_step_one/i.test(docText) && /booking-appointments/i.test(jsonText)) {
    return true;
  }
  if (
    offersTranslationAsService(docText) &&
    /does not currently provide translation/i.test(jsonText)
  ) {
    return true;
  }
  return LATER_POLICY_MARKERS.some(
    (marker) => jsonText.includes(marker) && !docText.includes(marker),
  );
}

export function findMatchingEntry(
  question: string,
  pool: FaqEntry[],
): FaqEntry | undefined {
  const key = normalizeQuestion(question);
  const exact = pool.find((e) => normalizeQuestion(e.question) === key);
  if (exact) return exact;

  const swapped = key
    .replace(/\bgenerator\b/g, "\0")
    .replace(/\bcalculator\b/g, "generator")
    .replace(/\0/g, "calculator");
  if (swapped !== key) {
    const aliased = pool.find((e) => normalizeQuestion(e.question) === swapped);
    if (aliased) return aliased;
  }

  if (key.length < 24) return undefined;
  return pool.find((e) => {
    const other = normalizeQuestion(e.question);
    return other.startsWith(key) || key.startsWith(other);
  });
}

export function diffFaqEntries(
  fromDoc: FaqEntry[],
  fromJson: FaqEntry[],
): FaqDiff {
  const seenJson = new Set<FaqEntry>();
  const changed: FaqDiff["changed"] = [];
  const added: string[] = [];
  let unchanged = 0;

  for (const docEntry of fromDoc) {
    const existing = findMatchingEntry(docEntry.question, fromJson);
    if (!existing) {
      added.push(docEntry.question);
      continue;
    }
    seenJson.add(existing);
    const fields: string[] = [];
    if (existing.answer.trim() !== docEntry.answer.trim()) fields.push("answer");
    const existingPlain = (existing.plain_english ?? "").trim();
    const docPlain = (docEntry.plain_english ?? "").trim();
    if (existingPlain !== docPlain) fields.push("plain_english");
    if (fields.length === 0) unchanged += 1;
    else changed.push({ question: docEntry.question, fields });
  }

  const onlyInJson: string[] = [];
  for (const entry of fromJson) {
    if (!seenJson.has(entry)) onlyInJson.push(entry.question);
  }

  return { unchanged, changed, added, onlyInJson };
}

export interface MergeResult {
  entries: FaqEntry[];
  applied: number;
  skippedLaterPolicy: number;
  skippedNewTranslation: number;
  added: number;
  keptJsonOnly: number;
}

/**
 * Overlay Doc Q&As onto published JSON. Keeps JSON-only rows, preserves
 * category/tags/section on matches, and does not apply Doc text that would
 * undo later stakeholder policy (translation, funnel URLs, multi-doc orders).
 */
export function mergeFaqFromDoc(
  fromDoc: FaqEntry[],
  fromJson: FaqEntry[],
): MergeResult {
  const result: FaqEntry[] = fromJson.map((e) => ({
    ...e,
    tags: [...e.tags],
  }));
  let applied = 0;
  let skippedLaterPolicy = 0;
  let skippedNewTranslation = 0;
  let added = 0;

  for (const docEntry of fromDoc) {
    const existing = findMatchingEntry(docEntry.question, result);
    if (!existing) {
      if (
        docEntry.category === "translation" ||
        offersTranslationAsService(
          `${docEntry.answer}\n${docEntry.plain_english ?? ""}`,
        )
      ) {
        skippedNewTranslation += 1;
        continue;
      }
      result.push({
        ...docEntry,
        tags: docEntry.tags.length > 0 ? docEntry.tags : [],
      });
      added += 1;
      continue;
    }
    if (jsonKeepsLaterPolicy(existing, docEntry)) {
      skippedLaterPolicy += 1;
      continue;
    }
    const nextAnswer = docEntry.answer.trim();
    const nextPlain = docEntry.plain_english?.trim();
    const changed =
      existing.answer.trim() !== nextAnswer ||
      (existing.plain_english ?? "").trim() !== (nextPlain ?? "");
    if (!changed) continue;
    existing.answer = nextAnswer;
    existing.plain_english =
      nextPlain && nextPlain.length > 0 ? nextPlain : undefined;
    applied += 1;
  }

  return {
    entries: result,
    applied,
    skippedLaterPolicy,
    skippedNewTranslation,
    added,
    keptJsonOnly: diffFaqEntries(fromDoc, fromJson).onlyInJson.length,
  };
}
