import { useEffect, useState } from "react";

import {
  ChatPanel,
  turnFromResponse,
  type ChatTurn,
} from "@/components/chat-panel";
import { WorkspaceBar } from "@/components/workspace-bar";
import type {
  AnswerMode,
  AskResponse,
  IngestResponse,
  LibraryResponse,
} from "@/lib/types";

export function App() {
  const [ready, setReady] = useState(false);
  const [answerMode, setAnswerMode] = useState<AnswerMode>("extractive");
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [asking, setAsking] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  const applyLibrary = (data: LibraryResponse | IngestResponse) => {
    setReady(data.chunkCount > 0);
    if ("answerMode" in data) setAnswerMode(data.answerMode);
  };

  useEffect(() => {
    void window.smartsearch
      .getLibrary()
      .then(applyLibrary)
      .catch(() => {
        setLibraryError("Die Unterlagen konnten nicht gelesen werden.");
      });
    void window.smartsearch
      .getBranding()
      .then((branding) => setLogoDataUrl(branding.logoDataUrl))
      .catch(() => undefined);
  }, []);

  const runIngest = async (work: () => Promise<IngestResponse | null>) => {
    setIngesting(true);
    setLibraryError(null);
    setNotice(null);
    try {
      const data = await work();
      if (!data) return;
      applyLibrary(data);
      if (data.added.length) {
        setNotice("Unterlagen sind indexiert. Du kannst jetzt fragen.");
      } else if (data.skipped.length) {
        setLibraryError(
          data.skipped[0]?.reason ??
            "Die Auswahl konnte nicht indexiert werden.",
        );
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

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <header className="px-6 pt-7 pb-2 md:px-10">
        <div className="flex items-start justify-between gap-6">
          <div className="flex min-w-0 items-center gap-4">
            {logoDataUrl ? (
              <img
                src={logoDataUrl}
                alt="Firmenlogo"
                className="h-12 max-w-[12rem] object-contain object-left"
              />
            ) : (
              <div
                aria-hidden
                className="bg-primary text-primary-foreground flex size-12 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold tracking-tight"
              >
                S
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-heading text-[1.65rem] leading-none tracking-tight md:text-[1.85rem]">
                SmartSeacrch
              </h1>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground md:text-[0.95rem]">
                Fragen an Handbücher und Problembeschreibungen — lokal, ohne
                Server
              </p>
            </div>
          </div>
          <p
            className={`hidden shrink-0 rounded-full px-3.5 py-1.5 text-sm sm:inline-flex ${
              ready
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {ready ? "Bereit zum Fragen" : "Noch keine Unterlagen"}
          </p>
        </div>

        <WorkspaceBar
          ready={ready}
          ingesting={ingesting}
          error={libraryError}
          notice={notice}
          hasLogo={Boolean(logoDataUrl)}
          onPickFiles={() => runIngest(() => window.smartsearch.pickFiles())}
          onPickFolder={() => runIngest(() => window.smartsearch.pickFolder())}
          onDropPaths={(paths) =>
            runIngest(() => window.smartsearch.ingestPaths(paths))
          }
          onLoadSample={() => runIngest(() => window.smartsearch.loadSample())}
          onPickLogo={async () => {
            try {
              const branding = await window.smartsearch.pickLogo();
              if (!branding) return;
              setLogoDataUrl(branding.logoDataUrl);
              setLibraryError(null);
            } catch (error) {
              setLibraryError(
                error instanceof Error
                  ? error.message
                  : "Das Logo konnte nicht geladen werden.",
              );
            }
          }}
          onClearLogo={async () => {
            const branding = await window.smartsearch.clearLogo();
            setLogoDataUrl(branding.logoDataUrl);
          }}
          onClear={async () => {
            applyLibrary(await window.smartsearch.clear());
            setTurns([]);
            setNotice(null);
          }}
        />
      </header>

      <main className="flex min-h-0 flex-1 px-6 pb-6 pt-4 md:px-10">
        <div className="bg-card ring-foreground/6 grid h-full min-h-0 min-w-0 flex-1 grid-rows-1 rounded-[1.75rem] ring-1">
          <ChatPanel
            turns={turns}
            ready={ready}
            answerMode={answerMode}
            asking={asking}
            onAsk={ask}
          />
        </div>
      </main>
    </div>
  );
}
