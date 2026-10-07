export type DocumentFormat = "docx" | "pdf" | "txt";

export type LibraryDocument = {
  id: string;
  fileName: string;
  displayPath: string;
  sourcePath?: string;
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
  sourcePath?: string;
  text: string;
  index: number;
  page?: number;
};

export type SourceHit = {
  documentId: string;
  fileName: string;
  displayPath: string;
  sourcePath?: string;
  passage: string;
  score: number;
  chunkIndex: number;
  page?: number;
};

export type AnswerMode = "extractive" | "generative";
export type AnswerKind = "search" | "followup" | "checklist";

export type AskResponse = {
  answer: string;
  sources: SourceHit[];
  mode: AnswerMode;
  kind?: AnswerKind;
  fallbackReason?: string;
};

export type ChatTurn = {
  id: string;
  question: string;
  answer?: string;
  sources?: SourceHit[];
  mode?: AnswerMode;
  kind?: AnswerKind;
  fallbackReason?: string;
  error?: string;
  pending?: boolean;
  createdAt: string;
};

export type ChatSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  turns: ChatTurn[];
};

export type ChatsSnapshot = {
  chats: ChatSession[];
  activeId: string | null;
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

export type LibraryLocation = {
  dataDir: string;
  originalsDir: string;
  portable: boolean;
};

export type LibraryPackResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

export type IngestResponse = {
  documents: LibraryDocument[];
  added: LibraryDocument[];
  skipped: SkippedFile[];
  chunkCount: number;
};
