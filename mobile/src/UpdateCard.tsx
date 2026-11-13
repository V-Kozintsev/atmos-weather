import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, fontNames } from "./typography";
import { updateBytes, updateErrorMessage } from "./updatesPolicy";
import type { UpdateState } from "./useAppUpdates";
import { storeName } from "./distribution";

interface Props { state: UpdateState; onUpdate: () => void; onCheck: () => Promise<void>; onDismiss: () => void; onStore: () => void; suspended?: boolean }

/** @param {Props} props - Реальное состояние RuStore, тексты выпуска и действия. @returns {React.JSX.Element | null} Нижнее окно обновления и компактный индикатор после сворачивания загрузки. */
export function UpdateCard({ state, onUpdate, onCheck, onDismiss, onStore, suspended = false }: Props): React.JSX.Element | null {
  const [minimized, setMinimized] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const { height } = useWindowDimensions();
  const status = state.status;
  const inProgress = status === "downloading" || status === "confirming" || status === "installing";
  useEffect(() => {
    if (!inProgress) setMinimized(false);
  }, [status, state.version, inProgress]);
  if (!state.visible || status === "idle") return null;
  const busy = inProgress || status === "checking";
  const release = state.release?.versionCode === state.version ? state.release : undefined;
  const titles = { idle: "", checking: "Проверяем обновления", available: "Доступно обновление", downloading: state.pending ? "Готовим загрузку" : "Загружаем обновление", downloaded: "Обновление скачано", confirming: "Завершите обновление", installing: "Android устанавливает обновление", attention: "Нужно проверить обновление", latest: "Всё актуально", unavailable: "Не удалось проверить", error: "Обновление не завершено" };
  const descriptions = { idle: "", checking: `Проверяем новую версию в ${storeName}.`, available: release ? `Версия ${release.versionName} · Что изменилось` : `Новая версия приложения уже доступна в ${storeName}.`, downloading: state.slow ? `Новых данных о загрузке пока нет. Проверьте интернет или продолжите в ${storeName}.` : state.pending ? `${storeName} готовит файл. Можно продолжать смотреть погоду.` : "Показываем прогресс, который передаёт магазин. Можно свернуть окно.", downloaded: "Остался последний шаг — разрешить Android установить новую версию. Город и настройки сохранятся.", confirming: `Запрос передан Android. Подтвердите установку в системном окне, если оно появится. Приложение обновится после завершения установки.`, installing: `Магазин сообщил о начале установки. Дождитесь завершения — заново нажимать «Установить» не нужно.`, attention: state.phase === "download" ? `Данные о загрузке давно не менялись. Мы не можем подтвердить, что она продолжается. Проверьте состояние или откройте ${storeName}.` : `Мы не получили подтверждение завершения. Откройте ${storeName} и нажмите «Обновить» или подтвердите установку, если магазин попросит.`, latest: "У вас последняя доступная версия приложения.", unavailable: `Проверьте интернет и доступность ${storeName} на телефоне. Можно повторить проверку или открыть магазин.`, error: updateErrorMessage(state.errorCode) };
  const needsStore = status === "attention";
  const canVerify = needsStore || status === "confirming" || status === "installing" || status === "error" || status === "unavailable" || (status === "downloading" && state.slow);
  const showSteps = inProgress || status === "downloaded" || status === "attention";
  const step = status === "installing" ? 2 : status === "downloaded" || status === "confirming" || state.phase === "install" ? 1 : 0;
  const bytes = updateBytes(state.bytesDownloaded, state.totalBytes);
  const icon = status === "error" || status === "unavailable" ? "alert-circle-outline" : status === "latest" || status === "downloaded" ? "checkmark-circle-outline" : "cloud-download-outline";
  /** @returns {void} Сворачивает текущую операцию или откладывает предложение, сохраняя доступ к погоде. */
  function close(): void { if (inProgress) setMinimized(true); else if (!busy) onDismiss(); }
  /** @returns {Promise<void>} Сверяет состояние с магазином без повторного запуска установки. */
  async function verify(): Promise<void> {
    if (rechecking) return;
    setRechecking(true);
    try { await onCheck(); } finally { setRechecking(false); }
  }
  return <>
    {minimized && <Pressable accessibilityRole="button" accessibilityLabel="Показать состояние обновления" onPress={() => setMinimized(false)} style={styles.banner}>
      <Ionicons name={icon} color="#21483e" size={21} />
      <Text style={styles.bannerText}>{status === "confirming" ? "Завершите обновление" : status === "installing" ? "Установка обновления" : "Загрузка обновления"}</Text>
      {state.progress === undefined ? <ActivityIndicator color="#21483e" size="small" /> : <Text style={styles.version}>{state.progress}%</Text>}
      <Ionicons name="chevron-up" size={16} color="#547466" />
    </Pressable>}
    <Modal visible={!minimized && !suspended} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Закрыть окно обновления" accessibilityRole="button" disabled={status === "checking"} onPress={close} />
        <SafeAreaView edges={["bottom", "left", "right"]} style={[styles.sheet, { maxHeight: height * 0.86 }]}>
          <View style={styles.handle} />
          <ScrollView bounces={false} contentContainerStyle={styles.content}>
            <View style={styles.header}>
              <View style={styles.badge}><Ionicons name={icon} color="#21483e" size={30} /></View>
              <View style={styles.headerText}><Text style={styles.eyebrow}>ОБНОВЛЕНИЕ</Text>{release && <Text style={styles.version}>{release.versionName}</Text>}</View>
              {!busy && <Pressable accessibilityRole="button" accessibilityLabel="Закрыть" hitSlop={4} style={styles.close} onPress={close}><Ionicons name="close" color="#6b7c70" size={21} /></Pressable>}
            </View>
            <Text style={styles.title}>{titles[status]}</Text>
            <Text style={styles.description}>{descriptions[status]}</Text>
            {showSteps && <View style={styles.steps}>{["Скачать", "Подтвердить", "Установить"].map((label, index) => <View key={label} style={styles.step}>
              <View style={[styles.stepDot, index <= step && styles.stepActive]}>{index < step ? <Ionicons name="checkmark" size={12} color="#fff" /> : <Text style={[styles.stepNumber, index <= step && styles.stepNumberActive]}>{index + 1}</Text>}</View>
              <Text style={[styles.stepLabel, index === step && styles.stepLabelActive]}>{label}</Text>
            </View>)}</View>}
            {status === "available" && release && <View style={styles.changes}>{release.changes.map((change, index) => <View key={`${index}:${change}`} style={styles.change}><Ionicons name="checkmark" color="#527b65" size={18} /><Text style={styles.changeText}>{change}</Text></View>)}</View>}
            {status === "downloading" && <View style={styles.progressRow}>
              <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel="Загрузка обновления" accessibilityValue={state.progress === undefined ? { text: "Ожидание данных о загрузке" } : { min: 0, max: 100, now: state.progress }}>
                {state.progress !== undefined && <View style={[styles.fill, { width: `${state.progress}%` }]} />}
              </View>
              {state.progress === undefined ? <ActivityIndicator color="#21483e" size="small" /> : <Text style={styles.percent}>{state.progress}%</Text>}
            </View>}
            {status === "downloading" && bytes && <Text style={styles.note}>{bytes}</Text>}
            {status === "checking" && <ActivityIndicator color="#21483e" style={styles.spinner} />}
            <View style={styles.actions}>
              {needsStore && <Pressable accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={onStore}><Ionicons name="open-outline" size={18} color="white" /><Text style={styles.primaryText}>{`Продолжить в ${storeName}`}</Text></Pressable>}
              {(status === "available" || status === "downloaded" || status === "error") && <Pressable accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={onUpdate}><Ionicons name={status === "downloaded" ? "refresh-outline" : "download-outline"} size={18} color="white" /><Text style={styles.primaryText}>{status === "downloaded" ? "Установить и перезапустить" : status === "error" ? "Попробовать ещё раз" : "Обновить приложение"}</Text></Pressable>}
              {(status === "unavailable" || status === "error" || (status === "downloading" && state.slow)) && <Pressable accessibilityRole="button" style={styles.secondary} onPress={onStore}><Text style={styles.secondaryText}>{`Открыть ${storeName} ↗`}</Text></Pressable>}
              {canVerify && <Pressable accessibilityRole="button" accessibilityState={{ disabled: rechecking }} disabled={rechecking} style={styles.secondary} onPress={() => void verify()}>{rechecking ? <ActivityIndicator size="small" color="#21483e" /> : <Text style={styles.secondaryText}>Проверить состояние</Text>}</Pressable>}
              {status !== "checking" && <Pressable accessibilityRole="button" style={styles.secondary} onPress={close}><Text style={styles.secondaryText}>{inProgress ? "Свернуть" : status === "latest" ? "Понятно" : "Позже"}</Text></Pressable>}
            </View>
            <Text style={styles.note}>{`Обновление через ${storeName}`}</Text>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(16,32,27,0.46)", justifyContent: "flex-end", alignItems: "center" },
  sheet: { width: "100%", maxWidth: 520, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "#f7f8f2", overflow: "hidden" },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#d2d8ce", alignSelf: "center", marginTop: 10 },
  content: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  headerText: { flex: 1, gap: 4 },
  badge: { width: 54, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#e6eddf" },
  eyebrow: { fontSize: 10, fontWeight: "700", letterSpacing: 1.6, color: "#527565" },
  version: { fontSize: 12, color: "#687d71" },
  close: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  title: { fontFamily: fontNames.heading, fontSize: 26, lineHeight: 33, color: "#21483e", marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 21, color: "#617568" },
  changes: { gap: 12, marginTop: 20 },
  change: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  changeText: { flex: 1, fontSize: 14, lineHeight: 21, color: "#294f43" },
  actions: { marginTop: 22, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#e1e7db", gap: 2 },
  primary: { minHeight: 46, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: "#21483e", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  primaryText: { flexShrink: 1, fontSize: 14, fontWeight: "600", color: "#fff", textAlign: "center" },
  pressed: { opacity: 0.85 },
  secondary: { minHeight: 44, padding: 10, alignItems: "center", justifyContent: "center" },
  secondaryText: { fontSize: 13, fontWeight: "600", color: "#335d4e" },
  note: { fontSize: 10, lineHeight: 16, textAlign: "center", color: "#819084", marginTop: 4 },
  spinner: { marginTop: 22 },
  steps: { flexDirection: "row", gap: 10, marginTop: 20 },
  step: { flex: 1, gap: 6, alignItems: "center" },
  stepDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#e1e7db", alignItems: "center", justifyContent: "center" },
  stepActive: { backgroundColor: "#335d4e" },
  stepNumber: { fontSize: 11, color: "#617568" },
  stepNumberActive: { color: "#fff" },
  stepLabel: { fontSize: 11, color: "#617568", textAlign: "center" },
  stepLabelActive: { color: "#21483e", fontWeight: "700" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 24, marginBottom: 6 },
  track: { flex: 1, height: 7, borderRadius: 4, backgroundColor: "#e1e8db", overflow: "hidden" },
  fill: { height: 7, borderRadius: 4, backgroundColor: "#21483e" },
  percent: { minWidth: 35, fontSize: 13, color: "#335d4e", textAlign: "right" },
  banner: { marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, borderRadius: 14, backgroundColor: "#e6eddf", flexDirection: "row", alignItems: "center", gap: 10 },
  bannerText: { flex: 1, fontSize: 12, fontWeight: "600", color: "#21483e" },
});
