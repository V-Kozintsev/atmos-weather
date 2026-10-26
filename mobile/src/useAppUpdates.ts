import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import config from "../app.json";
import { read, write } from "./storage";
import { log } from "./weather";
import { downloadUpdate, getUpdateInfo, installUpdate, listenForUpdates, updatesSupported, type AppUpdateInfo, type InstallState } from "./updatesClient";
import { shouldOfferUpdate, updateProgress, type DeferredUpdate } from "./updatesPolicy";
import { cachedReleaseNotes, fetchReleaseNotes, type ReleaseNotes } from "./releaseNotes";

export type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "downloaded" | "installing" | "latest" | "unavailable" | "error";
export interface UpdateState { status: UpdateStatus; version?: number; progress?: number; bytesDownloaded?: number; totalBytes?: number; pending?: boolean; errorCode?: number; slow?: boolean; release?: ReleaseNotes; visible: boolean }
const deferredKey = "atmos-native-deferred-update";
const busyStatuses: UpdateStatus[] = ["checking", "downloading", "installing"];

/** @param {boolean} enabled - Настройки восстановлены, можно проверять обновления. @returns {object} Проверка, загрузка, установка и откладывание обновления через RuStore. */
export function useAppUpdates(enabled: boolean) {
  const [state, setState] = useState<UpdateState>({ status: "idle", visible: false });
  const alive = useRef(false);
  const running = useRef(false);
  const checking = useRef(false);
  const lastCheck = useRef(0);
  const lastEvent = useRef(0);
  const eventRevision = useRef(0);
  const [release, setRelease] = useState<ReleaseNotes>();
  const latest = useRef(state);
  latest.current = state;

  /** @param {UpdateState} next - Безопасное состояние интерфейса. @returns {void} Обновляет состояние только у работающего экрана. */
  const publish = useCallback((next: UpdateState): void => {
    if (!alive.current) return;
    latest.current = next;
    setState(next);
    log("update state", { status: next.status, version: next.version, progress: next.progress, code: next.errorCode });
  }, []);

  /** @param {AppUpdateInfo} info - Сведения RuStore. @param {boolean} manual - Проверка по нажатию, без суточного ограничения. @returns {Promise<void>} Восстанавливает незавершённую загрузку или предлагает новую версию. */
  const applyInfo = useCallback(async (info: AppUpdateInfo, manual: boolean): Promise<void> => {
    const version = info.availableVersionCode;
    if (info.packageName !== config.expo.android.package || !Number.isInteger(version)) {
      publish({ status: "unavailable", visible: manual }); return;
    }
    if (version <= config.expo.android.versionCode) {
      publish({ status: "latest", visible: manual }); return;
    }
    if (info.installStatus === 1) { publish({ status: "downloaded", version, visible: true }); return; }
    if ([2, 5].includes(info.installStatus)) {
      const previous = latest.current;
      if (!lastEvent.current) lastEvent.current = Date.now();
      publish({ ...previous, status: "downloading", version, pending: info.installStatus === 5, slow: Date.now() - lastEvent.current > 45_000, visible: previous.status === "downloading" ? previous.visible : true }); return;
    }
    if (info.installStatus === 4) { publish({ status: "installing", version, visible: latest.current.visible, slow: Date.now() - lastEvent.current > 45_000 }); return; }
    if (info.installStatus === 3) { publish({ status: "error", version, visible: true }); return; }
    if (info.updateAvailability !== 2) { publish({ status: "latest", visible: manual }); return; }
    const deferred = await read<DeferredUpdate | null>(deferredKey, null);
    publish({ status: "available", version, visible: manual || shouldOfferUpdate(version, config.expo.android.versionCode, deferred, Date.now()) });
  }, [publish]);

  /** @param {boolean} manual - Явная проверка в настройках. @param {boolean} reconcile - Сверка незавершённой операции без сброса прогресса. @returns {Promise<void>} Проверяет магазин без блокировки погоды и без параллельных запросов. */
  const check = useCallback(async (manual = false, reconcile = false): Promise<void> => {
    if (!enabled || checking.current || (!reconcile && (running.current || busyStatuses.includes(latest.current.status)))) return;
    if (!updatesSupported) { if (manual) publish({ status: "unavailable", visible: true }); return; }
    checking.current = true;
    lastCheck.current = Date.now();
    if (!reconcile) publish({ ...latest.current, status: "checking", visible: manual });
    log("update check started", { manual });
    const eventAtStart = eventRevision.current;
    try {
      const info = await getUpdateInfo();
      if (!reconcile || eventRevision.current === eventAtStart) await applyInfo(info, manual);
    }
    catch { log("update check unavailable"); if (!reconcile) publish({ status: "unavailable", visible: manual }); }
    finally { checking.current = false; }
  }, [enabled, applyInfo, publish]);

  useEffect(() => {
    alive.current = true;
    if (!enabled || !updatesSupported) return () => { alive.current = false; };
    log("update sdk initialized");
    /** @param {InstallState} event - Безопасные статусы и счётчики официального SDK. @returns {void} Отображает загрузку без персональных данных. */
    function onInstallState(event: InstallState): void {
      if (event.packageName && event.packageName !== config.expo.android.package) return;
      const previous = latest.current;
      if (!previous.version) return;
      eventRevision.current += 1;
      lastEvent.current = Date.now();
      if (event.installStatus === 1) publish({ status: "downloaded", version: previous.version, visible: true });
      else if (event.installStatus === 2 || event.installStatus === 5) publish({ status: "downloading", version: previous.version, progress: updateProgress(event.bytesDownloaded, event.totalBytesToDownload), bytesDownloaded: event.bytesDownloaded, totalBytes: event.totalBytesToDownload, pending: event.installStatus === 5, visible: previous.visible });
      else if (event.installStatus === 4) publish({ status: "installing", version: previous.version, visible: previous.visible });
      else if (event.installStatus === 3) { log("update download failed", { code: event.installErrorCode }); publish({ status: "error", version: previous.version, errorCode: event.installErrorCode, visible: true }); }
      else if (event.installStatus === 0 && previous.status === "downloading") publish({ status: "available", version: previous.version, visible: false });
    }
    let unsubscribe: (() => void) | undefined;
    try { unsubscribe = listenForUpdates(onInstallState); }
    catch { log("update listener unavailable"); }
    void check();
    /** @returns {void} Проверяет обновление в открытом приложении; после сбоя сети повторяет раньше. */
    function checkWhenActive(): void {
      const retryAfter = latest.current.status === "unavailable" ? 60_000 : 15 * 60_000;
      const inProgress = ["downloading", "installing"].includes(latest.current.status);
      if (AppState.currentState === "active" && (Date.now() - lastCheck.current >= (inProgress ? 20_000 : retryAfter))) void check(false, inProgress);
    }
    const subscription = AppState.addEventListener("change", (phase) => {
      if (phase === "active") checkWhenActive();
    });
    const timer = setInterval(checkWhenActive, 20_000);
    return () => { alive.current = false; clearInterval(timer); unsubscribe?.(); subscription.remove(); };
  }, [enabled, check, publish]);

  useEffect(() => {
    setRelease(undefined);
    if (!state.version) return;
    const version = state.version;
    const controller = new AbortController();
    /** @returns {Promise<void>} Подставляет кеш и обновляет тексты отдельно от скачивания APK. */
    async function loadNotes(): Promise<void> {
      const cached = await cachedReleaseNotes(version);
      if (!controller.signal.aborted) setRelease(cached);
      const fresh = await fetchReleaseNotes(version, controller.signal);
      if (fresh && !controller.signal.aborted) setRelease(fresh);
    }
    void loadNotes();
    return () => controller.abort();
  }, [state.version]);

  /** @returns {Promise<void>} Откладывает предложение той же версии на сутки, сохраняя доступ к ручной проверке. */
  const dismiss = useCallback(async (): Promise<void> => {
    const previous = latest.current;
    publish({ ...previous, visible: false });
    if (previous.status === "available" && previous.version) await write(deferredKey, { version: previous.version, until: Date.now() + 86400000 });
  }, [publish]);

  /** @returns {Promise<void>} По нажатию запускает подтверждение RuStore или установку уже скачанной версии. */
  const update = useCallback(async (): Promise<void> => {
    if (running.current || checking.current || busyStatuses.includes(latest.current.status)) return;
    const previous = latest.current;
    running.current = true;
    try {
      const info = await getUpdateInfo();
      if (info.availableVersionCode <= config.expo.android.versionCode || info.packageName !== config.expo.android.package || !Number.isInteger(info.availableVersionCode)) { await applyInfo(info, true); return; }
      if (info.installStatus === 1) {
        // Сверяем наличие APK перед установкой: сохранённый статус мог устареть после отмены Android.
        publish({ status: "installing", version: info.availableVersionCode, visible: true });
        lastEvent.current = Date.now();
        if (!await installUpdate()) throw new Error("UPDATE_INSTALL_FAILED");
      } else {
        publish({ ...previous, status: "checking", visible: true });
        if ([2, 4, 5].includes(info.installStatus)) { await applyInfo(info, true); return; }
        if (info.updateAvailability !== 2 || info.availableVersionCode <= config.expo.android.versionCode || info.packageName !== config.expo.android.package) { await applyInfo(info, true); return; }
        lastEvent.current = Date.now();
        publish({ status: "downloading", version: info.availableVersionCode, pending: true, visible: true });
        const result = await downloadUpdate();
        if (result === 0) {
          const current = latest.current;
          if (current.status === "downloading") { publish({ status: "available", version: current.version, visible: false }); await write(deferredKey, { version: current.version, until: Date.now() + 86400000 }); }
        } else if (result !== -1) publish({ status: "unavailable", visible: true });
      }
    } catch { log("update action failed"); publish({ status: "error", version: previous.version, visible: true }); }
    finally { running.current = false; }
  }, [applyInfo, publish]);

  return { state: { ...state, release: release?.versionCode === state.version ? release : undefined }, check, update, dismiss, busy: busyStatuses.includes(state.status) };
}
