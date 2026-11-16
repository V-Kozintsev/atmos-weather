/** @returns {Promise<void>} Заранее готовить нечего: оценка внутри приложения есть только в Android. */
export async function prepareInAppReview(): Promise<void> {}
/** @returns {Promise<boolean>} На других платформах всегда переход в магазин. */
export async function launchInAppReview(): Promise<boolean> { return false; }
