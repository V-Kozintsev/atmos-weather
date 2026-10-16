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
