import { searchChunks, toSourceHits, type RankedChunk } from "@/lib/search";
import { splitSentences, tokenize } from "@/lib/tokenize";
import type { AskResponse, Chunk } from "@/lib/types";

const NO_MATCH =
  "In den geladenen Dokumenten habe ich dazu keine passende Stelle gefunden. Formuliere die Frage mit Begriffen aus den Texten — zum Beispiel einem Fehlernamen, einem Bauteil oder einem Kapitel.";

export async function answerQuestion(
  chunks: Chunk[],
  question: string,
): Promise<AskResponse> {
  const ranked = searchChunks(chunks, question, 6);
  const sources = toSourceHits(ranked);

  if (!ranked.length) {
    return {
      answer: NO_MATCH,
      sources: [],
      mode: "extractive",
    };
  }

  const extractive = buildExtractiveAnswer(question, ranked);

  if (process.env.OPENAI_API_KEY) {
    try {
      const generated = await generateOpenAiAnswer(question, ranked);
      return {
        answer: generated,
        sources,
        mode: "generative",
      };
    } catch {
      return {
        answer: extractive,
        sources,
        mode: "extractive",
        fallbackReason:
          "Das Sprachmodell war nicht erreichbar. Deshalb stammen die Sätze direkt aus den Dokumenten.",
      };
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const generated = await generateAnthropicAnswer(question, ranked);
      return {
        answer: generated,
        sources,
        mode: "generative",
      };
    } catch {
      return {
        answer: extractive,
        sources,
        mode: "extractive",
        fallbackReason:
          "Das Sprachmodell war nicht erreichbar. Deshalb stammen die Sätze direkt aus den Dokumenten.",
      };
    }
  }

  return {
    answer: extractive,
    sources,
    mode: "extractive",
  };
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
    if (parts.join(" ").length > 280 || parts.length >= 2) break;
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

async function generateOpenAiAnswer(
  question: string,
  ranked: RankedChunk[],
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
        {
          role: "system",
          content:
            "Du beantwortest Fragen zu hochgeladenen Handbüchern und Problembeschreibungen. Antworte auf Deutsch, knapp und sachlich. Verwende nur den gelieferten Kontext. Wenn etwas nicht vorkommt, sag das klar. Keine Quellenliste — die Oberfläche zeigt die Stellen separat.",
        },
        {
          role: "user",
          content: `Kontext:\n${contextBlock(ranked)}\n\nFrage: ${question}`,
        },
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
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-0",
      max_tokens: 600,
      temperature: 0.2,
      system:
        "Du beantwortest Fragen zu hochgeladenen Handbüchern und Problembeschreibungen. Antworte auf Deutsch, knapp und sachlich. Verwende nur den gelieferten Kontext. Wenn etwas nicht vorkommt, sag das klar. Keine Quellenliste — die Oberfläche zeigt die Stellen separat.",
      messages: [
        {
          role: "user",
          content: `Kontext:\n${contextBlock(ranked)}\n\nFrage: ${question}`,
        },
      ],
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
