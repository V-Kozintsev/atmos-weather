import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AppState, NativeModules, View, type LayoutChangeEvent } from "react-native";
import type { BannerAdSize as Size } from "yandex-mobile-ads";
import { Text } from "./typography";
import { useTimeTheme } from "./timeTheme";
import { log } from "./weather";
import { trackEvent } from "./analytics";
import type { AnalyticsEvent, AnalyticsParameters } from "./analyticsEvents";

type Ads = typeof import("yandex-mobile-ads");
let initialization: Promise<Ads> | undefined;
let client: Ads | undefined;
let personalization = false;
const retryDelay = 60_000;

/** @param {boolean} enabled - Явное согласие пользователя в настройках рекламы. @returns {void} Применяет выбор до инициализации SDK и сразу при его отзыве. Идентификаторы не считываются приложением и не попадают в логи. */
export function setAdPersonalization(enabled: boolean): void {
  personalization = enabled === true;
  try {
    client?.MobileAds.setAgeRestrictedUser(!personalization);
    client?.MobileAds.setUserConsent(personalization);
  }
  catch { adLog("consent update failed"); }
  adLog("personalization changed", { enabled: personalization });
}

/** @param {string} event - Состояние SDK. @param {Record<string, unknown>} detail - Безопасные технические признаки. @returns {void} Пишет диагностику в dev или при явном включении в production. */
function adLog(event: string, detail: Record<string, unknown> = {}): void {
  if (__DEV__) console.info(`[Atmos Ads] ${event}`, detail);
  else log(`ads: ${event}`, detail);
}

/** @param {AnalyticsEvent} event - Этап рекламы. @param {AnalyticsParameters} detail - Только технические признаки. @returns {void} Исключает тестовые объявления из продуктового отчёта. */
function adEvent(event: AnalyticsEvent, detail: AnalyticsParameters = {}): void {
  adLog(event, { ...detail, test: __DEV__ });
  if (!__DEV__) trackEvent(event, { screen: "weather", ...detail });
}

/** @returns {Promise<Ads>} Подключает SDK без геолокации, передавая только фактическое согласие пользователя. */
function initializeAds(): Promise<Ads> {
  if (!initialization) initialization = (async () => {
    adLog("initialization");
    const sdk: Ads = require("yandex-mobile-ads");
    client = sdk;
    sdk.MobileAds.setLocationConsent(false);
    sdk.MobileAds.setAgeRestrictedUser(!personalization);
    sdk.MobileAds.setUserConsent(personalization);
    await sdk.MobileAds.initialize();
    adLog("ready");
    return sdk;
  })().catch((error: unknown) => {
    initialization = undefined;
    adLog("initialization failed", { kind: error instanceof Error ? error.name : "unknown" });
    throw error;
  });
  return initialization;
}

interface BannerProps { sdk: Ads; size: Size; dark: boolean; attempt: number; onFailure: () => void }

/** @param {BannerProps} props - Размер, оформление и номер попытки. @returns {React.JSX.Element} Отделяет жизненный цикл объявления от обновлений прогноза. */
const Banner = memo(function Banner({ sdk, size, dark, attempt, onFailure }: BannerProps): React.JSX.Element {
  const outcome = useRef<NonNullable<AnalyticsParameters["adState"]>>("loading");
  const request = useRef({ adUnitId: __DEV__ ? "demo-banner-yandex" : "R-M-20287476-1", adTheme: dark ? sdk.AdTheme.Dark : sdk.AdTheme.Light });
  useEffect(() => {
    adEvent("ad_requested", { attempt });
    return () => { adEvent("ad_disposed", { attempt, adState: outcome.current }); };
  }, [attempt]);
  /** @returns {void} Отмечает загрузку, которая ещё не означает видимый показ. */
  function loaded(): void { outcome.current = "loaded"; adEvent("ad_loaded", { attempt }); }
  /** @returns {void} Учитывает только показ, подтверждённый рекламным SDK. */
  function impressed(): void { outcome.current = "impressed"; adEvent("ad_impression", { attempt }); }
  /** @param {unknown} event - Нативное событие с вложенным error. @returns {void} Передаёт только числовой код без описания и данных объявления. */
  function failed(event: unknown): void {
    const payload = (event as { nativeEvent?: { error?: { code?: unknown }; code?: unknown } })?.nativeEvent;
    const code = payload?.error?.code ?? payload?.code;
    outcome.current = "failed";
    adEvent("ad_failed", { attempt, errorCode: typeof code === "number" && Number.isFinite(code) ? code : undefined });
    onFailure();
  }
  return <sdk.BannerView size={size} adRequest={request.current} onAdLoaded={loaded} onAdImpression={impressed} onAdFailedToLoad={failed} />;
});

/** @param {object} props - Сохранённый выбор персонализации. @returns {React.JSX.Element | null} Баннер с актуальным согласием и одной отложенной повторной попыткой. */
export function WeatherAd({ personalizedAds = false }: { personalizedAds?: boolean } = {}): React.JSX.Element | null {
  const theme = useTimeTheme();
  const [width, setWidth] = useState(0);
  const [ready, setReady] = useState<{ sdk: Ads; size: Size; width: number; personalizedAds: boolean }>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(1);
  const retryAt = useRef(0);
  useEffect(() => {
    if (!NativeModules.YandexMobileAds) { adLog("native module unavailable"); return; }
    if (!width) return;
    let active = true;
    /** @returns {Promise<void>} Рассчитывает ограниченный по высоте баннер; отменённая загрузка не меняет экран. */
    async function prepare(): Promise<void> {
      try {
        const sdk = await initializeAds();
        const size = await sdk.BannerAdSize.inlineSize(width, 100);
        if (active) setReady({ sdk, size, width, personalizedAds });
      } catch {
        if (active) { adEvent("ad_failed", { attempt }); retryAt.current = Date.now() + retryDelay; setFailed(true); }
      }
    }
    void prepare();
    return () => { active = false; };
  }, [width, attempt, personalizedAds]);
  useEffect(() => {
    if (!failed || attempt >= 2) return;
    /** @returns {void} Повторяет запрос один раз, только когда приложение на экране и прошла пауза. */
    function retry(): void {
      if (AppState.currentState !== "active" || Date.now() < retryAt.current) return;
      setReady(undefined);
      setFailed(false);
      setAttempt(2);
    }
    const timer = setTimeout(retry, Math.max(0, retryAt.current - Date.now()));
    const listener = AppState.addEventListener("change", retry);
    return () => { clearTimeout(timer); listener.remove(); };
  }, [failed, attempt]);
  /** @param {LayoutChangeEvent} event - Измерение контейнера. @returns {void} Ограничивает баннер доступной шириной, включая поворот экрана. */
  function measure(event: LayoutChangeEvent): void {
    const available = Math.floor(Math.min(event.nativeEvent.layout.width, 640));
    if (available > 0) setWidth(available);
  }
  /** @returns {void} Убирает неудавшееся объявление, сохраняя возможность одной повторной попытки. */
  const onFailure = useCallback(function onFailure(): void { retryAt.current = Date.now() + retryDelay; setFailed(true); }, []);
  if (!NativeModules.YandexMobileAds || failed) return null;
  return <View onLayout={measure} style={{ alignItems: "center", minHeight: 140, paddingTop: 18, paddingBottom: 8, gap: 6 }}>
    {ready?.width === width && ready.personalizedAds === personalizedAds && <>
      <Text style={{ alignSelf: "flex-start", color: theme.muted, fontSize: 10 }}>Реклама</Text>
      <Banner key={`${width}:${attempt}:${theme.dark}:${personalizedAds}`} sdk={ready.sdk} size={ready.size} dark={theme.dark} attempt={attempt} onFailure={onFailure} />
    </>}
  </View>;
}
