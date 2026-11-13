const { spawnSync } = require("node:child_process");
const { rmSync } = require("node:fs");
const path = require("node:path");

const store = process.argv[2];
if (!["rustore", "google-play"].includes(store)) throw new Error("Choose rustore or google-play");
const root = path.resolve(__dirname, "..");
const env = { ...process.env, EXPO_PUBLIC_APP_STORE: store, NODE_ENV: "production" };
for (const key of ["ATMOS_KEYSTORE", "ATMOS_STORE_PASSWORD", "ATMOS_KEY_ALIAS", "ATMOS_KEY_PASSWORD"]) {
  if (!env[key]) throw new Error(`Missing ${key}; release must use the existing signing key`);
}

/** @param {string} command - Исполняемый файл. @param {string[]} args - Аргументы без секретов. @param {string} cwd - Рабочая папка. @returns {void} Выполняет шаг сборки и прекращает работу при ошибке. */
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit", windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

run(process.execPath, [require.resolve("expo/bin/cli"), "prebuild", "--platform", "android", "--no-install"], root);
// The autolinking command depends on the store environment, which Gradle does not track as a file input.
rmSync(path.join(root, "android/build/generated/autolinking/autolinking.json"), { force: true });
const task = store === "google-play" ? ":app:bundleRelease" : ":app:assembleRelease";
// RuStore получает один общий APK: библиотеки x86 нужны только эмуляторам и добавляют около 34 МБ.
// AAB для Google Play собирается со всеми ABI — магазин сам отдаёт устройству нужную часть.
const architectures = store === "rustore" ? " -PreactNativeArchitectures=armeabi-v7a,arm64-v8a" : "";
if (process.platform === "win32") run("cmd.exe", ["/d", "/s", "/c", `gradlew.bat ${task}${architectures} --no-daemon`], path.join(root, "android"));
else run("./gradlew", [task, ...architectures.trim().split(" ").filter(Boolean), "--no-daemon"], path.join(root, "android"));
