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
  morning: { page: "#f2e8db", primary: "#35483f", text: "#4e594e", muted: "#68685b", divider: "#d4c7b6", accent: "#576d56", dark: false },
  day: { page: "#e8eee3", primary: "#21483e", text: "#42594a", muted: "#5e6e60", divider: "#c5d1bf", accent: "#547667", dark: false },
  evening: { page: "#e8e2ec", primary: "#3d3e56", text: "#555469", muted: "#686176", divider: "#c9bfd2", accent: "#716083", dark: false },
  night: { page: "#192d33", primary: "#edf3e8", text: "#d0ded6", muted: "#a6bbb4", divider: "#435b60", accent: "#b5d1bb", dark: true },
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
