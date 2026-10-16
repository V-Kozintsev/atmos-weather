import { useState } from "react";
import { Image, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import type { OutfitAdvice, OutfitOccasion } from "../../src/lib/outfit";

const atlas = require("../assets/outfit-items.webp");
const hat = require("../assets/outfit-hat.webp");
export type ClothingPhoto = "tee" | "knit" | "blazer" | "jacket" | "trousers" | "skirt" | "loafers" | "sneakers" | "coat" | "parka" | "boots" | "umbrella" | "hat";
type Item = ClothingPhoto;
const cells: Record<Exclude<Item, "hat">, [number, number]> = {
  tee: [0, 0], knit: [1, 0], blazer: [2, 0], jacket: [3, 0],
  trousers: [0, 1], skirt: [1, 1], loafers: [2, 1], sneakers: [3, 1],
  coat: [0, 2], parka: [1, 2], boots: [2, 2], umbrella: [3, 2],
};

/** @param {object} props - Вещь и размер изображения. @returns {React.JSX.Element} Локальная фотография предмета без дополнительных запросов. */
export function ClothingItem({ item, size }: { item: Item; size: number }): React.JSX.Element {
  if (item === "hat") return <Image source={hat} resizeMode="contain" fadeDuration={0} style={{ width: size, height: size }} />;
  const [column, row] = cells[item];
  return <View style={{ width: size, height: size, overflow: "hidden" }}>
    <Image source={atlas} resizeMode="stretch" fadeDuration={0} style={{ position: "absolute", width: size * 4, height: size * 3, left: -column * size, top: -row * size }} />
  </View>;
}

/** @param {OutfitAdvice} advice - Рекомендованный комплект. @param {string} gender - Вариант одежды. @param {OutfitOccasion} occasion - Стиль. @returns {object} Общие фотографии категорий для карточки и списка вещей. */
export function outfitPhotoItems(advice: OutfitAdvice, gender: "woman" | "man", occasion: OutfitOccasion): { top: Item; outer: Item; lower: Item; shoes: Item } {
  const winter = advice.style === "cold" || advice.style === "frost";
  const outerName = advice.pieces.outer?.toLocaleLowerCase("ru") || "";
  const shoeName = advice.pieces.shoes.toLocaleLowerCase("ru");
  return {
    top: advice.pieces.upper.toLocaleLowerCase("ru").includes("футболка") ? "tee" : "knit",
    outer: winter || outerName.includes("пальто") ? gender === "woman" ? "coat" : "parka" : gender === "woman" ? "blazer" : "jacket",
    lower: advice.pieces.lower.toLocaleLowerCase("ru").includes("юбка") ? "skirt" : "trousers",
    shoes: winter || /ботин|ботильон|сапог/.test(shoeName) ? "boots" : /кед|кроссов/.test(shoeName) ? "sneakers" : gender === "woman" && occasion !== "sport" && !advice.rain ? "loafers" : "sneakers",
  };
}

/** @param {object} props - Погода, вариант одежды и стиль. @returns {React.JSX.Element} Композиция фотографий вещей, меняющаяся по погоде и предпочтениям. */
export function OutfitPreview({ advice, gender, occasion }: { advice: OutfitAdvice; gender: "woman" | "man"; occasion: OutfitOccasion }): React.JSX.Element {
  const [width, setWidth] = useState(120);
  const layered = Boolean(advice.pieces.outer);
  const photos = outfitPhotoItems(advice, gender, occasion);
  const upper = layered ? photos.outer : photos.top;
  const { lower, shoes } = photos;
  /** @param {LayoutChangeEvent} event - Реальная ширина иллюстрации. @returns {void} Масштабирует композицию без обрезки вещей. */
  function measure(event: LayoutChangeEvent): void {
    const layout = event.nativeEvent.layout;
    setWidth(Math.max(1, Math.min(layout.width, layout.height / 1.3)));
  }
  return <View onLayout={measure} style={styles.scene} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <View style={{ width, height: width * 1.3 }}>
    <View style={{ position: "absolute", right: width * .22, top: width * .4, transform: [{ rotate: "12deg" }] }}><ClothingItem item={lower} size={width * .68} /></View>
    <View style={{ position: "absolute", left: layered ? width * .24 : -width * .04, top: -width * .02, transform: [{ rotate: layered ? "9deg" : "-11deg" }] }}><ClothingItem item={upper} size={width * (layered ? .76 : .82)} /></View>
    {layered && <View style={{ position: "absolute", left: -width * .06, top: width * .05, transform: [{ rotate: "-12deg" }] }}><ClothingItem item={photos.top} size={width * .62} /></View>}
    <View style={{ position: "absolute", right: -width * .02, top: width * .54, transform: [{ rotate: "-18deg" }] }}><ClothingItem item={shoes} size={width * .66} /></View>
    {advice.rain && <View style={{ position: "absolute", right: -width * .02, top: 0, transform: [{ rotate: "14deg" }] }}><ClothingItem item="umbrella" size={width * .42} /></View>}
    </View>
  </View>;
}

const styles = StyleSheet.create({ scene: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" } });
