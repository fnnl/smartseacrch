# SmartSeacrch

Lokales Programm für Fragen an Handbücher und Problembeschreibungen. Kein Webserver, kein Upload in die Cloud: jede Person startet die App auf ihrem Rechner und wählt den Ordner mit den Word-Dateien.

Repository: https://github.com/fnnl/smartseacrch

## Für Kolleginnen und Kollegen

1. Node.js 22 oder neuer installieren: https://nodejs.org
2. Dieses Verzeichnis öffnen
3. Im Terminal:

```bash
npm install
npm start
```

Oder ein Installationspaket bauen und weitergeben:

```bash
npm install
npm run dist
```

Die Dateien liegen danach in `release/`:

- Windows: Installer (NSIS) oder portable `.exe`
- macOS: `.dmg`
- Linux: `.AppImage`

Das Paket muss auf dem jeweiligen Betriebssystem gebaut werden (Windows-Installer auf einem Windows-Rechner).

## Bedienung

1. **Ordner** oder **Dateien** wählen — Word (`.docx`), PDF, Text
2. Eine Frage stellen, z. B. «Was bedeutet Fehler E12?»
3. Die Antwort nennt Datei und Stelle

«Beispiel laden» legt ein kurzes KV-400-Handbuch in den Index, zum Ausprobieren.

Der Index bleibt auf diesem Computer (im Benutzerordner der App).

Ohne API-Key: Antworten sind Auszüge aus den Dokumenten. Optional `OPENAI_API_KEY` oder `ANTHROPIC_API_KEY` in der Umgebung, dann formuliert ein Sprachmodell.

## Entwicklung

```bash
npm install
npm run dev
```
