import { answerQuestion } from "@/lib/answer";
import { loadStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { question?: unknown };
    const question =
      typeof body.question === "string" ? body.question.trim() : "";

    if (!question) {
      return Response.json(
        { error: "Bitte eine Frage eingeben." },
        { status: 400 },
      );
    }

    const store = await loadStore();
    if (!store.chunks.length) {
      return Response.json(
        {
          error:
            "Es sind noch keine Dokumente indexiert. Lade zuerst Dateien hoch.",
        },
        { status: 400 },
      );
    }

    const result = await answerQuestion(store.chunks, question);
    return Response.json(result);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Die Suche ist fehlgeschlagen. Versuche es erneut." },
      { status: 500 },
    );
  }
}
