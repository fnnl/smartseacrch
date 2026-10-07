import { readFile } from "node:fs/promises";
import path from "node:path";

import { answerQuestion } from "./answer";
import { extractChecklistSteps, matchCaseAgainstChecklists } from "./checklist";
import { extractDocumentText } from "./parse";
import { chunksForDocument } from "./chunk";
import type { Chunk, LibraryDocument } from "./types";

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

async function chunksFromFile(filePath: string): Promise<Chunk[]> {
  const bytes = await readFile(filePath);
  const parsed = await extractDocumentText(filePath, bytes);
  const document: LibraryDocument = {
    id: path.basename(filePath),
    fileName: path.basename(filePath),
    displayPath: filePath.replace(/^.*testdaten\//, "testdaten/"),
    format: parsed.format,
    size: bytes.byteLength,
    chunkCount: 0,
    uploadedAt: new Date().toISOString(),
  };
  return chunksForDocument(document, parsed.text, parsed.pages);
}

async function main(): Promise<void> {
  const root = path.join(process.cwd(), "testdaten");
  const chunks = (
    await Promise.all([
      chunksFromFile(path.join(root, "checklisten/Kurzcheckliste-Stoerungen.pdf")),
      chunksFromFile(path.join(root, "checklisten/Wartungsintervalle.pdf")),
      chunksFromFile(path.join(root, "probleme/Problembeschreibung-E12-Wassertank.txt")),
      chunksFromFile(path.join(root, "probleme/Problembeschreibung-E18-Tropfschale.txt")),
    ])
  ).flat();

  const steps = extractChecklistSteps(chunks);
  assert(steps.some((step) => /filter/i.test(step.text)), "checklist has filter step");
  assert(steps.some((step) => /E12/i.test(step.heading) || step.errors.includes("E-12")), "E12 section");

  const caseText = await readFile(
    path.join(root, "probleme/Problembeschreibung-E12-Wassertank.txt"),
    "utf8",
  );
  const analysis = matchCaseAgainstChecklists(chunks, caseText);
  assert(analysis.errors.includes("E-12"), "case errors");
  assert(analysis.models.includes("KV-400"), "case model");
  const all = analysis.matches.flatMap((match) => [
    ...match.done,
    ...match.checkedOpen,
    ...match.missing,
  ]);
  const filterStep = all.find((item) => /filter|wf-400/i.test(item.step.text));
  assert(filterStep, "filter step matched");
  assert(
    filterStep && filterStep.status !== "done",
    `filter should be open, got ${filterStep?.status}`,
  );
  const tankOrFloat = all.find((item) => /tank|schwimmer/i.test(item.step.text));
  assert(tankOrFloat, "tank/float step");
  assert(
    tankOrFloat && tankOrFloat.status !== "missing",
    `tank/float mentioned, got ${tankOrFloat?.status}`,
  );

  const first = await answerQuestion(chunks, "Was bedeutet Fehler E12?");
  assert(first.kind === "search", `first kind ${first.kind}`);
  assert(/E12|Wassertank|Filter/i.test(first.answer), `first answer ${first.answer.slice(0, 180)}`);
  assert(first.sources.length > 0, "first sources");

  const follow = await answerQuestion(chunks, "und beim KV-800?", [
    { question: "Was bedeutet Fehler E12?", answer: first.answer },
  ]);
  assert(follow.kind === "followup", `follow kind ${follow.kind}`);
  assert(
    /nicht als Schritt für KV-800|KV-800/i.test(follow.answer),
    `follow answer ${follow.answer.slice(0, 240)}`,
  );
  assert(/E12|E-12/i.test(follow.answer), "follow still names E12");
  assert(/E12|E-12/i.test(follow.answer) || follow.sources.some((hit) => /E12|KV-800|E18/i.test(hit.passage)), "follow keeps topic");

  const caseAnswer = await answerQuestion(chunks, caseText);
  assert(caseAnswer.kind === "checklist", `case kind ${caseAnswer.kind}`);
  assert(/Fallprüfung|Checkliste/i.test(caseAnswer.answer), "case heading");
  assert(/offen|nicht in der Meldung|Filter/i.test(caseAnswer.answer), "case open steps");
  assert(
    caseAnswer.sources.some((hit) => /checkliste|kurzcheck/i.test(hit.fileName)),
    `case sources ${caseAnswer.sources.map((hit) => hit.fileName).join(",")}`,
  );

  console.log("checklist ok");
}

void main();
