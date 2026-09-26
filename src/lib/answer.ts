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
  const scored: { text: string; score: number }[] = [];

  for (const { chunk, score } of ranked) {
    for (const sentence of splitSentences(chunk.text)) {
      const tokens = tokenize(sentence);
      const overlap = tokens.filter((token) => queryTokens.has(token)).length;
      if (overlap === 0) continue;
      scored.push({
        text: sentence,
        score: overlap + score * 0.12,
      });
    }
  }

  const unique: { text: string; score: number }[] = [];
  const seen = new Set<string>();
  for (const item of scored.sort((a, b) => b.score - a.score)) {
    const key = item.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= 3) break;
  }

  if (!unique.length) {
    const fallback = ranked[0]?.chunk.text.replace(/\s+/g, " ").trim() ?? "";
    return fallback.length > 480 ? `${fallback.slice(0, 480).trimEnd()}…` : fallback;
  }

  return unique.map((item) => item.text).join(" ");
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
