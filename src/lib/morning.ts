import { condition, temperature, type Forecast, type Hour } from "./weather";
import { outfitForDay, outfitForHour, type OutfitPreferences } from "./outfit";
import { kidOutfit, type KidAge, type KidPlan } from "./kids";

/** Детский режим: совет утром составляется для ребёнка. */
export interface MorningKid { age: KidAge; plan: KidPlan }

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
export function morningMessage(forecast: Forecast, date: string, preferences: OutfitPreferences, fahrenheit = false, kid?: MorningKid): MorningMessage | undefined {
  const day = forecast.days.find((value) => value.date === date);
  const hours = forecast.hours.filter((hour) => {
    const clock = Number(hour.time.slice(11, 13));
    return hour.time.startsWith(date) && clock >= 7 && clock <= (kid ? 19 : 21) && Number.isFinite(hour.feels);
  });
  if (!day || !hours.length) return undefined;
  if (kid) {
    const outfit = kidOutfit(day, hours, hours[0], kid.age, kid.plan);
    const low = temperature(Math.min(...hours.map((hour) => hour.feels)), fahrenheit);
    const high = temperature(Math.max(...hours.map((hour) => hour.feels)), fahrenheit);
    const sky = outfit.rain ? (outfit.feels > 0.5 ? "Возможен дождь" : "Возможен снег") : condition(day.code);
    return {
      date,
      title: `${forecast.city.name}: ребёнку сегодня ${low === high ? `${low}°` : `от ${low}° до ${high}°`}`,
      body: `${sky}. ${outfit.items.join(", ")}.${outfit.extras.length ? ` С собой: ${outfit.extras.map((item) => item.charAt(0).toLocaleLowerCase("ru") + item.slice(1)).join(", ")}.` : ""}`,
    };
  }
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

/** @param {Hour} hour - Час прогноза. @returns {boolean} Ожидаются осадки. */
function wet(hour: Hour): boolean {
  return hour.rain >= 0.3 || (hour.code >= 51 && hour.code <= 86) || hour.code >= 95;
}

/** @param {Hour} hour - Час прогноза. @returns {boolean} Осадки выпадут снегом. */
function snowy(hour: Hour): boolean {
  return (hour.code >= 71 && hour.code <= 77) || hour.code === 85 || hour.code === 86 || hour.temperature <= 0.5;
}

/** @param {string} date - День. @param {number} hour - Час. @param {number} minutes - Минуты. @returns {number} Время на устройстве. */
function deviceTime(date: string, hour: number, minutes = 0): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, hour, minutes).getTime();
}

/** @param {Forecast} forecast - Прогноз. @param {string} date - День в местном времени города. @param {OutfitPreferences} preferences - Стиль и комфорт. @param {boolean} fahrenheit - Единицы. @returns {MorningNotification | undefined} Одно предупреждение за день: начало дождя или снега после 11:00 за час до него, иначе резкое похолодание к вечеру в 15:00. */
export function weatherAlert(forecast: Forecast, date: string, preferences: OutfitPreferences, fahrenheit = false): MorningNotification | undefined {
  const hours = forecast.hours.filter((hour) => hour.time.startsWith(date) && Number.isFinite(hour.feels));
  const clock = (hour: Hour) => Number(hour.time.slice(11, 13));
  for (let index = 1; index < hours.length; index++) {
    const hour = hours[index];
    if (clock(hour) < 11 || clock(hour) > 21) continue;
    if (!wet(hour) || wet(hours[index - 1])) continue;
    const snow = snowy(hour);
    const at = clock(hour);
    return {
      date, at: deviceTime(date, at - 1),
      title: `Около ${String(at).padStart(2, "0")}:00 начнётся ${snow ? "снег" : "дождь"}`,
      body: snow ? "Пригодятся шапка, перчатки и непромокаемая обувь." : "Захватите зонт и закрытую обувь.",
    };
  }
  const day = hours.filter((hour) => clock(hour) >= 12 && clock(hour) <= 15).map((hour) => hour.feels);
  const evening = hours.filter((hour) => clock(hour) >= 18 && clock(hour) <= 21);
  if (!day.length || !evening.length) return undefined;
  const coldest = evening.reduce((min, hour) => (hour.feels < min.feels ? hour : min));
  if (coldest.feels > Math.max(...day) - 6) return undefined;
  const advice = outfitForHour(coldest, preferences);
  const layer = advice.pieces.outer || advice.pieces.upper;
  return {
    date, at: deviceTime(date, 15),
    title: `К вечеру похолодает до ${temperature(coldest.feels, fahrenheit)}° по ощущениям`,
    body: `Возьмите с собой ${layer.charAt(0).toLocaleLowerCase("ru") + layer.slice(1)}.`,
  };
}

/** @param {Forecast} forecast - Последний прогноз. @param {OutfitPreferences} preferences - Стиль и комфорт. @param {boolean} fahrenheit - Единицы. @param {number} now - Текущее время устройства. @param {number} days - Сколько дней планировать. @returns {MorningNotification[]} Будущие предупреждения о погоде, не больше одного в день. */
export function alertSchedule(forecast: Forecast, preferences: OutfitPreferences, fahrenheit: boolean, now: number, days = 2): MorningNotification[] {
  return forecast.days.slice(0, days).flatMap((day) => {
    const alert = weatherAlert(forecast, day.date, preferences, fahrenheit);
    return alert && alert.at > now + 5 * 60_000 ? [alert] : [];
  });
}

/** @param {Forecast} forecast - Последний прогноз. @param {MorningTime} time - Время совета на устройстве. @param {OutfitPreferences} preferences - Стиль и комфорт. @param {boolean} fahrenheit - Единицы. @param {number} now - Текущее время устройства. @param {number} days - Сколько ближайших дней планировать. @returns {MorningNotification[]} Будущие утренние советы; уже прошедшее время пропускается. */
export function morningSchedule(forecast: Forecast, time: MorningTime, preferences: OutfitPreferences, fahrenheit: boolean, now: number, days = 3, kid?: MorningKid): MorningNotification[] {
  const [hours, minutes] = time.split(":").map(Number);
  return forecast.days.slice(0, days).flatMap((day) => {
    const [year, month, date] = day.date.split("-").map(Number);
    const at = new Date(year, month - 1, date, hours, minutes).getTime();
    if (!Number.isFinite(at) || at <= now + 60_000) return [];
    const message = morningMessage(forecast, day.date, preferences, fahrenheit, kid);
    return message ? [{ ...message, at }] : [];
  });
}
