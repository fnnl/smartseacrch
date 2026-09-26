export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Byte`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDocumentKind(format: string): string {
  if (format === "docx") return "Word";
  if (format === "pdf") return "PDF";
  return "Text";
}
