import { useCallback } from "react";
import { View, useWindowDimensions } from "react-native";
import { WidgetPreview } from "react-native-android-widget";
import { AtmosWidget, type WidgetPreferences } from "./widget";
import type { Forecast } from "../../src/lib/weather";
/** @param {object} props - Прогноз и настройки. @returns {React.JSX.Element} Настоящий RemoteViews-превью из общего компонента виджета. */
export function WidgetSettingsPreview({ forecast, preferences }: { forecast?: Forecast; preferences: WidgetPreferences }): React.JSX.Element {
  const { width } = useWindowDimensions();
  const previewWidth = Math.floor(Math.min(width - 48, 340));
  /** @param {object} size - Размер нативного превью. @returns {React.JSX.Element} Тот же виджет, что на рабочем экране. */
  const renderWidget = useCallback(({ width, height }: { width: number; height: number }) => <AtmosWidget forecast={forecast} preferences={preferences} width={width} height={height} />, [forecast, preferences]);
  return <View pointerEvents="none" accessibilityLabel="Предпросмотр виджета" style={{ alignItems: "center", paddingVertical: 8 }}><WidgetPreview width={previewWidth} height={204} renderWidget={renderWidget} /></View>;
}
