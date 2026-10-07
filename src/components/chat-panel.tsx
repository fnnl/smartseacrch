import { createPortal } from "react-dom";
import { BookOpenIcon, LoaderCircleIcon, SendIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ActionButton } from "@/components/action-button";
import { Badge } from "@/components/ui/badge";
import type { AnswerMode, AskResponse, ChatTurn, SourceHit } from "@/lib/types";

type ChatPanelProps = {
  turns: ChatTurn[];
  ready: boolean;
  answerMode: AnswerMode;
  asking: boolean;
  onAsk: (question: string) => Promise<void>;
};

const EXAMPLES = [
  "Was bedeutet Fehler E12?",
  "und beim KV-800?",
  "Fall: KV-400 zeigt E12, Tank ist voll, Filter seit 8 Monaten nicht gewechselt, Schwimmerklappe klemmt.",
];

export function ChatPanel({
  turns,
  ready,
  answerMode,
  asking,
  onAsk,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "auto" });
  }, [turns, asking]);

  const submitFrom = async (raw: string) => {
    const question = raw.trim();
    if (!question || asking || !ready) return;
    setDraft("");
    await onAsk(question);
  };

  const canSend = ready && !asking && draft.trim().length > 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 0%",
        height: "100%",
        minHeight: 0,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flex: "0 0 auto",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          padding: "16px clamp(16px, 3vw, 32px) 8px",
        }}
      >
        <div className="max-w-2xl">
          <h2 className="font-heading text-xl tracking-tight">Chat</h2>
          <p className="mt-1.5 text-[0.95rem] leading-7 text-muted-foreground">
            {ready
              ? "Folgefragen gelten für diesen Chat, z. B. «und beim KV-800?». Einen Fall — Fehler, Gerät, Symptome — hier einfügen: die App prüft ihn gegen die Checklisten."
              : "Sobald Unterlagen indexiert sind, kannst du in einem Chat nach Fehlern, Schritten und Teilen fragen."}
          </p>
        </div>
        <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
          {answerMode === "generative"
            ? "Sprachmodell bereit"
            : "Antworten aus den Unterlagen"}
        </Badge>
      </div>

      <div
        ref={listRef}
        data-answers-scroll="true"
        style={{
          flex: "1 1 0%",
          minHeight: 0,
          overflowX: "hidden",
          overflowY: "auto",
          overscrollBehavior: "contain",
          scrollbarGutter: "stable",
          padding: "8px clamp(16px, 3vw, 32px) 16px",
        }}
      >
        {turns.length === 0 ? (
          <EmptyChat
            ready={ready}
            asking={asking}
            onAsk={(question) => void submitFrom(question)}
          />
        ) : (
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {turns.map((turn) => (
              <li key={turn.id} style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <p
                    style={{
                      margin: 0,
                      maxWidth: "40rem",
                      background: "var(--primary)",
                      color: "var(--primary-foreground)",
                      borderRadius: "22px 22px 8px 22px",
                      padding: "12px 16px",
                      fontSize: 15,
                      lineHeight: 1.7,
                    }}
                  >
                    {turn.question}
                  </p>
                </div>
                <div style={{ marginTop: 12 }}>
                {turn.pending ? (
                  <div
                    style={{
                      maxWidth: "46rem",
                      background: "var(--muted)",
                      borderRadius: "22px 22px 22px 8px",
                      padding: "16px 20px",
                    }}
                  >
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                      <LoaderCircleIcon className="size-4 animate-spin" />
                      Suche in den Unterlagen…
                    </p>
                  </div>
                ) : turn.error ? (
                  <div
                    className="border-destructive/30 bg-destructive/5 text-destructive text-sm leading-6"
                    role="alert"
                    style={{
                      maxWidth: "46rem",
                      borderRadius: 18,
                      padding: "16px 20px",
                    }}
                  >
                    {turn.error}
                  </div>
                ) : (
                  <AnswerCard turn={turn} />
                )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <form
        data-question-composer="true"
        style={{
          flex: "0 0 auto",
          background: "var(--composer)",
          borderTop: "1px solid var(--border)",
          padding: "12px clamp(16px, 3vw, 32px) 16px",
        }}
        onSubmit={(event) => {
          event.preventDefault();
          void submitFrom(draft);
        }}
      >
        <label
          htmlFor="question-input"
          style={{
            display: "block",
            fontSize: 15,
            fontWeight: 700,
            color: "var(--foreground)",
            marginBottom: 8,
          }}
        >
          Frage oder Fall
        </label>
        <div style={{ display: "flex", alignItems: "stretch", gap: 12, flexWrap: "wrap" }}>
          <textarea
            id="question-input"
            name="question"
            className="question-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submitFrom(event.currentTarget.value);
              }
            }}
            placeholder={
              ready
                ? "Nächste Frage, z. B. und beim KV-800? Oder einen Fall mit Fehler, Gerät und bisherigen Schritten einfügen."
                : "Zuerst muss die Verwaltung Unterlagen hinterlegen — dann hier die Frage eingeben"
            }
            disabled={asking || !ready}
            aria-label="Frage eingeben"
            rows={3}
            style={{
              flex: "1 1 240px",
              minWidth: 0,
              minHeight: "clamp(72px, 12vh, 96px)",
              maxHeight: 160,
              padding: "14px 16px",
              border: ready ? "2px solid var(--primary)" : "2px solid var(--border)",
              borderRadius: 10,
              background: ready ? "#ffffff" : "#f7f8fa",
              fontSize: 16,
              lineHeight: 1.5,
              color: "var(--foreground)",
              resize: "none",
              fontFamily: "inherit",
              boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.06)",
              outline: "none",
            }}
          />
          <ActionButton
            type="submit"
            variant="filled"
            disabled={!canSend}
            aria-label="Frage senden"
            style={{
              minWidth: 140,
              flex: "0 0 auto",
              height: "auto",
              alignSelf: "stretch",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {asking ? (
              <LoaderCircleIcon
                className="animate-spin"
                style={{ width: 20, height: 20 }}
              />
            ) : (
              <SendIcon style={{ width: 20, height: 20 }} />
            )}
            Frage senden
          </ActionButton>
        </div>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 12,
            lineHeight: 1.5,
            color: "var(--muted-foreground)",
          }}
        >
          Eingabe sendet. Umschalt+Eingabe neue Zeile. Folgefragen nutzen den bisherigen Chat; ein eingefügter Fall wird gegen die Checklisten geprüft.
        </p>
      </form>
    </div>
  );
}

function EmptyChat({
  ready,
  asking,
  onAsk,
}: {
  ready: boolean;
  asking: boolean;
  onAsk: (value: string) => void;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-6 py-10">
      <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-2xl">
        <BookOpenIcon className="size-6" />
      </div>
      <div>
        <p className="font-heading text-2xl tracking-tight">
          {ready
            ? "Frage nach, oder füge einen Fall ein"
            : "Lade zuerst deine Unterlagen"}
        </p>
        <p className="mt-3 text-[0.95rem] leading-7 text-muted-foreground">
          {ready
            ? "Dieselben Unterlagen, derselbe Chat. Eine kurze Folgefrage bezieht sich auf das Vorherige. Ein konkretes Beispiel (Störung, Gerät, was schon geprüft wurde) wird gegen die Checklisten gehalten."
            : "Die Verwaltung hinterlegt die Handbücher und Problembeschreibungen. Danach die Frage ins Feld unten schreiben."}
        </p>
      </div>
      {ready ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {EXAMPLES.map((example) => (
            <ActionButton
              key={example}
              variant="outlined"
              disabled={asking}
              onClick={() => onAsk(example)}
            >
              {example}
            </ActionButton>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AnswerCard({ turn }: { turn: ChatTurn }) {
  return (
    <article
      data-answer-kind={turn.kind ?? "search"}
      style={{
        position: "relative",
        maxWidth: "46rem",
        background: "#eef0f3",
        borderRadius: "22px 22px 22px 8px",
        padding: "16px 20px 12px",
      }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{answerBadge(turn)}</Badge>
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 16,
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
        }}
      >
        {turn.answer}
      </p>
      {turn.fallbackReason ? (
        <p className="text-muted-foreground mt-3 text-xs leading-5">
          {turn.fallbackReason}
        </p>
      ) : null}
      {turn.sources && turn.sources.length > 0 ? (
        <SourceFootnotes sources={turn.sources} />
      ) : null}
    </article>
  );
}

function SourceFootnotes({ sources }: { sources: SourceHit[] }) {
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState<string | null>(null);

  return (
    <div>
      <div
        aria-label="Quellen"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 6,
          marginTop: 10,
        }}
      >
        {sources.map((source, index) => (
          <SourceFootnote
            key={`${source.documentId}-${source.chunkIndex}-${index}`}
            source={source}
            index={index}
            onError={(message) => {
              setError(message);
              if (message) setOpened(null);
            }}
            onOpened={(label) => {
              setError(null);
              setOpened(label);
            }}
          />
        ))}
      </div>
      {error ? (
        <p
          role="alert"
          data-source-open-error="true"
          style={{
            margin: "8px 0 0",
            textAlign: "right",
            color: "#b42318",
            fontSize: 13,
            lineHeight: 1.45,
            whiteSpace: "pre-wrap",
          }}
        >
          {error}
        </p>
      ) : opened ? (
        <p
          data-source-open-ok="true"
          style={{
            margin: "8px 0 0",
            textAlign: "right",
            color: "#1f6a3a",
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          {opened}
        </p>
      ) : null}
    </div>
  );
}

function SourceFootnote({
  source,
  index,
  onError,
  onOpened,
}: {
  source: SourceHit;
  index: number;
  onError: (message: string | null) => void;
  onOpened: (label: string) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0, below: false });
  const [opening, setOpening] = useState(false);

  const place = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const below = rect.top < 280;
    setPos({
      top: below ? rect.bottom : rect.top,
      right: Math.max(12, window.innerWidth - rect.right),
      below,
    });
  };

  const show = () => {
    place();
    setOpen(true);
  };

  const hide = () => setOpen(false);

  const openFile = async () => {
    setOpening(true);
    try {
      const result = await window.smartsearch.openSource(source);
      if (result.ok) {
        onError(null);
        onOpened(
          source.page
            ? `Geöffnet: ${source.fileName} · Seite ${source.page}`
            : `Geöffnet: ${source.fileName}`,
        );
      } else {
        onError(result.error);
        show();
      }
    } catch {
      onError("Die Datei konnte nicht geöffnet werden.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-source-footnote="true"
        data-file-name={source.fileName}
        aria-label={`Quelle ${index + 1}: ${source.fileName}, Stelle ${source.chunkIndex + 1}. Klicken öffnet die Datei.`}
        aria-expanded={open}
        title="Klicken öffnet die Datei"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={() => void openFile()}
        disabled={opening}
        style={{
          minWidth: 26,
          height: 26,
          padding: "0 7px",
          borderRadius: 999,
          border: "1px solid var(--border)",
          background: "#ffffff",
          color: "var(--primary)",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "inherit",
          lineHeight: "24px",
          cursor: opening ? "wait" : "pointer",
        }}
      >
        {index + 1}
      </button>
      {open
        ? createPortal(
            <div
              role="tooltip"
              style={{
                position: "fixed",
                top: pos.top,
                right: pos.right,
                transform: pos.below
                  ? "translateY(8px)"
                  : "translateY(calc(-100% - 8px))",
                width: "min(320px, calc(100vw - 24px))",
                maxHeight: 240,
                overflowY: "auto",
                zIndex: 90,
                background: "#ffffff",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                boxShadow: "0 8px 24px rgba(27, 31, 36, 0.16)",
                padding: "10px 12px 12px",
                pointerEvents: "none",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: 1.4,
                }}
              >
                {source.fileName}
                <span style={{ fontWeight: 500, color: "#5c6570" }}>
                  {source.page
                    ? ` · Seite ${source.page}`
                    : ` · Stelle ${source.chunkIndex + 1}`}
                </span>
              </p>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: "#3d444c",
                }}
              >
                {source.passage}
              </p>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 11,
                  color: "#5c6570",
                }}
              >
                Klicken öffnet die Datei
                {source.page ? ` auf Seite ${source.page}` : ""}.
              </p>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function answerBadge(turn: ChatTurn): string {
  if (turn.kind === "checklist") {
    return turn.mode === "generative"
      ? "Fallprüfung mit Sprachmodell"
      : "Fallprüfung gegen Checklisten";
  }
  if (turn.kind === "followup") {
    return turn.mode === "generative"
      ? "Folgefrage mit Sprachmodell"
      : "Folgefrage aus den Unterlagen";
  }
  return turn.mode === "generative"
    ? "Formuliert mit Sprachmodell"
    : "Auszug aus den Unterlagen";
}

export function turnFromResponse(
  question: string,
  response: AskResponse,
): ChatTurn {
  return {
    id: crypto.randomUUID(),
    question,
    answer: response.answer,
    sources: response.sources,
    mode: response.mode,
    kind: response.kind,
    fallbackReason: response.fallbackReason,
    createdAt: new Date().toISOString(),
  };
}
