import { absolutizeSourcePath } from "@/lib/originals";
import type { Chunk, LibraryDocument, SourceHit } from "@/lib/types";

export type SourceStore = {
  documents: LibraryDocument[];
  chunks: Chunk[];
};

export type ResolvedSource = {
  path?: string;
  page?: number;
};

export function resolveSourceFromStore(
  store: SourceStore,
  hit: Partial<SourceHit> | null | undefined,
): ResolvedSource {
  const fileName = typeof hit?.fileName === "string" ? hit.fileName : "";
  const docs = store.documents.filter(
    (doc) =>
      (hit?.documentId && doc.id === hit.documentId) ||
      (fileName && doc.fileName === fileName),
  );
  const document =
    docs.find((doc) => Boolean(doc.sourcePath)) ?? docs[0];

  const chunks = store.chunks.filter(
    (chunk) =>
      (document && chunk.documentId === document.id) ||
      (fileName && chunk.fileName === fileName),
  );
  const chunk =
    chunks.find(
      (item) =>
        typeof hit?.chunkIndex === "number" &&
        item.index === hit.chunkIndex &&
        Boolean(item.sourcePath),
    ) ?? chunks.find((item) => Boolean(item.sourcePath));

  const fromHit =
    typeof hit?.sourcePath === "string" && hit.sourcePath
      ? hit.sourcePath
      : undefined;

  const stored =
    chunk?.sourcePath || document?.sourcePath || fromHit;
  const resolvedPath = absolutizeSourcePath(stored) ?? stored;
  const page = hit?.page ?? chunk?.page;
  return { path: resolvedPath, page };
}
