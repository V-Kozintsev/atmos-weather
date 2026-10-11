import type { Day, Hour } from "./weather";

export type OutfitStyle = "heat" | "warm" | "mild" | "cool" | "cold" | "frost";
export type OutfitOccasion = "casual" | "office" | "sport";
export type WarmthPreference = "balanced" | "warmer" | "lighter";

export interface OutfitPreferences {
  gender?: "woman" | "man";
  occasion: OutfitOccasion;
  warmth: WarmthPreference;
}

export interface OutfitPieces {
  upper: string;
  outer?: string;
  lower: string;
  shoes: string;
  accessories: string[];
}

export interface OutfitAdvice {
  style: OutfitStyle;
  title: string;
  pieces: OutfitPieces;
  items: string[];
  note: string;
  rain: boolean;
  feels: number;
  wind: number;
}

export const defaultOutfitPreferences: OutfitPreferences = { occasion: "casual", warmth: "balanced" };

const wardrobes: Record<OutfitOccasion, Record<OutfitStyle, Omit<OutfitPieces, "accessories">>> = {
  casual: {
    heat: { upper: "Лёгкая футболка", lower: "Шорты или лёгкие брюки", shoes: "Открытая обувь" },
    warm: { upper: "Футболка", lower: "Лёгкие брюки", shoes: "Кеды" },
    mild: { upper: "Футболка", outer: "Лёгкая куртка", lower: "Брюки", shoes: "Кроссовки" },
    cool: { upper: "Свитер", outer: "Куртка", lower: "Брюки", shoes: "Закрытая обувь" },
    cold: { upper: "Свитер", outer: "Тёплая куртка", lower: "Брюки", shoes: "Тёплая закрытая обувь" },
    frost: { upper: "Тёплый слой", outer: "Зимняя куртка", lower: "Утеплённые брюки", shoes: "Зимняя обувь" },
  },
  office: {
    heat: { upper: "Льняная рубашка", lower: "Лёгкие брюки", shoes: "Лоферы" },
    warm: { upper: "Рубашка", lower: "Брюки", shoes: "Лоферы" },
    mild: { upper: "Рубашка", outer: "Жакет или пиджак", lower: "Брюки", shoes: "Закрытая обувь" },
    cool: { upper: "Рубашка и джемпер", outer: "Пальто", lower: "Брюки", shoes: "Ботинки" },
    cold: { upper: "Рубашка и тёплый джемпер", outer: "Тёплое пальто", lower: "Брюки", shoes: "Утеплённые ботинки" },
    frost: { upper: "Термослой и джемпер", outer: "Зимнее пальто", lower: "Утеплённые брюки", shoes: "Зимние ботинки" },
  },
  sport: {
    heat: { upper: "Спортивная футболка", lower: "Шорты", shoes: "Дышащие кроссовки" },
    warm: { upper: "Спортивная футболка", lower: "Лёгкие спортивные брюки", shoes: "Кроссовки" },
    mild: { upper: "Лонгслив", outer: "Лёгкая ветровка", lower: "Спортивные брюки", shoes: "Кроссовки" },
    cool: { upper: "Термолонгслив", outer: "Куртка от ветра", lower: "Спортивные брюки", shoes: "Закрытые кроссовки" },
    cold: { upper: "Термослой", outer: "Утеплённая куртка", lower: "Тёплые спортивные брюки", shoes: "Утеплённые кроссовки" },
    frost: { upper: "Термослой", outer: "Зимняя спортивная куртка", lower: "Утеплённые брюки", shoes: "Зимняя обувь" },
  },
};

const womensWardrobes: typeof wardrobes = {
  casual: {
    heat: { upper: "Лёгкая блуза", lower: "Льняная юбка миди", shoes: "Сандалии на плоской подошве" },
    warm: { upper: "Блуза с коротким рукавом", lower: "Юбка миди", shoes: "Лёгкие кеды" },
    mild: { upper: "Блуза", outer: "Кардиган", lower: "Брюки с высокой посадкой", shoes: "Лоферы" },
    cool: { upper: "Трикотажный джемпер", outer: "Пальто с поясом", lower: "Плотные брюки", shoes: "Ботильоны без каблука" },
    cold: { upper: "Тёплый джемпер", outer: "Утеплённое пальто", lower: "Тёплые брюки", shoes: "Утеплённые ботинки" },
    frost: { upper: "Термослой и джемпер", outer: "Длинный зимний пуховик", lower: "Утеплённые брюки", shoes: "Зимние ботинки" },
  },
  office: {
    heat: { upper: "Льняная блуза", lower: "Лёгкая юбка миди", shoes: "Лоферы" },
    warm: { upper: "Блуза", lower: "Юбка миди", shoes: "Лоферы" },
    mild: { upper: "Блуза", outer: "Приталенный жакет", lower: "Классические брюки", shoes: "Закрытые лоферы" },
    cool: { upper: "Блуза и джемпер", outer: "Пальто с поясом", lower: "Плотные классические брюки", shoes: "Ботильоны без каблука" },
    cold: { upper: "Блуза и тёплый джемпер", outer: "Утеплённое пальто", lower: "Тёплые классические брюки", shoes: "Утеплённые ботильоны" },
    frost: { upper: "Термослой и джемпер", outer: "Длинное зимнее пальто", lower: "Утеплённые брюки", shoes: "Зимние ботинки" },
  },
  sport: {
    heat: { upper: "Лёгкий спортивный топ свободного кроя", lower: "Спортивные шорты", shoes: "Дышащие беговые кроссовки" },
    warm: { upper: "Спортивная футболка женского кроя", lower: "Лёгкие джоггеры", shoes: "Беговые кроссовки" },
    mild: { upper: "Спортивный лонгслив", outer: "Лёгкая ветровка женского кроя", lower: "Джоггеры", shoes: "Беговые кроссовки" },
    cool: { upper: "Термолонгслив", outer: "Ветрозащитная куртка женского кроя", lower: "Плотные джоггеры", shoes: "Закрытые беговые кроссовки" },
    cold: { upper: "Термослой", outer: "Утеплённая спортивная куртка женского кроя", lower: "Тёплые джоггеры", shoes: "Утеплённые кроссовки" },
    frost: { upper: "Термослой и флисовая кофта", outer: "Зимняя спортивная куртка женского кроя", lower: "Утеплённые спортивные брюки", shoes: "Зимняя спортивная обувь" },
  },
};

/** @param {number} code - Код погоды. @returns {boolean} Дождь, снег или гроза. */
function hasPrecipitation(code: number): boolean {
  return (code >= 51 && code <= 86) || code >= 95;
}

/** @param {number} feels - Температура по ощущениям. @param {WarmthPreference} preference - Чувствительность к холоду. @returns {number} Температура для выбора слоёв. */
function comfortTemperature(feels: number, preference: WarmthPreference): number {
  return feels + (preference === "warmer" ? -4 : preference === "lighter" ? 4 : 0);
}

/** @param {OutfitPieces} pieces - Комплект по категориям. @returns {string[]} Краткий список вещей. */
function flattenPieces(pieces: OutfitPieces): string[] {
  return [pieces.upper, pieces.outer, pieces.lower, pieces.shoes, ...pieces.accessories].filter((item): item is string => Boolean(item));
}

/** @param {number} feels - Температура по ощущениям. @param {number} wind - Ветер. @param {boolean} rain - Осадки. @param {string} note - Объяснение. @param {OutfitPreferences} preferences - Стиль и комфорт. @returns {OutfitAdvice} Комплект одежды. */
function buildOutfit(feels: number, wind: number, rain: boolean, note: string, preferences: OutfitPreferences): OutfitAdvice {
  const comfort = comfortTemperature(feels, preferences.warmth);
  let style: OutfitStyle;
  let title: string;
  if (comfort >= 29) { style = "heat"; title = "Максимум лёгкости"; }
  else if (comfort >= 22) { style = "warm"; title = "Лёгкий комплект"; }
  else if (comfort >= 15) { style = "mild"; title = "Один дополнительный слой"; }
  else if (comfort >= 7) { style = "cool"; title = "Пора утеплиться"; }
  else if (comfort >= -3) { style = "cold"; title = "Тёплые слои"; }
  else { style = "frost"; title = "Защита от холода"; }
  const wardrobe = preferences.gender === "woman" ? womensWardrobes : wardrobes;
  const pieces: OutfitPieces = { ...wardrobe[preferences.occasion][style], accessories: [] };
  if (rain && preferences.gender === "woman" && preferences.occasion !== "sport" && ["mild", "cool"].includes(style)) {
    pieces.outer = "Непромокаемый плащ с поясом";
    pieces.shoes = "Непромокаемые ботинки";
  }
  if (style === "cold") pieces.accessories.push("Шапка");
  if (style === "frost") pieces.accessories.push("Шапка и перчатки");
  if (rain) pieces.accessories.push(feels <= 0 ? "Непромокаемая обувь" : preferences.occasion === "sport" ? "Защита от дождя" : "Зонт или дождевик");
  if (wind >= 25 && comfort > -3 && comfort < 22) pieces.accessories.push("Защита от ветра");
  return { style, title, pieces, items: flattenPieces(pieces), note, rain, feels, wind };
}

/** @param {Hour} hour - Ближайший час. @param {OutfitPreferences} preferences - Стиль и комфорт. @returns {OutfitAdvice} Образ для выхода сейчас. */
export function outfitForHour(hour: Hour, preferences: OutfitPreferences = defaultOutfitPreferences): OutfitAdvice {
  const rain = hour.rain >= 0.3 || hasPrecipitation(hour.code);
  const reasons = [`${Math.round(hour.feels)}° по ощущениям`];
  if (rain) reasons.push("возможны осадки");
  if (hour.wind >= 25) reasons.push(`ветер ${Math.round(hour.wind)} км/ч`);
  return buildOutfit(hour.feels, hour.wind, rain, `${reasons.join(", ")}.`, preferences);
}

/** @param {Day} day - Сегодня. @param {Hour[]} hours - Оставшиеся часы. @param {Hour} fallback - Текущая погода при отсутствии часов. @param {OutfitPreferences} preferences - Стиль и комфорт. @returns {OutfitAdvice} Комплект до конца дня. */
export function outfitForDay(day: Day, hours: Hour[], fallback: Hour, preferences: OutfitPreferences = defaultOutfitPreferences): OutfitAdvice {
  const relevant = hours.filter((hour) => Number.isFinite(hour.feels));
  const span = relevant.length ? relevant : [fallback];
  const min = Math.min(...span.map((hour) => hour.feels));
  const max = Math.max(...span.map((hour) => hour.feels));
  const wind = Math.max(...span.map((hour) => hour.wind));
  const rain = day.rain >= 0.5 || span.some((hour) => hour.rain >= 0.3 || hasPrecipitation(hour.code));
  const reasons = [min === max ? `${Math.round(min)}° по ощущениям` : `от ${Math.round(min)}° до ${Math.round(max)}° по ощущениям`];
  if (rain) reasons.push("возможны осадки");
  if (wind >= 25) reasons.push(`ветер до ${Math.round(wind)} км/ч`);
  const layers = max - min >= 9 && max >= 20 && min < 15;
  const advice = buildOutfit(min, wind, rain, `${reasons.join(", ")}.${layers ? " Верхний слой можно снять при потеплении." : ""}`, preferences);
  if (layers) advice.title = "Одевайтесь слоями";
  return advice;
}
