import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { Text, fontNames } from "./typography";
import { useTimeTheme } from "./timeTheme";

/** @param {object} props - Состояние запроса. @returns {React.JSX.Element} Атмосферное ожидание прогноза без выдуманных процентов и пустых карточек. */
export function ForecastLoading({ pending }: { pending: boolean }): React.JSX.Element {
  const theme = useTimeTheme();
  const { height } = useWindowDimensions();
  const compact = height < 740;
  const mutedFill = theme.dark ? "#354850" : "#d5ddd3";
  const [showArtwork, setShowArtwork] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowArtwork(true), 400);
    return () => clearTimeout(timer);
  }, []);
  return <View style={styles.container}>
    <View pointerEvents="none" accessible={false} style={[styles.atmosphere, { height: compact ? 140 : 190 }]}>
      <Svg width="100%" height="100%" viewBox="0 0 360 190" preserveAspectRatio="none"><Defs><RadialGradient id="forecastWaitingSky"><Stop offset="0" stopColor={theme.dark ? "#517383" : "#add6e9"} stopOpacity=".65" /><Stop offset="1" stopColor={theme.page} stopOpacity="0" /></RadialGradient></Defs><Ellipse cx="180" cy="95" rx="180" ry="95" fill="url(#forecastWaitingSky)" /></Svg>
      {showArtwork && <Image source={require("../assets/widget/partial.webp")} resizeMode="contain" fadeDuration={0} style={[styles.cloud, { width: compact ? 116 : 150, height: compact ? 116 : 150 }]} />}
    </View>
    <View style={styles.message} accessibilityRole={pending ? "progressbar" : undefined} accessibilityLabel={pending ? "Загружаем прогноз" : "Прогноз не загружен"} accessibilityState={{ busy: pending }}>
      <Text style={[styles.title, { color: theme.primary, fontSize: compact ? 25 : 28 }]}>{pending ? "Собираем прогноз" : "Прогноз пока недоступен"}</Text>
      <Text style={[styles.description, { color: theme.muted }]}>{pending ? "Погода и подходящий комплект скоро появятся здесь" : "Выберите город или повторите загрузку."}</Text>
      {pending && <ActivityIndicator color={theme.accent} size="small" style={styles.indicator} />}
    </View>
    {pending && <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.skeleton}>
      <View style={styles.weather}><View style={[styles.temperature, { backgroundColor: mutedFill }]} /><View style={styles.lines}><View style={[styles.line, { width: "90%", backgroundColor: mutedFill }]} /><View style={[styles.line, { width: "62%", backgroundColor: mutedFill }]} /></View></View>
      <View style={[styles.divider, { backgroundColor: theme.divider }]} />
      <View style={[styles.line, { width: "68%", backgroundColor: mutedFill }]} /><View style={[styles.line, { width: "82%", backgroundColor: mutedFill }]} /><View style={[styles.line, { width: "46%", backgroundColor: mutedFill }]} />
      {!compact && <><View style={[styles.divider, { backgroundColor: theme.divider }]} /><View style={styles.hours}>{[0, 1, 2, 3].map((index) => <View key={index} style={[styles.hour, index > 0 && { borderLeftWidth: 1, borderLeftColor: theme.divider }]}><View style={[styles.dot, { backgroundColor: mutedFill }]} /><View style={[styles.hourLine, { backgroundColor: mutedFill }]} /></View>)}</View></>}
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  container: { width: "100%", maxWidth: 600, alignSelf: "center", paddingHorizontal: 20, paddingBottom: 24 },
  atmosphere: { width: "100%", alignItems: "center", justifyContent: "center" },
  cloud: { position: "absolute" },
  message: { alignItems: "center", gap: 10 },
  title: { fontFamily: fontNames.heading, lineHeight: 37, textAlign: "center" },
  description: { fontSize: 13, lineHeight: 21, textAlign: "center" },
  indicator: { marginTop: 4 },
  skeleton: { paddingTop: 28, gap: 10, opacity: .65 },
  weather: { flexDirection: "row", alignItems: "center", gap: 20 },
  temperature: { width: 76, height: 70, borderRadius: 8 },
  lines: { flex: 1, gap: 12 },
  line: { height: 12, borderRadius: 4 },
  divider: { width: "100%", height: 1, borderRadius: 1, marginVertical: 10 },
  hours: { flexDirection: "row" },
  hour: { flex: 1, alignItems: "center", gap: 12, paddingVertical: 5 },
  dot: { width: 27, height: 27, borderRadius: 14 },
  hourLine: { width: 32, height: 9, borderRadius: 3 },
});
