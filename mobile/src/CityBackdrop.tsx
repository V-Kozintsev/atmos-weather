import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";
import type { City, Forecast } from "../../src/lib/weather";
import type { CityPhoto } from "./cityPhotos";

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
  if (sunrise && sunset ? time < sunrise || time >= sunset : !forecast.current.day) return "night";
  const hour = Number(values.hour);
  return hour < 10 ? "morning" : hour >= 17 ? "evening" : "day";
}

/** @param {object} props - Прогноз и оформление. @returns {React.JSX.Element} Локальный фон с затемнением; незнакомые города получают нейтральное небо. */
export function CityBackdrop({ forecast, mode, photo }: { forecast: Forecast; mode: SceneMode; photo?: CityPhoto | null }): React.JSX.Element {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const phase = mode === "auto" ? localScene(forecast, now) : mode;
  const [top, bottom, overlay] = palettes[phase];
  const key = cityPhotoKey(forecast.city);
  const sky = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 300" preserveAspectRatio="none"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs><path fill="url(#sky)" d="M0 0h680v300H0Z"/>${phase === "night" ? '<g fill="#fff" opacity=".4"><circle cx="430" cy="50" r="1.5"/><circle cx="580" cy="24" r="1"/><circle cx="640" cy="89" r="1.5"/><circle cx="355" cy="28" r="1"/></g>' : ''}<path d="M0 250Q150 216 310 253T680 230v70H0Z" fill="#183b42" opacity=".22"/></svg>`;
  return (
    <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
      <SvgXml xml={sky} width="100%" height="100%" />
      {(key || photo) && <Image source={key ? photos[key] : { uri: photo!.uri }} resizeMode="cover" fadeDuration={0} style={[StyleSheet.absoluteFill, { opacity: .75 }]} />}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]} />
    </View>
  );
}
