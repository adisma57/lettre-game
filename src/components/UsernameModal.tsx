import { useState } from "react";
import { createUser } from "../services/api";
import { Button } from "./ui/Button";

interface UsernameModalProps {
  onSuccess: (username: string) => void;
}

const RULES = "2–20 caractères, lettres, chiffres, _ ou -";

export function UsernameModal({ onSuccess }: UsernameModalProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const trimmed = value.trim();
  const isValid = trimmed.length >= 2 && trimmed.length <= 20 && /^[A-Za-z0-9_-]+$/.test(trimmed);

  async function handleSubmit() {
    if (!isValid || loading) return;
    setLoading(true);
    setError(null);

    const result = await createUser(trimmed);
    setLoading(false);

    if (result.ok) {
      onSuccess(result.username);
    } else {
      setError(result.error);
    }
  }

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-xl">

        <h2 className="text-xl font-bold text-fg">Choisissez un pseudo</h2>
        <p className="mt-1 text-sm text-muted">{RULES}</p>

        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="MonPseudo"
          maxLength={20}
          autoFocus
          className="mt-6 w-full rounded-lg border-2 border-line bg-elevated px-4 py-2 text-fg outline-none placeholder:text-muted focus:border-primary"
        />

        {error && <p className="mt-2 text-sm text-error">{error}</p>}

        <Button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="mt-4 w-full justify-center"
        >
          {loading ? "…" : "Commencer"}
        </Button>
      </div>
    </div>
  );
}
