import { resolveSourceFromStore } from "./resolve-source";

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

const store = {
  documents: [
    {
      id: "old-without-path",
      fileName: "Kurzcheckliste-Stoerungen.pdf",
      displayPath: "Handbuch/Kurzcheckliste-Stoerungen.pdf",
      format: "pdf" as const,
      size: 1,
      chunkCount: 1,
      uploadedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "fresh",
      fileName: "Kurzcheckliste-Stoerungen.pdf",
      displayPath: "checklisten/Kurzcheckliste-Stoerungen.pdf",
      sourcePath: "/tmp/Kurzcheckliste-Stoerungen.pdf",
      format: "pdf" as const,
      size: 1,
      chunkCount: 1,
      uploadedAt: "2026-10-05T00:00:00.000Z",
    },
  ],
  chunks: [
    {
      id: "fresh:0",
      documentId: "fresh",
      fileName: "Kurzcheckliste-Stoerungen.pdf",
      displayPath: "checklisten/Kurzcheckliste-Stoerungen.pdf",
      sourcePath: "/tmp/Kurzcheckliste-Stoerungen.pdf",
      text: "E12 Wassertank",
      index: 0,
      page: 2,
    },
  ],
};

const stale = resolveSourceFromStore(store, {
  documentId: "gone-id",
  fileName: "Kurzcheckliste-Stoerungen.pdf",
  chunkIndex: 0,
});
assert(
  stale.path === "/tmp/Kurzcheckliste-Stoerungen.pdf",
  `expected fallback path, got ${stale.path}`,
);
assert(stale.page === 2, `expected page 2, got ${stale.page}`);

const prefersPath = resolveSourceFromStore(store, {
  documentId: "old-without-path",
  fileName: "Kurzcheckliste-Stoerungen.pdf",
  chunkIndex: 0,
});
assert(
  prefersPath.path === "/tmp/Kurzcheckliste-Stoerungen.pdf",
  `expected path-bearing duplicate, got ${prefersPath.path}`,
);

const missing = resolveSourceFromStore(store, {
  documentId: "nope",
  fileName: "fehlt.docx",
  chunkIndex: 0,
});
assert(!missing.path, "missing file should not resolve");

console.log("resolve-source ok");
