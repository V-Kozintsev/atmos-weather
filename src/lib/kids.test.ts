import { describe, expect, it } from "vitest";
import { kidOutfit, pickupHint } from "./kids";
import type { Day, Hour } from "./weather";

const day: Day = { date: "2026-11-20", min: -5, max: 0, rain: 0, code: 3, sunrise: "2026-11-20T08:00", sunset: "2026-11-20T16:20", uv: 0 };
/** @param {number} feels - Ощущаемая температура. @param {Partial<Hour>} extra - Отличия. @returns {Hour[]} Часы с 7 до 19. */
function hours(feels: number, extra: Partial<Hour> = {}): Hour[] {
  return Array.from({ length: 13 }, (_, index) => ({ time: `2026-11-20T${String(index + 7).padStart(2, "0")}:00`, temperature: feels + 3, feels, rain: 0, wind: 5, code: 3, day: true, ...extra }));
}

describe("kids outfit", () => {
  it("puts a preschooler going to kindergarten into a winter overall with spare clothes", () => {
    const outfit = kidOutfit(day, hours(-6), hours(-6)[0], "preschool", "garden");
    expect(outfit.style).toBe("cold");
    expect(outfit.items).toContain("Зимний комбинезон");
    expect(outfit.items).toContain("Шапка-шлем");
    expect(outfit.extras).toContain("Запасные носки и колготки в шкафчик");
    expect(outfit.extras).toContain("Сменные варежки");
  });
  it("dresses a schoolchild in a jacket with snow pants instead of an overall", () => {
    const outfit = kidOutfit(day, hours(-6), hours(-6)[0], "school", "school");
    expect(outfit.items).toContain("Зимняя куртка");
    expect(outfit.items).not.toContain("Зимний комбинезон");
    expect(outfit.items.some((item) => item.startsWith("Полукомбинезон"))).toBe(true);
  });
  it("keeps a toddler a layer warmer than a schoolchild in the same weather", () => {
    const toddler = kidOutfit(day, hours(1), hours(1)[0], "toddler", "walk");
    const school = kidOutfit(day, hours(1), hours(1)[0], "school", "walk");
    expect(toddler.style).toBe("cold");
    expect(school.style).toBe("cool");
    expect(toddler.note).toContain("коляске");
  });
  it("adds waterproof layers and rubber boots in mild rain", () => {
    const outfit = kidOutfit({ ...day, rain: 2 }, hours(10, { rain: 1, code: 61 }), hours(10)[0], "preschool", "walk");
    expect(outfit.items).toContain("Непромокаемая куртка");
    expect(outfit.items.some((item) => item.startsWith("Резиновые сапоги"))).toBe(true);
    expect(outfit.extras).toContain("Зонт или дождевик в рюкзак");
  });
  it("warns to shorten walks in severe frost and hints the pickup weather", () => {
    const outfit = kidOutfit(day, hours(-24), hours(-24)[0], "preschool", "walk");
    expect(outfit.style).toBe("severe");
    expect(outfit.note).toContain("сократите прогулку");
    expect(pickupHint(hours(-4, { rain: 0.6, code: 71 }))).toBe("К 18:00 -4° по ощущениям, осадки — возьмите дождевик");
  });
});
