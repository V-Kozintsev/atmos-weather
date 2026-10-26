import type { ImageSourcePropType } from "react-native";
import { wardrobeAssets, type WardrobePhoto } from "./wardrobeAssets";

const folded = {
  menWindbreaker: require("../assets/flatlay/men-windbreaker.webp"),
  womenWindbreaker: require("../assets/flatlay/women-windbreaker.webp"),
  womenCoat: require("../assets/flatlay/women-coat.webp"),
  menCoat: require("../assets/flatlay/men-coat.webp"),
  longsleeve: require("../assets/flatlay/folded-longsleeve.webp"),
  knit: require("../assets/flatlay/folded-knit.webp"),
  shirt: require("../assets/flatlay/folded-shirt.webp"),
  tee: require("../assets/flatlay/folded-tee.webp"),
  joggers: require("../assets/flatlay/folded-joggers.webp"),
  trousers: require("../assets/flatlay/folded-sage-trousers.webp"),
  formal: require("../assets/flatlay/folded-formal-trousers.webp"),
  warm: require("../assets/flatlay/folded-warm-trousers.webp"),
} satisfies Record<string, ImageSourcePropType>;

/** @param {WardrobePhoto} item - Вещь из фактического комплекта. @returns {ImageSourcePropType} Подготовленная фотография для раскладки и списка, без примерки и сетевой генерации. */
export function flatlaySource(item: WardrobePhoto): ImageSourcePropType {
  if (item === "men-jacket" || item === "men-windbreaker") return folded.menWindbreaker;
  if (item === "women-windbreaker") return folded.womenWindbreaker;
  if (item === "women-coat") return folded.womenCoat;
  if (item === "men-coat") return folded.menCoat;
  if (/warm-trousers/.test(item)) return folded.warm;
  if (/formal-trousers/.test(item) || item === "men-trousers") return folded.formal;
  if (/joggers/.test(item)) return folded.joggers;
  if (/trousers|chinos/.test(item)) return folded.trousers;
  if (/longsleeve|thermal/.test(item) && !/leggings/.test(item)) return folded.longsleeve;
  if (/knit|fleece/.test(item)) return folded.knit;
  if (/blouse|shirt/.test(item)) return folded.shirt;
  if (/sport-tee/.test(item)) return folded.longsleeve;
  if (/tee/.test(item)) return folded.tee;
  return wardrobeAssets[item];
}
