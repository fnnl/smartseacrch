# SmartSeacrch

Lokales Windows-Programm für Fragen an Handbücher und Problembeschreibungen. Kein Webserver, kein Upload: jede Person startet die App auf ihrem PC.

Repository: https://github.com/fnnl/smartseacrch

## Für Kolleginnen und Kollegen (Windows)

Fertige Dateien: https://github.com/fnnl/smartseacrch/releases/latest  
Aktuell: **v0.1.1** (`SmartSeacrch-Setup-0.1.1.exe` und `SmartSeacrch-Portable-0.1.1.exe`).

1. Eine Datei herunterladen:
   - **SmartSeacrch-Setup-0.1.1.exe** — Installation (Verknüpfung im Startmenü und auf dem Desktop). Danach **SmartSeacrch** aus dem Startmenü öffnen.
   - **SmartSeacrch-Portable-0.1.1.exe** — nur diese eine Datei kopieren (USB-Stick oder Ordner). **Doppelklicken**, nicht installieren. Optional den Ordner `SmartSeacrch-Daten` daneben legen, dann bleiben Index und Dateikopien beim Stick.
2. Erscheint eine Windows-Warnung («Windows hat den Computer geschützt» / unbekannter Herausgeber): **Weitere Informationen** → **Trotzdem ausführen**. Die Datei ist nicht code-signiert.
3. Unten eine Frage eintippen. Unterlagen legt die **Verwaltung** an (nicht jede Person).

SHA-256 steht in `SHA256SUMS.txt` neben den Dateien (GitHub Release und Build-Ausgabe). Nach dem lokalen Paketieren hier eintragen.

Node.js, Internet und ein Server sind nicht nötig. Der Index und Kopien der Dateien bleiben auf diesem PC.

## Bedienung (Suche)

1. Links **Neuer Chat** oder einen früheren Chat wählen. Die Unterhaltungen bleiben auf diesem Rechner (Benutzerordner der App), ohne Server.
2. Unten ins Feld **Deine Frage** schreiben, z. B. «Was bedeutet Fehler E12?», dann **Frage senden**. Weitere Fragen gehören zu demselben Chat und denselben Unterlagen.
3. Quellen stehen als kleine Zahlen unten rechts an der Antwort. Darüberfahren zeigt Datei, Stelle und Passage. **Klicken** öffnet die Originaldatei: PDF möglichst auf der Seite, Word im Standardprogramm, Text mit markierter Stelle. Fehlt die Datei, erscheint ein klarer Hinweis.

## Verwaltung (Quellen)

Unterlagen (Word, PDF, Text) legt nur die Verwaltung an. Oben rechts **Verwaltung**:

1. Beim ersten Mal ein Passwort setzen (mindestens 8 Zeichen, zweimal eingeben). Es bleibt nur auf diesem Rechner, nicht im Programmcode.
2. Später mit diesem Passwort anmelden. Falsches Passwort wird abgelehnt.
3. Nach der Anmeldung: **Ordner wählen**, **Dateien wählen**, **Beispiel laden**, einzelne Dateien **Entfernen** oder **Unterlagen leeren**. Die Dateien werden ins Datenverzeichnis **kopiert**; beim nächsten Start nicht erneut einlesen.
4. **Bibliothek exportieren** (ZIP) oder **Datenordner kopieren**, um die Unterlagen auf einen anderen Rechner zu nehmen — ohne Server.

## Wo die Dateien liegen

Beim Einlesen legt SmartSeacrch Kopien neben den Index:

- Installiert unter Windows: `%APPDATA%\smartseacrch\data\` (darin `index.json` und Ordner `originals\`)
- Portable .exe: Ordner **SmartSeacrch-Daten** neben der .exe (wird automatisch genutzt, wenn er existiert)
- Entwicklung: Benutzerordner der Electron-App, Unterordner `data`

Ein Klick auf eine Quellen-Zahl öffnet die **gespeicherte Kopie**, nicht den ursprünglichen Ordner.

## Auf einen anderen Rechner (kein Server)

1. **ZIP:** In der Verwaltung **Bibliothek exportieren**. Auf dem anderen PC SmartSeacrch starten, Verwaltung, **Bibliothek importieren**.
2. **Ordner mitkopieren:** **Datenordner kopieren** wählt ein Ziel und legt `SmartSeacrch-Daten` an. Diesen Ordner neben `SmartSeacrch-Portable.exe` legen. Oder den angezeigten Datenordner per USB selbst kopieren.

Kein Konto, kein Upload, kein Abgleich über das Netz.

Ohne API-Key: Antworten sind Auszüge aus den Dokumenten. Optional `OPENAI_API_KEY` oder `ANTHROPIC_API_KEY` in der Umgebung, dann formuliert ein Sprachmodell.

## Windows-Paket selbst bauen

Auf einem Windows-Rechner (empfohlen) oder unter Linux mit Wine:

```bash
npm install
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:win
```

Danach liegen die Dateien in `release/`:

- `SmartSeacrch-Setup-0.1.1.exe` — NSIS-Installer
- `SmartSeacrch-Portable-0.1.1.exe` — portable Einzeldatei

Ein Git-Tag `v0.1.1` (Muster `v*`) startet GitHub Actions auf `windows-latest` und legt die Dateien unter [Releases](https://github.com/fnnl/smartseacrch/releases) ab.

## Testdaten

Im Ordner `testdaten/` liegen fiktive Handbücher und Problembeschreibungen (Nordlicht KV-400 / KV-800), nur zum Ausprobieren der Suche. Über **Verwaltung** den Ordner indexieren.

## Entwicklung

```bash
npm install
npm run dev
```
