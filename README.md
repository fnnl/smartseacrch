# SmartSeacrch

Lokales Windows-Programm für Fragen an Handbücher und Problembeschreibungen. Kein Webserver, kein Upload: jede Person startet die App auf ihrem PC.

Repository: https://github.com/fnnl/smartseacrch

## Für Kolleginnen und Kollegen (Windows)

Fertige Dateien: https://github.com/fnnl/smartseacrch/releases/latest

1. Eine Datei herunterladen:
   - **SmartSeacrch-Setup-0.1.0.exe** — Installation mit Verknüpfung im Startmenü und auf dem Desktop
   - **SmartSeacrch-Portable-0.1.0.exe** — eine Datei kopieren, nicht installieren (USB-Stick oder Ordner)
2. Doppelklicken. Erscheint eine Windows-Warnung («Unbekannter Herausgeber»): **Weitere Informationen** → **Trotzdem ausführen**
3. Unten eine Frage eintippen. Unterlagen legt die **Verwaltung** an (nicht jede Person).

SHA-256 (v0.1.0):

```
45826c16ababb426e3c82574150785ea9b5b1ec81ee484959df7592d3823dd1a  SmartSeacrch-Setup-0.1.0.exe
791462607737f0119b4d7f9acf9af9f8c994b100cd73e470d6bb2f3a637ba03f  SmartSeacrch-Portable-0.1.0.exe
```

Node.js, Internet und ein Server sind nicht nötig. Der Index bleibt auf diesem PC.

## Bedienung (Suche)

1. Links **Neuer Chat** oder einen früheren Chat wählen. Die Unterhaltungen bleiben auf diesem Rechner (Benutzerordner der App), ohne Server.
2. Unten ins Feld **Deine Frage** schreiben, z. B. «Was bedeutet Fehler E12?», dann **Frage senden**. Weitere Fragen gehören zu demselben Chat und denselben Unterlagen.
3. Quellen stehen als kleine Zahlen unten rechts an der Antwort. Darüberfahren zeigt Datei, Stelle und Passage.

## Verwaltung (Quellen)

Unterlagen (Word, PDF, Text) legt nur die Verwaltung an. Oben rechts **Verwaltung**:

1. Beim ersten Mal ein Passwort setzen (mindestens 8 Zeichen, zweimal eingeben). Es bleibt nur auf diesem Rechner, nicht im Programmcode.
2. Später mit diesem Passwort anmelden. Falsches Passwort wird abgelehnt.
3. Nach der Anmeldung: **Ordner wählen**, **Dateien wählen**, **Beispiel laden**, einzelne Dateien **Entfernen** oder **Unterlagen leeren**.

Ohne API-Key: Antworten sind Auszüge aus den Dokumenten. Optional `OPENAI_API_KEY` oder `ANTHROPIC_API_KEY` in der Umgebung, dann formuliert ein Sprachmodell.

## Windows-Paket selbst bauen

Auf einem Windows-Rechner oder per GitHub Actions:

```bash
npm install
npm run dist:win
```

Danach liegen die Dateien in `release/`:

- `SmartSeacrch-Setup-0.1.0.exe`
- `SmartSeacrch-Portable-0.1.0.exe`

Ein Tag `v0.1.0` löst den Windows-Build aus und legt die Dateien unter Releases ab.

## Testdaten

Im Ordner `testdaten/` liegen fiktive Handbücher und Problembeschreibungen (Nordlicht KV-400 / KV-800), nur zum Ausprobieren der Suche. Über **Verwaltung** den Ordner indexieren.

## Entwicklung

```bash
npm install
npm run dev
```
