import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import config from "../app.json";
import { read, write } from "./storage";
import { log } from "./weather";
import { downloadUpdate, getUpdateInfo, installUpdate, listenForUpdates, updatesSupported, type AppUpdateInfo, type InstallState } from "./updatesClient";
import { shouldOfferUpdate, updateProgress, type DeferredUpdate } from "./updatesPolicy";

export type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "downloaded" | "installing" | "latest" | "unavailable" | "error";
export interface UpdateState { status: UpdateStatus; version?: number; progress?: number; visible: boolean }
const deferredKey = "atmos-native-deferred-update";
const busyStatuses: UpdateStatus[] = ["checking", "downloading", "installing"];

/** @param {boolean} enabled - Настройки восстановлены, можно проверять обновления. @returns {object} Проверка, загрузка, установка и откладывание обновления через RuStore. */
export function useAppUpdates(enabled: boolean) {
  const [state, setState] = useState<UpdateState>({ status: "idle", visible: false });
  const alive = useRef(false);
  const running = useRef(false);
  const lastCheck = useRef(0);
  const latest = useRef(state);
  latest.current = state;

  /** @param {UpdateState} next - Безопасное состояние интерфейса. @returns {void} Обновляет состояние только у работающего экрана. */
  const publish = useCallback((next: UpdateState): void => {
    if (!alive.current) return;
    latest.current = next;
    setState(next);
    log("update state", { status: next.status, version: next.version, progress: next.progress });
  }, []);

  /** @param {AppUpdateInfo} info - Сведения RuStore. @param {boolean} manual - Проверка по нажатию, без суточного ограничения. @returns {Promise<void>} Восстанавливает незавершённую загрузку или предлагает новую версию. */
  const applyInfo = useCallback(async (info: AppUpdateInfo, manual: boolean): Promise<void> => {
    const version = info.availableVersionCode;
    if (info.packageName !== config.expo.android.package || version <= config.expo.android.versionCode) {
      publish({ status: "latest", visible: manual }); return;
    }
    if (info.installStatus === 1) { publish({ status: "downloaded", version, visible: true }); return; }
    if ([2, 5].includes(info.installStatus)) { publish({ status: "downloading", version, visible: true }); return; }
    if (info.installStatus === 4) { publish({ status: "installing", version, visible: true }); return; }
    if (info.updateAvailability !== 2) { publish({ status: "latest", visible: manual }); return; }
    const deferred = await read<DeferredUpdate | null>(deferredKey, null);
    publish({ status: "available", version, visible: manual || shouldOfferUpdate(version, config.expo.android.versionCode, deferred, Date.now()) });
  }, [publish]);

  /** @param {boolean} manual - Явная проверка в настройках. @returns {Promise<void>} Проверяет магазин без блокировки погоды и без параллельных запросов. */
  const check = useCallback(async (manual = false): Promise<void> => {
    if (!enabled || running.current || busyStatuses.includes(latest.current.status)) return;
    if (!updatesSupported) { if (manual) publish({ status: "unavailable", visible: true }); return; }
    running.current = true;
    lastCheck.current = Date.now();
    publish({ ...latest.current, status: "checking", visible: manual });
    log("update check started", { manual });
    try { await applyInfo(await getUpdateInfo(), manual); }
    catch { log("update check unavailable"); publish({ status: "unavailable", visible: manual }); }
    finally { running.current = false; }
  }, [enabled, applyInfo, publish]);

  useEffect(() => {
    alive.current = true;
    if (!enabled || !updatesSupported) return () => { alive.current = false; };
    log("update sdk initialized");
    /** @param {InstallState} event - Безопасные статусы и счётчики официального SDK. @returns {void} Отображает загрузку без персональных данных. */
    function onInstallState(event: InstallState): void {
      const previous = latest.current;
      if (event.installStatus === 1) publish({ status: "downloaded", version: previous.version, visible: true });
      else if (event.installStatus === 2 || event.installStatus === 5) publish({ status: "downloading", version: previous.version, progress: updateProgress(event.bytesDownloaded, event.totalBytesToDownload), visible: true });
      else if (event.installStatus === 4) publish({ status: "installing", version: previous.version, visible: true });
      else if (event.installStatus === 3) { log("update download failed", { code: event.installErrorCode }); publish({ status: "error", version: previous.version, visible: true }); }
      else if (event.installStatus === 0 && previous.status === "downloading") publish({ status: "available", version: previous.version, visible: false });
    }
    let unsubscribe: (() => void) | undefined;
    try { unsubscribe = listenForUpdates(onInstallState); }
    catch { log("update listener unavailable"); }
    void check();
    /** @returns {void} Проверяет обновление в открытом приложении; после сбоя сети повторяет раньше. */
    function checkWhenActive(): void {
      const retryAfter = latest.current.status === "unavailable" ? 60_000 : 15 * 60_000;
      if (AppState.currentState === "active" && (Date.now() - lastCheck.current >= retryAfter || ["downloading", "installing"].includes(latest.current.status))) {
        if (["downloading", "installing"].includes(latest.current.status)) latest.current = { ...latest.current, status: "idle" };
        void check();
      }
    }
    const subscription = AppState.addEventListener("change", (phase) => {
      if (phase === "active") checkWhenActive();
    });
    const timer = setInterval(() => {
      if (!["downloading", "installing"].includes(latest.current.status)) checkWhenActive();
    }, 60_000);
    return () => { alive.current = false; clearInterval(timer); unsubscribe?.(); subscription.remove(); };
  }, [enabled, check, publish]);

  /** @returns {Promise<void>} Откладывает предложение той же версии на сутки, сохраняя доступ к ручной проверке. */
  const dismiss = useCallback(async (): Promise<void> => {
    const previous = latest.current;
    publish({ ...previous, visible: false });
    if (previous.status === "available" && previous.version) await write(deferredKey, { version: previous.version, until: Date.now() + 86400000 });
  }, [publish]);

  /** @returns {Promise<void>} По нажатию запускает подтверждение RuStore или установку уже скачанной версии. */
  const update = useCallback(async (): Promise<void> => {
    if (running.current || busyStatuses.includes(latest.current.status)) return;
    const previous = latest.current;
    running.current = true;
    try {
      if (previous.status === "downloaded") {
        publish({ ...previous, status: "installing", visible: true });
        await installUpdate();
      } else {
        publish({ ...previous, status: "checking", visible: true });
        const info = await getUpdateInfo();
        if (info.installStatus === 1) { publish({ status: "downloaded", version: info.availableVersionCode, visible: true }); return; }
        if (info.updateAvailability !== 2 || info.availableVersionCode <= config.expo.android.versionCode || info.packageName !== config.expo.android.package) { await applyInfo(info, true); return; }
        publish({ status: "downloading", version: info.availableVersionCode, visible: true });
        const result = await downloadUpdate();
        if (result === 0) {
          const current = latest.current;
          if (current.status === "downloading") { publish({ status: "available", version: current.version, visible: false }); await write(deferredKey, { version: current.version, until: Date.now() + 86400000 }); }
        } else if (result !== -1) publish({ status: "unavailable", visible: true });
      }
    } catch { log("update action failed"); publish({ status: "error", version: previous.version, visible: true }); }
    finally { running.current = false; }
  }, [applyInfo, publish]);

  return { state, check, update, dismiss, busy: busyStatuses.includes(state.status) };
}
