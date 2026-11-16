const { withAppBuildGradle, withMainApplication, withDangerousMod } = require("expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");

// Версия совпадает с ru.rustore.sdk:appupdate из react-native-rustore-update: общий core 10.5.0.
const dependency = 'implementation("ru.rustore.sdk:review:10.5.1")';

/** @param {object} config - Конфигурация сборки. @returns {object} Подключает официальный RuStore Review SDK только для сборки RuStore. */
module.exports = function withRuStoreReview(config) {
  const rustore = (process.env.EXPO_PUBLIC_APP_STORE || "rustore") === "rustore";
  config = withAppBuildGradle(config, (mod) => {
    mod.modResults.contents = mod.modResults.contents.replace(/\n?dependencies \{ implementation\("ru\.rustore\.sdk:review:[^"]+"\) \}\n?/g, "\n");
    if (rustore) mod.modResults.contents += `\ndependencies { ${dependency} }\n`;
    return mod;
  });
  config = withMainApplication(config, (mod) => {
    const anchor = "PackageList(this).packages.apply {";
    if (!rustore) { mod.modResults.contents = mod.modResults.contents.replace(/\s*add\(RuStoreReviewPackage\(\)\)/g, ""); return mod; }
    if (!mod.modResults.contents.includes("add(RuStoreReviewPackage())")) {
      if (!mod.modResults.contents.includes(anchor)) throw new Error("RuStore review: unsupported MainApplication template");
      mod.modResults.contents = mod.modResults.contents.replace(anchor, `${anchor}\n          add(RuStoreReviewPackage())`);
    }
    return mod;
  });
  return withDangerousMod(config, ["android", async (mod) => {
    const directory = path.join(mod.modRequest.platformProjectRoot, "app/src/main/java", config.android.package.replaceAll(".", "/"));
    if (!rustore) { await fs.rm(path.join(directory, "RuStoreReviewModule.kt"), { force: true }); return mod; }
    const source = await fs.readFile(path.join(__dirname, "native/RuStoreReviewModule.kt"), "utf8");
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, "RuStoreReviewModule.kt"), source.replace("package ru.puskweb.atmos", `package ${config.android.package}`));
    return mod;
  }]);
};
