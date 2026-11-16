import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking } from "react-native";
import { read, write } from "./storage";
import { storeUrl } from "./distribution";
import { trackEvent } from "./analytics";
import { inAppReviewPause, normalizeReviewHistory, reviewEligible, reviewDelay, type ReviewHistory } from "./reviewsPolicy";
import { launchInAppReview, prepareInAppReview } from "./inAppReview";

const key = "atmos-native-review-history";
export const reviewUrl = storeUrl;
export { reviewEligible } from "./reviewsPolicy";

/** @param {boolean} successful - Загружен свежий прогноз. @param {boolean} ready - Приложение доступно без других окон. @param {boolean} outfitVisible - Пользователь читает готовый комплект. @returns {object} Просьба после полезного просмотра и подтверждение отзыва после магазина. */
export function useReviews(successful: boolean, ready = true, outfitVisible = false) {
  const [history, setHistory] = useState<ReviewHistory>();
  const latest = useRef<ReviewHistory | undefined>(undefined);
  const writes = useRef(Promise.resolve());
  const shown = useRef(false);
  const openingStore = useRef(false);
  const leftForStore = useRef(false);
  const [confirmationReady, setConfirmationReady] = useState(true);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(AppState.currentState === "active");
  const [clock, setClock] = useState(Date.now());
  const [boost, setBoost] = useState(false);

  /** @param {ReviewHistory} next - Новая история без персональных данных. @returns {Promise<void>} Последовательно сохраняет изменения без перезаписи новейшего действия старой записью. */
  const save = useCallback((next: ReviewHistory): Promise<void> => {
    latest.current = next;
    setHistory(next);
    writes.current = writes.current.then(() => write(key, next));
    return writes.current;
  }, []);

  useEffect(() => {
    let alive = true;
    void read<Partial<ReviewHistory> | null>(key, null).then((saved) => {
      if (alive) void save(normalizeReviewHistory(saved, Date.now()));
    });
    return () => { alive = false; };
  }, [save]);

  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state !== "active" && openingStore.current) leftForStore.current = true;
      if (state === "active" && leftForStore.current) {
        openingStore.current = false;
        leftForStore.current = false;
        setConfirmationReady(true);
      }
      setActive(state === "active");
      if (state === "active") setClock(Date.now());
    });
    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (!successful || !active || !history) return;
    const today = new Date().toLocaleDateString("en-CA");
    if (!history.days.includes(today)) void save({ ...history, days: [...history.days.slice(-29), today] });
  }, [successful, active, history, clock, save]);

  useEffect(() => {
    if (!ready || !active || !history || history.disabled || visible) return;
    if (history.confirmationPending) {
      if (confirmationReady) { shown.current = false; setVisible(true); }
      return;
    }
    if (!successful || !(outfitVisible || boost) || !reviewEligible(history, Date.now())) return;
    const timer = setTimeout(() => { shown.current = false; setBoost(false); setVisible(true); }, boost ? 1500 : 8000);
    return () => clearTimeout(timer);
  }, [successful, ready, active, history, clock, visible, outfitVisible, confirmationReady, boost]);

  useEffect(() => {
    if (visible) void prepareInAppReview();
  }, [visible]);

  /** @returns {void} Хороший момент — комфортная прогулка или утренний совет: просьба появится вскоре, если её уже можно показывать. */
  const nudge = useCallback((): void => { setBoost(true); }, []);

  useEffect(() => {
    if (!history || history.disabled || !active) return;
    const due = Math.max(history.until, history.first + 86400000);
    const timer = setTimeout(() => setClock(Date.now()), Math.min(Math.max(due - Date.now(), 60000), 86400000));
    return () => clearTimeout(timer);
  }, [history, clock, active]);

  /** @returns {void} Засчитывает один фактический показ окна, а не готовность к показу. */
  const markShown = useCallback((): void => {
    if (shown.current || !latest.current) return;
    shown.current = true;
    if (latest.current.confirmationPending) return;
    void save({ ...latest.current, prompts: latest.current.prompts + 1, until: Date.now() + reviewDelay });
    trackEvent("review_prompt_shown");
  }, [save]);

  /** @param {boolean} disabled - Явное отключение пользователем. @returns {Promise<void>} Закрывает окно и сохраняет паузу в три дня. */
  const dismiss = useCallback(async (disabled = false): Promise<void> => {
    openingStore.current = false;
    leftForStore.current = false;
    setVisible(false);
    if (!latest.current) return;
    await save({ ...latest.current, disabled, confirmationPending: false, until: Date.now() + reviewDelay });
    trackEvent(disabled ? "review_reminders_disabled" : "review_prompt_later");
  }, [save]);

  /** @returns {Promise<void>} Сначала шторка оценки внутри приложения; если её нет — магазин, и только успешный переход разрешает «Уже оценил». */
  const rate = useCallback(async (): Promise<void> => {
    if (await launchInAppReview()) {
      setVisible(false);
      shown.current = false;
      if (latest.current) await save({ ...latest.current, storeOpened: true, confirmationPending: false, until: Date.now() + inAppReviewPause });
      trackEvent("review_inapp_completed");
      return;
    }
    openingStore.current = true;
    leftForStore.current = AppState.currentState !== "active";
    setConfirmationReady(false);
    try { await Linking.openURL(reviewUrl); }
    catch (error) {
      openingStore.current = false;
      leftForStore.current = false;
      setConfirmationReady(true);
      trackEvent("review_store_error");
      throw error;
    }
    setVisible(false);
    shown.current = false;
    if (latest.current) await save({ ...latest.current, storeOpened: true, confirmationPending: !latest.current.disabled, until: Date.now() + reviewDelay });
    trackEvent("review_store_opened");
  }, [save]);

  return { visible: visible && (!history?.confirmationPending || confirmationReady) && (successful || !!history?.confirmationPending) && ready && active && !history?.disabled, confirmation: history?.confirmationPending === true, disabled: history?.disabled === true, storeOpened: history?.storeOpened === true, dismiss, rate, markShown, nudge };
}
