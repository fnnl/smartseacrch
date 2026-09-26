const STOPWORDS = new Set([
  "aber",
  "als",
  "also",
  "am",
  "an",
  "and",
  "auch",
  "auf",
  "aus",
  "bei",
  "bin",
  "bis",
  "bist",
  "da",
  "dadurch",
  "daher",
  "darum",
  "das",
  "dass",
  "daß",
  "dein",
  "deine",
  "dem",
  "den",
  "der",
  "des",
  "dessen",
  "deshalb",
  "die",
  "dies",
  "dieser",
  "dieses",
  "doch",
  "dort",
  "du",
  "durch",
  "ein",
  "eine",
  "einem",
  "einen",
  "einer",
  "eines",
  "er",
  "es",
  "euer",
  "eure",
  "for",
  "fuer",
  "für",
  "hatte",
  "hatten",
  "hattest",
  "hattet",
  "hier",
  "hinter",
  "ich",
  "ihr",
  "ihre",
  "im",
  "in",
  "is",
  "ist",
  "ja",
  "jede",
  "jedem",
  "jeden",
  "jeder",
  "jedes",
  "jener",
  "jenes",
  "jetzt",
  "kann",
  "kannst",
  "kein",
  "keine",
  "können",
  "könnt",
  "machen",
  "mein",
  "meine",
  "mit",
  "muss",
  "musst",
  "nach",
  "nachdem",
  "nein",
  "nicht",
  "noch",
  "nun",
  "nur",
  "ob",
  "oder",
  "of",
  "ohne",
  "on",
  "seid",
  "sein",
  "seine",
  "sich",
  "sie",
  "sind",
  "soll",
  "sollen",
  "sollst",
  "sollt",
  "sonst",
  "soweit",
  "sowie",
  "the",
  "to",
  "und",
  "unser",
  "unsere",
  "unter",
  "vom",
  "von",
  "vor",
  "wann",
  "warum",
  "was",
  "weiter",
  "weitere",
  "wenn",
  "wer",
  "werde",
  "werden",
  "werdet",
  "weshalb",
  "wie",
  "wieder",
  "wieso",
  "wir",
  "wird",
  "wirst",
  "wo",
  "woher",
  "wohin",
  "zu",
  "zum",
  "zur",
  "über",
  "ueber",
]);

const STEM_SUFFIXES = [
  "ungen",
  "ung",
  "ischen",
  "ische",
  "isch",
  "lichen",
  "liche",
  "lich",
  "heiten",
  "heit",
  "keiten",
  "keit",
  "ern",
  "end",
  "est",
  "en",
  "er",
  "em",
  "es",
  "st",
  "te",
  "e",
  "n",
  "s",
];

export function foldDe(token: string): string {
  return token
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss");
}

export function stemDe(token: string): string {
  const word = foldDe(token);
  for (const suffix of STEM_SUFFIXES) {
    if (word.length - suffix.length >= 4 && word.endsWith(suffix)) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

export function tokenize(text: string): string[] {
  const parts = text.toLowerCase().normalize("NFC").split(/[^\p{L}\p{N}]+/u);
  const tokens: string[] = [];

  for (const raw of parts) {
    if (raw.length < 2) continue;
    const folded = foldDe(raw);
    if (STOPWORDS.has(raw) || STOPWORDS.has(folded)) continue;
    const stemmed = stemDe(folded);
    if (stemmed.length < 2 || STOPWORDS.has(stemmed)) continue;
    tokens.push(stemmed);
  }

  return tokens;
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter((part) => part.length > 0);
}
