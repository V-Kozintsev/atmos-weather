import { Pressable, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text } from "./typography";
import { useTimeTheme, type TimeTheme } from "./timeTheme";

/** @param {object} props - Время совета и ответы пользователя. @returns {React.JSX.Element} Разовое предложение получать утром совет, что надеть. */
export function MorningOffer({ time, busy, onAccept, onDismiss }: { time: string; busy: boolean; onAccept: () => void; onDismiss: () => void }): React.JSX.Element {
  const theme = useTimeTheme();
  const styles = createStyles(theme);
  return <View style={styles.offer}>
    <Ionicons name="notifications-outline" size={24} color={theme.accent} />
    <View style={styles.copy}>
      <Text style={styles.title}>Что надеть — утром</Text>
      <Text style={styles.text}>Пришлём короткий совет в {time}: погода на день и комплект. Время можно поменять в настройках.</Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={onAccept} style={({ pressed }) => [styles.primary, (pressed || busy) && styles.pressed]}><Text style={styles.primaryText}>{busy ? "Включаем…" : "Включить"}</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={onDismiss} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}><Text style={styles.secondaryText}>Не нужно</Text></Pressable>
      </View>
    </View>
  </View>;
}

/** @param {TimeTheme} theme - Палитра времени суток. @returns {object} Стили карточки предложения. */
const createStyles = (theme: TimeTheme) => StyleSheet.create({
  offer: { flexDirection: "row", gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderColor: theme.divider },
  copy: { flex: 1, gap: 6 },
  title: { fontSize: 17, lineHeight: 24, fontWeight: "600", color: theme.primary },
  text: { fontSize: 13, lineHeight: 20, color: theme.text },
  actions: { flexDirection: "row", gap: 10, marginTop: 4, flexWrap: "wrap" },
  primary: { minHeight: 44, paddingHorizontal: 18, borderRadius: 22, justifyContent: "center", backgroundColor: theme.primary },
  primaryText: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: theme.page },
  secondary: { minHeight: 44, paddingHorizontal: 14, justifyContent: "center" },
  secondaryText: { fontSize: 14, lineHeight: 20, color: theme.primary },
  pressed: { opacity: .6 },
});
