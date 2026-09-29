import { ArrowUpIcon, BookOpenIcon, LoaderCircleIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AnswerMode, AskResponse, SourceHit } from "@/lib/types";

export type ChatTurn = {
  id: string;
  question: string;
  answer?: string;
  sources?: SourceHit[];
  mode?: AnswerMode;
  fallbackReason?: string;
  error?: string;
  pending?: boolean;
};

type ChatPanelProps = {
  turns: ChatTurn[];
  ready: boolean;
  answerMode: AnswerMode;
  asking: boolean;
  onAsk: (question: string) => Promise<void>;
};

const EXAMPLES = [
  "Wie wechsle ich den Wasserfilter?",
  "Was bedeutet Fehler E12?",
  "Wie oft muss ich entkalken?",
];

export function ChatPanel({
  turns,
  ready,
  answerMode,
  asking,
  onAsk,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, asking]);

  const submitFrom = async (raw: string) => {
    const question = raw.trim();
    if (!question || asking || !ready) return;
    setDraft("");
    await onAsk(question);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-4 px-7 pt-6 pb-2 md:px-10">
        <div className="max-w-2xl">
          <h2 className="font-heading text-xl tracking-tight">Fragen</h2>
          <p className="mt-1.5 text-[0.95rem] leading-7 text-muted-foreground">
            {ready
              ? "Die Antwort zeigt die Stelle, aus der sie stammt."
              : "Sobald Unterlagen indexiert sind, kannst du nach Fehlern, Schritten und Teilen fragen."}
          </p>
        </div>
        <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
          {answerMode === "generative"
            ? "Sprachmodell bereit"
            : "Antworten aus den Unterlagen"}
        </Badge>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6 md:px-10">
        {turns.length === 0 ? (
          <EmptyChat
            ready={ready}
            asking={asking}
            onAsk={(question) => void submitFrom(question)}
          />
        ) : (
          <ol className="space-y-8">
            {turns.map((turn) => (
              <li key={turn.id} className="space-y-4">
                <div className="flex justify-end">
                  <p className="bg-primary text-primary-foreground max-w-[40rem] rounded-3xl rounded-br-lg px-4 py-3 text-[0.95rem] leading-7">
                    {turn.question}
                  </p>
                </div>
                {turn.pending ? (
                  <div className="bg-muted/50 max-w-[46rem] rounded-3xl rounded-bl-lg px-5 py-4">
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                      <LoaderCircleIcon className="size-4 animate-spin" />
                      Suche in den Unterlagen…
                    </p>
                  </div>
                ) : turn.error ? (
                  <div
                    className="border-destructive/30 bg-destructive/5 text-destructive max-w-[46rem] rounded-3xl px-5 py-4 text-sm leading-6"
                    role="alert"
                  >
                    {turn.error}
                  </div>
                ) : (
                  <AnswerCard turn={turn} />
                )}
              </li>
            ))}
          </ol>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="px-7 pb-6 pt-2 md:px-10"
        onSubmit={(event) => {
          event.preventDefault();
          void submitFrom(draft);
        }}
      >
        <div className="flex items-end gap-3">
          <Textarea
            name="question"
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
                ? "Frage stellen, z. B. Was bedeutet Fehler E12?"
                : "Zuerst Unterlagen laden…"
            }
            disabled={asking || !ready}
            aria-label="Frage"
            className="min-h-[76px] max-h-48 flex-1 resize-none rounded-2xl px-4 py-3 text-base"
          />
          <Button
            type="submit"
            size="icon-lg"
            className="mb-1 size-12 rounded-2xl"
            disabled={asking || !ready}
            aria-label="Frage senden"
          >
            {asking ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <ArrowUpIcon />
            )}
          </Button>
        </div>
        <p className="text-muted-foreground mt-3 text-xs leading-5">
          Eingabe sendet, Umschalt+Eingabe macht eine neue Zeile.
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
            ? "Frag, als würdest du im Ordner blättern"
            : "Lade zuerst deine Unterlagen"}
        </p>
        <p className="mt-3 text-[0.95rem] leading-7 text-muted-foreground">
          {ready
            ? "Eine normale Frage reicht. Die Antwort bleibt an der Quelle kleben."
            : "Wähle den Ordner mit Problembeschreibungen und Handbüchern. Danach reicht eine normale Frage."}
        </p>
      </div>
      {ready ? (
        <div className="flex flex-wrap gap-2.5">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              disabled={asking}
              className="hover:bg-muted rounded-full border px-4 py-2 text-left text-sm leading-6 transition-colors disabled:opacity-50"
              onClick={() => onAsk(example)}
            >
              {example}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AnswerCard({ turn }: { turn: ChatTurn }) {
  return (
    <article className="bg-muted/40 max-w-[46rem] rounded-3xl rounded-bl-lg px-5 py-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {turn.mode === "generative"
            ? "Formuliert mit Sprachmodell"
            : "Auszug aus den Unterlagen"}
        </Badge>
      </div>
      <p className="text-[1.02rem] leading-8 whitespace-pre-wrap">
        {turn.answer}
      </p>
      {turn.fallbackReason ? (
        <p className="text-muted-foreground mt-3 text-xs leading-5">
          {turn.fallbackReason}
        </p>
      ) : null}
      {turn.sources && turn.sources.length > 0 ? (
        <div className="mt-5 border-t border-border/70 pt-4">
          <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Quellen
          </p>
          <ol className="mt-3 space-y-3">
            {turn.sources.map((source, index) => (
              <SourceRow
                key={`${source.documentId}-${source.chunkIndex}`}
                source={source}
                index={index}
              />
            ))}
          </ol>
        </div>
      ) : null}
    </article>
  );
}

function SourceRow({ source, index }: { source: SourceHit; index: number }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <li className="bg-card/80 rounded-2xl px-4 py-3">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-4 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="text-sm leading-6 font-medium">
          {index + 1}. {source.fileName}
          <span className="text-muted-foreground font-normal">
            {" "}
            · Stelle {source.chunkIndex + 1}
          </span>
        </span>
        <span className="text-muted-foreground text-xs">
          {open ? "Passage schließen" : "Passage zeigen"}
        </span>
      </button>
      {open ? (
        <blockquote className="text-muted-foreground mt-2 border-l-2 border-primary/40 pl-3 text-sm leading-7">
          {source.passage}
        </blockquote>
      ) : null}
    </li>
  );
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
    fallbackReason: response.fallbackReason,
  };
}
