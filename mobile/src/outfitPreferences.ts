import type { OutfitOccasion, WarmthPreference } from "../../src/lib/outfit";

export const occasionLabels: Record<OutfitOccasion, string> = { casual: "На каждый день", office: "Офис", sport: "Активный" };
export const warmthLabels: Record<WarmthPreference, string> = { warmer: "Мёрзну", balanced: "Обычно", lighter: "Мне жарко" };

/** @param {OutfitOccasion} occasion - Повседневный, офисный или активный сценарий. @param {WarmthPreference} warmth - Чувствительность к холоду. @returns {string} Подпись текущих настроек без открытия панели. */
export function outfitPreferenceSummary(occasion: OutfitOccasion, warmth: WarmthPreference): string {
  return `${occasion === "casual" ? "Повседневный" : occasionLabels[occasion]} · ${warmthLabels[warmth]}`;
}
