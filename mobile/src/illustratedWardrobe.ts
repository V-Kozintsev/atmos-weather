import type { WardrobePhoto } from "./wardrobeAssets";

export type CharacterGender = "woman" | "man";
export interface GarmentArt { markup: string; viewBox: string }

/** @param {WardrobePhoto} item - Подслой или аксессуар без растрового спрайта. @param {CharacterGender} gender - Крой. @param {string} id - Уникальный префикс SVG. @returns {GarmentArt} Статичный слой в координатах фигуры и область его миниатюры. */
export function garmentArt(item: WardrobePhoto, gender: CharacterGender, id: string): GarmentArt {
  const seam = 'fill="none" stroke="#263e38" stroke-opacity=".3" stroke-width="1.2" stroke-linecap="round"';
  if (/umbrella/.test(item)) return {
    viewBox: "164 53 116 307",
    markup: `<defs><linearGradient id="${id}canopy"><stop stop-color="#81948a"/><stop offset=".6" stop-color="#526d69"/><stop offset="1" stop-color="#314b4b"/></linearGradient></defs><path d="M169 117q46-101 103 0-15-10-27 0-12-11-26 0-14-12-26 0-13-9-24 0Z" fill="url(#${id}canopy)" stroke="#364e50" stroke-width="1.2"/><path d="M220 72q-22 17-27 45m27-45q20 20 25 45M220 63v268q0 17-13 17t-13-13" fill="none" stroke="#586563" stroke-width="2.4"/>`,
  };
  if (/socks/.test(item)) return {
    viewBox: "79 539 84 60",
    markup: `<path d="M87 542h24v52H84Zm43 0h24l3 52h-27Z" fill="#c6c2b0"/><path d="M88 550h23m20 0h23" ${seam}/>`,
  };
  if (/leggings/.test(item)) return {
    viewBox: "62 264 116 311",
    markup: `<path d="M67 270h106l-8 300h-32l-13-245-13 245H75Z" fill="${gender === "woman" ? "#7b8580" : "#505c60"}"/><path d="M120 275v41m-31 6-1 239m65-239-2 239" ${seam}/>`,
  };
  return {
    viewBox: "163 156 68 111",
    markup: `<rect x="174" y="169" width="46" height="86" rx="17" fill="#52635d"/><path d="M181 173v-9q15-16 30 0v9m-28 35h29v34h-29Z" ${seam}/>`,
  };
}
