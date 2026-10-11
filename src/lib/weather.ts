export interface City {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}
export interface Hour {
  time: string;
  temperature: number;
  feels: number;
  rain: number;
  wind: number;
  code: number;
  day: boolean;
}
export interface Day {
  date: string;
  min: number;
  max: number;
  rain: number;
  code: number;
  sunrise: string;
  sunset: string;
  uv: number;
}
export interface Forecast {
  city: City;
  timezone: string;
  fetchedAt: number;
  current: {
    time: string;
    temperature: number;
    feels: number;
    humidity: number;
    wind: number;
    direction: number;
    pressure: number;
    code: number;
    day: boolean;
  };
  hours: Hour[];
  days: Day[];
}
export type Activity = "walk" | "run" | "cycle";
export const CITIES: City[] = [
  {
    id: "moscow",
    name: "Москва",
    country: "Россия",
    latitude: 55.7522,
    longitude: 37.6156,
  },
  {
    id: "spb",
    name: "Санкт-Петербург",
    country: "Россия",
    latitude: 59.9386,
    longitude: 30.3141,
  },
  {
    id: "krasnodar",
    name: "Краснодар",
    country: "Россия",
    latitude: 45.0448,
    longitude: 38.976,
  },
  {
    id: "london",
    name: "Лондон",
    country: "Великобритания",
    latitude: 51.5085,
    longitude: -0.1257,
  },
  {
    id: "tokyo",
    name: "Токио",
    country: "Япония",
    latitude: 35.6895,
    longitude: 139.6917,
  },
];

/** @param {number} code - Код WMO. @returns {string} Краткое описание погоды. */
export function condition(code: number): string {
  if (!Number.isFinite(code)) return "Нет данных";
  if (code === 0) return "Ясно";
  if (code <= 2) return "Переменная облачность";
  if (code === 3) return "Облачно";
  if (code <= 48) return "Туман";
  if (code <= 57) return "Морось";
  if (code <= 67 || (code >= 80 && code <= 82)) return "Дождь";
  if (code <= 77 || (code >= 85 && code <= 86)) return "Снег";
  return "Гроза";
}

/** @param {number} value - Градусы Цельсия. @param {boolean} fahrenheit - Перевести в °F. @returns {number} Округлённая температура. */
export function temperature(value: number, fahrenheit = false): number {
  return Math.round(fahrenheit ? (value * 9) / 5 + 32 : value);
}

/** @param {string} date - Дата без смещения из API. @returns {string} Часы и минуты в городе прогноза. */
export function clock(date: string): string {
  return date.slice(11, 16);
}

/** @param {string} date - Дата YYYY-MM-DD. @returns {string} Русское название дня недели без сдвига часового пояса. */
export function weekday(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("ru-RU", {
    weekday: "short",
    timeZone: "UTC",
  });
}

/** @param {Hour[]} hours - Часы прогноза. @param {Activity} activity - Вид активности. @returns {Hour | undefined} Самый подходящий дневной час среди допустимых. */
export function bestHour(hours: Hour[], activity: Activity): Hour | undefined {
  const limits = { walk: [0, 30, 30], run: [3, 25, 25], cycle: [5, 28, 20] }[
    activity
  ];
  return hours
    .filter(
      (h) =>
        h.day &&
        h.rain <= 0.2 &&
        h.feels >= limits[0] &&
        h.feels <= limits[1] &&
        h.wind <= limits[2] &&
        h.code < 95,
    )
    .sort(
      (a, b) =>
        a.rain * 10 +
        Math.abs(a.feels - 18) * 2 +
        a.wind -
        (b.rain * 10 + Math.abs(b.feels - 18) * 2 + b.wind),
    )[0];
}

/** @param {unknown} value - Сохранённое значение. @returns {boolean} Соответствие формату города и допустимым координатам. */
export function isCity(value: unknown): value is City {
  const c = value as City | null;
  return (
    !!c &&
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    c.name.length > 0 &&
    c.name.length < 120 &&
    typeof c.country === "string" &&
    c.country.length < 300 &&
    Number.isFinite(c.latitude) &&
    Math.abs(c.latitude) <= 90 &&
    Number.isFinite(c.longitude) &&
    Math.abs(c.longitude) <= 180
  );
}
