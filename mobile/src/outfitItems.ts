import type { OutfitAdvice, OutfitOccasion } from "../../src/lib/outfit";
import { outfitPhotoItems, type ClothingPhoto } from "./OutfitPreview";
import { accessoryPhoto, upperPhoto } from "./wardrobeSelection";
import { isPartnerTemplate, partnerLink } from "../../src/lib/partnerLinks";

// Шаблоны партнёрских ссылок задаются при сборке (EXPO_PUBLIC_OZON_LINK, EXPO_PUBLIC_WB_LINK) с местом {url}.
// Пока они не заданы, кнопки открывают обычный поиск без комиссии.
const partnerTemplates = { ozon: process.env.EXPO_PUBLIC_OZON_LINK, wb: process.env.EXPO_PUBLIC_WB_LINK };
export const partnerLinksEnabled = isPartnerTemplate(partnerTemplates.ozon) || isPartnerTemplate(partnerTemplates.wb);

export interface OutfitItem { label: string; text: string; photo?: ClothingPhoto }

/** @param {OutfitAdvice} advice - Комплект по погоде. @param {string} gender - Вариант одежды. @param {OutfitOccasion} occasion - Выбранный стиль. @returns {OutfitItem[]} Единый список категорий и фотографий для комплекта и поиска. */
export function outfitItems(advice: OutfitAdvice, gender: "woman" | "man", occasion: OutfitOccasion): OutfitItem[] {
  const photos = outfitPhotoItems(advice, gender, occasion);
  const upperLayers = advice.pieces.upper.split(/ и /);
  return [
    ...upperLayers.map((text, index) => ({ label: upperLayers.length > 1 ? index === 0 ? "Первый слой" : "Тёплый слой" : "Верх", text, photo: upperPhoto(text, gender, advice) })),
    ...(advice.pieces.outer ? [{ label: "Верхний слой", text: advice.pieces.outer, photo: photos.outer }] : []),
    { label: "Низ", text: advice.pieces.lower, photo: photos.lower },
    { label: "Обувь", text: advice.pieces.shoes, photo: photos.shoes },
    ...advice.pieces.accessories.map((text) => ({ label: "С собой", text, photo: accessoryPhoto(text, gender) })),
  ];
}

/** @param {string} store - Магазин. @param {string} item - Название вещи. @param {string} gender - Вариант одежды. @returns {string} Поиск в магазине; через партнёрскую ссылку, только если она задана при сборке. */
export function outfitSearchUrl(store: "ozon" | "wb", item: string, gender: "woman" | "man" | "kid"): string {
  const query = encodeURIComponent(`${item} ${gender === "woman" ? "женские" : gender === "kid" ? "детские" : "мужские"}`);
  const url = store === "ozon" ? `https://www.ozon.ru/search/?text=${query}` : `https://www.wildberries.ru/catalog/0/search.aspx?search=${query}`;
  return partnerLink(partnerTemplates[store], url);
}
