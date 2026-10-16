import { useState, type ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Switch, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, fontNames } from "./typography";
import { sceneModes, type SceneMode } from "./CityBackdrop";
import type { City } from "../../src/lib/weather";

type Glyph = keyof typeof Ionicons.glyphMap;
interface SettingsPreferences {
  cityBackground: boolean; sceneMode: SceneMode; widgetDark: boolean; widgetAutoTheme: boolean;
  widgetClothes: boolean; fahrenheit: boolean; diagnostics: boolean;
}
interface Props {
  preferences: SettingsPreferences; onChange: (change: Partial<SettingsPreferences>) => void;
  version: string; checking: boolean; onCheck: () => void;
  city?: City; favorites: City[]; locating: boolean;
  onCity: () => void; onLocate: () => void; onFavorite: (city: City) => void;
  onWidget: () => void; onRate: () => void; reviewsEnabled: boolean;
  onReviewsChange: (enabled: boolean) => void; children: ReactNode;
}

/** @param {object} props - Значок, подпись и содержимое группы. @returns {React.JSX.Element} Группа связанных настроек. */
function Group({ label, children }: { label: string; children: ReactNode }): React.JSX.Element {
  return <View style={styles.group}><Text style={styles.groupLabel}>{label}</Text><View style={styles.card}>{children}</View></View>;
}

/** @param {object} props - Подписи строки, значок и действие либо переключатель. @returns {React.JSX.Element} Компактная доступная строка настройки. */
function Row({ icon, label, hint, onPress, value, onValueChange, disabled = false }: {
  icon: Glyph; label: string; hint?: string; onPress?: () => void; value?: boolean;
  onValueChange?: (value: boolean) => void; disabled?: boolean;
}): React.JSX.Element {
  const content = <>
    <View style={styles.icon}><Ionicons name={icon} size={19} color="#31574a" /></View>
    <View style={styles.copy}><Text style={styles.label}>{label}</Text>{hint && <Text style={styles.hint}>{hint}</Text>}</View>
    {onValueChange ? <Switch accessibilityLabel={label} value={value} onValueChange={onValueChange} trackColor={{ false: "#dce2d6", true: "#a9c9ba" }} thumbColor={value ? "#21483e" : "#ffffff"} /> : <Ionicons name="chevron-forward" size={16} color="#839185" />}
  </>;
  return onPress ? <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}>{content}</Pressable> : <View style={styles.row}>{content}</View>;
}

/** @param {object} props - Подпись, значок и подробности. @returns {React.JSX.Element} Раскрываемая справка без постоянной стены текста. */
function Details({ label, icon, children }: { label: string; icon: Glyph; children: ReactNode }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return <View>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.icon}><Ionicons name={icon} size={19} color="#31574a" /></View>
      <Text style={[styles.label, styles.copy]}>{label}</Text><Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color="#839185" />
    </Pressable>
    {open && <View style={styles.details}>{children}</View>}
  </View>;
}

/** @param {Props} props - Настройки устройства и существующие действия приложения. @returns {React.JSX.Element} Лаконичная вкладка настроек с раскрываемыми пояснениями. */
export function SettingsScreen({ preferences: p, onChange, version, checking, onCheck, city, favorites, locating, onCity, onLocate, onFavorite, onWidget, onRate, reviewsEnabled, onReviewsChange, children }: Props): React.JSX.Element {
  return <View style={styles.screen}>
    <View style={styles.intro}><Text style={styles.title}>Настройки</Text><Text style={styles.hint}>Ваш город, оформление и удобные мелочи.</Text></View>
    <Group label="ГОРОД И ПРОГНОЗ">
      <Row icon="location-outline" label={city?.name || "Выбрать город"} hint="Город для прогноза и виджета" onPress={onCity} />
      <Row icon="navigate-outline" label={locating ? "Определяем место…" : "Моё местоположение"} onPress={onLocate} disabled={locating} />
      {favorites.length > 0 && <Details label="Избранные города" icon="star-outline">{favorites.map((favorite) => <Row key={favorite.id} icon="location-outline" label={favorite.name} onPress={() => onFavorite(favorite)} />)}</Details>}
      <Row icon="thermometer-outline" label="Температура в °F" hint={p.fahrenheit ? "Фаренгейты" : "Сейчас в градусах Цельсия"} value={p.fahrenheit} onValueChange={(fahrenheit) => onChange({ fahrenheit })} />
    </Group>
    <Group label="ОФОРМЛЕНИЕ">
      <Row icon="image-outline" label="Атмосферный фон" hint="Фото города и настроение неба" value={p.cityBackground} onValueChange={(cityBackground) => onChange({ cityBackground })} />
      {p.cityBackground && <View style={styles.sceneArea}>
        <View style={styles.segments}>{sceneModes.map(([sceneMode, label]) => <Pressable key={sceneMode} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: p.sceneMode === sceneMode }} onPress={() => onChange({ sceneMode })} style={[styles.segment, p.sceneMode === sceneMode && styles.selected]}><Text style={[styles.segmentText, p.sceneMode === sceneMode && styles.selectedText]}>{label}</Text></Pressable>)}</View>
        <Text style={styles.hint}>{p.sceneMode === "auto" ? "Меняется по местному времени города." : "Меняется только оформление, не прогноз."}</Text>
      </View>}
    </Group>
    <Group label="ВИДЖЕТ">
      {Platform.OS === "android" ? <Row icon="add-circle-outline" label="Добавить на главный экран" hint="Погода и одежда всегда под рукой" onPress={onWidget} /> : <View style={styles.details}><Text style={styles.hint}>Виджет доступен в Android-приложении.</Text></View>}
      <Row icon="time-outline" label="По времени города" hint="Утро, день, вечер и ночь" value={p.widgetAutoTheme} onValueChange={(widgetAutoTheme) => onChange({ widgetAutoTheme })} />
      {!p.widgetAutoTheme && <Row icon="moon-outline" label="Тёмный виджет" value={p.widgetDark} onValueChange={(widgetDark) => onChange({ widgetDark })} />}
      <Row icon="shirt-outline" label="Одежда в виджете" value={p.widgetClothes} onValueChange={(widgetClothes) => onChange({ widgetClothes })} />
      <Details label="Как разместить виджет" icon="help-circle-outline"><Text style={styles.note}>Нужен свободный участок примерно 3 × 2 клетки на текущем рабочем экране. Если места нет: зажмите пустое место на другом экране → Виджеты → Погода и что надеть и перетащите виджет. Переносить значок приложения не нужно.</Text><Text style={styles.note}>Обновляется примерно раз в 30 минут. Android может откладывать обновление для экономии заряда.</Text></Details>
    </Group>
    <Group label="ПРИЛОЖЕНИЕ">
      {Platform.OS === "android" && <Row icon="cloud-download-outline" label={checking ? "Проверяем обновления…" : "Проверить обновления"} hint={`Версия ${version} · проверяем и при запуске`} onPress={onCheck} disabled={checking} />}
      <Row icon="heart-outline" label="Оценить в RuStore" hint="Ваш отзыв помогает нам развиваться" onPress={onRate} />
      <Row icon="notifications-outline" label="Напоминать об оценке" hint="В приложении, без уведомлений" value={reviewsEnabled} onValueChange={onReviewsChange} />
      <Details label="О приложении и данных" icon="information-circle-outline">
        <Text style={styles.note}>Настройки хранятся на устройстве. Аккаунт не требуется.</Text>
        <Text style={styles.note}>Геолокация — только по нажатию. Округлённые координаты передаются MET Norway для прогноза.</Text>
        <Text style={styles.note}>Свободные фото рядом с центром выбранного города — через Wikimedia Commons. Если снимка нет или нет сети, показываем атмосферное небо. GPS-позицию для поиска фото не передаём.</Text>
        {children}
        <Row icon="code-slash-outline" label="Диагностика разработчика" value={p.diagnostics} onValueChange={(diagnostics) => onChange({ diagnostics })} />
      </Details>
    </Group>
    <Text style={styles.footer}>Погода и что надеть · {version}</Text>
  </View>;
}

const styles = StyleSheet.create({
  screen: { gap: 20 },
  intro: { gap: 5, paddingBottom: 2 },
  title: { fontFamily: fontNames.heading, fontSize: 29, lineHeight: 37, color: "#21483e" },
  group: { gap: 8 },
  groupLabel: { fontSize: 10, lineHeight: 15, fontWeight: "700", letterSpacing: 1.3, color: "#758475", paddingHorizontal: 4 },
  card: { backgroundColor: "#ffffff", borderRadius: 20, paddingHorizontal: 12, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 57, paddingVertical: 10 },
  icon: { width: 32, height: 32, borderRadius: 11, backgroundColor: "#eef1e8", alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "600", color: "#294c41" },
  hint: { fontSize: 11, lineHeight: 17, color: "#7c877d" },
  note: { fontSize: 12, lineHeight: 19, color: "#6b7b70" },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.5 },
  details: { paddingVertical: 10, gap: 12 },
  sceneArea: { gap: 7, paddingBottom: 14 },
  segments: { flexDirection: "row", flexWrap: "wrap", backgroundColor: "#eef1e8", borderRadius: 12, padding: 3 },
  segment: { flexGrow: 1, minWidth: 45, minHeight: 44, paddingHorizontal: 6, justifyContent: "center", alignItems: "center", borderRadius: 10 },
  segmentText: { fontSize: 11, lineHeight: 17, fontWeight: "600", color: "#557163" },
  selected: { backgroundColor: "#21483e" },
  selectedText: { color: "#ffffff" },
  footer: { fontSize: 11, lineHeight: 17, textAlign: "center", color: "#8a9389", paddingBottom: 4 },
});
