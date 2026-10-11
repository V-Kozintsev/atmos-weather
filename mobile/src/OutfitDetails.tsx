import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { OutfitAdvice } from "../../src/lib/outfit";
import { s } from "./ui";

/** @param {object} props - Рекомендация по одежде. @returns {React.JSX.Element} Компактный комплект по категориям с пояснением прогноза. */
export function OutfitDetails({ advice }: { advice: OutfitAdvice }): React.JSX.Element {
  const pieces: { label: string; text: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { label: "Верх", text: advice.pieces.upper, icon: "shirt-outline" },
    ...(advice.pieces.outer ? [{ label: "Верхний слой", text: advice.pieces.outer, icon: "layers-outline" as const }] : []),
    { label: "Низ", text: advice.pieces.lower, icon: "walk-outline" },
    { label: "Обувь", text: advice.pieces.shoes, icon: "footsteps-outline" },
    ...advice.pieces.accessories.map((text) => ({ label: "С собой", text, icon: "bag-handle-outline" as const })),
  ];
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={s.title}>{advice.title}</Text>
        <Text style={s.caption}>{advice.note}</Text>
      </View>
      <View style={styles.grid}>
        {pieces.map((piece) => (
          <View key={`${piece.label}:${piece.text}`} style={styles.piece}>
            <View style={styles.icon}><Ionicons name={piece.icon} size={19} color="#345b4c" /></View>
            <View style={s.flex}>
              <Text style={[s.caption, styles.label]}>{piece.label}</Text>
              <Text style={[s.text, styles.name]}>{piece.text}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={[s.caption, styles.note]}>Фото — пример утепления. Ориентируйтесь на комплект и свой комфорт.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  heading: { gap: 3 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8, backgroundColor: "#fff", padding: 10, borderRadius: 22 },
  piece: { width: "48%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 64, paddingVertical: 9, paddingHorizontal: 8, borderRadius: 14, backgroundColor: "#f1f5ec" },
  icon: { width: 28, height: 28, borderRadius: 9, backgroundColor: "#e1ebda", alignItems: "center", justifyContent: "center" },
  label: { fontSize: 10, lineHeight: 14, color: "#6c806e" },
  name: { fontSize: 15, lineHeight: 20, fontWeight: "500", color: "#294a3d" },
  note: { fontSize: 12, lineHeight: 17, paddingHorizontal: 2 },
});
