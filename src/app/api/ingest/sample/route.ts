import { ingestIncomingFiles } from "@/lib/ingest";
import { buildSampleFiles } from "@/lib/sample-docs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const samples = await buildSampleFiles();
    const result = await ingestIncomingFiles(
      samples.map((file) => ({
        name: file.name,
        displayPath: file.name,
        size: file.bytes.byteLength,
        bytes: file.bytes,
      })),
    );
    return Response.json(result);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Das Beispiel-Handbuch konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}
