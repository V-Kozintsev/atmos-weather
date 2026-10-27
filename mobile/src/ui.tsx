import { Pressable, StyleSheet } from "react-native";
import { Text, fontNames } from "./typography";

const fontFamily = fontNames.regular;

/** @param {object} props - Подпись, состояние выбора и действие. @returns {React.JSX.Element} Доступная кнопка с зоной касания не менее 48px. */
export function Chip({
  label,
  active = false,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[s.chip, active && s.active]}
    >
      <Text style={[s.chipText, active && s.activeText]}>{label}</Text>
    </Pressable>
  );
}

export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f8f2" },
  body: {
    padding: 20,
    gap: 16,
    paddingBottom: 32,
    maxWidth: 680,
    width: "100%",
    alignSelf: "center",
  },
  bodyWide: { maxWidth: 1080 },
  weatherBody: { paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, gap: 12 },
  outfitBody: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 16 },
  outfitEditorialBody: { paddingHorizontal: 18, paddingTop: 2 },
  outfitPageTitle: { fontFamily: fontNames.heading, fontSize: 29, lineHeight: 36, fontWeight: "600", color: "#21483e" },
  header: {
    width: "100%", maxWidth: 680, alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  brand: {
    fontFamily, fontSize: 20, lineHeight: 25,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: "#21483e",
  },
  headerWeather: { paddingHorizontal: 18, paddingVertical: 3 },
  weatherBrand: { fontFamily, fontSize: 18, lineHeight: 24, fontWeight: "800", letterSpacing: -.6, color: "#143e35" },
  weatherLocation: { fontSize: 14, lineHeight: 21, color: "#354d40" },
  caption: { fontFamily, fontSize: 14, lineHeight: 21, color: "#68756a" },
  text: { fontFamily, fontSize: 17, lineHeight: 26, color: "#354d40" },
  title: { fontFamily, fontSize: 25, fontWeight: "700", color: "#21483e" },
  subtitle: {
    fontFamily, fontSize: 19,
    lineHeight: 26,
    fontWeight: "600",
    color: "#21483e",
  },
  eyebrow: {
    fontFamily, fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#537661",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  flex: { flex: 1 },
  card: { padding: 20, borderRadius: 24, backgroundColor: "#fff", gap: 12 },
  chip: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    justifyContent: "center",
    backgroundColor: "#edf0e7",
  },
  active: { backgroundColor: "#21483e" },
  chipText: { fontFamily, fontSize: 15, fontWeight: "600", color: "#21483e" },
  activeText: { color: "#fff" },
  iconButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  photo: {
    height: 260,
    backgroundColor: "#e6ecdb",
    borderRadius: 24,
    overflow: "hidden",
  },
  model: { width: "100%", height: "100%" },
  nav: {
    width: "100%", maxWidth: 680, alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "#f7f8f2",
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#e6ebdf",
  },
  navItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, minHeight: 60 },
  navCompact: { paddingTop: 8, paddingBottom: 6 },
  navItemCompact: { minHeight: 48 },
  navSelection: { width: "100%", maxWidth: 128, minHeight: 48, paddingVertical: 4, paddingHorizontal: 2, borderRadius: 12, alignItems: "center", justifyContent: "center", gap: 2 },
  navIcon: {
    width: 40,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: { fontFamily, fontSize: 12, lineHeight: 16, fontWeight: "500", color: "#7b897e" },
  navLabelSelected: { fontWeight: "700", color: "#21483e" },
  navIndicator: { position: "absolute", top: 0, width: 28, height: 3, borderRadius: 2, backgroundColor: "transparent" },
  input: {
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 16,
    fontFamily, fontSize: 18,
    borderRadius: 18,
    backgroundColor: "#e9ede2",
    color: "#21483e",
  },
  notice: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f8e8cc",
    gap: 12,
  },
});
