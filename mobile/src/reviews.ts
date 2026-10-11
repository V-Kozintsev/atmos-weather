import { useEffect, useState } from "react";
import { Linking } from "react-native";
import { read, write } from "./storage";

interface ReviewHistory {
  first: number;
  days: string[];
  until: number;
  disabled: boolean;
  prompts: number;
}
const key = "atmos-native-review-history";
export const reviewUrl = "https://www.rustore.ru/catalog/app/ru.puskweb.atmos";

/** @param {ReviewHistory} history - Локальная история использования. @param {number} now - Текущее время. @returns {boolean} Допускает не более двух предложений после трёх дней использования. */
export function reviewEligible(history: ReviewHistory, now: number): boolean {
  return (
    !history.disabled &&
    history.prompts < 2 &&
    history.days.length >= 3 &&
    now - history.first >= 3 * 86400000 &&
    now >= history.until
  );
}

/** @param {boolean} successful - Погода успешно загружена. @returns {object} Ненавязчивое предложение, откладывание и отключение. */
export function useReviews(successful: boolean) {
  const [history, setHistory] = useState<ReviewHistory>();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let alive = true;
    /** @returns {Promise<void>} Учитывает день успешного использования, не отдельные запросы API. */
    async function registerDay(): Promise<void> {
      const now = Date.now();
      const saved = await read<Partial<ReviewHistory> | null>(key, null);
      if (!alive) return;
      const today = new Date().toLocaleDateString("en-CA");
      const next: ReviewHistory = {
        first: Number.isFinite(saved?.first) ? saved!.first! : now,
        days: Array.isArray(saved?.days)
          ? saved.days.filter((day) => typeof day === "string").slice(-30)
          : [],
        until: Number.isFinite(saved?.until) ? saved!.until! : 0,
        disabled: saved?.disabled === true,
        prompts: Number.isFinite(saved?.prompts) ? saved!.prompts! : 0,
      };
      if (successful && !next.days.includes(today)) next.days.push(today);
      const eligible = successful && reviewEligible(next, now);
      if (eligible) {
        next.prompts += 1;
        next.until = now + 30 * 86400000;
      }
      if (successful) await write(key, next);
      if (alive) {
        setHistory(next);
        setVisible(eligible);
      }
    }
    void registerDay();
    return () => {
      alive = false;
    };
  }, [successful]);
  /** @param {boolean} disabled - Отключение автоматических предложений. @returns {Promise<void>} Сохраняет настройку и убирает предложение. */
  async function dismiss(disabled = false): Promise<void> {
    setVisible(false);
    if (!history) return;
    const next = { ...history, disabled, until: Date.now() + 30 * 86400000 };
    setHistory(next);
    await write(key, next);
  }
  /** @returns {Promise<void>} Открывает карточку RuStore, не утверждая, что оценка оставлена. */
  async function rate(): Promise<void> {
    await Linking.openURL(reviewUrl);
    await dismiss(true);
  }
  return { visible, disabled: history?.disabled === true, dismiss, rate };
}
