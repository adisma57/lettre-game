import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { resetRecoveryCode } from "../services/api";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export default function Profile() {
  const { auth, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (auth.status !== "authenticated") return null;
  const username = auth.username;

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setCopied(false);
    const result = await resetRecoveryCode(username);
    setLoading(false);
    setConfirming(false);
    if (result.ok) {
      setCode(result.recoveryCode);
    } else {
      setError(result.error);
    }
  }

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-8 text-2xl font-bold text-primary">Mon compte</h1>

      <Card>
        <p className="text-xs uppercase tracking-wider text-muted">Pseudo</p>
        <p className="mt-1 font-mono text-lg text-fg">{username}</p>
      </Card>

      <Card className="mt-5">
        <p className="text-xs uppercase tracking-wider text-muted">
          Code de récupération
        </p>
        <p className="mt-2 text-sm text-muted">
          Un code permet de vous reconnecter sur un autre appareil si votre
          navigateur oublie votre session.
        </p>

        {code && (
          <div className="mt-5 rounded-lg border border-primary/40 bg-elevated p-4">
            <p className="font-mono text-base font-bold text-primary break-all">
              {code}
            </p>
            <Button
              onClick={copy}
              variant="secondary"
              className="mt-4 w-full justify-center"
            >
              {copied ? "✓ Copié" : "Copier"}
            </Button>
            <p className="mt-3 text-xs text-muted">
              Notez-le maintenant — il ne sera plus affiché.
            </p>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-error">{error}</p>}

        {!confirming && !code && (
          <Button
            onClick={() => setConfirming(true)}
            disabled={loading}
            className="mt-5 w-full justify-center"
          >
            Générer un code
          </Button>
        )}

        {confirming && (
          <div className="mt-5 rounded-lg border border-line bg-elevated p-4">
            <p className="text-sm text-fg">
              Générer un nouveau code invalide le précédent. Continuer ?
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 justify-center"
              >
                {loading ? "…" : "Oui, générer"}
              </Button>
              <Button
                onClick={() => setConfirming(false)}
                disabled={loading}
                variant="secondary"
                className="flex-1 justify-center"
              >
                Annuler
              </Button>
            </div>
          </div>
        )}

        {code && (
          <Button
            onClick={() => {
              setCode(null);
              setConfirming(false);
            }}
            variant="ghost"
            className="mt-4 w-full justify-center"
          >
            Régénérer à nouveau
          </Button>
        )}
      </Card>

      <Card className="mt-5">
        <p className="text-xs uppercase tracking-wider text-muted">Session</p>
        <Button
          onClick={logout}
          variant="secondary"
          className="mt-4 w-full justify-center"
        >
          Se déconnecter
        </Button>
      </Card>
    </div>
  );
}
