import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { OutfitAdvice, OutfitOccasion } from "../../src/lib/outfit";
import { ClothingItem, outfitPhotoItems, type ClothingPhoto } from "./OutfitPreview";
import { s } from "./ui";

/** @param {object} props - Рекомендация по одежде. @returns {React.JSX.Element} Компактный комплект по категориям с пояснением прогноза. */
export function OutfitDetails({ advice, gender, occasion }: { advice: OutfitAdvice; gender: "woman" | "man"; occasion: OutfitOccasion }): React.JSX.Element {
  const photos = outfitPhotoItems(advice, gender, occasion);
  const pieces: { label: string; text: string; photo?: ClothingPhoto }[] = [
    { label: "Верх", text: advice.pieces.upper, photo: photos.top },
    ...(advice.pieces.outer ? [{ label: "Верхний слой", text: advice.pieces.outer, photo: photos.outer }] : []),
    { label: "Низ", text: advice.pieces.lower, photo: photos.lower },
    { label: "Обувь", text: advice.pieces.shoes, photo: photos.shoes },
    ...advice.pieces.accessories.map((text) => ({ label: "С собой", text, photo: /зонт|дожд/i.test(text) ? "umbrella" as const : undefined })),
  ];
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title}>Ваш комплект</Text>
        <Text style={s.caption}>{pieces.length} {pieces.length === 1 ? "вещь" : pieces.length < 5 ? "вещи" : "вещей"}</Text>
      </View>
      <View style={styles.grid}>
        {pieces.map((piece) => (
          <View key={`${piece.label}:${piece.text}`} style={styles.piece}>
            <View style={styles.icon}>{piece.photo ? <ClothingItem item={piece.photo} size={44} /> : <Ionicons name="bag-handle-outline" size={22} color="#345b4c" />}</View>
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

const styles = StyleSheet.create({
  section: { gap: 10 },
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: "serif", fontSize: 25, lineHeight: 30, fontWeight: "600", color: "#21483e" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  piece: { width: "48%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 6, minHeight: 60, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 12, borderWidth: 1, borderColor: "#dde0d8", backgroundColor: "#fafbf6" },
  icon: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 10, lineHeight: 14, color: "#6c806e" },
  name: { fontSize: 13, lineHeight: 17, fontWeight: "600", color: "#294a3d" },
});
