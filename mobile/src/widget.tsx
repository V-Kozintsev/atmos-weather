import { Platform } from "react-native";
import {
  FlexWidget,
  TextWidget,
  SvgWidget,
  requestWidgetUpdate,
  requestPinWidget,
  type WidgetTaskHandlerProps,
} from "react-native-android-widget";
import {
  CITIES,
  condition,
  isCity,
  temperature,
  type Forecast,
} from "../../src/lib/weather";
import {
  defaultOutfitPreferences,
  outfitForHour,
  type OutfitPreferences,
} from "../../src/lib/outfit";
import { read, write } from "./storage";
import { loadForecast, savedForecast, log } from "./weather";
import { weatherArtwork } from "./weatherArtwork";

export interface WidgetPreferences extends OutfitPreferences {
  fahrenheit: boolean;
  widgetDark?: boolean;
  widgetClothes?: boolean;
}

type WidgetMode = "weather" | "outfit";

/** @param {string} kind - Действие кнопки. @param {string} color - Цвет линий. @returns {string} Компактная SVG-иконка для Android RemoteViews. */
function widgetActionIcon(kind: "outfit" | "weather" | "open" | "refresh" | "pending", color: string): string {
  const paths = {
    outfit: '<path d="m8 4-4 2-2 5 4 2 2-3v10h8V10l2 3 4-2-2-5-4-2c-1 3-7 3-8 0Z"/>',
    weather: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    open: '<path d="M14 4h6v6m0-6-9 9M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
    refresh: '<path d="M20 7v5h-5M4 17v-5h5M19 11a7 7 0 0 0-12-4L4 10m1 3a7 7 0 0 0 12 4l3-3"/>',
    pending: '<circle cx="12" cy="12" r="8" opacity=".3"/><path d="M12 4a8 8 0 0 1 8 8"/>',
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[kind]}</svg>`;
}

/** @param {Forecast} forecast - Текущая погода. @returns {string} Короткая подсказка с приоритетом осадков и ветра. */
export function widgetHint(forecast: Forecast): string {
  const { code, feels, wind } = forecast.current;
  if (code >= 95 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (forecast.hours[0]?.rain || 0) > .2) return "Захватите зонт — пригодится";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "Снег: тёплая обувь в самый раз";
  if (wind >= 25) return "Ветрено. Добавьте верхний слой";
  if (feels <= 5) return "Сегодня лучше одеться теплее";
  if (feels >= 27) return "Лёгкая одежда и головной убор";
  return forecast.current.day ? "Можно собираться на прогулку" : "Вечером пригодится лёгкий слой";
}

/** @param {object} props - Прогноз, настройки и признак офлайн. @returns {React.JSX.Element} Масштабируемый Android-виджет без постоянной фоновой службы. */
export function AtmosWidget({
  forecast,
  preferences,
  offline = false,
  mode = "weather",
  height = 180,
  updating = false,
  status,
}: {
  forecast?: Forecast;
  preferences: WidgetPreferences;
  offline?: boolean;
  mode?: WidgetMode;
  height?: number;
  updating?: boolean;
  status?: string;
}): React.JSX.Element {
  const dark = preferences.widgetDark !== false;
  const foreground = dark ? "#f7f8f2" : "#173b48";
  const secondary = dark ? "#d0e1e6" : "#42616b";
  const compact = height < 150;
  const showingOutfit = mode === "outfit" && preferences.widgetClothes !== false;
  const button = dark ? "#dcece7" : "#214b50";
  const buttonInk = dark ? "#193b43" : "#f5faf7";
  const hour = forecast?.hours[0];
  const outfit = hour ? outfitForHour(hour, preferences) : undefined;
  const updated = forecast
    ? new Date(forecast.fetchedAt).toLocaleTimeString("ru-RU", {
        timeZone: forecast.timezone,
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel="Atmos: нажмите погоду, чтобы открыть приложение. Кнопки переключают одежду и обновляют прогноз."
      style={{
        height: Math.min(Math.max(height, 120), 180),
        width: "match_parent",
        padding: compact ? 8 : 10,
        borderRadius: 22,
        backgroundGradient: { from: dark ? "#254d56" : "#e0edf0", to: dark ? "#142d3b" : "#c6d9dc", orientation: "TL_BR" },
        justifyContent: "space-between",
      }}
    >
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", alignItems: "center" }}>
        <FlexWidget style={{ flex: 1 }}><TextWidget text={forecast?.city.name || "Atmos"} maxLines={1} style={{ fontSize: 13, fontWeight: "700", color: foreground }} /></FlexWidget>
        <TextWidget text="MET" style={{ fontSize: 10, color: secondary }} />
      </FlexWidget>
      {forecast ? (
        <FlexWidget style={{ width: "match_parent" }}>
          {!showingOutfit ? <FlexWidget
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              width: "match_parent",
            }}
          >
            <TextWidget
              text={`${temperature(forecast.current.temperature, preferences.fahrenheit)}°`}
              style={{ fontSize: compact ? 32 : 38, fontWeight: "600", color: foreground }}
            />
            <SvgWidget
              svg={weatherArtwork(
                forecast.current.code,
                !forecast.current.day,
              )}
              style={{ width: compact ? 40 : 50, height: compact ? 40 : 50 }}
            />
          </FlexWidget> : <FlexWidget style={{ width: "match_parent", paddingVertical: 4 }}>
            <TextWidget text={outfit?.title || "Что надеть"} maxLines={1} style={{ fontSize: 16, fontWeight: "700", color: foreground }} />
            <TextWidget text={outfit ? `${outfit.pieces.outer || outfit.pieces.upper} · ${outfit.pieces.shoes}` : "Загрузите прогноз в Atmos"} maxLines={compact ? 1 : 2} style={{ fontSize: 13, color: secondary, marginTop: 4 }} />
          </FlexWidget>}
          {!compact && !showingOutfit && <TextWidget
            text={`${offline ? "Сохранено · " : ""}${condition(forecast.current.code)} · ${temperature(forecast.current.feels, preferences.fahrenheit)}° по ощущениям`}
            maxLines={1}
            style={{ fontSize: 12, color: secondary }}
          />}
          {height >= 170 ? (
            <TextWidget
              text={status || (preferences.widgetClothes !== false && !offline ? widgetHint(forecast) : `${offline ? "Сохранено" : "Обновлено"} ${updated} · MET Norway`)}
              maxLines={1}
              style={{ fontSize: 12, color: foreground, marginTop: 3 }}
            />
          ) : null}
        </FlexWidget>
      ) : (
        <TextWidget
          text="Откройте Atmos и загрузите прогноз"
          style={{ fontSize: 14, color: secondary, marginTop: 8 }}
        />
      )}
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 3 }}>
        <FlexWidget clickAction={preferences.widgetClothes === false ? "OPEN_APP" : "TOGGLE_OUTFIT"} accessibilityLabel={preferences.widgetClothes === false ? "Открыть Atmos" : showingOutfit ? "Показать погоду в виджете" : "Показать одежду в виджете"} style={{ height: 44, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: button }}>
          <SvgWidget svg={widgetActionIcon(preferences.widgetClothes === false ? "open" : showingOutfit ? "weather" : "outfit", buttonInk)} style={{ width: 18, height: 18, marginRight: 7 }} />
          <TextWidget text={preferences.widgetClothes === false ? "Открыть" : showingOutfit ? "Погода" : "Что надеть"} style={{ fontSize: 12, fontWeight: "600", color: buttonInk }} />
        </FlexWidget>
        <FlexWidget clickAction="REFRESH_WEATHER" accessibilityLabel={updating ? "Прогноз обновляется" : "Обновить прогноз"} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: dark ? "#698991" : "#9bbcc3", alignItems: "center", justifyContent: "center", backgroundColor: dark ? "#2d505c" : "#edf5f4" }}>
          <SvgWidget svg={widgetActionIcon(updating ? "pending" : "refresh", foreground)} style={{ width: 21, height: 21 }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}

/** @returns {Promise<WidgetPreferences>} Проверенные настройки приложения для фонового процесса. */
async function widgetPreferences(): Promise<WidgetPreferences> {
  const data = await read<Partial<WidgetPreferences> | null>(
    "atmos-native-preferences",
    null,
  );
  return {
    ...defaultOutfitPreferences,
    gender: data?.gender === "man" ? "man" : "woman",
    occasion:
      data?.occasion === "office" || data?.occasion === "sport"
        ? data.occasion
        : "casual",
    warmth:
      data?.warmth === "warmer" || data?.warmth === "lighter"
        ? data.warmth
        : "balanced",
    fahrenheit: data?.fahrenheit === true,
    widgetDark: data?.widgetDark !== false,
    widgetClothes: data?.widgetClothes !== false,
  };
}

/** @param {WidgetTaskHandlerProps} props - Системное событие виджета. @returns {Promise<void>} Обновляет погоду либо явно показывает сохранённый прогноз. */
export async function widgetTaskHandler(
  props: WidgetTaskHandlerProps,
): Promise<void> {
  if (props.widgetAction === "WIDGET_DELETED") return;
  const modeKey = `atmos-widget-mode:${props.widgetInfo.widgetId}`;
  const savedMode = await read<WidgetMode>(modeKey, "weather");
  const mode = props.clickAction === "TOGGLE_OUTFIT" ? savedMode === "outfit" ? "weather" : "outfit" : savedMode === "outfit" ? "outfit" : "weather";
  if (props.clickAction === "TOGGLE_OUTFIT") await write(modeKey, mode);
  log("widget update started", { action: props.widgetAction });
  const saved = await read<unknown>("atmos-native-city", CITIES[2]);
  const city = isCity(saved) ? saved : CITIES[2];
  const preferences = await widgetPreferences();
  let forecast = await savedForecast(city);
  let offline = true;
  if (forecast && props.clickAction === "REFRESH_WEATHER") props.renderWidget(<AtmosWidget forecast={forecast} preferences={preferences} offline={true} mode={mode} height={props.widgetInfo.height} updating />);
  try {
    if (props.clickAction !== "TOGGLE_OUTFIT" || !forecast) {
      forecast = await loadForecast(city, new AbortController().signal);
      offline = false;
    } else offline = Date.now() - forecast.fetchedAt > 30 * 60_000;
  } catch {
    log("widget offline", { cached: !!forecast });
  }
  props.renderWidget(
    <AtmosWidget
      forecast={forecast}
      preferences={preferences}
      offline={offline}
      mode={mode}
      height={props.widgetInfo.height}
      status={props.clickAction === "REFRESH_WEATHER" ? offline ? "Нет сети — сохранённая погода" : "Прогноз актуален" : undefined}
    />,
  );
}

/** @param {Forecast} forecast - Загруженный прогноз. @param {WidgetPreferences} preferences - Оформление и единицы. @param {boolean} offline - Сохранённые данные. @returns {Promise<void>} Синхронизирует все установленные виджеты с приложением. */
export async function syncWidgets(
  forecast: Forecast,
  preferences: WidgetPreferences,
  offline: boolean,
): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await requestWidgetUpdate({
      widgetName: "AtmosWeather",
      renderWidget: async (info) => (
        <AtmosWidget
          forecast={forecast}
          preferences={preferences}
          offline={offline}
          mode={await read<WidgetMode>(`atmos-widget-mode:${info.widgetId}`, "weather")}
          height={info.height}
        />
      ),
    });
  } catch {
    log("widget sync unavailable");
  }
}

/** @returns {Promise<boolean>} Запрашивает системное подтверждение установки виджета. */
export async function pinWidget(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    return await requestPinWidget({ widgetName: "AtmosWeather" });
  } catch {
    log("widget pin unavailable");
    return false;
  }
}
