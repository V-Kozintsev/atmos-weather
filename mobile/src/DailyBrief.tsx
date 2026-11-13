import { StyleSheet, View } from "react-native";
import { clock, temperature, type Forecast, type Hour } from "../../src/lib/weather";
import { WeatherIcon } from "./WeatherIcon";
import { Text } from "./typography";
import { useTimeTheme } from "./timeTheme";
import type { OutfitAdvice } from "../../src/lib/outfit";

/** @param {object} props - Прогноз и текущий комплект. @returns {React.JSX.Element} Сводка текущего дня с реальными будущими часами вместо жёстко заданных утренних температур. */
export function DailyBrief({ forecast, advice, evening, fahrenheit }: { forecast: Forecast; advice?: OutfitAdvice; evening?: Hour; fahrenheit: boolean }): React.JSX.Element {
  const theme = useTimeTheme();
  const today = forecast.current.time.slice(0, 10);
  const dayHours = forecast.hours.filter((hour) => hour.time.startsWith(today));
  const daytime = dayHours.find((hour) => hour.time > forecast.current.time && Number(hour.time.slice(11, 13)) >= 13 && Number(hour.time.slice(11, 13)) < 17);
  const later = dayHours.find((hour) => hour.time > forecast.current.time && Number(hour.time.slice(11, 13)) >= 18) ?? (evening && evening.time > forecast.current.time ? evening : undefined);
  const points = [{ label: "Сейчас", ...forecast.current }, ...(daytime && daytime.time > forecast.current.time && daytime.time !== later?.time ? [{ label: "Днём", ...daytime }] : []), ...(later ? [{ label: "Вечером", ...later }] : [])];
  const outer = advice?.pieces.outer?.toLocaleLowerCase("ru");
  const cooling = later && later.feels <= forecast.current.feels - 3;
  const summary = `${outer ? `Сейчас — ${outer}.` : "Сейчас подойдёт лёгкий комплект."}${cooling ? " К вечеру станет холоднее." : advice?.rain ? " Пригодится защита от осадков." : " Подберите комплект под свои планы."}`;
  return <View style={styles.section}>
    <Text style={[styles.title, { color: theme.primary }]}>Ваш день по погоде</Text><Text style={[styles.summary, { color: theme.text }]}>{summary}</Text>
    <View style={styles.timeline}>{points.map((point, index) => <View key={point.label} style={[styles.point, index > 0 && { borderLeftWidth: 1, borderColor: theme.divider }]}><Text style={[styles.label, { color: theme.text }]}>{point.label}</Text><View style={styles.reading}><WeatherIcon code={point.code} night={!point.day} surface={theme.dark ? "dark" : "light"} size={32} /><Text style={[styles.degrees, { color: theme.primary }]}>{temperature(point.temperature, fahrenheit)}°</Text></View><Text style={[styles.time, { color: theme.muted }]}>{clock(point.time)}</Text></View>)}</View>
  </View>;
}
const styles = StyleSheet.create({ section: { paddingTop: 0, paddingBottom: 8 }, title: { fontSize: 27, lineHeight: 33, fontWeight: "700", letterSpacing: -.5 }, summary: { fontSize: 14, lineHeight: 21, marginTop: 9 }, timeline: { flexDirection: "row", paddingVertical: 18 }, point: { flex: 1, paddingHorizontal: 10, gap: 4 }, label: { fontSize: 13, fontWeight: "500" }, reading: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5 }, degrees: { fontSize: 24, lineHeight: 30, fontWeight: "500" }, time: { fontSize: 11 }, hint: { flexDirection: "row", alignItems: "center", gap: 8 }, hintText: { flex: 1, fontSize: 12, lineHeight: 18 } });
