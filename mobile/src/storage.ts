import AsyncStorage from "@react-native-async-storage/async-storage";

/** @param {string} key - Ключ данных. @param {T} fallback - Значение при отсутствии или повреждении данных. @returns {Promise<T>} Настройки устройства. */
export async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    return JSON.parse((await AsyncStorage.getItem(key)) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

/** @param {string} key - Ключ данных. @param {unknown} value - Сохраняемые данные. @param {boolean} required - Сообщить вызывающему коду о сбое обязательной записи. @returns {Promise<void>} Завершение сохранения. */
export async function write(key: string, value: unknown, required = false): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("[Atmos Mobile] storage unavailable");
    if (required) throw error;
  }
}
