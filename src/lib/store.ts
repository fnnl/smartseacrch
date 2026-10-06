import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { getDataDir } from "@/lib/data-dir";
import { clearOriginalsDir, removeOriginalFile } from "@/lib/originals";
import type { Chunk, LibraryDocument } from "@/lib/types";

export type SearchStore = {
  documents: LibraryDocument[];
  chunks: Chunk[];
};

export { getDataDir, setDataDir } from "@/lib/data-dir";

function indexPath(): string {
  return path.join(getDataDir(), "index.json");
}

let writeTail: Promise<void> = Promise.resolve();

function emptyStore(): SearchStore {
  return { documents: [], chunks: [] };
}

export async function loadStore(): Promise<SearchStore> {
  try {
    const raw = await readFile(indexPath(), "utf8");
    const parsed = JSON.parse(raw) as SearchStore;
    if (!Array.isArray(parsed.documents) || !Array.isArray(parsed.chunks)) {
      return emptyStore();
    }
    return parsed;
  } catch {
    return emptyStore();
  }
}

async function persist(store: SearchStore): Promise<void> {
  await mkdir(getDataDir(), { recursive: true });
  const tmp = `${indexPath()}.tmp`;
  await writeFile(tmp, JSON.stringify(store), "utf8");
  await rename(tmp, indexPath());
}

function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeTail.then(fn, fn);
  writeTail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function mutateStore(
  fn: (store: SearchStore) => Promise<SearchStore> | SearchStore,
): Promise<SearchStore> {
  return withWriteLock(async () => {
    const store = await loadStore();
    const next = await fn(store);
    await persist(next);
    return next;
  });
}

export async function replaceDocuments(
  incoming: Array<{ document: LibraryDocument; chunks: Chunk[] }>,
): Promise<SearchStore> {
  return withWriteLock(async () => {
    const store = await loadStore();
    const incomingPaths = new Set(
      incoming.map((item) => item.document.displayPath),
    );
    const incomingIds = new Set(incoming.map((item) => item.document.id));
    const outgoing = store.documents.filter(
      (doc) =>
        incomingPaths.has(doc.displayPath) || incomingIds.has(doc.id),
    );
    const keptRels = new Set(
      incoming
        .map((item) => item.document.sourcePath)
        .filter((value): value is string => Boolean(value)),
    );
    for (const old of outgoing) {
      if (old.sourcePath && !keptRels.has(old.sourcePath)) {
        await removeOriginalFile(old.sourcePath);
      }
    }

    const remainingDocs = store.documents.filter(
      (doc) =>
        !incomingPaths.has(doc.displayPath) && !incomingIds.has(doc.id),
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

    await persist(next);
    return next;
  });
}

export async function removeDocument(documentId: string): Promise<SearchStore> {
  return withWriteLock(async () => {
    const store = await loadStore();
    const gone = store.documents.find((doc) => doc.id === documentId);
    if (gone) await removeOriginalFile(gone.sourcePath);
    const next: SearchStore = {
      documents: store.documents.filter((doc) => doc.id !== documentId),
      chunks: store.chunks.filter((chunk) => chunk.documentId !== documentId),
    };
    await persist(next);
    return next;
  });
}

export async function clearStore(): Promise<SearchStore> {
  return withWriteLock(async () => {
    await clearOriginalsDir();
    const next = emptyStore();
    await persist(next);
    return next;
  });
}

export function configuredAnswerMode(): "extractive" | "generative" {
  return process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
    ? "generative"
    : "extractive";
}
