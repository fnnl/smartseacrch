import {
  clearStore,
  configuredAnswerMode,
  loadStore,
  removeDocument,
} from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const store = await loadStore();
  return Response.json({
    documents: store.documents,
    chunkCount: store.chunks.length,
    answerMode: configuredAnswerMode(),
  });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const store = id ? await removeDocument(id) : await clearStore();
  return Response.json({
    documents: store.documents,
    chunkCount: store.chunks.length,
    answerMode: configuredAnswerMode(),
  });
}
