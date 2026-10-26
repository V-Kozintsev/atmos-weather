import { useTimeTheme, type TimeTheme } from "./timeTheme";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { Text, fontNames } from "./typography";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { OutfitAdvice, OutfitOccasion, WarmthPreference } from "../../src/lib/outfit";
import { condition, temperature, type Forecast } from "../../src/lib/weather";
import { OutfitPhoto } from "./OutfitPhoto";
import { OutfitDetails } from "./OutfitDetails";
import { UnderlineTabs } from "./UnderlineTabs";
import { outfitPreferenceSummary } from "./outfitPreferences";
import { WeatherIcon } from "./WeatherIcon";
import { s } from "./ui";

/** @param {object} props - Прогноз, комплект, переключатели и настройки. @returns {React.JSX.Element} Компактный экран образа с погодой, фотографиями вещей и вечерней рекомендацией. */
export function OutfitScreen({ forecast, advice, source, period, gender, occasion, warmth, fahrenheit, eveningHour, eveningHint, onPeriodChange, onGenderChange, children }: {
  forecast: Forecast; advice: OutfitAdvice; source: ImageSourcePropType;
  period: "hour" | "day"; gender: "woman" | "man"; occasion: OutfitOccasion; warmth: WarmthPreference; fahrenheit: boolean;
  eveningHour?: Forecast["hours"][number]; eveningHint: string;
  onPeriodChange: (value: "hour" | "day") => void; onGenderChange: (value: "woman" | "man") => void; children: (settingsVisible: boolean) => ReactNode;
}): React.JSX.Element {
  const theme = useTimeTheme();
  const styles = createStyles(theme);
  const [customizing, setCustomizing] = useState(false);
  const { height, width, fontScale } = useWindowDimensions();
  const stackedToolbar = width < 350 || fontScale > 1.25;
  const heroHeight = Math.max(286, Math.min(330, height * .36)) * Math.max(1, fontScale);
  const title = advice.rain ? "На случай дождя" : ["heat", "warm"].includes(advice.style) ? "Сегодня налегке" : advice.style === "mild" ? "Лёгкий слой" : advice.style === "cool" ? "Утепляемся" : "Тёплые слои";
  const evening = eveningHour ? `К вечеру ${temperature(eveningHour.feels, fahrenheit)}° — ${eveningHint.replace(/^На вечер\s*—\s*/i, "")}` : eveningHint;
  return <View style={styles.screen}>
    <View style={[styles.toolbar, stackedToolbar && styles.toolbarStacked]}>
      <View style={stackedToolbar ? styles.stackedGroup : s.flex}><UnderlineTabs label="Период рекомендации" choices={[{ value: "hour", label: "На час" }, { value: "day", label: "Весь день" }]} value={period} onChange={onPeriodChange} /></View>
      {!stackedToolbar && <View style={styles.separator} />}
      <View style={stackedToolbar ? styles.stackedGroup : s.flex}><UnderlineTabs label="Вариант одежды" choices={[{ value: "woman", label: "Женский" }, { value: "man", label: "Мужской" }]} value={gender} onChange={onGenderChange} /></View>
    </View>
    <OutfitPhoto source={source} editorial height={heroHeight} description={`${title}. ${condition(forecast.current.code)}, ${temperature(forecast.current.temperature, fahrenheit)}°, ощущается как ${temperature(forecast.current.feels, fahrenheit)}°. ${advice.note}`}>
      <View pointerEvents="none" style={styles.weather}>
        <WeatherIcon code={forecast.current.code} night={!forecast.current.day} surface={theme.dark ? "dark" : "light"} size={48} />
        <Text style={styles.temperature}>{temperature(forecast.current.temperature, fahrenheit)}°</Text>
        <Text style={styles.weatherText}>Ощущается как {temperature(forecast.current.feels, fahrenheit)}°</Text>
        <Text style={styles.condition}>{condition(forecast.current.code)}</Text>
      </View>
      <View pointerEvents="none" style={styles.summary}>
        <View style={styles.rule} />
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.summaryText}>{period === "day" ? "Комплект на весь день" : "Комфортно сейчас"}</Text>
      </View>
    </OutfitPhoto>
    <OutfitDetails advice={advice} gender={gender} occasion={occasion} />
    <Pressable accessibilityRole="button" accessibilityLabel="Учесть вечер в комплекте на весь день" onPress={() => onPeriodChange("day")} style={styles.evening}>
      <Ionicons name="moon-outline" size={22} color={theme.primary} />
      <Text style={styles.eveningText}>{evening}</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.muted} />
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Стиль и комфорт" accessibilityState={{ expanded: customizing }} onPress={() => setCustomizing(!customizing)} style={styles.customize}>
      <Ionicons name="options-outline" size={22} color={theme.primary} />
      <View style={s.flex}><Text style={styles.customizeText}>Стиль и комфорт</Text><Text style={styles.preferenceSummary}>{outfitPreferenceSummary(occasion, warmth)}</Text></View>
      <Ionicons name={customizing ? "chevron-up" : "chevron-forward"} size={19} color={theme.muted} />
    </Pressable>
    <View style={styles.preferences}>{children(customizing)}</View>
    <Text style={styles.disclaimer}>Образ — пример. Ориентируйтесь на список и свой комфорт.</Text>
  </View>;
}

const serif = fontNames.heading;
/** @param {TimeTheme} theme - Палитра времени суток. @returns {object} Стили с общими цветами интерфейса. */
const createStyles = (theme: TimeTheme) => StyleSheet.create({
  screen: { gap: 12 },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 13 },
  toolbarStacked: { flexDirection: "column", alignItems: "stretch", gap: 0 },
  stackedGroup: { width: "100%" },
  separator: { height: 20, width: 1, backgroundColor: theme.divider },
  weather: { position: "absolute", top: 20, left: 4, width: "39%", gap: 4 },
  temperature: { fontFamily: serif, fontSize: 52, lineHeight: 62, color: theme.primary },
  weatherText: { fontSize: 12, lineHeight: 17, color: theme.text },
  condition: { fontSize: 12, lineHeight: 17, color: theme.text },
  summary: { position: "absolute", left: 4, bottom: 18, width: "53%", gap: 4 },
  rule: { width: 30, height: 1, backgroundColor: theme.accent, marginBottom: 3 },
  heroTitle: { fontFamily: serif, fontSize: 26, lineHeight: 29, fontWeight: "600", color: theme.primary },
  summaryText: { fontSize: 12, lineHeight: 17, color: theme.text },
  evening: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.divider, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, minHeight: 48 },
  eveningText: { flex: 1, fontSize: 13, lineHeight: 20, color: theme.muted },
  customize: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 58, paddingVertical: 7 },
  customizeText: { fontSize: 15, lineHeight: 21, color: theme.primary },
  preferenceSummary: { fontSize: 11, lineHeight: 17, color: theme.muted, marginTop: 2 },
  preferences: { gap: 14 },
  disclaimer: { fontSize: 11, lineHeight: 16, color: theme.muted, textAlign: "center" },
});
