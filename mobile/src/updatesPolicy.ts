import { isGooglePlay } from "./distribution";
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
  if (isGooglePlay) {
    if (code === -10) return "Google Play не подтвердил установку для текущего аккаунта. Проверьте, что в магазине выбран аккаунт, с которого вы установили приложение и вступили в тестирование.";
    if (code === -6) return "Google Play пока не разрешает установку. Проверьте свободное место и заряд телефона, затем повторите попытку.";
    if (code === -5) return "Google Play пока не разрешает обновление внутри приложения для этого аккаунта или устройства. Доступную версию можно установить со страницы приложения в магазине.";
    if (code === -8) return "Google Play уже выполняет обновление. Нажмите «Проверить состояние», чтобы продолжить без повторной загрузки.";
    if (code === -7) return "Файл обновления ещё не готов к установке. Нажмите «Проверить состояние» и дождитесь завершения загрузки.";
    if (code === -9 || code === -3) return "Обновление внутри приложения недоступно на этом устройстве. Проверьте наличие официального Google Play и установите обновление через него.";
    return "Google Play не завершил обновление. Можно повторить попытку или проверить состояние. Погода продолжает работать.";
  }
  if (code === 4006) return "На телефоне не хватает места. Освободите память и повторите обновление.";
  if (code === 4003) return "Android заблокировал установку. Откройте RuStore и следуйте его подсказкам: может потребоваться разрешение на установку приложений.";
  if (code === 4012) return "RuStore пока не разрешил обновление. Откройте страницу приложения в магазине и проверьте доступность новой версии.";
  if (code === 4002) return "Загрузка прервалась. Проверьте подключение к интернету и повторите попытку.";
  if (code === 4005 || code === 4004 || code === 4007) return "Не удалось установить эту сборку. Откройте страницу приложения в RuStore.";
  if (code === 4010) return "Установка отменена. Можно попробовать ещё раз, когда будет удобно.";
  if (code === 4011) return "Скачанный файл больше недоступен. Откройте RuStore, чтобы загрузить обновление заново.";
  return "Обновление не завершилось. Попробуйте ещё раз или откройте RuStore. Погода продолжает работать.";
}

/** @param {number | undefined} downloaded - Скачанные байты. @param {number | undefined} total - Полный размер из SDK. @returns {string | undefined} Реальный объём без выдуманного размера или времени ожидания. */
export function updateBytes(downloaded?: number, total?: number): string | undefined {
  if (!Number.isFinite(downloaded) || !Number.isFinite(total) || downloaded! < 0 || total! <= 0) return;
  return `${(Math.min(downloaded!, total!) / 1048576).toFixed(1).replace(".", ",")} из ${(total! / 1048576).toFixed(1).replace(".", ",")} МБ`;
}
