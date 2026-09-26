import { SearchApp } from "@/components/search-app";
import { answerQuestion } from "@/lib/answer";
import { configuredAnswerMode, loadStore } from "@/lib/store";
import type { AskResponse } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home({ searchParams }: PageProps<"/">) {
  const store = await loadStore();
  const params = await searchParams;
  const raw = params.question;
  const question = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";

  let initialAnswer: AskResponse | null = null;
  if (question && store.chunks.length) {
    initialAnswer = await answerQuestion(store.chunks, question);
  }

  return (
    <SearchApp
      initialDocuments={store.documents}
      initialChunkCount={store.chunks.length}
      initialAnswerMode={configuredAnswerMode()}
      initialQuestion={question}
      initialAnswer={initialAnswer}
    />
  );
}
