import { cityFromUrl } from "../../src/lib/cityFromUrl";
import { isCity, type City } from "../../src/lib/weather";

/** @param {string} key - Ключ прежней веб-версии. @param {T} fallback - Значение по умолчанию. @returns {T} Сохранённые данные без удаления старых настроек. */
export function legacyWebValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(window.localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}

/** @param {boolean} linkedOnly - Учитывать только явную ссылку. @returns {City | undefined} Город из ссылки или прежнего веб-интерфейса. */
export function initialWebCity(linkedOnly = false): City | undefined {
  if (typeof window === "undefined") return undefined;
  const linked = cityFromUrl();
  if (linkedOnly) return linked;
  const saved = legacyWebValue<unknown>("atmos-city", undefined);
  return linked ?? (isCity(saved) ? saved : undefined);
}

/** @returns {void} Подключает офлайн-интерфейс и проверяет обновления при возвращении и раз в час. */
export function registerWebUpdates(): void {
  if (__DEV__ || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const controlled = !!navigator.serviceWorker.controller;
  let reloading = false;
  /** @returns {void} Перезагружает работающий интерфейс после активации новой версии. */
  function refreshVersion(): void {
    if (!controlled || reloading) return;
    reloading = true;
    window.location.reload();
  }
  navigator.serviceWorker.addEventListener("controllerchange", refreshVersion);
  void navigator.serviceWorker.register("./sw.js", { scope: "./", updateViaCache: "none" }).then((registration) => {
    /** @returns {void} Запрашивает новую сборку без кеширования погодных запросов. */
    function checkUpdate(): void {
      if (document.visibilityState === "visible") void registration.update().catch(() => {});
    }
    document.addEventListener("visibilitychange", checkUpdate);
    window.setInterval(checkUpdate, 60 * 60_000);
  }).catch(() => console.info("[Atmos Web] offline interface unavailable"));
}
