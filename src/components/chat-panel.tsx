"use client";

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
  documentCount: number;
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
  documentCount,
  answerMode,
  asking,
  onAsk,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, asking]);

  const submit = async () => {
    const question = draft.trim();
    if (!question || asking || documentCount === 0) return;
    setDraft("");
    await onAsk(question);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3 md:px-6">
        <div>
          <h2 className="font-heading text-lg">Fragen</h2>
          <p className="text-sm text-muted-foreground">
            {documentCount === 0
              ? "Sobald Dokumente indexiert sind, kannst du nach Fehlern, Schritten und Teilen fragen."
              : "Die Antwort zeigt die Datei und die Stelle, aus der sie stammt."}
          </p>
        </div>
        <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
          {answerMode === "generative"
            ? "Sprachmodell bereit"
            : "Antworten aus Dokumentstellen"}
        </Badge>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
        {turns.length === 0 ? (
          <EmptyChat documentCount={documentCount} onPick={setDraft} />
        ) : (
          <ol className="space-y-5">
            {turns.map((turn) => (
              <li key={turn.id} className="space-y-3">
                <div className="flex justify-end">
                  <p className="bg-primary text-primary-foreground max-w-[40rem] rounded-2xl rounded-br-md px-3.5 py-2 text-sm leading-6">
                    {turn.question}
                  </p>
                </div>
                {turn.pending ? (
                  <div className="bg-card ring-foreground/8 max-w-[46rem] rounded-2xl rounded-bl-md px-4 py-3 ring-1">
                    <p className="text-muted-foreground flex items-center gap-2 text-sm">
                      <LoaderCircleIcon className="size-4 animate-spin" />
                      Suche in den Dokumenten…
                    </p>
                  </div>
                ) : turn.error ? (
                  <div
                    className="border-destructive/30 bg-destructive/5 text-destructive max-w-[46rem] rounded-2xl px-4 py-3 text-sm"
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
        className="border-t px-3 py-3 md:px-6"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit();
              }
            }}
            placeholder={
              documentCount === 0
                ? "Zuerst Dokumente laden…"
                : "Frage stellen, z. B. Was bedeutet Fehler E12?"
            }
            disabled={asking || documentCount === 0}
            aria-label="Frage"
            className="min-h-[52px] max-h-40 flex-1 resize-none"
          />
          <Button
            type="submit"
            size="icon-lg"
            disabled={asking || documentCount === 0 || !draft.trim()}
            aria-label="Frage senden"
          >
            {asking ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <ArrowUpIcon />
            )}
          </Button>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          Eingabe sendet, Umschalt+Eingabe macht eine neue Zeile.
        </p>
      </form>
    </div>
  );
}

function EmptyChat({
  documentCount,
  onPick,
}: {
  documentCount: number;
  onPick: (value: string) => void;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-start gap-4 py-8">
      <div className="bg-primary/8 text-primary flex size-10 items-center justify-center rounded-2xl">
        <BookOpenIcon className="size-5" />
      </div>
      <div>
        <p className="font-heading text-xl">
          {documentCount === 0
            ? "Lade zuerst deine Unterlagen"
            : "Frag, als würdest du im Ordner blättern"}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {documentCount === 0
            ? "Word-Dateien, PDFs und Texte aus einem Ordner mit Problembeschreibungen und Handbüchern. Danach reicht eine normale Frage."
            : `${documentCount} ${documentCount === 1 ? "Datei ist" : "Dateien sind"} bereit. Die Antwort bleibt an der Quelle kleben.`}
        </p>
      </div>
      {documentCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              className="hover:bg-muted rounded-full border px-3 py-1.5 text-left text-sm transition-colors"
              onClick={() => onPick(example)}
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AnswerCard({ turn }: { turn: ChatTurn }) {
  return (
    <article className="bg-card ring-foreground/8 max-w-[46rem] rounded-2xl rounded-bl-md px-4 py-3 ring-1">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {turn.mode === "generative"
            ? "Formuliert mit Sprachmodell"
            : "Auszug aus den Dokumenten"}
        </Badge>
      </div>
      <p className="text-[0.95rem] leading-7 whitespace-pre-wrap">
        {turn.answer}
      </p>
      {turn.fallbackReason && (
        <p className="text-muted-foreground mt-2 text-xs">{turn.fallbackReason}</p>
      )}
      {turn.sources && turn.sources.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Quellen
          </p>
          <ol className="mt-2 space-y-2">
            {turn.sources.map((source, index) => (
              <SourceRow key={`${source.documentId}-${source.chunkIndex}`} source={source} index={index} />
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}

function SourceRow({ source, index }: { source: SourceHit; index: number }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <li className="bg-muted/60 rounded-xl px-3 py-2">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="text-sm font-medium">
          {index + 1}. {source.displayPath}
        </span>
        <span className="text-muted-foreground text-xs">
          Stelle {source.chunkIndex + 1}
        </span>
      </button>
      {open && (
        <blockquote className="text-muted-foreground mt-2 border-l-2 border-primary/40 pl-3 text-sm leading-6">
          {source.passage}
        </blockquote>
      )}
    </li>
  );
}

export function turnFromResponse(question: string, response: AskResponse): ChatTurn {
  return {
    id: crypto.randomUUID(),
    question,
    answer: response.answer,
    sources: response.sources,
    mode: response.mode,
    fallbackReason: response.fallbackReason,
  };
}
