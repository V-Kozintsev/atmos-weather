import { NativeEventEmitter, NativeModules, Platform, type NativeModule } from "react-native";
import type { AppUpdateInfo as RuStoreUpdateInfo, InstallState as RuStoreInstallState } from "react-native-rustore-update/src/types";
import { isGooglePlay } from "./distribution";
export type InstallState = Omit<RuStoreInstallState, "installStatus"> & { installStatus?: NonNullable<RuStoreInstallState["installStatus"]> | 6 | 7 };
export type AppUpdateInfo = Omit<RuStoreUpdateInfo, "installStatus"> & { installStatus: RuStoreUpdateInfo["installStatus"] | 6 | 7; bytesDownloaded?: number; totalBytesToDownload?: number };

interface UpdateSdk extends NativeModule {
  init(): void;
  getAppUpdateInfo(): Promise<AppUpdateInfo>;
  download(): Promise<number>;
  silent(): Promise<number>;
  completeUpdate(type: number): Promise<boolean>;
}
// Не загружаем JS-обёртку SDK: она создаёт NativeEventEmitter даже в браузере и Expo Go.
const sdk = Platform.OS === "android" ? NativeModules[isGooglePlay ? "GooglePlayUpdate" : "RustoreUpdate"] as UpdateSdk | undefined : undefined;
let initialized = false;
export const updatesSupported = !!sdk;

/** @param {unknown} error - Ответ моста Android. @returns {number | undefined} Числовой код без передачи текста SDK или персональных данных. */
export function updateErrorCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const code = Number((error as { code?: unknown }).code);
  return Number.isInteger(code) ? code : undefined;
}

/** @param {unknown} error - Ошибка моста или таймера. @returns {string | undefined} Только известная техническая причина без произвольного текста SDK. */
export function updateErrorReason(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return;
  const value = "code" in error ? error.code : error instanceof Error ? error.message : undefined;
  return typeof value === "string" && ["UPDATE_BUSY", "UPDATE_UNAVAILABLE", "UPDATE_FAILED", "UPDATE_FLOW_FAILED", "UPDATE_INTERRUPTED", "UPDATE_TIMEOUT", "UPDATE_INSTALL_FAILED"].includes(value) ? value : undefined;
}

/** @returns {UpdateSdk} Инициализированный официальный нативный SDK или ошибка неподдерживаемой среды. */
function client(): UpdateSdk {
  if (!sdk) throw new Error("UPDATE_UNAVAILABLE");
  if (!initialized) { sdk.init(); initialized = true; }
  return sdk;
}

/** @returns {Promise<AppUpdateInfo>} Актуальные сведения; запрос ограничен 15 секундами. */
export async function getUpdateInfo(): Promise<AppUpdateInfo> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([client().getAppUpdateInfo(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("UPDATE_TIMEOUT")), 15000); })]);
  } finally { clearTimeout(timer); }
}

/** @param {(state: InstallState) => void} listener - Состояние фоновой загрузки и установки. @returns {() => void} Отписка только от нашего слушателя. */
export function listenForUpdates(listener: (state: InstallState) => void): () => void {
  const subscription = new NativeEventEmitter(client()).addListener("InstallStateUpdate", listener);
  /** @returns {void} Освобождает слушатель при закрытии приложения. */
  function unsubscribe(): void { subscription.remove(); }
  return unsubscribe;
}

/** @returns {Promise<number>} Запускает официальный диалог магазина, который запрашивает подтверждение и загружает обновление без ручного перехода в каталог. */
export function downloadUpdate(): Promise<number> { return isGooglePlay ? client().silent() : client().download(); }

/** @returns {Promise<boolean>} Устанавливает скачанный APK в отложенном сценарии. */
export function installUpdate(): Promise<boolean> { return client().completeUpdate(0); }
