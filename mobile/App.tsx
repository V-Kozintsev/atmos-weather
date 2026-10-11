import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";
import {
  CITIES,
  bestHour,
  clock,
  condition,
  isCity,
  temperature,
  weekday,
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
import { WeatherIcon } from "./src/WeatherIcon";
import { OutfitCard } from "./src/OutfitCard";
import { OutfitPhoto } from "./src/OutfitPhoto";
import { OutfitDetails } from "./src/OutfitDetails";
import { pinWidget, syncWidgets } from "./src/widget";
import { useReviews } from "./src/reviews";
import { CityBackdrop, sceneModes, cityPhotoCredits, type SceneMode } from "./src/CityBackdrop";
import { useCityPhoto } from "./src/cityPhotos";
import { cityPhotoKey } from "./src/CityBackdrop";

type Tab = "weather" | "outfit" | "settings";
interface Preferences extends OutfitPreferences {
  gender: "woman" | "man";
  fahrenheit: boolean;
  diagnostics: boolean;
  widgetDark: boolean;
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
  const [period, setPeriod] = useState<"hour" | "day">("hour");
  const [dayIndex, setDayIndex] = useState(0);
  const [searchVisible, setSearchVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState("");
  const { forecast, loading, stale, error, refresh } = useForecast(city);
  const cityPhoto = useCityPhoto(city, preferences.cityBackground && !!city && !cityPhotoKey(city));
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
        read<unknown>("atmos-native-city", CITIES[2]),
        read<Partial<Preferences> | null>("atmos-native-preferences", initial),
        read<unknown>("atmos-native-favorites", []),
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
        widgetClothes: saved.widgetClothes !== false,
        cityBackground: saved.cityBackground !== false,
        sceneMode: sceneModes.some(([mode]) => mode === saved.sceneMode) ? saved.sceneMode! : "auto",
      });
      setFavorites(
        Array.isArray(savedFavorites)
          ? savedFavorites.filter(isCity).slice(0, 20)
          : [],
      );
      setCity(isCity(savedCity) ? savedCity : CITIES[2]);
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
      await Share.share({ message: `${city.name} — погода в Atmos\n${url}` });
    } catch {
      setNotice("Не удалось поделиться прогнозом.");
    }
  }
  /** @param {number} value - Температура в Цельсиях. @returns {string} Температура в выбранных единицах. */
  function degrees(value: number): string {
    return `${temperature(value, preferences.fahrenheit)}°`;
  }

  const selectedDay = forecast?.days[Math.min(dayIndex, 6)];
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
  const walk = bestHour(forecast?.hours.slice(0, 24) || [], "walk");

  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <View style={{ flexShrink: 1 }}>
          <Text style={s.brand}>atmos.</Text>
          <Text style={s.caption}>Погода для ваших планов</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Выбрать город"
          style={[s.row, { minHeight: 48, maxWidth: "50%" }]}
          onPress={() => setSearchVisible(true)}
        >
          <Ionicons name="location-outline" size={20} color="#21483e" />
          <Text numberOfLines={1} style={[s.text, { flexShrink: 1 }]}>
            {city?.name || "Загрузка"}
          </Text>
        </Pressable>
      </View>
      <ScrollView
        key={`${tab}:${city?.id}`}
        style={s.flex}
        contentContainerStyle={s.body}
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
        {tab === "weather" && forecast && (
          <>
            <View style={s.hero}>
              {preferences.cityBackground && <CityBackdrop forecast={forecast} mode={preferences.sceneMode} photo={cityPhoto} />}
              <View style={s.row}>
                <Text style={[s.heroLabel, s.flex]}>
                  {stale ? "СОХРАНЁННЫЙ ПРОГНОЗ" : "СЕЙЧАС В ГОРОДЕ"}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    favorite ? "Убрать из избранного" : "Добавить в избранное"
                  }
                  onPress={toggleFavorite}
                  style={s.iconButton}
                >
                  <Ionicons
                    name={favorite ? "star" : "star-outline"}
                    size={24}
                    color="#f1ddad"
                  />
                </Pressable>
              </View>
              <View style={s.row}>
                <View style={s.flex}>
                  <Text style={s.degrees}>
                    {degrees(forecast.current.temperature)}
                  </Text>
                  <Text style={s.heroTitle}>
                    {condition(forecast.current.code)}
                  </Text>
                </View>
                <WeatherIcon
                  code={forecast.current.code}
                  size={92}
                  night={!forecast.current.day}
                />
              </View>
              <Text style={s.heroText}>
                Ощущается как {degrees(forecast.current.feels)} ·{" "}
                {degrees(forecast.days[0].min)} /{" "}
                {degrees(forecast.days[0].max)}
              </Text>
              <Text style={s.heroText}>
                Ветер {Math.round(forecast.current.wind)} км/ч · Влажность{" "}
                {forecast.current.humidity}%
              </Text>
            </View>
            {cityPhoto && preferences.cityBackground && <Text accessibilityRole="link" style={s.caption} onPress={() => void openLink(cityPhoto.source)}>Фото города · автор и источник ↗</Text>}
            {advice && (
              <OutfitCard advice={advice} gender={preferences.gender} occasion={preferences.occasion} period={period} evening={eveningHint} onPress={() => setTab("outfit")} />
            )}
            <Text style={s.title}>Ближайшие часы</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.horizontal}
            >
              {selectedHours.map((hour) => (
                <View key={hour.time} style={s.hour}>
                  <Text style={s.hourCaption}>{clock(hour.time)}</Text>
                  <WeatherIcon
                    code={hour.code}
                    size={38}
                    night={!hour.day}
                  />
                  <Text style={s.hourDegrees}>{degrees(hour.temperature)}</Text>
                </View>
              ))}
            </ScrollView>
            <Text style={s.title}>На неделю</Text>
            <View style={s.card}>
              {forecast.days.map((day, index) => (
                <Pressable
                  key={day.date}
                  accessibilityRole="button"
                  accessibilityState={{ selected: dayIndex === index }}
                  onPress={() => setDayIndex(index)}
                  style={[s.day, dayIndex === index && s.navSelected]}
                >
                  <Text style={s.dayName}>
                    {index === 0 ? "Сегодня" : weekday(day.date)}
                  </Text>
                  <View style={s.weatherIconWell}><WeatherIcon code={day.code} size={36} /></View>
                  <Text style={s.text}>
                    {degrees(day.min)} / {degrees(day.max)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.caption}>
              Выберите день — почасовой прогноз выше изменится.
            </Text>
            <View style={s.card}>
              <Text style={s.title}>Время для прогулки</Text>
              <Text style={s.subtitle}>
                {walk
                  ? `${walk.time.slice(0, 10) === forecast.days[0].date ? "Сегодня" : "Завтра"}, ${clock(walk.time)} — хороший момент`
                  : "Погода требует осторожности"}
              </Text>
              <Text style={s.text}>
                {walk
                  ? `${degrees(walk.feels)} по ощущениям, ветер ${Math.round(walk.wind)} км/ч. Выбран дневной час без сильного ветра и существенных осадков.`
                  : "В ближайшие часы нет комфортного дневного периода по нашим правилам."}
              </Text>
            </View>
            <View style={s.card}>
              <Text style={s.eyebrow}>РИТМ ДНЯ</Text>
              <Text style={s.text}>
                Восход {clock(forecast.days[0].sunrise) || "—"} · Закат{" "}
                {clock(forecast.days[0].sunset) || "—"}
              </Text>
              <Text style={s.caption}>Время города · {forecast.timezone}</Text>
            </View>
            <Chip label="Поделиться прогнозом" onPress={() => void share()} />
          </>
        )}
        {tab === "outfit" && advice && (
          <>
            <View style={s.outfitHeading}>
              <Text style={s.title}>Ваш образ по погоде</Text>
              <Text style={s.caption}>На ближайший час или весь день.</Text>
            </View>
            <View style={s.outfitControls}>
            <View style={s.wrap}>
              <Chip
                label="Ближайший час"
                active={period === "hour"}
                onPress={() => setPeriod("hour")}
              />
              <Chip
                label="На весь день"
                active={period === "day"}
                onPress={() => setPeriod("day")}
              />
            </View>
            <View style={s.wrap}>
              <Chip
                label="Женский"
                active={preferences.gender === "woman"}
                onPress={() => update({ gender: "woman" })}
              />
              <Chip
                label="Мужской"
                active={preferences.gender === "man"}
                onPress={() => update({ gender: "man" })}
              />
            </View>
            </View>
            <OutfitPhoto source={outfitImage} />
            <OutfitDetails advice={advice} />
            <Text style={s.title}>Подстроить под себя</Text>
            <View style={s.wrap}>
              {(
                [
                  ["casual", "На каждый день"],
                  ["office", "Офис"],
                  ["sport", "Активный"],
                ] as const
              ).map(([occasion, label]) => (
                <Chip
                  key={occasion}
                  label={label}
                  active={preferences.occasion === occasion}
                  onPress={() => update({ occasion })}
                />
              ))}
            </View>
            <View style={s.wrap}>
              {(
                [
                  ["balanced", "Обычно"],
                  ["warmer", "Я мёрзну"],
                  ["lighter", "Мне жарко"],
                ] as const
              ).map(([warmth, label]) => (
                <Chip
                  key={warmth}
                  label={label}
                  active={preferences.warmth === warmth}
                  onPress={() => update({ warmth })}
                />
              ))}
            </View>
            <View style={s.card}>
              <Text style={s.subtitle}>Найти похожие вещи</Text>
              <Text style={s.caption}>
                Обычный поиск в магазине, без партнёрских начислений.
              </Text>
              {advice.items.slice(0, 4).map((item) => (
                <View key={item}>
                  <Text style={s.text}>{item}</Text>
                  <View style={s.wrap}>
                    <Chip
                      label="Ozon ↗"
                      onPress={() =>
                        void openLink(
                          `https://www.ozon.ru/search/?text=${encodeURIComponent(`${preferences.gender === "woman" ? "женская" : "мужская"} ${item}`)}`,
                        )
                      }
                    />
                    <Chip
                      label="WB ↗"
                      onPress={() =>
                        void openLink(
                          `https://www.wildberries.ru/catalog/0/search.aspx?search=${encodeURIComponent(`${preferences.gender === "woman" ? "женская" : "мужская"} ${item}`)}`,
                        )
                      }
                    />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
        {tab === "settings" && (
          <>
            <Text style={s.title}>Всё под вас</Text>
            <View style={s.card}>
              <View style={s.row}>
                <Text style={[s.subtitle, s.flex]}>Атмосферный фон</Text>
                <Switch accessibilityLabel="Атмосферный фон" value={preferences.cityBackground} onValueChange={(cityBackground) => update({ cityBackground })} />
              </View>
              <Text style={s.caption}>Авто — по местному времени города. Можно выбрать настроение вручную: это меняет оформление, а не прогноз.</Text>
              <View style={s.wrap}>
                {sceneModes.map(([sceneMode, label]) => <Chip key={sceneMode} label={label} active={preferences.sceneMode === sceneMode} onPress={() => update({ sceneMode })} />)}
              </View>
              <Text style={s.caption}>Подбираем свободные фото рядом с центром выбранного города через Wikimedia Commons. Если снимка нет или нет сети — атмосферное небо. GPS-позицию для поиска фото не передаём.</Text>
            </View>
            <View style={s.card}>
              <Text style={s.subtitle}>Погода на главном экране</Text>
              <Text style={s.caption}>
                Виджет показывает выбранный город и обновляется примерно раз в
                30 минут. Android может откладывать обновление для экономии
                заряда.
              </Text>
              {Platform.OS === "android" ? (
                <Chip
                  label="Добавить виджет"
                  onPress={() => {
                    void pinWidget().then((requested) => {
                      if (!requested)
                        setNotice(
                          "Зажмите пустое место на главном экране → Виджеты → Atmos.",
                        );
                    });
                  }}
                />
              ) : (
                <Text style={s.caption}>
                  Виджет доступен в Android-приложении.
                </Text>
              )}
              <View style={s.row}>
                <Text style={[s.text, s.flex]}>Тёмный виджет</Text>
                <Switch
                  accessibilityLabel="Тёмный виджет"
                  value={preferences.widgetDark}
                  onValueChange={(widgetDark) => update({ widgetDark })}
                />
              </View>
              <View style={s.row}>
                <Text style={[s.text, s.flex]}>Одежда в виджете</Text>
                <Switch
                  accessibilityLabel="Показывать одежду в виджете"
                  value={preferences.widgetClothes}
                  onValueChange={(widgetClothes) => update({ widgetClothes })}
                />
              </View>
            </View>
            <View style={s.card}>
              <Text style={s.subtitle}>Помочь Atmos стать лучше</Text>
              <Chip
                label="Оценить в RuStore ↗"
                onPress={() => {
                  void reviews
                    .rate()
                    .catch(() =>
                      setNotice(
                        "Не удалось открыть RuStore. Попробуйте позже.",
                      ),
                    );
                }}
              />
              <View style={s.row}>
                <Text style={[s.text, s.flex]}>Напоминать об оценке</Text>
                <Switch
                  accessibilityLabel="Напоминать об оценке"
                  value={!reviews.disabled}
                  onValueChange={(enabled) => {
                    void reviews.dismiss(!enabled);
                  }}
                />
              </View>
              <Text style={s.caption}>
                Без уведомлений и обязательных оценок. Напоминание можно
                отключить.
              </Text>
            </View>
            <View style={s.card}>
              <Text style={s.subtitle}>Город</Text>
              <Text style={s.text}>{city?.name}</Text>
              <Chip
                label="Выбрать город"
                onPress={() => setSearchVisible(true)}
              />
              <Chip
                label={
                  locating ? "Определяем место…" : "Использовать геолокацию"
                }
                onPress={() => {
                  if (!locating) void locate();
                }}
              />
              <Text style={s.caption}>
                Только по нажатию. Округлённые координаты передаются MET Norway
                для прогноза.
              </Text>
            </View>
            {favorites.length > 0 && (
              <View style={s.card}>
                <Text style={s.subtitle}>Избранные города</Text>
                {favorites.map((value) => (
                  <Chip
                    key={value.id}
                    label={value.name}
                    onPress={() => {
                      chooseCity(value);
                      setTab("weather");
                    }}
                  />
                ))}
              </View>
            )}
            <View style={s.card}>
              <View style={s.row}>
                <Text style={s.text}>Температура в °F</Text>
                <Switch
                  accessibilityLabel="Температура в Фаренгейтах"
                  value={preferences.fahrenheit}
                  onValueChange={(fahrenheit) => update({ fahrenheit })}
                />
              </View>
              <View style={s.row}>
                <Text style={[s.text, s.flex]}>Диагностика разработчика</Text>
                <Switch
                  accessibilityLabel="Включить безопасную диагностику"
                  value={preferences.diagnostics}
                  onValueChange={(diagnostics) => update({ diagnostics })}
                />
              </View>
              <Text style={s.caption}>
                Настройки хранятся на устройстве. Аккаунт не требуется.
              </Text>
            </View>
            <View style={s.card}>
              <Text style={s.subtitle}>Atmos · 3.0.0</Text>
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
            </View>
          </>
        )}
        {forecast && tab !== "settings" && (
          <Text style={s.caption}>
            {stale ? "Сохранено" : "Обновлено"}{" "}
            {new Date(forecast.fetchedAt).toLocaleTimeString("ru-RU", {
              timeZone: forecast.timezone,
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            · Потяните вниз для обновления
          </Text>
        )}
        {tab === "weather" && reviews.visible && (
          <View style={s.card}>
            <Text style={s.subtitle}>Пару слов об Atmos?</Text>
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
      <View style={s.nav}>
        {tabs.map(([value, label, glyph]) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === value }}
            accessibilityLabel={label}
            style={s.navItem}
            onPress={() => setTab(value)}
          >
            <View style={[s.navIcon, tab === value && s.navSelected]}>
              <Ionicons
                name={glyph}
                size={25}
                color={tab === value ? "#21483e" : "#737c74"}
              />
            </View>
            <Text style={s.navLabel}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Modal
        visible={searchVisible}
        animationType="slide"
        onRequestClose={() => setSearchVisible(false)}
      >
        <SafeAreaView style={s.safe}>
          <View style={s.header}>
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
            contentContainerStyle={s.body}
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
  return (
    <SafeAreaProvider>
      <Atmos />
    </SafeAreaProvider>
  );
}
