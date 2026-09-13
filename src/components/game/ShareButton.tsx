import { t } from "../../language";
import { useState, useEffect } from "react";
import { buildShareText, type ShareInput } from "../../services/share";
import { buildShareImage } from "../../services/shareImage";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

function SharePreview({ input, onClose }: { input: ShareInput; onClose: () => void }) {
  const [image, setImage] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [sharing, setSharing] = useState(false);
  const text = buildShareText(input);

  useEffect(() => {
    let active = true;
    let url: string | undefined;
    buildShareImage(input).then((file) => {
      if (!active) return;
      url = URL.createObjectURL(file);
      setImage({ file, url });
    }).catch(() => {
      if (active) setError(t("L’image n’a pas pu être créée. Tu peux toujours copier le texte.", "The image could not be created. You can still copy the text."));
    });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [input]);

  const canShareImage = !!image && typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" && navigator.canShare({ files: [image.file] });

  async function share() {
    if (!image || sharing) return;
    setSharing(true);
    setStatus("");
    // Start copying during the click, without delaying native sharing.
    void copy();
    try {
      // Prepare the PNG before this click to preserve user activation.
      await navigator.share({ files: [image.file], text });
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) {
        setStatus(t("Partage indisponible. Télécharge l’image et copie le texte ci-dessous.", "Sharing unavailable. Download the image and copy the text below."));
      }
    } finally {
      setSharing(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus(t("Texte copié !", "Text copied!"));
    } catch {
      setStatus(t("Sélectionne le texte ci-dessous pour le copier manuellement.", "Select the text below to copy it manually."));
    }
  }

  return (
    <Modal title={t("Partager mon résultat", "Share my result")} onClose={onClose}>
      {image ? (
        <img src={image.url} alt={t(`Résultat Quadra du défi ${input.puzzleNumber} : ${input.score} points, série de ${input.currentStreak} jours.`, `Quadra challenge ${input.puzzleNumber}: ${input.score} points, ${input.currentStreak}-day streak.`)} className="mx-auto w-full max-w-sm rounded-xl" />
      ) : <p role="status" className="py-6 text-fg-sub">{error || t("Préparation de ton image…", "Preparing your image…")}</p>}
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {canShareImage && <Button disabled={sharing} onClick={() => void share()}>{sharing ? t("Partage…", "Sharing…") : t("Partager l’image", "Share image")}</Button>}
        {image && <a className="rounded-lg border border-line bg-elevated px-5 py-2 text-sm text-fg hover:border-primary/50" href={image.url} download={image.file.name}>{t("Télécharger l’image", "Download image")}</a>}
        <Button variant="secondary" onClick={() => void copy()}>{t("Copier le texte", "Copy text")}</Button>
      </div>
      <p className="mt-3 text-sm text-fg-sub">{t("Selon l’application choisie, le texte peut être à coller séparément.", "Depending on the app, you may need to paste the caption separately.")}</p>
      <textarea aria-label={t("Texte à partager", "Share text")} readOnly value={text} onFocus={(event) => event.target.select()} rows={7} className="mt-3 w-full resize-none rounded-lg border border-line bg-canvas p-3 text-sm text-fg" />
      <p role="status" className="mt-2 text-sm text-fg-sub">{status}</p>
    </Modal>
  );
}

export function ShareButton({ input }: { input: ShareInput }) {
  const [snapshot, setSnapshot] = useState<ShareInput | null>(null);
  const [prepared, setPrepared] = useState<{ key: string; file: File | null } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  // Stats may arrive after the result: only share an image matching this input.
  const key = JSON.stringify(input);
  useEffect(() => {
    let active = true;
    buildShareImage(JSON.parse(key) as ShareInput).then((file) => {
      if (active) setPrepared({ key, file });
    }).catch(() => {
      if (active) setPrepared({ key, file: null });
    });
    return () => { active = false; };
  }, [key]);

  async function shareDirectly() {
    if (sharing || prepared?.key !== key) return;
    const text = buildShareText(input);
    setCopyStatus("");
    // Do not await clipboard access: share() also needs this click activation.
    void (async () => {
      try {
        await navigator.clipboard.writeText(text);
        setCopyStatus(t("Texte et hashtags copiés, prêts à coller !", "Caption and hashtags copied, ready to paste!"));
      } catch {
        setCopyStatus(t("Copie automatique refusée par le navigateur.", "Your browser blocked automatic copying."));
      }
    })();
    const file = prepared.file;
    const data = file ? { files: [file], text } : null;
    if (!data || typeof navigator.share !== "function" ||
      typeof navigator.canShare !== "function" || !navigator.canShare(data)) {
      setSnapshot(input);
      return;
    }
    setSharing(true);
    try {
      // No await before share: the prepared PNG preserves the click activation.
      await navigator.share(data);
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === "AbortError")) {
        setSnapshot(input);
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      <Button variant="secondary" disabled={sharing || prepared?.key !== key} onClick={() => void shareDirectly()}>
        {prepared?.key !== key ? t("Préparation du partage…", "Preparing to share…") : sharing ? t("Partage…", "Sharing…") : t("Partager", "Share")}
      </Button>
      {copyStatus && <p role="status" className="mt-2 text-sm text-fg-sub">{copyStatus}</p>}
      {snapshot && <SharePreview input={snapshot} onClose={() => setSnapshot(null)} />}
    </>
  );
}
