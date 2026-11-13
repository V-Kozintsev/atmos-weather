import { parseMetForecast, type MetResponse } from "./met";
import type { City, Forecast } from "./weather";

class ForecastHttpError extends Error {
  /** @param {number} status - HTTP-статус источника. Создаёт ошибку с признаком допустимости повторного запроса. */
  constructor(readonly status: number) { super(`Forecast HTTP ${status}`); }
}

/** @param {City} city - Выбранный город. @param {AbortSignal} signal - Отмена при смене города. @param {Record<string, string>} headers - Заголовки платформы без секретов. @param {Function} diagnostic - Безопасные этапы загрузки без координат. @returns {Promise<object>} Проверенный прогноз и срок его свежести; при временном сбое пробует компактный ответ того же источника. */
export async function requestMetForecast(city: City, signal: AbortSignal, headers: Record<string, string> = {}, diagnostic?: (event: string, detail: Record<string, unknown>) => void): Promise<{ forecast: Forecast; expiresAt: number }> {
  const lat = Math.round(city.latitude * 10000) / 10000;
  const lon = Math.round(city.longitude * 10000) / 10000;
  for (const [index, format] of ["complete", "compact"].entries()) {
    if (signal.aborted) throw new Error("Aborted");
    const controller = new AbortController();
    /** @returns {void} Передаёт отмену текущей попытке, включая чтение тела ответа. */
    const cancel = (): void => controller.abort();
    signal.addEventListener("abort", cancel);
    const timer = setTimeout(cancel, 10_000);
    try {
      diagnostic?.("forecast request", { attempt: index + 1, format });
      const response = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/${format}?lat=${lat}&lon=${lon}`, { signal: controller.signal, headers });
      if (!response.ok) throw new ForecastHttpError(response.status);
      const forecast = parseMetForecast(city, await response.json() as MetResponse);
      if (signal.aborted || controller.signal.aborted) throw new Error("Aborted");
      const expiry = Date.parse(response.headers.get("Expires") || "");
      diagnostic?.("forecast response", { attempt: index + 1, status: response.status });
      return { forecast, expiresAt: Number.isFinite(expiry) && expiry > Date.now() ? expiry : Date.now() + 600_000 };
    } catch (error) {
      const retry = !signal.aborted && index === 0 && (!(error instanceof ForecastHttpError) || error.status === 408 || error.status >= 500);
      diagnostic?.("forecast request failed", { attempt: index + 1, reason: error instanceof Error ? error.name : "unknown", status: error instanceof ForecastHttpError ? error.status : undefined, retry });
      if (!retry) throw error;
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
    }
  }
  throw new Error("Forecast unavailable");
}
