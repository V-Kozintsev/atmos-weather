import { Platform } from "react-native";
import { requestMetForecast } from "../../src/lib/metRequest";
import { isCity, type City, type Forecast } from "../../src/lib/weather";
import rows from "../../public/cities.json";
import countryNames from "./countryNames.json";
import { read, write } from "./storage";

const cache = new Map<string, { forecast: Forecast; expires: number }>();
let diagnostics = false;

/** @param {City} a - Первый город. @param {City} b - Второй город. @returns {boolean} Совпадение места с учётом небольшой разницы координат справочников. */
export function sameCity(a: City, b: City): boolean {
  return a.latitude === b.latitude && a.longitude === b.longitude
    || a.name === b.name && a.country === b.country && Math.abs(a.latitude - b.latitude) < .05 && Math.abs(a.longitude - b.longitude) < .05;
}

/** @param {boolean} enabled - Явное включение безопасной диагностики. @returns {void} Меняет режим логирования. */
export function setDiagnostics(enabled: boolean): void {
  diagnostics = enabled;
}

/** @param {string} event - Этап работы. @param {Record<string, unknown>} detail - Метаданные без координат и персональных данных. @returns {void} Выводит диагностику только при явном включении. */
export function log(event: string, detail: Record<string, unknown> = {}): void {
  if (diagnostics) console.info(`[Atmos Mobile] ${event}`, detail);
}

/** @param {City} city - Выбранный город. @returns {string} Ключ локального снимка. */
export function forecastCityKey(city: City): string {
  return `atmos-native-forecast:${city.latitude.toFixed(4)},${city.longitude.toFixed(4)}`;
}

const key = forecastCityKey;

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

/** @param {City} city - Выбранный город. @returns {Forecast | undefined} Последний пригодный прогноз без обращения к диску или сети. */
export function memoryForecast(city: City): Forecast | undefined {
  const value = cache.get(key(city));
  return value && validSnapshot(value.forecast, city) ? { ...value.forecast, city } : undefined;
}

/** @param {City} city - Выбранный город. @returns {boolean} Сохранённый срок свежести прогноза ещё не истёк. */
export function isForecastFresh(city: City): boolean {
  return !!memoryForecast(city) && (cache.get(key(city))?.expires || 0) > Date.now();
}

/** @param {City} city - Город снимка. @returns {Promise<Forecast | undefined>} Проверенный прогноз и восстановленный срок свежести источника. */
export async function savedForecast(city: City): Promise<Forecast | undefined> {
  const memory = memoryForecast(city);
  if (memory) return memory;
  const snapshot = await read<unknown>(key(city), null);
  try {
    if (!validSnapshot(snapshot, city)) return undefined;
    new Intl.DateTimeFormat("ru-RU", { timeZone: snapshot.timezone });
    const savedExpiry = (snapshot as Forecast & { expiresAt?: number }).expiresAt;
    cache.set(key(city), { forecast: snapshot, expires: Number.isFinite(savedExpiry) ? savedExpiry! : snapshot.fetchedAt + 600000 });
    return { ...snapshot, city };
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
  if (cached && isForecastFresh(city)) {
    log("cache hit");
    return { ...cached.forecast, city };
  }
  try {
    const { forecast, expiresAt } = await requestMetForecast(city, signal, Platform.OS === "web" ? {} : { "User-Agent": "PuskWebWeather/3 (https://puskweb.ru/)" }, log);
    cache.set(key(city), { forecast, expires: expiresAt });
    if (cache.size > 20) cache.delete(cache.keys().next().value!);
    void write(key(city), { ...forecast, expiresAt });
    log("ready");
    return forecast;
  } catch (error) {
    log("request failed", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    throw error;
  }
}

/** @param {number} latitude - Округлённая широта устройства. @param {number} longitude - Округлённая долгота устройства. @returns {City | undefined} Ближайший город в пределах 35 км из локального GeoNames; координаты устройства не передаются сторонним сервисам. */
export function cityNearLocation(latitude: number, longitude: number): City | undefined {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return undefined;
  let closest: (typeof rows)[number] | undefined;
  let distance = 35;
  for (const row of rows) {
    const [lat, lon] = [Number(row[3]), Number(row[4])];
    const latDelta = (lat - latitude) * Math.PI / 180;
    const lonDelta = (lon - longitude) * Math.PI / 180;
    const haversine = Math.sin(latDelta / 2) ** 2 + Math.cos(latitude * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(lonDelta / 2) ** 2;
    const kilometers = 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(Math.max(0, 1 - haversine)));
    if (kilometers < distance) { distance = kilometers; closest = row; }
  }
  if (!closest) return undefined;
  const [id, name, code, lat, lon] = closest as [string, string, string, number, number, string];
  return { id, name, country: (countryNames as Record<string, string>)[code] || code, latitude: lat, longitude: lon };
}

/** @param {string} query - Название города. @returns {City[]} Совпадения в локальном справочнике GeoNames без внешних запросов. */
export function searchCities(query: string): City[] {
  const normalized = query.trim().toLocaleLowerCase("ru-RU");
  if (normalized.length < 2) return [];
  // Hermes не поддерживает Intl.DisplayNames; названия стран хранятся вместе со справочником.
  const countries: Record<string, string> = countryNames;
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
      country: countries[country] || country,
      latitude,
      longitude,
    }));
}
