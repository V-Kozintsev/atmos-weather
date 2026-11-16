import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { City } from "../../src/lib/weather";
import type { WarmthPreference } from "../../src/lib/outfit";
import { ComfortChoices } from "./ComfortChoices";
import { ClothingItem } from "./OutfitPreview";
import { UnderlineTabs } from "./UnderlineTabs";
import { Text } from "./typography";

interface Props {
  context?: "welcome" | "outfit"; city?: City; gender: "woman" | "man"; warmth: WarmthPreference; saving: boolean; error: string;
  onCity: () => void; onGender: (value: "woman" | "man") => void; onWarmth: (value: WarmthPreference) => void; onDone: (skipped: boolean) => void;
  /** Утренний совет предлагается сразу: до повторного запуска доходит лишь малая часть новых пользователей. */
  morning?: { enabled: boolean; time: string; onChange: (enabled: boolean) => void };
  onWidget?: () => void;
  /** Детский режим: родители выбирают его сразу, вместо взрослого варианта одежды. */
  kid?: { enabled: boolean; onChange: (enabled: boolean) => void };
}

/** @param {Props} props - Настройки первого запуска без регистрации. @returns {React.JSX.Element} Открытая редакционная композиция с настройками и пропуском из утверждённого макета. */
export function FirstRun({ context = "welcome", city, gender, warmth, saving, error, onCity, onGender, onWarmth, onDone, morning, onWidget, kid }: Props): React.JSX.Element {
  /** @param {"woman" | "man" | "kid"} value - Для кого подбирать. @returns {void} Включает детский режим или взрослый вариант. */
  function chooseAudience(value: "woman" | "man" | "kid"): void {
    if (value === "kid") { kid?.onChange(true); return; }
    kid?.onChange(false);
    onGender(value);
  }
  const habits = context === "welcome" && Platform.OS === "android" && (morning || onWidget);
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><Text style={styles.brand}>{context === "outfit" ? "Ваш комплект" : "Погода и что надеть"}</Text><Pressable accessibilityRole="button" onPress={() => onDone(true)} disabled={saving} style={styles.touch}><Text style={styles.link}>Пропустить</Text></Pressable></View>
    <Text style={styles.title}>{context === "outfit" ? "Одежда под ваш\nкомфорт" : "Совет под вашу\nпогоду"}</Text><Text style={styles.subtitle}>Пара настроек — и можно выходить.</Text>
    {context === "welcome" && <Pressable accessibilityRole="button" accessibilityLabel="Выбрать город" onPress={onCity} style={styles.city}><Ionicons name="location-outline" size={24} color="#243d32" /><Text style={styles.cityName}>{city?.name || "Выбрать город"}</Text><Text style={styles.link}>Изменить</Text></Pressable>}
    <View style={styles.group}><Text style={styles.heading}>Для кого подбирать</Text><UnderlineTabs label="Для кого подбирать" choices={[{ value: "woman" as const, label: "Женский" }, { value: "man" as const, label: "Мужской" }, ...(kid ? [{ value: "kid" as const, label: "Ребёнку" }] : [])]} value={kid?.enabled ? "kid" : gender} onChange={chooseAudience} /></View>
    <View style={styles.group}><Text style={styles.heading}>Как переносите холод?</Text><ComfortChoices value={warmth} onChange={onWarmth} /></View>
    {habits && <View style={styles.group}><Text style={styles.heading}>Каждый день</Text>
      {morning && <View style={styles.habit}><Ionicons name="notifications-outline" size={22} color="#243d32" /><View style={styles.habitCopy}><Text style={styles.habitTitle}>Утренний совет в {morning.time}</Text><Text style={styles.habitHint}>Погода на день и что надеть — одним уведомлением</Text></View><Switch accessibilityLabel="Утренний совет" value={morning.enabled} onValueChange={morning.onChange} trackColor={{ false: "#cbd0cb", true: "#4e7161" }} thumbColor="#ffffff" /></View>}
      {onWidget && <Pressable accessibilityRole="button" onPress={onWidget} style={styles.habit}><Ionicons name="home-outline" size={22} color="#243d32" /><View style={styles.habitCopy}><Text style={styles.habitTitle}>Виджет на главный экран</Text><Text style={styles.habitHint}>Температура и совет без открытия приложения</Text></View><Text style={styles.link}>Добавить</Text></Pressable>}
    </View>}
    <View style={styles.art} accessible={false}><View style={styles.jacket}><ClothingItem item={gender === "man" ? "men-jacket" : "women-coat"} size={175} /></View><View style={styles.trousers}><ClothingItem item={gender === "man" ? "men-chinos" : "women-trousers"} size={155} /></View><View style={styles.knit}><ClothingItem item={gender === "man" ? "men-knit" : "women-knit"} size={140} /></View></View>
    {!!error && <Text accessibilityRole="alert" style={styles.note}>{error}</Text>}<Pressable accessibilityRole="button" onPress={() => onDone(false)} disabled={saving} style={styles.primary}><Text style={styles.primaryText}>{saving ? "Сохраняем…" : context === "outfit" ? "Показать мой комплект →" : "Показать мой день →"}</Text></Pressable><Text style={styles.note}>Настройки можно изменить позже</Text>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#f5f1e9" }, content: { flexGrow: 1, width: "100%", maxWidth: 510, alignSelf: "center", paddingHorizontal: 24, paddingBottom: 20 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 8 }, brand: { fontSize: 17, fontWeight: "700", color: "#23382d", flexShrink: 1 }, touch: { minHeight: 44, justifyContent: "center" }, link: { fontSize: 14, color: "#274e3d", textDecorationLine: "underline" }, title: { fontSize: 36, lineHeight: 40, color: "#203a2d", fontWeight: "700", marginTop: 22 }, subtitle: { fontSize: 16, lineHeight: 24, color: "#42483e", marginTop: 12, marginBottom: 10 }, city: { minHeight: 66, flexDirection: "row", gap: 10, alignItems: "center", borderBottomWidth: 1, borderColor: "#d2c9bc" }, cityName: { flex: 1, fontSize: 18, fontWeight: "500", color: "#25382e" }, group: { paddingTop: 16, paddingBottom: 8, borderBottomWidth: 1, borderColor: "#d2c9bc", gap: 12 }, heading: { fontSize: 20, lineHeight: 26, fontWeight: "700", color: "#233c2e" }, habit: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12 }, habitCopy: { flex: 1, gap: 2 }, habitTitle: { fontSize: 16, lineHeight: 22, fontWeight: "500", color: "#25382e" }, habitHint: { fontSize: 12, lineHeight: 17, color: "#606154" }, art: { height: 200, width: 310, maxWidth: "100%", alignSelf: "center", marginVertical: 4 }, jacket: { position: "absolute", left: 0, top: 3, transform: [{ rotate: "-8deg" }] }, trousers: { position: "absolute", right: 0, top: 18, transform: [{ rotate: "5deg" }] }, knit: { position: "absolute", left: 88, top: 42 }, primary: { backgroundColor: "#284c37", minHeight: 48, borderRadius: 10, justifyContent: "center", alignItems: "center", padding: 12, marginTop: "auto" }, primaryText: { color: "#fff", fontSize: 17, fontWeight: "500", textAlign: "center" }, note: { textAlign: "center", fontSize: 12, lineHeight: 18, color: "#606154", marginTop: 9 } });
