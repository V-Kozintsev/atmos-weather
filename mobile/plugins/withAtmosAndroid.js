const { withAppBuildGradle, withProjectBuildGradle, withAndroidManifest, withAndroidStyles, withAndroidColors, withDangerousMod } = require("expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

// Белый силуэт футболки для строки состояния: Android окрашивает значок уведомления сам.
const notificationIcon = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
    <path android:fillColor="#FFFFFFFF" android:pathData="M8,4L4,6L2,11L6,13L8,10L8,20L16,20L16,10L18,13L22,11L20,6L16,4C15,7 9,7 8,4Z" />
</vector>
`;

/** @param {object} config - Конфигурация Expo. @returns {object} Android с отдельным тестовым приложением и обязательной подписью релиза. */
module.exports = function withAtmosAndroid(config) {
  config = withAndroidColors(config, (mod) => {
    const colors = mod.modResults.resources.color || [];
    const own = { splashscreen_background: "#eef1eb", notification_icon_color: "#163c49" };
    mod.modResults.resources.color = [...colors.filter((entry) => !(entry.$.name in own)), ...Object.entries(own).map(([name, value]) => ({ $: { name }, _: value }))];
    return mod;
  });
  config = withDangerousMod(config, ["android", async (mod) => {
    const drawable = path.join(mod.modRequest.platformProjectRoot, "app/src/main/res/drawable");
    fs.mkdirSync(drawable, { recursive: true });
    fs.writeFileSync(path.join(drawable, "notification_icon.xml"), notificationIcon);
    return mod;
  }]);
  config = withAndroidStyles(config, (mod) => {
    for (const style of mod.modResults.resources.style || []) {
      if (!["AppTheme", "Theme.App.SplashScreen"].includes(style.$.name)) continue;
      const items = style.item || [];
      // A bitmap as windowBackground is stretched by Android before React draws its first frame.
      style.item = [...items.filter((item) => item.$.name !== "android:windowBackground"), { $: { name: "android:windowBackground" }, _: "@color/splashscreen_background" }];
    }
    return mod;
  });
  config = withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application[0];
    const own = [
      { $: { "android:name": "com.yandex.mobile.ads.AUTOMATIC_SDK_INITIALIZATION", "android:value": "false" } },
      { $: { "android:name": "expo.modules.notifications.default_notification_icon", "android:resource": "@drawable/notification_icon" } },
      { $: { "android:name": "expo.modules.notifications.default_notification_color", "android:resource": "@color/notification_icon_color" } },
    ];
    const names = own.map((entry) => entry.$["android:name"]);
    const metadata = application["meta-data"] || [];
    application["meta-data"] = [...metadata.filter((entry) => !names.includes(entry.$["android:name"])), ...own];
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
