import { Platform, Pressable, StyleSheet, Text } from "react-native";

const fontFamily = Platform.OS === "web" ? 'system-ui, -apple-system, "Segoe UI", sans-serif' : undefined;

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
  columns: { gap: 16 },
  columnsWide: { flexDirection: "row", alignItems: "flex-start" },
  column: { flex: 1, minWidth: 0, gap: 16 },
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
    fontFamily, fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1.5,
    color: "#21483e",
  },
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
  hero: { padding: 18, borderRadius: 26, backgroundColor: "#21483e", gap: 4, overflow: "hidden" },
  heroLabel: {
    color: "#d3dfce",
    fontFamily, fontSize: 12,
    letterSpacing: 1.4,
    fontWeight: "700",
  },
  degrees: {
    fontFamily, fontSize: 66,
    fontWeight: "300",
    color: "#f7f8f2",
    letterSpacing: -3,
  },
  heroTitle: { color: "#f7f8f2", fontFamily, fontSize: 20, fontWeight: "600" },
  heroText: { color: "#dce6d8", fontFamily, fontSize: 15, lineHeight: 22 },
  horizontal: { gap: 10 },
  hour: {
    minWidth: 86,
    padding: 14,
    alignItems: "center",
    gap: 10,
    borderRadius: 22,
    backgroundColor: "#233f4d",
  },
  hourCaption: { fontFamily, fontSize: 14, lineHeight: 21, color: "#d1e0e8" },
  hourDegrees: { fontFamily, fontSize: 25, fontWeight: "600", color: "#f7fafb" },
  weatherIconWell: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#233f4d", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  day: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    borderRadius: 14,
    paddingHorizontal: 8,
  },
  dayName: { width: 76, fontFamily, fontSize: 16, color: "#21483e", fontWeight: "600" },
  photo: {
    height: 260,
    backgroundColor: "#e6ecdb",
    borderRadius: 24,
    overflow: "hidden",
  },
  outfitHeading: { gap: 4 },
  outfitControls: { gap: 8 },
  model: { width: "100%", height: "100%" },
  nav: {
    width: "100%", maxWidth: 680, alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#e6ebdf",
  },
  navItem: { flex: 1, alignItems: "center", gap: 4, minHeight: 60 },
  navIcon: {
    borderRadius: 20,
    width: 58,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  navSelected: { backgroundColor: "#e6ecdb" },
  navLabel: { fontFamily, fontSize: 12, fontWeight: "600", color: "#537661" },
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
