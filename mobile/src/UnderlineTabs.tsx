import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text } from "./typography";

export interface UnderlineChoice<T extends string> { value: T; label: string; icon?: keyof typeof Ionicons.glyphMap; weight?: number }

/** @param {object} props - Подписанная группа, варианты, выбранное значение и обработчик. @returns {React.JSX.Element} Текстовые вкладки с подчёркиванием без фоновых капсул. */
export function UnderlineTabs<T extends string>({ label, choices, value, onChange }: { label: string; choices: readonly UnderlineChoice<T>[]; value: T; onChange: (value: T) => void }): React.JSX.Element {
  const { fontScale } = useWindowDimensions();
  return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.row}>
    {choices.map((choice) => <Pressable key={choice.value} accessibilityRole="radio" accessibilityLabel={choice.label} accessibilityState={{ checked: choice.value === value }} onPress={() => onChange(choice.value)} style={[styles.option, { flex: choice.weight || 1 }]}>
      <View style={[styles.content, choice.icon && fontScale > 1.25 && styles.iconAbove, choice.value === value && styles.selected]}>
        {choice.icon && <Ionicons name={choice.icon} size={20} color={choice.value === value ? "#21483e" : "#6a7c70"} />}
        <Text style={[styles.label, choice.value === value && styles.selectedLabel]}>{choice.label}</Text>
      </View>
    </Pressable>)}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "stretch", gap: 8 },
  option: { minHeight: 44, alignItems: "center", justifyContent: "center", minWidth: 0 },
  content: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderBottomWidth: 2, borderBottomColor: "transparent", paddingVertical: 10, minWidth: 0, maxWidth: "100%" },
  selected: { borderBottomColor: "#21483e" },
  iconAbove: { flexDirection: "column" },
  label: { fontSize: 12, lineHeight: 18, color: "#6b7b70", flexShrink: 1, textAlign: "center" },
  selectedLabel: { color: "#21483e", fontWeight: "600" },
});
