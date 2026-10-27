import { TurboModuleRegistry } from "react-native";
import type { AnalyticsEvent, AnalyticsParameters } from "./analyticsEvents";
import { log } from "./weather";
import { appVersion } from "../../src/lib/appInfo";
type Client = typeof import("@appmetrica/react-native-analytics").default;
let client: Client | undefined;
let enabled = false;

/** @param {boolean} next - Разрешение отправлять статистику использования. @returns {void} Включает SDK по выбору пользователя, не передавая координаты и рекламные идентификаторы. */
export function setAnalyticsEnabled(next: boolean): void {
  enabled = next;
  try {
    if (!client && next) {
      if (!TurboModuleRegistry.get("AppMetrica")) { log("analytics unavailable"); return; }
      client = require("@appmetrica/react-native-analytics").default as Client;
      client.activate({ apiKey: "db42e37f-73cf-4016-9779-71d42dd82f32", appVersion, statisticsSending: false, locationTracking: false, appOpenTrackingEnabled: false, advIdentifiersTracking: false, crashReporting: false, nativeCrashReporting: false, logs: __DEV__, appEnvironment: { build: __DEV__ ? "development" : "production" } });
      log("analytics initialized");
    }
    client?.setDataSendingEnabled(next);
    log("analytics sending changed", { enabled: next });
  } catch (error) {
    enabled = false;
    log("analytics initialization failed", { kind: error instanceof Error ? error.name : "unknown" });
  }
}

/** @param {AnalyticsEvent} event - Согласованное имя события. @param {AnalyticsParameters} parameters - Значения из ограниченного списка без текста поиска и города. @returns {void} Отправляет продуктовые события только при включённой статистике. */
export function trackEvent(event: AnalyticsEvent, parameters: AnalyticsParameters = {}): void {
  if (!enabled || !client) return;
  try {
    client.reportEvent(event, parameters);
    log("analytics event", { event });
  } catch { log("analytics event failed", { event }); }
}
