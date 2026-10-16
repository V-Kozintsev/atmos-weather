import { Pressable, StyleSheet, View, type PressableStateCallbackType, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "./typography";
import Ionicons from "@expo/vector-icons/Ionicons";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import type { OutfitAdvice, OutfitOccasion } from "../../src/lib/outfit";
import { OutfitPreview } from "./OutfitPreview";
import { s } from "./ui";

/** @param {object} props - Комплект, предпочтения, вечерняя подсказка, компактный вариант и действие открытия. @returns {React.JSX.Element} Карточка образа с фотографиями вещей и заметной кнопкой. */
export function OutfitCard({ advice, gender, occasion, period, evening, compact = false, onPress }: {
  advice: OutfitAdvice;
  gender: "woman" | "man";
  occasion: OutfitOccasion;
  period: "hour" | "day";
  evening: string;
  compact?: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const title = advice.rain ? "На случай дождя" : ["heat", "warm"].includes(advice.style) ? "Сегодня налегке" : advice.style === "mild" ? "Лёгкий слой" : advice.style === "cool" ? "Утепляемся" : "Тёплые слои";
  /** @param {PressableStateCallbackType} state - Состояние нажатия. @returns {StyleProp<ViewStyle>} Оформление карточки с обратной связью при касании. */
  function cardStyle({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> { return [styles.card, pressed && styles.pressed]; }
  return <Pressable accessibilityRole="button" accessibilityLabel={`Подобрать образ. ${title}. ${advice.items.join(", ")}. ${evening}`} accessibilityHint="Открыть полный образ и рекомендации" onPress={onPress} android_ripple={{ color: "#cadcc9" }} style={cardStyle}>
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs><LinearGradient id="outfit-card-surface" x1="0" y1="0" x2="1" y2=".6"><Stop offset="0" stopColor="#f1f1e7" /><Stop offset="1" stopColor="#e0e5d1" /></LinearGradient></Defs>
      <Rect width="100%" height="100%" fill="url(#outfit-card-surface)" />
    </Svg>
    <View style={[styles.main, compact && styles.mainCompact]}>
      <View style={styles.copy}>
        <Text style={[s.eyebrow, styles.eyebrow]}>{period === "day" ? "ОБРАЗ НА ВЕСЬ ДЕНЬ" : "ОБРАЗ НА СЕГОДНЯ"}</Text>
        <Text style={[s.subtitle, styles.title]}>{title}</Text>
        <Text style={[s.caption, styles.evening]}>{evening}</Text>
        <View style={styles.cta}>
          <Text style={[s.chipText, styles.ctaText]}>Подобрать образ</Text>
          <View style={styles.arrow}><Ionicons name="arrow-forward" size={20} color="#f6f8ef" /></View>
        </View>
      </View>
      <View style={[styles.artwork, compact && styles.artworkCompact]} pointerEvents="none">
        <OutfitPreview advice={advice} gender={gender} occasion={occasion} />
      </View>
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#e9ecde", borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "#ccd5bc" },
  pressed: { opacity: .86 },
  main: { flexDirection: "row", alignItems: "center", padding: 16, minHeight: 168, gap: 4 },
  mainCompact: { padding: 12, minHeight: 140 },
  copy: { flex: 1, zIndex: 1, gap: 4 },
  eyebrow: { fontSize: 10, letterSpacing: 1, lineHeight: 15 },
  title: { fontSize: 21, lineHeight: 25, fontWeight: "700" },
  evening: { color: "#476456", fontSize: 13, lineHeight: 19 },
  cta: { backgroundColor: "#173f35", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6, paddingLeft: 12, paddingRight: 4, minHeight: 44, alignSelf: "flex-start", borderRadius: 24, marginTop: 3 },
  ctaText: { color: "#f6f8ef", fontSize: 13, fontWeight: "600", flexShrink: 1 },
  arrow: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#57715a" },
  artwork: { width: "42%", maxWidth: 190, height: 180, marginRight: -6 },
  artworkCompact: { width: "36%", height: 124 },
});
