import { ArrowUpRight, Droplets, RefreshCw, Wind } from "lucide-react";
import WeatherIcon from "./WeatherIcon";
import { clock, condition, temperature, type City, type Forecast } from "../lib/weather";
import "./CompactWeather.css";

/** @param {object} props - Город, прогноз, единицы и состояние обновления. @returns {JSX.Element} Мини-погода для окна поверх рабочего стола. */
export default function CompactWeather({ city, forecast, fahrenheit, loading, stale, refresh }: {
  city: City; forecast?: Forecast; fahrenheit: boolean; loading: boolean; stale: boolean; refresh: () => void;
}) {
  const current = forecast?.current;
  const hours = forecast?.hours.filter(hour => hour.time >= forecast.current.time).slice(0, 9).filter((_, index) => index % 2 === 0) || [];
  /** @returns {void} Возвращает полную панель в оболочке или браузере. */
  function openFull() {
    if (window.atmosDesktop) window.atmosDesktop.setCompact(false);
    else {
      const url = new URL(location.href);
      url.searchParams.delete("view");
      location.assign(url.toString());
    }
  }
  return <main className="compact-weather">
    <div className="compact-heading"><span>Погода и что надеть</span><button className="icon-button" aria-label="Открыть полный прогноз" onClick={openFull}><ArrowUpRight size={22} /></button></div>
    <h1>{city.name}</h1>
    <p className="compact-status">{loading ? "Обновляем…" : stale ? "Сохранённый прогноз" : current ? `Данные на ${clock(current.time)}` : "Нет данных — проверьте сеть"}</p>
    {current && <>
      <div className="compact-current"><strong>{temperature(current.temperature, fahrenheit)}°</strong><WeatherIcon code={current.code} day={current.day} /></div>
      <h2>{condition(current.code)}</h2>
      <p className="compact-feels">Ощущается как {temperature(current.feels, fahrenheit)}°</p>
      <div className="compact-metrics"><span><Wind size={17} />{Math.round(current.wind)} км/ч</span><span><Droplets size={17} />{current.humidity}%</span></div>
      <div className="compact-hours">{hours.map(hour => <div key={hour.time}><span>{clock(hour.time)}</span><WeatherIcon code={hour.code} day={hour.day} /><strong>{temperature(hour.temperature, fahrenheit)}°</strong></div>)}</div>
    </>}
    <div className="compact-footer"><span>{window.atmosDesktop ? "Поверх других окон" : "Компактный прогноз"}</span><button className="icon-button" disabled={loading} aria-label="Обновить прогноз" onClick={refresh}><RefreshCw size={18} className={loading ? "spin" : ""} /></button></div>
  </main>;
}
