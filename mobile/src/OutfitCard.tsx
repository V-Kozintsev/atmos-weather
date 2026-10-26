import { useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent, type PressableStateCallbackType, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "./typography";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { OutfitAdvice, OutfitOccasion } from "../../src/lib/outfit";
import { OutfitPreview } from "./OutfitPreview";
import { outfitCardSummary } from "./wardrobeSelection";

/** @param {object} props - Реальный комплект, вариант одежды, период, вечерняя подсказка и переход. @returns {React.JSX.Element} Компактная карточка образа с полной подписью и пропорциональными фотографиями вещей. */
export function OutfitCard({ advice, gender, occasion, period, evening, compact = false, onPress }: {
  advice: OutfitAdvice; gender: "woman" | "man"; occasion: OutfitOccasion; period: "hour" | "day"; evening: string; compact?: boolean; onPress: () => void;
}): React.JSX.Element {
  const [width, setWidth] = useState(350);
  const { fontScale } = useWindowDimensions();
  const stacked = width < 310 || fontScale > 1.25;
  const title = advice.rain ? advice.feels <= 0 ? "Защита от снега" : "На случай дождя" : ["heat", "warm"].includes(advice.style) ? "Сегодня налегке" : advice.style === "mild" ? "Лёгкий слой" : "Тёплые слои";
  /** @param {LayoutChangeEvent} event - Фактическая ширина карточки внутри колонки. @returns {void} Перестраивает композицию при узкой карточке, сохраняя читаемость текста. */
  function measure(event: LayoutChangeEvent): void { setWidth(event.nativeEvent.layout.width); }
  /** @param {PressableStateCallbackType} state - Состояние касания. @returns {StyleProp<ViewStyle>} Отзыв карточки на нажатие. */
  function cardStyle({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> { return [styles.card, pressed && styles.pressed]; }
  return <Pressable onLayout={measure} accessibilityRole="button" accessibilityLabel={`Смотреть образ. ${title}. ${advice.items.join(", ")}. ${evening}`} accessibilityHint="Открыть полный комплект и рекомендации" onPress={onPress} android_ripple={{ color: "#e4e8db" }} style={cardStyle}>
    <View style={[styles.main, compact && styles.compact, stacked && styles.stacked]}>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{period === "day" ? "ОБРАЗ НА ВЕСЬ ДЕНЬ" : "ЧТО НАДЕТЬ СЕГОДНЯ"}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{outfitCardSummary(advice)}</Text>
        <View style={styles.cta}><Text style={styles.ctaText}>Смотреть образ</Text><Ionicons name="arrow-forward" size={17} color="#21483e" /></View>
      </View>
      <View pointerEvents="none" style={[styles.artwork, stacked && styles.artworkStacked]}>
        <View style={[styles.light, advice.rain && styles.rainLight]} />
        <OutfitPreview advice={advice} gender={gender} occasion={occasion} />
      </View>
    </View>
    <View style={styles.footer}><Ionicons name="moon-outline" color="#345b4c" size={18} /><Text style={styles.evening}>{evening}</Text><Ionicons name="chevron-forward" size={16} color="#527060" /></View>
  </Pressable>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: "#fdfdf8", borderRadius: 22, borderWidth: 1, borderColor: "#e1e3d8", shadowColor: "#3d4632", shadowOpacity: .055, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  pressed: { opacity: .85 },
  main: { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingLeft: 16, paddingRight: 10, minHeight: 150, gap: 4 },
  compact: { paddingVertical: 11, paddingLeft: 13, minHeight: 142 },
  stacked: { flexDirection: "column", alignItems: "stretch", gap: 8 },
  copy: { flex: 1, minWidth: 0, gap: 5, zIndex: 1 },
  eyebrow: { fontSize: 10, lineHeight: 15, letterSpacing: .7, fontWeight: "600", color: "#657662" },
  title: { fontSize: 21, lineHeight: 26, fontWeight: "700", color: "#21483e" },
  description: { fontSize: 13, lineHeight: 19, color: "#4d6254" },
  cta: { flexDirection: "row", alignItems: "center", gap: 9, minHeight: 28, marginTop: 3 },
  ctaText: { fontSize: 12, lineHeight: 18, fontWeight: "600", color: "#21483e", textDecorationLine: "underline" },
  artwork: { width: 138, height: 152, alignSelf: "center", alignItems: "center", justifyContent: "center" },
  artworkStacked: { alignSelf: "center", width: 190, height: 162 },
  light: { position: "absolute", width: 130, height: 122, borderRadius: 62, right: -3, backgroundColor: "#f0eee1", opacity: .55 },
  rainLight: { backgroundColor: "#e6ece9" },
  footer: { borderTopWidth: 1, borderTopColor: "#e8e9df", paddingHorizontal: 13, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 9, minHeight: 37 },
  evening: { flex: 1, fontSize: 12, lineHeight: 18, color: "#4c6555" },
});
