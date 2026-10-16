import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw, ShieldCheck, Smartphone, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { debug } from "../lib/api";
import "./AppInstall.css";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** @returns {JSX.Element} Установка PWA, инструкция для браузеров без приглашения и обновление приложения. */
export default function AppInstall() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [cached, setCached] = useState(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      setRegistration(registration ?? null);
      setCached(Boolean(registration?.active));
      debug("PWA registered", { active: Boolean(registration?.active) });
    },
    onOfflineReady() { debug("PWA shell cached"); },
    onNeedRefresh() { debug("PWA update available"); },
    onRegisterError() { debug("PWA registration failed"); setError(true); },
  });

  useEffect(() => {
    if (!registration) return;
    /** Проверяет обновление при возвращении к приложению и раз в час, пока оно открыто. */
    function checkUpdate(): void {
      if (document.visibilityState === "visible") registration?.update().catch(() => debug("PWA update check failed"));
    }
    const interval = window.setInterval(checkUpdate, 60 * 60 * 1000);
    document.addEventListener("visibilitychange", checkUpdate);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", checkUpdate); };
  }, [registration]);

  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    /** @returns {void} Синхронизирует состояние отдельного окна, включая режим iOS. */
    function syncDisplay() {
      setInstalled(display.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    }
    /** @param {Event} event - Приглашение браузера. @returns {void} Сохраняет приглашение до явного нажатия пользователя. */
    function capturePrompt(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
      debug("PWA install available");
    }
    /** @returns {void} Убирает приглашение после завершённой установки. */
    function finishInstall() {
      setInstalled(true);
      setPrompt(null);
      debug("PWA installed");
    }
    syncDisplay();
    display.addEventListener("change", syncDisplay);
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", finishInstall);
    return () => {
      display.removeEventListener("change", syncDisplay);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", finishInstall);
    };
  }, []);

  /** @returns {Promise<void>} Открывает системную установку или доступную инструкцию. */
  async function install() {
    if (!prompt) {
      dialog.current?.showModal();
      return;
    }
    setBusy(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      debug("PWA install choice", { outcome: choice.outcome });
    } catch {
      debug("PWA install prompt failed");
      dialog.current?.showModal();
    } finally {
      setPrompt(null);
      setBusy(false);
    }
  }

  /** @returns {Promise<void>} Активирует новую версию только по нажатию пользователя. */
  async function update() {
    setBusy(true);
    try { await updateServiceWorker(true); }
    catch { debug("PWA update failed"); setError(true); }
    finally { setBusy(false); }
  }
  /** @returns {void} Открывает мини-панель по обычной ссылке без установки. */
  function openMini() {
    const url = new URL(location.href);
    url.searchParams.set("view", "mini");
    const popup = window.open(url, "atmos-mini", "popup=yes,width=380,height=580");
    if (!popup) location.assign(url.toString());
  }

  return (
    <div className="app-install">
      <button ref={button} className="install-button" onClick={install} disabled={busy}
        aria-label={installed ? "Об установленном приложении" : "Установить приложение"}>
        {installed ? <ShieldCheck size={18} /> : <Download size={18} />}
        <span>{installed ? "Приложение" : "Установить"}</span>
      </button>
      <dialog ref={dialog} className="install-dialog" aria-labelledby="install-title"
        onClose={() => button.current?.focus()}>
        <div className="install-dialog-heading">
          <Smartphone size={32} aria-hidden="true" />
          <button className="icon-button" aria-label="Закрыть инструкцию" autoFocus onClick={() => dialog.current?.close()}><X size={22} /></button>
        </div>
        <p className="eyebrow">ВАШ ПРОГНОЗ ПОД РУКОЙ</p>
        <h2 id="install-title">Погода и что надеть — приложение</h2>
        <p>Собственная иконка и отдельное окно — без лишних вкладок.</p>
        <a className="install-done windows-download" href="https://github.com/V-Kozintsev/atmos-weather/releases/latest/download/Atmos-Setup-x64.exe">Скачать для Windows</a>
        <p className="windows-note">Windows 10/11 · 64 бит · мини-погода и значок возле часов. <a href="https://github.com/V-Kozintsev/atmos-weather/releases/latest/download/Atmos-Portable-x64.exe">Версия без установки</a></p>
        <button className="mini-browser-button" onClick={openMini}>Открыть мини-панель в браузере</button>
        <ul>
          <li><strong>Компьютер и Android.</strong> Откройте сайт в Chrome или Edge. Нажмите «Установить» здесь либо выберите установку приложения в меню браузера.</li>
          <li><strong>iPhone и iPad.</strong> Откройте сайт в Safari, нажмите «Поделиться» → «На экран Домой».</li>
        </ul>
        <div className="install-offline" role="status">
          <ShieldCheck size={20} />
          <p>{offlineReady || cached ? "Интерфейс сохранён и открывается без сети." : error ? "Браузер не смог сохранить интерфейс офлайн. Попробуйте обновить страницу при доступной сети." : "Для первого запуска и сохранения интерфейса нужен интернет."} Последний прогноз хранится до суток; новые данные требуют сети.</p>
        </div>
        <button className="install-done" onClick={() => dialog.current?.close()}>Понятно</button>
      </dialog>
      {needRefresh && <div className="pwa-update" role="status">
        <RefreshCw size={20} />
        <p>Доступна новая версия приложения</p>
        <button onClick={update} disabled={busy}>Обновить</button>
        <button aria-label="Обновить позже" onClick={() => setNeedRefresh(false)}><X size={20} /></button>
      </div>}
    </div>
  );
}
