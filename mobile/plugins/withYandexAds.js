const { withAppBuildGradle } = require("expo/config-plugins");

/** @param {object} config - Конфигурация Expo. @returns {object} Фиксирует нативный SDK независимо от версии React Native-обёртки. */
module.exports = function withYandexAds(config) {
  return withAppBuildGradle(config, (mod) => {
    const marker = "// Yandex Mobile Ads SDK version";
    const block = `${marker}
dependencies {
    implementation('com.yandex.android:mobileads:8.6.0') {
        version { strictly '8.6.0' }
    }
    implementation('io.appmetrica.analytics:analytics:8.6.0') {
        version { strictly '8.6.0' }
    }
}
`;
    const previous = /\/\/ Yandex Mobile Ads SDK version\n[\s\S]*?\n}\n/;
    mod.modResults.contents = previous.test(mod.modResults.contents)
      ? mod.modResults.contents.replace(previous, block)
      : `${mod.modResults.contents}\n${block}`;
    return mod;
  });
};
