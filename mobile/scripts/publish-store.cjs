// Выкладка уже собранных и подписанных сборок в магазины через официальные API.
// Ключи доступа лежат вне репозитория и никогда не выводятся:
//   Google Play — JSON сервисного аккаунта (ATMOS_GOOGLE_PLAY_KEY_FILE),
//   RuStore — JSON {"keyId": "...", "privateKey": "..."} (ATMOS_RUSTORE_KEY_FILE).
// По умолчанию оба файла ищутся в «Документы\Atmos Release».
//
//   node mobile/scripts/publish-store.cjs check                      проверить доступ, ничего не меняя
//   node mobile/scripts/publish-store.cjs google-play [--track alpha] [--file <aab>] [--submit]
//   node mobile/scripts/publish-store.cjs rustore [--file <apk>] [--moder-info <текст>] [--no-apk | --keep-draft | --replace-draft] [--submit]
//
// Без --submit: Google Play проверяет правку и отменяет её, RuStore оставляет черновик с загруженным APK.
// RuStore не принимает через API сборку с новым чувствительным разрешением — такую версию загружают в консоли.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");

const repo = path.resolve(__dirname, "..", "..");
const releaseRoot = path.join(os.homedir(), "Documents", "Atmos Release");

/** @returns {string} Корневой сертификат Минцифры, которым подписан public-api-m.rustore.ru; доверие к нему действует только в процессе этого скрипта. */
function caFile() {
  return process.env.ATMOS_EXTRA_CA_FILE || path.join(releaseRoot, "russian_trusted_root_ca.pem");
}

/** @returns {{ packageName: string, versionCode: number, versionName: string }} Данные выпуска из app.json. */
function appInfo() {
  const { expo } = JSON.parse(fs.readFileSync(path.join(repo, "mobile", "app.json"), "utf8"));
  return { packageName: expo.android.package, versionCode: expo.android.versionCode, versionName: expo.version };
}

/** @param {unknown} catalog - Содержимое public/app-releases.json. @param {number} versionCode - Код версии. @returns {{ title: string, changes: string[] }} Тексты выпуска; без них выкладка не продолжается. */
function releaseNotes(catalog, versionCode) {
  const entry = catalog && Array.isArray(catalog.releases) ? catalog.releases.find((item) => item.versionCode === versionCode) : undefined;
  if (!entry || !Array.isArray(entry.changes) || !entry.changes.length) throw new Error(`В public/app-releases.json нет списка изменений для versionCode ${versionCode}`);
  return { title: String(entry.title || "").trim(), changes: entry.changes.map((item) => String(item).trim()).filter(Boolean) };
}

/** @param {{ changes: string[] }} notes - Изменения выпуска. @param {number} limit - Лимит магазина. @returns {string} Пункты списком, целыми строками в пределах лимита. */
function formatNotes(notes, limit) {
  const lines = [];
  for (const change of notes.changes) {
    const line = `• ${change.replace(/[.\s]+$/, "")}.`;
    if ([...lines, line].join("\n").length > limit) break;
    lines.push(line);
  }
  if (!lines.length) throw new Error("Первый пункт списка изменений длиннее лимита магазина");
  return lines.join("\n");
}

/** @param {string} file - Путь к файлу ключа. @param {string} label - Название для сообщений. @returns {object} Разобранный JSON без вывода содержимого. */
function readKey(file, label) {
  if (!fs.existsSync(file)) throw new Error(`Нет файла ключа ${label}: ${file}. Инструкция — store-assets/publish-api.md`);
  try { return JSON.parse(fs.readFileSync(file, "utf8").replace(/^﻿/, "")); }
  catch { throw new Error(`Файл ключа ${label} не является корректным JSON: ${file}`); }
}

/** @param {Response} response - Ответ API. @param {string} step - Шаг для сообщения. @returns {Promise<any>} JSON ответа или ошибка с кодом и коротким текстом сервера. */
async function json(response, step) {
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text.slice(0, 300) }; }
  if (!response.ok) throw new Error(`${step}: HTTP ${response.status} ${JSON.stringify(body.error || body.message || body.raw || body).slice(0, 400)}`);
  return body;
}

// ---------- Google Play Developer API ----------

const googleApi = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";
const googleUpload = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications";

/** @param {{ client_email: string, private_key: string, token_uri?: string }} account - Сервисный аккаунт. @param {number} now - Время в секундах. @returns {string} Подписанный RS256 JWT для обмена на токен доступа. */
function googleJwt(account, now) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "RS256", typ: "JWT" });
  const claims = encode({ iss: account.client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: account.token_uri || "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
  const signature = crypto.createSign("RSA-SHA256").update(`${header}.${claims}`).sign(account.private_key).toString("base64url");
  return `${header}.${claims}.${signature}`;
}

/** @returns {Promise<{ token: string, account: string }>} Токен доступа сервисного аккаунта. */
async function googleAuth() {
  const account = readKey(process.env.ATMOS_GOOGLE_PLAY_KEY_FILE || path.join(releaseRoot, "google-play-service-account.json"), "Google Play");
  if (!account.client_email || !account.private_key) throw new Error("В JSON сервисного аккаунта нет client_email или private_key");
  const response = await fetch(account.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: googleJwt(account, Math.floor(Date.now() / 1000)) }),
  });
  const body = await json(response, "Google Play: токен доступа");
  return { token: body.access_token, account: account.client_email };
}

/** @param {string} token - Токен доступа. @param {string} method - HTTP-метод. @param {string} url - Адрес. @param {object} [body] - JSON. @param {string} step - Шаг. @returns {Promise<any>} Ответ API. */
async function google(token, method, url, body, step) {
  return json(await fetch(url, { method, headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }), step);
}

/** @returns {Promise<void>} Проверяет доступ: создаёт правку, читает треки и удаляет правку. */
async function googleCheck() {
  const { packageName } = appInfo();
  const { token, account } = await googleAuth();
  const base = `${googleApi}/${packageName}/edits`;
  const edit = await google(token, "POST", base, {}, "Google Play: создание правки");
  try {
    const { tracks = [] } = await google(token, "GET", `${base}/${edit.id}/tracks`, undefined, "Google Play: треки");
    const summary = tracks.map((track) => `${track.track}: ${(track.releases || []).map((release) => `${release.name || release.versionCodes} (${release.status})`).join(", ") || "—"}`);
    console.log(`Google Play: доступ есть (${account}).\n  ${summary.join("\n  ")}`);
  } finally {
    await fetch(`${base}/${edit.id}`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
  }
}

/** @param {{ file: string, track: string, submit: boolean }} options - Сборка, трек и отправка. @returns {Promise<void>} Загружает AAB, записывает выпуск в трек и отправляет на проверку только с --submit. */
async function googlePublish({ file, track, submit }) {
  const { packageName, versionCode, versionName } = appInfo();
  const notes = formatNotes(releaseNotes(JSON.parse(fs.readFileSync(path.join(repo, "public", "app-releases.json"), "utf8")), versionCode), 500);
  const { token } = await googleAuth();
  const base = `${googleApi}/${packageName}/edits`;
  const edit = await google(token, "POST", base, {}, "Google Play: создание правки");
  let committed = false;
  try {
    const size = fs.statSync(file).size;
    console.log(`Google Play: загружаю ${path.basename(file)} (${(size / 1048576).toFixed(1)} МБ)…`);
    const start = await fetch(`${googleUpload}/${packageName}/edits/${edit.id}/bundles?uploadType=resumable`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "x-upload-content-type": "application/octet-stream", "x-upload-content-length": String(size) },
    });
    if (!start.ok) await json(start, "Google Play: начало загрузки");
    const location = start.headers.get("location");
    if (!location) throw new Error("Google Play: сервер не вернул адрес загрузки");
    const bundle = await json(await fetch(location, { method: "PUT", headers: { "content-type": "application/octet-stream", "content-length": String(size) }, body: fs.readFileSync(file) }), "Google Play: загрузка AAB");
    if (Number(bundle.versionCode) !== versionCode) throw new Error(`Google Play: в AAB versionCode ${bundle.versionCode}, а в app.json ${versionCode}`);
    await google(token, "PUT", `${base}/${edit.id}/tracks/${track}`, {
      track,
      releases: [{ name: `${versionCode} (${versionName})`, versionCodes: [String(versionCode)], status: "completed", releaseNotes: [{ language: "ru-RU", text: notes }] }],
    }, `Google Play: выпуск в треке ${track}`);
    await google(token, "POST", `${base}/${edit.id}:validate`, undefined, "Google Play: проверка правки");
    if (!submit) { console.log(`Google Play: правка ${versionName} для трека ${track} прошла проверку. Без --submit она отменена.`); return; }
    await google(token, "POST", `${base}/${edit.id}:commit`, undefined, "Google Play: отправка");
    committed = true;
    console.log(`Google Play: ${versionName} (${versionCode}) отправлена в трек ${track}. Статус проверки — в Play Console → «Обзор публикации».`);
  } finally {
    if (!committed) await fetch(`${base}/${edit.id}`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
  }
}

// ---------- RuStore Public API ----------
// https://www.rustore.ru/help/work-with-rustore-api — сверено 2026-11-16.

const rustoreApi = "https://public-api-m.rustore.ru";

/** @param {Date} date - Момент подписи. @returns {string} ISO-время с миллисекундами и смещением +00:00, как в примерах RuStore. */
function rustoreTimestamp(date) {
  return date.toISOString().replace("Z", "+00:00");
}

/** @param {string} keyId - Идентификатор ключа. @param {string} timestamp - Время подписи. @param {string} privateKey - Ключ из консоли: Base64 PKCS#8 DER или PEM. @returns {string} Подпись SHA512withRSA строки keyId + timestamp в Base64. */
function rustoreSignature(keyId, timestamp, privateKey) {
  const key = privateKey.includes("BEGIN")
    ? crypto.createPrivateKey(privateKey)
    : crypto.createPrivateKey({ key: Buffer.from(privateKey.replace(/\s+/g, ""), "base64"), format: "der", type: "pkcs8" });
  return crypto.sign("sha512", Buffer.from(keyId + timestamp, "utf8"), key).toString("base64");
}

/** @returns {Promise<string>} Токен Public-Token на 15 минут. */
async function rustoreAuth() {
  const key = readKey(process.env.ATMOS_RUSTORE_KEY_FILE || path.join(releaseRoot, "rustore-api-key.json"), "RuStore");
  if (!key.keyId || !key.privateKey) throw new Error("В ключе RuStore нужны поля keyId и privateKey");
  const keyId = String(key.keyId);
  const timestamp = rustoreTimestamp(new Date());
  const body = await rustore(undefined, "POST", "/public/auth/", { json: { keyId, timestamp, signature: rustoreSignature(keyId, timestamp, String(key.privateKey)) } }, "RuStore: токен доступа");
  if (!body || !body.jwe) throw new Error("RuStore: в ответе нет токена");
  return body.jwe;
}

/** @param {string | undefined} token - Public-Token. @param {string} method - HTTP-метод. @param {string} url - Путь API. @param {{ json?: object, form?: FormData }} payload - Тело запроса. @param {string} step - Шаг. @returns {Promise<any>} Поле body успешного ответа. */
async function rustore(token, method, url, payload, step) {
  const headers = { ...(token ? { "Public-Token": token } : {}), ...(payload && payload.json ? { "content-type": "application/json" } : {}) };
  let response;
  try {
    response = await fetch(`${rustoreApi}${url}`, { method, headers, body: payload ? payload.form || JSON.stringify(payload.json) : undefined });
  } catch (error) {
    const code = error && error.cause && error.cause.code;
    if (code === "UNABLE_TO_GET_ISSUER_CERT_LOCALLY" || code === "SELF_SIGNED_CERT_IN_CHAIN") throw new Error(`${step}: сертификат RuStore выдан УЦ Минцифры, нужен файл ${caFile()} (store-assets/publish-api.md)`);
    throw new Error(`${step}: нет соединения (${code || error.message})`);
  }
  const result = await json(response, step);
  if (result.code && result.code !== "OK") throw new Error(`${step}: ${result.code} ${result.message || ""}`.trim());
  return result.body;
}

/** @param {string} token - Public-Token. @param {string} packageName - Пакет. @param {string} statuses - Статусы версий. @returns {Promise<any[]>} Версии приложения, включая альфа-тесты. */
async function rustoreVersions(token, packageName, statuses) {
  const body = await rustore(token, "GET", `/public/v1/application/${packageName}/version?page=0&size=20&filterTestingType=ALL${statuses ? `&versionStatuses=${statuses}` : ""}`, undefined, "RuStore: список версий");
  return (body && body.content) || [];
}

/** @returns {Promise<void>} Проверяет ключ: получает токен и читает приложение и версии. */
async function rustoreCheck() {
  const { packageName } = appInfo();
  const token = await rustoreAuth();
  const apps = await rustore(token, "GET", `/public/v1/application?appPackage=${packageName}`, undefined, "RuStore: приложение");
  const app = ((apps && apps.content) || [])[0];
  if (!app) throw new Error(`RuStore: ключ не видит приложение ${packageName} — проверьте, что оно выбрано при создании ключа`);
  const versions = await rustoreVersions(token, packageName);
  console.log(`RuStore: доступ есть. ${app.appName || packageName}: ${app.versionName} (${app.versionCode}), ${app.appStatus}.\n  ${versions.slice(0, 5).map((version) => `${version.versionName} (${version.versionCode}) — ${version.versionStatus}`).join("\n  ")}`);
}

/** @param {{ file: string, submit: boolean, replaceDraft: boolean, keepDraft?: boolean, noApk?: boolean, moderInfo?: string }} options - Сборка и режим. @returns {Promise<void>} Создаёт черновик с APK (пустой с --no-apk, или кладёт APK в существующий с --keep-draft) и отправляет на модерацию только с --submit. */
async function rustorePublish({ file, submit, replaceDraft, keepDraft, noApk, moderInfo }) {
  if (noApk && (keepDraft || submit)) throw new Error("RuStore: --no-apk только создаёт пустой черновик, без --keep-draft и --submit");
  const { packageName, versionCode, versionName } = appInfo();
  const whatsNew = formatNotes(releaseNotes(JSON.parse(fs.readFileSync(path.join(repo, "public", "app-releases.json"), "utf8")), versionCode), 5000);
  const token = await rustoreAuth();
  const drafts = await rustoreVersions(token, packageName, "DRAFT");
  // Консоль не показывает APK, загруженный через API, и при сохранении черновика отвязывает его.
  // Поэтому карточку (описание, теги, скриншоты) правят в консоли до загрузки, а APK кладут последним через --keep-draft.
  const kept = keepDraft ? drafts[0] : undefined;
  if (keepDraft && !kept) throw new Error("RuStore: черновика нет — запустите без --keep-draft, скрипт создаст новый");
  for (const draft of kept ? [] : drafts) {
    if (!replaceDraft) throw new Error(`RuStore: уже есть черновик ${draft.versionName || "без версии"} (id ${draft.versionId}). Отправьте или удалите его в консоли, запустите с --keep-draft, чтобы загрузить APK в него, либо с --replace-draft`);
    await rustore(token, "DELETE", `/public/v1/application/${packageName}/version/${draft.versionId}`, undefined, "RuStore: удаление старого черновика");
    console.log(`RuStore: удалён старый черновик id ${draft.versionId}`);
  }
  const created = kept ? kept.versionId : await rustore(token, "POST", `/public/v1/application/${packageName}/version`, {
    json: { whatsNew, moderInfo: (moderInfo || "Без регистрации. Изменения перечислены в «Что нового».").slice(0, 180), publishType: "INSTANTLY", partialValue: 100 },
  }, "RuStore: создание черновика");
  const versionId = typeof created === "number" ? created : created && created.versionId;
  if (!versionId) throw new Error("RuStore: не получил id черновика");
  let done = Boolean(kept); // чужой черновик с правками карточки при ошибке не удаляем
  if (noApk) {
    console.log(`RuStore: пустой черновик id ${versionId} создан. Поправьте карточку в консоли, нажмите «Сохранить как черновик», затем запустите rustore --keep-draft --submit.`);
    return;
  }
  try {
    const size = fs.statSync(file).size;
    console.log(`RuStore: черновик id ${versionId}, загружаю ${path.basename(file)} (${(size / 1048576).toFixed(1)} МБ)…`);
    const form = new FormData();
    form.append("file", await fs.openAsBlob(file, { type: "application/vnd.android.package-archive" }), path.basename(file));
    await rustore(token, "POST", `/public/v1/application/${packageName}/version/${versionId}/apk?isMainApk=true&servicesType=Unknown`, { form }, "RuStore: загрузка APK");
    const detail = await rustore(token, "GET", `/public/v2/application/${packageName}/version/${versionId}`, undefined, "RuStore: проверка черновика");
    const codes = ((detail && detail.packages) || []).map((item) => Number(item.verCode ?? item.versionCode));
    if (codes.length && !codes.includes(versionCode)) throw new Error(`RuStore: в черновике versionCode ${codes.join(", ")}, а в app.json ${versionCode}`);
    done = true;
    if (kept) console.log(`RuStore: APK загружен в существующий черновик id ${versionId}, его описание и скриншоты сохранены.`);
    if (!submit) { console.log(`RuStore: черновик ${versionName} с APK готов (id ${versionId}). Не сохраняйте его в консоли: она отвяжет APK. Чтобы отправить, запустите с --replace-draft --submit.`); return; }
    await rustore(token, "POST", `/public/v1/application/${packageName}/version/${versionId}/commit?priorityUpdate=0`, undefined, "RuStore: отправка на модерацию");
    console.log(`RuStore: ${versionName} (${versionCode}) отправлена на модерацию, после одобрения опубликуется автоматически на 100%.`);
  } finally {
    if (!done) await fetch(`${rustoreApi}/public/v1/application/${packageName}/version/${versionId}`, { method: "DELETE", headers: { "Public-Token": token } });
  }
}

// ---------- Запуск ----------

/** @param {string} store - rustore или google-play. @returns {string} Последняя сборка этой версии в «Atmos Release». */
function defaultArtifact(store) {
  const { versionName } = appInfo();
  const name = `Pogoda-i-chto-nadet-${versionName}-${store}.${store === "rustore" ? "apk" : "aab"}`;
  const folders = fs.existsSync(releaseRoot) ? fs.readdirSync(releaseRoot).filter((item) => item.startsWith(`${versionName}-`)).sort().reverse() : [];
  for (const folder of folders) {
    const file = path.join(releaseRoot, folder, name);
    if (fs.existsSync(file)) return file;
  }
  throw new Error(`Не нашёл ${name} в ${releaseRoot}. Сначала соберите релиз (mobile/scripts/release-android.ps1) или передайте --file`);
}

/** @param {string[]} argv - Аргументы командной строки. @returns {Promise<void>} Выполняет команду. */
async function main(argv) {
  const [command, ...rest] = argv;
  const option = (name) => { const index = rest.indexOf(name); return index >= 0 ? rest[index + 1] : undefined; };
  const submit = rest.includes("--submit");
  if (command === "check") {
    const only = rest[0];
    const checks = [only !== "rustore" && ["Google Play", googleCheck], only !== "google-play" && ["RuStore", rustoreCheck]].filter(Boolean);
    let failed = 0;
    for (const [label, check] of checks) {
      try { await check(); }
      catch (error) {
        if (!only && /^Нет файла ключа/.test(error.message)) { console.log(`${label}: не настроен — ${error.message}`); continue; }
        failed++; console.error(`${label}: ${error.message}`);
      }
    }
    if (failed) process.exitCode = 1;
    return;
  }
  if (command === "google-play") return googlePublish({ file: option("--file") || defaultArtifact("google-play"), track: option("--track") || "alpha", submit });
  if (command === "rustore") return rustorePublish({ file: option("--file") || defaultArtifact("rustore"), submit, replaceDraft: rest.includes("--replace-draft"), keepDraft: rest.includes("--keep-draft"), noApk: rest.includes("--no-apk"), moderInfo: option("--moder-info") });
  console.log("Команды: check [rustore|google-play] · google-play [--track alpha] [--file <aab>] [--submit] · rustore [--file <apk>] [--moder-info <текст>] [--no-apk | --keep-draft | --replace-draft] [--submit]");
  process.exitCode = 1;
}

module.exports = { releaseNotes, formatNotes, googleJwt, rustoreTimestamp, rustoreSignature, googlePublish, rustorePublish, googleCheck, rustoreCheck };
if (require.main === module) {
  // Node читает дополнительные корневые сертификаты только при запуске, поэтому скрипт перезапускает себя с ними.
  if (!process.env.NODE_EXTRA_CA_CERTS && fs.existsSync(caFile())) {
    const { spawnSync } = require("node:child_process");
    const child = spawnSync(process.execPath, [__filename, ...process.argv.slice(2)], { stdio: "inherit", env: { ...process.env, NODE_EXTRA_CA_CERTS: caFile() } });
    process.exit(child.status ?? 1);
  }
  main(process.argv.slice(2)).catch((error) => { console.error(error.message); process.exit(1); });
}
