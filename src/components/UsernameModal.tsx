import { useState } from "react";
import { createUser, recoverUser } from "../services/api";
import { Button } from "./ui/Button";

interface UsernameModalProps {
  onSuccess: (username: string) => void;
}

type Mode =
  | { kind: "choose" }
  | { kind: "create" }
  | { kind: "show-code"; username: string; recoveryCode: string }
  | { kind: "recover" };

const USERNAME_RULES = "2–20 caractères, lettres, chiffres, _ ou -";
const USERNAME_RE = /^[A-Za-z0-9_-]+$/;

export function UsernameModal({ onSuccess }: UsernameModalProps) {
  const [mode, setMode] = useState<Mode>({ kind: "choose" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-xl">
        {mode.kind === "choose" && (
          <ChooseScreen
            onCreate={() => setMode({ kind: "create" })}
            onRecover={() => setMode({ kind: "recover" })}
          />
        )}
        {mode.kind === "create" && (
          <CreateScreen
            onBack={() => setMode({ kind: "choose" })}
            onCreated={(username, recoveryCode) =>
              setMode({ kind: "show-code", username, recoveryCode })
            }
          />
        )}
        {mode.kind === "show-code" && (
          <ShowCodeScreen
            username={mode.username}
            recoveryCode={mode.recoveryCode}
            onDone={() => onSuccess(mode.username)}
          />
        )}
        {mode.kind === "recover" && (
          <RecoverScreen
            onBack={() => setMode({ kind: "choose" })}
            onRecovered={onSuccess}
          />
        )}
      </div>
    </div>
  );
}

// ─── Screens ─────────────────────────────────────────────────────────────────

function ChooseScreen({
  onCreate,
  onRecover,
}: {
  onCreate: () => void;
  onRecover: () => void;
}) {
  return (
    <>
      <h2 className="text-xl font-bold text-fg">Bienvenue sur Quadra</h2>
      <p className="mt-1 text-sm text-muted">
        Créez un compte ou récupérez-en un existant.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <Button onClick={onCreate} className="w-full justify-center">
          Créer un pseudo
        </Button>
        <Button
          onClick={onRecover}
          variant="secondary"
          className="w-full justify-center"
        >
          J&apos;ai déjà un compte
        </Button>
      </div>
    </>
  );
}

function CreateScreen({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: (username: string, recoveryCode: string) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const trimmed = value.trim();
  const isValid =
    trimmed.length >= 2 && trimmed.length <= 20 && USERNAME_RE.test(trimmed);

  async function handleSubmit() {
    if (!isValid || loading) return;
    setLoading(true);
    setError(null);

    const result = await createUser(trimmed);
    setLoading(false);

    if (result.ok) {
      onCreated(result.username, result.recoveryCode);
    } else {
      setError(result.error);
    }
  }

  return (
    <>
      <h2 className="text-xl font-bold text-fg">Choisissez un pseudo</h2>
      <p className="mt-1 text-sm text-muted">{USERNAME_RULES}</p>

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
        {loading ? "…" : "Créer"}
      </Button>
      <Button
        onClick={onBack}
        variant="ghost"
        className="mt-2 w-full justify-center"
      >
        Retour
      </Button>
    </>
  );
}

function ShowCodeScreen({
  username,
  recoveryCode,
  onDone,
}: {
  username: string;
  recoveryCode: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable (HTTP context, permissions) — user can copy manually */
    }
  }

  return (
    <>
      <h2 className="text-xl font-bold text-fg">Pseudo créé</h2>
      <p className="mt-1 text-sm text-muted">
        Notez votre code de récupération. Il permet de vous reconnecter sur un
        autre appareil. Il ne sera plus affiché.
      </p>

      <div className="mt-6 rounded-lg border border-primary/40 bg-elevated p-4">
        <p className="text-xs uppercase tracking-wider text-muted">
          Pseudo
        </p>
        <p className="mt-1 font-mono text-base text-fg">{username}</p>

        <p className="mt-4 text-xs uppercase tracking-wider text-muted">
          Code de récupération
        </p>
        <p className="mt-1 font-mono text-base font-bold text-primary break-all">
          {recoveryCode}
        </p>
      </div>

      <Button
        onClick={copy}
        variant="secondary"
        className="mt-4 w-full justify-center"
      >
        {copied ? "✓ Copié" : "Copier le code"}
      </Button>

      <Button onClick={onDone} className="mt-2 w-full justify-center">
        J&apos;ai noté mon code
      </Button>
    </>
  );
}

function RecoverScreen({
  onBack,
  onRecovered,
}: {
  onBack: () => void;
  onRecovered: (username: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    username.trim().length > 0 && code.trim().length > 0 && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    const result = await recoverUser(username.trim(), code.trim());
    setLoading(false);

    if (result.ok) {
      onRecovered(result.username);
    } else {
      setError(result.error);
    }
  }

  return (
    <>
      <h2 className="text-xl font-bold text-fg">Récupérer mon compte</h2>
      <p className="mt-1 text-sm text-muted">
        Entrez votre pseudo et le code reçu à la création.
      </p>

      <input
        type="text"
        value={username}
        onChange={(e) => {
          setUsername(e.target.value);
          setError(null);
        }}
        placeholder="Pseudo"
        maxLength={20}
        autoFocus
        className="mt-6 w-full rounded-lg border-2 border-line bg-elevated px-4 py-2 text-fg outline-none placeholder:text-muted focus:border-primary"
      />

      <input
        type="text"
        value={code}
        onChange={(e) => {
          setCode(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
        }}
        placeholder="XXXX-XXXX-XXXX-XXXX"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        className="mt-3 w-full rounded-lg border-2 border-line bg-elevated px-4 py-2 font-mono text-fg outline-none placeholder:text-muted focus:border-primary"
      />

      {error && <p className="mt-2 text-sm text-error">{error}</p>}

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="mt-4 w-full justify-center"
      >
        {loading ? "…" : "Se reconnecter"}
      </Button>
      <Button
        onClick={onBack}
        variant="ghost"
        className="mt-2 w-full justify-center"
      >
        Retour
      </Button>
    </>
  );
}
