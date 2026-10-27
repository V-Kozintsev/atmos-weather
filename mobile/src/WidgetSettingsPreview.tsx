import type { Forecast } from "../../src/lib/weather";
import type { WidgetPreferences } from "./widget";
/** @param {object} props - Прогноз и настройки Android. @returns {null} На других платформах системный виджет не показывается. */
export function WidgetSettingsPreview(_props: { forecast?: Forecast; preferences: WidgetPreferences }): null { return null; }
