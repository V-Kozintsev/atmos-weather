import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { Text, fontNames } from "./typography";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { OutfitAdvice, OutfitOccasion } from "../../src/lib/outfit";
import { condition, temperature, type Forecast } from "../../src/lib/weather";
import { OutfitPhoto } from "./OutfitPhoto";
import { OutfitDetails } from "./OutfitDetails";
import { ClothingItem, type ClothingPhoto } from "./OutfitPreview";
import { accessoryPhoto, upperPhoto } from "./wardrobeSelection";
import { WeatherIcon } from "./WeatherIcon";
import { s } from "./ui";

/** @param {object} props - Варианты, выбранное значение и обработчик выбора. @returns {React.JSX.Element} Компактный переключатель с доступным состоянием выбора. */
function Segment<T extends string>({ options, value, onChange, label, soft = false }: { options: readonly (readonly [T, string])[]; value: T; onChange: (value: T) => void; label: string; soft?: boolean }): React.JSX.Element {
  return <View style={styles.segment} accessibilityLabel={label}>
    {options.map(([key, text]) => <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: key === value }} onPress={() => onChange(key)} style={[styles.segmentButton, key === value && (soft ? styles.selectedSoft : styles.selected)]}>
      <Text style={[styles.segmentText, key === value && (soft ? styles.selectedSoftText : styles.selectedText)]}>{text}</Text>
    </Pressable>)}
  </View>;
}

/** @param {object} props - Прогноз, комплект, переключатели и настройки. @returns {React.JSX.Element} Компактный экран образа с погодой, фотографиями вещей и вечерней рекомендацией. */
export function OutfitScreen({ forecast, advice, source, period, gender, occasion, fahrenheit, eveningHour, eveningHint, onPeriodChange, onGenderChange, children }: {
  forecast: Forecast; advice: OutfitAdvice; source: ImageSourcePropType;
  period: "hour" | "day"; gender: "woman" | "man"; occasion: OutfitOccasion; fahrenheit: boolean;
  eveningHour?: Forecast["hours"][number]; eveningHint: string;
  onPeriodChange: (value: "hour" | "day") => void; onGenderChange: (value: "woman" | "man") => void; children: ReactNode;
}): React.JSX.Element {
  const [customizing, setCustomizing] = useState(false);
  const { height, fontScale } = useWindowDimensions();
  const heroHeight = Math.max(300, Math.min(320, height * .34)) * Math.max(1, fontScale);
  const title = advice.rain ? "На случай дождя" : ["heat", "warm"].includes(advice.style) ? "Сегодня налегке" : advice.style === "mild" ? "Лёгкий слой" : advice.style === "cool" ? "Утепляемся" : "Тёплые слои";
  const evening = eveningHour ? `${eveningHour.feels < forecast.current.feels ? "К вечеру похолодает до" : "Вечером по ощущениям"} ${temperature(eveningHour.feels, fahrenheit)}°` : "Планы на вечер";
  const eveningPhoto: ClothingPhoto = /осадк/i.test(eveningHint) ? "umbrella-folded" : accessoryPhoto(eveningHint, gender) || upperPhoto(eveningHint, gender, advice);
  return <View style={styles.screen}>
    <View style={styles.toolbar}>
      <Segment label="Период рекомендации" options={[["hour", "На час"], ["day", "Весь день"]]} value={period} onChange={onPeriodChange} />
      <View style={styles.separator} />
      <Segment label="Вариант одежды" options={[["woman", "Женский"], ["man", "Мужской"]]} value={gender} onChange={onGenderChange} soft />
    </View>
    <OutfitPhoto source={source} editorial height={heroHeight} description={`${title}. ${condition(forecast.current.code)}, ${temperature(forecast.current.temperature, fahrenheit)}°, ощущается как ${temperature(forecast.current.feels, fahrenheit)}°. ${advice.note}`}>
      <View pointerEvents="none" style={styles.weather}>
        <WeatherIcon code={forecast.current.code} night={!forecast.current.day} surface="light" size={48} />
        <Text style={styles.temperature}>{temperature(forecast.current.temperature, fahrenheit)}°</Text>
        <Text style={styles.weatherText}>Ощущается как {temperature(forecast.current.feels, fahrenheit)}°</Text>
        <Text numberOfLines={2} style={styles.condition}>{condition(forecast.current.code)}</Text>
      </View>
      <View pointerEvents="none" style={styles.summary}>
        <View style={styles.rule} />
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.summaryText}>{period === "day" ? "Комплект на весь день" : "Комфортно сейчас"}</Text>
      </View>
    </OutfitPhoto>
    <OutfitDetails advice={advice} gender={gender} occasion={occasion} />
    <View style={styles.evening}>
      <ClothingItem item={eveningPhoto} size={42} />
      <View style={s.flex}><Text style={styles.eveningTitle}>{evening}</Text><Text style={styles.eveningText}>{eveningHint}</Text></View>
    </View>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: customizing }} onPress={() => setCustomizing(!customizing)} style={styles.customize}>
      <Ionicons name="options-outline" size={21} color="#21483e" /><Text style={styles.customizeText}>Настроить под себя</Text><Ionicons name={customizing ? "chevron-up" : "chevron-forward"} size={19} color="#597165" />
    </Pressable>
    {customizing && <View style={styles.preferences}>{children}</View>}
    <Text style={styles.disclaimer}>Образ — пример. Ориентируйтесь на список и свой комфорт.</Text>
  </View>;
}

const serif = fontNames.heading;
const styles = StyleSheet.create({
  screen: { gap: 12 },
  toolbar: { backgroundColor: "#ebede5", borderRadius: 14, padding: 3, flexDirection: "row", alignItems: "center", gap: 4 },
  segment: { flex: 1, flexDirection: "row", alignItems: "stretch" },
  segmentButton: { flex: 1, minHeight: 42, paddingHorizontal: 2, paddingVertical: 8, justifyContent: "center", alignItems: "center", borderRadius: 11 },
  segmentText: { fontSize: 12, lineHeight: 17, color: "#526258", fontWeight: "500", textAlign: "center" },
  selected: { backgroundColor: "#285147" },
  selectedText: { color: "#fff", fontWeight: "600" },
  selectedSoft: { backgroundColor: "#d4dace" },
  selectedSoftText: { color: "#21483e", fontWeight: "600" },
  separator: { height: 22, width: 1, backgroundColor: "#bfc9be" },
  weather: { position: "absolute", top: 20, left: 16, width: "39%", gap: 4 },
  temperature: { fontFamily: serif, fontSize: 52, lineHeight: 62, color: "#21483e" },
  weatherText: { fontSize: 12, lineHeight: 17, color: "#35574a" },
  condition: { fontSize: 12, lineHeight: 17, color: "#35574a" },
  summary: { position: "absolute", left: 16, bottom: 16, width: "53%", gap: 4 },
  rule: { width: 30, height: 1, backgroundColor: "#9ba990", marginBottom: 3 },
  heroTitle: { fontFamily: serif, fontSize: 26, lineHeight: 29, fontWeight: "600", color: "#21483e" },
  summaryText: { fontSize: 12, lineHeight: 17, color: "#426152" },
  evening: { borderWidth: 1, borderColor: "#dde0d8", borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 8, padding: 8, backgroundColor: "#f5f6ee" },
  eveningTitle: { fontSize: 13, lineHeight: 18, fontWeight: "600", color: "#294a3d" },
  eveningText: { fontSize: 12, lineHeight: 17, color: "#68756a" },
  customize: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44, paddingHorizontal: 4 },
  customizeText: { fontSize: 16, color: "#21483e", flex: 1 },
  preferences: { gap: 12 },
  disclaimer: { fontSize: 11, lineHeight: 16, color: "#7c857b", textAlign: "center" },
});
