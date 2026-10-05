import { randomUUID } from "node:crypto";

import {
  MAX_FILE_BYTES,
  MAX_FILES_PER_UPLOAD,
  isSupportedFileName,
} from "@/lib/constants";
import { chunksForDocument } from "@/lib/chunk";
import { ParseError, extractDocumentText } from "@/lib/parse";
import { loadStore, replaceDocuments } from "@/lib/store";
import type {
  IngestResponse,
  LibraryDocument,
  SkippedFile,
} from "@/lib/types";

export type IncomingFile = {
  name: string;
  displayPath: string;
  sourcePath?: string;
  size: number;
  bytes: Uint8Array;
};

export async function ingestIncomingFiles(
  files: IncomingFile[],
): Promise<IngestResponse> {
  const skipped: SkippedFile[] = [];
  const incoming: Array<{
    document: LibraryDocument;
    chunks: ReturnType<typeof chunksForDocument>;
  }> = [];

  const limited = files.slice(0, MAX_FILES_PER_UPLOAD);
  if (files.length > MAX_FILES_PER_UPLOAD) {
    for (const file of files.slice(MAX_FILES_PER_UPLOAD)) {
      skipped.push({
        name: file.displayPath || file.name,
        reason: `Mehr als ${MAX_FILES_PER_UPLOAD} Dateien in einem Durchgang sind nicht möglich.`,
      });
    }
  }

  for (const file of limited) {
    const label = file.displayPath || file.name;
    if (!isSupportedFileName(file.name) && !isSupportedFileName(label)) {
      skipped.push({
        name: label,
        reason: "Nur .docx, .pdf und .txt werden gelesen.",
      });
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      skipped.push({
        name: label,
        reason: "Die Datei ist größer als 15 MB.",
      });
      continue;
    }

    try {
      const parsed = await extractDocumentText(file.name || label, file.bytes);
      const document: LibraryDocument = {
        id: randomUUID(),
        fileName: baseName(file.name || label),
        displayPath: label,
        sourcePath: file.sourcePath,
        format: parsed.format,
        size: file.size,
        chunkCount: 0,
        uploadedAt: new Date().toISOString(),
      };
      const chunks = chunksForDocument(document, parsed.text, parsed.pages);
      if (!chunks.length) {
        skipped.push({
          name: label,
          reason: "Nach dem Zerlegen blieb kein Text übrig.",
        });
        continue;
      }
      document.chunkCount = chunks.length;
      incoming.push({ document, chunks });
    } catch (error) {
      skipped.push({
        name: label,
        reason:
          error instanceof ParseError
            ? error.message
            : "Die Datei konnte nicht verarbeitet werden.",
      });
    }
  }

  const store = incoming.length
    ? await replaceDocuments(incoming)
    : await loadStore();

  return {
    documents: store.documents,
    added: incoming.map((item) => item.document),
    skipped,
    chunkCount: store.chunks.length,
  };
}

function baseName(pathName: string): string {
  const parts = pathName.split(/[/\\]/);
  return parts[parts.length - 1] || pathName;
}
