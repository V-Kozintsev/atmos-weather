import { appName } from "../../src/lib/appInfo";
import { Platform } from "react-native";
import {
  FlexWidget,
  OverlapWidget,
  ImageWidget,
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
  windSpeed,
  type Forecast,
} from "../../src/lib/weather";
import {
  defaultOutfitPreferences,
  outfitForHour,
  type OutfitPreferences,
} from "../../src/lib/outfit";
import { read, write } from "./storage";
import { activeComfortOffset, type ComfortHistory } from "./comfortPolicy";
import { loadForecast, savedForecast, log } from "./weather";
import { widgetPeriod, widgetWeather, widgetWeatherLabel } from "./widgetScene";

export interface WidgetPreferences extends OutfitPreferences {
  fahrenheit: boolean;
  widgetDark?: boolean;
  widgetAutoTheme?: boolean;
  widgetClothes?: boolean;
}

type WidgetMode = "weather" | "outfit";

/** @param {string} kind - Действие кнопки. @param {string} color - Цвет линий. @returns {string} Компактная SVG-иконка для Android RemoteViews. */
function widgetActionIcon(kind: "outfit" | "weather" | "open" | "refresh" | "pending", color: string): string {
  const paths = {
    outfit: '<path d="m8 4-4 2-2 5 4 2 2-3v10h8V10l2 3 4-2-2-5-4-2c-1 3-7 3-8 0Z"/>',
    weather: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    open: '<path d="M14 4h6v6m0-6-9 9M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
    refresh: '<path d="M20 4v6h-6M4 20v-6h6M4.9 9a7.5 7.5 0 0 1 12.4-4.3L20 10M4 14l2.7 5.3A7.5 7.5 0 0 0 19.1 15"/>',
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

const skies = { morning: require("../assets/widget/morning.webp"), day: require("../assets/widget/day.webp"), evening: require("../assets/widget/evening.webp") };
const symbols = { sun: require("../assets/widget/sun.webp"), moon: require("../assets/widget/moon.webp"), cloud: require("../assets/widget/cloud.webp"), partial: require("../assets/widget/partial.webp"), rain: require("../assets/widget/rain.webp"), snow: require("../assets/widget/snow.webp") };

/** @param {object} props - Прогноз, настройки, размеры и состояние обновления. @returns {React.JSX.Element} Статичный погодный виджет с нативными зонами нажатия. */
export function AtmosWidget({ forecast, preferences, offline = false, mode = "weather", height = 180, width = 280, updating = false, status }: {
  forecast?: Forecast; preferences: WidgetPreferences; offline?: boolean; mode?: WidgetMode;
  height?: number; width?: number; updating?: boolean; status?: string;
}): React.JSX.Element {
  const period = forecast ? widgetPeriod(forecast) : "day";
  const weather = forecast ? widgetWeather(forecast.current) : "unknown";
  const dark = preferences.widgetAutoTheme !== false ? period === "evening" || period === "night" : preferences.widgetDark !== false;
  const foreground = dark ? "#fff6e8" : "#173f39";
  const secondary = dark ? "#ddd6e4" : "#4a6660";
  const ink = foreground;
  const compact = height < 170;
  const narrow = width < 270;
  const cardHeight = Math.max(120, Math.min(height, 204));
  const pad = height < 210 ? 10 : 14;
  const symbolSize = compact ? 42 : height < 210 ? 52 : 68;
  const daylight = period !== "night";
  const sceneColors = period === "morning" ? ["#ede4d7", "#d1e2e6"] as const : period === "evening" ? ["#534359", "#27283d"] as const : period === "night" ? ["#203344", "#111e30"] as const : ["#dce8e9", "#b9d1da"] as const;
  const snowy = weather === "snow" || weather === "blowingSnow";
  const wet = ["rain", "drizzle", "freezing", "storm", "hail"].includes(weather);
  const unsettled = wet || snowy || weather === "fog" || weather === "wind" || weather === "unknown";
  const backdrop = dark ? period === "evening" ? skies.evening : undefined : period === "morning" ? skies.morning : skies.day;
  const showingOutfit = mode === "outfit" && preferences.widgetClothes !== false;
  const outfit = forecast?.hours[0] ? outfitForHour(forecast.hours[0], preferences, forecast.hours[1]) : undefined;
  const icon = snowy ? symbols.snow : wet ? symbols.rain : weather === "fog" || forecast?.current.code === 3 ? symbols.cloud : forecast?.current.code === 0 ? daylight ? symbols.sun : symbols.moon : daylight ? symbols.partial : symbols.cloud;
  const overlay = weather === "storm" || weather === "hail" ? '<path d="m55 48-18 26h15l-8 22 29-33H58l11-15Z" fill="#ffd685"/>' : weather === "fog" ? '<path d="M12 61h76M20 73h60M10 85h77" stroke="#c4d7dc" stroke-width="4" stroke-linecap="round"/>' : weather === "wind" || weather === "blowingSnow" ? '<path d="M10 58h65q18 0 12-10M20 72h65M8 84h48q18 0 12 9" fill="none" stroke="#d8e9ed" stroke-width="3" stroke-linecap="round"/>' : weather === "freezing" ? '<path d="M25 72v21m-9-16 18 11m-18 0 18-11M69 72v21m-9-16 18 11m-18 0 18-11" stroke="#bdefff" stroke-width="3"/>' : "";
  const updated = forecast ? new Date(forecast.fetchedAt).toLocaleTimeString("ru-RU", { timeZone: forecast.timezone, hour: "2-digit", minute: "2-digit" }) : "";
  return <OverlapWidget clickAction="OPEN_APP" accessibilityLabel={`${appName}. Нажмите погоду, чтобы открыть приложение.`} style={{ width: "match_parent", height: cardHeight, borderRadius: 24, overflow: "hidden", backgroundColor: dark ? "#142d3c" : "#e2eeec" }}>
    {backdrop && !unsettled && <ImageWidget image={backdrop} imageWidth={width} imageHeight={cardHeight} resizeMode="stretch" style={{ width: "match_parent", height: "match_parent" }} />}
    {!unsettled && <FlexWidget style={{ width: "match_parent", height: "match_parent", backgroundGradient: { from: dark ? "#142d3c20" : "#edf4f120", to: dark ? "#14202f" : "#faf5ec", orientation: "TOP_BOTTOM" } }} />}
    <FlexWidget style={{ width: "match_parent", height: "match_parent", padding: pad, paddingBottom: 4, borderRadius: 24, borderWidth: 1, borderColor: dark ? "#8b8baf" : "#f4f5e9", justifyContent: "space-between", ...(unsettled ? { backgroundGradient: { from: preferences.widgetAutoTheme !== false ? sceneColors[0] : dark ? "#263343" : "#dce8e9", to: preferences.widgetAutoTheme !== false ? sceneColors[1] : dark ? "#3e445b" : "#b9d1da", orientation: "TL_BR" as const } } : {}) }}>
      <FlexWidget style={{ width: "match_parent", flexDirection: "row", alignItems: "center" }}>
        <FlexWidget style={{ flex: 1 }}><TextWidget text={forecast?.city.name || appName} maxLines={1} style={{ fontSize: 14, fontWeight: "700", color: foreground }} /></FlexWidget>
        <TextWidget text={offline ? "Сохранено" : updated} style={{ fontSize: 10, color: secondary }} />
      </FlexWidget>
      {forecast ? <FlexWidget style={{ width: "match_parent", flexDirection: "row", alignItems: "center" }}>
        <FlexWidget style={{ flex: 1 }}>
          <TextWidget text={`${temperature(forecast.current.temperature, preferences.fahrenheit)}°`} maxLines={1} style={{ fontSize: height < 210 ? 32 : 40, fontWeight: "600", color: foreground }} />
          {!compact && <TextWidget text={widgetWeatherLabel(weather) || condition(forecast.current.code)} maxLines={1} style={{ fontSize: 13, fontWeight: "600", color: foreground }} />}
          {!compact && <TextWidget text={`Ощущается как ${temperature(forecast.current.feels, preferences.fahrenheit)}° · Ветер ${windSpeed(forecast.current.wind)} м/с`} maxLines={1} style={{ fontSize: 11, color: secondary }} />}
        </FlexWidget>
        <OverlapWidget style={{ width: symbolSize, height: symbolSize }}>
          {!daylight && forecast.current.code > 0 && forecast.current.code <= 2 && <ImageWidget image={symbols.moon} imageWidth={symbolSize * .7} imageHeight={symbolSize * .7} style={{ width: symbolSize * .7, height: symbolSize * .7, marginLeft: symbolSize * .3 }} />}
          <ImageWidget image={icon} imageWidth={symbolSize} imageHeight={symbolSize} style={{ width: "match_parent", height: "match_parent" }} />
          {!!overlay && <SvgWidget svg={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${overlay}</svg>`} style={{ width: "match_parent", height: "match_parent" }} />}
        </OverlapWidget>
      </FlexWidget> : <TextWidget text="Откройте приложение и загрузите прогноз" maxLines={2} style={{ fontSize: 13, color: secondary }} />}
      <FlexWidget style={{ width: "match_parent", borderTopWidth: 1, borderTopColor: dark ? "#6e687a" : "#bbc8c1", paddingTop: compact ? 3 : 6 }}>
        {!compact && preferences.widgetClothes !== false && <TextWidget text={showingOutfit ? outfit?.pieces.outer || outfit?.pieces.upper || "Ваш комплект" : outfit?.title || "Ваш комплект"} maxLines={1} style={{ fontSize: 14, fontWeight: "600", color: foreground }} />}
        {!compact && <TextWidget text={status || (forecast ? preferences.widgetClothes === false ? widgetHint(forecast) : (showingOutfit && outfit ? `${outfit.pieces.lower} · ${outfit.pieces.shoes}` : outfit?.pieces.outer || outfit?.pieces.upper || widgetHint(forecast)) : "Загрузите прогноз в приложении")} maxLines={1} style={{ fontSize: 11, color: secondary }} />}
        <FlexWidget style={{ width: "match_parent", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <FlexWidget clickAction={preferences.widgetClothes === false ? "OPEN_APP" : "TOGGLE_OUTFIT"} accessibilityLabel={preferences.widgetClothes === false ? "Открыть приложение" : showingOutfit ? "Показать погоду" : "Смотреть образ"} style={{ height: 44, flex: 1, flexDirection: "row", alignItems: "center" }}>
            <TextWidget text={preferences.widgetClothes === false ? "Открыть" : showingOutfit ? "К погоде" : "Смотреть образ"} maxLines={1} style={{ fontSize: narrow ? 11 : 12, fontWeight: "600", color: ink }} />
            <SvgWidget svg={'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M6 18 18 6M7 6h11v11" fill="none" stroke="' + ink + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'} style={{ width: 16, height: 16, marginLeft: 5 }} />
          </FlexWidget>
          <FlexWidget clickAction="REFRESH_WEATHER" accessibilityLabel={updating ? "Прогноз обновляется" : "Обновить прогноз"} style={{ height: 44, paddingLeft: 10, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
            <SvgWidget svg={widgetActionIcon(updating ? "pending" : "refresh", ink)} style={{ width: 20, height: 20 }} />
            {!narrow && <TextWidget text={updating ? "Обновляем" : "Обновить"} maxLines={1} style={{ fontSize: 11, color: ink, marginLeft: 5 }} />}
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  </OverlapWidget>;
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
    widgetAutoTheme: data?.widgetAutoTheme !== false,
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
  const comfort = await read<ComfortHistory | null>("atmos-native-comfort", null);
  let forecast = await savedForecast(city);
  preferences.comfortOffset = activeComfortOffset(comfort, forecast?.current.time.slice(0, 10) || "");
  let offline = true;
  if (forecast && props.clickAction === "REFRESH_WEATHER") props.renderWidget(<AtmosWidget forecast={forecast} preferences={preferences} offline={true} mode={mode} height={props.widgetInfo.height} width={props.widgetInfo.width} updating />);
  try {
    if (props.clickAction !== "TOGGLE_OUTFIT" || !forecast) {
      forecast = await loadForecast(city, new AbortController().signal);
      offline = false;
    } else offline = Date.now() - forecast.fetchedAt > 30 * 60_000;
  } catch {
    log("widget offline", { cached: !!forecast });
  }
  preferences.comfortOffset = activeComfortOffset(comfort, forecast?.current.time.slice(0, 10) || "");
  props.renderWidget(
    <AtmosWidget
      forecast={forecast}
      preferences={preferences}
      offline={offline}
      mode={mode}
      height={props.widgetInfo.height} width={props.widgetInfo.width}
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
          height={info.height} width={info.width}
        />
      ),
    });
  } catch {
    log("widget sync unavailable");
  }
}

/** @returns {Promise<boolean>} Передан ли запрос оболочке; это не подтверждение размещения виджета. */
export async function pinWidget(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    const requested = await requestPinWidget({ widgetName: "AtmosWeather" });
    log("widget pin requested", { requested });
    return requested;
  } catch {
    log("widget pin unavailable");
    return false;
  }
}
