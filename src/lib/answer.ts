import {
  formatChecklistAnswer,
  matchCaseAgainstChecklists,
  sourcesFromAnalysis,
} from "@/lib/checklist";
import {
  carriedAnchorSummary,
  expandSearchQuery,
  extractAnchors,
  isFollowUp,
  looksLikeCase,
  type PriorTurn,
} from "@/lib/conversation";
import { searchChunks, toSourceHits, type RankedChunk } from "@/lib/search";
import { splitSentences, tokenize } from "@/lib/tokenize";
import type { AnswerKind, AskResponse, Chunk } from "@/lib/types";

export type { PriorTurn };

const NO_MATCH =
  "In den geladenen Dokumenten habe ich dazu keine passende Stelle gefunden. Formuliere die Frage mit Begriffen aus den Texten — zum Beispiel einem Fehlernamen, einem Bauteil oder einem Kapitel.";

const SYSTEM_PROMPT =
  "Du führst einen lokalen Chat über indexierte Handbücher, Problembeschreibungen und Checklisten. Folgefragen beziehen sich auf die vorherigen Fragen im Chat (zum Beispiel dasselbe Fehlerbild bei einem anderen Gerät). Wenn jemand einen konkreten Fall schickt (Störung, Gerät, Symptome, bisherige Schritte), prüfe ihn gegen die Checklisten-Schritte im Kontext: welche Schritte gelten, was bereits getan ist, was fehlt. Antworte auf Deutsch, knapp und sachlich. Verwende nur den gelieferten Kontext. Wenn etwas nicht vorkommt, sag das klar. Keine Quellenliste — die Oberfläche zeigt die Stellen separat.";

export async function answerQuestion(
  chunks: Chunk[],
  question: string,
  priorTurns: PriorTurn[] = [],
): Promise<AskResponse> {
  const trimmed = question.trim();
  const checklist = looksLikeCase(trimmed);
  const followUp = !checklist && isFollowUp(trimmed, priorTurns);
  const kind: AnswerKind = checklist ? "checklist" : followUp ? "followup" : "search";
  const query = expandSearchQuery(trimmed, priorTurns);

  if (checklist) {
    return answerChecklist(chunks, trimmed, priorTurns, query);
  }

  const ranked = searchChunks(chunks, query, followUp ? 8 : 6);
  const sources = toSourceHits(ranked);
  if (!ranked.length) {
    return { answer: NO_MATCH, sources: [], mode: "extractive", kind };
  }

  const extractive = followUp
    ? buildFollowUpAnswer(
        trimmed,
        query,
        ranked,
        carriedAnchorSummary(trimmed, priorTurns),
      )
    : buildExtractiveAnswer(query, ranked);

  return maybeGenerate({
    question: trimmed,
    priorTurns,
    ranked,
    sources,
    extractive,
    kind,
  });
}

async function answerChecklist(
  chunks: Chunk[],
  caseText: string,
  priorTurns: PriorTurn[],
  query: string,
): Promise<AskResponse> {
  const analysis = matchCaseAgainstChecklists(chunks, caseText);
  const extractive = formatChecklistAnswer(analysis);
  const sources = sourcesFromAnalysis(analysis);
  const ranked = analysis.extraHits;

  if (!analysis.matches.length && ranked.length) {
    const fallback = buildExtractiveAnswer(query, ranked);
    return maybeGenerate({
      question: caseText,
      priorTurns,
      ranked,
      sources,
      extractive: `${extractive}\n\n${fallback}`,
      kind: "checklist",
    });
  }

  return maybeGenerate({
    question: caseText,
    priorTurns,
    ranked: ranked.length ? ranked : searchChunks(chunks, query, 6),
    sources,
    extractive,
    kind: "checklist",
  });
}

async function maybeGenerate(input: {
  question: string;
  priorTurns: PriorTurn[];
  ranked: RankedChunk[];
  sources: AskResponse["sources"];
  extractive: string;
  kind: AnswerKind;
}): Promise<AskResponse> {
  const { question, priorTurns, ranked, sources, extractive, kind } = input;

  if (process.env.OPENAI_API_KEY) {
    try {
      const generated = await generateOpenAiAnswer(question, ranked, priorTurns, kind);
      return { answer: generated, sources, mode: "generative", kind };
    } catch {
      return {
        answer: extractive,
        sources,
        mode: "extractive",
        kind,
        fallbackReason:
          "Das Sprachmodell war nicht erreichbar. Deshalb stammen die Sätze direkt aus den Dokumenten.",
      };
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const generated = await generateAnthropicAnswer(
        question,
        ranked,
        priorTurns,
        kind,
      );
      return { answer: generated, sources, mode: "generative", kind };
    } catch {
      return {
        answer: extractive,
        sources,
        mode: "extractive",
        kind,
        fallbackReason:
          "Das Sprachmodell war nicht erreichbar. Deshalb stammen die Sätze direkt aus den Dokumenten.",
      };
    }
  }

  return { answer: extractive, sources, mode: "extractive", kind };
}

function collectSentences(ranked: RankedChunk[]): string[] {
  const sentences: string[] = [];
  const seen = new Set<string>();
  for (const { chunk } of ranked) {
    for (const sentence of splitSentences(chunk.text)) {
      const key = sentence.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      sentences.push(sentence);
    }
  }
  return sentences;
}

function mentionsAnchor(text: string, anchor: string): boolean {
  const escaped = anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/-/g, "[-\\s]?");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function withBulletContext(all: string[], picked: string[]): string[] {
  const out: string[] = [];
  for (const sentence of picked) {
    const pieces = [sentence];
    const index = all.indexOf(sentence);
    if (index >= 0 && /:$/.test(sentence.trim())) {
      for (let next = index + 1; next < all.length && pieces.length < 4; next += 1) {
        const line = all[next];
        if (!/^[-•*]/.test(line.trim()) && !/^[a-zäöü]/.test(line.trim())) break;
        if (/^(E\d{2,3}|KV[\s-]?\d{3,4})\b/i.test(line)) break;
        pieces.push(line);
      }
    }
    out.push(pieces.join(" "));
  }
  return out;
}

function pickSentences(
  sentences: string[],
  query: string,
  limit: number,
): string[] {
  const queryTokens = new Set(tokenize(query));
  return sentences
    .map((sentence) => {
      const tokens = new Set(tokenize(sentence));
      let overlap = 0;
      for (const token of queryTokens) {
        if (tokens.has(token)) overlap += 1;
      }
      return { sentence, overlap };
    })
    .filter((item) => item.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit)
    .map((item) => item.sentence);
}

function buildFollowUpAnswer(
  question: string,
  query: string,
  ranked: RankedChunk[],
  carried: string[],
): string {
  const sentences = collectSentences(ranked);
  const currentModels = extractAnchors(question).filter((anchor) =>
    /^KV-/i.test(anchor),
  );
  const carriedErrors = carried.filter((anchor) => /^E-/i.test(anchor));
  const newModel = currentModels[0];
  const carriedError = carriedErrors[0];

  if (newModel && carriedError) {
    const both = sentences.filter(
      (sentence) =>
        mentionsAnchor(sentence, newModel) && mentionsAnchor(sentence, carriedError),
    );
    const forError = withBulletContext(
      sentences,
      pickSentences(
        sentences.filter((sentence) => mentionsAnchor(sentence, carriedError)),
        query,
        2,
      ),
    );
    const forModel = withBulletContext(
      sentences,
      pickSentences(
        sentences.filter((sentence) => mentionsAnchor(sentence, newModel)),
        query,
        2,
      ),
    );
    if (!both.length && forError.length && forModel.length) {
      return [
        `${carriedError} ist in den Unterlagen nicht als Schritt für ${newModel} beschrieben.`,
        `Zu ${carriedError}: ${forError.join(" ")}`,
        `Beim ${newModel}: ${forModel.join(" ")}`,
      ].join("\n\n");
    }
    if (both.length) {
      return `Bezogen auf ${carriedError} beim ${newModel}:\n\n${both.slice(0, 3).join(" ")}`;
    }
  }

  const body = buildExtractiveAnswer(query, ranked);
  if (carried.length) {
    return `Bezogen auf ${carried.join(", ")} aus der vorherigen Frage:\n\n${body}`;
  }
  return body;
}

function buildExtractiveAnswer(question: string, ranked: RankedChunk[]): string {
  const queryTokens = new Set(tokenize(question));
  const candidates = ranked
    .slice(0, 5)
    .map(({ chunk, score }) => {
      const window = bestSentenceWindow(chunk.text, queryTokens);
      return {
        text: window.text,
        score: window.score + score * 0.2,
      };
    })
    .filter((item) => item.text && item.score > 0)
    .sort((a, b) => b.score - a.score);

  const parts: string[] = [];
  const seen = new Set<string>();
  for (const item of candidates) {
    const key = item.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    parts.push(item.text);
    if (parts.join(" ").length > 420 || parts.length >= 3) break;
  }

  if (!parts.length) {
    const fallback = ranked[0]?.chunk.text.replace(/\s+/g, " ").trim() ?? "";
    return fallback.length > 480 ? `${fallback.slice(0, 480).trimEnd()}…` : fallback;
  }
  return parts.join(" ");
}

function bestSentenceWindow(
  text: string,
  queryTokens: Set<string>,
): { text: string; score: number } {
  const sentences = splitSentences(text);
  if (!sentences.length) {
    return { text: text.replace(/\s+/g, " ").trim(), score: 0 };
  }

  const scores = sentences.map((sentence) => {
    const tokens = new Set(tokenize(sentence));
    let overlap = 0;
    for (const token of queryTokens) {
      if (tokens.has(token)) overlap += 1;
    }
    return overlap;
  });

  let bestIndex = 0;
  let bestScore = -1;
  for (let index = 0; index < scores.length; index += 1) {
    const windowScore =
      (scores[index] ?? 0) * 1.2 +
      (scores[index + 1] ?? 0) +
      (scores[index + 2] ?? 0) * 0.4;
    if (windowScore > bestScore) {
      bestScore = windowScore;
      bestIndex = index;
    }
  }

  if (bestScore <= 0) return { text: "", score: 0 };

  const picked: string[] = [];
  let length = 0;
  for (let index = bestIndex; index < sentences.length && picked.length < 6; index += 1) {
    const sentence = sentences[index];
    if (!sentence) continue;
    picked.push(sentence);
    length += sentence.length;
    if (length >= 380) break;
  }

  return {
    text: picked.join(" "),
    score: bestScore,
  };
}

function contextBlock(ranked: RankedChunk[]): string {
  return ranked
    .map(
      ({ chunk }, index) =>
        `[${index + 1}] ${chunk.displayPath}\n${chunk.text}`,
    )
    .join("\n\n");
}

function historyMessages(
  priorTurns: PriorTurn[],
): Array<{ role: "user" | "assistant"; content: string }> {
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const turn of priorTurns.slice(-6)) {
    if (turn.question.trim()) {
      messages.push({ role: "user", content: turn.question.trim() });
    }
    if (turn.answer?.trim()) {
      messages.push({ role: "assistant", content: turn.answer.trim() });
    }
  }
  return messages;
}

function userPayload(
  question: string,
  ranked: RankedChunk[],
  kind: AnswerKind,
): string {
  const task =
    kind === "checklist"
      ? "Prüfe den folgenden Fall gegen die Checklisten und Handbücher im Kontext. Nenne geltende Schritte, was erledigt ist und was fehlt."
      : kind === "followup"
        ? "Die aktuelle Nachricht ist eine Folgefrage. Beziehe sie auf die vorherigen Fragen und den Kontext."
        : "Beantworte die Frage nur aus dem Kontext.";
  return `${task}\n\nKontext:\n${contextBlock(ranked)}\n\nAktuelle Nachricht:\n${question}`;
}

async function generateOpenAiAnswer(
  question: string,
  ranked: RankedChunk[],
  priorTurns: PriorTurn[],
  kind: AnswerKind,
): Promise<string> {
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1")
    .replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...historyMessages(priorTurns),
        { role: "user", content: userPayload(question, ranked, kind) },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`openai ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("empty openai response");
  return text;
}

async function generateAnthropicAnswer(
  question: string,
  ranked: RankedChunk[],
  priorTurns: PriorTurn[],
  kind: AnswerKind,
): Promise<string> {
  const history = historyMessages(priorTurns);
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...history,
    { role: "user", content: userPayload(question, ranked, kind) },
  ];
  if (messages[0]?.role !== "user") {
    messages.unshift({ role: "user", content: "(Beginn des Chats)" });
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-0",
      max_tokens: 900,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`anthropic ${response.status}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = data.content?.find((part) => part.type === "text")?.text?.trim();
  if (!text) throw new Error("empty anthropic response");
  return text;
}
