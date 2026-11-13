export const isGooglePlay = process.env.EXPO_PUBLIC_APP_STORE === "google-play";
export const storeName = isGooglePlay ? "Google Play" : "RuStore";
export const storeUrl = isGooglePlay
  ? "https://play.google.com/store/apps/details?id=ru.puskweb.atmos"
  : "https://www.rustore.ru/catalog/app/ru.puskweb.atmos";
