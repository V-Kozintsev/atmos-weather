import { useTimeTheme, type TimeTheme } from "./timeTheme";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { bestHour, clock, condition, temperature, weekday, windSpeed, type Forecast, type Hour } from "../../src/lib/weather";
import type { OutfitAdvice, OutfitOccasion } from "../../src/lib/outfit";
import { CityBackdrop, type SceneMode } from "./CityBackdrop";
import type { CityPhoto } from "./cityPhotos";
import { OutfitCard } from "./OutfitCard";
import { WeatherIcon } from "./WeatherIcon";
import { Text } from "./typography";

interface Props {
  forecast: Forecast; advice?: OutfitAdvice; gender: "woman" | "man"; occasion: OutfitOccasion; period: "hour" | "day";
  eveningHour?: Hour; eveningHint: string; fahrenheit: boolean; background: boolean; sceneMode: SceneMode; photo: CityPhoto | null;
  stale: boolean; favorite: boolean; dayIndex: number; hours: Hour[]; wide: boolean;
  onFavorite: () => void; onOutfit: () => void; onDay: (index: number) => void; onShare: () => void; onRefresh: () => void; refreshing: boolean; onSource: (url: string) => void;
}

/** @param {Props} props - Живой прогноз, комплект одежды и действия главного экрана. @returns {React.JSX.Element} Единый экран с растворяющимся фото, открытой композицией вещей и почасовыми колонками. */
export function WeatherHome({ forecast, advice, gender, occasion, period, eveningHour, eveningHint, fahrenheit, background, sceneMode, photo, stale, favorite, dayIndex, hours, wide, onFavorite, onOutfit, onDay, onShare, onRefresh, refreshing, onSource }: Props): React.JSX.Element {
  const theme = useTimeTheme();
  const styles = createStyles(theme);
  const { width, height, fontScale } = useWindowDimensions();
  const dense = !wide && height < 920 && fontScale <= 1.15;
  const [weekOpen, setWeekOpen] = useState(false);
  const [hoursWidth, setHoursWidth] = useState(wide ? 480 : width - 36);
  const walk = bestHour(forecast.hours.slice(0, 24), "walk");
  const day = forecast.days[0];
  const selectedIndex = Math.max(0, Math.min(dayIndex, forecast.days.length - 1));
  const cooling = eveningHour && eveningHour.feels <= forecast.current.feels - 3 && forecast.current.feels >= 18;
  const outfitDescription = advice?.rain ? "Непромокаемый слой и закрытая обувь." : cooling ? "Днём легко, вечером пригодится верхний слой." : undefined;
  /** @param {number} value - Температура в Цельсиях. @returns {string} Значение в выбранных пользователем единицах. */
  function degrees(value: number): string { return `${temperature(value, fahrenheit)}°`; }
  /** @param {LayoutChangeEvent} event - Доступная ширина почасового прогноза. @returns {void} Выделяет ровно четыре читаемые колонки без сжатия и обрезки текста. */
  function measureHours(event: LayoutChangeEvent): void { setHoursWidth(event.nativeEvent.layout.width); }
  const hourWidth = Math.max(76 * Math.max(1, fontScale), hoursWidth / 4);
  return <View style={[styles.layout, wide && styles.wide]}>
    <View style={[styles.column, wide && styles.mainColumn]}>
      <View style={[styles.hero, dense && styles.heroDense]}>
        <CityBackdrop forecast={forecast} mode={sceneMode} photo={photo} photosEnabled={background} pageColor={theme.page} seamless />
        <View style={[styles.heroContent, dense && styles.heroContentDense]}>
          {stale && <Text style={styles.saved}>СОХРАНЁННЫЙ ПРОГНОЗ</Text>}
          <View style={styles.reading}>
            <View style={styles.currentCopy}>
              <Text style={[styles.degrees, dense && styles.degreesDense]}>{degrees(forecast.current.temperature)}</Text>
              <Text style={[styles.condition, dense && styles.conditionDense]}>{condition(forecast.current.code)}</Text>
            </View>
            <View style={styles.heroIcon}><WeatherIcon code={forecast.current.code} night={!forecast.current.day} size={dense ? 90 : 106} /></View>
          </View>
          <View style={styles.metrics}>
            <Text style={[styles.metric, dense && styles.metricDense]}>Сегодня {degrees(day.min)} / {degrees(day.max)}</Text>
            <Text style={[styles.metric, dense && styles.metricDense]}>Ощущается как {degrees(forecast.current.feels)}</Text>
            <Text style={[styles.metric, dense && styles.metricDense]}>Ветер {windSpeed(forecast.current.wind)} м/с · Влажность {forecast.current.humidity}%</Text>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={favorite ? "Убрать из избранного" : "Добавить в избранное"} onPress={onFavorite} style={styles.favorite}><Ionicons name={favorite ? "star" : "star-outline"} size={20} color="#f4e2b9" /></Pressable>
        {Platform.OS === "web" && <Pressable accessibilityRole="button" accessibilityLabel="Обновить прогноз" disabled={refreshing} onPress={onRefresh} style={[styles.favorite, { right: 54 }]}>{refreshing ? <ActivityIndicator color="#fff" /> : <Ionicons name="refresh-outline" size={20} color="#fff" />}</Pressable>}
      </View>
      {advice && <View style={styles.inset}><OutfitCard advice={advice} gender={gender} occasion={occasion} period={period} evening={eveningHint} eveningTemperature={eveningHour ? degrees(eveningHour.feels) : undefined} description={outfitDescription} compact={dense} onPress={onOutfit} /></View>}
    </View>
    <View style={[styles.column, styles.forecastColumn, wide && styles.forecastWide]}>
      <View style={styles.inset}>
        <Text style={[styles.sectionTitle, dense && styles.sectionTitleDense]}>{selectedIndex === 0 ? "Ближайшие часы" : `По часам · ${weekday(forecast.days[selectedIndex].date)}`}</Text>
        <View onLayout={measureHours}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hours}>
            {hours.map((hour, index) => <View key={hour.time} style={[styles.hour, { minWidth: hourWidth }, index % 4 === 3 && styles.hourLast]}>
              <Text style={styles.hourTime}>{clock(hour.time)}</Text>
              <WeatherIcon code={hour.code} night={!hour.day} surface={theme.dark ? "dark" : "light"} size={dense ? 36 : 42} />
              <Text style={styles.hourDegrees}>{degrees(hour.temperature)}</Text>
            </View>)}
          </ScrollView>
        </View>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: weekOpen }} onPress={() => setWeekOpen(!weekOpen)} style={styles.weekToggle}>
          <Text style={styles.weekTitle}>На неделю</Text><Ionicons name={weekOpen ? "chevron-up" : "chevron-forward"} size={22} color={theme.primary} />
        </Pressable>
        {weekOpen && <View style={styles.week}>
          {forecast.days.map((value, index) => <Pressable accessibilityRole="button" accessibilityState={{ selected: selectedIndex === index }} accessibilityLabel={`${index === 0 ? "Сегодня" : weekday(value.date)}: ${degrees(value.min)} — ${degrees(value.max)}. Показать прогноз по часам`} key={value.date} onPress={() => onDay(index)} style={[styles.day, selectedIndex === index && styles.daySelected]}>
            <Text style={[styles.dayName, selectedIndex === index && styles.dayNameSelected]}>{index === 0 ? "Сегодня" : weekday(value.date)}</Text>
            <WeatherIcon code={index === 0 ? forecast.current.code : value.code} night={index === 0 && !forecast.current.day} surface={theme.dark ? "dark" : "light"} size={34} />
            <Text style={styles.dayTemperature}>{degrees(value.min)} / {degrees(value.max)}</Text>
          </Pressable>)}
          <View style={styles.details}>
            <Text style={styles.detailTitle}>Время для прогулки</Text>
            <Text style={styles.detailText}>{walk ? `${walk.time.slice(0, 10) === day.date ? "Сегодня" : "Завтра"}, ${clock(walk.time)} · ${degrees(walk.feels)} по ощущениям · ветер ${windSpeed(walk.wind)} м/с` : "В ближайшие часы нет комфортного дневного периода по нашим правилам."}</Text>
            <Text style={styles.detailText}>Восход {clock(day.sunrise) || "—"} · Закат {clock(day.sunset) || "—"}</Text>
            <Text style={styles.source}>Время города · {forecast.timezone}</Text>
            <Text style={styles.source}>{stale ? "Сохранено" : "Обновлено"} {new Date(forecast.fetchedAt).toLocaleTimeString("ru-RU", { timeZone: forecast.timezone, hour: "2-digit", minute: "2-digit" })}</Text>
            {background && photo && <Pressable accessibilityRole="link" onPress={() => onSource(photo.source)}><Text style={styles.source}>Фото: {photo.author} · {photo.license} ↗</Text></Pressable>}
          </View>
          <Pressable accessibilityRole="button" onPress={onShare} style={styles.share}><Ionicons name="share-outline" color={theme.primary} size={19} /><Text style={styles.detailText}>Поделиться прогнозом</Text></Pressable>
        </View>}
      </View>
    </View>
  </View>;
}

/** @param {TimeTheme} theme - Палитра времени суток. @returns {object} Стили с общими цветами интерфейса. */
const createStyles = (theme: TimeTheme) => StyleSheet.create({
  layout: { width: "100%" },
  wide: { flexDirection: "row", alignItems: "flex-start", gap: 32 },
  column: { minWidth: 0, width: "100%" },
  mainColumn: { flex: 1, width: "auto" },
  forecastColumn: { paddingTop: 14 },
  forecastWide: { flex: 1, width: "auto", paddingTop: 28 },
  inset: { paddingHorizontal: 18 },
  hero: { position: "relative", paddingTop: 12, overflow: "hidden" },
  heroDense: { paddingTop: 6 },
  heroContent: { paddingHorizontal: 18, paddingTop: 15, paddingBottom: 53 },
  heroContentDense: { paddingTop: 12, paddingBottom: 45 },
  reading: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  currentCopy: { flex: 1, minWidth: 0, gap: 2 },
  degrees: { fontSize: 84, lineHeight: 99, fontWeight: "400", letterSpacing: -5, color: "#fff" },
  degreesDense: { fontSize: 72, lineHeight: 84 },
  condition: { fontSize: 23, lineHeight: 28, fontWeight: "600", color: "#fff", maxWidth: 260 },
  conditionDense: { fontSize: 20, lineHeight: 25 },
  heroIcon: { paddingTop: 26, paddingRight: 2 },
  metrics: { gap: 2, paddingTop: 13 },
  metric: { color: "#fff", fontSize: 14, lineHeight: 21 },
  metricDense: { fontSize: 12, lineHeight: 18 },
  saved: { fontSize: 10, lineHeight: 16, fontWeight: "700", letterSpacing: 1.2, color: "#fff", marginBottom: 5 },
  favorite: { position: "absolute", right: 10, top: 9, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 24, lineHeight: 31, fontWeight: "700", color: theme.primary, marginBottom: 13, letterSpacing: -.4 },
  sectionTitleDense: { fontSize: 22, lineHeight: 28, marginBottom: 10 },
  hours: { paddingTop: 1, paddingBottom: 13 },
  hour: { alignItems: "center", gap: 5, paddingHorizontal: 9, borderRightWidth: 1, borderRightColor: theme.divider },
  hourLast: { borderRightWidth: 0 },
  hourTime: { fontSize: 12, lineHeight: 18, color: theme.muted },
  hourDegrees: { fontSize: 21, lineHeight: 27, fontWeight: "500", color: theme.primary },
  weekToggle: { minHeight: 48, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.divider, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  weekTitle: { fontSize: 16, lineHeight: 23, color: theme.primary, flex: 1 },
  week: { paddingBottom: 16 },
  day: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: theme.divider },
  daySelected: { borderBottomColor: theme.accent },
  dayName: { flex: 1, fontSize: 14, lineHeight: 21, color: theme.muted },
  dayNameSelected: { fontWeight: "700", color: theme.primary },
  dayTemperature: { fontSize: 14, lineHeight: 21, color: theme.text, minWidth: 78, textAlign: "right" },
  details: { paddingTop: 20, gap: 10 },
  detailTitle: { fontSize: 17, lineHeight: 24, fontWeight: "600", color: theme.primary },
  detailText: { fontSize: 13, lineHeight: 20, color: theme.text },
  source: { fontSize: 11, lineHeight: 18, color: theme.muted },
  share: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
});
