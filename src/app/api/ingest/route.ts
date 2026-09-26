import { ingestIncomingFiles, type IncomingFile } from "@/lib/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files");
    const paths = formData.getAll("paths").map((value) => String(value));

    const incoming: IncomingFile[] = [];

    for (const [index, entry] of files.entries()) {
      if (!(entry instanceof File)) continue;
      const bytes = new Uint8Array(await entry.arrayBuffer());
      const displayPath = paths[index] || entry.name;
      incoming.push({
        name: entry.name,
        displayPath,
        size: entry.size,
        bytes,
      });
    }

    if (!incoming.length) {
      return Response.json(
        { error: "Es wurden keine Dateien mitgeschickt." },
        { status: 400 },
      );
    }

    const result = await ingestIncomingFiles(incoming);
    return Response.json(result);
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Die Dateien konnten nicht indexiert werden." },
      { status: 500 },
    );
  }
}
