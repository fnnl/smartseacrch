import { tokenize } from "@/lib/tokenize";
import type { Chunk, SourceHit } from "@/lib/types";

export type RankedChunk = {
  chunk: Chunk;
  score: number;
};

const BM25_K1 = 1.2;
const BM25_B = 0.75;

export function searchChunks(
  chunks: Chunk[],
  query: string,
  limit = 6,
): RankedChunk[] {
  const queryTokens = tokenize(query);
  if (!queryTokens.length || !chunks.length) return [];

  const tokenized = chunks.map((chunk) => tokenize(chunk.text));
  const documentCount = chunks.length;
  const df = new Map<string, number>();

  for (const tokens of tokenized) {
    const unique = new Set(tokens);
    for (const token of unique) {
      df.set(token, (df.get(token) ?? 0) + 1);
    }
  }

  const avgdl =
    tokenized.reduce((sum, tokens) => sum + tokens.length, 0) /
    Math.max(documentCount, 1);

  const ranked = chunks.map((chunk, index) => {
    const tokens = tokenized[index];
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
    }

    const dl = tokens.length || 1;
    let score = 0;

    for (const token of queryTokens) {
      const freq = tf.get(token) ?? 0;
      if (!freq) continue;
      const n = df.get(token) ?? 0;
      const idf = Math.log((documentCount - n + 0.5) / (n + 0.5) + 1);
      const denom = freq + BM25_K1 * (1 - BM25_B + BM25_B * (dl / avgdl));
      score += idf * ((freq * (BM25_K1 + 1)) / denom);
    }

    return { chunk, score };
  });

  return ranked
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function toSourceHits(ranked: RankedChunk[]): SourceHit[] {
  const seen = new Set<string>();
  const hits: SourceHit[] = [];

  for (const { chunk, score } of ranked) {
    const key = `${chunk.documentId}:${chunk.index}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push({
      documentId: chunk.documentId,
      fileName: chunk.fileName,
      displayPath: chunk.displayPath,
      sourcePath: chunk.sourcePath,
      passage: excerpt(chunk.text, 420),
      score,
      chunkIndex: chunk.index,
      page: chunk.page,
    });
  }

  return hits;
}

function excerpt(text: string, max: number): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max).trimEnd()}…`;
}
