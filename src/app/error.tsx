"use client";

import { Button } from "@/components/ui/button";

export default function ErrorView({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-3 px-6">
      <h1 className="font-heading text-2xl">Etwas ist schiefgelaufen</h1>
      <p className="text-sm leading-6 text-muted-foreground">
        Die Oberfläche konnte nicht aufgebaut werden. Lade die Seite neu oder
        versuche es noch einmal.
      </p>
      <Button type="button" onClick={() => reset()}>
        Erneut versuchen
      </Button>
    </div>
  );
}
