import { illustratedMetrics } from "./illustratedMetrics";
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

export interface GarmentSprite { source: ImageSourcePropType; bounds: [number, number, number, number]; feet?: [number, number] }

/** @param {keyof typeof illustratedAssets} key - Растровый слой. @param {number} top - Высота верхнего края на фигуре. @param {number} height - Нужная высота без изменения пропорций. @returns {GarmentSprite} Посадка по исходному размеру и координаты манжет брюк. */
function spriteAtHeight(key: keyof typeof illustratedAssets, top: number, height: number): GarmentSprite {
  const metrics = illustratedMetrics[key];
  const width = height * metrics.width / metrics.height;
  const bounds: GarmentSprite["bounds"] = [120 - width / 2, top, width, height];
  const feet: [number, number] | undefined = "cuffs" in metrics ? [bounds[0] + metrics.cuffs[0] * width, bounds[0] + metrics.cuffs[1] * width] : undefined;
  return { source: illustratedAssets[key], bounds, feet };
}

/** @param {WardrobePhoto} item - Вещь из рекомендаций. @returns {GarmentSprite | undefined} Общая иллюстрация и посадка слоя на фигуре для всех мест использования. */
export function garmentSprite(item: WardrobePhoto): GarmentSprite | undefined {
  const woman = item.startsWith("women");
  let key: keyof typeof illustratedAssets;
  let bounds: GarmentSprite["bounds"];
  if (/trousers|chinos|joggers|shorts|skirt/.test(item)) {
    key = /skirt/.test(item) ? "women-skirt" : /shorts/.test(item) ? woman ? "women-shorts" : "men-shorts" : /joggers/.test(item) ? woman ? "women-joggers" : "men-joggers" : woman ? "women-trousers" : "men-chinos";
    return spriteAtHeight(key, 248, /skirt/.test(item) ? 258 : /shorts/.test(item) ? 110 : 302);
  }
  if (/boots|loafers|sandals|sneakers|running/.test(item)) {
    key = /boots/.test(item) ? /winter|warm|rain/.test(item) ? "men-winter-boots" : "women-boots" : /loafers/.test(item) ? "women-loafers" : /sandals/.test(item) ? "women-sandals" : "men-sneakers";
    const height = /boots/.test(item) ? 70 : /loafers|sandals/.test(item) ? 48 : 56;
    return spriteAtHeight(key, 620 - height, height);
  }
  if (item === "hat-cream" || item === "hat-navy" || item === "sun-hat" || item === "cap") {
    key = item === "cap" ? "sun-hat" : item;
    bounds = item === "sun-hat" || item === "cap" ? [65, 4, 110, 47] : [80, 3, 80, 44];
  } else if (item === "scarf" || item === "snood") {
    key = item; bounds = item === "scarf" ? [90, 96, 65, 122] : [91, 98, 62, 39];
  } else if (item === "sunglasses") {
    key = item; bounds = [89, 45, 62, 24];
  } else if (item === "gloves" || item === "mittens") {
    key = "gloves"; bounds = [42, 310, 157, 35];
  } else if (/umbrella|socks|leggings|backpack/.test(item)) {
    return undefined;
  } else {
    key = /puffer/.test(item) ? "women-puffer" : /parka/.test(item) ? "men-parka" : /coat/.test(item) ? /rain/.test(item) ? "men-raincoat" : woman ? "women-coat" : "men-coat" : /rain|poncho/.test(item) ? "men-raincoat" : /blazer/.test(item) ? woman ? "women-blazer" : "men-blazer" : /cardigan/.test(item) ? "women-cardigan" : /windbreaker|jacket/.test(item) ? woman ? "women-windbreaker" : "men-jacket" : /blouse|shirt/.test(item) ? woman ? "women-blouse" : "men-shirt" : /knit|fleece/.test(item) ? woman ? "women-knit" : "men-knit" : /longsleeve|thermal|hoodie/.test(item) ? woman ? "women-longsleeve" : "men-longsleeve" : /sport-tee/.test(item) ? woman ? "women-sport-tee" : "men-sport-tee" : woman ? "women-tee" : "men-tee";
    const long = /coat|parka|puffer|poncho/.test(item);
    const height = long ? /puffer/.test(item) ? 329 : 313 : /blazer|cardigan|jacket|windbreaker/.test(item) ? 210 : /longsleeve|thermal|hoodie/.test(item) ? 175 : /tee/.test(item) ? 170 : 200;
    return spriteAtHeight(key, 100, height);
  }
  return { source: illustratedAssets[key], bounds };
}
