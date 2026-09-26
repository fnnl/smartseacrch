export type DocumentFormat = "docx" | "pdf" | "txt";

export type LibraryDocument = {
  id: string;
  fileName: string;
  displayPath: string;
  format: DocumentFormat;
  size: number;
  chunkCount: number;
  uploadedAt: string;
};

export type Chunk = {
  id: string;
  documentId: string;
  fileName: string;
  displayPath: string;
  text: string;
  index: number;
};

export type SourceHit = {
  documentId: string;
  fileName: string;
  displayPath: string;
  passage: string;
  score: number;
  chunkIndex: number;
};

export type AnswerMode = "extractive" | "generative";

export type AskResponse = {
  answer: string;
  sources: SourceHit[];
  mode: AnswerMode;
  fallbackReason?: string;
};

export type SkippedFile = {
  name: string;
  reason: string;
};

export type LibraryResponse = {
  documents: LibraryDocument[];
  chunkCount: number;
  answerMode: AnswerMode;
};

export type IngestResponse = {
  documents: LibraryDocument[];
  added: LibraryDocument[];
  skipped: SkippedFile[];
  chunkCount: number;
};
