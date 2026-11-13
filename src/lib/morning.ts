import { condition, temperature, type Forecast } from "./weather";
import { outfitForDay, type OutfitPreferences } from "./outfit";

export const morningTimes = ["06:30", "07:00", "07:30", "08:00", "08:30", "09:00"] as const;
export type MorningTime = (typeof morningTimes)[number];
export const defaultMorningTime: MorningTime = "07:30";

export interface MorningMessage { date: string; title: string; body: string }
export interface MorningNotification extends MorningMessage { at: number }

/** @param {unknown} value - Сохранённое значение. @returns {boolean} Одно из предложенных времени утреннего совета. */
export function isMorningTime(value: unknown): value is MorningTime {
  return typeof value === "string" && (morningTimes as readonly string[]).includes(value);
}

/** @param {string} text - Название вещи с заглавной буквы. @returns {string} То же название внутри фразы. */
function inline(text: string): string {
  return text.charAt(0).toLocaleLowerCase("ru") + text.slice(1);
}

/** @param {Forecast} forecast - Прогноз города. @param {string} date - День в местном времени города. @param {OutfitPreferences} preferences - Стиль и чувствительность к холоду. @param {boolean} fahrenheit - Единицы пользователя. @returns {MorningMessage | undefined} Короткий совет на светлое время дня или ничего, если часов этого дня в прогнозе нет. */
export function morningMessage(forecast: Forecast, date: string, preferences: OutfitPreferences, fahrenheit = false): MorningMessage | undefined {
  const day = forecast.days.find((value) => value.date === date);
  const hours = forecast.hours.filter((hour) => {
    const clock = Number(hour.time.slice(11, 13));
    return hour.time.startsWith(date) && clock >= 7 && clock <= 21 && Number.isFinite(hour.feels);
  });
  if (!day || !hours.length) return undefined;
  const advice = outfitForDay(day, hours, hours[0], preferences);
  const low = temperature(Math.min(...hours.map((hour) => hour.feels)), fahrenheit);
  const high = temperature(Math.max(...hours.map((hour) => hour.feels)), fahrenheit);
  const range = low === high ? `${low}°` : `от ${low}° до ${high}°`;
  const sky = advice.snow ? "Возможен снег" : advice.rain ? "Возможен дождь" : advice.wind >= 25 ? "Ветрено" : condition(day.code);
  const { outer, upper, lower, shoes, accessories } = advice.pieces;
  const wear = [outer, upper, lower, shoes].filter((item): item is string => Boolean(item)).map(inline);
  const extras = accessories.map(inline);
  return {
    date,
    title: `${forecast.city.name}: сегодня ${range} по ощущениям`,
    body: `${sky}. Наденьте: ${wear.join(", ")}.${extras.length ? ` Пригодятся: ${extras.join(", ")}.` : ""}`,
  };
}

/** @param {Forecast} forecast - Последний прогноз. @param {MorningTime} time - Время совета на устройстве. @param {OutfitPreferences} preferences - Стиль и комфорт. @param {boolean} fahrenheit - Единицы. @param {number} now - Текущее время устройства. @param {number} days - Сколько ближайших дней планировать. @returns {MorningNotification[]} Будущие утренние советы; уже прошедшее время пропускается. */
export function morningSchedule(forecast: Forecast, time: MorningTime, preferences: OutfitPreferences, fahrenheit: boolean, now: number, days = 3): MorningNotification[] {
  const [hours, minutes] = time.split(":").map(Number);
  return forecast.days.slice(0, days).flatMap((day) => {
    const [year, month, date] = day.date.split("-").map(Number);
    const at = new Date(year, month - 1, date, hours, minutes).getTime();
    if (!Number.isFinite(at) || at <= now + 60_000) return [];
    const message = morningMessage(forecast, day.date, preferences, fahrenheit);
    return message ? [{ ...message, at }] : [];
  });
}
