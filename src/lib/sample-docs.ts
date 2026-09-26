import JSZip from "jszip";

export type SampleFile = {
  name: string;
  bytes: Uint8Array;
};

const HANDBUCH_PARAS = [
  "Wartungshandbuch Kaffeevollautomat KV-400",
  "Dieses Handbuch beschreibt die regelmäßige Wartung und die häufigsten Eingriffe am Kaffeevollautomaten KV-400. Es richtet sich an den Betrieb und an den technischen Dienst.",
  "Wasserfilter wechseln",
  "Der Wasserfilter sitzt im Wassertank. Ein verbrauchter Filter führt zu Kalkablagerungen, flauem Geschmack und kann die Fehlermeldung E12 auslösen.",
  "So wechseln Sie den Filter: Gerät ausschalten. Wassertank abnehmen und restliches Wasser ausgießen. Den alten Filter nach oben herausziehen. Den neuen Filter zwei Minuten in kaltem Wasser wässern. Filter fest in die Halterung im Tank drücken, bis er einrastet. Tank mit frischem Wasser füllen und einsetzen. Anschließend das Programm Filterwechsel im Menü Service bestätigen.",
  "Wechselintervall: alle 8 Wochen oder nach 60 Litern, je nachdem was zuerst eintritt. In Gegenden mit hartem Wasser (über 14 °dH) alle 6 Wochen wechseln.",
  "Entkalken",
  "Das Gerät fordert zum Entkalken auf, sobald der interne Zähler 90 Liter erreicht hat. Verwenden Sie nur das Entkalkungsmittel KV-Entkalk. Füllen Sie 500 ml Entkalkerlösung in den leeren Tank. Starten Sie Programm Entkalken. Der Vorgang dauert etwa 25 Minuten. Spülen Sie danach zweimal mit klarem Wasser nach.",
  "Brüheinheit reinigen",
  "Nehmen Sie die Brüheinheit wöchentlich nach links heraus. Spülen Sie sie nur mit handwarmem Wasser, niemals im Geschirrspüler. Tropfnass wieder einsetzen, bis sie hörbar einrastet.",
  "Wenn nach dem Filterwechsel weiterhin E12 erscheint, prüfen Sie die Schwimmerklappe im Tank und die Zuleitung zur Pumpe. Erst danach den technischen Dienst rufen.",
];

const PROBLEM_E12 = `Problembeschreibung: Display zeigt E12

Anlage: Kaffeevollautomat KV-400, Standort Küche 2
Datum: 12. März 2026
Gemeldet von: Schichtleitung Frühdienst

Sachverhalt
Das Gerät bricht den Bezug ab und zeigt dauerhaft E12 / Wassertank. Der Tank ist sichtbar gefüllt. Nach dem Abnehmen und Wiedereinsetzen bleibt die Meldung bestehen. Der letzte Filterwechsel liegt nach Aktenlage acht Monate zurück.

Bisherige Schritte
1. Tank entnommen, Dichtung optisch geprüft, keine Risse sichtbar.
2. Schwimmerklappe bewegt sich schwergängig und bleibt oben hängen.
3. Gerät neu gestartet. E12 kommt nach etwa 20 Sekunden wieder.
4. Technischer Dienst noch nicht verständigt.

Verdacht
Der überfällige Wasserfilter und die klemmende Schwimmerklappe täuschen einen leeren Tank vor. Laut Handbuch kann E12 durch einen verbrauchten Filter, eine blockierte Schwimmerklappe oder eine undichte Zuleitung zur Pumpe ausgelöst werden.

Nächster Schritt
Filter tauschen, Schwimmerklappe gängig machen, Programm Filterwechsel bestätigen. Wenn E12 danach bleibt, Pumpenzuleitung prüfen und technischen Dienst rufen.
`;

const CHECKLISTE = [
  "Kurzcheckliste Stoerungen KV-400",
  "",
  "E12 Wassertank:",
  "- Tank sitzt fest und ist gefuellt.",
  "- Schwimmerklappe muss frei schwingen.",
  "- Wasserfilter nicht aelter als 8 Wochen.",
  "- Programm Filterwechsel im Menue Service bestaetigen.",
  "",
  "E07 Mahlwerk:",
  "- Bohnenbehaelter oeffnen und auf Fremdkoerper pruefen.",
  "- Mahlgrad eine Stufe groeber stellen und erneut mahlen.",
  "",
  "E21 Brueheinheit:",
  "- Brueheinheit entnehmen, mit handwarmem Wasser spuelen, einrasten.",
  "- Nicht in die Spuelmaschine geben.",
];

export async function buildSampleFiles(): Promise<SampleFile[]> {
  const handbook = await buildDocx(HANDBUCH_PARAS);
  const problem = new TextEncoder().encode(PROBLEM_E12);
  const checklist = buildSimplePdf(CHECKLISTE);

  return [
    { name: "Handbuch/Wartungshandbuch-KV-400.docx", bytes: handbook },
    { name: "Probleme/Problembeschreibung-E12.txt", bytes: problem },
    { name: "Handbuch/Kurzcheckliste-Stoerungen.pdf", bytes: checklist },
  ];
}

async function buildDocx(paragraphs: string[]): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`,
  );

  const body = paragraphs
    .map((paragraph) => {
      const xml = escapeXml(paragraph);
      return `<w:p><w:r><w:t xml:space="preserve">${xml}</w:t></w:r></w:p>`;
    })
    .join("");

  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}<w:sectPr/></w:body>
</w:document>`,
  );

  const buffer = await zip.generateAsync({ type: "uint8array" });
  return buffer;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildSimplePdf(lines: string[]): Uint8Array {
  const commands = lines
    .map((line, index) => {
      const y = 800 - index * 16;
      const safe = line
        .replaceAll("\\", "\\\\")
        .replaceAll("(", "\\(")
        .replaceAll(")", "\\)");
      return `BT /F1 11 Tf 50 ${y} Td (${safe}) Tj ET`;
    })
    .join("\n");

  const stream = commands;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
    `4 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj\n`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
  ];

  let offset = 0;
  const header = "%PDF-1.4\n";
  offset = Buffer.byteLength(header);
  const xrefEntries = ["0000000000 65535 f \n"];
  let body = "";
  for (const object of objects) {
    xrefEntries.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
    body += object;
    offset += Buffer.byteLength(object);
  }

  const xrefOffset = offset;
  const xref = `xref\n0 ${objects.length + 1}\n${xrefEntries.join("")}`;
  const trailer = `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(header + body + xref + trailer);
}
