import { useTimeTheme, type TimeTheme } from "./timeTheme";
import { useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent, type PressableStateCallbackType, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "./typography";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { OutfitAdvice, OutfitOccasion } from "../../src/lib/outfit";
import { OutfitPreview } from "./OutfitPreview";
import { outfitCardSummary } from "./wardrobeSelection";

/** @param {object} props - Реальный комплект, вариант одежды, период, вечерняя подсказка и переход. @returns {React.JSX.Element} Компактная карточка образа с полной подписью и пропорциональными фотографиями вещей. */
export function OutfitCard({ advice, gender, occasion, period, evening, eveningTemperature, description, compact = false, onPress }: {
  advice: OutfitAdvice; gender: "woman" | "man"; occasion: OutfitOccasion; period: "hour" | "day"; evening: string; eveningTemperature?: string; description?: string; compact?: boolean; onPress: () => void;
}): React.JSX.Element {
  const theme = useTimeTheme();
  const styles = createStyles(theme);
  const [width, setWidth] = useState(350);
  const { fontScale } = useWindowDimensions();
  const stacked = width < 300 || fontScale > 1.3;
  const artworkSize = Math.min(compact ? 142 : 154, Math.max(130, width * .44));
  const title = advice.rain ? advice.feels <= 0 ? "Защита от снега" : "На случай дождя" : ["heat", "warm"].includes(advice.style) ? "Сегодня налегке" : advice.style === "mild" ? "Лёгкий слой" : "Тёплые слои";
  /** @param {LayoutChangeEvent} event - Фактическая ширина карточки внутри колонки. @returns {void} Перестраивает композицию при узкой карточке, сохраняя читаемость текста. */
  function measure(event: LayoutChangeEvent): void { setWidth(event.nativeEvent.layout.width); }
  /** @param {PressableStateCallbackType} state - Состояние касания. @returns {StyleProp<ViewStyle>} Отзыв карточки на нажатие. */
  function cardStyle({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> { return [styles.card, pressed && styles.pressed]; }
  return <Pressable onLayout={measure} accessibilityRole="button" accessibilityLabel={`Смотреть образ. ${title}. ${advice.items.join(", ")}. ${evening}`} accessibilityHint="Открыть полный комплект и рекомендации" onPress={onPress} android_ripple={{ color: theme.divider }} style={cardStyle}>
    <View style={[styles.main, compact && styles.compact, stacked && styles.stacked]}>
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>{period === "day" ? "ОБРАЗ НА ВЕСЬ ДЕНЬ" : "ЧТО НАДЕТЬ СЕГОДНЯ"}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description || outfitCardSummary(advice)}</Text>
        <View style={styles.cta}><Text style={styles.ctaText}>Смотреть образ</Text><Ionicons name="arrow-forward-outline" size={19} color={theme.accent} style={{ transform: [{ rotate: "-45deg" }] }} /></View>
      </View>
      <View pointerEvents="none" style={[styles.artwork, { width: artworkSize, height: artworkSize * 1.16 }, stacked && styles.artworkStacked]}>
        <OutfitPreview advice={advice} gender={gender} occasion={occasion} size={artworkSize} />
      </View>
    </View>
    <View style={styles.footer}><Ionicons name="moon-outline" color={theme.primary} size={21} /><Text style={styles.evening}>{eveningTemperature ? `К вечеру ${eveningTemperature} — ${evening.replace(/^На вечер\s*—\s*/i, "")}` : evening}</Text><Ionicons name="chevron-forward" size={18} color={theme.primary} /></View>
  </Pressable>;
}
/** @param {TimeTheme} theme - Палитра времени суток. @returns {object} Стили с общими цветами интерфейса. */
const createStyles = (theme: TimeTheme) => StyleSheet.create({
  card: { backgroundColor: "transparent" },
  pressed: { opacity: .85 },
  main: { flexDirection: "row", alignItems: "center", paddingVertical: 10, minHeight: 178, gap: 0 },
  compact: { paddingVertical: 5, minHeight: 166 },
  stacked: { flexDirection: "column", alignItems: "stretch", gap: 8 },
  copy: { flex: 1, minWidth: 0, gap: 7, zIndex: 1 },
  eyebrow: { fontSize: 9, lineHeight: 14, letterSpacing: 1.1, fontWeight: "700", color: theme.primary },
  title: { fontSize: 26, lineHeight: 31, fontWeight: "700", color: theme.primary, letterSpacing: -.7 },
  description: { fontSize: 14, lineHeight: 21, color: theme.muted },
  cta: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 32, marginTop: 9 },
  ctaText: { fontSize: 14, lineHeight: 21, fontWeight: "500", color: theme.accent, textDecorationLine: "underline" },
  artwork: { alignSelf: "center", alignItems: "center", justifyContent: "center" },
  artworkStacked: { alignSelf: "center" },
  footer: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.divider, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 47 },
  evening: { flex: 1, fontSize: 12, lineHeight: 19, color: theme.text },
});
