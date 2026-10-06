# SmartSeacrch — erste Version

Fragen an Word-Dokumente stellen: Problembeschreibungen und Handbücher aus einem Ordner.

## Ziel

Ein **lokales Windows-Programm**, das Kolleginnen und Kollegen ohne Server weitergeben können. Dokumente bleiben auf dem Rechner. Antworten nennen die Quelle (Datei und Stelle). Keine Website, kein Dienst im Netz.

## Oberfläche

- Luftig, eine Spalte: Fragen; Verwaltung nur über «Verwaltung»
- Aktionen als klare Knöpfe (gefüllt oder umrandet, mit Beschriftung)
- Fragefeld unten als sichtbares Eingabefeld mit Platzhalter und Kontrast
- Fragefeld bleibt am unteren Fensterrand; Antworten scrollen nur darüber
- Neutrales helles Erscheinungsbild (Grau/Weiß, ein Navy-Akzent)
- Fenstergröße folgt dem Bildschirm; die Oberfläche füllt das Fenster
- Importierte Dateien in der normalen Suche **nicht** als Liste zeigen
- Quellen nur über passwortgeschützte Verwaltung hinzufügen/entfernen
- Erstes Öffnen der Verwaltung: Admin setzt das Passwort lokal (min. 8 Zeichen, zweimal). Hash liegt in `userData`, nicht im Repo
- Falsches Passwort: Anmeldung abgelehnt, keine Dateiaktionen
- Nach der Anmeldung: Ordner/Dateien wählen, Beispiel laden, einzelne Dateien entfernen, Unterlagen leeren
- Status nur «Bereit zum Fragen» / «Noch keine Unterlagen»
- Firmenlogo in der Verwaltung (PNG, JPG, SVG, WebP), lokal gespeichert
- Quellen als kleine Zahlen unten rechts an der Antwort; darüberfahren zeigt Datei, Stelle und Passage
- Klick auf die Zahl öffnet die gespeicherte Kopie (PDF auf der Seite, wenn bekannt; Word im Standardprogramm; Text mit markierter Stelle). Fehlt die Datei: klarer Fehler
- Chat wie eine Unterhaltung: mehrere Fragen zu denselben Unterlagen, «Neuer Chat» und Liste früherer Chats
- Chats bleiben lokal im Benutzerordner der App (Electron userData), ohne Server, überstehen Neustart
- Unterlagen: Kopien im Datenordner (`index.json` + `originals/`); Start liest den Index, Ordner nicht erneut wählen
- Bibliothek als ZIP exportieren/importieren; oder Ordner `SmartSeacrch-Daten` neben die portable .exe kopieren. Kein Server, kein Sync

## Erste Slice (steht)

- Electron-Desktop-App, kein gehostetes Web
- Ordner oder Dateien vom Rechner wählen (nativer Dialog) — **nur Verwaltung**
- Formate: `.docx`, `.pdf`, `.txt` / `.md`
- Texte zerlegen, lokal indexieren (BM25)
- Chat: mehrere Fragen in einer Unterhaltung, Liste früherer Chats, lokal gespeichert
- Ohne API-Key: Auszüge; optional LLM-Key
- Deutsch in der Oberfläche
- Index und Dateikopien im Benutzerordner der App (überstehen Neustart)
- Bibliothek ZIP-Export/Import und portabler Ordner `SmartSeacrch-Daten`
- Knopf «Beispiel laden» nur in der Verwaltung
- Quellen nur nach Admin-Passwort (scrypt, lokal, nicht im Repo)
- Windows-Weitergabe: NSIS-Installer (`SmartSeacrch-Setup-*.exe`) und portable `.exe` (`SmartSeacrch-Portable-*.exe`) per electron-builder
- Öffentliches Repo: https://github.com/fnnl/smartseacrch

## Windows-.exe (v0.1.1)

Kolleginnen und Kollegen brauchen **keinen Server** und **kein Node.js**.

- **Installer:** `SmartSeacrch-Setup-0.1.1.exe` — Setup, dann Startmenü / Desktop
- **Portable:** `SmartSeacrch-Portable-0.1.1.exe` — Datei kopieren, doppelklicken
- Download: https://github.com/fnnl/smartseacrch/releases/latest
- Selbst bauen: `CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:win` (Windows oder Linux+Wine)
- GitHub Actions (`.github/workflows/windows-release.yml`) baut auf `windows-latest` bei Tag `v*`
- Nicht code-signiert: unter Windows **Weitere Informationen** → **Trotzdem ausführen**
- Daten: installiert unter `%APPDATA%\smartseacrch\data\`; portable nutzt `SmartSeacrch-Daten` neben der .exe, wenn der Ordner existiert

## Stand (6. Okt. 2026)

- Windows-Paket v0.1.1 mit electron-builder (portable + NSIS), cross-compile Linux/Wine
- Dateien: `SmartSeacrch-Setup-0.1.1.exe`, `SmartSeacrch-Portable-0.1.1.exe` (~88 MB, PE32 NSIS)
- SHA-256 Setup `e3b3141930d742897d9d09de0be35ef42ce4245fb525ef01ff4d512521daa583`, Portable `344013430cffd7bd84a5982a1bcd3c65fcafb6601005f9eb4734ea587e6fe374`
- GitHub Release (Tag `v0.1.1`) oder direkt die gebauten Dateien neben `SHA256SUMS.txt`
- Beim Start kein erneutes Einlesen; Klick auf Quellen öffnet die gespeicherte Kopie
- Screenshots (Agent-Store): `media/library-persists-after-restart.png`, `media/library-data-folder.png`, `media/library-portable-daten.png`

## Danach

- Fester Ordner, der beim Start automatisch neu gelesen wird
- Weitere Formate und bessere Antworten
- Signiertes Windows-Paket (kein SmartScreen-Hinweis)
