import type { OutfitAdvice, OutfitOccasion } from "../../src/lib/outfit";
import { outfitPhotoItems, type ClothingPhoto } from "./OutfitPreview";

export interface OutfitItem { label: string; text: string; photo?: ClothingPhoto }

/** @param {OutfitAdvice} advice - Комплект по погоде. @param {string} gender - Вариант одежды. @param {OutfitOccasion} occasion - Выбранный стиль. @returns {OutfitItem[]} Единый список категорий и фотографий для комплекта и поиска. */
export function outfitItems(advice: OutfitAdvice, gender: "woman" | "man", occasion: OutfitOccasion): OutfitItem[] {
  const photos = outfitPhotoItems(advice, gender, occasion);
  return [
    { label: "Верх", text: advice.pieces.upper, photo: photos.top },
    ...(advice.pieces.outer ? [{ label: "Верхний слой", text: advice.pieces.outer, photo: photos.outer }] : []),
    { label: "Низ", text: advice.pieces.lower, photo: photos.lower },
    { label: "Обувь", text: advice.pieces.shoes, photo: photos.shoes },
    ...advice.pieces.accessories.map((text) => ({ label: "С собой", text, photo: /шапк|головн/i.test(text) ? "hat" as const : /зонт|дожд/i.test(text) ? "umbrella" as const : undefined })),
  ];
}

/** @param {string} store - Магазин. @param {string} item - Название вещи. @param {string} gender - Вариант одежды. @returns {string} Обычная поисковая ссылка без партнёрских параметров. */
export function outfitSearchUrl(store: "ozon" | "wb", item: string, gender: "woman" | "man"): string {
  const query = encodeURIComponent(`${item} ${gender === "woman" ? "женские" : "мужские"}`);
  return store === "ozon" ? `https://www.ozon.ru/search/?text=${query}` : `https://www.wildberries.ru/catalog/0/search.aspx?search=${query}`;
}
