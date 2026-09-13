import { IS_ENGLISH } from "./language.js";
/**
 * Deployment constants.
 * SITE_URL is reused in the share text and the Open Graph metadata.
 * EPOCH anchors the puzzle number; its exact value is arbitrary but must
 * never change once in production.
 */
const configuredUrl = (import.meta as ImportMeta & { env?: { VITE_SITE_URL?: string } }).env?.VITE_SITE_URL ??
  (globalThis as { process?: { env?: { VITE_SITE_URL?: string } } }).process?.env?.VITE_SITE_URL;
export const SITE_URL = configuredUrl || (IS_ENGLISH
  ? ((globalThis as { location?: { origin: string } }).location?.origin ?? "")
  : "https://quadra-mots.fr");
export const EPOCH = "2026-09-10";
