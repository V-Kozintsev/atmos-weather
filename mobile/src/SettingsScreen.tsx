import { useEffect, useState, type ReactNode } from "react";
import { Alert, BackHandler, Linking, Platform, Pressable, StyleSheet, Switch, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, fontNames } from "./typography";
import { sceneModes, type SceneMode } from "./CityBackdrop";
import type { City, Forecast } from "../../src/lib/weather";
import type { OutfitOccasion, WarmthPreference } from "../../src/lib/outfit";
import { UnderlineTabs } from "./UnderlineTabs";
import { occasionLabels, warmthLabels } from "./outfitPreferences";
import { useTimeTheme } from "./timeTheme";
import { WidgetSettingsPreview } from "./WidgetSettingsPreview";
import { storeName } from "./distribution";
import { morningTimes, type MorningTime } from "../../src/lib/morning";

type Glyph = keyof typeof Ionicons.glyphMap;
type Page = "main" | "city" | "units" | "scene" | "widget" | "comfort" | "morning" | "about" | "feedback";
interface SettingsPreferences {
  cityBackground: boolean; weatherMotion: boolean; sceneMode: SceneMode; widgetDark: boolean; widgetAutoTheme: boolean;
  widgetClothes: boolean; fahrenheit: boolean; diagnostics: boolean; personalizedAds: boolean;
  occasion: OutfitOccasion; warmth: WarmthPreference; morningAdvice: boolean; morningTime: MorningTime;
}
interface Props {
  preferences: SettingsPreferences; onChange: (change: Partial<SettingsPreferences>) => void;
  version: string; checking: boolean; onCheck: () => void; forecast?: Forecast;
  city?: City; favorites: City[]; locating: boolean;
  onCity: () => void; onLocate: () => void; onFavorite: (city: City) => void;
  onWidget: () => Promise<boolean>; onRate: () => void; onFeedback: () => void; reviewsEnabled: boolean;
  onReviewsChange: (enabled: boolean) => void; morningBusy: boolean; onMorningAdvice: (enabled: boolean) => void; children: ReactNode;
}
const titles: Record<Page, string> = { main: "Настройки", city: "Город", units: "Единицы", scene: "Время суток", widget: "Виджет", comfort: "Стиль и комфорт", morning: "Утренний совет", about: "О приложении", feedback: "Обратная связь" };

/** @param {object} props - Название группы и строки. @returns {React.JSX.Element} Открытая группа настроек без фоновой карточки. */
function Group({ label, children }: { label: string; children: ReactNode }): React.JSX.Element {
  return <View style={styles.group}><Text style={styles.groupLabel}>{label}</Text><View>{children}</View></View>;
}

/** @param {object} props - Подписи, значение, значок и действие. @returns {React.JSX.Element} Общая строка с разделителем и доступным переключателем. */
function Row({ icon, label, hint, trailing, onPress, value, onValueChange, disabled = false }: {
  icon: Glyph; label: string; hint?: string; trailing?: string; onPress?: () => void;
  value?: boolean; onValueChange?: (value: boolean) => void; disabled?: boolean;
}): React.JSX.Element {
  const theme = useTimeTheme();
  const content = <>
    <Ionicons name={icon} size={21} color={theme.primary} />
    <View style={styles.copy}><Text style={styles.label}>{label}</Text>{hint && <Text style={styles.hint}>{hint}</Text>}</View>
    {onValueChange ? <Switch accessibilityLabel={label} value={value} onValueChange={onValueChange} trackColor={{ false: "#cbd0cb", true: "#4e7161" }} thumbColor="#ffffff" /> : <>{trailing && <Text style={styles.trailing}>{trailing}</Text>}<Ionicons name="chevron-forward" size={16} color={theme.text} /></>}
  </>;
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}>{content}</Pressable> : <View style={styles.row}>{content}</View>;
}

/** @param {Props} props - Действующие настройки и обработчики приложения. @returns {React.JSX.Element} Компактное меню и отдельные страницы настроек с системным возвратом. */
export function SettingsScreen({ preferences: p, onChange, version, checking, onCheck, city, forecast, favorites, locating, onCity, onLocate, onFavorite, onWidget, onRate, onFeedback, reviewsEnabled, onReviewsChange, morningBusy, onMorningAdvice, children }: Props): React.JSX.Element {
  const [page, setPage] = useState<Page>("main");
  const [help, setHelp] = useState(false);
  const [addingWidget, setAddingWidget] = useState(false);

  /** @param {boolean} enabled - Запрошенное состояние. @returns {void} Отзывает согласие сразу; включает персонализацию только после отдельного подтверждения совершеннолетнего пользователя. */
  function changeAdPersonalization(enabled: boolean): void {
    if (!enabled) { onChange({ personalizedAds: false }); return; }
    Alert.alert("Реклама по интересам", "Если вам исполнилось 18 лет, вы можете разрешить Яндексу обрабатывать рекламный идентификатор устройства и рекламные события для подбора и оценки рекламы. Выбор можно изменить здесь в любой момент. Без согласия приложение и обычная реклама продолжат работать.", [
      { text: "Отмена", style: "cancel" },
      { text: "О данных", onPress: () => { void Linking.openURL("https://v-kozintsev.github.io/atmos-weather/privacy.html").catch(() => Alert.alert("Не удалось открыть", "Политика доступна в разделе «О приложении и данных».")); } },
      { text: "Разрешить, мне 18+", onPress: () => onChange({ personalizedAds: true }) },
    ], { cancelable: true });
  }

  /** @returns {Promise<void>} Передаёт подтверждение Android; при недоступности системного окна раскрывает локальную инструкцию. */
  async function addWidget(): Promise<void> {
    if (addingWidget) return;
    setAddingWidget(true);
    try {
      const requested = await onWidget();
      setHelp(!requested);
    } catch {
      setHelp(true);
    } finally {
      setAddingWidget(false);
    }
  }
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (page === "main") return false;
      setPage("main"); return true;
    });
    return () => subscription.remove();
  }, [page]);
  return <View style={styles.screen}>
    <View style={styles.header}>{page !== "main" && <Pressable accessibilityRole="button" accessibilityLabel="Назад к настройкам" onPress={() => setPage("main")} style={styles.back}><Ionicons name="chevron-back" size={25} color="#242b29" /></Pressable>}<Text style={styles.title}>{titles[page]}</Text></View>
    {page === "main" && <>
      <Group label="ПРОГНОЗ">
        <Row icon="location-outline" label="Город" trailing={city?.name || "Выбрать"} onPress={() => setPage("city")} />
        <Row icon="thermometer-outline" label="Единицы" trailing={`${p.fahrenheit ? "°F" : "°C"}, м/с`} onPress={() => setPage("units")} />
        <Row icon="shirt-outline" label="Стиль и комфорт" onPress={() => setPage("comfort")} />
        {Platform.OS === "android" && <Row icon="notifications-outline" label="Утренний совет" trailing={p.morningAdvice ? p.morningTime : "Выкл."} onPress={() => setPage("morning")} />}
      </Group>
      <Group label="ОФОРМЛЕНИЕ">
        <Row icon="sunny-outline" label="Время суток" trailing={sceneModes.find(([value]) => value === p.sceneMode)?.[1]} onPress={() => setPage("scene")} />
        <Row icon="image-outline" label="Фото города" value={p.cityBackground} onValueChange={(cityBackground) => onChange({ cityBackground })} />
        <Row icon="sparkles-outline" label="Погодная анимация" hint="Пока открыт экран погоды" value={p.weatherMotion} onValueChange={(weatherMotion) => onChange({ weatherMotion })} />
        {Platform.OS === "android" && <Row icon="home-outline" label="Виджет" onPress={() => setPage("widget")} />}
      </Group>
      <Group label="ПРИЛОЖЕНИЕ">
        {Platform.OS === "android" && <Row icon="download-outline" label={checking ? "Проверяем обновления…" : "Обновления"} trailing={version} onPress={onCheck} disabled={checking} />}
        <Row icon="information-circle-outline" label="О приложении и данных" onPress={() => setPage("about")} />
        <Row icon="chatbubble-ellipses-outline" label="Обратная связь" onPress={() => setPage("feedback")} />
      </Group>
      <Text style={styles.footer}>Погода и что надеть · {version}</Text>
    </>}
    {page === "city" && <Group label="ГОРОД ДЛЯ ПРОГНОЗА И ВИДЖЕТА">
      <Row icon="search-outline" label="Выбрать город" trailing={city?.name} onPress={onCity} />
      <Row icon="navigate-outline" label={locating ? "Определяем место…" : "Моё местоположение"} onPress={onLocate} disabled={locating} />
      {favorites.map((favorite) => <Row key={favorite.id} icon="star-outline" label={favorite.name} onPress={() => onFavorite(favorite)} />)}
      <Text style={styles.note}>Добавляйте города в избранное звёздочкой в поиске города.</Text>
    </Group>}
    {page === "units" && <><Group label="ТЕМПЕРАТУРА">{[false, true].map((fahrenheit) => <Row key={String(fahrenheit)} icon={p.fahrenheit === fahrenheit ? "checkmark-circle-outline" : "ellipse-outline"} label={fahrenheit ? "Фаренгейты · °F" : "Цельсий · °C"} onPress={() => onChange({ fahrenheit })} />)}</Group><Text style={styles.note}>Скорость ветра показываем в метрах в секунду.</Text></>}
    {page === "scene" && <><Group label="ОФОРМЛЕНИЕ ПРИЛОЖЕНИЯ">{sceneModes.map(([sceneMode, label]) => <Row key={sceneMode} icon={p.sceneMode === sceneMode ? "checkmark-circle-outline" : "ellipse-outline"} label={label} onPress={() => onChange({ sceneMode })} />)}</Group><Text style={styles.note}>Авто — по местному времени города и закату. Меняется оформление, а не прогноз. Фото города можно включать отдельно.</Text></>}
    {page === "widget" && Platform.OS === "android" && <>
      <WidgetSettingsPreview forecast={forecast} preferences={p} />
      <View><Row icon="add-circle-outline" label={addingWidget ? "Открываем окно добавления…" : "Добавить на главный экран"} hint="Нужно свободное место 3 × 2 клетки" onPress={() => void addWidget()} disabled={addingWidget} />
        <Row icon="time-outline" label="По времени города" hint="Автоматическая смена оформления" value={p.widgetAutoTheme} onValueChange={(widgetAutoTheme) => onChange({ widgetAutoTheme })} />
        {!p.widgetAutoTheme && <Row icon="moon-outline" label="Тёмное оформление" value={p.widgetDark} onValueChange={(widgetDark) => onChange({ widgetDark })} />}
        <Row icon="shirt-outline" label="Совет по одежде" value={p.widgetClothes} onValueChange={(widgetClothes) => onChange({ widgetClothes })} />
        <Row icon="help-circle-outline" label="Как добавить виджет" onPress={() => setHelp(!help)} />
      </View>
      {help && <Text style={styles.note}>Зажмите пустое место на рабочем экране → Виджеты → Погода и что надеть. Если места нет, выберите другой экран. Переносить значок приложения не нужно.</Text>}
      <Text style={styles.note}>Обновляется примерно раз в 30 минут. Android может обновлять реже для экономии заряда.</Text>
    </>}
    {page === "comfort" && <><Group label="ВАШИ ПЛАНЫ"><UnderlineTabs label="Стиль одежды" choices={Object.entries(occasionLabels).map(([value, label]) => ({ value: value as OutfitOccasion, label }))} value={p.occasion} onChange={(occasion) => onChange({ occasion })} /></Group><Group label="КАК ВЫ ПЕРЕНОСИТЕ ХОЛОД"><UnderlineTabs label="Чувствительность к холоду" choices={Object.entries(warmthLabels).map(([value, label]) => ({ value: value as WarmthPreference, label }))} value={p.warmth} onChange={(warmth) => onChange({ warmth })} /></Group><Text style={styles.note}>Применяется к подбору одежды в приложении и виджете.</Text></>}
    {page === "morning" && Platform.OS === "android" && <>
      <Row icon="notifications-outline" label={morningBusy ? "Включаем…" : "Присылать утром"} hint="Погода на день и что надеть" value={p.morningAdvice} onValueChange={(enabled) => { if (!morningBusy) onMorningAdvice(enabled); }} />
      {p.morningAdvice && <Group label="ВРЕМЯ">{morningTimes.map((morningTime) => <Row key={morningTime} icon={p.morningTime === morningTime ? "checkmark-circle-outline" : "ellipse-outline"} label={morningTime} onPress={() => onChange({ morningTime })} />)}</Group>}
      <Text style={styles.note}>Одно уведомление в день для выбранного города. Совет составляем на устройстве по последнему прогнозу; если на главном экране есть виджет, текст обновляется и в фоне. Отключить можно здесь или в настройках уведомлений Android.</Text>
    </>}
    {page === "about" && <><Text style={styles.note}>Настройки хранятся на устройстве. Аккаунт не требуется. Геолокация — только по нажатию; координаты передаются сервису погоды.</Text><Text style={styles.note}>AppMetrica помогает измерять посещения, возвраты и использование подборок. Статистика использования включена по умолчанию. Город, поисковые запросы, координаты и названия вещей в события не передаются.</Text>{Platform.OS === "android" && <Row icon="megaphone-outline" label="Реклама по интересам" hint="Только с вашего разрешения, для пользователей 18+" value={p.personalizedAds} onValueChange={changeAdPersonalization} />}{children}<Row icon="code-slash-outline" label="Диагностика разработчика" value={p.diagnostics} onValueChange={(diagnostics) => onChange({ diagnostics })} /></>}
    {page === "feedback" && <><Row icon="mail-outline" label="Написать разработчику" onPress={onFeedback} /><Row icon="heart-outline" label={`Оценить в ${storeName}`} onPress={onRate} /><Row icon="notifications-outline" label="Напоминать об оценке" hint="В приложении, без уведомлений" value={reviewsEnabled} onValueChange={onReviewsChange} /></>}
  </View>;
}
const styles = StyleSheet.create({
  screen: { gap: 18, width: "100%", maxWidth: 640, alignSelf: "center", paddingTop: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
  back: { minWidth: 36, minHeight: 44, justifyContent: "center" },
  title: { fontFamily: fontNames.heading, fontSize: 29, lineHeight: 38, color: "#242b29", flexShrink: 1 },
  group: { gap: 6 },
  groupLabel: { fontSize: 10, lineHeight: 15, fontWeight: "600", letterSpacing: 1.7, color: "#506057" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: "#d3dcd0" },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  label: { fontSize: 14, lineHeight: 21, color: "#242b29" },
  trailing: { fontSize: 13, lineHeight: 20, color: "#505c56", maxWidth: "38%", flexShrink: 1 },
  hint: { fontSize: 11, lineHeight: 16, color: "#59665e" },
  note: { fontSize: 12, lineHeight: 19, color: "#59665e", paddingVertical: 8 },
  pressed: { opacity: .6 }, disabled: { opacity: .5 },
  footer: { fontSize: 11, lineHeight: 17, textAlign: "center", color: "#657169", paddingBottom: 4 },
});
