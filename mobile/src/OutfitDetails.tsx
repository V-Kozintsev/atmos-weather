import { useTimeTheme, type TimeTheme } from "./timeTheme";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Text, fontNames } from "./typography";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { OutfitAdvice, OutfitOccasion } from "../../src/lib/outfit";
import { ClothingItem } from "./OutfitPreview";
import { outfitItems } from "./outfitItems";
import { s } from "./ui";

/** @param {object} props - Рекомендация по одежде. @returns {React.JSX.Element} Компактный комплект по категориям с пояснением прогноза. */
export function OutfitDetails({ advice, gender, occasion }: { advice: OutfitAdvice; gender: "woman" | "man"; occasion: OutfitOccasion }): React.JSX.Element {
  const theme = useTimeTheme();
  const styles = createStyles(theme);
  const pieces = outfitItems(advice, gender, occasion);
  const { fontScale } = useWindowDimensions();
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>Ваш комплект</Text>
        <Text style={[s.caption, { color: theme.muted }]}>{pieces.length} {pieces.length === 1 ? "вещь" : pieces.length < 5 ? "вещи" : "вещей"}</Text>
      </View>
      <View style={styles.grid}>
        {pieces.map((piece) => (
          <View key={`${piece.label}:${piece.text}`} style={[styles.piece, fontScale > 1.25 && styles.pieceWide]}>
            <View style={styles.icon}>{piece.photo ? <ClothingItem item={piece.photo} size={54} /> : <Ionicons name="bag-handle-outline" size={22} color={theme.primary} />}</View>
            <View style={s.flex}>
              <Text style={[s.caption, styles.label]}>{piece.label}</Text>
              <Text style={[s.text, styles.name]}>{piece.text}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/** @param {TimeTheme} theme - Палитра времени суток. @returns {object} Стили с общими цветами интерфейса. */
const createStyles = (theme: TimeTheme) => StyleSheet.create({
  section: { gap: 10, borderTopWidth: 1, borderTopColor: theme.divider, paddingTop: 12 },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fontNames.heading, fontSize: 25, lineHeight: 30, fontWeight: "600", color: theme.primary },
  grid: { flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 8 },
  piece: { width: "47%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 68, paddingVertical: 4 },
  pieceWide: { width: "100%" },
  icon: { width: 54, height: 60, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 10, lineHeight: 14, color: theme.muted },
  name: { fontSize: 13, lineHeight: 17, fontWeight: "600", color: theme.primary },
});
