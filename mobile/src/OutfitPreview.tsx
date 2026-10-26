import { useId } from "react";
import { Image, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import type { OutfitAdvice, OutfitOccasion } from "../../src/lib/outfit";
import type { WardrobePhoto } from "./wardrobeAssets";
import { selectWardrobe } from "./wardrobeSelection";
import { flatlaySource } from "./flatlayAssets";
import { useTimeTheme } from "./timeTheme";

type LegacyPhoto = "tee" | "knit" | "blazer" | "jacket" | "trousers" | "skirt" | "loafers" | "sneakers" | "coat" | "parka" | "boots" | "umbrella" | "hat";
export type ClothingPhoto = WardrobePhoto | LegacyPhoto;
const legacy: Record<LegacyPhoto, WardrobePhoto> = { tee: "men-tee", knit: "men-knit", blazer: "women-blazer", jacket: "men-jacket", trousers: "men-chinos", skirt: "women-skirt", loafers: "women-loafers", sneakers: "men-sneakers", coat: "women-coat", parka: "men-parka", boots: "men-boots", umbrella: "umbrella-folded", hat: "hat-cream" };

/** @param {object} props - Вещь и размер её контейнера. @returns {React.JSX.Element} Готовый вырез предмета с сохранением пропорций, общий для всех экранов. */
export function ClothingItem({ item, size }: { item: ClothingPhoto; size: number }): React.JSX.Element {
  const photo = item in legacy ? legacy[item as LegacyPhoto] : item as WardrobePhoto;
  return <Image source={flatlaySource(photo)} resizeMode="contain" fadeDuration={0} accessible={false} style={{ width: size, height: size }} />;
}

/** @param {OutfitAdvice} advice - Комплект из прогноза. @param {string} gender - Крой вещей. @param {OutfitOccasion} occasion - Стиль комплекта. @returns {object} Единые идентификаторы предметов для раскладки и списка. */
export function outfitPhotoItems(advice: OutfitAdvice, gender: "woman" | "man", occasion: OutfitOccasion) {
  return selectWardrobe(advice, gender, occasion);
}

/** @param {object} props - Комплект, вариант одежды, размер и мягкая подложка. @returns {React.JSX.Element} Раскладка отдельных вещей без манекена, стыковки частей тела и сетевой генерации. */
export function OutfitPreview({ advice, gender, occasion, size: requestedSize, backdrop = false }: { advice: OutfitAdvice; gender: "woman" | "man"; occasion: OutfitOccasion; size?: number; backdrop?: boolean }): React.JSX.Element {
  const theme = useTimeTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { width: screenWidth } = useWindowDimensions();
  const size = requestedSize ?? (screenWidth >= 768 ? 148 : 126);
  const photos = selectWardrobe(advice, gender, occasion);
  const upper = advice.pieces.outer ? photos.outer : photos.top;
  const accessories = photos.accessories.slice(0, 3);
  return <View style={styles.scene} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <View style={{ width: size, height: size * .9 }}>
      {backdrop && <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 90" preserveAspectRatio="none"><Defs><RadialGradient id={`${id}linen`} cx="50%" cy="50%" rx="50%" ry="50%"><Stop offset="0%" stopColor={theme.dark ? "#b2b9ac" : "#e9e0ce"} stopOpacity={theme.dark ? .42 : .48} /><Stop offset="100%" stopColor={theme.page} stopOpacity={0} /></RadialGradient></Defs><Ellipse cx={50} cy={45} rx={50} ry={44} fill={`url(#${id}linen)`} /></Svg>}
      <View style={{ position: "absolute", left: size * .07, top: size * .08, transform: [{ rotate: "-12deg" }] }}><ClothingItem item={upper} size={size * .66} /></View>
      {advice.pieces.outer && <View style={{ position: "absolute", right: size * .06, top: size * .24, transform: [{ rotate: "9deg" }] }}><ClothingItem item={photos.top} size={size * .49} /></View>}
      <View style={{ position: "absolute", right: size * .06, bottom: size * .06, transform: [{ rotate: "13deg" }] }}><ClothingItem item={photos.lower} size={size * .5} /></View>
      <View style={{ position: "absolute", left: size * .065, bottom: size * .065, transform: [{ rotate: "-12deg" }] }}><ClothingItem item={photos.shoes} size={size * .45} /></View>
      {accessories.map((photo, index) => <View key={`${photo}:${index}`} style={{ position: "absolute", right: size * (.05 + index * .19), top: size * .13, transform: [{ rotate: index % 2 ? "-10deg" : "8deg" }] }}><ClothingItem item={photo} size={size * .22} /></View>)}
    </View>
  </View>;
}
const styles = StyleSheet.create({ scene: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" } });
