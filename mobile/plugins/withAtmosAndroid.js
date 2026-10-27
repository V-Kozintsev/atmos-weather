const { withAppBuildGradle, withProjectBuildGradle, withAndroidManifest } = require("expo/config-plugins");

/** @param {object} config - Конфигурация Expo. @returns {object} Android с отдельным тестовым приложением и обязательной подписью релиза. */
module.exports = function withAtmosAndroid(config) {
  config = withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application[0];
    const key = "com.yandex.mobile.ads.AUTOMATIC_SDK_INITIALIZATION";
    const metadata = application["meta-data"] || [];
    application["meta-data"] = [...metadata.filter((entry) => entry.$["android:name"] !== key), { $: { "android:name": key, "android:value": "false" } }];
    return mod;
  });
  config = withProjectBuildGradle(config, (mod) => {
    const repository = "https://nexus-external.rustore.ru/repository/maven-rustore-exposed";
    if (!mod.modResults.contents.includes(repository)) {
      mod.modResults.contents += `
allprojects {
    repositories {
        maven {
            url '${repository}'
            content { includeGroupByRegex 'ru[.]rustore[.].*' }
        }
    }
}
`;
    }
    return mod;
  });
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
    const splitsMarker = "// Atmos device-specific APKs";
    if (!mod.modResults.contents.includes(splitsMarker)) {
      mod.modResults.contents += `
${splitsMarker}
if ((findProperty('atmosSplitApks') ?: 'false').toBoolean()) {
    android {
        splits {
            abi {
                enable true
                reset()
                include 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
                universalApk false
            }
        }
    }
}
`;
    }
    return mod;
  });
};
