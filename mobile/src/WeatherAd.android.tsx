import { useEffect, useState } from "react";
import { NativeModules, View, useWindowDimensions } from "react-native";
import type { BannerAdSize as Size } from "yandex-mobile-ads";
import { Text } from "./typography";
import { useTimeTheme } from "./timeTheme";
import { log } from "./weather";

type Ads = typeof import("yandex-mobile-ads");
let initialization: Promise<Ads> | undefined;

/** @param {string} event - Состояние SDK. @param {Record<string, unknown>} detail - Безопасные технические признаки. @returns {void} Пишет диагностику в dev или при явном включении в production. */
function adLog(event: string, detail: Record<string, unknown> = {}): void {
  if (__DEV__) console.info(`[Atmos Ads] ${event}`, detail);
  else log(`ads: ${event}`, detail);
}

/** @returns {Promise<Ads>} Подключает SDK один раз без передачи геолокации и согласия на персонализацию. */
function initializeAds(): Promise<Ads> {
  if (!initialization) initialization = (async () => {
    adLog("initialization");
    const sdk: Ads = require("yandex-mobile-ads");
    sdk.MobileAds.setLocationConsent(false);
    sdk.MobileAds.setUserConsent(false);
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

/** @returns {React.JSX.Element | null} Один компактный баннер в потоке страницы; ошибки скрывают блок, dev использует тестовый ID. */
export function WeatherAd(): React.JSX.Element | null {
  const theme = useTimeTheme();
  const { width } = useWindowDimensions();
  const bannerWidth = Math.max(1, Math.floor(Math.min(width - 40, 640)));
  const [ready, setReady] = useState<{ sdk: Ads; size: Size; width: number }>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setFailed(false);
    if (!NativeModules.YandexMobileAds) {
      adLog("native module unavailable");
      return;
    }
    /** @returns {Promise<void>} Рассчитывает ограниченный по высоте баннер; отменённая загрузка не меняет экран. */
    async function prepare(): Promise<void> {
      try {
        const sdk = await initializeAds();
        const size = await sdk.BannerAdSize.inlineSize(bannerWidth, 100);
        if (active) setReady({ sdk, size, width: bannerWidth });
      } catch {
        if (active) setFailed(true);
      }
    }
    void prepare();
    return () => { active = false; };
  }, [bannerWidth]);
  if (!ready || ready.width !== bannerWidth || failed) return null;
  const { BannerView, AdTheme } = ready.sdk;
  return <View style={{ alignItems: "center", paddingTop: 18, paddingBottom: 8, gap: 6 }}>
    <Text style={{ alignSelf: "flex-start", color: theme.muted, fontSize: 10 }}>Реклама</Text>
    <BannerView size={ready.size} adRequest={{ adUnitId: __DEV__ ? "demo-banner-yandex" : "R-M-20287476-1", adTheme: theme.dark ? AdTheme.Dark : AdTheme.Light }}
      onAdLoaded={() => adLog("loaded", { test: __DEV__ })}
      onAdImpression={() => adLog("impression", { test: __DEV__ })}
      onAdFailedToLoad={(event) => { adLog("load failed", { code: event.nativeEvent.code }); setFailed(true); }} />
  </View>;
}
