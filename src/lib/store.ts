import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Chunk, LibraryDocument } from "@/lib/types";

export type SearchStore = {
  documents: LibraryDocument[];
  chunks: Chunk[];
};

const DATA_DIR = path.join(process.cwd(), ".data");
const INDEX_PATH = path.join(DATA_DIR, "index.json");

let memory: SearchStore | null = null;
let writeTail: Promise<void> = Promise.resolve();

function emptyStore(): SearchStore {
  return { documents: [], chunks: [] };
}

export async function loadStore(): Promise<SearchStore> {
  if (memory) return memory;

  try {
    const raw = await readFile(INDEX_PATH, "utf8");
    const parsed = JSON.parse(raw) as SearchStore;
    if (!Array.isArray(parsed.documents) || !Array.isArray(parsed.chunks)) {
      memory = emptyStore();
      return memory;
    }
    memory = parsed;
    return memory;
  } catch {
    memory = emptyStore();
    return memory;
  }
}

async function persist(store: SearchStore): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(INDEX_PATH, JSON.stringify(store), "utf8");
}

function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeTail.then(fn, fn);
  writeTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function replaceDocuments(
  incoming: Array<{ document: LibraryDocument; chunks: Chunk[] }>,
): Promise<SearchStore> {
  return withWriteLock(async () => {
    const store = await loadStore();
    const incomingPaths = new Set(
      incoming.map((item) => item.document.displayPath),
    );
    const remainingDocs = store.documents.filter(
      (doc) => !incomingPaths.has(doc.displayPath),
    );
    const remainingIds = new Set(remainingDocs.map((doc) => doc.id));
    const remainingChunks = store.chunks.filter((chunk) =>
      remainingIds.has(chunk.documentId),
    );

    const next: SearchStore = {
      documents: [
        ...remainingDocs,
        ...incoming.map((item) => item.document),
      ],
      chunks: [
        ...remainingChunks,
        ...incoming.flatMap((item) => item.chunks),
      ],
    };

    memory = next;
    await persist(next);
    return next;
  });
}

export async function removeDocument(documentId: string): Promise<SearchStore> {
  return withWriteLock(async () => {
    const store = await loadStore();
    const next: SearchStore = {
      documents: store.documents.filter((doc) => doc.id !== documentId),
      chunks: store.chunks.filter((chunk) => chunk.documentId !== documentId),
    };
    memory = next;
    await persist(next);
    return next;
  });
}

export async function clearStore(): Promise<SearchStore> {
  return withWriteLock(async () => {
    const next = emptyStore();
    memory = next;
    await persist(next);
    return next;
  });
}

export function configuredAnswerMode(): "extractive" | "generative" {
  return process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
    ? "generative"
    : "extractive";
}
