import { memo } from "react";
import { Image, View } from "react-native";
import { SvgXml } from "react-native-svg";
const atlas = require("../assets/weather-atlas.png");
const moonOnLight = require("../assets/moon-on-light.webp");
const moonOnDark = require("../assets/widget/moon.webp");

/** @param {number} code - Код WMO. @param {boolean} night - Ночь в городе. @returns {[number, number]} Колонка и строка общей текстуры. */
export function weatherTile(code: number, night: boolean): [number, number] {
  if (code === 0) return night ? [2, 1] : [0, 0];
  if (code <= 2) return night ? [1, 0] : [2, 0];
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return [1, 1];
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return [0, 1];
  return [1, 0];
}

/** @param {object} props - Код погоды, размер, время суток и фон размещения. @returns {React.JSX.Element} Объёмный погодный значок с контрастной луной для светлой поверхности. */
export const WeatherIcon = memo(function WeatherIcon({
  code,
  size = 40,
  night = false,
  surface = "dark",
}: {
  code: number;
  size?: number;
  night?: boolean;
  surface?: "light" | "dark";
}): React.JSX.Element {
  const [column, row] = weatherTile(code, night);
  const clearMoonOnLight = night && code === 0 && surface === "light";
  return (
    <View accessible={false} pointerEvents="none" style={{ width: size, height: size, overflow: "hidden", flexShrink: 0 }}>
      {night && code > 0 && code <= 2 && <Image source={surface === "light" ? moonOnLight : moonOnDark} resizeMode="contain" fadeDuration={0} style={{ position: "absolute", width: size * .8, height: size * .8, left: size * .19, top: 0 }} />}
      {clearMoonOnLight
        ? <Image source={moonOnLight} resizeMode="contain" fadeDuration={0} style={{ width: size, height: size }} />
        : <Image source={atlas} resizeMode="stretch" fadeDuration={0} style={{ position: "absolute", width: size * 3, height: size * 2, left: -column * size, top: -row * size }} />}
      {code >= 95 && <SvgXml width={size} height={size} style={{ position: "absolute" }} xml={'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="m54 48-16 26h15l-7 20 26-31H57l9-15Z" fill="#ffd479"/></svg>'} />}
      {(code === 45 || code === 48) && <SvgXml width={size} height={size} style={{ position: "absolute" }} xml={'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g stroke="#a6bbc4" stroke-width="4" stroke-linecap="round"><path d="M18 70h64M25 80h50M18 90h64"/></g></svg>'} />}
    </View>
  );
});
