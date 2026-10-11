import * as SunCalc from "suncalc";
import tzlookup from "tz-lookup";
import type { City, Forecast } from "./weather";

interface MetPoint {
  time: string;
  data: {
    instant: {
      details: {
        air_temperature: number;
        apparent_air_temperature?: number;
        relative_humidity?: number;
        air_pressure_at_sea_level?: number;
        wind_speed?: number;
        wind_from_direction?: number;
        ultraviolet_index_clear_sky?: number;
      };
    };
    next_1_hours?: {
      summary?: { symbol_code?: string };
      details?: { precipitation_amount?: number };
    };
    next_6_hours?: {
      summary?: { symbol_code?: string };
      details?: { precipitation_amount?: number };
    };
    next_12_hours?: {
      summary?: { symbol_code?: string };
      details?: { precipitation_amount?: number };
    };
  };
}
export interface MetResponse {
  properties?: { timeseries?: MetPoint[] };
}
/** @param {Date} date - Время UTC. @param {string} timezone - Часовой пояс города. @returns {string} Локальные дата и время. */
function localTime(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string): string =>
    parts.find((part) => part.type === type)?.value || "00";
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`;
}

/** @param {string} date - Локальная дата. @param {number} latitude - Широта. @param {number} longitude - Долгота. @param {string} timezone - Часовой пояс. @param {"sunrise" | "sunset"} kind - Событие. @returns {string} Время события или пустая строка. */
function sunTime(
  date: string,
  latitude: number,
  longitude: number,
  timezone: string,
  kind: "sunrise" | "sunset",
): string {
  for (const offset of [-1, 0, 1]) {
    const midday = new Date(`${date}T12:00:00Z`);
    midday.setUTCDate(midday.getUTCDate() + offset);
    const time = SunCalc.getTimes(midday, latitude, longitude)[kind];
    if (
      time &&
      Number.isFinite(time.getTime()) &&
      localTime(time, timezone).startsWith(date)
    )
      return localTime(time, timezone);
  }
  return "";
}

/** @param {string | undefined} symbol - Символ MET Norway. @returns {number} Код WMO для существующих иконок. */
function weatherCode(symbol?: string): number {
  const name = symbol?.replace(/_(day|night|polartwilight)$/, "") || "";
  if (name.includes("thunder")) return 95;
  if (name.includes("snow")) return 71;
  if (name.includes("sleet")) return 77;
  if (name.includes("rain")) return 63;
  if (name.includes("fog")) return 45;
  if (name === "cloudy") return 3;
  if (name === "partlycloudy") return 2;
  if (name === "fair") return 1;
  return 0;
}

/** @param {MetPoint} point - Точка прогноза. @returns {number} Осадки за ближайший доступный интервал в мм. */
function precipitation(point: MetPoint): number {
  return Math.max(
    0,
    point.data.next_1_hours?.details?.precipitation_amount ??
      point.data.next_6_hours?.details?.precipitation_amount ??
      point.data.next_12_hours?.details?.precipitation_amount ??
      0,
  );
}

/** @param {City} city - Город. @param {MetResponse} data - Ответ MET Norway. @returns {Forecast} Проверенный прогноз в общей модели Atmos. */
export function parseMetForecast(city: City, data: MetResponse): Forecast {
  const latitude = Math.round(city.latitude * 10000) / 10000;
  const longitude = Math.round(city.longitude * 10000) / 10000;
  const points = data.properties?.timeseries;
  if (
    !Array.isArray(points) ||
    points.length < 7 ||
    !points.every(
      (point) =>
        Number.isFinite(point.data?.instant?.details?.air_temperature) &&
        !Number.isNaN(Date.parse(point.time)),
    )
  )
    throw new Error("Invalid forecast");
  const timezone = tzlookup(latitude, longitude);
  const hours = points.map((point) => {
    const details = point.data.instant.details;
    const symbol =
      point.data.next_1_hours?.summary?.symbol_code ??
      point.data.next_6_hours?.summary?.symbol_code ??
      point.data.next_12_hours?.summary?.symbol_code;
    return {
      time: localTime(new Date(point.time), timezone),
      temperature: details.air_temperature,
      feels: details.apparent_air_temperature ?? details.air_temperature,
      rain: precipitation(point),
      wind: (details.wind_speed ?? 0) * 3.6,
      code: weatherCode(symbol),
      day: symbol?.endsWith("_day") ?? true,
    };
  });
  const startDate = hours[0].time.slice(0, 10);
  const dates = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(`${startDate}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() + index);
    return day.toISOString().slice(0, 10);
  });
  const days = dates.map((date) => {
    const dayHours = hours.filter((hour) => hour.time.startsWith(date));
    if (!dayHours.length) throw new Error("Incomplete forecast");
    const daytime = dayHours.find((hour) => hour.day) ?? dayHours[0];
    const uvValues = points
      .filter((point) =>
        localTime(new Date(point.time), timezone).startsWith(date),
      )
      .map((point) => point.data.instant.details.ultraviolet_index_clear_sky)
      .filter((value): value is number => Number.isFinite(value));
    return {
      date,
      min: Math.min(...dayHours.map((hour) => hour.temperature)),
      max: Math.max(...dayHours.map((hour) => hour.temperature)),
      rain: dayHours.reduce((total, hour) => total + hour.rain, 0),
      code: daytime.code,
      sunrise: sunTime(date, latitude, longitude, timezone, "sunrise"),
      sunset: sunTime(date, latitude, longitude, timezone, "sunset"),
      uv: uvValues.length ? Math.max(...uvValues) : NaN,
    };
  });
  const details = points[0].data.instant.details;
  return {
    city,
    timezone,
    fetchedAt: Date.now(),
    current: {
      time: hours[0].time,
      temperature: details.air_temperature,
      feels: details.apparent_air_temperature ?? details.air_temperature,
      humidity: Math.round(details.relative_humidity ?? 0),
      wind: (details.wind_speed ?? 0) * 3.6,
      direction: details.wind_from_direction ?? 0,
      pressure: details.air_pressure_at_sea_level ?? 1013,
      code: hours[0].code,
      day: hours[0].day,
    },
    hours,
    days,
  };
}
