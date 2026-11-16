import { NativeModules } from "react-native";
import * as StoreReview from "expo-store-review";
import { isGooglePlay } from "./distribution";
import { log } from "./weather";

interface RuStoreReview { prepare(): Promise<boolean>; launch(): Promise<string> }
const rustore = NativeModules.RuStoreReview as RuStoreReview | undefined;

/** @returns {Promise<void>} Для RuStore заранее получает разрешение на шторку, чтобы она открылась без задержки. */
export async function prepareInAppReview(): Promise<void> {
  if (isGooglePlay || !rustore) return;
  try { await rustore.prepare(); } catch { log("review prepare skipped"); }
}

/** @returns {Promise<boolean>} Показана ли шторка оценки внутри приложения; false — открыть страницу магазина. */
export async function launchInAppReview(): Promise<boolean> {
  try {
    if (isGooglePlay) {
      if (!(await StoreReview.isAvailableAsync())) return false;
      await StoreReview.requestReview();
      return true;
    }
    if (!rustore) return false;
    return (await rustore.launch()) === "completed";
  } catch {
    log("in-app review unavailable");
    return false;
  }
}
