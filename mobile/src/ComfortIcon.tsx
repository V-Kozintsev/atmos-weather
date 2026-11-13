import Svg, { Circle, Path, G } from "react-native-svg";
import { Platform } from "react-native";

export type ComfortSymbol = "cold" | "neutral" | "hot" | "comfortable";

/** @param {object} props - Символ из макета, цвет и размер. @returns {React.JSX.Element} Контурные снежинка, термометр и солнце с одинаковой толщиной линий. */
export function ComfortIcon({ kind, size = 34, color = "#243d32" }: { kind: ComfortSymbol; size?: number; color?: string }): React.JSX.Element {
  return <Svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...(Platform.OS === "web" ? { "aria-hidden": true } : { accessible: false })}>
    {kind === "cold" ? <G><Path d="M20 3v34M5.3 11.5l29.4 17M5.3 28.5l29.4-17M15 6l5 5 5-5M15 34l5-5 5 5M5.4 17l6.8-1.8L10.4 8.4M29.6 31.6l-1.8-6.8 6.8-1.8M10.4 31.6l1.8-6.8L5.4 23M34.6 17l-6.8-1.8 1.8-6.8" /></G> : kind === "neutral" ? <G><Path d="M16 24V8a4 4 0 0 1 8 0v16a8 8 0 1 1-8 0Z" /><Path d="M20 13v16" /><Circle cx={20} cy={30} r={3} /></G> : <G><Circle cx={20} cy={20} r={9} /><Path d="M20 2v5M20 33v5M2 20h5M33 20h5M7.3 7.3l3.5 3.5m18.4 18.4 3.5 3.5M7.3 32.7l3.5-3.5m18.4-18.4 3.5-3.5" />{kind === "comfortable" && <Path d="m15.5 20 3 3 6-6" />}</G>}
  </Svg>;
}
