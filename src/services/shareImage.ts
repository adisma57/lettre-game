import { t } from "../language";
import { SITE_URL } from "../config";
import type { ShareInput } from "./share";

/** Render locally without uploading the result or player data. */
export async function buildShareImage(input: ShareInput): Promise<File> {
  const logo = new Image();
  logo.src = "/logo-wordmark.png";
  await logo.decode();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Impossible de créer l’image.");
  const glow = ctx.createRadialGradient(540, 350, 0, 540, 350, 720);
  glow.addColorStop(0, "#332013");
  glow.addColorStop(1, "#0c0b09");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1080, 1080);
  const text = (value: string, y: number, size: number, color = "#f2ede6", bold = false) => {
    ctx.fillStyle = color;
    ctx.font = `${bold ? 700 : 400} ${size}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(value, 540, y, 940);
  };
  // Crop the transparent space to the right of the existing wordmark.
  ctx.drawImage(logo, 0, 0, 520, 160, 306, 60, 468, 144);
  text(t("4 lettres · 3 essais · un défi chaque jour", "4 letters · 3 attempts · a new daily challenge"), 250, 31, "#c0b8ac");
  text(t(`DÉFI #${input.puzzleNumber}`, `CHALLENGE #${input.puzzleNumber}`), 336, 27, "#f97316", true);
  text(input.bestPossible === null ? `${input.score} pts` : `${input.score} / ${input.bestPossible}`, 455, 100, "#f2ede6", true);
  // Show the public draw in its original order, independent of the result.
  input.draw.forEach((letter, i) => {
    ctx.fillStyle = "#eee8df";
    ctx.beginPath();
    ctx.roundRect(208 + i * 174, 510, 142, 142, 23);
    ctx.fill();
    ctx.fillStyle = "#1d1a16";
    ctx.font = "700 76px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, 279 + i * 174, 581, 120);
    ctx.textBaseline = "alphabetic";
  });
  text(t(`Série en cours : ${input.currentStreak} jour${input.currentStreak === 1 ? "" : "s"}`, `Current streak: ${input.currentStreak} day${input.currentStreak === 1 ? "" : "s"}`), 778, 40, "#f2ede6", true);
  if (input.percentile !== null) text(t(`Mieux que ${Math.round(input.percentile * 100)} % des joueurs`, `Better than ${Math.round(input.percentile * 100)}% of players`), 824, 26, "#c0b8ac");
  text(t("Tu fais mieux avec les mêmes quatre lettres ?", "Same four letters. Can you beat my score?"), 937, 32, "#f2ede6", true);
  text(new URL(SITE_URL).host, 1002, 34, "#f97316", true);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Impossible d’exporter l’image.")), "image/png");
  });
  return new File([blob], `quadra-${input.puzzleNumber}.png`, { type: "image/png" });
}
