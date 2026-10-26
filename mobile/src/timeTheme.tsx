import { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import type { Forecast } from "../../src/lib/weather";
import { localScene, type SceneMode } from "./CityBackdrop";

export interface TimeTheme {
  page: string;
  primary: string;
  text: string;
  muted: string;
  divider: string;
  accent: string;
  dark: boolean;
}

export const baseTheme: TimeTheme = { page: "#f7f8f2", primary: "#21483e", text: "#42594a", muted: "#627265", divider: "#d1d8cb", accent: "#547667", dark: false };
export const timeThemes: Record<Exclude<SceneMode, "auto">, TimeTheme> = {
  morning: { page: "#f4ede4", primary: "#292824", text: "#3f3c36", muted: "#59554d", divider: "#d4c7b6", accent: "#345b49", dark: false },
  day: { page: "#eef1eb", primary: "#242b29", text: "#38413e", muted: "#505c56", divider: "#c5d1bf", accent: "#285a45", dark: false },
  evening: { page: "#ece7ef", primary: "#2b2832", text: "#403b49", muted: "#595160", divider: "#c9bfd2", accent: "#60506f", dark: false },
  night: { page: "#1d2931", primary: "#f5f5f2", text: "#e0e3e6", muted: "#bdc6cf", divider: "#495760", accent: "#b9d8ca", dark: true },
};

export const TimeThemeContext = createContext(baseTheme);

/** @returns {TimeTheme} Общие цвета текста, фона и разделителей текущей вкладки. */
export function useTimeTheme(): TimeTheme { return useContext(TimeThemeContext); }

/** @param {Forecast | undefined} forecast - Прогноз с местным временем города. @param {SceneMode} mode - Автоматическое или выбранное оформление. @returns {TimeTheme} Палитра, обновляемая по времени и при возвращении в приложение. */
export function useSceneTheme(forecast: Forecast | undefined, mode: SceneMode): TimeTheme {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    const listener = AppState.addEventListener("change", (state) => { if (state === "active") setNow(Date.now()); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  return timeThemes[mode === "auto" ? forecast ? localScene(forecast, now) : "day" : mode];
}
