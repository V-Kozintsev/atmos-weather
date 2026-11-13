import { describe, expect, it } from "vitest";
import { isMorningTime, morningMessage, morningSchedule } from "./morning";
import type { Day, Forecast, Hour } from "./weather";

/** @param {string} date - День. @param {number} feels - Ощущаемая температура днём. @param {Partial<Hour>} extra - Отличия часа. @returns {Hour[]} Часы с 00:00 до 23:00. */
function hoursFor(date: string, feels: number, extra: Partial<Hour> = {}): Hour[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    time: `${date}T${String(hour).padStart(2, "0")}:00`, temperature: feels + 2, feels: hour < 7 ? feels - 10 : feels,
    rain: 0, wind: 5, code: 0, day: hour >= 7 && hour < 18, ...extra,
  }));
}
/** @param {string} date - День. @param {number} min - Минимум. @param {number} max - Максимум. @returns {Day} День прогноза. */
function dayFor(date: string, min: number, max: number): Day {
  return { date, min, max, rain: 0, code: 0, sunrise: `${date}T07:30`, sunset: `${date}T17:00`, uv: 1 };
}
const forecast: Forecast = {
  city: { id: "moscow", name: "Москва", country: "Россия", latitude: 55.75, longitude: 37.62 },
  timezone: "Europe/Moscow", fetchedAt: 0,
  current: { time: "2026-11-13T10:00", temperature: 3, feels: 0, humidity: 80, wind: 10, direction: 0, pressure: 1010, code: 3, day: true },
  hours: [...hoursFor("2026-11-13", 0), ...hoursFor("2026-11-14", 6, { rain: 1, code: 61 }), ...hoursFor("2026-11-15", -8)],
  days: [dayFor("2026-11-13", -2, 3), dayFor("2026-11-14", 4, 8), dayFor("2026-11-15", -10, -5), dayFor("2026-11-16", -6, -1)],
};
const preferences = { occasion: "casual" as const, warmth: "balanced" as const, gender: "man" as const };

describe("morning advice", () => {
  it("describes the daytime outfit with the outer layer first", () => {
    const message = morningMessage(forecast, "2026-11-13", preferences);
    expect(message?.title).toBe("Москва: сегодня 0° по ощущениям");
    expect(message?.body).toBe("Ясно. Наденьте: тёплая куртка, свитер, брюки, тёплая закрытая обувь, шапка, шарф, перчатки.");
  });
  it("ignores the cold night hours and warns about rain", () => {
    const message = morningMessage(forecast, "2026-11-14", preferences);
    expect(message?.title).toContain("6°");
    expect(message?.body.startsWith("Возможен дождь.")).toBe(true);
    expect(message?.body).toContain("зонт");
  });
  it("skips days without hourly data", () => {
    expect(morningMessage(forecast, "2026-11-16", preferences)).toBeUndefined();
  });
  it("plans only future mornings in device time", () => {
    const now = new Date(2026, 10, 13, 10, 0).getTime();
    const schedule = morningSchedule(forecast, "07:30", preferences, false, now);
    expect(schedule.map((item) => item.date)).toEqual(["2026-11-14", "2026-11-15"]);
    expect(new Date(schedule[0].at).getHours()).toBe(7);
    expect(new Date(schedule[0].at).getMinutes()).toBe(30);
  });
  it("accepts only offered times", () => {
    expect(isMorningTime("07:30")).toBe(true);
    expect(isMorningTime("7:30")).toBe(false);
    expect(isMorningTime(null)).toBe(false);
  });
});
