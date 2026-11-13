import { useId, useMemo, useState } from "react";
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SvgXml } from "react-native-svg";
import { temperature, windSpeed, type Forecast } from "../../src/lib/weather";
import { CityBackdrop, localScene, type SceneMode } from "./CityBackdrop";
import type { CityPhoto } from "./cityPhotos";
import { weatherScene } from "./weatherScene";
import { WeatherMotion } from "./WeatherMotion";
import { Text } from "./typography";
import { useTimeTheme } from "./timeTheme";

interface Props { forecast: Forecast; mode: SceneMode; photo: CityPhoto | null; photosEnabled: boolean; fahrenheit: boolean; stale: boolean; visible: boolean; motionEnabled: boolean; topInset: number; onCity: () => void; onHeight: (height: number) => void }

/** @param {Props} props - Живые условия, оформление и доступ к выбору города. @returns {React.JSX.Element} Погодная сцена по утверждённому макету без закреплённой шапки и отдельной иконки. */
export function WeatherHero({ forecast, mode, photo, photosEnabled, fahrenheit, stale, visible, motionEnabled, topInset, onCity, onHeight }: Props): React.JSX.Element {
  const theme = useTimeTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [size, setSize] = useState({ width: 0, height: 355 });
  const scene = useMemo(() => weatherScene(forecast.current, forecast.hours[0]), [forecast]);
  const phase = mode === "auto" ? localScene(forecast) : mode;
  const sceneKey = `${forecast.city.id}:${forecast.current.time}:${scene.kind}:${scene.rain}:${scene.snow}:${phase}`;
  const day = forecast.days[0];
  /** @param {number} value - Температура в Цельсиях. @returns {string} Значение в выбранных пользователем единицах. */
  function degrees(value: number): string { return `${temperature(value, fahrenheit)}°`.replace("-", "−"); }
  /** @param {LayoutChangeEvent} event - Размер погодной сцены после переноса текста. @returns {void} Подгоняет движение под реальную область и сообщает границу видимости родителю. */
  function measure(event: LayoutChangeEvent): void {
    const { width, height } = event.nativeEvent.layout;
    setSize((previous) => previous.width === width && previous.height === height ? previous : { width, height });
    onHeight(height);
  }
  const shade = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="${id}shade" x2="0" y2="1"><stop stop-color="#0b1c2b" stop-opacity=".1"/><stop offset=".45" stop-color="#0a213b" stop-opacity=".6"/><stop offset=".8" stop-color="#0b1c2b" stop-opacity=".53"/><stop offset="1" stop-color="#0b1c2b" stop-opacity=".02"/></linearGradient></defs><path d="M0 0h100v100H0Z" fill="url(#${id}shade)"/></svg>`;
  const fade = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="${id}fade" x2="0" y2="1"><stop stop-color="${theme.page}" stop-opacity="0"/><stop offset="1" stop-color="${theme.page}"/></linearGradient></defs><path d="M0 0h100v100H0Z" fill="url(#${id}fade)"/></svg>`;
  return <View style={styles.hero} onLayout={measure}>
    <CityBackdrop forecast={forecast} mode={mode} photo={photo} photosEnabled={photosEnabled} atmosphere={{ scene, period: phase }} />
    <SvgXml xml={shade} width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none" />
    <WeatherMotion scene={scene} period={phase} width={size.width} height={size.height} visible={visible} enabled={motionEnabled} sceneKey={sceneKey} />
    <View style={[styles.copy, { paddingTop: topInset + 22 }]}>
      <Text style={styles.date}>{new Date(`${forecast.current.time.slice(0, 10)}T12:00:00Z`).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).toLocaleUpperCase("ru")}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Выбрать город. Сейчас ${forecast.city.name}`} accessibilityHint="Открыть поиск города" onPress={onCity} style={styles.city}>
        <Text style={styles.cityName}>{forecast.city.name}</Text><Ionicons name="chevron-down" size={18} color="#fff" />
      </Pressable>
      <Text style={styles.degrees}>{degrees(forecast.current.temperature)}</Text>
      <Text style={styles.condition}>{scene.label}</Text>
      <Text style={styles.range}>Макс. {degrees(day.max)} · мин. {degrees(day.min)}</Text>
      <View style={styles.metrics}><Text style={styles.metric}>Ощущается как {degrees(forecast.current.feels)}</Text><Text style={styles.metric}>Ветер {windSpeed(forecast.current.wind)} м/с</Text></View>
      {stale && <Text style={styles.saved}>Сохранённый прогноз</Text>}
    </View>
    <SvgXml xml={fade} width="100%" height={54} style={styles.fade} pointerEvents="none" />
  </View>;
}

const styles = StyleSheet.create({ hero: { position: "relative", overflow: "hidden", minHeight: 330 }, copy: { alignItems: "center", paddingHorizontal: 18, paddingBottom: 56, gap: 0 }, date: { fontSize: 10, lineHeight: 15, letterSpacing: 1.7, fontWeight: "500", color: "#f1f5f2", textAlign: "center", marginBottom: 3, textShadowColor: "#142c3d60", textShadowRadius: 9 }, city: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: 6, maxWidth: "100%" }, cityName: { flexShrink: 1, fontSize: 27, lineHeight: 35, fontWeight: "400", color: "#fff", textAlign: "center", textShadowColor: "#142c3d60", textShadowRadius: 9 }, degrees: { fontSize: 84, lineHeight: 94, fontWeight: "300", letterSpacing: -4, paddingLeft: 14, color: "#fff", textAlign: "center", textShadowColor: "#142c3d40", textShadowRadius: 10 }, condition: { fontSize: 19, lineHeight: 27, color: "#fff", textAlign: "center", textShadowColor: "#142c3d60", textShadowRadius: 9 }, range: { fontSize: 13, lineHeight: 20, color: "#f0f4f4", textAlign: "center" }, metrics: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", columnGap: 14, rowGap: 3, marginTop: 12 }, metric: { fontSize: 13, lineHeight: 21, color: "#fff", textAlign: "center", textShadowColor: "#142c3d60", textShadowRadius: 9 }, saved: { fontSize: 11, lineHeight: 17, color: "#fff", marginTop: 6 }, fade: { position: "absolute", left: 0, right: 0, bottom: -1 } });
