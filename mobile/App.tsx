import { TimeThemeContext, timeThemes, useSceneTheme } from "./src/timeTheme";
import { useEffect, useRef, useState } from "react";
import { useFonts } from "expo-font";
import { fontAssets } from "./src/typography";
import { ActivityIndicator, Alert, BackHandler, Linking, Platform, Pressable, RefreshControl, ScrollView, Share, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { Text } from "./src/typography";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";
import {
  CITIES,
  isCity,
  type City,
} from "../src/lib/weather";
import {
  defaultOutfitPreferences,
  outfitForDay,
  outfitForHour,
  type OutfitPreferences,
} from "../src/lib/outfit";
import { useForecast } from "./src/useForecast";
import { read, write } from "./src/storage";
import { cityNearLocation, sameCity, setDiagnostics, log } from "./src/weather";
import { Chip, s } from "./src/ui";
import { WeatherHome } from "./src/WeatherHome";
import { OutfitScreen } from "./src/OutfitScreen";
import { CitySearch } from "./src/CitySearch";
import { FirstRun } from "./src/FirstRun";
import { ComfortSheet } from "./src/ComfortSheet";
import { activeComfortOffset, recordComfort, type ComfortHistory, type ComfortVote } from "./src/comfortPolicy";
import { ForecastLoading } from "./src/ForecastLoading";
import { SettingsScreen } from "./src/SettingsScreen";
import { OutfitCustomization } from "./src/OutfitCustomization";
import { pinWidget, syncWidgets } from "./src/widget";
import { useReviews, reviewUrl } from "./src/reviews";
import { ReviewSheet } from "./src/ReviewSheet";
import { storeName } from "./src/distribution";
import { useAppUpdates } from "./src/useAppUpdates";
import { setAnalyticsEnabled, trackEvent } from "./src/analytics";
import { WeatherAd, setAdPersonalization } from "./src/WeatherAd";
import { MorningOffer } from "./src/MorningOffer";
import { cancelMorningAdvice, requestMorningAdvice, scheduleMorningAdvice, useMorningAdviceOpen } from "./src/morningAdvice";
import { defaultMorningTime, isMorningTime, type MorningTime } from "../src/lib/morning";
import { appVersion } from "../src/lib/appInfo";
import { UpdateCard } from "./src/UpdateCard";
import { sceneModes, cityPhotoCredits, type SceneMode } from "./src/CityBackdrop";
import { useCityPhoto } from "./src/cityPhotos";
import { cityPhotoKey } from "./src/CityBackdrop";

import { initialWebCity, legacyWebValue } from "./src/web";

type Tab = "weather" | "outfit" | "settings";
interface Preferences extends OutfitPreferences {
  gender: "woman" | "man";
  fahrenheit: boolean;
  diagnostics: boolean;
  personalizedAds: boolean;
  widgetDark: boolean;
  widgetAutoTheme: boolean;
  widgetClothes: boolean;
  cityBackground: boolean;
  weatherMotion: boolean;
  sceneMode: SceneMode;
  morningAdvice: boolean;
  morningTime: MorningTime;
}
const initial: Preferences = {
  ...defaultOutfitPreferences,
  gender: "man",
  fahrenheit: false,
  diagnostics: false,
  personalizedAds: false,
  widgetDark: true,
  widgetAutoTheme: true,
  widgetClothes: true,
  cityBackground: true,
  weatherMotion: true,
  sceneMode: "auto",
  morningAdvice: false,
  morningTime: defaultMorningTime,
};
const tabs: [Tab, string, keyof typeof Ionicons.glyphMap][] = [
  ["weather", "Погода", "partly-sunny-outline"],
  ["outfit", "Что надеть", "shirt-outline"],
  ["settings", "Настройки", "options-outline"],
];

/** @returns {React.JSX.Element} Мобильный Atmos с нижней навигацией и настройками на устройстве. */
function Atmos(): React.JSX.Element {
  const [city, setCity] = useState<City>();
  const [favorites, setFavorites] = useState<City[]>([]);
  const [preferences, setPreferences] = useState(initial);
  const [hydrated, setHydrated] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [outfitSetupDone, setOutfitSetupDone] = useState(false);
  const [outfitSetupVisible, setOutfitSetupVisible] = useState(false);
  const [comfort, setComfort] = useState<ComfortHistory | null>(null);
  const [comfortVisible, setComfortVisible] = useState(false);
  const [tab, setTab] = useState<Tab>("weather");
  const scroll = useRef<ScrollView>(null);
  const heroHeight = useRef(355);
  const heroOnScreen = useRef(true);
  const [heroVisible, setHeroVisible] = useState(true);
  const insets = useSafeAreaInsets();
  const viewport = useWindowDimensions();
  const wide = viewport.width >= 1000 || (viewport.width >= 600 && viewport.width > viewport.height);
  const compactWeather = tab === "weather" && viewport.width < 600 && viewport.height < 1000 && viewport.fontScale <= 1.15;
  const [period, setPeriod] = useState<"hour" | "day">("hour");
  const [dayIndex, setDayIndex] = useState(0);
  const [searchVisible, setSearchVisible] = useState(false);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState("");
  const [returning, setReturning] = useState(false);
  const [morningOfferDismissed, setMorningOfferDismissed] = useState(true);
  const [morningBusy, setMorningBusy] = useState(false);
  const { forecast, loading, stale, error, refresh } = useForecast(city);
  const sceneTheme = useSceneTheme(forecast, preferences.sceneMode);
  const theme = onboarding ? timeThemes.morning : tab === "settings" ? timeThemes.day : sceneTheme;
  const cityPhoto = useCityPhoto(city, preferences.cityBackground && !!city && !cityPhotoKey(city));
  const updates = useAppUpdates(hydrated && !onboarding);
  const reviews = useReviews(!!forecast && !stale && !loading, hydrated && !onboarding && !outfitSetupVisible && !comfortVisible && !searchVisible && !locating && !updates.state.visible && !updates.busy, tab === "outfit" && !error);
  useMorningAdviceOpen(() => {
    trackEvent("morning_advice_opened");
    setPeriod("day");
    setTab("outfit");
  });
  useEffect(() => {
    if (hydrated) setAnalyticsEnabled(true);
  }, [hydrated]);
  useEffect(() => {
    setAdPersonalization(hydrated && preferences.personalizedAds);
  }, [hydrated, preferences.personalizedAds]);
  useEffect(() => {
    if (hydrated && !onboarding) trackEvent("screen_view", { screen: tab });
  }, [tab, hydrated, onboarding]);
  useEffect(() => {
    if (tab === "outfit" && forecast) trackEvent("outfit_view", { period });
  }, [tab, period, forecast?.fetchedAt]);
  useEffect(() => {
    if (forecast && !stale) trackEvent("forecast_loaded");
  }, [forecast?.fetchedAt, stale]);
  useEffect(() => {
    if (forecast && hydrated && !onboarding) void syncWidgets(forecast, { ...preferences, comfortOffset: activeComfortOffset(comfort, forecast.current.time.slice(0, 10)) }, stale);
  }, [forecast, hydrated, preferences, stale, comfort, onboarding]);
  useEffect(() => {
    if (!forecast || !hydrated || onboarding) return;
    const { gender, occasion, warmth, fahrenheit, morningAdvice, morningTime } = preferences;
    void scheduleMorningAdvice(forecast, { gender, occasion, warmth, fahrenheit, morningAdvice, morningTime, comfortOffset: activeComfortOffset(comfort, forecast.current.time.slice(0, 10)) });
  }, [forecast, hydrated, onboarding, comfort, preferences.gender, preferences.occasion, preferences.warmth, preferences.fahrenheit, preferences.morningAdvice, preferences.morningTime]);
  const morningOfferVisible = Platform.OS === "android" && hydrated && returning && !onboarding && !preferences.morningAdvice && !morningOfferDismissed && !!forecast && !stale;
  useEffect(() => {
    if (morningOfferVisible) trackEvent("morning_offer_shown");
  }, [morningOfferVisible]);

  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (outfitSetupVisible) { void finishOnboarding(true); return true; }
      if (tab === "weather") return false;
      setTab("weather");
      return true;
    });
    return () => listener.remove();
  }, [tab, outfitSetupVisible, onboardingSaving, preferences]);

  useEffect(() => {
    let alive = true;
    /** @returns {Promise<void>} Проверяет сохранённые настройки перед первым запросом прогноза. */
    async function restore(): Promise<void> {
      const [savedCity, savedPreferences, savedFavorites, setupDone, savedComfort, savedOutfitSetup, offerDismissed] = await Promise.all([
        read<unknown>("atmos-native-city", initialWebCity() ?? CITIES[2]),
        read<Partial<Preferences> | null>("atmos-native-preferences", null),
        read<unknown>("atmos-native-favorites", legacyWebValue<unknown>("atmos-favorites", [])),
        read<boolean>("atmos-native-onboarding-done", false),
        read<ComfortHistory | null>("atmos-native-comfort", null),
        read<boolean>("atmos-native-outfit-setup-done", false),
        read<boolean>("atmos-native-morning-offer-dismissed", false),
      ]);
      if (!alive) return;
      const saved =
        savedPreferences && typeof savedPreferences === "object"
          ? savedPreferences
          : {};
      setPreferences({
        gender: saved.gender === "man" || saved.gender === "woman" ? saved.gender : initial.gender,
        occasion:
          saved.occasion === "office" || saved.occasion === "sport"
            ? saved.occasion
            : "casual",
        warmth:
          saved.warmth === "warmer" || saved.warmth === "lighter"
            ? saved.warmth
            : "balanced",
        fahrenheit: saved.fahrenheit === true,
        diagnostics: saved.diagnostics === true,
        personalizedAds: saved.personalizedAds === true,
        widgetDark: saved.widgetDark !== false,
        widgetAutoTheme: saved.widgetAutoTheme !== false,
        widgetClothes: saved.widgetClothes !== false,
        cityBackground: saved.cityBackground !== false,
        weatherMotion: saved.weatherMotion !== false,
        sceneMode: sceneModes.some(([mode]) => mode === saved.sceneMode) ? saved.sceneMode! : "auto",
        morningAdvice: saved.morningAdvice === true,
        morningTime: isMorningTime(saved.morningTime) ? saved.morningTime : defaultMorningTime,
      });
      setReturning(setupDone || !!savedPreferences);
      setMorningOfferDismissed(offerDismissed);
      setFavorites(
        Array.isArray(savedFavorites)
          ? savedFavorites.filter(isCity).slice(0, 20)
          : [],
      );
      const restoredCity = (Platform.OS === "web" ? initialWebCity(true) : undefined) ?? (isCity(savedCity) ? savedCity : CITIES[2]);
      setCity(restoredCity.id.startsWith("geo:") ? cityNearLocation(restoredCity.latitude, restoredCity.longitude) ?? { ...restoredCity, name: "Моё местоположение" } : restoredCity);
      setOnboarding(!setupDone && !savedPreferences);
      setOutfitSetupDone(savedOutfitSetup || setupDone);
      setComfort(savedComfort && typeof savedComfort.day === "string" && Number.isFinite(savedComfort.offset) ? savedComfort : null);
      setHydrated(true);
    }
    void restore();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (hydrated && !onboarding && tab === "outfit" && !outfitSetupDone) setOutfitSetupVisible(true);
  }, [hydrated, onboarding, tab, outfitSetupDone]);
  useEffect(() => {
    if (hydrated && !onboarding && !outfitSetupVisible) {
      void write("atmos-native-preferences", preferences);
      setDiagnostics(preferences.diagnostics);
      log("preferences changed");
    }
  }, [preferences, hydrated, onboarding, outfitSetupVisible]);
  useEffect(() => {
    if (hydrated && city) void write("atmos-native-city", city);
  }, [city, hydrated]);
  useEffect(() => {
    if (hydrated) void write("atmos-native-favorites", favorites);
  }, [favorites, hydrated]);

  /** @param {City} next - Город пользователя. @param {"location" | "search"} source - Способ выбора города. @returns {void} Закрывает поиск и сбрасывает день прогноза. */
  function chooseCity(next: City, source: "location" | "search" = "search"): void {
    trackEvent("city_selected", { source });
    setCity(next);
    setDayIndex(0);
    setSearchVisible(false);
    setNotice("");
    heroOnScreen.current = true;
    setHeroVisible(true);
  }
  /** @param {Partial<Preferences>} change - Изменение настроек. @returns {void} Применяет и сохраняет выбор. */
  function update(change: Partial<Preferences>): void {
    if (change.warmth && change.warmth !== preferences.warmth) { setComfort(null); void write("atmos-native-comfort", null); }
    setPreferences((value) => ({ ...value, ...change }));
  }
  /** @param {boolean} tracked - Отправить событие отказа. @returns {Promise<void>} Больше не показывает предложение утреннего совета на этом устройстве. */
  async function dismissMorningOffer(tracked = true): Promise<void> {
    setMorningOfferDismissed(true);
    if (tracked) trackEvent("morning_offer_dismissed");
    await write("atmos-native-morning-offer-dismissed", true);
  }
  /** @param {boolean} enabled - Запрошенное состояние. @param {"offer" | "settings"} origin - Где пользователь сделал выбор. @returns {Promise<void>} Включает утренний совет только после системного разрешения Android. */
  async function changeMorningAdvice(enabled: boolean, origin: "offer" | "settings"): Promise<void> {
    if (!enabled) {
      update({ morningAdvice: false });
      void cancelMorningAdvice();
      trackEvent("morning_advice_disabled");
      return;
    }
    if (morningBusy) return;
    setMorningBusy(true);
    try {
      const granted = await requestMorningAdvice();
      if (origin === "offer") void dismissMorningOffer(false);
      if (!granted) {
        trackEvent("morning_advice_denied", { origin });
        Alert.alert("Уведомления выключены", "Чтобы получать утренний совет, разрешите уведомления для приложения в настройках Android.", [
          { text: "Не сейчас", style: "cancel" },
          { text: "Открыть настройки", onPress: () => { void Linking.openSettings().catch(() => undefined); } },
        ]);
        return;
      }
      update({ morningAdvice: true });
      trackEvent("morning_advice_enabled", { origin });
    } finally {
      setMorningBusy(false);
    }
  }
  /** @param {boolean} skipped - Пользователь пропустил краткую настройку. @returns {Promise<void>} Сохраняет завершение настройки и открывает прогноз без повторного приветствия. */
  async function finishOnboarding(skipped: boolean): Promise<void> {
    if (onboardingSaving) return;
    setOnboardingSaving(true);
    try {
      await write("atmos-native-preferences", preferences, true);
      await write("atmos-native-onboarding-done", true, true);
      await write("atmos-native-outfit-setup-done", true, true);
      trackEvent("onboarding_completed", { skipped });
      setOnboarding(false);
      setOutfitSetupDone(true);
      setOutfitSetupVisible(false);
    } catch { setNotice("Не удалось сохранить настройки. Попробуйте ещё раз."); }
    finally { setOnboardingSaving(false); }
  }
  /** @param {ComfortVote} vote - Ощущения после реального выхода. @returns {Promise<void>} Записывает ответ один раз за день города, применяя поправку со следующего дня. */
  async function saveComfort(vote: ComfortVote): Promise<void> {
    if (!forecast) return;
    const next = recordComfort(comfort, forecast.current.time.slice(0, 10), vote);
    await write("atmos-native-comfort", next, true);
    setComfort(next);
    trackEvent("comfort_feedback", { comfort: vote });
    setComfortVisible(false);
  }
  /** @returns {Promise<void>} Запрашивает доступ по нажатию и использует только округлённые координаты. */
  async function locate(): Promise<void> {
    setLocating(true);
    setNotice("");
    log("location requested");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setNotice("Доступ к геолокации выключен. Выберите город через поиск.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const latitude = Math.round(position.coords.latitude * 100) / 100;
      const longitude = Math.round(position.coords.longitude * 100) / 100;
      const localCity = cityNearLocation(latitude, longitude);
      chooseCity(localCity ?? {
        id: `geo:${latitude},${longitude}`,
        name: "Моё местоположение",
        country: "",
        latitude,
        longitude,
      }, "location");
      if (!localCity) setNotice("Город рядом не найден в справочнике. Прогноз показан для вашего местоположения; город можно выбрать через поиск.");
      log("location ready", { cityResolved: !!localCity });
    } catch {
      setNotice(
        "Не удалось определить место. Проверьте GPS или выберите город вручную.",
      );
      log("location unavailable");
    } finally {
      setLocating(false);
    }
  }
  /** @param {City} value - Город в поиске или прогнозе. @returns {void} Меняет избранное по координатам, не переключая выбранный прогноз. */
  function toggleCityFavorite(value: City): void {
    setFavorites((values) => values.some((item) => sameCity(item, value))
      ? values.filter((item) => !sameCity(item, value))
      : [...values, value].slice(-20));
  }
  /** @param {Tab} next - Выбранная вкладка. @returns {void} Повторное нажатие «Погода» возвращает к городу без закреплённой шапки. */
  function selectTab(next: Tab): void {
    if (next === "weather") {
      if (tab === "weather") scroll.current?.scrollTo({ y: 0, animated: false });
      heroOnScreen.current = true;
      setHeroVisible(true);
    }
    setTab(next);
  }
  /** @param {NativeSyntheticEvent<NativeScrollEvent>} event - Прокрутка основного содержимого. @returns {void} Меняет видимость сцены только при пересечении её края, без React-обновления на каждый кадр. */
  function trackSceneVisibility(event: NativeSyntheticEvent<NativeScrollEvent>): void {
    if (tab !== "weather") return;
    const visible = event.nativeEvent.contentOffset.y < heroHeight.current - 72;
    if (visible !== heroOnScreen.current) { heroOnScreen.current = visible; setHeroVisible(visible); }
  }
  /** @param {number} height - Фактическая высота погодной сцены. @returns {void} Сохраняет границу для остановки анимации при прокрутке. */
  function measureHero(height: number): void { heroHeight.current = height; }
  /** @param {string} url - HTTPS-ссылка. @returns {Promise<void>} Открывает внешний ресурс без потери экрана приложения. */
  async function openLink(url: string): Promise<void> {
    try {
      await Linking.openURL(url);
    } catch {
      setNotice("Не удалось открыть ссылку.");
    }
  }
  /** @returns {Promise<void>} Открывает системное меню отправки публичной ссылки на выбранный город. */
  async function share(): Promise<void> {
    if (!city) return;
    const url = `https://v-kozintsev.github.io/atmos-weather/?city=${encodeURIComponent(city.name)}&region=${encodeURIComponent(city.country)}&lat=${city.latitude}&lon=${city.longitude}`;
    try {
      await Share.share({ message: `${city.name} — прогноз погоды\n${url}` });
    } catch {
      setNotice("Не удалось поделиться прогнозом.");
    }
  }

  const selectedDay = forecast?.days[Math.min(dayIndex, forecast.days.length - 1)];
  const selectedHours =
    forecast?.hours
      .filter((hour) => hour.time.startsWith(selectedDay?.date || ""))
      .slice(0, 24) || [];
  const firstHour = forecast?.hours[0];
  const recommendationPreferences = { ...preferences, comfortOffset: activeComfortOffset(comfort, forecast?.current.time.slice(0, 10) || "") };
  const advice =
    forecast && firstHour
      ? period === "day"
        ? outfitForDay(
            forecast.days[0],
            forecast.hours.filter((hour) =>
              hour.time.startsWith(forecast.days[0].date),
            ),
            firstHour,
            recommendationPreferences,
          )
        : outfitForHour(firstHour, recommendationPreferences, forecast.hours[1])
      : undefined;
  const eveningHours = forecast?.hours.filter((hour) => hour.time.startsWith(forecast.days[0].date) && Number(hour.time.slice(11, 13)) >= 18) || [];
  const eveningHour = eveningHours.reduce<(typeof eveningHours)[number] | undefined>((coldest, hour) => !coldest || hour.feels < coldest.feels ? hour : coldest, undefined);
  const eveningOutfit = eveningHour ? outfitForHour(eveningHour, recommendationPreferences) : undefined;
  const eveningHint = !eveningOutfit
    ? "Прогноз на вечер появится после обновления"
    : eveningOutfit.rain
      ? "На вечер — защита от осадков"
      : eveningOutfit.pieces.outer
        ? `На вечер — ${eveningOutfit.pieces.outer.toLocaleLowerCase("ru")}`
        : `На вечер — ${eveningOutfit.pieces.upper.toLocaleLowerCase("ru")}`;
  const immersiveWeather = tab === "weather" && !!forecast && !notice && !error;
  const morningOffer = morningOfferVisible ? <MorningOffer time={preferences.morningTime} busy={morningBusy} onAccept={() => void changeMorningAdvice(true, "offer")} onDismiss={() => void dismissMorningOffer()} /> : null;

  if ((onboarding || outfitSetupVisible) && hydrated) return <TimeThemeContext.Provider value={timeThemes.morning}>
    <FirstRun context={outfitSetupVisible ? "outfit" : "welcome"} city={city} gender={preferences.gender} warmth={preferences.warmth} saving={onboardingSaving} error={notice} onCity={() => setSearchVisible(true)} onGender={(gender) => update({ gender })} onWarmth={(warmth) => update({ warmth })} onDone={(skipped) => void finishOnboarding(skipped)} />
    <CitySearch visible={searchVisible} favorites={favorites} locating={locating} notice={notice} onClose={() => setSearchVisible(false)} onChoose={chooseCity} onFavorite={toggleCityFavorite} onLocate={() => { if (!locating) void locate(); }} />
  </TimeThemeContext.Provider>;
  return (
    <TimeThemeContext.Provider value={theme}><SafeAreaView style={[s.safe, { backgroundColor: theme.page }]} edges={immersiveWeather ? ["left", "right", "bottom"] : ["top", "left", "right", "bottom"]}>
      <StatusBar style={!searchVisible && (theme.dark || immersiveWeather && heroVisible) ? "light" : "dark"} />
      {tab === "weather" && !forecast && <Pressable accessibilityRole="button" accessibilityLabel="Выбрать город" onPress={() => setSearchVisible(true)} style={{ minHeight: 48, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 }}><Ionicons name="location-outline" size={20} color={theme.primary} /><Text style={[s.text, { color: theme.primary }]}>{city?.name || "Выбрать город"}</Text><Ionicons name="chevron-down" size={16} color={theme.primary} /></Pressable>}
      <UpdateCard state={updates.state} onUpdate={() => void updates.update()} onCheck={() => updates.check(true, true)} onDismiss={() => void updates.dismiss()} onStore={() => void openLink(reviewUrl)} suspended={searchVisible} />
      <ScrollView
        ref={scroll}
        key={`${tab}:${city?.id}`}
        style={s.flex}
        contentContainerStyle={[s.body, tab === "weather" && s.weatherBody, tab === "weather" && wide && s.bodyWide, tab !== "weather" && s.outfitBody, tab === "outfit" && s.outfitEditorialBody]}
        keyboardShouldPersistTaps="handled"
        onScroll={trackSceneVisibility}
        scrollEventThrottle={80}
        refreshControl={
          <RefreshControl
            refreshing={loading && !!forecast}
            onRefresh={refresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {notice ? (
          <View style={s.notice}>
            <Text accessibilityRole="alert" style={s.text}>
              {notice}
            </Text>
          </View>
        ) : null}
        {error ? (
          <View style={s.notice}>
            <Text accessibilityRole="alert" style={s.text}>
              {error}
            </Text>
            <Chip label="Повторить" onPress={refresh} />
          </View>
        ) : null}
        {tab !== "settings" && !forecast && <ForecastLoading pending={loading || !hydrated} />}
        {tab === "weather" && forecast && <WeatherHome forecast={forecast} advice={advice} gender={preferences.gender} occasion={preferences.occasion} period={period} eveningHour={eveningHour} eveningHint={eveningHint} fahrenheit={preferences.fahrenheit} background={preferences.cityBackground} sceneMode={preferences.sceneMode} photo={cityPhoto} stale={stale} dayIndex={dayIndex} hours={selectedHours} wide={wide} sceneVisible={heroVisible && !searchVisible && !comfortVisible && !reviews.visible && !updates.state.visible} motionEnabled={preferences.weatherMotion} topInset={immersiveWeather ? insets.top : 0} onHeroHeight={measureHero} onCity={() => setSearchVisible(true)} comfortAnswered={comfort?.day === forecast.current.time.slice(0, 10)} onComfort={() => { trackEvent("comfort_prompt_opened"); setComfortVisible(true); }} onOutfit={() => setTab("outfit")} onDay={setDayIndex} onShare={() => void share()} onSource={(url) => void openLink(url)} offer={morningOffer} ad={hydrated ? <WeatherAd personalizedAds={preferences.personalizedAds} /> : null} />}
        {tab === "outfit" && advice && forecast && (
          <OutfitScreen forecast={forecast} advice={advice} period={period} gender={preferences.gender} occasion={preferences.occasion} fahrenheit={preferences.fahrenheit} eveningHour={eveningHour} eveningHint={eveningHint} onPeriodChange={setPeriod} onGenderChange={(gender) => update({ gender })}>
            <OutfitCustomization advice={advice} gender={preferences.gender} occasion={preferences.occasion} warmth={preferences.warmth} onOccasionChange={(occasion) => update({ occasion })} onWarmthChange={(warmth) => update({ warmth })} onOpen={openLink} />
          </OutfitScreen>
        )}
        {tab === "settings" && <SettingsScreen
          preferences={preferences} onChange={update} version={appVersion}
          checking={updates.busy} onCheck={() => void updates.check(true)}
          city={city} forecast={forecast} favorites={favorites} locating={locating}
          onCity={() => setSearchVisible(true)} onLocate={() => { if (!locating) void locate(); }}
          onFavorite={(value) => { chooseCity(value); setTab("weather"); }}
          onWidget={pinWidget}
          onFeedback={() => void openLink("mailto:aurelio3@mail.ru?subject=" + encodeURIComponent("Погода и что надеть — обратная связь"))}
          onRate={() => void reviews.rate().catch(() => setNotice(`Не удалось открыть ${storeName}. Попробуйте позже.`))}
          reviewsEnabled={!reviews.disabled} onReviewsChange={(enabled) => void reviews.dismiss(!enabled)}
          morningBusy={morningBusy} onMorningAdvice={(enabled) => void changeMorningAdvice(enabled, "settings")}
        >
              {cityPhoto && <View><Text style={s.caption}>{cityPhoto.author} · {cityPhoto.title}. В оформлении применены кадрирование и затемнение.</Text><View style={s.wrap}><Chip label="Источник фото ↗" onPress={() => void openLink(cityPhoto.source)} /><Chip label={cityPhoto.license} onPress={() => void openLink(cityPhoto.licenseUrl)} /></View></View>}
              {cityPhotoCredits.map((photo) => (
                <View key={photo.city}>
                  <Text style={s.caption}>Фото: {photo.city} · {photo.author}. В оформлении применены кадрирование и цветное затемнение.</Text>
                  <View style={s.wrap}>
                    <Chip label="Источник фото ↗" onPress={() => void openLink(photo.source)} />
                    <Chip label={photo.license} onPress={() => void openLink(photo.licenseUrl)} />
                  </View>
                </View>
              ))}
              <Text style={s.text}>Погода и одежда для ваших планов.</Text>
              <Chip
                label="Источник погоды · MET Norway"
                onPress={() => void openLink("https://api.met.no/")}
              />
              <Text style={s.caption}>
                Данные MET Norway · адаптированы · CC BY 4.0. Города GeoNames ·
                CC BY. Прогноз может отличаться от фактической погоды.
              </Text>
              <Chip
                label="Конфиденциальность"
                onPress={() =>
                  void openLink(
                    "https://v-kozintsev.github.io/atmos-weather/privacy.html",
                  )
                }
              />
              <Chip
                label="Разработчик · PuskWeb"
                onPress={() => void openLink("https://puskweb.ru/")}
              />
        </SettingsScreen>}
        {forecast && tab === "outfit" && (
          <Text style={[s.caption, { color: theme.muted }]}>
            {stale ? "Сохранено" : "Обновлено"}{" "}
            {new Date(forecast.fetchedAt).toLocaleTimeString("ru-RU", {
              timeZone: forecast.timezone,
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            {Platform.OS !== "web" ? "· Потяните вниз для обновления" : ""}
          </Text>
        )}
        {forecast && tab === "outfit" && Platform.OS === "web" && <Chip label={loading ? "Обновляем…" : "Обновить прогноз"} onPress={refresh} />}
        {tab === "weather" && forecast && Platform.OS === "web" && <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}><Chip label={loading ? "Обновляем…" : "Обновить прогноз"} onPress={refresh} /></View>}
      </ScrollView>
      {immersiveWeather && !heroVisible && <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, backgroundColor: theme.page, zIndex: 10 }} />}
      <View style={[s.nav, compactWeather && s.navCompact, { backgroundColor: theme.page, borderTopColor: theme.divider }]}>
        {tabs.map(([value, label, glyph]) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === value }}
            accessibilityLabel={label}
            style={[s.navItem, compactWeather && s.navItemCompact]}
            onPress={() => selectTab(value)}
          >
            <View style={[s.navSelection, tab === value && { backgroundColor: theme.dark ? "#354d49" : theme.divider }]}>
              <View style={[s.navIndicator, tab === value && { backgroundColor: theme.accent }]} />
              <View style={s.navIcon}>
                <Ionicons
                  name={glyph}
                  size={25}
                  color={tab === value ? theme.accent : theme.muted}
                />
              </View>
              <Text style={[s.navLabel, tab === value && s.navLabelSelected, { color: tab === value ? theme.accent : theme.muted }]}>{label}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <ReviewSheet visible={reviews.visible} storeOpened={reviews.storeOpened} confirmation={reviews.confirmation} onShown={reviews.markShown} onLater={() => reviews.dismiss()} onRated={() => reviews.dismiss(true)} onRate={reviews.rate} />
      <ComfortSheet visible={comfortVisible && !updates.state.visible} gender={preferences.gender} onClose={() => setComfortVisible(false)} onSave={saveComfort} />
      <CitySearch visible={searchVisible} favorites={favorites} locating={locating} notice={notice} onClose={() => setSearchVisible(false)} onChoose={chooseCity} onFavorite={toggleCityFavorite} onLocate={() => { if (!locating) void locate(); }} />
    </SafeAreaView></TimeThemeContext.Provider>
  );
}

/** @returns {React.JSX.Element} Корень приложения с учётом вырезов экрана и системной навигации. */
export default function App(): React.JSX.Element {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: "#eef1eb", alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#21483e" /></View>;
  return (
    <SafeAreaProvider>
      <Atmos />
    </SafeAreaProvider>
  );
}
