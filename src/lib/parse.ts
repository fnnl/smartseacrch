import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

import { extensionOf } from "@/lib/constants";
import { normalizeText } from "@/lib/chunk";
import type { DocumentFormat } from "@/lib/types";

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

export function formatFromName(fileName: string): DocumentFormat | null {
  const ext = extensionOf(fileName);
  if (ext === ".docx") return "docx";
  if (ext === ".pdf") return "pdf";
  if (ext === ".txt" || ext === ".md") return "txt";
  return null;
}

export async function extractDocumentText(
  fileName: string,
  bytes: Uint8Array,
): Promise<{ text: string; format: DocumentFormat }> {
  const format = formatFromName(fileName);
  if (!format) {
    throw new ParseError(
      `„${fileName}“ ist kein unterstütztes Format. Erlaubt sind .docx, .pdf und .txt.`,
    );
  }

  let raw = "";
  if (format === "docx") {
    raw = await extractDocx(bytes);
  } else if (format === "pdf") {
    raw = await extractPdf(bytes);
  } else {
    raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }

  const text = normalizeText(raw);
  if (!text) {
    throw new ParseError(
      `„${fileName}“ enthält keinen lesbaren Text.`,
    );
  }

  return { text, format };
}

async function extractDocx(bytes: Uint8Array): Promise<string> {
  try {
    const result = await mammoth.extractRawText({
      buffer: Buffer.from(bytes),
    });
    return result.value ?? "";
  } catch {
    throw new ParseError("Die Word-Datei konnte nicht gelesen werden.");
  }
}

async function extractPdf(bytes: Uint8Array): Promise<string> {
  try {
    const pdf = await getDocumentProxy(bytes);
    const extracted = await extractText(pdf, { mergePages: true });
    return extracted.text;
  } catch {
    throw new ParseError("Die PDF-Datei konnte nicht gelesen werden.");
  }
}
