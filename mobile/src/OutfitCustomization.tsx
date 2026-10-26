import { useTimeTheme, type TimeTheme } from "./timeTheme";
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text, fontNames } from "./typography";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { OutfitAdvice, OutfitOccasion, WarmthPreference } from "../../src/lib/outfit";
import { ClothingItem } from "./OutfitPreview";
import { outfitItems, outfitSearchUrl } from "./outfitItems";
import { UnderlineTabs, type UnderlineChoice } from "./UnderlineTabs";
import { occasionLabels, warmthLabels } from "./outfitPreferences";
import { s } from "./ui";

// Иконки издателей из Google Play: ru.ozon.app.android и com.wildberries.ru.
const storeLogos = { Ozon: require("../assets/brands/ozon.webp"), WB: require("../assets/brands/wildberries.webp") };
const occasions: UnderlineChoice<OutfitOccasion>[] = [
  { value: "casual", label: occasionLabels.casual, icon: "shirt-outline", weight: 1.6 },
  { value: "office", label: occasionLabels.office, icon: "briefcase-outline" },
  { value: "sport", label: occasionLabels.sport, icon: "walk-outline", weight: 1.2 },
];
const temperatures: WarmthPreference[] = ["warmer", "balanced", "lighter"];

/** @param {object} props - Чувствительность к холоду и обработчик выбора. @returns {React.JSX.Element} Доступная шкала с тремя именованными положениями без заливки сегментов. */
function WarmthScale({ value, onChange }: { value: WarmthPreference; onChange: (next: WarmthPreference) => void }): React.JSX.Element {
  const theme = useTimeTheme();
  const styles = createStyles(theme);
  return <View style={styles.group}>
    <Text style={styles.groupLabel}>Как вы переносите холод</Text>
    <View style={styles.scale} accessibilityRole="radiogroup" accessibilityLabel="Чувствительность к холоду">
      <View pointerEvents="none" style={styles.scaleLine} />
      {temperatures.map((option) => <Pressable key={option} accessibilityRole="radio" accessibilityLabel={warmthLabels[option]} accessibilityState={{ checked: value === option }} onPress={() => onChange(option)} style={styles.scaleChoice}>
        <View style={[styles.dotRing, value === option && styles.dotRingSelected]}>{value === option && <View style={styles.dot} />}</View>
        <Text style={[styles.scaleLabel, value === option && styles.scaleLabelSelected]}>{warmthLabels[option]}</Text>
      </Pressable>)}
    </View>
    <Text style={styles.hint}>Подберём слои с учётом вашего комфорта.</Text>
  </View>;
}

/** @param {object} props - Магазин, название вещи и переход к поиску. @returns {React.JSX.Element} Сохранённая брендовая иконка со стрелкой внешней ссылки и зоной касания 44px. */
function StoreLink({ store, item, onPress }: { store: "Ozon" | "WB"; item: string; onPress: () => void }): React.JSX.Element {
  const theme = useTimeTheme();
  const styles = createStyles(theme);
  return <Pressable accessibilityRole="link" accessibilityLabel={`Найти похожее: ${item} в ${store === "WB" ? "Wildberries" : "Ozon"}`} accessibilityHint="Откроется поиск в магазине" onPress={onPress} style={styles.storeTouch}>
    <Image source={storeLogos[store]} resizeMode="contain" fadeDuration={0} accessible={false} style={styles.storeLogo} />
    <Ionicons name="arrow-forward-outline" color={theme.muted} size={10} style={styles.externalArrow} />
  </Pressable>;
}

/** @param {object} props - Реальный комплект, видимость настроек, стиль, комфорт и действия. @returns {React.JSX.Element} Настройки без капсул и постоянно доступный поиск похожих вещей в Ozon/WB. */
export function OutfitCustomization({ advice, gender, occasion, warmth, settingsVisible = true, onOccasionChange, onWarmthChange, onOpen }: {
  advice: OutfitAdvice; gender: "woman" | "man"; occasion: OutfitOccasion; warmth: WarmthPreference; settingsVisible?: boolean;
  onOccasionChange: (value: OutfitOccasion) => void; onWarmthChange: (value: WarmthPreference) => void; onOpen: (url: string) => Promise<void>;
}): React.JSX.Element {
  const theme = useTimeTheme();
  const styles = createStyles(theme);
  const { fontScale } = useWindowDimensions();
  const items = outfitItems(advice, gender, occasion);
  return <View style={styles.content}>
    {settingsVisible && <View style={styles.settings}>
      <Text style={styles.title}>Подстроить под себя</Text>
      <View style={styles.group}>
        <Text style={styles.groupLabel}>Ваши планы</Text>
        <UnderlineTabs label="Стиль одежды" choices={occasions} value={occasion} onChange={onOccasionChange} />
      </View>
      <View style={styles.divider} />
      <WarmthScale value={warmth} onChange={onWarmthChange} />
    </View>}
    <View style={styles.heading}>
      <Text style={styles.title}>Найти похожие вещи</Text>
      <Text style={styles.explanation}>Нажмите Ozon или WB рядом с вещью — откроется поиск в магазине.</Text>
      <Text style={styles.hint}>Это похожие вещи, не товары с фото.</Text>
    </View>
    <View>
      {items.map((item) => <View key={`${item.label}:${item.text}`} style={[styles.item, fontScale > 1.25 && styles.itemWrapped]}>
        <View style={styles.thumbnail}>{item.photo ? <ClothingItem item={item.photo} size={50} /> : <Ionicons name="bag-handle-outline" size={24} color={theme.primary} />}</View>
        <View style={s.flex}><Text style={styles.itemName}>{item.text}</Text><Text style={styles.category}>{item.label}</Text></View>
        <View style={[styles.links, fontScale > 1.25 && styles.linksWrapped]}>
          <StoreLink store="Ozon" item={item.text} onPress={() => void onOpen(outfitSearchUrl("ozon", item.text, gender))} />
          <StoreLink store="WB" item={item.text} onPress={() => void onOpen(outfitSearchUrl("wb", item.text, gender))} />
        </View>
      </View>)}
    </View>
    <Text style={styles.hint}>Выбирайте размер и проверяйте состав в магазине.</Text>
  </View>;
}

/** @param {TimeTheme} theme - Палитра времени суток. @returns {object} Стили с общими цветами интерфейса. */
const createStyles = (theme: TimeTheme) => StyleSheet.create({
  content: { gap: 12 },
  settings: { gap: 16, borderBottomWidth: 1, borderBottomColor: theme.divider, paddingBottom: 18, marginBottom: 4 },
  group: { gap: 8 },
  groupLabel: { fontSize: 13, lineHeight: 20, color: theme.muted },
  divider: { height: 1, backgroundColor: theme.divider },
  scale: { flexDirection: "row", alignItems: "flex-start", position: "relative", paddingTop: 2 },
  scaleLine: { position: "absolute", left: "16.666%", right: "16.666%", top: 13, height: 1, backgroundColor: theme.accent },
  scaleChoice: { flex: 1, minHeight: 60, alignItems: "center", gap: 8, paddingHorizontal: 3, paddingBottom: 4 },
  dotRing: { width: 22, height: 22, borderWidth: 1, borderColor: theme.accent, borderRadius: 11, backgroundColor: theme.page, alignItems: "center", justifyContent: "center" },
  dotRingSelected: { borderColor: theme.accent },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: theme.accent },
  scaleLabel: { fontSize: 12, lineHeight: 18, color: theme.muted, textAlign: "center" },
  scaleLabelSelected: { color: theme.accent, fontWeight: "600" },
  heading: { gap: 5, paddingTop: 4 },
  title: { fontFamily: fontNames.heading, fontSize: 26, lineHeight: 32, fontWeight: "600", color: theme.primary },
  explanation: { fontSize: 13, lineHeight: 20, color: theme.muted },
  hint: { fontSize: 11, lineHeight: 17, color: theme.muted },
  item: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: theme.divider },
  itemWrapped: { flexWrap: "wrap" },
  thumbnail: { width: 50, height: 50, alignItems: "center", justifyContent: "center" },
  itemName: { fontSize: 13, lineHeight: 19, color: theme.primary },
  category: { fontSize: 10, lineHeight: 15, color: theme.muted, marginTop: 1 },
  links: { flexDirection: "row", alignItems: "center", gap: 6 },
  linksWrapped: { width: "100%", justifyContent: "flex-end" },
  storeTouch: { minHeight: 44, minWidth: 48, alignItems: "center", justifyContent: "center", paddingRight: 5 },
  storeLogo: { width: 30, height: 30, borderRadius: 7 },
  externalArrow: { position: "absolute", right: 0, top: 4, transform: [{ rotate: "-45deg" }] },
});
