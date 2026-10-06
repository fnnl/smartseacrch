import { useEffect, useState } from "react";

import { AdminPanel } from "@/components/admin-panel";
import {
  ChatPanel,
  turnFromResponse,
} from "@/components/chat-panel";
import { ChatSidebar } from "@/components/chat-sidebar";
import type {
  AnswerMode,
  AskResponse,
  ChatSession,
  ChatTurn,
  IngestResponse,
  LibraryDocument,
  LibraryResponse,
} from "@/lib/types";

export function App() {
  const [ready, setReady] = useState(false);
  const [answerMode, setAnswerMode] = useState<AnswerMode>("extractive");
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [asking, setAsking] = useState(false);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [adminOpen, setAdminOpen] = useState(false);

  const applyLibrary = (data: LibraryResponse | IngestResponse) => {
    setReady(data.chunkCount > 0);
    setDocuments(data.documents);
    if ("answerMode" in data) setAnswerMode(data.answerMode);
  };

  const applyChats = (data: { chats: ChatSession[]; activeId: string | null }) => {
    setChats(data.chats);
    setActiveId(data.activeId);
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
    void window.smartsearch
      .loadChats()
      .then(applyChats)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    const pin = () => {
      html.scrollTop = 0;
      document.body.scrollTop = 0;
      window.scrollTo(0, 0);
    };
    pin();
    window.addEventListener("scroll", pin, { capture: true });
    return () => window.removeEventListener("scroll", pin, { capture: true });
  }, []);

  const activeChat = chats.find((chat) => chat.id === activeId) ?? chats[0];
  const turns = activeChat?.turns ?? [];

  const runIngest = async (work: () => Promise<IngestResponse | null>) => {
    setIngesting(true);
    setLibraryError(null);
    setNotice(null);
    try {
      const data = await work();
      if (!data) return;
      applyLibrary(data);
      if (data.added.length) {
        setNotice(
          "Unterlagen sind gespeichert. Beim nächsten Start nicht erneut einlesen.",
        );
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

  const patchActiveTurns = (updater: (current: ChatTurn[]) => ChatTurn[]) => {
    setChats((current) =>
      current.map((chat) =>
        chat.id === (activeChat?.id ?? activeId)
          ? { ...chat, turns: updater(chat.turns), updatedAt: new Date().toISOString() }
          : chat,
      ),
    );
  };

  const ask = async (question: string) => {
    if (!activeChat) return;
    const pendingId = crypto.randomUUID();
    const pending: ChatTurn = {
      id: pendingId,
      question,
      pending: true,
      createdAt: new Date().toISOString(),
    };
    patchActiveTurns((current) => [...current, pending]);
    setAsking(true);
    try {
      const data = await window.smartsearch.ask(question);
      if (data.error) {
        const failed: ChatTurn = {
          id: pendingId,
          question,
          pending: false,
          error: data.error,
          createdAt: pending.createdAt,
        };
        patchActiveTurns((current) =>
          current.map((turn) => (turn.id === pendingId ? failed : turn)),
        );
        const withError = {
          ...activeChat,
          turns: [...activeChat.turns.filter((turn) => turn.id !== pendingId), failed],
        };
        applyChats(await window.smartsearch.saveChat(withError));
        return;
      }
      const next = {
        ...turnFromResponse(question, data as AskResponse),
        id: pendingId,
      };
      const saved = {
        ...activeChat,
        turns: [...activeChat.turns.filter((turn) => turn.id !== pendingId), next],
      };
      applyChats(await window.smartsearch.saveChat(saved));
    } catch {
      const failed: ChatTurn = {
        id: pendingId,
        question,
        pending: false,
        error: "Die Suche ist fehlgeschlagen.",
        createdAt: pending.createdAt,
      };
      const saved = {
        ...activeChat,
        turns: [...activeChat.turns.filter((turn) => turn.id !== pendingId), failed],
      };
      applyChats(await window.smartsearch.saveChat(saved));
    } finally {
      setAsking(false);
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--background)",
      }}
    >
      <header
        style={{
          flex: "0 0 auto",
          padding: "12px clamp(16px, 3vw, 32px) 8px",
        }}
      >
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
                Fragen an Handbücher — lokal, ohne Server. Unterlagen und Chats
                bleiben auf diesem Rechner.
              </p>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <p
              className={`hidden shrink-0 rounded-full px-3.5 py-1.5 text-sm sm:inline-flex ${
                ready
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {ready ? "Bereit zum Fragen" : "Noch keine Unterlagen"}
            </p>
            <button
              type="button"
              onClick={() => setAdminOpen(true)}
              style={{
                border: "none",
                background: "transparent",
                color: "#5c6570",
                fontSize: 13,
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              Verwaltung
            </button>
          </div>
        </div>
      </header>

      <main
        style={{
          flex: "1 1 0%",
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          padding: "4px clamp(12px, 2.5vw, 24px) 0",
        }}
      >
        <div
          style={{
            flex: "1 1 0%",
            minHeight: 0,
            minWidth: 0,
            display: "flex",
            flexDirection: "row",
            overflow: "hidden",
            background: "var(--card)",
            borderRadius: "1.75rem 1.75rem 0 0",
            boxShadow:
              "inset 0 0 0 1px color-mix(in srgb, var(--foreground) 8%, transparent)",
          }}
        >
          <ChatSidebar
            chats={chats}
            activeId={activeChat?.id ?? activeId}
            onNew={() => {
              void window.smartsearch.createChat().then(applyChats);
            }}
            onSelect={(id) => {
              void window.smartsearch.selectChat(id).then(applyChats);
            }}
            onDelete={(id) => {
              void window.smartsearch.deleteChat(id).then(applyChats);
            }}
          />
          <ChatPanel
            turns={turns}
            ready={ready}
            answerMode={answerMode}
            asking={asking}
            onAsk={ask}
          />
        </div>
      </main>

      <AdminPanel
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        documents={documents}
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
          setNotice(null);
        }}
        onRemove={async (documentId) => {
          applyLibrary(await window.smartsearch.removeDocument(documentId));
        }}
        onExportLibrary={async () => {
          setLibraryError(null);
          try {
            const result = await window.smartsearch.exportLibrary();
            if (!result) return;
            if (result.ok) {
              setNotice(`Bibliothek gespeichert:\n${result.path}`);
            } else {
              setLibraryError(result.error);
            }
          } catch {
            setLibraryError("Die Bibliothek konnte nicht exportiert werden.");
          }
        }}
        onImportLibrary={() =>
          runIngest(() => window.smartsearch.importLibrary())
        }
        onOpenLibraryFolder={async () => {
          setLibraryError(null);
          const result = await window.smartsearch.openLibraryFolder();
          if (!result.ok) setLibraryError(result.error);
        }}
        onCopyLibraryFolder={async () => {
          setLibraryError(null);
          try {
            const result = await window.smartsearch.copyLibraryFolder();
            if (!result) return;
            if (result.ok) {
              setNotice(
                `Datenordner kopiert nach:\n${result.path}\nDiesen Ordner neben die portable .exe legen.`,
              );
            } else {
              setLibraryError(result.error);
            }
          } catch {
            setLibraryError("Der Datenordner konnte nicht kopiert werden.");
          }
        }}
      />
    </div>
  );
}
