import type { AnalyticsEvent, AnalyticsParameters } from "./analyticsEvents";
/** @param {boolean} enabled - Предпочтение пользователя. @returns {void} Нативная аналитика не подключается на вебе и iOS. */
export function setAnalyticsEnabled(_enabled: boolean): void {}
/** @param {AnalyticsEvent} event - Имя события. @param {AnalyticsParameters} parameters - Только перечислимые технические параметры. @returns {void} Нативные события не отправляются с других платформ. */
export function trackEvent(_event: AnalyticsEvent, _parameters: AnalyticsParameters = {}): void {}
