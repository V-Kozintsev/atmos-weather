import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Chip, s } from "./ui";
import type { UpdateState } from "./useAppUpdates";

interface Props { state: UpdateState; onUpdate: () => void; onDismiss: () => void; onStore: () => void }

/** @param {Props} props - Состояние обновления и действия пользователя. @returns {React.JSX.Element | null} Неблокирующая карточка обновления, загрузки или установки. */
export function UpdateCard({ state, onUpdate, onDismiss, onStore }: Props): React.JSX.Element | null {
  if (!state.visible || state.status === "idle") return null;
  const busy = ["checking", "downloading", "installing"].includes(state.status);
  const titles = { idle: "", checking: "Проверяем обновления", available: "Доступно обновление Atmos", downloading: "Загружаем обновление", downloaded: "Обновление готово", installing: "Устанавливаем обновление", latest: "У вас актуальная версия", unavailable: "Пока не удалось проверить обновление", error: "Обновление не завершено" };
  const descriptions = { idle: "", checking: "Это не помешает смотреть погоду.", available: "Новые возможности и исправления. Обновитесь прямо здесь, без поиска в магазине.", downloading: state.progress === undefined ? "Можете продолжать пользоваться приложением." : `Загружено ${state.progress}%. Можете продолжать пользоваться приложением.`, downloaded: "Нажмите, когда будет удобно. Приложение перезапустится после установки.", installing: "RuStore завершит установку. Подтвердите её, если Android попросит.", latest: "Новых обновлений в RuStore нет.", unavailable: "Проверьте интернет и доступность RuStore на телефоне. Попробуйте позже или откройте магазин.", error: "Погода продолжает работать. Можно повторить попытку или открыть RuStore." };
  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      <View style={s.row}>
        <Text style={[s.subtitle, s.flex]}>{titles[state.status]}</Text>
        {busy && <ActivityIndicator color="#21483e" />}
      </View>
      <Text style={s.caption}>{descriptions[state.status]}</Text>
      <View style={s.wrap}>
        {state.status === "available" && <Chip label="Обновить" active onPress={onUpdate} />}
        {state.status === "downloaded" && <Chip label="Установить и перезапустить" active onPress={onUpdate} />}
        {state.status === "error" && <Chip label="Повторить" active onPress={onUpdate} />}
        {["unavailable", "error"].includes(state.status) && <Chip label="Открыть RuStore ↗" onPress={onStore} />}
        {!busy && <Chip label={state.status === "latest" ? "Понятно" : "Позже"} onPress={onDismiss} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ card: { padding: 18, gap: 12, borderRadius: 22, backgroundColor: "#e6eddf", borderWidth: 1, borderColor: "#d1ddc8" } });
