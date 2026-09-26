"use client";

import { MenuIcon } from "lucide-react";
import { useState } from "react";

import {
  ChatPanel,
  turnFromResponse,
  type ChatTurn,
} from "@/components/chat-panel";
import { LibraryPanel, filePayload } from "@/components/library-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  AnswerMode,
  AskResponse,
  IngestResponse,
  LibraryDocument,
  LibraryResponse,
  SkippedFile,
} from "@/lib/types";

type SearchAppProps = {
  initialDocuments: LibraryDocument[];
  initialChunkCount: number;
  initialAnswerMode: AnswerMode;
};

export function SearchApp({
  initialDocuments,
  initialChunkCount,
  initialAnswerMode,
}: SearchAppProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [chunkCount, setChunkCount] = useState(initialChunkCount);
  const [answerMode, setAnswerMode] = useState(initialAnswerMode);
  const [skipped, setSkipped] = useState<SkippedFile[]>([]);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [asking, setAsking] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const applyLibrary = (data: LibraryResponse | IngestResponse) => {
    setDocuments(data.documents);
    setChunkCount(data.chunkCount);
    if ("answerMode" in data) setAnswerMode(data.answerMode);
    if ("skipped" in data) setSkipped(data.skipped);
  };

  const ingest = async (files: File[]) => {
    if (!files.length) {
      setLibraryError(
        "In der Auswahl war keine .docx-, .pdf- oder .txt-Datei.",
      );
      return;
    }
    setIngesting(true);
    setLibraryError(null);
    setSkipped([]);
    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        body: filePayload(files),
      });
      const data = (await response.json()) as IngestResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "ingest");
      }
      applyLibrary(data);
      if (!data.added.length && data.skipped.length) {
        setLibraryError("Keine der Dateien konnte indexiert werden.");
      }
    } catch (error) {
      setLibraryError(
        error instanceof Error && error.message !== "ingest"
          ? error.message
          : "Hochladen ist fehlgeschlagen. Versuche es erneut.",
      );
    } finally {
      setIngesting(false);
    }
  };

  const loadSample = async () => {
    setIngesting(true);
    setLibraryError(null);
    setSkipped([]);
    try {
      const response = await fetch("/api/ingest/sample", { method: "POST" });
      const data = (await response.json()) as IngestResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "sample");
      applyLibrary(data);
      setLibraryOpen(false);
    } catch {
      setLibraryError("Das Beispiel-Handbuch konnte nicht geladen werden.");
    } finally {
      setIngesting(false);
    }
  };

  const removeDocument = async (id: string) => {
    const response = await fetch(`/api/library?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setLibraryError("Die Datei konnte nicht entfernt werden.");
      return;
    }
    applyLibrary((await response.json()) as LibraryResponse);
  };

  const clearLibrary = async () => {
    const response = await fetch("/api/library", { method: "DELETE" });
    if (!response.ok) {
      setLibraryError("Die Bibliothek konnte nicht geleert werden.");
      return;
    }
    applyLibrary((await response.json()) as LibraryResponse);
    setTurns([]);
    setSkipped([]);
  };

  const ask = async (question: string) => {
    const pendingId = crypto.randomUUID();
    setTurns((current) => [
      ...current,
      { id: pendingId, question, pending: true },
    ]);
    setAsking(true);
    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = (await response.json()) as AskResponse & { error?: string };
      if (!response.ok) {
        setTurns((current) =>
          current.map((turn) =>
            turn.id === pendingId
              ? { ...turn, pending: false, error: data.error ?? "Die Suche ist fehlgeschlagen." }
              : turn,
          ),
        );
        return;
      }
      const next = turnFromResponse(question, data);
      setTurns((current) =>
        current.map((turn) => (turn.id === pendingId ? { ...next, id: pendingId } : turn)),
      );
    } catch {
      setTurns((current) =>
        current.map((turn) =>
          turn.id === pendingId
            ? {
                ...turn,
                pending: false,
                error: "Keine Verbindung zur Suche. Prüfe, ob die App läuft.",
              }
            : turn,
        ),
      );
    } finally {
      setAsking(false);
    }
  };

  const library = (
    <LibraryPanel
      documents={documents}
      chunkCount={chunkCount}
      ingesting={ingesting}
      skipped={skipped}
      error={libraryError}
      onUpload={ingest}
      onLoadSample={loadSample}
      onRemove={removeDocument}
      onClear={clearLibrary}
    />
  );

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <header className="border-border/80 flex items-center justify-between gap-3 border-b px-4 py-3 md:px-6">
        <div className="min-w-0">
          <p className="font-heading text-xl tracking-tight md:text-2xl">
            SmartSeacrch
          </p>
          <p className="truncate text-sm text-muted-foreground">
            Fragen an Handbücher und Problembeschreibungen
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {`${documents.length} ${documents.length === 1 ? "Datei" : "Dateien"}`}
          </Badge>
          <Button
            type="button"
            variant="outline"
            className="md:hidden"
            onClick={() => setLibraryOpen(true)}
          >
            <MenuIcon data-icon="inline-start" />
            Dokumente
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="border-border/80 bg-sidebar hidden w-[22rem] shrink-0 border-r md:flex md:flex-col">
          {library}
        </aside>
        <main className="min-w-0 flex-1">
          <ChatPanel
            turns={turns}
            documentCount={documents.length}
            answerMode={answerMode}
            asking={asking}
            onAsk={ask}
          />
        </main>
      </div>

      <Sheet open={libraryOpen} onOpenChange={setLibraryOpen}>
        <SheetContent side="left" className="w-[20rem] p-0 sm:max-w-none">
          <SheetHeader className="sr-only">
            <SheetTitle>Dokumente</SheetTitle>
            <SheetDescription>
              Dateien hochladen und die Bibliothek verwalten
            </SheetDescription>
          </SheetHeader>
          {library}
        </SheetContent>
      </Sheet>
    </div>
  );
}
