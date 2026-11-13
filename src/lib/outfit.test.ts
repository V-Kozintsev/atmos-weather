import { describe, expect, it } from "vitest";
import { outfitForDay, outfitForHour } from "./outfit";
import type { Day, Hour } from "./weather";

const day: Day = {
  date: "2026-09-30", min: 8, max: 21, rain: 0, code: 0,
  sunrise: "2026-09-30T06:00", sunset: "2026-09-30T18:00", uv: 2,
};
const hour: Hour = {
  time: "2026-09-30T13:00", temperature: 19, feels: 17,
  rain: 0, wind: 5, code: 0, day: true,
};

describe("outfit advice", () => {
  it("treats cold rain above freezing as rain, not snow, and keeps the umbrella", () => {
    const advice = outfitForHour({ ...hour, temperature: 4, feels: -3, rain: 0.6, code: 61, wind: 22 });
    expect(advice.rain).toBe(true);
    expect(advice.snow).toBe(false);
    expect(advice.pieces.accessories).toContain("Зонт");
  });
  it("marks snow by the weather code or a sub-zero air temperature", () => {
    expect(outfitForHour({ ...hour, temperature: 1, feels: -4, rain: 0.4, code: 73 }).snow).toBe(true);
    expect(outfitForHour({ ...hour, temperature: -2, feels: -7, rain: 0.4, code: 61 }).snow).toBe(true);
    expect(outfitForHour({ ...hour, temperature: -2, feels: -7, rain: 0.4, code: 73 }).pieces.accessories).not.toContain("Зонт");
  });
  it("keeps a warmer layer for cooling during the next hour", () => {
    const advice = outfitForHour({ ...hour, feels: 23 }, undefined, { ...hour, time: "2026-09-30T14:00", feels: 18 });
    expect(advice.style).toBe("mild");
    expect(advice.pieces.outer).toBeDefined();
    expect(advice.note).toContain("к концу часа 18°");
  });
  it("does not dress a short outing for an unrelated distant or past hour", () => {
    for (const time of ["2026-09-30T23:00", "2026-09-30T12:00"]) {
      expect(outfitForHour({ ...hour, feels: 23 }, undefined, { ...hour, time, feels: 0 }).style).toBe("warm");
    }
  });
  it("adds wind protection without subtracting wind from apparent temperature twice", () => {
    const advice = outfitForHour({ ...hour, feels: 17, wind: 20 });
    expect(advice.feels).toBe(17);
    expect(advice.style).toBe("mild");
    expect(advice.pieces.outer).toBe("Куртка от ветра");
    expect(advice.note).toContain("ветер");
  });
  it("uses the nearest hour's apparent temperature", () => {
    const advice = outfitForHour({ ...hour, feels: 6 });
    expect(advice.style).toBe("cold");
    expect(advice.items).toContain("Тёплая куртка");
  });
  it("protects against rain in the nearest hour", () => {
    const advice = outfitForHour({ ...hour, rain: 0.5 });
    expect(advice.pieces.outer).toContain("Непромокаемый");
    expect(advice.pieces.shoes).toContain("Непромокаемые");
    expect(advice.pieces.accessories).toContain("Зонт");
    expect(outfitForHour({ ...hour, code: 95, rain: 0 }).pieces.accessories).toContain("Зонт");
  });
  it("uses the coldest remaining hour and includes the whole-day temperature range", () => {
    const advice = outfitForDay(day, [
      { ...hour, time: "2026-09-30T13:00", feels: 20 },
      { ...hour, time: "2026-09-30T21:00", feels: 8 },
    ], hour);
    expect(advice.title).toBe("Одевайтесь слоями");
    expect(advice.note).toContain("от 8° до 20°");
  });
  it("adds protection for later precipitation", () => {
    const advice = outfitForDay(day, [hour, { ...hour, time: "2026-09-30T18:00", rain: 0.7 }], hour);
    expect(advice.pieces.accessories).toContain("Зонт");
  });
  it("suggests winter shoes for freezing precipitation", () => {
    const advice = outfitForDay({ ...day, rain: 0.6 }, [{ ...hour, feels: -8, code: 71 }], hour);
    expect(advice.style).toBe("frost");
    expect(advice.pieces.shoes).toBe("Непромокаемые зимние ботинки");
    expect(advice.pieces.accessories).not.toContain("Зонт");
  });
  it("explains strengthening wind and adds a neck layer in chilly weather", () => {
    expect(outfitForDay(day, [hour, { ...hour, wind: 30 }], hour).note).toContain("ветер до");
    expect(outfitForDay(day, [hour], hour).note).not.toContain("ветер до");
    expect(outfitForHour({ ...hour, feels: 10, wind: 30 }).pieces.accessories).toContain("Снуд");
  });
  it("changes the full outfit for office and active styles", () => {
    const office = outfitForHour(hour, { occasion: "office", warmth: "balanced" });
    const sport = outfitForHour(hour, { occasion: "sport", warmth: "balanced" });
    expect(office.pieces.upper).toBe("Рубашка");
    expect(office.pieces.outer).toBe("Жакет или пиджак");
    expect(sport.pieces.upper).toBe("Лонгслив");
    expect(sport.pieces.shoes).toBe("Кроссовки");
  });
  it("uses cold sensitivity without changing the displayed weather", () => {
    const balanced = outfitForHour({ ...hour, feels: 16 });
    const warmer = outfitForHour({ ...hour, feels: 16 }, { occasion: "casual", warmth: "warmer" });
    expect(balanced.style).toBe("mild");
    expect(warmer.style).toBe("cool");
    expect(warmer.note).toContain("16° по ощущениям");
  });
});
