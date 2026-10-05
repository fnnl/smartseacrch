import { CHUNK_OVERLAP_CHARS, CHUNK_TARGET_CHARS } from "@/lib/constants";
import { splitSentences } from "@/lib/tokenize";
import type { Chunk, LibraryDocument } from "@/lib/types";

export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function chunkText(text: string): string[] {
  const clean = normalizeText(text);
  if (!clean) return [];

  const units = clean
    .split(/\n{2,}/)
    .flatMap((block) => {
      if (block.length <= CHUNK_TARGET_CHARS * 1.4) return [block.trim()];
      return splitSentences(block);
    })
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const unit of units) {
    if (unit.length > CHUNK_TARGET_CHARS * 1.8) {
      if (current.trim()) {
        chunks.push(current.trim());
        current = "";
      }
      chunks.push(...splitLong(unit));
      continue;
    }

    const next = current ? `${current}\n\n${unit}` : unit;
    if (next.length > CHUNK_TARGET_CHARS && current) {
      chunks.push(current.trim());
      const overlap = tailOverlap(current, CHUNK_OVERLAP_CHARS);
      current = overlap ? `${overlap} ${unit}` : unit;
    } else {
      current = next;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function tailOverlap(text: string, size: number): string {
  if (text.length <= size) return text.trim();
  const slice = text.slice(-size);
  const boundary = slice.search(/\s/);
  return (boundary >= 0 ? slice.slice(boundary) : slice).trim();
}

function splitLong(text: string): string[] {
  const pieces: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_TARGET_CHARS, text.length);
    const piece = text.slice(start, end).trim();
    if (piece) pieces.push(piece);
    if (end >= text.length) break;
    start = Math.max(end - CHUNK_OVERLAP_CHARS, start + 1);
  }
  return pieces;
}

export function chunksForDocument(
  document: LibraryDocument,
  text: string,
  pageTexts?: string[],
): Chunk[] {
  const ranges = pageRanges(pageTexts);
  const full = ranges.length ? pageTexts!.filter(Boolean).join("\n\n") : text;
  return chunkText(full).map((chunk, index) => ({
    id: `${document.id}:${index}`,
    documentId: document.id,
    fileName: document.fileName,
    displayPath: document.displayPath,
    sourcePath: document.sourcePath,
    text: chunk,
    index,
    page: pageForChunk(chunk, full, ranges),
  }));
}

type PageRange = { page: number; start: number; end: number };

function pageRanges(pageTexts?: string[]): PageRange[] {
  if (!pageTexts?.length) return [];
  const ranges: PageRange[] = [];
  let pos = 0;
  let written = 0;
  for (let i = 0; i < pageTexts.length; i++) {
    const page = pageTexts[i];
    if (!page) continue;
    if (written > 0) pos += 2;
    const start = pos;
    pos += page.length;
    ranges.push({ page: i + 1, start, end: pos });
    written += 1;
  }
  return ranges;
}

function pageForChunk(
  chunk: string,
  fullText: string,
  ranges: PageRange[],
): number | undefined {
  if (!ranges.length) return undefined;
  const needle = chunk.slice(0, Math.min(160, chunk.length));
  const idx = needle ? fullText.indexOf(needle) : -1;
  if (idx >= 0) {
    const hit = ranges.find((range) => idx >= range.start && idx < range.end);
    if (hit) return hit.page;
  }
  return ranges[0]?.page;
}
