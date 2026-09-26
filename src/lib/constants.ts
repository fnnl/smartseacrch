export const ACCEPTED_EXTENSIONS = [".docx", ".pdf", ".txt", ".md"] as const;

export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 250;

export const CHUNK_TARGET_CHARS = 1100;
export const CHUNK_OVERLAP_CHARS = 120;

export function extensionOf(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i >= 0 ? fileName.slice(i).toLowerCase() : "";
}

export function isSupportedFileName(fileName: string): boolean {
  return (ACCEPTED_EXTENSIONS as readonly string[]).includes(
    extensionOf(fileName),
  );
}
