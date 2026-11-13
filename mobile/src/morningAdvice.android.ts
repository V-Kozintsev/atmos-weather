import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import type { Forecast } from "../../src/lib/weather";
import type { OutfitOccasion, OutfitPreferences, WarmthPreference } from "../../src/lib/outfit";
import { defaultMorningTime, isMorningTime, morningSchedule, type MorningTime } from "../../src/lib/morning";
import { read } from "./storage";
import { activeComfortOffset, type ComfortHistory } from "./comfortPolicy";
import { log } from "./weather";

export interface MorningPreferences extends OutfitPreferences { fahrenheit: boolean; morningAdvice: boolean; morningTime: MorningTime }

const channelId = "morning-advice";
const prefix = "morning-advice-";
let handledResponse = "";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

/** @returns {Promise<void>} Создаёт отдельный канал, который пользователь может выключить в настройках Android. */
async function ensureChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync(channelId, {
    name: "Утренний совет",
    description: "Что надеть сегодня — одно уведомление утром",
    importance: Notifications.AndroidImportance.DEFAULT,
    showBadge: false,
  });
}

/** @returns {Promise<boolean>} Есть ли разрешение показывать уведомления; системный запрос появляется только по действию пользователя. */
export async function requestMorningAdvice(): Promise<boolean> {
  try {
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    log("morning permission unavailable");
    return false;
  }
}

/** @returns {Promise<void>} Снимает только утренние советы приложения. */
export async function cancelMorningAdvice(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((item) => item.identifier.startsWith(prefix)).map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)));
}

/** @param {Forecast} forecast - Последний прогноз выбранного города. @param {MorningPreferences} preferences - Включение, время и стиль. @returns {Promise<number>} Сколько утренних советов запланировано; каждый новый прогноз заменяет прежние тексты. */
export async function scheduleMorningAdvice(forecast: Forecast, preferences: MorningPreferences): Promise<number> {
  try {
    await cancelMorningAdvice();
    if (!preferences.morningAdvice) return 0;
    if (!(await Notifications.getPermissionsAsync()).granted) { log("morning advice blocked"); return 0; }
    await ensureChannel();
    const plan = morningSchedule(forecast, preferences.morningTime, preferences, preferences.fahrenheit, Date.now());
    for (const item of plan) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${prefix}${item.date}`,
        content: { title: item.title, body: item.body, data: { screen: "outfit" } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.at, channelId },
      });
    }
    log("morning advice scheduled", { count: plan.length });
    return plan.length;
  } catch {
    log("morning advice unavailable");
    return 0;
  }
}

/** @param {Forecast} forecast - Прогноз, загруженный виджетом в фоне. @returns {Promise<void>} Обновляет утренние тексты по сохранённым настройкам без открытия приложения. */
export async function refreshMorningAdvice(forecast: Forecast): Promise<void> {
  const saved = await read<Record<string, unknown> | null>("atmos-native-preferences", null);
  if (!saved || saved.morningAdvice !== true) return;
  const comfort = await read<ComfortHistory | null>("atmos-native-comfort", null);
  const occasion: OutfitOccasion = saved.occasion === "office" || saved.occasion === "sport" ? saved.occasion : "casual";
  const warmth: WarmthPreference = saved.warmth === "warmer" || saved.warmth === "lighter" ? saved.warmth : "balanced";
  await scheduleMorningAdvice(forecast, {
    gender: saved.gender === "woman" ? "woman" : "man", occasion, warmth,
    comfortOffset: activeComfortOffset(comfort, forecast.current.time.slice(0, 10)),
    fahrenheit: saved.fahrenheit === true, morningAdvice: true,
    morningTime: isMorningTime(saved.morningTime) ? saved.morningTime : defaultMorningTime,
  });
}

/** @param {() => void} onOpen - Переход к комплекту. @returns {void} Открывает «Что надеть» после нажатия на утренний совет, один раз на каждое уведомление. */
export function useMorningAdviceOpen(onOpen: () => void): void {
  const response = Notifications.useLastNotificationResponse();
  const callback = useRef(onOpen);
  callback.current = onOpen;
  useEffect(() => {
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const key = `${response.notification.request.identifier}:${response.notification.date}`;
    if (!response.notification.request.identifier.startsWith(prefix) || key === handledResponse) return;
    handledResponse = key;
    callback.current();
  }, [response]);
}
