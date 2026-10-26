import { useTimeTheme, type TimeTheme } from "./timeTheme";
import { type ReactNode } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text, fontNames } from "./typography";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { OutfitAdvice, OutfitOccasion } from "../../src/lib/outfit";
import { condition, temperature, windSpeed, type Forecast } from "../../src/lib/weather";
import { OutfitPhoto } from "./OutfitPhoto";
import { OutfitPreview } from "./OutfitPreview";
import { SeasonalAccent } from "./SeasonalAccent";
import { UnderlineTabs } from "./UnderlineTabs";
import { WeatherIcon } from "./WeatherIcon";
import { s } from "./ui";

/** @param {object} props - Прогноз, выбранная одежда и действия. @returns {React.JSX.Element} Погодный гардероб с журнальной раскладкой и одним списком вещей. */
export function OutfitScreen({ forecast, advice, period, gender, occasion, fahrenheit, eveningHour, eveningHint, onPeriodChange, onGenderChange, children }: {
  forecast: Forecast; advice: OutfitAdvice;
  period: "hour" | "day"; gender: "woman" | "man"; occasion: OutfitOccasion; fahrenheit: boolean;
  eveningHour?: Forecast["hours"][number]; eveningHint: string;
  onPeriodChange: (value: "hour" | "day") => void; onGenderChange: (value: "woman" | "man") => void; children: ReactNode;
}): React.JSX.Element {
  const theme = useTimeTheme();
  const styles = createStyles(theme);
  const { width, fontScale } = useWindowDimensions();
  const stackedToolbar = width < 350 || fontScale > 1.25;
  const heroSize = Math.min(width - 36, 640);
  const late = Number(forecast.current.time.slice(11, 13)) >= 16;
  const title = advice.rain ? advice.feels <= 0 ? "Защита от снега" : "На случай дождя" : ["heat", "warm"].includes(advice.style) ? "Сегодня налегке" : advice.style === "mild" ? late ? "Лёгкий слой на вечер" : "Лёгкий слой на день" : "Тёплые слои";
  const outer = advice.pieces.outer || "";
  const description = advice.rain ? advice.feels <= 0 ? "Тёплая одежда и обувь с защитой от снега." : "Непромокаемый слой и закрытая обувь." : /ветр/.test(outer) ? "Ветрозащитный слой пригодится уже сейчас." : ["cold", "frost"].includes(advice.style) ? "Тёплые слои для холодной погоды." : outer ? "Верхний слой можно снять, когда станет теплее." : "Лёгкий комплект для тёплой погоды.";
  const evening = eveningHour ? `К вечеру ${temperature(eveningHour.feels, fahrenheit)}° — ${eveningHint.replace(/^На вечер\s*—\s*/i, "")}` : eveningHint;
  return <View style={styles.screen}>
    <View style={[styles.toolbar, stackedToolbar && styles.toolbarStacked]}>
      <View style={stackedToolbar ? styles.stackedGroup : s.flex}><UnderlineTabs label="Период рекомендации" choices={[{ value: "hour", label: "На час" }, { value: "day", label: "Весь день" }]} value={period} onChange={onPeriodChange} /></View>
      {!stackedToolbar && <View style={styles.separator} />}
      <View style={stackedToolbar ? styles.stackedGroup : s.flex}><UnderlineTabs label="Вариант одежды" choices={[{ value: "woman", label: "Женский" }, { value: "man", label: "Мужской" }]} value={gender} onChange={onGenderChange} /></View>
    </View>
    <View style={styles.intro}>
      <SeasonalAccent forecast={forecast} />
      <View style={styles.weather}>
        <WeatherIcon code={forecast.current.code} night={!forecast.current.day} surface={theme.dark ? "dark" : "light"} size={44} />
        <Text style={styles.temperature}>{temperature(forecast.current.temperature, fahrenheit)}°</Text>
        <View style={styles.weatherDetails}><Text style={styles.weatherText}>Ощущается как {temperature(forecast.current.feels, fahrenheit)}°</Text><Text style={styles.weatherText}>Ветер {windSpeed(forecast.current.wind)} м/с</Text></View>
      </View>
      <View style={styles.heading}><Text style={styles.heroTitle}>{title}</Text><Text style={styles.description}>{description}</Text></View>
      <OutfitPhoto visual={<OutfitPreview advice={advice} gender={gender} occasion={occasion} size={heroSize} backdrop />} fullVisual={<OutfitPreview advice={advice} gender={gender} occasion={occasion} size={heroSize} backdrop />} editorial height={heroSize * .9} description={`${title}. ${condition(forecast.current.code)}. ${advice.note}`} />
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Учесть вечер в комплекте на весь день" onPress={() => onPeriodChange("day")} style={styles.evening}>
      <Ionicons name="moon-outline" size={21} color={theme.primary} /><Text style={styles.eveningText}>{evening}</Text><Ionicons name="chevron-forward" size={17} color={theme.muted} />
    </Pressable>
    {period === "day" && <Text style={styles.reason}>{advice.note}</Text>}
    <View style={styles.preferences}>{children}</View>
    <Text style={styles.disclaimer}>Комплект — ориентир. Учитывайте свой комфорт.</Text>
  </View>;
}

/** @param {TimeTheme} theme - Цвета текущего времени суток. @returns {object} Стили раскладки и компактной погодной строки. */
const createStyles = (theme: TimeTheme) => StyleSheet.create({
  screen: { gap: 10 },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 13 },
  toolbarStacked: { flexDirection: "column", alignItems: "stretch", gap: 0 },
  stackedGroup: { width: "100%" },
  separator: { height: 20, width: 1, backgroundColor: theme.divider },
  intro: { position: "relative", gap: 10 },
  weather: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", paddingVertical: 4 },
  temperature: { fontFamily: fontNames.heading, fontSize: 54, lineHeight: 64, color: theme.primary },
  weatherDetails: { borderLeftWidth: 1, borderLeftColor: theme.divider, paddingLeft: 12, flexShrink: 1, gap: 3 },
  weatherText: { fontSize: 12, lineHeight: 18, color: theme.text },
  heading: { gap: 5 },
  heroTitle: { fontFamily: fontNames.heading, fontSize: 28, lineHeight: 34, fontWeight: "600", color: theme.primary },
  description: { fontSize: 13, lineHeight: 20, color: theme.text },
  reason: { fontSize: 11, lineHeight: 17, color: theme.muted },
  evening: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.divider, flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 11, minHeight: 46 },
  eveningText: { flex: 1, fontSize: 12, lineHeight: 19, color: theme.text },
  preferences: { gap: 12 },
  disclaimer: { fontSize: 11, lineHeight: 16, color: theme.muted, textAlign: "center" },
});
