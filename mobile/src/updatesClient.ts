import { NativeEventEmitter, NativeModules, Platform, type NativeModule } from "react-native";
import type { AppUpdateInfo, InstallState } from "react-native-rustore-update/src/types";
export type { AppUpdateInfo, InstallState };

interface UpdateSdk extends NativeModule {
  init(): void;
  getAppUpdateInfo(): Promise<AppUpdateInfo>;
  download(): Promise<number>;
  completeUpdate(type: number): Promise<boolean>;
}
// Не загружаем JS-обёртку SDK: она создаёт NativeEventEmitter даже в браузере и Expo Go.
const sdk = Platform.OS === "android" ? NativeModules.RustoreUpdate as UpdateSdk | undefined : undefined;
let initialized = false;
export const updatesSupported = !!sdk;

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

/** @returns {Promise<number>} Запускает отложенное обновление с официальным подтверждением RuStore. */
export function downloadUpdate(): Promise<number> { return client().download(); }

/** @returns {Promise<boolean>} Устанавливает скачанный APK в отложенном сценарии. */
export function installUpdate(): Promise<boolean> { return client().completeUpdate(0); }
