import { useEffect, useState } from "react";
import { useFonts } from "expo-font";
import { fontAssets } from "./src/typography";
import { ActivityIndicator, BackHandler, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, Share, TextInput, View, useWindowDimensions } from "react-native";
import { Text } from "./src/typography";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
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
import { searchCities, setDiagnostics, log } from "./src/weather";
import { Chip, s } from "./src/ui";
import { WeatherHome } from "./src/WeatherHome";
import { OutfitScreen } from "./src/OutfitScreen";
import { SettingsScreen } from "./src/SettingsScreen";
import { OutfitCustomization } from "./src/OutfitCustomization";
import { pinWidget, syncWidgets } from "./src/widget";
import { useReviews, reviewUrl } from "./src/reviews";
import { useAppUpdates } from "./src/useAppUpdates";
import { appName, appVersion } from "../src/lib/appInfo";
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
  widgetDark: boolean;
  widgetAutoTheme: boolean;
  widgetClothes: boolean;
  cityBackground: boolean;
  sceneMode: SceneMode;
}
const initial: Preferences = {
  ...defaultOutfitPreferences,
  gender: "woman",
  fahrenheit: false,
  diagnostics: false,
  widgetDark: true,
  widgetAutoTheme: true,
  widgetClothes: true,
  cityBackground: true,
  sceneMode: "auto",
};
const images = {
  woman: {
    warm: require("./assets/woman-warm-v2.png"),
    mild: require("./assets/woman-mild-v2.png"),
    cool: require("./assets/woman-cool-v2.png"),
    cold: require("./assets/woman-cold-v2.png"),
    rain: require("./assets/woman-rain-v2.png"),
  },
  man: {
    warm: require("../public/outfits/man-warm.webp"),
    mild: require("../public/outfits/man-mild.webp"),
    cool: require("../public/outfits/man-cool.webp"),
    cold: require("../public/outfits/man-cold.webp"),
    rain: require("../public/outfits/man-rain.webp"),
  },
};
const womanSportImage = require("./assets/woman-sport-v2.png");
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
  const [tab, setTab] = useState<Tab>("weather");
  const viewport = useWindowDimensions();
  const wide = viewport.width >= 1000 || (viewport.width >= 600 && viewport.width > viewport.height);
  const compactWeather = tab === "weather" && viewport.width < 600 && viewport.height < 1000 && viewport.fontScale <= 1.15;
  const [period, setPeriod] = useState<"hour" | "day">("hour");
  const [dayIndex, setDayIndex] = useState(0);
  const [searchVisible, setSearchVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState("");
  const { forecast, loading, stale, error, refresh } = useForecast(city);
  const cityPhoto = useCityPhoto(city, preferences.cityBackground && !!city && !cityPhotoKey(city));
  const updates = useAppUpdates(hydrated);
  const reviews = useReviews(!!forecast && !stale && !loading);
  useEffect(() => {
    if (forecast && hydrated) void syncWidgets(forecast, preferences, stale);
  }, [forecast, hydrated, preferences, stale]);

  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (tab === "weather") return false;
      setTab("weather");
      return true;
    });
    return () => listener.remove();
  }, [tab]);

  useEffect(() => {
    let alive = true;
    /** @returns {Promise<void>} Проверяет сохранённые настройки перед первым запросом прогноза. */
    async function restore(): Promise<void> {
      const [savedCity, savedPreferences, savedFavorites] = await Promise.all([
        read<unknown>("atmos-native-city", initialWebCity() ?? CITIES[2]),
        read<Partial<Preferences> | null>("atmos-native-preferences", initial),
        read<unknown>("atmos-native-favorites", legacyWebValue<unknown>("atmos-favorites", [])),
      ]);
      if (!alive) return;
      const saved =
        savedPreferences && typeof savedPreferences === "object"
          ? savedPreferences
          : {};
      setPreferences({
        gender: saved.gender === "man" ? "man" : "woman",
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
        widgetDark: saved.widgetDark !== false,
        widgetAutoTheme: saved.widgetAutoTheme !== false,
        widgetClothes: saved.widgetClothes !== false,
        cityBackground: saved.cityBackground !== false,
        sceneMode: sceneModes.some(([mode]) => mode === saved.sceneMode) ? saved.sceneMode! : "auto",
      });
      setFavorites(
        Array.isArray(savedFavorites)
          ? savedFavorites.filter(isCity).slice(0, 20)
          : [],
      );
      setCity((Platform.OS === "web" ? initialWebCity(true) : undefined) ?? (isCity(savedCity) ? savedCity : CITIES[2]));
      setHydrated(true);
    }
    void restore();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (hydrated) {
      void write("atmos-native-preferences", preferences);
      setDiagnostics(preferences.diagnostics);
      log("preferences changed");
    }
  }, [preferences, hydrated]);
  useEffect(() => {
    if (hydrated && city) void write("atmos-native-city", city);
  }, [city, hydrated]);
  useEffect(() => {
    if (hydrated) void write("atmos-native-favorites", favorites);
  }, [favorites, hydrated]);

  /** @param {City} next - Город пользователя. @returns {void} Закрывает поиск и сбрасывает день прогноза. */
  function chooseCity(next: City): void {
    setCity(next);
    setDayIndex(0);
    setSearchVisible(false);
    setQuery("");
    setNotice("");
  }
  /** @param {Partial<Preferences>} change - Изменение настроек. @returns {void} Применяет и сохраняет выбор. */
  function update(change: Partial<Preferences>): void {
    setPreferences((value) => ({ ...value, ...change }));
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
      chooseCity({
        id: `geo:${latitude},${longitude}`,
        name: "Рядом с вами",
        country: "",
        latitude,
        longitude,
      });
      log("location ready");
    } catch {
      setNotice(
        "Не удалось определить место. Проверьте GPS или выберите город вручную.",
      );
      log("location unavailable");
    } finally {
      setLocating(false);
    }
  }
  /** @returns {void} Добавляет или удаляет выбранный город из избранного. */
  function toggleFavorite(): void {
    if (!city) return;
    setFavorites((values) =>
      values.some(
        (value) =>
          value.latitude === city.latitude &&
          value.longitude === city.longitude,
      )
        ? values.filter(
            (value) =>
              value.latitude !== city.latitude ||
              value.longitude !== city.longitude,
          )
        : [...values, city].slice(-20),
    );
  }
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
  const advice =
    forecast && firstHour
      ? period === "day"
        ? outfitForDay(
            forecast.days[0],
            forecast.hours.filter((hour) =>
              hour.time.startsWith(forecast.days[0].date),
            ),
            firstHour,
            preferences,
          )
        : outfitForHour(firstHour, preferences)
      : undefined;
  const photoStyle = advice
    ? advice.rain && ["mild", "cool"].includes(advice.style)
      ? "rain"
      : ["heat", "warm"].includes(advice.style)
        ? "warm"
        : advice.style === "mild"
          ? "mild"
          : advice.style === "cool"
            ? "cool"
            : "cold"
    : "mild";
  const outfitImage = preferences.gender === "woman" && preferences.occasion === "sport"
    && advice && ["heat", "warm"].includes(advice.style) && !advice.rain
    ? womanSportImage
    : images[preferences.gender][photoStyle];
  const eveningHours = forecast?.hours.filter((hour) => hour.time.startsWith(forecast.days[0].date) && Number(hour.time.slice(11, 13)) >= 18) || [];
  const eveningHour = eveningHours.reduce<(typeof eveningHours)[number] | undefined>((coldest, hour) => !coldest || hour.feels < coldest.feels ? hour : coldest, undefined);
  const eveningOutfit = eveningHour ? outfitForHour(eveningHour, preferences) : undefined;
  const eveningHint = !eveningOutfit
    ? "Прогноз на вечер появится после обновления"
    : eveningOutfit.rain
      ? "На вечер — защита от осадков"
      : eveningOutfit.pieces.outer
        ? `На вечер — ${eveningOutfit.pieces.outer.toLocaleLowerCase("ru")}`
        : `На вечер — ${eveningOutfit.pieces.upper.toLocaleLowerCase("ru")}`;
  const favorite = favorites.some(
    (value) =>
      value.latitude === city?.latitude && value.longitude === city?.longitude,
  );
  const matches =
    query.trim().length >= 2
      ? searchCities(query)
      : [
          ...favorites,
          ...CITIES.filter(
            (value) => !favorites.some((f) => f.id === value.id),
          ),
        ];

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />
      <View style={[s.header, wide && s.bodyWide, tab === "weather" && s.headerWeather]}>
        <View style={{ flexShrink: 1 }}>
          <Text style={tab === "outfit" ? s.outfitPageTitle : tab === "weather" ? s.weatherBrand : s.brand}>{tab === "outfit" ? "Что надеть" : appName}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Выбрать город"
          style={[s.row, { minHeight: 44, maxWidth: "43%", gap: 6 }]}
          onPress={() => setSearchVisible(true)}
        >
          <Ionicons name="location-outline" size={20} color="#21483e" />
          <Text style={[s.text, { flexShrink: 1 }, tab === "weather" && s.weatherLocation]}>
            {city?.name || "Загрузка"}
          </Text>
        </Pressable>
      </View>
      <UpdateCard state={updates.state} onUpdate={() => void updates.update()} onDismiss={() => void updates.dismiss()} onStore={() => void openLink(reviewUrl)} suspended={searchVisible} />
      <ScrollView
        key={`${tab}:${city?.id}`}
        style={s.flex}
        contentContainerStyle={[s.body, tab === "weather" && s.weatherBody, tab === "weather" && wide && s.bodyWide, tab !== "weather" && s.outfitBody]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={loading && !!forecast}
            onRefresh={refresh}
            tintColor="#21483e"
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
        {tab !== "settings" && !forecast && (
          <View style={s.card}>
            {loading || !hydrated ? (
              <ActivityIndicator color="#21483e" size="large" />
            ) : null}
            <Text style={s.text}>
              {loading || !hydrated
                ? "Собираем свежий прогноз…"
                : "Выберите город или повторите загрузку."}
            </Text>
          </View>
        )}
        {tab === "weather" && forecast && <WeatherHome forecast={forecast} advice={advice} gender={preferences.gender} occasion={preferences.occasion} period={period} eveningHour={eveningHour} eveningHint={eveningHint} fahrenheit={preferences.fahrenheit} background={preferences.cityBackground} sceneMode={preferences.sceneMode} photo={cityPhoto} stale={stale} favorite={favorite} dayIndex={dayIndex} hours={selectedHours} wide={wide} onFavorite={toggleFavorite} onOutfit={() => setTab("outfit")} onDay={setDayIndex} onShare={() => void share()} onRefresh={refresh} refreshing={loading} onSource={(url) => void openLink(url)} />}
        {tab === "outfit" && advice && forecast && (
          <OutfitScreen forecast={forecast} advice={advice} source={outfitImage} period={period} gender={preferences.gender} occasion={preferences.occasion} fahrenheit={preferences.fahrenheit} eveningHour={eveningHour} eveningHint={eveningHint} onPeriodChange={setPeriod} onGenderChange={(gender) => update({ gender })}>
            <OutfitCustomization advice={advice} gender={preferences.gender} occasion={preferences.occasion} warmth={preferences.warmth} onOccasionChange={(occasion) => update({ occasion })} onWarmthChange={(warmth) => update({ warmth })} onOpen={openLink} />
          </OutfitScreen>
        )}
        {tab === "settings" && <SettingsScreen
          preferences={preferences} onChange={update} version={appVersion}
          checking={updates.busy} onCheck={() => void updates.check(true)}
          city={city} favorites={favorites} locating={locating}
          onCity={() => setSearchVisible(true)} onLocate={() => { if (!locating) void locate(); }}
          onFavorite={(value) => { chooseCity(value); setTab("weather"); }}
          onWidget={() => void pinWidget().then((requested) => setNotice(requested
            ? "Подтвердите добавление. Если телефон пишет «Нет места», добавьте виджет вручную на другой рабочий экран через меню «Виджеты»."
            : "Зажмите пустое место на рабочем экране → Виджеты → Погода и что надеть. Перетащите виджет на свободный участок примерно 3 × 2 клетки."))}
          onRate={() => void reviews.rate().catch(() => setNotice("Не удалось открыть RuStore. Попробуйте позже."))}
          reviewsEnabled={!reviews.disabled} onReviewsChange={(enabled) => void reviews.dismiss(!enabled)}
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
          <Text style={s.caption}>
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
        {tab === "weather" && reviews.visible && (
          <View style={s.card}>
            <Text style={s.subtitle}>Как вам приложение?</Text>
            <Text style={s.text}>
              Ваша оценка и отзыв помогут улучшать приложение.
            </Text>
            <Chip
              label="Открыть RuStore"
              onPress={() => {
                void reviews
                  .rate()
                  .catch(() => setNotice("Не удалось открыть RuStore."));
              }}
            />
            <View style={s.wrap}>
              <Chip
                label="Позже"
                onPress={() => {
                  void reviews.dismiss();
                }}
              />
              <Chip
                label="Не напоминать"
                onPress={() => {
                  void reviews.dismiss(true);
                }}
              />
            </View>
          </View>
        )}
      </ScrollView>
      <View style={[s.nav, compactWeather && s.navCompact]}>
        {tabs.map(([value, label, glyph]) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === value }}
            accessibilityLabel={label}
            style={[s.navItem, compactWeather && s.navItemCompact]}
            onPress={() => setTab(value)}
          >
            <View style={s.navIcon}>
              <Ionicons
                name={glyph}
                size={25}
                color={tab === value ? "#21483e" : "#88938a"}
              />
            </View>
            <Text style={[s.navLabel, tab === value && s.navLabelSelected]}>{label}</Text>
            <View style={[s.navIndicator, tab === value && s.navIndicatorSelected]} />
          </Pressable>
        ))}
      </View>
      <Modal
        visible={searchVisible}
        animationType="slide"
        onRequestClose={() => setSearchVisible(false)}
      >
        <SafeAreaView style={s.safe}>
          <View style={[s.header, wide && s.bodyWide]}>
            <Text style={s.title}>Выбрать город</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Закрыть поиск"
              style={s.iconButton}
              onPress={() => setSearchVisible(false)}
            >
              <Ionicons name="close" size={28} color="#21483e" />
            </Pressable>
          </View>
          <TextInput
            autoFocus
            placeholder="Название города"
            accessibilityLabel="Название города"
            value={query}
            onChangeText={setQuery}
            style={s.input}
            autoCorrect={false}
          />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[s.body, tab === "weather" && wide && s.bodyWide]}
          >
            {matches.map((value) => (
              <Pressable
                key={value.id}
                accessibilityRole="button"
                onPress={() => chooseCity(value)}
                style={s.card}
              >
                <Text style={s.subtitle}>{value.name}</Text>
                <Text style={s.caption}>{value.country}</Text>
              </Pressable>
            ))}
            {query.length >= 2 && !matches.length && (
              <Text style={s.text}>
                Не нашли город. Попробуйте другое написание.
              </Text>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

/** @returns {React.JSX.Element} Корень приложения с учётом вырезов экрана и системной навигации. */
export default function App(): React.JSX.Element {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: "#f7f8f2", alignItems: "center", justifyContent: "center" }}><ActivityIndicator color="#21483e" /></View>;
  return (
    <SafeAreaProvider>
      <Atmos />
    </SafeAreaProvider>
  );
}
