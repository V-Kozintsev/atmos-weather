import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import type { City, Forecast } from "../../src/lib/weather";
import { loadForecast, savedForecast, log } from "./weather";

/** @param {City | undefined} city - Восстановленный город пользователя. @returns {object} Прогноз, состояние сети и обновление с защитой от устаревших ответов. */
export function useForecast(city: City | undefined) {
  const [forecast, setForecast] = useState<Forecast>();
  const [loading, setLoading] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  /** @returns {void} Запрашивает обновление с сохранением кэша источника. */
  const refresh = useCallback(
    (): void => setRevision((value) => value + 1),
    [],
  );
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    const timer = setInterval(refresh, 900000);
    return () => {
      listener.remove();
      clearInterval(timer);
    };
  }, [refresh]);
  useEffect(() => {
    if (!city) return;
    const controller = new AbortController();
    setForecast(undefined);
    setLoading(true);
    setError("");
    setStale(false);
    /** @returns {Promise<void>} Загружает снимок и сеть; отменённые запросы не меняют интерфейс. */
    async function load(): Promise<void> {
      const snapshot = await savedForecast(city!);
      if (controller.signal.aborted) return;
      if (snapshot) {
        setForecast(snapshot);
        setStale(true);
      }
      try {
        const next = await loadForecast(city!, controller.signal);
        if (!controller.signal.aborted) {
          setForecast(next);
          setStale(false);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError(
            snapshot
              ? "Нет связи. Показываем сохранённый прогноз."
              : "Не удалось загрузить погоду. Проверьте интернет и повторите.",
          );
          log("offline", { cached: !!snapshot });
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [city?.latitude, city?.longitude, revision]);
  const matches =
    forecast?.city.latitude === city?.latitude &&
    forecast?.city.longitude === city?.longitude;
  return {
    forecast: matches ? forecast : undefined,
    loading,
    stale,
    error,
    refresh,
  };
}
