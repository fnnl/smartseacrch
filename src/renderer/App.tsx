import { MenuIcon } from "lucide-react";
import { useEffect, useState } from "react";

import {
  ChatPanel,
  turnFromResponse,
  type ChatTurn,
} from "@/components/chat-panel";
import { LibraryPanel } from "@/components/library-panel";
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

export function App() {
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [chunkCount, setChunkCount] = useState(0);
  const [answerMode, setAnswerMode] = useState<AnswerMode>("extractive");
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

  useEffect(() => {
    void window.smartsearch.getLibrary().then(applyLibrary).catch(() => {
      setLibraryError("Die Bibliothek konnte nicht gelesen werden.");
    });
  }, []);

  const runIngest = async (work: () => Promise<IngestResponse | null>) => {
    setIngesting(true);
    setLibraryError(null);
    setSkipped([]);
    try {
      const data = await work();
      if (!data) return;
      applyLibrary(data);
      if (!data.added.length && data.skipped.length) {
        setLibraryError("Keine der Dateien konnte indexiert werden.");
      }
    } catch {
      setLibraryError("Die Dateien konnten nicht gelesen werden.");
    } finally {
      setIngesting(false);
    }
  };

  const ask = async (question: string) => {
    const pendingId = crypto.randomUUID();
    setTurns((current) => [
      ...current,
      { id: pendingId, question, pending: true },
    ]);
    setAsking(true);
    try {
      const data = await window.smartsearch.ask(question);
      if (data.error) {
        setTurns((current) =>
          current.map((turn) =>
            turn.id === pendingId
              ? { ...turn, pending: false, error: data.error }
              : turn,
          ),
        );
        return;
      }
      const next = turnFromResponse(question, data as AskResponse);
      setTurns((current) =>
        current.map((turn) =>
          turn.id === pendingId ? { ...next, id: pendingId } : turn,
        ),
      );
    } catch {
      setTurns((current) =>
        current.map((turn) =>
          turn.id === pendingId
            ? {
                ...turn,
                pending: false,
                error: "Die Suche ist fehlgeschlagen.",
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
      onPickFiles={() => runIngest(() => window.smartsearch.pickFiles())}
      onPickFolder={() => runIngest(() => window.smartsearch.pickFolder())}
      onDropPaths={(paths) =>
        runIngest(() => window.smartsearch.ingestPaths(paths))
      }
      onLoadSample={() => runIngest(() => window.smartsearch.loadSample())}
      onRemove={async (id) => {
        applyLibrary(await window.smartsearch.remove(id));
      }}
      onClear={async () => {
        applyLibrary(await window.smartsearch.clear());
        setTurns([]);
        setSkipped([]);
      }}
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
            Fragen an Handbücher und Problembeschreibungen — lokal, ohne Server
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

      {libraryOpen ? (
        <Sheet open onOpenChange={setLibraryOpen}>
          <SheetContent side="left" className="w-[20rem] p-0 sm:max-w-none">
            <SheetHeader className="sr-only">
              <SheetTitle>Dokumente</SheetTitle>
              <SheetDescription>
                Dateien oder einen Ordner vom Rechner wählen
              </SheetDescription>
            </SheetHeader>
            {library}
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}
