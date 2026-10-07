import { extractAnchors } from "@/lib/conversation";
import { searchChunks, toSourceHits, type RankedChunk } from "@/lib/search";
import { foldDe, tokenize } from "@/lib/tokenize";
import type { Chunk, SourceHit } from "@/lib/types";

export type StepStatus = "done" | "checked_open" | "missing";

export type ChecklistStep = {
  heading: string;
  text: string;
  chunk: Chunk;
  models: string[];
  errors: string[];
};

export type MatchedStep = {
  step: ChecklistStep;
  status: StepStatus;
  note: string;
};

export type ChecklistMatch = {
  models: string[];
  errors: string[];
  fileName: string;
  heading: string;
  done: MatchedStep[];
  checkedOpen: MatchedStep[];
  missing: MatchedStep[];
};

export type CaseAnalysis = {
  models: string[];
  errors: string[];
  matches: ChecklistMatch[];
  extraHits: RankedChunk[];
};

const CHECKLIST_NAME =
  /checkliste|wartung|sicherheit|stoerung|störung|interval|kurzcheck/i;

const DONE_RE =
  /gepr[uü]ft|entnommen|getauscht|bestaetigt|bestätigt|gesp[uü]lt|abgetrocknet|gewechselt|eingesetzt|glattgezogen|entleert|bewegt|gewartet|durchgef[uü]hrt|erledigt|gew[aä]ssert|gekl[aä]rt|klick/i;

const OPEN_RE =
  /bleibt|schwerg[aä]ngig|h[aä]ngt|ueberfaellig|überfällig|monate zur[uü]ck|nicht verst[aä]ndigt|noch nicht|klemmt|schief|feucht|schleife|knick|flau|kommt (danach )?wieder/i;

function uniqueAnchors(values: string[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (!out.some((item) => item.toUpperCase() === value.toUpperCase())) {
      out.push(value);
    }
  }
  return out;
}

function isChecklistChunk(chunk: Chunk): boolean {
  return CHECKLIST_NAME.test(`${chunk.fileName} ${chunk.displayPath}`);
}

function isHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || /^[-•*]/.test(trimmed) || /^\d+[.)]/.test(trimmed)) {
    return false;
  }
  if (/^(E\d{2,3}|KV[\s-]?\d{3,4})\b/i.test(trimmed) && trimmed.length < 100) {
    return true;
  }
  if (/:$/.test(trimmed) && trimmed.length < 90) return true;
  return false;
}

function stripBullet(line: string): string {
  return line.replace(/^\s*(?:[-•*]|\d+[.)])\s+/, "").trim();
}

export function extractChecklistSteps(chunks: Chunk[]): ChecklistStep[] {
  const preferred = chunks.filter(isChecklistChunk);
  const pool = preferred.length ? preferred : chunks;
  const steps: ChecklistStep[] = [];
  const seen = new Set<string>();

  for (const chunk of pool) {
    let heading = headingFromFile(chunk);
    const lines = chunk.text.split(/\n+/).map((line) => line.trim()).filter(Boolean);

    for (const line of lines) {
      const labeled = line.match(/^(.{2,70}):\s+(.+)$/);
      if (labeled && !/^[-•*]/.test(line) && labeled[2].length > 8) {
        heading = labeled[1].trim();
        pushStep(steps, seen, chunk, heading, labeled[2].trim());
        continue;
      }
      if (isHeading(line)) {
        heading = line.replace(/:$/, "").trim();
        continue;
      }
      const text = stripBullet(line);
      if (!text || text.length < 12) continue;
      if (/^nur fuer|^keine geraete|^nordlicht/i.test(foldDe(text))) continue;
      pushStep(steps, seen, chunk, heading, text);
    }
  }

  return steps;
}

function headingFromFile(chunk: Chunk): string {
  return chunk.fileName.replace(/\.[a-z0-9]+$/i, "");
}

function pushStep(
  steps: ChecklistStep[],
  seen: Set<string>,
  chunk: Chunk,
  heading: string,
  text: string,
): void {
  const key = foldDe(`${heading}|${text}`).replace(/\s+/g, " ");
  if (seen.has(key)) return;
  seen.add(key);
  const blob = `${heading} ${text}`;
  steps.push({
    heading,
    text,
    chunk,
    models: extractAnchors(blob).filter((anchor) => /^KV-/i.test(anchor)),
    errors: extractAnchors(blob).filter((anchor) => /^E-/i.test(anchor)),
  });
}

const GENERIC_TOKENS = new Set([
  "woch",
  "wochen",
  "liter",
  "muss",
  "sitzt",
  "fest",
  "frei",
  "grad",
  "minut",
  "minuten",
  "oder",
  "bzw",
]);

function mentionScore(stepText: string, caseText: string): number {
  const foldedCase = foldDe(caseText);
  let count = 0;
  const seen = new Set<string>();
  for (const token of tokenize(stepText)) {
    if (token.length < 4 || seen.has(token) || GENERIC_TOKENS.has(token)) continue;
    seen.add(token);
    if (foldedCase.includes(token)) count += token.length >= 7 ? 2 : 1;
  }
  return count;
}

function paragraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 8);
}

function nearbySnippet(caseText: string, tokens: string[]): string {
  const distinctive = tokens.filter(
    (token) => token.length >= 4 && !GENERIC_TOKENS.has(token),
  );
  let best = "";
  let bestScore = -1;
  for (const paragraph of paragraphs(caseText)) {
    const folded = foldDe(paragraph);
    let hits = 0;
    for (const token of distinctive) {
      if (folded.includes(token)) hits += 1;
    }
    if (!hits) continue;
    let score = hits;
    if (DONE_RE.test(paragraph)) score += 3;
    if (OPEN_RE.test(paragraph)) score += 1;
    if (/^\d+[.)]/.test(paragraph) || /bisherige schritte/i.test(paragraph)) {
      score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = paragraph.length > 180 ? `${paragraph.slice(0, 177).trimEnd()}…` : paragraph;
    }
  }
  return best;
}

function classifyStep(step: ChecklistStep, caseText: string): MatchedStep {
  const stepTokens = tokenize(step.text);
  const overlap = mentionScore(step.text, caseText);
  const snippet = nearbySnippet(caseText, stepTokens);
  const window = snippet || "";
  const doneish = window ? DONE_RE.test(window) : false;
  const openish = window ? OPEN_RE.test(window) : false;

  if (overlap >= 2 && doneish && !openish) {
    return {
      step,
      status: "done",
      note: snippet ? `In der Meldung: ${snippet}` : "In der Meldung genannt und erledigt.",
    };
  }
  if (overlap >= 2 && (openish || doneish)) {
    return {
      step,
      status: "checked_open",
      note: snippet
        ? `Geprüft, noch nicht in Ordnung: ${snippet}`
        : "In der Meldung genannt, Schritt noch offen.",
    };
  }
  if (overlap >= 2) {
    return {
      step,
      status: "checked_open",
      note: snippet
        ? `In der Meldung erwähnt: ${snippet}`
        : "In der Meldung erwähnt.",
    };
  }
  return {
    step,
    status: "missing",
    note: "In der Meldung nicht genannt.",
  };
}

function sectionRelevant(
  step: ChecklistStep,
  models: string[],
  errors: string[],
): boolean {
  if (errors.length && step.errors.length) {
    return step.errors.some((error) =>
      errors.some((item) => item.toUpperCase() === error.toUpperCase()),
    );
  }
  if (models.length && step.models.length) {
    return step.models.some((model) =>
      models.some((item) => item.toUpperCase() === model.toUpperCase()),
    );
  }
  if (errors.length && !step.errors.length) {
    const blob = foldDe(`${step.heading} ${step.text}`);
    return errors.some((error) => blob.includes(foldDe(error.replace("-", ""))));
  }
  return !step.errors.length;
}

export function matchCaseAgainstChecklists(
  chunks: Chunk[],
  caseText: string,
): CaseAnalysis {
  const models = extractAnchors(caseText).filter((anchor) => /^KV-/i.test(anchor));
  const errors = extractAnchors(caseText).filter((anchor) => /^E-/i.test(anchor));
  const steps = extractChecklistSteps(chunks);
  const relevant = steps.filter((step) => sectionRelevant(step, models, errors));
  const classified = (relevant.length ? relevant : steps.slice(0, 12)).map((step) =>
    classifyStep(step, caseText),
  );

  const groups = new Map<string, ChecklistMatch>();
  for (const item of classified) {
    const fileName = item.step.chunk.fileName;
    const heading = item.step.heading;
    const key = `${fileName}::${heading}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        models: item.step.models,
        errors: item.step.errors,
        fileName,
        heading,
        done: [],
        checkedOpen: [],
        missing: [],
      };
      groups.set(key, group);
    }
    if (item.status === "done") group.done.push(item);
    else if (item.status === "checked_open") group.checkedOpen.push(item);
    else group.missing.push(item);
  }

  let matches = [...groups.values()];
  if (errors.length) {
    const focused = matches.filter(
      (match) =>
        match.errors.some((error) =>
          errors.some((item) => item.toUpperCase() === error.toUpperCase()),
        ) ||
        match.done.length + match.checkedOpen.length > 0,
    );
    if (focused.length) matches = focused;
  }

  matches.sort(
    (a, b) =>
      b.done.length +
      b.checkedOpen.length -
      (a.done.length + a.checkedOpen.length),
  );

  const query = uniqueAnchors([...errors, ...models]).join(" ") || caseText.slice(0, 180);
  const extraHits = searchChunks(chunks, query, 6);

  return {
    models: uniqueAnchors(models),
    errors: uniqueAnchors(errors),
    matches: matches.slice(0, 4),
    extraHits,
  };
}

export function formatChecklistAnswer(analysis: CaseAnalysis): string {
  const headerParts: string[] = [];
  if (analysis.models.length) headerParts.push(`Gerät ${analysis.models.join(", ")}`);
  if (analysis.errors.length) headerParts.push(`Meldung ${analysis.errors.join(", ")}`);
  const lines: string[] = ["Fallprüfung gegen die Checklisten"];
  if (headerParts.length) lines.push(headerParts.join(" · "));
  lines.push("");

  if (!analysis.matches.length) {
    lines.push(
      "In den indexierten Checklisten habe ich keine passenden Schritte gefunden. Unten stehen die nächsten Stellen aus den Unterlagen.",
    );
    return lines.join("\n").trim();
  }

  for (const match of analysis.matches) {
    lines.push(`Aus ${match.fileName}${match.heading ? `, Abschnitt ${match.heading}` : ""}:`);
    const emit = (title: string, items: MatchedStep[]) => {
      if (!items.length) return;
      lines.push(title);
      for (const item of items.slice(0, 6)) {
        lines.push(`• ${item.step.text}`);
        if (item.note && item.status !== "missing") {
          lines.push(`  ${item.note}`);
        }
      }
    };
    emit("Erledigt", match.done);
    emit("Geprüft, noch offen", match.checkedOpen);
    emit("Noch nicht in der Meldung", match.missing);
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function sourcesFromAnalysis(analysis: CaseAnalysis): SourceHit[] {
  const ranked: RankedChunk[] = [];
  const seen = new Set<string>();
  for (const match of analysis.matches) {
    for (const item of [...match.done, ...match.checkedOpen, ...match.missing]) {
      const key = item.step.chunk.id;
      if (seen.has(key)) continue;
      seen.add(key);
      ranked.push({ chunk: item.step.chunk, score: 8 });
    }
  }
  for (const hit of analysis.extraHits) {
    if (seen.has(hit.chunk.id)) continue;
    seen.add(hit.chunk.id);
    ranked.push(hit);
  }
  return toSourceHits(ranked).slice(0, 8);
}
