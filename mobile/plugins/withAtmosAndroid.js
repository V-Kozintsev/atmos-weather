const { withAppBuildGradle } = require("expo/config-plugins");

/** @param {object} config - Конфигурация Expo. @returns {object} Android с отдельным тестовым приложением и обязательной подписью релиза. */
module.exports = function withAtmosAndroid(config) {
  return withAppBuildGradle(config, (mod) => {
    const marker = "// Atmos Android release configuration";
    if (!mod.modResults.contents.includes(marker)) {
      mod.modResults.contents += `
${marker}
def atmosSigning = ["ATMOS_KEYSTORE", "ATMOS_STORE_PASSWORD", "ATMOS_KEY_ALIAS", "ATMOS_KEY_PASSWORD"]
def atmosReleaseRequested = gradle.startParameter.taskNames.any { it.toLowerCase().contains("release") }
if (atmosReleaseRequested && atmosSigning.any { !System.getenv(it) }) {
    throw new GradleException("Atmos release requires the existing signing key via ATMOS_KEYSTORE, ATMOS_STORE_PASSWORD, ATMOS_KEY_ALIAS and ATMOS_KEY_PASSWORD")
}
android {
    externalNativeBuild {
        cmake { buildStagingDirectory file(System.getProperty("java.io.tmpdir") + "/atmos-native-cxx") }
    }
    signingConfigs {
        atmosRelease {
            if (System.getenv("ATMOS_KEYSTORE")) {
                storeFile file(System.getenv("ATMOS_KEYSTORE"))
                storePassword System.getenv("ATMOS_STORE_PASSWORD")
                keyAlias System.getenv("ATMOS_KEY_ALIAS")
                keyPassword System.getenv("ATMOS_KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        debug { applicationIdSuffix ".dev"; versionNameSuffix "-dev" }
        release { signingConfig signingConfigs.atmosRelease }
    }
}
`;
    }
    return mod;
  });
};
