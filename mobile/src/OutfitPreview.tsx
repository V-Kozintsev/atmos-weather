import { IllustratedGarment } from "./CharacterScene";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import type { OutfitAdvice, OutfitOccasion } from "../../src/lib/outfit";
import { type WardrobePhoto } from "./wardrobeAssets";
import { selectWardrobe } from "./wardrobeSelection";

type LegacyPhoto = "tee" | "knit" | "blazer" | "jacket" | "trousers" | "skirt" | "loafers" | "sneakers" | "coat" | "parka" | "boots" | "umbrella" | "hat";
export type ClothingPhoto = WardrobePhoto | LegacyPhoto;
const legacy: Record<LegacyPhoto, WardrobePhoto> = { tee: "men-tee", knit: "men-knit", blazer: "women-blazer", jacket: "men-jacket", trousers: "men-chinos", skirt: "women-skirt", loafers: "women-loafers", sneakers: "men-sneakers", coat: "women-coat", parka: "men-parka", boots: "men-boots", umbrella: "umbrella-folded", hat: "hat-cream" };

/** @param {object} props - Идентификатор вещи и размер контейнера. @returns {React.JSX.Element} Иллюстрация того же слоя, который надевается на персонажа, с сохранением пропорций. */
export function ClothingItem({ item, size }: { item: ClothingPhoto; size: number }): React.JSX.Element {
  const photo = item in legacy ? legacy[item as LegacyPhoto] : item as WardrobePhoto;
  return <IllustratedGarment item={photo} size={size} />;
}

/** @param {OutfitAdvice} advice - Комплект из прогноза. @param {string} gender - Крой вещей. @param {OutfitOccasion} occasion - Стиль комплекта. @returns {object} Единые идентификаторы одежды для персонажа, карточки и списка. */
export function outfitPhotoItems(advice: OutfitAdvice, gender: "woman" | "man", occasion: OutfitOccasion) {
  return selectWardrobe(advice, gender, occasion);
}

/** @param {object} props - Реальный комплект и его предпочтения. @returns {React.JSX.Element} Статичная композиция основных вещей без растяжения, обрезки и сетевых запросов. */
export function OutfitPreview({ advice, gender, occasion, size: requestedSize }: { advice: OutfitAdvice; gender: "woman" | "man"; occasion: OutfitOccasion; size?: number }): React.JSX.Element {
  const { width: screenWidth } = useWindowDimensions();
  const size = requestedSize ?? (screenWidth >= 768 ? 148 : 126);
  const photos = selectWardrobe(advice, gender, occasion);
  const upper = advice.pieces.outer ? photos.outer : photos.top;
  const accessories = photos.accessories.slice(0, 2);
  return <View style={styles.scene} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <View style={{ width: size, height: size * 1.16 }}>
      <View style={{ position: "absolute", right: -size * .07, top: size * .1, transform: [{ rotate: "10deg" }] }}><ClothingItem item={photos.lower} size={size * .98} /></View>
      <View style={{ position: "absolute", left: -size * .09, top: 0, transform: [{ rotate: "-8deg" }] }}><ClothingItem item={upper} size={size} /></View>
      {advice.pieces.outer && <View style={{ position: "absolute", left: size * .04, bottom: size * .03, transform: [{ rotate: "-7deg" }] }}><ClothingItem item={photos.top} size={size * .56} /></View>}
      <View style={{ position: "absolute", right: -size * .02, bottom: 0, transform: [{ rotate: "-10deg" }] }}><ClothingItem item={photos.shoes} size={size * .58} /></View>
      {accessories.map((photo, index) => <View key={`${photo}:${index}`} style={{ position: "absolute", right: index ? -size * .02 : size * .03, top: index ? size * .36 : -size * .02, transform: [{ rotate: index ? "12deg" : "-8deg" }] }}><ClothingItem item={photo} size={size * .3} /></View>)}
    </View>
  </View>;
}
const styles = StyleSheet.create({ scene: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" } });
