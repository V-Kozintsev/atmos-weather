export interface ReviewHistory {
  policy: number;
  first: number;
  days: string[];
  until: number;
  disabled: boolean;
  prompts: number;
  storeOpened: boolean;
  confirmationPending: boolean;
}

export const reviewDelay = 3 * 86400000;
/** Пауза после шторки оценки внутри приложения: магазины сами ограничивают частые показы. */
export const inAppReviewPause = 60 * 86400000;

/** @param {Partial<ReviewHistory> | null} saved - Прежняя история на устройстве. @param {number} now - Время чтения. @returns {ReviewHistory} Проверенные данные с переносом старой месячной паузы на трёхдневную. */
export function normalizeReviewHistory(saved: Partial<ReviewHistory> | null, now: number): ReviewHistory {
  const until = Number.isFinite(saved?.until) ? saved!.until! : 0;
  return {
    policy: 2,
    first: Number.isFinite(saved?.first) ? saved!.first! : now,
    days: Array.isArray(saved?.days) ? [...new Set(saved.days.filter((day) => typeof day === "string"))].slice(-30) : [],
    until: saved?.policy === 2 ? until : Math.min(until, now + reviewDelay),
    disabled: saved?.disabled === true,
    prompts: Number.isFinite(saved?.prompts) ? Math.max(0, saved!.prompts!) : 0,
    storeOpened: saved?.storeOpened === true,
    confirmationPending: saved?.storeOpened === true && saved?.confirmationPending === true && saved?.disabled !== true,
  };
}

/** @param {ReviewHistory} history - История использования и отказов. @param {number} now - Текущее время. @returns {boolean} Разрешает показ со второго дня, повтор каждые три дня до явного отключения. */
export function reviewEligible(history: ReviewHistory, now: number): boolean {
  return !history.disabled && history.days.length >= 2 && now - history.first >= 86400000 && now >= history.until;
}
