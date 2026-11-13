import type { Forecast, Hour } from "../../src/lib/weather";

export type WeatherSceneKind = "clear" | "partial" | "cloudy" | "drizzle" | "rain" | "heavy" | "showers" | "freezing" | "storm" | "hail" | "sleet" | "snow" | "heavy-snow" | "blizzard" | "snow-grains" | "fog" | "rime" | "wind" | "heat" | "frost" | "unknown";
export type WeatherScenePeriod = "morning" | "day" | "evening" | "night";
export interface WeatherSceneModel {
  kind: WeatherSceneKind;
  label: string;
  clouds: number;
  rain: number;
  snow: number;
  wind: number;
  fog: boolean;
  ice: boolean;
  storm: boolean;
  hail: boolean;
}

/** @param {Forecast["current"]} current - Текущие условия и исходный символ MET, если он доступен. @param {Hour | undefined} hour - Количество осадков в ближайший час. @returns {WeatherSceneModel} Сцена с приоритетом осадков над ветром, жарой и морозом; старый кэш поддерживается по WMO. */
export function weatherScene(current: Forecast["current"], hour?: Hour): WeatherSceneModel {
  const code = current.code;
  const symbol = typeof current.symbol === "string" ? current.symbol.replace(/_(day|night|polartwilight)$/, "").toLowerCase() : "";
  const wind = Math.max(0, Number.isFinite(current.wind) ? current.wind / 3.6 : 0);
  const result: WeatherSceneModel = { kind: "unknown", label: "Нет данных", clouds: .5, rain: 0, snow: 0, wind, fog: false, ice: false, storm: false, hail: false };
  const heavy = symbol.includes("heavy") || [55, 65, 67, 75, 82, 86, 99].includes(code) || (hour?.rain ?? 0) >= 5;
  const light = symbol.includes("light") || [51, 61, 71, 80, 85].includes(code);
  const snow = symbol.includes("snow") || [71, 73, 75, 77, 85, 86].includes(code);
  const sleet = symbol.includes("sleet");
  if ([96, 99].includes(code) || symbol.includes("hail")) return { ...result, kind: "hail", label: "Гроза с градом", clouds: 1, rain: .4, hail: true, storm: true };
  if (code === 95 || symbol.includes("thunder")) return { ...result, kind: "storm", label: snow ? "Гроза со снегом" : sleet ? "Гроза с мокрым снегом" : "Гроза", clouds: 1, rain: snow ? 0 : sleet ? .35 : .7, snow: snow ? .75 : sleet ? .4 : 0, storm: true };
  if ([56, 57, 66, 67].includes(code)) return { ...result, kind: "freezing", label: code < 60 ? "Ледяная морось" : "Ледяной дождь", clouds: .9, rain: heavy ? .7 : .35, ice: true };
  if (sleet) return { ...result, kind: "sleet", label: "Дождь со снегом", clouds: .85, rain: heavy ? .5 : .25, snow: heavy ? .65 : .35 };
  if (snow) {
    if (wind >= 11) return { ...result, kind: "blizzard", label: "Метель", clouds: 1, snow: 1 };
    if (code === 77) return { ...result, kind: "snow-grains", label: "Снежная крупа", clouds: .8, snow: .4 };
    return { ...result, kind: heavy ? "heavy-snow" : "snow", label: heavy ? "Сильный снег" : light ? "Небольшой снег" : "Снег", clouds: .85, snow: heavy ? 1 : light ? .4 : .65 };
  }
  if ([51, 53, 55].includes(code)) return { ...result, kind: "drizzle", label: "Морось", clouds: .85, rain: heavy ? .4 : .2 };
  if (symbol.includes("rain") || [61, 63, 65, 80, 81, 82].includes(code)) {
    const showers = symbol.includes("showers") || [80, 81, 82].includes(code);
    return { ...result, kind: heavy ? "heavy" : showers ? "showers" : "rain", label: heavy ? "Ливень" : showers ? "Кратковременный дождь" : light ? "Небольшой дождь" : "Дождь", clouds: showers ? .65 : 1, rain: heavy ? 1 : light ? .3 : .6 };
  }
  if (code === 48) return { ...result, kind: "rime", label: "Изморозь", clouds: .6, fog: true, ice: true };
  if (code === 45 || symbol.includes("fog")) return { ...result, kind: "fog", label: "Туман", clouds: .45, fog: true };
  if (![0, 1, 2, 3].includes(code)) return result;
  if (wind >= 11) return { ...result, kind: "wind", label: "Сильный ветер", clouds: code === 0 ? .15 : code === 3 ? 1 : .55 };
  if (current.feels >= 30) return { ...result, kind: "heat", label: code === 0 ? "Ясно" : code === 3 ? "Облачно" : "Переменная облачность", clouds: code === 0 ? 0 : code === 3 ? 1 : .4 };
  if (current.feels <= -15) return { ...result, kind: "frost", label: "Мороз", clouds: code === 0 ? .1 : code === 3 ? 1 : .4, ice: true };
  return { ...result, kind: code === 0 ? "clear" : code === 3 ? "cloudy" : "partial", label: code === 0 ? "Ясно" : code === 3 ? "Облачно" : "Переменная облачность", clouds: code === 0 ? 0 : code === 3 ? .95 : .4 };
}

/** @param {WeatherSceneModel} scene - Осадки, облачность и особые условия. @param {WeatherScenePeriod} period - Время суток в городе. @returns {[string, string]} Цвета неба без подмены ночи дневным оформлением. */
export function weatherScenePalette(scene: WeatherSceneModel, period: WeatherScenePeriod): [string, string] {
  if (period === "night") return scene.snow ? ["#223448", "#4b6372"] : ["#102139", "#344b60"];
  if (scene.storm) return ["#354653", "#76838b"];
  if (scene.snow) return ["#6f8798", "#b5c8cd"];
  if (period === "evening") return ["#313a57", scene.rain ? "#6e7588" : "#c59486"];
  if (period === "morning") return [scene.rain ? "#617681" : "#7d9dae", scene.rain ? "#a6b1ab" : "#e4c8a9"];
  return [scene.clouds > .65 ? "#526675" : "#527fa0", scene.fog ? "#a2b1af" : scene.kind === "heat" ? "#e9c787" : "#a8bfc5"];
}
