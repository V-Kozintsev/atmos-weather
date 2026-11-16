import { temperature, type Day, type Hour } from "./weather";

export type KidAge = "toddler" | "preschool" | "school";
export type KidPlan = "garden" | "school" | "walk";
export type KidStyle = "heat" | "warm" | "mild" | "cool" | "cold" | "frost" | "severe";

export interface KidOutfit {
  style: KidStyle;
  title: string;
  /** Вещи по порядку надевания: от первого слоя к обуви и аксессуарам. */
  items: string[];
  /** Что положить с собой или в шкафчик. */
  extras: string[];
  note: string;
  feels: number;
  rain: boolean;
}

export const kidAgeLabels: Record<KidAge, string> = { toddler: "1–3 года", preschool: "3–7 лет", school: "7–12 лет" };
export const kidPlanLabels: Record<KidPlan, string> = { garden: "В садик", school: "В школу", walk: "Гулять" };

/** Малыши в коляске почти не двигаются и мёрзнут быстрее, школьники активнее взрослых на прогулке. */
const ageShift: Record<KidAge, number> = { toddler: -3, preschool: 0, school: 2 };

/** @param {Hour} hour - Час прогноза. @returns {boolean} Ожидаются осадки. */
function wet(hour: Hour): boolean {
  return hour.rain >= 0.3 || (hour.code >= 51 && hour.code <= 86) || hour.code >= 95;
}

/** @param {number} comfort - Ощущаемая температура с поправкой на возраст. @returns {KidStyle} Ступень утепления. */
function kidStyle(comfort: number): KidStyle {
  if (comfort >= 22) return "heat";
  if (comfort >= 15) return "warm";
  if (comfort >= 8) return "mild";
  if (comfort >= 0) return "cool";
  if (comfort >= -10) return "cold";
  if (comfort >= -20) return "frost";
  return "severe";
}

const titles: Record<KidStyle, string> = {
  heat: "Лёгкая одежда и панама",
  warm: "Лёгкий слой сверху",
  mild: "Куртка и закрытая обувь",
  cool: "Демисезонный комплект",
  cold: "Зимний комплект",
  frost: "Тёплые слои и варежки",
  severe: "Сильный мороз",
};

/** @param {KidStyle} style - Ступень утепления. @param {KidAge} age - Возраст. @param {KidPlan} plan - Куда идёт ребёнок. @param {boolean} rain - Осадки. @param {number} feels - Ощущаемая температура. @returns {string[]} Вещи по слоям. */
function kidItems(style: KidStyle, age: KidAge, plan: KidPlan, rain: boolean, feels: number): string[] {
  const overall = age !== "school" && plan !== "school";
  const wetOuter = rain && feels > 2;
  switch (style) {
    case "heat": return ["Футболка", "Шорты или лёгкие брюки", "Сандалии", "Панама или кепка"];
    case "warm": return ["Лонгслив или футболка", "Лёгкие брюки", wetOuter ? "Дождевик" : "Кофта или ветровка", wetOuter ? "Резиновые сапоги" : "Кроссовки", "Кепка"];
    case "mild": return ["Лонгслив", "Флисовая кофта", wetOuter ? "Непромокаемая куртка" : "Демисезонная куртка", wetOuter ? "Непромокаемые брюки" : "Брюки", wetOuter ? "Резиновые сапоги с тёплым носком" : "Ботинки", "Тонкая шапка"];
    case "cool": return ["Водолазка или термобельё", "Флисовая кофта", overall ? (wetOuter ? "Непромокаемый демисезонный комбинезон" : "Демисезонный комбинезон") : "Демисезонная куртка", ...(overall ? [] : [wetOuter ? "Непромокаемые брюки" : "Утеплённые брюки"]), wetOuter ? "Непромокаемые ботинки" : "Демисезонные ботинки", "Шапка", "Снуд", "Перчатки"];
    case "cold": return ["Термобельё", "Флисовая кофта", overall ? "Зимний комбинезон" : "Зимняя куртка", ...(overall ? [] : ["Полукомбинезон или утеплённые брюки"]), "Зимние ботинки", "Шапка-шлем", "Непромокаемые варежки"];
    case "frost": return ["Термобельё с шерстью", "Флисовая кофта", overall ? "Тёплый зимний комбинезон" : "Тёплая зимняя куртка", ...(overall ? [] : ["Полукомбинезон"]), "Зимние ботинки или валенки", "Шапка-шлем", "Тёплые варежки", "Шарф или снуд на лицо"];
    case "severe": return ["Термобельё с шерстью", "Тёплый свитер", overall ? "Тёплый зимний комбинезон" : "Тёплая зимняя куртка", ...(overall ? [] : ["Полукомбинезон"]), "Валенки или зимние сапоги до −30°", "Шапка-шлем", "Варежки-краги", "Шарф на лицо"];
  }
}

/** @param {Day} day - День прогноза. @param {Hour[]} hours - Часы, когда ребёнок будет на улице. @param {Hour} fallback - Текущая погода. @param {KidAge} age - Возраст. @param {KidPlan} plan - Куда идёт ребёнок. @returns {KidOutfit} Комплект для ребёнка по самому холодному часу и осадкам за это время. */
export function kidOutfit(day: Day, hours: Hour[], fallback: Hour, age: KidAge, plan: KidPlan): KidOutfit {
  const span = hours.filter((hour) => Number.isFinite(hour.feels));
  const used = span.length ? span : [fallback];
  const feels = Math.min(...used.map((hour) => hour.feels));
  const rain = day.rain >= 0.5 || used.some(wet);
  const style = kidStyle(feels + ageShift[age]);
  const extras = [
    ...(plan === "garden" ? ["Запасные носки и колготки в шкафчик"] : []),
    ...(["cool", "cold", "frost", "severe"].includes(style) ? ["Сменные варежки"] : []),
    ...(rain && feels > 2 ? ["Зонт или дождевик в рюкзак"] : []),
  ];
  const notes = [`${Math.round(feels)}° по ощущениям`];
  if (rain) notes.push(feels > 0.5 ? "возможен дождь" : "возможен снег");
  if (age === "toddler") notes.push("для малыша в коляске — на слой теплее");
  if (style === "severe") notes.push("в сильный мороз сократите прогулку");
  return { style, title: titles[style], items: kidItems(style, age, plan, rain, feels), extras, note: `${notes.join(", ")}.`, feels, rain };
}

/** @param {Hour[]} hours - Часы дня. @param {boolean} fahrenheit - Единицы. @returns {string | undefined} Погода к 18:00, когда ребёнка обычно забирают. */
export function pickupHint(hours: Hour[], fahrenheit = false): string | undefined {
  const hour = hours.find((value) => Number(value.time.slice(11, 13)) === 18);
  if (!hour) return undefined;
  return `К 18:00 ${temperature(hour.feels, fahrenheit)}° по ощущениям${wet(hour) ? ", осадки — возьмите дождевик" : ""}`;
}
