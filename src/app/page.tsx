import { SearchApp } from "@/components/search-app";
import { configuredAnswerMode, loadStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const store = await loadStore();

  return (
    <SearchApp
      initialDocuments={store.documents}
      initialChunkCount={store.chunks.length}
      initialAnswerMode={configuredAnswerMode()}
    />
  );
}
