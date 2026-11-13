const { withAppBuildGradle, withMainApplication, withDangerousMod } = require("expo/config-plugins");
const fs = require("node:fs/promises");
const path = require("node:path");

/** @param {object} config - Конфигурация сборки. @returns {object} Подключает официальный Play In-App Updates только для Google Play. */
module.exports = function withGooglePlayUpdates(config) {
  const googlePlay = process.env.EXPO_PUBLIC_APP_STORE === "google-play";
  config = withAppBuildGradle(config, (mod) => {
    const dependency = 'implementation("com.google.android.play:app-update:2.1.0")';
    mod.modResults.contents = mod.modResults.contents.replace(/\n?dependencies \{ implementation\("com.google.android.play:app-update:2.1.0"\) \}\n?/g, "\n");
    if (googlePlay) mod.modResults.contents += `\ndependencies { ${dependency} }\n`;
    return mod;
  });
  config = withMainApplication(config, (mod) => {
    const anchor = "PackageList(this).packages.apply {";
    if (!googlePlay) { mod.modResults.contents = mod.modResults.contents.replace(/\s*add\(GooglePlayUpdatePackage\(\)\)/g, ""); return mod; }
    if (!mod.modResults.contents.includes("add(GooglePlayUpdatePackage())")) {
      if (!mod.modResults.contents.includes(anchor)) throw new Error("Google Play updates: unsupported MainApplication template");
      mod.modResults.contents = mod.modResults.contents.replace(anchor, `${anchor}\n          add(GooglePlayUpdatePackage())`);
    }
    return mod;
  });
  return withDangerousMod(config, ["android", async (mod) => {
    const directory = path.join(mod.modRequest.platformProjectRoot, "app/src/main/java", config.android.package.replaceAll(".", "/"));
    if (!googlePlay) { await fs.rm(path.join(directory, "GooglePlayUpdateModule.kt"), { force: true }); return mod; }
    const source = await fs.readFile(path.join(__dirname, "native/GooglePlayUpdateModule.kt"), "utf8");
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(path.join(directory, "GooglePlayUpdateModule.kt"), source.replace("package ru.puskweb.atmos", `package ${config.android.package}`));
    return mod;
  }]);
};
