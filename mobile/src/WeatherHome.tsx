import { useTimeTheme, type TimeTheme } from "./timeTheme";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { bestHour, clock, temperature, weekday, type Forecast, type Hour } from "../../src/lib/weather";
import type { OutfitAdvice, OutfitOccasion } from "../../src/lib/outfit";
import type { SceneMode } from "./CityBackdrop";
import type { CityPhoto } from "./cityPhotos";
import { OutfitCard } from "./OutfitCard";
import { WeatherIcon } from "./WeatherIcon";
import { Text } from "./typography";
import { DailyBrief } from "./DailyBrief";
import { ComfortIcon } from "./ComfortIcon";
import { WeatherHero } from "./WeatherHero";

interface Props {
  forecast: Forecast; advice?: OutfitAdvice; gender: "woman" | "man"; occasion: OutfitOccasion; period: "hour" | "day";
  eveningHour?: Hour; eveningHint: string; fahrenheit: boolean; background: boolean; sceneMode: SceneMode; photo: CityPhoto | null;
  stale: boolean; dayIndex: number; hours: Hour[]; wide: boolean;
  sceneVisible: boolean; motionEnabled: boolean; topInset: number; onHeroHeight: (height: number) => void; onCity: () => void;
  comfortAnswered: boolean; onComfort: () => void;
  onOutfit: () => void; onDay: (index: number) => void; onShare: () => void; onSource: (url: string) => void;
}

/** @param {Props} props - Живой прогноз, комплект одежды и действия главного экрана. @returns {React.JSX.Element} Единый экран с растворяющимся фото, открытой композицией вещей и почасовыми колонками. */
export function WeatherHome({ forecast, advice, gender, occasion, period, eveningHour, eveningHint, fahrenheit, background, sceneMode, photo, stale, dayIndex, hours, wide, sceneVisible, motionEnabled, topInset, onHeroHeight, onCity, comfortAnswered, onComfort, onOutfit, onDay, onShare, onSource }: Props): React.JSX.Element {
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
      <WeatherHero forecast={forecast} mode={sceneMode} photo={photo} photosEnabled={background} fahrenheit={fahrenheit} stale={stale} visible={sceneVisible} motionEnabled={motionEnabled} topInset={topInset} onCity={onCity} onHeight={onHeroHeight} />
      {advice && <View style={styles.inset}><DailyBrief forecast={forecast} advice={advice} evening={eveningHour} fahrenheit={fahrenheit} /><OutfitCard advice={advice} gender={gender} occasion={occasion} period={period} evening={eveningHint} eveningTemperature={eveningHour ? degrees(eveningHour.feels) : undefined} description={outfitDescription} compact={dense} onPress={onOutfit} />
        <View style={styles.walk}><Ionicons name="partly-sunny-outline" size={26} color={theme.accent} /><View style={styles.walkCopy}><Text style={styles.detailTitle}>Для прогулки</Text><Text style={styles.detailText}>{walk ? `${walk.time.slice(0, 10) === day.date ? "Сегодня" : "Завтра"}, ${clock(walk.time)} · ${degrees(walk.feels)} по ощущениям` : "Погода не подходит для комфортной прогулки — проверьте ближайшие часы."}</Text></View></View>
        <Pressable accessibilityRole="button" onPress={onComfort} style={styles.comfort}><ComfortIcon kind="comfortable" color={theme.primary} size={26} /><View style={styles.walkCopy}><Text style={styles.detailTitle}>{comfortAnswered ? "Ответ о комфорте сохранён" : "После прогулки"}</Text><Text style={styles.detailText}>{comfortAnswered ? "Учтём ваши ощущения в следующих советах · изменить" : "Как было по ощущениям? Подстроим совет под вас."}</Text></View><Ionicons name="chevron-forward" size={18} color={theme.primary} /></Pressable>
      </View>}
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
            <Text style={styles.detailText}>Сегодня {degrees(day.min)} / {degrees(day.max)} · Влажность {forecast.current.humidity}%</Text>
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
  walk: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, borderColor: theme.divider },
  walkCopy: { flex: 1, gap: 4 },
  comfort: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 16, borderBottomWidth: 1, borderColor: theme.divider },
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
