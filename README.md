# SmartSeacrch

Fragen an Word-Dokumente, PDFs und Texte: Problembeschreibungen und Handbücher aus einem Ordner hochladen, dann in natürlicher Sprache fragen. Jede Antwort nennt die Quelle — Datei und Stelle.

Ohne API-Key nutzbar: die App findet passende Passagen und setzt daraus eine Antwort zusammen. Liegt `OPENAI_API_KEY` oder `ANTHROPIC_API_KEY` an, formuliert ein Sprachmodell die Antwort; die Quellen bleiben dieselben.

## Lokal starten

```bash
npm install
npm run dev
```

Die Oberfläche läuft auf [http://127.0.0.1:43217](http://127.0.0.1:43217).

Optional eine `.env.local` nach `.env.example` anlegen. Ohne Key startet die App trotzdem.

## Bedienung

1. **Dateien** oder einen **Ordner** wählen — der Browser erlaubt die Ordnerwahl, soweit er `webkitdirectory` unterstützt. Drag-and-drop eines Ordners geht ebenfalls.
2. Unterstützt: `.docx` (Word), `.pdf`, `.txt` / `.md`.
3. Eine Frage stellen, zum Beispiel „Was bedeutet Fehler E12?“.
4. Unter der Antwort die Quellen aufklappen.

„Beispiel laden“ legt ein kurzes KV-400-Handbuch plus eine Problembeschreibung in den Index, damit sich die Suche sofort ausprobieren lässt.

Der Index liegt lokal in `.data/index.json` und überlebt einen Neustart. „Bibliothek leeren“ entfernt ihn.

## Technik

Next.js (App Router), TypeScript, Tailwind, shadcn/ui. Texte werden zerlegt und mit BM25 durchsucht. Parse: Mammoth für Word, unpdf für PDF.
