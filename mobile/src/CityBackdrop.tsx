import { useEffect, useId, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";
import type { City, Forecast } from "../../src/lib/weather";
import { cityPhotoHeaders, type CityPhoto } from "./cityPhotos";
import { weatherScenePalette, type WeatherSceneModel, type WeatherScenePeriod } from "./weatherScene";

export type SceneMode = "auto" | "morning" | "day" | "evening" | "night";
export const sceneModes: [SceneMode, string][] = [["auto", "Авто"], ["morning", "Утро"], ["day", "День"], ["evening", "Вечер"], ["night", "Ночь"]];
export const cityPhotoCredits = [
  { city: "Краснодар", author: "Антон Зайцев / soccer.ru", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", source: "https://commons.wikimedia.org/wiki/File:Park_near_the_stadium_in_Krasnodar_(3).jpg" },
  { city: "Москва", author: "Mia Primavera", license: "CC0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", source: "https://commons.wikimedia.org/wiki/File:Moscow_Skyline.jpg" },
];
const photos = { krasnodar: require("../assets/city-krasnodar.jpg"), moscow: require("../assets/city-moscow.jpg") };
const palettes = {
  morning: ["#4e7583", "#d8ab7a", "rgba(16, 38, 44, .70)"],
  day: ["#416e83", "#9bbcba", "rgba(11, 36, 44, .64)"],
  evening: ["#695466", "#e1a278", "rgba(34, 23, 38, .72)"],
  night: ["#152738", "#354963", "rgba(8, 20, 38, .82)"],
} as const;

/** @param {City} city - Выбранный город. @returns {keyof typeof photos | undefined} Подтверждённый город фотографии без подмены соседним городом. */
export function cityPhotoKey(city: City): keyof typeof photos | undefined {
  if (Math.abs(city.latitude - 45.0448) < .08 && Math.abs(city.longitude - 38.976) < .08) return "krasnodar";
  if (Math.abs(city.latitude - 55.7522) < .12 && Math.abs(city.longitude - 37.6156) < .12) return "moscow";
  return undefined;
}

/** @param {Forecast} forecast - Прогноз с часовым поясом и восходом. @param {number} now - Текущее время. @returns {Exclude<SceneMode, "auto">} Оформление по местному времени города. */
export function localScene(forecast: Forecast, now = Date.now()): Exclude<SceneMode, "auto"> {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: forecast.timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const date = `${values.year}-${values.month}-${values.day}`;
  const time = `${values.hour}:${values.minute}`;
  const day = forecast.days.find((value) => value.date.slice(0, 10) === date);
  const sunrise = day?.sunrise.slice(11, 16);
  const sunset = day?.sunset.slice(11, 16);
  // Без солнечных данных не используем признак дня из устаревшего прогноза.
  if (time < (sunrise || "06:00") || time >= (sunset || "20:00")) return "night";
  const hour = Number(values.hour);
  return hour < 10 ? "morning" : hour >= 17 ? "evening" : "day";
}

/** @param {object} props - Прогноз и оформление. @returns {React.JSX.Element} Локальный фон с затемнением; незнакомые города получают нейтральное небо. */
export function CityBackdrop({ forecast, mode, photo, seamless = false, photosEnabled = true, pageColor = "#f7f8f2", atmosphere }: { forecast: Forecast; mode: SceneMode; photo?: CityPhoto | null; seamless?: boolean; photosEnabled?: boolean; pageColor?: string; atmosphere?: { scene: WeatherSceneModel; period: WeatherScenePeriod } }): React.JSX.Element {
  const gradientId = useId().replace(/:/g, "");
  const [now, setNow] = useState(Date.now());
  const [failedPhoto, setFailedPhoto] = useState<string>();
  useEffect(() => {
    if (atmosphere) return;
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [!!atmosphere]);
  const phase = atmosphere?.period ?? (mode === "auto" ? localScene(forecast, now) : mode);
  const [top, bottom] = atmosphere ? weatherScenePalette(atmosphere.scene, phase) : palettes[phase];
  const overlay = palettes[phase][2];
  const key = cityPhotoKey(forecast.city);
  const sky = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 300" preserveAspectRatio="none"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><path fill="url(#sky)" d="M0 0h680v300H0Z"/>${phase === "night" ? '<g fill="#fff" opacity=".4"><circle cx="430" cy="50" r="1.5"/><circle cx="580" cy="24" r="1"/><circle cx="640" cy="89" r="1.5"/><circle cx="355" cy="28" r="1"/></g>' : ''}<path d="M0 250Q150 216 310 253T680 230v70H0Z" fill="#183b42" opacity=".22"/></svg>`;
  return (
    <View pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
      <SvgXml xml={sky} width="100%" height="100%" />
      {photosEnabled && (key || photo && failedPhoto !== photo.uri) && <Image source={key ? photos[key] : { uri: photo!.uri, headers: cityPhotoHeaders }} onError={() => { if (photo) setFailedPhoto(photo.uri); }} resizeMode="cover" fadeDuration={0} style={[StyleSheet.absoluteFill, { width: "100%", height: "100%", opacity: atmosphere ? atmosphere.scene.fog || atmosphere.scene.kind === "blizzard" ? .18 : phase === "night" ? .2 : .4 : seamless ? 1 : .75 }]} />}
      {!atmosphere && <View style={[StyleSheet.absoluteFill, { backgroundColor: seamless ? phase === "night" ? "rgba(8,20,38,.35)" : "rgba(14,35,42,.12)" : overlay }]} />}
      {seamless && !atmosphere && <>
        <SvgXml xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="${gradientId}scrim"><stop stop-color="#142d35" stop-opacity=".56"/><stop offset=".65" stop-color="#142d35" stop-opacity=".12"/><stop offset="1" stop-color="#142d35" stop-opacity="0"/></linearGradient></defs><path d="M0 0h100v100H0Z" fill="url(#${gradientId}scrim)"/></svg>`} width="100%" height="100%" style={StyleSheet.absoluteFill} />
        <SvgXml xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="${gradientId}fade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${pageColor}" stop-opacity="0"/><stop offset=".4" stop-color="${pageColor}" stop-opacity=".12"/><stop offset="1" stop-color="${pageColor}"/></linearGradient></defs><path d="M0 0h100v100H0Z" fill="url(#${gradientId}fade)"/></svg>`} width="100%" height={76} style={{ position: "absolute", bottom: 0 }} />
        <SvgXml xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="${gradientId}top" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${pageColor}"/><stop offset="1" stop-color="${pageColor}" stop-opacity="0"/></linearGradient></defs><path d="M0 0h100v100H0Z" fill="url(#${gradientId}top)"/></svg>`} width="100%" height={22} style={{ position: "absolute", top: 0 }} />
      </>}
    </View>
  );
}
