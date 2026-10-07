import {
  carriedAnchorSummary,
  expandSearchQuery,
  extractAnchors,
  isFollowUp,
  looksLikeCase,
} from "./conversation";

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

function main(): void {
  assert(extractAnchors("Fehler E12 am KV-400, Filter WF-400").join(",") === "KV-400,E-12,WF-400", "anchors");

  const prior = [
    {
      question: "Was bedeutet Fehler E12?",
      answer: "E12 Wassertank am KV-400: Tank, Schwimmerklappe, Filter prüfen.",
    },
  ];
  assert(isFollowUp("und beim KV-800?", prior), "follow-up prefix");
  assert(!isFollowUp("Was bedeutet Fehler E18?", prior), "new error is not follow-up");
  assert(!looksLikeCase("Was bedeutet Fehler E12?"), "short question is not a case");

  const expanded = expandSearchQuery("und beim KV-800?", prior);
  assert(/E-?12/i.test(expanded), `carry E12 in ${expanded}`);
  assert(/KV-800/i.test(expanded), `keep KV-800 in ${expanded}`);
  assert(!/KV-400/i.test(expanded), `drop old model in ${expanded}`);
  const carried = carriedAnchorSummary("und beim KV-800?", prior);
  assert(carried.some((item) => /^E-12$/i.test(item)), `carried ${carried.join(",")}`);

  const caseText = `Problembeschreibung: Display zeigt E12
Anlage: Kaffeevollautomat KV-400
Sachverhalt
Tank ist gefüllt. Filterwechsel acht Monate zurück. Schwimmerklappe klemmt.
Bisherige Schritte
1. Tank entnommen.
`;
  assert(looksLikeCase(caseText), "pasted case");
  assert(
    looksLikeCase(
      "Fall: KV-400 zeigt E12, Tank ist voll, Filter seit 8 Monaten nicht gewechselt, Schwimmerklappe klemmt.",
    ),
    "compact case",
  );

  console.log("conversation ok");
}

main();
