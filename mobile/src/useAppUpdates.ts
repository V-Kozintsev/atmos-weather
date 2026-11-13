import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import config from "../app.json";
import { read, write } from "./storage";
import { log } from "./weather";
import { downloadUpdate, getUpdateInfo, installUpdate, listenForUpdates, updatesSupported, updateErrorCode, updateErrorReason, type AppUpdateInfo, type InstallState } from "./updatesClient";
import { isGooglePlay, storeName } from "./distribution";
import { shouldOfferUpdate, updateProgress, type DeferredUpdate } from "./updatesPolicy";
import { cachedReleaseNotes, fetchReleaseNotes, type ReleaseNotes } from "./releaseNotes";

export type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "downloaded" | "confirming" | "installing" | "attention" | "latest" | "unavailable" | "error";
export interface UpdateState { status: UpdateStatus; version?: number; progress?: number; bytesDownloaded?: number; totalBytes?: number; pending?: boolean; errorCode?: number; slow?: boolean; phase?: "download" | "install"; release?: ReleaseNotes; visible: boolean }
const deferredKey = "atmos-native-deferred-update";
const busyStatuses: UpdateStatus[] = ["checking", "downloading", "confirming", "installing"];
const activeStatuses: UpdateStatus[] = ["downloading", "confirming", "installing", "attention"];
const stalledAfter = 90_000;

/** @param {boolean} enabled - Настройки восстановлены, можно проверять обновления. @returns {object} Проверка, загрузка, установка и откладывание обновления через RuStore. */
export function useAppUpdates(enabled: boolean) {
  const [state, setState] = useState<UpdateState>({ status: "idle", visible: false });
  const alive = useRef(false);
  const running = useRef(false);
  const checking = useRef(false);
  const lastCheck = useRef(0);
  const lastEvent = useRef(0);
  const eventRevision = useRef(0);
  const actionRevision = useRef(0);
  const [release, setRelease] = useState<ReleaseNotes>();
  const latest = useRef(state);
  latest.current = state;

  /** @param {UpdateState} next - Безопасное состояние интерфейса. @returns {void} Обновляет состояние только у работающего экрана. */
  const publish = useCallback((next: UpdateState): void => {
    if (!alive.current) return;
    if (next.status !== latest.current.status && next.status !== "attention") lastEvent.current = Date.now();
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
    if (isGooglePlay && info.installStatus === 7) { publish({ status: "latest", visible: manual }); return; }
    if (isGooglePlay && info.installStatus === 6) {
      publish({ status: "available", version, visible: manual });
      await write(deferredKey, { version, until: Date.now() + 86400000 });
      return;
    }
    if (info.installStatus === 1) {
      if (running.current && ["confirming", "installing", "attention"].includes(latest.current.status)) {
        publish({ ...latest.current, phase: "install", visible: latest.current.visible || manual });
      } else publish({ status: "downloaded", version, visible: true });
      return;
    }
    if ([2, 5].includes(info.installStatus)) {
      const previous = latest.current;
      if (!lastEvent.current) lastEvent.current = Date.now();
      const stalled = previous.phase === "download" && Date.now() - lastEvent.current >= stalledAfter;
      const progressed = typeof info.bytesDownloaded === "number" && info.bytesDownloaded > (previous.bytesDownloaded ?? 0);
      if (progressed) lastEvent.current = Date.now();
      publish({ ...previous, status: stalled && !progressed ? "attention" : "downloading", phase: "download", version, progress: updateProgress(info.bytesDownloaded, info.totalBytesToDownload) ?? previous.progress, bytesDownloaded: info.bytesDownloaded ?? previous.bytesDownloaded, totalBytes: info.totalBytesToDownload ?? previous.totalBytes, pending: info.installStatus === 5, slow: Date.now() - lastEvent.current > 45_000, visible: manual || previous.visible || !activeStatuses.includes(previous.status) }); return;
    }
    if (info.installStatus === 4) {
      const stalled = latest.current.phase === "install" && Date.now() - lastEvent.current >= stalledAfter;
      publish({ status: stalled ? "attention" : "installing", phase: "install", version, visible: manual || latest.current.visible || !activeStatuses.includes(latest.current.status) }); return;
    }
    if (info.installStatus === 3) { publish({ status: "error", version, visible: true }); return; }
    if (isGooglePlay && info.updateAvailability === 3) {
      publish({ status: "available", version, visible: true }); return;
    }
    if (info.updateAvailability !== 2) {
      publish({ status: "attention", phase: latest.current.phase, version, visible: manual || latest.current.visible }); return;
    }
    if (running.current && activeStatuses.includes(latest.current.status)) {
      publish({ ...latest.current, status: "attention", version, visible: manual || latest.current.visible }); return;
    }
    const revision = eventRevision.current;
    const deferred = await read<DeferredUpdate | null>(deferredKey, null);
    if (alive.current && revision === eventRevision.current) publish({ status: "available", version, visible: manual || shouldOfferUpdate(version, config.expo.android.versionCode, deferred, Date.now()) });
  }, [publish]);

  /** @param {boolean} manual - Явная проверка в настройках. @param {boolean} reconcile - Сверка незавершённой операции без сброса прогресса. @returns {Promise<void>} Проверяет магазин без блокировки погоды и без параллельных запросов. */
  const check = useCallback(async (manual = false, reconcile = false): Promise<void> => {
    reconcile = reconcile || activeStatuses.includes(latest.current.status);
    if (!enabled || checking.current || (!reconcile && running.current)) return;
    if (!updatesSupported) { if (manual) publish({ status: "unavailable", visible: true }); return; }
    checking.current = true;
    lastCheck.current = Date.now();
    if (!reconcile) publish({ ...latest.current, status: "checking", visible: manual });
    log("update check started", { manual, store: storeName });
    const eventAtStart = eventRevision.current;
    try {
      const info = await getUpdateInfo();
      if (alive.current && eventRevision.current === eventAtStart) await applyInfo(info, manual);
    }
    catch (error) {
      const code = updateErrorCode(error);
      log("update check unavailable", { code, reason: updateErrorReason(error) });
      if (eventRevision.current === eventAtStart) {
        if (!reconcile) publish({ status: "unavailable", visible: manual, errorCode: code });
        else if (manual) publish({ ...latest.current, status: "attention", visible: true });
      }
    }
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
      const progressed = event.installStatus === 2 && typeof event.bytesDownloaded === "number" && event.bytesDownloaded > (previous.bytesDownloaded ?? 0);
      if (progressed) lastEvent.current = Date.now();
      if (event.installStatus === 1 && !(running.current && previous.phase === "install")) publish({ status: "downloaded", version: previous.version, visible: true });
      else if (event.installStatus === 2 || event.installStatus === 5) publish({ status: previous.status === "attention" && !progressed ? "attention" : "downloading", phase: "download", version: previous.version, progress: updateProgress(event.bytesDownloaded, event.totalBytesToDownload), bytesDownloaded: event.bytesDownloaded, totalBytes: event.totalBytesToDownload, pending: event.installStatus === 5, visible: previous.visible });
      else if (event.installStatus === 4) publish({ status: previous.status === "attention" && previous.phase === "install" ? "attention" : "installing", phase: "install", version: previous.version, visible: previous.visible });
      else if (event.installStatus === 3) { log("update download failed", { code: event.installErrorCode }); publish({ status: "error", version: previous.version, errorCode: event.installErrorCode, visible: true }); }
      else if (isGooglePlay && event.installStatus === 6) {
        publish({ status: "available", version: previous.version, visible: false });
        void write(deferredKey, { version: previous.version, until: Date.now() + 86400000 });
      }
      else if (isGooglePlay && event.installStatus === 7) publish({ status: "latest", visible: false });
      else if (!isGooglePlay && event.installStatus === 0 && activeStatuses.includes(previous.status)) publish({ ...previous, status: "attention", visible: true });
    }
    let unsubscribe: (() => void) | undefined;
    try { unsubscribe = listenForUpdates(onInstallState); }
    catch { log("update listener unavailable"); }
    void check();
    /** @returns {void} Проверяет обновление в открытом приложении; после сбоя сети повторяет раньше. */
    function checkWhenActive(): void {
      const retryAfter = latest.current.status === "unavailable" ? 60_000 : 15 * 60_000;
      const inProgress = activeStatuses.includes(latest.current.status);
      if (AppState.currentState === "active" && inProgress && lastEvent.current && Date.now() - lastEvent.current >= stalledAfter && latest.current.status !== "attention") {
        publish({ ...latest.current, status: "attention", visible: true });
      }
      if (AppState.currentState === "active" && (Date.now() - lastCheck.current >= (inProgress ? 20_000 : retryAfter))) void check(false, inProgress);
    }
    const subscription = AppState.addEventListener("change", (phase) => {
      if (phase === "active" && activeStatuses.includes(latest.current.status)) void check(false, true);
      else if (phase === "active") checkWhenActive();
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
    if (running.current || checking.current || busyStatuses.includes(latest.current.status) || latest.current.status === "attention") return;
    const previous = latest.current;
    running.current = true;
    const action = ++actionRevision.current;
    publish({ ...previous, status: "checking", visible: true });
    try {
      const info = await getUpdateInfo();
      if (!alive.current || action !== actionRevision.current) return;
      if (info.availableVersionCode <= config.expo.android.versionCode || info.packageName !== config.expo.android.package || !Number.isInteger(info.availableVersionCode)) { await applyInfo(info, true); return; }
      if (info.installStatus === 1) {
        // Сверяем наличие APK перед установкой: сохранённый статус мог устареть после отмены Android.
        publish({ status: "confirming", phase: "install", version: info.availableVersionCode, visible: true });
        lastEvent.current = Date.now();
        const eventAtStart = eventRevision.current;
        const installed = await installUpdate();
        if (!alive.current || eventRevision.current !== eventAtStart) return;
        if (!installed) publish({ status: "downloaded", version: info.availableVersionCode, visible: true });
        await check(false, true);
      } else {
        publish({ ...previous, status: "checking", visible: true });
        if ([2, 4, 5].includes(info.installStatus)) { await applyInfo(info, true); return; }
        if ((info.updateAvailability !== 2 && !(isGooglePlay && info.updateAvailability === 3)) || info.availableVersionCode <= config.expo.android.versionCode || info.packageName !== config.expo.android.package) { await applyInfo(info, true); return; }
        lastEvent.current = Date.now();
        publish({ status: "downloading", phase: "download", version: info.availableVersionCode, pending: true, visible: true });
        const result = await downloadUpdate();
        if (!alive.current || action !== actionRevision.current) return;
        if (result === 0) {
          const current = latest.current;
          if (!["downloaded", "installing", "latest"].includes(current.status)) { publish({ status: "available", version: current.version, visible: false }); await write(deferredKey, { version: current.version, until: Date.now() + 86400000 }); }
        } else if (result !== -1 && latest.current.status === "downloading") publish({ status: "unavailable", visible: true });
        else if (result === -1) await check(false, true);
      }
    } catch (error) {
      const code = updateErrorCode(error);
      log("update action failed", { code, reason: updateErrorReason(error), store: storeName });
      if (isGooglePlay && alive.current) {
        if (["downloaded", "installing", "latest"].includes(latest.current.status)) return;
        // A delayed consent callback can fail after Play has already moved on to download or install.
        const revision = eventRevision.current;
        try {
          const info = await getUpdateInfo();
          if (revision !== eventRevision.current || !alive.current) return;
          if ([1, 2, 4, 5, 6, 7].includes(info.installStatus) || info.availableVersionCode <= config.expo.android.versionCode) { await applyInfo(info, false); return; }
        } catch { log("update recovery unavailable", { store: storeName }); }
        if (revision !== eventRevision.current || !alive.current) return;
      }
      if (latest.current.status !== "error") publish({ status: "error", version: latest.current.version ?? previous.version, errorCode: code, visible: true });
    }
    finally { running.current = false; }
  }, [applyInfo, check, publish]);

  return { state: { ...state, release: release?.versionCode === state.version ? release : undefined }, check, update, dismiss, busy: busyStatuses.includes(state.status) };
}
