import type { ImageSourcePropType } from "react-native";
import type { WardrobePhoto } from "./wardrobeAssets";

export const illustratedAssets = {
  "women-blouse": require("../assets/illustrated/women-blouse.webp") as ImageSourcePropType,
  "men-shirt": require("../assets/illustrated/men-shirt.webp") as ImageSourcePropType,
  "women-knit": require("../assets/illustrated/women-knit.webp") as ImageSourcePropType,
  "men-knit": require("../assets/illustrated/men-knit.webp") as ImageSourcePropType,
  "women-cardigan": require("../assets/illustrated/women-cardigan.webp") as ImageSourcePropType,
  "women-coat": require("../assets/illustrated/women-coat.webp") as ImageSourcePropType,
  "men-coat": require("../assets/illustrated/men-coat.webp") as ImageSourcePropType,
  "men-raincoat": require("../assets/illustrated/men-raincoat.webp") as ImageSourcePropType,
  "women-windbreaker": require("../assets/illustrated/women-windbreaker.webp") as ImageSourcePropType,
  "men-jacket": require("../assets/illustrated/men-jacket.webp") as ImageSourcePropType,
  "women-puffer": require("../assets/illustrated/women-puffer.webp") as ImageSourcePropType,
  "men-parka": require("../assets/illustrated/men-parka.webp") as ImageSourcePropType,
  "women-trousers": require("../assets/illustrated/women-trousers.webp") as ImageSourcePropType,
  "men-chinos": require("../assets/illustrated/men-chinos.webp") as ImageSourcePropType,
  "women-skirt": require("../assets/illustrated/women-skirt.webp") as ImageSourcePropType,
  "men-shorts": require("../assets/illustrated/men-shorts.webp") as ImageSourcePropType,
  "women-boots": require("../assets/illustrated/women-boots.webp") as ImageSourcePropType,
  "men-winter-boots": require("../assets/illustrated/men-winter-boots.webp") as ImageSourcePropType,
  "men-sneakers": require("../assets/illustrated/men-sneakers.webp") as ImageSourcePropType,
  "women-loafers": require("../assets/illustrated/women-loafers.webp") as ImageSourcePropType,
  "women-tee": require("../assets/illustrated/women-tee.webp") as ImageSourcePropType,
  "men-tee": require("../assets/illustrated/men-tee.webp") as ImageSourcePropType,
  "women-sport-tee": require("../assets/illustrated/women-sport-tee.webp") as ImageSourcePropType,
  "men-sport-tee": require("../assets/illustrated/men-sport-tee.webp") as ImageSourcePropType,
  "women-blazer": require("../assets/illustrated/women-blazer.webp") as ImageSourcePropType,
  "men-blazer": require("../assets/illustrated/men-blazer.webp") as ImageSourcePropType,
  "women-longsleeve": require("../assets/illustrated/women-longsleeve.webp") as ImageSourcePropType,
  "men-longsleeve": require("../assets/illustrated/men-longsleeve.webp") as ImageSourcePropType,
  "women-shorts": require("../assets/illustrated/women-shorts.webp") as ImageSourcePropType,
  "women-joggers": require("../assets/illustrated/women-joggers.webp") as ImageSourcePropType,
  "men-joggers": require("../assets/illustrated/men-joggers.webp") as ImageSourcePropType,
  "women-sandals": require("../assets/illustrated/women-sandals.webp") as ImageSourcePropType,
  "hat-cream": require("../assets/illustrated/hat-cream.webp") as ImageSourcePropType,
  "hat-navy": require("../assets/illustrated/hat-navy.webp") as ImageSourcePropType,
  "scarf": require("../assets/illustrated/scarf.webp") as ImageSourcePropType,
  "snood": require("../assets/illustrated/snood.webp") as ImageSourcePropType,
  "gloves": require("../assets/illustrated/gloves.webp") as ImageSourcePropType,
  "umbrella-open": require("../assets/illustrated/umbrella-open.webp") as ImageSourcePropType,
  "sun-hat": require("../assets/illustrated/sun-hat.webp") as ImageSourcePropType,
  "sunglasses": require("../assets/illustrated/sunglasses.webp") as ImageSourcePropType,
  "gloves-left": require("../assets/illustrated/gloves-left.webp") as ImageSourcePropType,
  "gloves-right": require("../assets/illustrated/gloves-right.webp") as ImageSourcePropType,
} as const;

export interface GarmentSprite { source: ImageSourcePropType; bounds: [number, number, number, number] }

/** @param {WardrobePhoto} item - Вещь из рекомендаций. @returns {GarmentSprite | undefined} Общая иллюстрация и посадка слоя на фигуре для всех мест использования. */
export function garmentSprite(item: WardrobePhoto): GarmentSprite | undefined {
  const woman = item.startsWith("women");
  let key: keyof typeof illustratedAssets;
  let bounds: GarmentSprite["bounds"];
  if (/trousers|chinos|joggers|shorts|skirt/.test(item)) {
    key = /skirt/.test(item) ? "women-skirt" : /shorts/.test(item) ? woman ? "women-shorts" : "men-shorts" : /joggers/.test(item) ? woman ? "women-joggers" : "men-joggers" : woman ? "women-trousers" : "men-chinos";
    bounds = /skirt/.test(item) ? [48, 258, 145, 216] : /shorts/.test(item) ? [60, 258, 120, 95] : woman ? [67, 258, 106, 300] : [63, 258, 114, 302];
  } else if (/boots|loafers|sandals|sneakers|running/.test(item)) {
    key = /boots/.test(item) ? /winter|warm|rain/.test(item) ? "men-winter-boots" : "women-boots" : /loafers/.test(item) ? "women-loafers" : /sandals/.test(item) ? "women-sandals" : "men-sneakers";
    bounds = /boots/.test(item) ? [67, 550, 106, 70] : /loafers|sandals/.test(item) ? [67, 566, 106, 54] : [67, 557, 106, 63];
  } else if (item === "hat-cream" || item === "hat-navy" || item === "sun-hat" || item === "cap") {
    key = item === "cap" ? "sun-hat" : item;
    bounds = item === "sun-hat" || item === "cap" ? [65, 4, 110, 47] : [80, 3, 80, 44];
  } else if (item === "scarf" || item === "snood") {
    key = item; bounds = item === "scarf" ? [90, 96, 65, 122] : [91, 98, 62, 39];
  } else if (item === "sunglasses") {
    key = item; bounds = [89, 45, 62, 24];
  } else if (item === "gloves" || item === "mittens") {
    key = "gloves"; bounds = [42, 310, 157, 35];
  } else if (/umbrella/.test(item)) {
    return undefined;
  } else if (/socks|leggings|backpack/.test(item)) {
    return undefined;
  } else {
    key = /puffer/.test(item) ? "women-puffer" : /parka/.test(item) ? "men-parka" : /coat/.test(item) ? /rain/.test(item) ? "men-raincoat" : woman ? "women-coat" : "men-coat" : /rain|poncho/.test(item) ? "men-raincoat" : /blazer/.test(item) ? woman ? "women-blazer" : "men-blazer" : /cardigan/.test(item) ? "women-cardigan" : /windbreaker|jacket/.test(item) ? woman ? "women-windbreaker" : "men-jacket" : /blouse|shirt/.test(item) ? woman ? "women-blouse" : "men-shirt" : /knit|fleece/.test(item) ? woman ? "women-knit" : "men-knit" : /longsleeve|thermal|hoodie/.test(item) ? woman ? "women-longsleeve" : "men-longsleeve" : /sport-tee/.test(item) ? woman ? "women-sport-tee" : "men-sport-tee" : woman ? "women-tee" : "men-tee";
    const long = /coat|parka|puffer|poncho/.test(item);
    const tee = /tee/.test(item);
    bounds = long ? [29, 100, 182, /puffer/.test(item) ? 329 : 313] : /blazer|cardigan|jacket|windbreaker/.test(item) ? [30, 100, 180, 201] : [38, 100, 164, 194];
    if (tee) bounds = [38, 100, 164, 182];
  }
  return { source: illustratedAssets[key], bounds };
}
