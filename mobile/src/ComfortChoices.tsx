import { Pressable, StyleSheet, View } from "react-native";
import type { WarmthPreference } from "../../src/lib/outfit";
import { ComfortIcon, type ComfortSymbol } from "./ComfortIcon";
import { Text } from "./typography";
import { useTimeTheme } from "./timeTheme";

const choices: { value: WarmthPreference; label: string; icon: ComfortSymbol }[] = [
  { value: "warmer", label: "Мёрзну", icon: "cold" }, { value: "balanced", label: "Обычно", icon: "neutral" }, { value: "lighter", label: "Мне жарко", icon: "hot" },
];

/** @param {object} props - Текущий комфорт и действие выбора. @returns {React.JSX.Element} Три открытых варианта с иконками, линией и радиоиндикатором из макета. */
export function ComfortChoices({ value, onChange }: { value: WarmthPreference; onChange: (value: WarmthPreference) => void }): React.JSX.Element {
  const theme = useTimeTheme();
  return <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel="Как переносите холод?">{choices.map((choice) => <Pressable key={choice.value} accessibilityRole="radio" accessibilityLabel={choice.label} accessibilityState={{ checked: value === choice.value }} onPress={() => onChange(choice.value)} style={styles.choice}>
    <ComfortIcon kind={choice.icon} color={theme.primary} /><Text style={[styles.label, { color: theme.primary }, value === choice.value && styles.selectedLabel]}>{choice.label}</Text><View style={[styles.line, value === choice.value && { backgroundColor: theme.accent }]} /><View style={[styles.ring, { borderColor: theme.primary }]}>{value === choice.value && <View style={[styles.dot, { backgroundColor: theme.accent }]} />}</View>
  </Pressable>)}</View>;
}
const styles = StyleSheet.create({ choices: { flexDirection: "row", gap: 10 }, choice: { flex: 1, minHeight: 110, alignItems: "center", paddingVertical: 8, gap: 9 }, label: { fontSize: 14, color: "#293d32", textAlign: "center" }, selectedLabel: { fontWeight: "700" }, line: { height: 3, borderRadius: 2, width: "100%", backgroundColor: "transparent" }, selectedLine: { backgroundColor: "#284c37" }, ring: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: "#304b3d", alignItems: "center", justifyContent: "center" }, selectedRing: { borderColor: "#284c37" }, dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#284c37" } });
