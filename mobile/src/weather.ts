import { Platform } from "react-native";
import { parseMetForecast, type MetResponse } from "../../src/lib/met";
import { isCity, type City, type Forecast } from "../../src/lib/weather";
import rows from "../../public/cities.json";
import { read, write } from "./storage";

const cache = new Map<string, { forecast: Forecast; expires: number }>();
let diagnostics = false;

/** @param {boolean} enabled - Явное включение безопасной диагностики. @returns {void} Меняет режим логирования. */
export function setDiagnostics(enabled: boolean): void {
  diagnostics = enabled;
}

/** @param {string} event - Этап работы. @param {Record<string, unknown>} detail - Метаданные без координат и персональных данных. @returns {void} Выводит диагностику только при явном включении. */
export function log(event: string, detail: Record<string, unknown> = {}): void {
  if (diagnostics) console.info(`[Atmos Mobile] ${event}`, detail);
}

/** @param {City} city - Выбранный город. @returns {string} Ключ локального снимка. */
function key(city: City): string {
  return `atmos-native-forecast:${city.latitude.toFixed(4)},${city.longitude.toFixed(4)}`;
}

/** @param {unknown} value - Снимок из хранилища. @param {City} city - Ожидаемый город. @returns {boolean} Пригодность снимка не старше суток. */
function validSnapshot(value: unknown, city: City): value is Forecast {
  const data = value as Forecast | null;
  return (
    !!data &&
    isCity(data.city) &&
    key(data.city) === key(city) &&
    Number.isFinite(data.fetchedAt) &&
    Date.now() >= data.fetchedAt &&
    Date.now() - data.fetchedAt < 86400000 &&
    Number.isFinite(data.current?.temperature) &&
    Number.isFinite(data.current?.feels) &&
    Number.isFinite(data.current?.wind) &&
    Number.isFinite(data.current?.humidity) &&
    Number.isFinite(data.current?.code) &&
    typeof data.current.time === "string" &&
    typeof data.timezone === "string" &&
    Array.isArray(data.hours) &&
    data.hours.length > 0 &&
    data.hours.every(
      (h) =>
        !!h &&
        typeof h.time === "string" &&
        Number.isFinite(h.feels) &&
        Number.isFinite(h.rain) &&
        Number.isFinite(h.wind) &&
        Number.isFinite(h.code) &&
        Number.isFinite(h.temperature),
    ) &&
    Array.isArray(data.days) &&
    data.days.length === 7 &&
    data.days.every(
      (d) =>
        !!d &&
        typeof d.date === "string" &&
        typeof d.sunrise === "string" &&
        typeof d.sunset === "string" &&
        Number.isFinite(d.rain) &&
        Number.isFinite(d.code) &&
        Number.isFinite(d.min) &&
        Number.isFinite(d.max),
    )
  );
}

/** @param {City} city - Город снимка. @returns {Promise<Forecast | undefined>} Проверенный локальный прогноз. */
export async function savedForecast(city: City): Promise<Forecast | undefined> {
  const snapshot = await read<unknown>(key(city), null);
  try {
    if (!validSnapshot(snapshot, city)) return undefined;
    new Intl.DateTimeFormat("ru-RU", { timeZone: snapshot.timezone });
    return snapshot;
  } catch {
    return undefined;
  }
}

/** @param {City} city - Город прогноза. @param {AbortSignal} signal - Отмена устаревшего запроса. @returns {Promise<Forecast>} Прогноз с учётом срока кэша источника. */
export async function loadForecast(
  city: City,
  signal: AbortSignal,
): Promise<Forecast> {
  const cached = cache.get(key(city));
  if (signal.aborted) throw new Error("Aborted");
  if (cached && cached.expires > Date.now()) {
    log("cache hit");
    return cached.forecast;
  }
  const controller = new AbortController();
  /** @returns {void} Передаёт отмену экранного запроса транспорту. */
  const cancel = (): void => controller.abort();
  signal.addEventListener("abort", cancel);
  const timer = setTimeout(cancel, 12000);
  try {
    log("request", { service: "api.met.no" });
    const lat = Math.round(city.latitude * 10000) / 10000;
    const lon = Math.round(city.longitude * 10000) / 10000;
    const response = await fetch(
      `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${lat}&lon=${lon}`,
      {
        signal: controller.signal,
        headers:
          Platform.OS === "web"
            ? {}
            : { "User-Agent": "Atmos/3.0.0 (https://puskweb.ru/)" },
      },
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const forecast = parseMetForecast(
      city,
      (await response.json()) as MetResponse,
    );
    if (signal.aborted || controller.signal.aborted) throw new Error("Aborted");
    const expiry = Date.parse(response.headers.get("Expires") || "");
    cache.set(key(city), {
      forecast,
      expires:
        Number.isFinite(expiry) && expiry > Date.now()
          ? expiry
          : Date.now() + 600000,
    });
    await write(key(city), forecast);
    log("ready", { status: response.status });
    return forecast;
  } catch (error) {
    log("request failed", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    throw error;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
  }
}

/** @param {string} query - Название города. @returns {City[]} Совпадения в локальном справочнике GeoNames без внешних запросов. */
export function searchCities(query: string): City[] {
  const normalized = query.trim().toLocaleLowerCase("ru-RU");
  if (normalized.length < 2) return [];
  const regions = new Intl.DisplayNames(["ru"], { type: "region" });
  /** @param {[string, string, string, number, number, string]} row - Строка города. @returns {number} Приоритет точного названия перед совпадением в альтернативных именах. */
  function rank(row: [string, string, string, number, number, string]): number {
    const name = row[1].toLocaleLowerCase("ru-RU");
    return name === normalized ? 0 : name.startsWith(normalized) ? 1 : 2;
  }
  return (rows as [string, string, string, number, number, string][])
    .filter((row) => row[5].includes(normalized))
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 12)
    .map(([id, name, country, latitude, longitude]) => ({
      id,
      name,
      country: regions.of(country) || country,
      latitude,
      longitude,
    }));
}
