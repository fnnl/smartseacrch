export type PriorTurn = {
  question: string;
  answer?: string;
};

const FOLLOW_PREFIX =
  /^(und|auch|oder|bzw\.?|sowie|genauso|dasselbe|derselbe|dieselbe|dort|nochmal|weiter|wie\s+dort|was\s+ist\s+mit|gilt\s+das|beim|bei\s+der|bei\s+dem|und\s+beim)\b/i;

const CASE_MARKERS =
  /problembeschreibung|sachverhalt|bisherige schritte|anlage\s*:|gemeldet von|symptom[e]?[:\s]|verdacht\s*:|n[äa]chster schritt/i;

export function extractAnchors(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];
  const push = (value: string) => {
    const normalized = normalizeAnchor(value);
    if (normalized && !found.some((item) => item.toUpperCase() === normalized.toUpperCase())) {
      found.push(normalized);
    }
  };

  for (const match of text.matchAll(/\bKV[\s-]?\d{3,4}\b/gi)) {
    push(match[0]);
  }
  for (const match of text.matchAll(/\bE[-\s]?\d{2,3}\b/gi)) {
    push(match[0].toUpperCase());
  }
  for (const match of text.matchAll(
    /\b(?:WF|SK|TS|BE|MS|DT|PU|HZ|SP|MF|MR)[\s-]?\d{1,4}\b/gi,
  )) {
    push(match[0]);
  }
  return found;
}

function normalizeAnchor(raw: string): string {
  const compact = raw.replace(/\s+/g, "").toUpperCase();
  const letters = compact.replace(/[^A-Z0-9]/g, "");
  const match = letters.match(/^([A-Z]+)(\d+)$/);
  if (!match) return compact;
  return `${match[1]}-${match[2]}`;
}

export function isFollowUp(question: string, prior: PriorTurn[]): boolean {
  if (!prior.length) return false;
  const trimmed = question.trim();
  if (!trimmed) return false;
  if (looksLikeCase(trimmed)) return false;
  if (FOLLOW_PREFIX.test(trimmed)) return true;

  const currentErrors = extractAnchors(trimmed).filter((anchor) => /^E-/i.test(anchor));
  const priorErrors = extractAnchors(
    prior.map((turn) => `${turn.question}\n${turn.answer ?? ""}`).join("\n"),
  ).filter((anchor) => /^E-/i.test(anchor));
  const introducesNewError =
    currentErrors.length > 0 &&
    currentErrors.every(
      (error) =>
        !priorErrors.some((item) => item.toUpperCase() === error.toUpperCase()),
    );
  if (introducesNewError) return false;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length <= 6) return true;
  if (
    words.length <= 12 &&
    /\b(der|die|das|dieser|diese|dieses|dazu|hier|selbe|gleichen?|dort)\b/i.test(
      trimmed,
    )
  ) {
    return true;
  }
  return false;
}

export function looksLikeCase(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const lines = trimmed.split(/\n/).filter((line) => line.trim().length > 0);
  if (CASE_MARKERS.test(trimmed)) return true;
  if (trimmed.length >= 220 && lines.length >= 3) return true;
  const hasError = /\bE[-\s]?\d{2,3}\b/i.test(trimmed);
  const hasMachine = /\bKV[\s-]?\d{3,4}\b/i.test(trimmed);
  const hasSymptom =
    /tank|filter|schlauch|tropfschale|milch|br[uü]heinheit|schwimmer|display|fehlermeldung|klemm|undicht/i.test(
      trimmed,
    );
  if (trimmed.length >= 80 && hasError && (hasMachine || hasSymptom) && lines.length >= 1) {
    if (trimmed.length >= 110 || lines.length >= 2 || hasMachine) return true;
  }
  return false;
}

export function expandSearchQuery(question: string, prior: PriorTurn[]): string {
  const trimmed = question.trim();
  if (!prior.length) return trimmed;

  const currentAnchors = extractAnchors(trimmed);
  const followUp = isFollowUp(trimmed, prior);
  const standalone =
    !followUp && currentAnchors.length > 0 && trimmed.split(/\s+/).length > 6;
  if (standalone) return trimmed;

  const currentHasModel = currentAnchors.some((anchor) => /^KV-/i.test(anchor));
  const currentHasError = currentAnchors.some((anchor) => /^E-/i.test(anchor));
  const last = prior[prior.length - 1];
  const fromLastQuestion = last ? extractAnchors(last.question) : [];
  const fromLastAnswer = last
    ? extractAnchors(last.answer ?? "").filter(
        (anchor) => /^E-/i.test(anchor) || /^KV-/i.test(anchor),
      )
    : [];
  const carried: string[] = [];
  for (const anchor of [...fromLastQuestion, ...fromLastAnswer]) {
    if (currentAnchors.some((item) => item.toUpperCase() === anchor.toUpperCase())) {
      continue;
    }
    if (/^KV-/i.test(anchor) && currentHasModel) continue;
    if (/^E-/i.test(anchor) && currentHasError) continue;
    if (carried.some((item) => item.toUpperCase() === anchor.toUpperCase())) continue;
    carried.push(anchor);
  }

  const topic: string[] = [];
  if (followUp) {
    const lastQuestion = prior[prior.length - 1]?.question ?? "";
    const skip = new Set(
      [...currentAnchors, ...carried].map((item) => item.toLowerCase().replace(/-/g, "")),
    );
    for (const word of lastQuestion.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
      if (word.length < 5) continue;
      if (skip.has(word.replace(/-/g, ""))) continue;
      if (
        /^(fehler|bedeutet|anzeige|display|geraet|gerät|maschine|bitte|zeigen)$/i.test(
          word,
        )
      ) {
        continue;
      }
      if (!topic.includes(word)) topic.push(word);
      if (topic.length >= 4) break;
    }
  }

  return [trimmed, ...carried, ...topic].filter(Boolean).join(" ");
}

export function carriedAnchorSummary(
  question: string,
  prior: PriorTurn[],
): string[] {
  const expanded = expandSearchQuery(question, prior);
  const extra = extractAnchors(expanded).filter(
    (anchor) =>
      !extractAnchors(question).some(
        (item) => item.toUpperCase() === anchor.toUpperCase(),
      ),
  );
  return extra;
}
