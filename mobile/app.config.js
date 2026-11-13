/** @param {object} options - Статическая конфигурация Expo. @returns {object} Общая конфигурация с базовым путём для веб-публикации. */
module.exports = ({ config }) => {
  const store = process.env.EXPO_PUBLIC_APP_STORE || "rustore";
  if (!["rustore", "google-play"].includes(store)) throw new Error("Unknown EXPO_PUBLIC_APP_STORE");
  return {
    ...config,
    extra: { ...config.extra, distribution: store },
    plugins: [...config.plugins, "./plugins/withGooglePlayUpdates", "./plugins/withYandexAds"],
    android: {
      ...config.android,
      blockedPermissions: [...config.android.blockedPermissions, ...(store === "google-play" ? ["android.permission.REQUEST_INSTALL_PACKAGES"] : [])],
    },
    experiments: { ...config.experiments, baseUrl: process.env.ATMOS_WEB_BASE_PATH || "" },
  };
};
