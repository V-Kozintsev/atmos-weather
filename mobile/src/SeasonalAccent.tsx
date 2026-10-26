import { Image, View, StyleSheet } from "react-native";
import type { Forecast } from "../../src/lib/weather";
import { useTimeTheme } from "./timeTheme";

const seasons = [require("../assets/flatlay/season-spring.webp"), require("../assets/flatlay/season-summer.webp"), require("../assets/flatlay/season-autumn.webp"), require("../assets/flatlay/season-winter.webp")];

/** @param {Forecast} forecast - Местная дата, полушарие и фактическая погода. @returns {number} Панель сезонного декора; зимняя ветка используется при морозе или снеге. */
export function seasonPanel(forecast: Forecast): number {
  const month = Number(forecast.current.time.slice(5, 7));
  const localMonth = forecast.city.latitude < 0 ? (month + 5) % 12 + 1 : month;
  if ([71, 73, 75, 77, 85, 86].includes(forecast.current.code) || forecast.current.temperature <= 1) return 3;
  if (Math.abs(forecast.city.latitude) < 23.5 || forecast.current.temperature >= 27) return 1;
  return localMonth >= 3 && localMonth <= 5 ? 0 : localMonth >= 6 && localMonth <= 8 ? 1 : 2;
}

/** @param {object} props - Погода выбранного города. @returns {React.JSX.Element} Прозрачная сезонная ветка по краю, без пейзажа и прямоугольной подложки. */
export function SeasonalAccent({ forecast }: { forecast: Forecast }): React.JSX.Element {
  const theme = useTimeTheme();
  return <View pointerEvents="none" accessible={false} style={[styles.accent, { opacity: theme.dark ? .25 : .32 }]}><Image accessible={false} source={seasons[seasonPanel(forecast)]} resizeMode="contain" fadeDuration={0} style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]} /></View>;
}

const styles = StyleSheet.create({ accent: { position: "absolute", right: -18, top: 10, width: 120, height: 230 } });
