import { useState } from "react";
import { createUser, recoverAccount } from "../services/api";
import { Button } from "./ui/Button";

interface UsernameModalProps {
  onSuccess: (username: string) => void;
}

const RULES = "2–20 caractères, lettres, chiffres, _ ou -";

type Stage = "input" | "show-code" | "recover";

export function UsernameModal({ onSuccess }: UsernameModalProps) {
  const [stage, setStage] = useState<Stage>("input");
  const [value, setValue] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedUsername, setSavedUsername] = useState("");

  const trimmed = value.trim();
  const isValidUsername =
    trimmed.length >= 2 &&
    trimmed.length <= 20 &&
    /^[A-Za-z0-9_-]+$/.test(trimmed);

  async function handleCreate() {
    if (!isValidUsername || loading) return;
    setLoading(true);
    setError(null);

    const result = await createUser(trimmed);
    setLoading(false);

    if (result.ok) {
      setSavedUsername(result.username);
      setRecoveryCode(result.recoveryCode);
      setStage("show-code");
    } else {
      setError(result.error);
    }
  }

  async function handleRecover() {
    if (!codeInput.trim() || loading) return;
    setLoading(true);
    setError(null);

    const result = await recoverAccount(codeInput.trim());
    setLoading(false);

    if (result.ok) {
      onSuccess(result.username);
    } else {
      setError(result.error);
    }
  }

  function formatCode(code: string): string {
    return code.replace(/(.{4})/g, "$1-").replace(/-$/, "");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-xl">

        {stage === "input" && (
          <>
            <h2 className="text-xl font-bold text-fg">Choisissez un pseudo</h2>
            <p className="mt-1 text-sm text-muted">{RULES}</p>

            <input
              type="text"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
              placeholder="MonPseudo"
              maxLength={20}
              autoFocus
              className="mt-6 w-full rounded-lg border-2 border-line bg-elevated px-4 py-2 text-fg outline-none placeholder:text-muted focus:border-primary"
            />

            {error && <p className="mt-2 text-sm text-error">{error}</p>}

            <Button
              onClick={handleCreate}
              disabled={!isValidUsername || loading}
              className="mt-4 w-full justify-center"
            >
              {loading ? "…" : "Commencer"}
            </Button>

            <button
              onClick={() => { setStage("recover"); setError(null); }}
              className="mt-3 w-full text-center text-sm text-muted hover:text-fg transition-colors"
            >
              J'ai déjà un code de récupération
            </button>
          </>
        )}

        {stage === "show-code" && (
          <>
            <h2 className="text-xl font-bold text-fg">Bienvenue, {savedUsername} !</h2>
            <p className="mt-2 text-sm text-muted">
              Notez votre code de récupération. Il vous permettra de retrouver votre compte si vous perdez l'accès.
            </p>

            <div className="mt-5 rounded-xl border-2 border-primary bg-elevated px-4 py-3 text-center">
              <p className="text-xs text-muted mb-1">Code de récupération</p>
              <p className="font-mono text-xl font-bold tracking-widest text-primary">
                {formatCode(recoveryCode)}
              </p>
            </div>

            <p className="mt-3 text-xs text-muted text-center">
              Ce code ne sera plus affiché.
            </p>

            <Button
              onClick={() => onSuccess(savedUsername)}
              className="mt-5 w-full justify-center"
            >
              J'ai noté mon code
            </Button>
          </>
        )}

        {stage === "recover" && (
          <>
            <h2 className="text-xl font-bold text-fg">Récupérer mon compte</h2>
            <p className="mt-1 text-sm text-muted">
              Entrez votre code de récupération pour retrouver votre pseudo.
            </p>

            <input
              type="text"
              value={codeInput}
              onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleRecover(); }}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              maxLength={19}
              autoFocus
              className="mt-6 w-full rounded-lg border-2 border-line bg-elevated px-4 py-2 font-mono text-fg outline-none placeholder:text-muted focus:border-primary"
            />

            {error && <p className="mt-2 text-sm text-error">{error}</p>}

            <Button
              onClick={handleRecover}
              disabled={!codeInput.trim() || loading}
              className="mt-4 w-full justify-center"
            >
              {loading ? "…" : "Récupérer"}
            </Button>

            <button
              onClick={() => { setStage("input"); setError(null); setCodeInput(""); }}
              className="mt-3 w-full text-center text-sm text-muted hover:text-fg transition-colors"
            >
              ← Retour
            </button>
          </>
        )}
      </div>
    </div>
  );
}
