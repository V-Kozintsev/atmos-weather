const { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, net, protocol, session, shell, Tray } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const APP_ORIGIN = "atmos://bundle";
const assetRoot = path.join(__dirname, "../dist");
let window, tray, quitting = false, compact = false, fullBounds;
const diagnostics = process.argv.includes("--diagnostics");
protocol.registerSchemesAsPrivileged([{ scheme: "atmos", privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
// Сохраняем прежний каталог настроек при смене отображаемого имени.
app.setPath("userData", path.join(app.getPath("appData"), "Atmos"));
app.setName("Погода и что надеть");
app.setAppUserModelId("ru.puskweb.atmos");

/** @param {string} event - Событие оболочки. @param {object} detail - Безопасные состояния без погоды, координат или пользовательского текста. */
function trace(event, detail = {}) {
  if (diagnostics) console.info(`[Atmos Desktop] ${event}`, detail);
}

/** @param {Electron.IpcMainEvent | Electron.IpcMainInvokeEvent} event - Источник сообщения. @returns {boolean} Только главное окно локального приложения может управлять оболочкой. */
function trusted(event) {
  return event.sender === window?.webContents && event.senderFrame === window.webContents.mainFrame && event.senderFrame.url.startsWith(`${APP_ORIGIN}/`);
}

/** @param {boolean} next - Включить компактный режим. Сохраняет положение полной панели. */
function setCompact(next) {
  if (!window || window.isDestroyed()) return;
  if (next !== compact) {
    if (next) {
      if (window.isMaximized()) window.unmaximize();
      fullBounds = window.getBounds();
      window.setMinimumSize(340, 390);
      window.setSize(380, 580);
    } else {
      window.setMinimumSize(800, 620);
      if (fullBounds) window.setBounds(fullBounds);
    }
    compact = next;
    trace("compact changed", { compact });
    window.setAlwaysOnTop(next);
    window.webContents.send("atmos:compact-changed", next);
  }
  window.show();
  window.focus();
}

/** @param {string} raw - Адрес внешней ссылки. Открывает только HTTPS в обычном браузере. */
function openExternal(raw) {
  try { if (new URL(raw).protocol === "https:") shell.openExternal(raw); }
  catch { console.info("[Atmos Desktop] external link rejected"); }
}

/** Проверяет GitHub Releases только в установленной Windows-сборке; portable остаётся самостоятельным файлом. */
function initializeUpdates() {
  if (!app.isPackaged || process.env.PORTABLE_EXECUTABLE_FILE) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("checking-for-update", () => trace("update check"));
  autoUpdater.on("update-available", (info) => trace("update available", { version: info.version }));
  autoUpdater.on("update-not-available", () => trace("up to date"));
  autoUpdater.on("error", (error) => console.error("[Atmos Desktop] update failed", error.message));
  autoUpdater.on("update-downloaded", async (info) => {
    trace("update downloaded", { version: info.version });
    const answer = await dialog.showMessageBox(window, {
      type: "info",
      title: "Обновление приложения",
      message: `Версия ${info.version} готова к установке.`,
      detail: "Можно перезапустить приложение сейчас или установить обновление при следующем закрытии.",
      buttons: ["Перезапустить сейчас", "Позже"],
      defaultId: 0,
      cancelId: 1,
    });
    if (answer.response === 0) {
      quitting = true;
      autoUpdater.quitAndInstall(false, true);
    }
  });
  /** Запускает проверку без влияния на загрузку погодного интерфейса. */
  function check() {
    autoUpdater.checkForUpdates().catch((error) => console.error("[Atmos Desktop] update check failed", error.message));
  }
  setTimeout(check, 15000);
  setInterval(check, 6 * 60 * 60 * 1000);
}

/** Создаёт изолированное окно с локальной сборкой и значок в области уведомлений. */
function createWindow() {
  const icon = path.join(assetRoot, "icons/pwa-192.png");
  window = new BrowserWindow({
    width: 1360, height: 940, minWidth: 800, minHeight: 620,
    title: "Погода и что надеть", backgroundColor: "#121821", icon, show: false,
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  });
  window.removeMenu();
  window.once("ready-to-show", () => { trace("interface ready"); if (!process.argv.includes("--background")) window.show(); });
  window.on("close", (event) => { if (!quitting && tray) { event.preventDefault(); window.hide(); } });
  window.webContents.setWindowOpenHandler(({ url }) => { openExternal(url); return { action: "deny" }; });
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(`${APP_ORIGIN}/`)) { event.preventDefault(); openExternal(url); }
  });
  window.webContents.on("did-fail-load", () => console.error("[Atmos Desktop] local interface failed to load"));
  window.webContents.on("did-finish-load", () => trace("local page loaded"));
  tray = new Tray(nativeImage.createFromPath(icon).resize({ width: 20, height: 20 }));
  tray.setToolTip("Погода и что надеть");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Открыть приложение", click: () => setCompact(false) },
    { label: "Мини-погода поверх окон", click: () => setCompact(true) },
    { label: "Свернуть в область уведомлений", click: () => window.hide() },
    { type: "separator" },
    { label: "Завершить приложение", click: () => app.quit() },
  ]));
  tray.on("double-click", () => setCompact(false));
  tray.on("click", () => { if (!window.isVisible()) { window.show(); window.focus(); } });
  window.loadURL(`${APP_ORIGIN}/`);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => { if (window?.isMinimized()) window.restore(); setCompact(false); });
  app.on("before-quit", () => { quitting = true; });
  app.on("window-all-closed", () => app.quit());
  app.whenReady().then(() => {
    protocol.handle("atmos", (request) => {
      const url = new URL(request.url);
      if (url.host !== "bundle" || request.method !== "GET") return new Response("Not found", { status: 404 });
      let file;
      try { file = path.resolve(assetRoot, `.${decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)}`); }
      catch { return new Response("Bad request", { status: 400 }); }
      const relative = path.relative(assetRoot, file);
      if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return new Response("Forbidden", { status: 403 });
      return net.fetch(pathToFileURL(file).toString());
    });
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ["https://api.met.no/*"] }, (details, callback) => {
      callback({ requestHeaders: { ...details.requestHeaders, "User-Agent": `Atmos/${app.getVersion()} (https://github.com/V-Kozintsev/atmos-weather)` } });
    });
    session.defaultSession.webRequest.onHeadersReceived({ urls: ["atmos://bundle/*"] }, (details, callback) => {
      callback({ responseHeaders: { ...details.responseHeaders, "Content-Security-Policy": ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://api.met.no; object-src 'none'; frame-src 'none'; base-uri 'self'"] } });
    });
    ipcMain.handle("atmos:get-compact", (event) => trusted(event) ? compact : false);
    ipcMain.on("atmos:set-compact", (event, next) => { if (trusted(event) && typeof next === "boolean") setCompact(next); });
    ipcMain.on("atmos:hide", (event) => { if (trusted(event)) window.hide(); });
    ipcMain.on("atmos:weather-status", (event, data) => {
      if (!trusted(event) || !data || typeof data.city !== "string" || typeof data.description !== "string" || !Number.isFinite(data.temperature)) return;
      const title = `${data.city.slice(0, 60)} · ${Math.round(data.temperature)}° · ${data.description.slice(0, 60)}`.replace(/[\r\n\x00-\x1f]/g, " ");
      tray.setToolTip(`Погода и что надеть — ${title}`);
      window.setTitle(`Погода и что надеть — ${title}`);
    });
    createWindow();
    initializeUpdates();
    trace("initialized", { version: app.getVersion(), packaged: app.isPackaged });
  }).catch(() => { console.error("[Atmos Desktop] initialization failed"); app.quit(); });
}
