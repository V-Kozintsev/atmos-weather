import { useEffect, useState } from "react";
import type { City } from "../../src/lib/weather";
import { read, write } from "./storage";
import { log } from "./weather";

export interface CityPhoto { uri: string; author: string; license: string; licenseUrl: string; source: string; title: string }
interface CommonsImage { thumburl?: string; thumbwidth?: number; thumbheight?: number; descriptionurl?: string; extmetadata?: Record<string, { value?: string }> }
interface CommonsPage { title?: string; imageinfo?: CommonsImage[] }
interface CachedPhoto { expires: number; photo: CityPhoto | null }
const memory = new Map<string, CachedPhoto>();

/** @param {string} value - Метаданные Wikimedia. @returns {string} Краткий обычный текст без исполняемой HTML-разметки. */
function plain(value = ""): string { return value.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim(); }

/** @param {string} value - Внешняя ссылка. @param {string[]} hosts - Разрешённые домены. @returns {boolean} Проверяет HTTPS и точный домен перед отображением. */
function allowedUrl(value: string, hosts: string[]): boolean {
  try { const url = new URL(value); return url.protocol === "https:" && hosts.includes(url.hostname); } catch { return false; }
}

/** @param {CommonsPage[]} pages - Снимки рядом с центром города. @returns {CityPhoto | null} Горизонтальный городской вид со свободной лицензией и авторством. */
export function selectCityPhoto(pages: CommonsPage[]): CityPhoto | null {
  const candidates = pages.flatMap((page) => {
    const image = page.imageinfo?.[0];
    const meta = image?.extmetadata;
    const license = plain(meta?.LicenseShortName?.value);
    const title = plain(page.title);
    const ratio = (image?.thumbwidth || 0) / (image?.thumbheight || 1);
    const uri = image?.thumburl || "";
    const source = image?.descriptionurl || "";
    const rawLicenseUrl = meta?.LicenseUrl?.value || "";
    const licenseUrl = rawLicenseUrl.replace(/^http:/, "https:");
    if (!/^CC(?:0| BY(?:-SA)?) (?:1\.0|2\.0|2\.5|3\.0|4\.0)$/.test(license) || !allowedUrl(uri, ["thumb.wikimedia.org", "upload.wikimedia.org"]) || !allowedUrl(source, ["commons.wikimedia.org"]) || !allowedUrl(licenseUrl, ["creativecommons.org"]) || ratio < 1.2 || ratio > 3 || !/\.(?:jpe?g|png)$/i.test(title) || /portrait|selfie|interior|bus |tram |car |statue|plaque|map|painting|sign |mural|memorial|памятник|табличка/i.test(title)) return [];
    const author = plain(meta?.Artist?.value);
    if (!author) return [];
    const score = /panorama|skyline|cityscape|aerial|view|park|bridge|river|square|набереж|панорам|парк|мост|площад/i.test(title) ? 1 : 0;
    return [{ score, photo: { uri, author, license, licenseUrl, source, title } }];
  });
  return candidates.sort((a, b) => b.score - a.score)[0]?.photo || null;
}

/** @param {City} city - Публичный город из справочника. @param {AbortSignal} signal - Отмена смены города или таймаут. @returns {Promise<CityPhoto | null>} Один свободный снимок через официальный Commons API, без ключа. */
async function fetchCityPhoto(city: City, signal: AbortSignal): Promise<CityPhoto | null> {
  const params = new URLSearchParams({ action: "query", format: "json", origin: "*", generator: "geosearch", ggsnamespace: "6", ggscoord: `${city.latitude}|${city.longitude}`, ggsradius: "10000", ggslimit: "30", prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "960" });
  log("city photo request");
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { signal });
  if (!response.ok) throw new Error(`Commons HTTP ${response.status}`);
  const data = await response.json() as { query?: { pages?: Record<string, CommonsPage> }; error?: unknown };
  if (data.error) throw new Error("Commons API unavailable");
  const photo = selectCityPhoto(Object.values(data.query?.pages || {}));
  log("city photo result", { found: !!photo });
  return photo;
}

/** @param {City | undefined} city - Выбранный город, без отправки GPS-позиции. @param {boolean} enabled - Включён ли фон. @returns {CityPhoto | null} Снимок с кешированием и защитой от гонок при смене города. */
export function useCityPhoto(city: City | undefined, enabled: boolean): CityPhoto | null {
  const [state, setState] = useState<{ key: string; photo: CityPhoto | null }>();
  const key = city ? `atmos-city-photo:${city.latitude.toFixed(3)},${city.longitude.toFixed(3)}` : "";
  useEffect(() => {
    if (!city || !enabled || city.id.startsWith("geo:") || Math.abs(city.latitude) > 90 || Math.abs(city.longitude) > 180) return;
    let alive = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    /** @returns {Promise<void>} Восстанавливает кеш или загружает фото; ошибки не блокируют прогноз. */
    async function load(): Promise<void> {
      try {
        const cached = memory.get(key) || await read<CachedPhoto | null>(key, null);
        if (!alive) return;
        if (cached && cached.expires > Date.now()) { setState({ key, photo: cached.photo }); return; }
        const photo = await fetchCityPhoto(city!, controller.signal);
        if (!alive) return;
        const value = { photo, expires: Date.now() + (photo ? 7 : 1) * 86400000 };
        memory.set(key, value);
        if (memory.size > 20) memory.delete(memory.keys().next().value!);
        setState({ key, photo });
        await write(key, value);
      } catch { if (alive) { setState({ key, photo: null }); log("city photo unavailable"); } }
      finally { clearTimeout(timer); }
    }
    void load();
    return () => { alive = false; clearTimeout(timer); controller.abort(); };
  }, [key, enabled]);
  return enabled && state?.key === key ? state.photo : null;
}
