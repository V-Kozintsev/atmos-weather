export type ComfortVote = "cold" | "comfortable" | "hot";
export interface ComfortHistory { day: string; vote?: ComfortVote; offset: number; base?: number }

/** @param {ComfortHistory | null} saved - Сохранённый ответ. @param {string} day - День города. @returns {number} Ограниченная поправка, действующая только со следующего дня. */
export function activeComfortOffset(saved: ComfortHistory | null, day: string): number {
  if (!saved || !/^\d{4}-\d{2}-\d{2}$/.test(saved.day) || saved.day > day) return 0;
  const value = saved.day === day ? saved.base ?? 0 : saved.offset;
  return Number.isFinite(value) ? Math.max(-3, Math.min(3, value)) : 0;
}

/** @param {ComfortHistory | null} previous - Предыдущая настройка. @param {string} day - День ответа в городе. @param {ComfortVote} vote - Реальные ощущения пользователя. @returns {ComfortHistory} Одна поправка за день без накопления от повторных нажатий. */
export function recordComfort(previous: ComfortHistory | null, day: string, vote: ComfortVote): ComfortHistory {
  const base = activeComfortOffset(previous, day);
  return { day, vote, base, offset: Math.max(-3, Math.min(3, base + (vote === "cold" ? 1 : vote === "hot" ? -1 : 0))) };
}
