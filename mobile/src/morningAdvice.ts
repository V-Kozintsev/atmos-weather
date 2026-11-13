import type { Forecast } from "../../src/lib/weather";
import type { OutfitPreferences } from "../../src/lib/outfit";
import type { MorningTime } from "../../src/lib/morning";

export interface MorningPreferences extends OutfitPreferences { fahrenheit: boolean; morningAdvice: boolean; morningTime: MorningTime }

/** @returns {Promise<boolean>} Утренние уведомления есть только в Android-приложении. */
export async function requestMorningAdvice(): Promise<boolean> { return false; }
/** @returns {Promise<void>} На других платформах планировать нечего. */
export async function cancelMorningAdvice(): Promise<void> {}
/** @returns {Promise<number>} На других платформах уведомления не планируются. */
export async function scheduleMorningAdvice(_forecast: Forecast, _preferences: MorningPreferences): Promise<number> { return 0; }
/** @returns {Promise<void>} Фоновое обновление есть только у Android-виджета. */
export async function refreshMorningAdvice(_forecast: Forecast): Promise<void> {}
/** @returns {void} На других платформах нажатий на уведомления нет. */
export function useMorningAdviceOpen(_onOpen: () => void): void {}
