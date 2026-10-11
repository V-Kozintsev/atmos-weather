import { parseMetForecast, type MetResponse } from "./met";
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { type City, type Forecast, isCity } from "./weather";

type CityRow = [string, string, string, number, number, string];
let cityRows: Promise<CityRow[]> | undefined;
const metCache = new Map<string, { value: unknown; expires: number }>();
const regionNames = new Intl.DisplayNames(["ru"], { type: "region" });

/** @param {string} event - Этап запроса. @param {Record<string, unknown>} detail - Безопасные метаданные. */
export function debug(event: string, detail: Record<string, unknown> = {}): void {
  if (readStorage("atmos-debug", false)) console.info(`[Atmos API] ${event}`, detail);
}

/** @param {string} key - Ключ хранилища. @param {T} fallback - Резервное значение. @returns {T} Прочитанные данные. */
export function readStorage<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}

/** @param {string} key - Ключ хранилища. @param {unknown} value - Данные для сохранения. */
export function saveStorage(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { debug("storage unavailable"); }
}

/** @param {string} url - Адрес источника. @param {AbortSignal} signal - Отмена запроса. @returns {Promise<T>} Проверенный JSON. */
async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) throw signal.reason;
  const cached = metCache.get(url);
  if (cached && cached.expires > Date.now()) {
    debug("cache hit", { service: "api.met.no" });
    return cached.value as T;
  }
  const timeout = AbortSignal.timeout(12000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const service = url.startsWith("https://") ? new URL(url).hostname : "local";
  debug("request", { service });
  try {
    if (service === "api.met.no" && Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.get({ url, headers: { "User-Agent": "Atmos/2.2.1 (https://github.com/V-Kozintsev/atmos-weather)" }, connectTimeout: 12000, readTimeout: 12000 });
      if (signal?.aborted) throw signal.reason;
      if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status}`);
      const data = response.data as T;
      const expiry = Date.parse(response.headers.Expires ?? response.headers.expires ?? "");
      metCache.set(url, { value: data, expires: Number.isFinite(expiry) && expiry > Date.now() ? expiry : Date.now() + 10 * 60 * 1000 });
      debug("received", { service, status: response.status });
      return data;
    }
    const response = await fetch(url, { signal: combined });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json() as T;
    if (service === "api.met.no") {
      const expiry = Date.parse(response.headers?.get("Expires") || "");
      metCache.set(url, { value: data, expires: Number.isFinite(expiry) && expiry > Date.now() ? expiry : Date.now() + 10 * 60 * 1000 });
    }
    debug("received", { service, status: response.status });
    return data;
  } catch (error) {
    debug("failed", { service, reason: error instanceof Error ? error.name : "unknown" });
    throw error;
  }
}

/** @param {string} query - Название города. @param {AbortSignal} signal - Отмена поиска. @returns {Promise<City[]>} Совпадения из GeoNames. */
export async function searchCities(query: string, signal: AbortSignal): Promise<City[]> {
  cityRows ??= request<CityRow[]>(`${import.meta.env.BASE_URL}cities.json`).catch((error: unknown) => { cityRows = undefined; throw error; });
  const rows = await cityRows;
  if (signal.aborted) throw signal.reason;
  const normalized = query.trim().toLocaleLowerCase("ru-RU");
  return rows.filter((row) => row[5].includes(normalized)).slice(0, 6)
    .map(([id, name, country, latitude, longitude]) => ({ id, name, country: regionNames.of(country) ?? country, latitude, longitude }));
}

/** @param {City} city - Координаты города. @param {AbortSignal} signal - Отмена запроса. @returns {Promise<Forecast>} Прогноз MET Norway на неделю. */
export async function fetchForecast(city: City, signal: AbortSignal): Promise<Forecast> {
  const latitude = Math.round(city.latitude * 10000) / 10000;
  const longitude = Math.round(city.longitude * 10000) / 10000;
  const params = new URLSearchParams({ lat: String(latitude), lon: String(longitude) });
  const data = await request<MetResponse>(`https://api.met.no/weatherapi/locationforecast/2.0/complete?${params}`, signal);
  return parseMetForecast(city, data);
}
/** @param {City} city - Выбранный город. @returns {Forecast | undefined} Снимок не старше суток. */
export function cachedForecast(city: City): Forecast | undefined {
  const cached = readStorage<Forecast | null>("atmos-forecast-met", null);
  if (cached && isCity(cached.city) && cached.city.latitude === city.latitude && cached.city.longitude === city.longitude && Number.isFinite(cached.fetchedAt) && Date.now() >= cached.fetchedAt && Date.now() - cached.fetchedAt < 86400000 && Number.isFinite(cached.current?.temperature) && typeof cached.current?.time === "string" && Array.isArray(cached.hours) && cached.hours.length > 0 && cached.hours.every((hour) => hour && typeof hour.time === "string" && Number.isFinite(hour.temperature)) && Array.isArray(cached.days) && cached.days.length === 7 && cached.days.every((day) => day && typeof day.date === "string" && Number.isFinite(day.min) && Number.isFinite(day.max) && typeof day.sunrise === "string" && typeof day.sunset === "string")) return cached;
}
