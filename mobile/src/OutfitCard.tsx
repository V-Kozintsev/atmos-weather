import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { OutfitAdvice, OutfitOccasion } from "../../src/lib/outfit";
import { OutfitPreview } from "./OutfitPreview";
import { s } from "./ui";

/** @param {object} props - Комплект, предпочтения, вечерняя подсказка и действие открытия. @returns {React.JSX.Element} Адаптивная карточка гардероба с композицией вещей. */
export function OutfitCard({ advice, gender, occasion, period, evening, onPress }: {
  advice: OutfitAdvice;
  gender: "woman" | "man";
  occasion: OutfitOccasion;
  period: "hour" | "day";
  evening: string;
  onPress: () => void;
}): React.JSX.Element {
  const title = advice.rain ? "С защитой от осадков" : ["heat", "warm"].includes(advice.style) ? "Сегодня налегке" : advice.style === "mild" ? "Добавим лёгкий слой" : advice.style === "cool" ? "Время утеплиться" : "Сохраняем тепло";
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${advice.items.join(", ")}. ${evening}`} accessibilityHint="Открыть полный образ и рекомендации" onPress={onPress} android_ripple={{ color: "#cadcc9" }} style={styles.card}>
      <View style={styles.main}>
        <View style={styles.copy}>
          <Text style={[s.eyebrow, styles.eyebrow]}>{period === "day" ? "ОБРАЗ НА ВЕСЬ ДЕНЬ" : "ГАРДЕРОБ ПО ПОГОДЕ"}</Text>
          <Text style={[s.subtitle, styles.title]}>{title}</Text>
          <Text style={[s.caption, styles.description]}>{advice.pieces.outer || advice.pieces.upper}, {advice.pieces.lower.toLocaleLowerCase("ru")} и {advice.pieces.shoes.toLocaleLowerCase("ru")}</Text>
          <View style={styles.cta}>
            <Text style={[s.chipText, styles.ctaText]}>Подобрать</Text>
            <Ionicons name="arrow-forward" size={16} color="#f6f8ef" />
          </View>
        </View>
        <View style={styles.artwork} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <OutfitPreview advice={advice} gender={gender} occasion={occasion} />
        </View>
      </View>
      <View style={styles.footer}>
        <Ionicons name={advice.rain ? "umbrella-outline" : "shirt-outline"} size={21} color="#34584c" />
        <Text style={[s.caption, styles.footerText]}>{evening}</Text>
        <Ionicons name="chevron-forward" size={18} color="#34584c" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#e8eedf", borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: "#e0e8d5" },
  main: { flexDirection: "row", alignItems: "center", paddingTop: 12, paddingHorizontal: 16, paddingBottom: 10, minHeight: 150 },
  copy: { flex: 1, zIndex: 1, gap: 4 },
  eyebrow: { fontSize: 10, letterSpacing: 1, lineHeight: 15 },
  title: { fontSize: 21, lineHeight: 25, fontWeight: "700" },
  description: { color: "#476456", fontSize: 14, lineHeight: 20 },
  cta: { backgroundColor: "#21483e", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16, minHeight: 38, alignSelf: "flex-start", borderRadius: 20, marginTop: 4 },
  ctaText: { color: "#f6f8ef", fontSize: 14, fontWeight: "500" },
  artwork: { width: "40%", maxWidth: 220, height: 142, marginLeft: 2 },
  footer: { borderTopWidth: 1, borderTopColor: "#d8e2cc", marginHorizontal: 16, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 10 },
  footerText: { flex: 1, fontSize: 13, lineHeight: 19, color: "#3f5a4a" },
});
