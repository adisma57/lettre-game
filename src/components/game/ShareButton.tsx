import { useState, useRef, useEffect } from "react";
import { buildShareText, type ShareInput } from "../../services/share";
import { Button } from "../ui/Button";

const COPIED_LABEL_MS = 2000;

export function ShareButton({ input }: { input: ShareInput }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  async function handleClick() {
    const text = buildShareText(input);

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // The user cancelled the native share sheet (or it failed) — that is
        // not an error state. Fall through to the clipboard so the action
        // still does something useful.
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), COPIED_LABEL_MS);
    } catch {
      // Clipboard access denied — silently do nothing rather than show an
      // error state for what is, at worst, a missing convenience.
    }
  }

  return (
    <Button variant="secondary" onClick={() => void handleClick()}>
      {copied ? "Copié !" : "Partager"}
    </Button>
  );
}
