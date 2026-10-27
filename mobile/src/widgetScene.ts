import type { Forecast } from "../../src/lib/weather";

export type WidgetPeriod = "morning" | "day" | "evening" | "night";
export type WidgetWeather = "clear" | "cloud" | "fog" | "drizzle" | "freezing" | "rain" | "snow" | "storm" | "hail" | "wind" | "blowingSnow" | "heat" | "frost" | "unknown";

/** @param {Forecast["current"]} current - Измеренные условия. @returns {WidgetWeather} Приоритетная сцена без подмены осадков жарой или ветром. */
export function widgetWeather(current: Forecast["current"]): WidgetWeather {
  const { code, wind, feels } = current;
  if (code === 96 || code === 99) return "hail";
  if (code === 95) return "storm";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return wind >= 40 ? "blowingSnow" : "snow";
  if ([56, 57, 66, 67].includes(code)) return "freezing";
  if ([61, 63, 65, 80, 81, 82].includes(code)) return "rain";
  if ([51, 53, 55].includes(code)) return "drizzle";
  if (code === 45 || code === 48) return "fog";
  if (wind >= 40) return "wind";
  if (feels >= 30) return "heat";
  if (feels <= -15) return "frost";
  if ([1, 2, 3].includes(code)) return "cloud";
  return code === 0 ? "clear" : "unknown";
}

/** @param {Forecast} forecast - Город и часовой пояс. @param {number} now - Время отображения. @returns {WidgetPeriod} Время суток в городе, независимо от настроек фона приложения. */
export function widgetPeriod(forecast: Forecast, now = Date.now()): WidgetPeriod {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: forecast.timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const date = `${values.year}-${values.month}-${values.day}`;
  const time = `${values.hour}:${values.minute}`;
  const day = forecast.days.find((value) => value.date.slice(0, 10) === date);
  const sunrise = day?.sunrise?.slice(11, 16) || "06:00";
  const sunset = day?.sunset?.slice(11, 16) || "20:00";
  if (time < sunrise || time >= sunset) return "night";
  const hour = Number(values.hour);
  return hour < 10 ? "morning" : hour >= 17 ? "evening" : "day";
}

/** @param {WidgetWeather} weather - Приоритетная сцена. @returns {string | undefined} Уточнение опасных условий без выдачи официального предупреждения. */
export function widgetWeatherLabel(weather: WidgetWeather): string | undefined {
  return ({ freezing: "Ледяные осадки", blowingSnow: "Снег и сильный ветер", wind: "Сильный ветер", heat: "Жарко", frost: "Сильный мороз", hail: "Гроза с градом" } as Partial<Record<WidgetWeather, string>>)[weather];
}
