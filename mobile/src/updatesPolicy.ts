export interface DeferredUpdate { version: number; until: number }

/** @param {number} version - Доступный код версии. @param {number} current - Код установленной версии. @param {DeferredUpdate | null} deferred - Последнее откладывание. @param {number} now - Текущее время. @returns {boolean} Нужно ли ненавязчиво предложить новую версию. */
export function shouldOfferUpdate(version: number, current: number, deferred: DeferredUpdate | null, now: number): boolean {
  return Number.isInteger(version) && version > current && !(deferred?.version === version && deferred.until > now);
}

/** @param {number | undefined} downloaded - Скачано байт. @param {number | undefined} total - Общий размер. @returns {number | undefined} Ограниченный процент без деления на ноль. */
export function updateProgress(downloaded?: number, total?: number): number | undefined {
  if (!Number.isFinite(downloaded) || !Number.isFinite(total) || !total || total < 0) return undefined;
  return Math.max(0, Math.min(100, Math.round(downloaded! / total * 100)));
}

/** @param {number | undefined} code - Код ошибки официального SDK. @returns {string} Понятное действие без вывода внутренних сообщений. */
export function updateErrorMessage(code?: number): string {
  if (code === 4006) return "На телефоне не хватает места. Освободите память и повторите обновление.";
  if (code === 4003 || code === 4012) return "Android ограничил установку. Проверьте разрешение на установку приложений для RuStore.";
  if (code === 4002) return "Загрузка прервалась. Проверьте подключение к интернету и повторите попытку.";
  if (code === 4005 || code === 4004 || code === 4007) return "Не удалось установить эту сборку. Откройте страницу приложения в RuStore.";
  if (code === 4010) return "Установка отменена. Можно попробовать ещё раз, когда будет удобно.";
  return "Обновление не завершилось. Попробуйте ещё раз или откройте RuStore. Погода продолжает работать.";
}

/** @param {number | undefined} downloaded - Скачанные байты. @param {number | undefined} total - Полный размер из SDK. @returns {string | undefined} Реальный объём без выдуманного размера или времени ожидания. */
export function updateBytes(downloaded?: number, total?: number): string | undefined {
  if (!Number.isFinite(downloaded) || !Number.isFinite(total) || downloaded! < 0 || total! <= 0) return;
  return `${(Math.min(downloaded!, total!) / 1048576).toFixed(1).replace(".", ",")} из ${(total! / 1048576).toFixed(1).replace(".", ",")} МБ`;
}
