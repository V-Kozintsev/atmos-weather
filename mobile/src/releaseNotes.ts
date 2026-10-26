import bundled from "../../public/app-releases.json";
import { read, write } from "./storage";
import { log } from "./weather";

export interface ReleaseNotes { versionCode: number; versionName: string; title: string; changes: string[] }
const endpoint = "https://v-kozintsev.github.io/atmos-weather/app-releases.json";

/** @param {unknown} value - Публичный каталог выпусков. @param {number} version - Код версии, подтверждённый магазином. @returns {ReleaseNotes | undefined} Только проверенные тексты для этой версии, без разметки и внешних ссылок. */
export function parseReleaseNotes(value: unknown, version: number): ReleaseNotes | undefined {
  if (!value || typeof value !== "object") return;
  const catalog = value as { schemaVersion?: unknown; packageName?: unknown; releases?: unknown };
  if (catalog.schemaVersion !== 1 || catalog.packageName !== bundled.packageName || !Array.isArray(catalog.releases)) return;
  const entry = catalog.releases.find((item) => item && typeof item === "object" && item.versionCode === version) as Partial<ReleaseNotes> | undefined;
  if (!entry || !Number.isInteger(entry.versionCode) || typeof entry.versionName !== "string" || !/^\d+\.\d+\.\d+$/.test(entry.versionName) || typeof entry.title !== "string" || !entry.title.trim() || entry.title.length > 80 || !Array.isArray(entry.changes) || !entry.changes.length || entry.changes.length > 5 || entry.changes.some((item) => typeof item !== "string" || !item.trim() || item.length > 160)) return;
  return { versionCode: version, versionName: entry.versionName, title: entry.title.trim(), changes: entry.changes.map((item) => item.trim()) };
}

/** @param {number} version - Доступная версия из RuStore. @returns {Promise<ReleaseNotes | undefined>} Локальные тексты или кеш именно этого выпуска; отсутствие текста не мешает обновлению. */
export async function cachedReleaseNotes(version: number): Promise<ReleaseNotes | undefined> {
  return parseReleaseNotes(await read<unknown>(`atmos-release-notes-${version}`, null), version) || parseReleaseNotes(bundled, version);
}

/** @param {number} version - Версия, наличие которой подтвердил RuStore. @param {AbortSignal} signal - Отмена при смене версии или закрытии приложения. @returns {Promise<ReleaseNotes | undefined>} Публичный список изменений; никогда не определяет доступность APK или адрес его загрузки. */
export async function fetchReleaseNotes(version: number, signal: AbortSignal): Promise<ReleaseNotes | undefined> {
  const controller = new AbortController();
  /** @returns {void} Прерывает запрос вместе с экраном. */
  function cancel(): void { controller.abort(); }
  signal.addEventListener("abort", cancel);
  if (signal.aborted) cancel();
  const timer = setTimeout(cancel, 3500);
  log("release notes request", { version });
  try {
    const response = await fetch(endpoint, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new Error("RELEASE_NOTES_HTTP");
    const body = await response.text();
    if (body.length > 100_000) throw new Error("RELEASE_NOTES_SIZE");
    const notes = parseReleaseNotes(JSON.parse(body), version);
    if (!notes || signal.aborted) return;
    await write(`atmos-release-notes-${version}`, { schemaVersion: 1, packageName: bundled.packageName, releases: [notes] });
    log("release notes ready", { version, status: response.status });
    return notes;
  } catch { log("release notes unavailable", { version }); return; }
  finally { clearTimeout(timer); signal.removeEventListener("abort", cancel); }
}
