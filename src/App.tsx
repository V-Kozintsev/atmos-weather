import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import {
  ArrowUpRight,
  Bike,
  Check,
  ChevronRight,
  CloudSun,
  Compass,
  Droplets,
  Footprints,
  Gauge,
  Code2,
  Heart,
  LocateFixed,
  MapPin,
  RefreshCw,
  Share2,
  Sparkles,
  Sunrise,
  Sunset,
  Timer,
  Wind,
  X,
} from "lucide-react";
import Search from "./components/Search";
import AppInstall from "./components/AppInstall";
import CompactWeather from "./components/CompactWeather";
import OutfitCard from "./components/OutfitCard";
import PanelHeading from "./components/PanelHeading";
import ForecastChart from "./components/ForecastChart";
import WeatherIcon from "./components/WeatherIcon";
import {
  bestHour,
  CITIES,
  clock,
  condition,
  isCity,
  temperature,
  weekday,
  type Activity,
  type City,
} from "./lib/weather";
import { readStorage, saveStorage } from "./lib/api";
import { useWeather } from "./lib/useWeather";
import { cityFromUrl } from "./lib/cityFromUrl";

const nativeMobile = Capacitor.isNativePlatform();

/** @returns {Promise<{coords: {latitude: number, longitude: number}}>} Координаты устройства после разрешения на геолокацию. */
async function currentPosition(): Promise<{ coords: { latitude: number; longitude: number } }> {
  if (nativeMobile) {
    const permission = await Geolocation.requestPermissions({ permissions: ["coarseLocation"] });
    if (permission.coarseLocation !== "granted") throw new Error("Location denied");
    return Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, maximumAge: 300000 });
  });
}

/** @returns {City} Проверенный стартовый город из ссылки или последнего посещения. */
function initialCity(): City {
  const saved = readStorage<unknown>("atmos-city", null);
  return cityFromUrl() || (isCity(saved) ? saved : CITIES[0]);
}

/** @returns {JSX.Element} Погодная панель с прогнозом, избранным и планировщиком активности. */
export default function App() {
  const [city, setCity] = useState<City>(initialCity);
  const [favorites, setFavorites] = useState<City[]>(() => {
    const saved = readStorage<unknown>("atmos-favorites", []);
    return Array.isArray(saved) ? saved.filter(isCity).slice(0, 8) : [];
  });
  const [fahrenheit, setFahrenheit] = useState(
    () => readStorage<boolean>("atmos-fahrenheit", false) === true,
  );
  const [selectedDay, setSelectedDay] = useState(0);
  const [activity, setActivity] = useState<Activity>("walk");
  const [notice, setNotice] = useState("");
  const [locating, setLocating] = useState(false);
  const [compact, setCompact] = useState(() => new URL(location.href).searchParams.get("view") === "mini");
  const { forecast, loading, error, stale, refresh } =
    useWeather(city);
  useEffect(() => {
    const desktop = window.atmosDesktop;
    if (!desktop) return;
    let active = true;
    desktop.getCompact().then(value => { if (active) setCompact(value); }).catch(() => {});
    const unsubscribe = desktop.onCompact(setCompact);
    return () => { active = false; unsubscribe(); };
  }, []);
  useEffect(() => {
    if (forecast && !stale) window.atmosDesktop?.updateWeather({ city: city.name, temperature: temperature(forecast.current.temperature, fahrenheit), description: condition(forecast.current.code) });
  }, [forecast, city.name, fahrenheit, stale]);
  useEffect(() => {
    saveStorage("atmos-city", city);
    setSelectedDay(0);
  }, [city]);
  useEffect(() => {
    saveStorage("atmos-favorites", favorites);
  }, [favorites]);
  useEffect(() => {
    saveStorage("atmos-fahrenheit", fahrenheit);
  }, [fahrenheit]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(timer);
  }, [notice]);

  /** @param {City} next - Город для показа и ссылки. */
  function selectCity(next: City): void {
    setCity(next);
    const url = new URL(location.href);
    url.search = new URLSearchParams({
      city: next.name,
      region: next.country,
      lat: String(next.latitude),
      lon: String(next.longitude),
    }).toString();
    history.replaceState(null, "", url);
  }
  /** Добавляет или удаляет текущий город из локального избранного. */
  function toggleFavorite(): void {
    const exists = favorites.some(
      (c) => c.latitude === city.latitude && c.longitude === city.longitude,
    );
    if (!exists && favorites.length >= 8) {
      setNotice("Можно сохранить до 8 городов. Удалите один из избранного.");
      return;
    }
    setFavorites(
      exists
        ? favorites.filter(
            (c) =>
              c.latitude !== city.latitude || c.longitude !== city.longitude,
          )
        : [...favorites, city],
    );
    setNotice(
      exists ? "Город удалён из избранного" : "Город сохранён в избранном",
    );
  }
  /** Копирует ссылку на выбранный город; сообщает о недоступном буфере. */
  async function share(): Promise<void> {
    const url = new URL("https://v-kozintsev.github.io/atmos-weather/");
    url.search = new URLSearchParams({
      city: city.name,
      region: city.country,
      lat: String(city.latitude),
      lon: String(city.longitude),
    }).toString();
    try {
      await navigator.clipboard.writeText(url.toString());
      setNotice("Ссылка на прогноз скопирована");
    } catch {
      setNotice(window.atmosDesktop ? "Не удалось скопировать ссылку. Попробуйте ещё раз." : "Не удалось скопировать. Ссылка на город доступна в адресной строке.");
      if (!window.atmosDesktop) history.replaceState(null, "", `${location.pathname}${url.search}`);
    }
  }
  /** @returns {Promise<void>} Запрашивает местоположение только по нажатию и округляет координаты для MET Norway. */
  async function locate(): Promise<void> {
    if (window.atmosDesktop) {
      setNotice("В приложении выберите город через поиск или избранное.");
      return;
    }
    if (!nativeMobile && !navigator.geolocation) {
      setNotice("Геолокация не поддерживается браузером");
      return;
    }
    setLocating(true);
    try {
      const position = await currentPosition();
      selectCity({
        id: "geo",
        name: "Моё местоположение",
        country: "По координатам устройства",
        latitude: Math.round(position.coords.latitude * 100) / 100,
        longitude: Math.round(position.coords.longitude * 100) / 100,
      });
    } catch {
      setNotice("Не удалось определить местоположение. Выберите город через поиск.");
    } finally {
      setLocating(false);
    }
  }

  const current = forecast?.current;
  const day = forecast?.days[selectedDay];
  const nearestHour = current && (forecast?.hours.find((hour) => hour.time >= current.time) ?? {
    time: current.time,
    temperature: current.temperature,
    feels: current.feels,
    rain: 0,
    wind: current.wind,
    code: current.code,
    day: current.day,
  });
  const remainingToday = forecast && current
    ? forecast.hours.filter((hour) => hour.time.startsWith(forecast.days[0].date) && hour.time >= current.time)
    : [];
  const upcoming =
    forecast?.hours
      .filter((h) => h.time >= forecast.current.time)
      .slice(0, 24) || [];
  const dayHours =
    selectedDay === 0
      ? upcoming
      : forecast?.hours.filter((h) => h.time.startsWith(day?.date || "!")) ||
        [];
  const chartHours = dayHours.filter((_, i) => i % 2 === 0);
  const best = bestHour(dayHours, activity);
  const isFavorite = favorites.some(
    (c) => c.latitude === city.latitude && c.longitude === city.longitude,
  );
  /** @param {number} value - Температура в °C. @returns {number} Температура в выбранных единицах. */
  const temp = (value: number): number => temperature(value, fahrenheit);
  const sunriseMinute = day
    ? Number(clock(day.sunrise).slice(0, 2)) * 60 +
      Number(clock(day.sunrise).slice(3))
    : 0;
  const sunsetMinute = day
    ? Number(clock(day.sunset).slice(0, 2)) * 60 +
      Number(clock(day.sunset).slice(3))
    : 0;
  const currentMinute = current
    ? Number(clock(current.time).slice(0, 2)) * 60 +
      Number(clock(current.time).slice(3))
    : 0;
  const sunProgress =
    selectedDay === 0
      ? Math.max(
          0,
          Math.min(
            1,
            (currentMinute - sunriseMinute) /
              (sunsetMinute - sunriseMinute || 1),
          ),
        )
      : 0;
  const hasSunTimes =
    !!day?.sunrise && !!day?.sunset && sunsetMinute > sunriseMinute;

  if (compact) return <CompactWeather city={city} forecast={forecast} fahrenheit={fahrenheit} loading={loading} stale={stale} refresh={refresh} />;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        К прогнозу
      </a>
      <aside className="sidebar">
        <a
          href={import.meta.env.BASE_URL}
          className="brand"
          aria-label="Atmos, главная"
        >
          <span className="brand-symbol">
            <CloudSun />
          </span>
          atmos<span className="brand-dot">.</span>
        </a>
        <div className="sidebar-intro">
          <span className="eyebrow">ЧУТЬ БЛИЖЕ К ПРИРОДЕ</span>
          <p>
            У каждого дня
            <br />
            своя атмосфера.
          </p>
        </div>
        <nav aria-label="Разделы">
          <a href="#main" className="nav-item active">
            <Compass size={19} />
            Обзор погоды
            <ChevronRight size={15} />
          </a>
          <a href="#week" className="nav-item">
            <Timer size={19} />
            На неделю
          </a>
          <a href="#planner" className="nav-item">
            <Footprints size={19} />
            Планы на день
          </a>
        </nav>
        <div className="saved-cities">
          <div className="sidebar-title">
            <span>МОИ ГОРОДА</span>
            <Heart size={14} />
          </div>
          {favorites.length ? (
            favorites.map((c) => (
              <div className="saved-city" key={`${c.latitude},${c.longitude}`}>
                <button
                  onClick={() => selectCity(c)}
                  className={
                    city.latitude === c.latitude &&
                    city.longitude === c.longitude
                      ? "chosen"
                      : ""
                  }
                >
                  <MapPin size={15} />
                  <span>{c.name}</span>
                </button>
                <button
                  className="icon-button"
                  aria-label={`Удалить ${c.name} из избранного`}
                  onClick={() => setFavorites(favorites.filter((f) => f !== c))}
                >
                  <X size={13} />
                </button>
              </div>
            ))
          ) : (
            <p className="empty-favorites">
              Сохраните любимые города,
              <br />
              чтобы вернуться одним нажатием.
            </p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="live-note">
            <span />
            Реальные данные, ясный интерфейс
          </div>
          <a
            href="https://github.com/V-Kozintsev/atmos-weather"
            target="_blank"
            rel="noreferrer"
          >
            <Code2 size={16} />
            Посмотреть код
            <ArrowUpRight size={14} />
          </a>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-label">
            Погода в деталях<span>Ваш день. Ваш ритм.</span>
          </div>
          <Search key={city.id} onSelect={selectCity} />
          {window.atmosDesktop ? <div className="desktop-actions"><button className="install-button" onClick={() => window.atmosDesktop?.setCompact(true)}>Мини-погода</button><button className="icon-button" aria-label="Свернуть в область уведомлений" onClick={() => window.atmosDesktop?.hide()}><ChevronRight size={20} /></button></div> : nativeMobile ? null : <AppInstall />}
          <button
            className="location-button"
            onClick={locate}
            disabled={locating}
            title="Определить местоположение и передать округлённые координаты MET Norway"
            hidden={!!window.atmosDesktop}
          >
            <LocateFixed size={17} className={locating ? "spin" : ""} />
            <span>{locating ? "Определяем…" : "Где я"}</span>
          </button>
          <div className="units" aria-label="Единицы температуры">
            <button
              aria-pressed={!fahrenheit}
              className={!fahrenheit ? "active" : ""}
              onClick={() => setFahrenheit(false)}
            >
              °C
            </button>
            <button
              aria-pressed={fahrenheit}
              className={fahrenheit ? "active" : ""}
              onClick={() => setFahrenheit(true)}
            >
              °F
            </button>
          </div>
        </header>
        <main id="main" aria-busy={loading}>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <MapPin size={13} />
                {city.country || "ПРОГНОЗ ПО КООРДИНАТАМ"}
              </div>
              <h1>
                {city.name}
                <span className="heading-dot">.</span>
              </h1>
              <p>
                {day
                  ? new Date(
                      `${forecast!.days[0].date}T12:00:00Z`,
                    ).toLocaleDateString("ru-RU", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      timeZone: "UTC",
                    })
                  : "Узнайте, что приготовил этот день"}
              </p>
            </div>
            <div className="heading-actions">
              <span className="update-status">
                <span className={loading || stale ? "pending" : ""} />
                {loading
                  ? "Обновляем…"
                  : stale
                    ? "Сохранённый прогноз"
                    : current
                      ? `Данные на ${clock(current.time)}`
                      : "Нет данных"}
              </span>
              <button
                className="icon-button bordered"
                aria-label="Обновить прогноз"
                disabled={loading}
                onClick={refresh}
              >
                <RefreshCw size={17} className={loading ? "spin" : ""} />
              </button>
              <button
                className="icon-button bordered"
                aria-label="Поделиться прогнозом"
                onClick={share}
              >
                <Share2 size={17} />
              </button>
            </div>
          </div>
          <div className="city-shortcuts" aria-label="Быстрый выбор города">
            {CITIES.map((c) => (
              <button
                key={`${c.latitude},${c.longitude}`}
                className={
                  city.latitude === c.latitude && city.longitude === c.longitude
                    ? "selected"
                    : ""
                }
                onClick={() => selectCity(c)}
              >
                {c.name}
              </button>
            ))}
          </div>
          {favorites.length > 0 && (
            <div className="mobile-favorites" aria-label="Избранные города">
              <span>Избранное</span>
              {favorites.map((c) => (
                <div key={`${c.latitude},${c.longitude}`}>
                  <button onClick={() => selectCity(c)}>
                    <Heart size={12} />
                    {c.name}
                  </button>
                  <button
                    aria-label={`Убрать ${c.name} из избранного`}
                    onClick={() =>
                      setFavorites(favorites.filter((f) => f !== c))
                    }
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button onClick={refresh} disabled={loading}>
                Повторить <RefreshCw size={14} />
              </button>
            </div>
          )}
          {!forecast && loading && (
            <div className="loading-dashboard" role="status">
              <div className="loading-orbit">
                <CloudSun size={48} />
              </div>
              <h2>Собираем прогноз</h2>
              <p>Температура, ветер и планы на день — уже в пути.</p>
              <div className="skeleton-grid">
                <div />
                <div />
                <div />
              </div>
            </div>
          )}
          {!forecast && !loading && (
            <div className="empty-state">
              <CloudSun size={48} />
              <h2>Погода пока вне доступа</h2>
              <p>Выберите другой город или обновите прогноз через минуту.</p>
            </div>
          )}
          {forecast && current && day && nearestHour && (
            <>
              <OutfitCard
                hour={nearestHour}
                day={forecast.days[0]}
                remainingHours={remainingToday}
                hourLabel={`${nearestHour.time.slice(0, 10) !== forecast.days[0].date ? "Завтра к" : "К"} ${clock(nearestHour.time)}`}
              />
              <div className="overview-grid">
                <section
                  className={`current-card ${current.day ? "daytime" : "nighttime"}`}
                  aria-labelledby="current-heading"
                >
                  <div className="current-top">
                    <p className="eyebrow" id="current-heading">
                      СЕЙЧАС В ГОРОДЕ
                    </p>
                    <button
                      className={`icon-button favorite ${isFavorite ? "saved" : ""}`}
                      aria-label={
                        isFavorite
                          ? "Удалить город из избранного"
                          : "Добавить город в избранное"
                      }
                      aria-pressed={isFavorite}
                      onClick={toggleFavorite}
                    >
                      <Heart
                        size={20}
                        fill={isFavorite ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                  <div className="weather-art" aria-hidden="true">
                    <div className="orbit orbit-one" />
                    <div className="orbit orbit-two" />
                    <div className="art-glow" />
                    <WeatherIcon code={current.code} day={current.day} />
                  </div>
                  <div className="current-main">
                    <div className="big-temperature">
                      {temp(current.temperature)}
                      <span>°</span>
                    </div>
                    <h2>{condition(current.code)}</h2>
                    <p>
                      Ощущается как {temp(current.feels)}° <span>·</span>{" "}
                      {temp(forecast.days[0].max)}° /{" "}
                      {temp(forecast.days[0].min)}°
                    </p>
                  </div>
                  <div className="current-bottom">
                    <span>
                      <Wind size={16} />
                      {Math.round(current.wind)} км/ч
                    </span>
                    <span>
                      <Droplets size={15} />
                      {current.humidity}%
                    </span>
                    <span>
                      {current.day ? "Светлый день" : "Ночной город"}
                      <ArrowUpRight size={15} />
                    </span>
                  </div>
                </section>
                <section
                  className="panel details-panel"
                  aria-labelledby="details-heading"
                >
                  <PanelHeading
                    eyebrow="БОЛЬШЕ КОНТЕКСТА"
                    id="details-heading"
                    title="За пределами градусов"
                  >
                    <span className="small-badge">Сейчас</span>
                  </PanelHeading>
                  <div className="metrics-grid">
                    <div className="metric">
                      <Wind />
                      <span>Ветер</span>
                      <strong>
                        {Math.round(current.wind)}
                        <small>км/ч</small>
                      </strong>
                      <p>
                        <span
                          className="wind-arrow"
                          style={{
                            transform: `rotate(${current.direction + 180}deg)`,
                          }}
                        >
                          ↑
                        </span>{" "}
                        {
                          ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"][
                            Math.round(current.direction / 45) % 8
                          ]
                        }{" "}
                        · направление
                      </p>
                    </div>
                    <div className="metric">
                      <Droplets />
                      <span>Влажность</span>
                      <strong>
                        {current.humidity}
                        <small>%</small>
                      </strong>
                      <div className="metric-meter">
                        <span style={{ width: `${current.humidity}%` }} />
                      </div>
                    </div>
                    <div className="metric">
                      <Gauge />
                      <span>Давление</span>
                      <strong>
                        {Math.round(current.pressure * 0.750062)}
                        <small>мм</small>
                      </strong>
                      <p>ртутного столба</p>
                    </div>
                    <div className="metric">
                      <Sunrise />
                      <span>УФ-индекс</span>
                      <strong>
                        {Number.isFinite(day.uv) ? day.uv.toFixed(1) : "—"}
                        <small>/ 11+</small>
                      </strong>
                      <p>
                        {!Number.isFinite(day.uv)
                          ? "Нет данных"
                          : day.uv <= 2
                            ? "Низкий"
                            : day.uv <= 5
                              ? "Умеренный"
                              : day.uv <= 7
                                ? "Высокий"
                                : "Очень высокий"}{" "}
                        · максимум {selectedDay === 0 ? "сегодня" : "за день"}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
              <div className="forecast-grid">
                <ForecastChart
                  key={`${city.latitude}-${city.longitude}-${selectedDay}`}
                  hours={chartHours}
                  fahrenheit={fahrenheit}
                  label={
                    selectedDay === 0
                      ? "Следующие 24 часа"
                      : `${weekday(day.date)}, ${day.date.slice(8)}.${day.date.slice(5, 7)}`
                  }
                />
                <section
                  className="panel week-panel"
                  id="week"
                  aria-labelledby="week-heading"
                >
                  <PanelHeading
                    eyebrow="СМОТРИМ ВПЕРЁД"
                    id="week-heading"
                    title="Прогноз на неделю"
                  >
                    <span className="small-badge">7 дней</span>
                  </PanelHeading>
                  <div className="week-list">
                    {forecast.days.map((d, i) => (
                      <button
                        key={d.date}
                        className={`day-row ${selectedDay === i ? "selected" : ""}`}
                        aria-pressed={selectedDay === i}
                        aria-label={`${i === 0 ? "Сегодня" : weekday(d.date)}, ${condition(d.code)}, от ${temp(d.min)} до ${temp(d.max)} градусов. Показать почасовой прогноз.`}
                        onClick={() => setSelectedDay(i)}
                      >
                        <span className="day-name">
                          {i === 0 ? "Сегодня" : weekday(d.date)}
                          <small>
                            {d.date.slice(8)}.{d.date.slice(5, 7)}
                          </small>
                        </span>
                        <WeatherIcon code={d.code} />
                        <span className="day-rain">{d.rain.toFixed(1)} мм</span>
                        <span className="day-range">
                          <span>{temp(d.min)}°</span>
                          <span className="range-track">
                            <span
                              style={{
                                marginLeft: `${Math.max(0, (d.min - Math.min(...forecast.days.map((d) => d.min))) * 3)}%`,
                                width: `${Math.max(15, Math.min(100, (d.max - d.min) * 6))}%`,
                              }}
                            />
                          </span>
                          <strong>{temp(d.max)}°</strong>
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="subtle-caption">
                    Выберите день — график и планы обновятся.
                  </p>
                </section>
              </div>
              <div className="insights-grid">
                <section
                  className="panel planner-panel"
                  id="planner"
                  aria-labelledby="planner-heading"
                >
                  <PanelHeading
                    eyebrow="ВЫЙТИ ИЗ ДОМА"
                    id="planner-heading"
                    title="Поймайте хороший момент"
                  >
                    <Sparkles size={20} />
                  </PanelHeading>
                  <div className="activity-tabs">
                    {(
                      [
                        { id: "walk", label: "Прогулка", Icon: Footprints },
                        { id: "run", label: "Пробежка", Icon: Timer },
                        { id: "cycle", label: "Велосипед", Icon: Bike },
                      ] as const
                    ).map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        className={activity === id ? "selected" : ""}
                        aria-pressed={activity === id}
                        onClick={() => setActivity(id)}
                      >
                        <Icon size={15} />
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="planner-result">
                    <div className="planner-symbol">
                      <Footprints size={26} />
                    </div>
                    <div>
                      <span className="eyebrow">
                        {selectedDay === 0
                          ? "В БЛИЖАЙШИЕ 24 ЧАСА"
                          : `${weekday(day.date)} · ${day.date.slice(8)}.${day.date.slice(5, 7)}`}
                      </span>
                      <strong>
                        {best
                          ? `${best.time.slice(0, 10) !== forecast.days[0].date && selectedDay === 0 ? "Завтра, " : ""}${clock(best.time)} — хороший вариант`
                          : "Лучше без спешки"}
                      </strong>
                      <p>
                        {best
                          ? `${temp(best.feels)}° по ощущениям, осадки ${best.rain.toFixed(1)} мм, ветер ${Math.round(best.wind)} км/ч.`
                          : "В прогнозе нет дневного часа с подходящими условиями для этой активности."}
                      </p>
                    </div>
                  </div>
                  <details>
                    <summary>Как выбирается время?</summary>
                    <p>
                      Из{" "}
                      {selectedDay === 0
                        ? "следующих 24 часов"
                        : "выбранного дня"}{" "}
                      выбираем дневной час с осадками до 0,2 мм.
                      Учитываем температуру по ощущениям и ветер: для прогулки
                      0–30°C и до 30 км/ч, бега 3–25°C и до 25 км/ч, велосипеда
                      5–28°C и до 20 км/ч. Затем ищем минимум осадков, ветра и
                      отклонения от 18°C. Это ориентир по прогнозу.
                    </p>
                  </details>
                </section>
                <section
                  className="panel sun-panel"
                  aria-labelledby="sun-heading"
                >
                  <PanelHeading
                    eyebrow="РИТМ ДНЯ"
                    id="sun-heading"
                    title="От рассвета до заката"
                  >
                    <Sunrise size={20} />
                  </PanelHeading>
                  {hasSunTimes ? (
                    <>
                      <div className="sun-arc">
                        <svg viewBox="0 0 250 100" aria-hidden="true">
                          <path
                            d="M15 90 Q125 -65 235 90"
                            fill="none"
                            stroke="var(--line)"
                            strokeWidth="2"
                            strokeDasharray="4 5"
                          />
                          <path
                            d="M15 90 Q125 -65 235 90"
                            fill="none"
                            stroke="var(--accent)"
                            strokeWidth="2"
                            pathLength="100"
                            strokeDasharray={`${sunProgress * 100} 100`}
                          />
                          <circle
                            cx={15 + 220 * sunProgress}
                            cy={90 - 310 * sunProgress * (1 - sunProgress)}
                            r="7"
                            fill="var(--accent)"
                          />
                          <line
                            x1="0"
                            x2="250"
                            y1="90"
                            y2="90"
                            stroke="var(--line)"
                          />
                        </svg>
                        <span>
                          {Math.floor((sunsetMinute - sunriseMinute) / 60)} ч{" "}
                          {Math.max(0, (sunsetMinute - sunriseMinute) % 60)} мин
                          <small>световой день</small>
                        </span>
                      </div>
                      <div className="sun-times">
                        <div>
                          <Sunrise size={16} />
                          <span>
                            Восход<strong>{clock(day.sunrise)}</strong>
                          </span>
                        </div>
                        <div>
                          <Sunset size={16} />
                          <span>
                            Закат<strong>{clock(day.sunset)}</strong>
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="air-unavailable">
                      Для этой даты нет обычного восхода и заката: возможен
                      полярный день или ночь.
                    </p>
                  )}
                </section>
              </div>
              <div className="data-note">
                <Check size={14} />
                <span>
                  Время указано для выбранного города · {forecast.timezone}.{" "}
                  {stale
                    ? `Сохранено ${new Date(forecast.fetchedAt).toLocaleString("ru-RU")}.`
                    : "Прогноз обновляется каждые 15 минут."}
                </span>
              </div>
            </>
          )}
        </main>
        <footer>
          <span>
            atmos<span className="brand-dot">.</span>{" "}
            <small>Погода, с которой можно строить планы.</small>
          </span>
          <div>
            <a href="https://api.met.no/" target="_blank" rel="noreferrer">
              Данные MET Norway · адаптированы
            </a>
            <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
              CC BY 4.0
            </a>
            <a href="https://www.geonames.org/" target="_blank" rel="noreferrer">
              Города GeoNames
            </a>
            <a href={`${import.meta.env.BASE_URL}privacy.html`}>
              Конфиденциальность
            </a>
            <a href="https://puskweb.ru/" target="_blank" rel="noreferrer">
              Сайт разработал <strong>PuskWeb</strong>
              <ArrowUpRight size={12} />
            </a>
          </div>
        </footer>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{notice}</span>
          <button
            className="icon-button"
            aria-label="Закрыть уведомление"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
