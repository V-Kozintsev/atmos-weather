import { Image, Platform, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text, fontNames } from "./typography";
import { SvgXml } from "react-native-svg";
import { ozonLogo } from "./marketplaceLogos";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { OutfitAdvice, OutfitOccasion, WarmthPreference } from "../../src/lib/outfit";
import { ClothingItem } from "./OutfitPreview";
import { outfitItems, outfitSearchUrl } from "./outfitItems";
import { s } from "./ui";

// Иконка издателя Wildberries из Google Play: com.wildberries.ru.
const wbLogo = require("../assets/brands/wildberries.webp");

type Glyph = keyof typeof Ionicons.glyphMap;
interface Choice<T extends string> { value: T; text: string; icon: Glyph; weight?: number }
const occasions: Choice<OutfitOccasion>[] = [
  { value: "casual", text: "На каждый день", icon: "shirt-outline", weight: 1.6 },
  { value: "office", text: "Офис", icon: "briefcase-outline" },
  { value: "sport", text: "Активный", icon: "walk-outline", weight: 1.25 },
];
const temperatures: Choice<WarmthPreference>[] = [
  { value: "balanced", text: "Обычно", icon: "thermometer-outline" },
  { value: "warmer", text: "Я мёрзну", icon: "snow-outline" },
  { value: "lighter", text: "Мне жарко", icon: "sunny-outline" },
];

/** @param {object} props - Подпись группы, варианты, выбор и обработчик. @returns {React.JSX.Element} Компактная подписанная группа настроек с иконками. */
function PreferenceGroup<T extends string>({ label, choices, value, onChange }: { label: string; choices: Choice<T>[]; value: T; onChange: (next: T) => void }): React.JSX.Element {
  return <View style={styles.group}>
    <Text style={styles.groupLabel}>{label}</Text>
    <View style={styles.segments} accessibilityLabel={label}>
      {choices.map((choice) => <Pressable key={choice.value} accessibilityRole="radio" accessibilityLabel={choice.text} accessibilityState={{ checked: value === choice.value }} onPress={() => onChange(choice.value)} style={[styles.choice, { flex: choice.weight || 1 }, value === choice.value && styles.selected]}>
        <Ionicons name={choice.icon} size={16} color={value === choice.value ? "#f6f8f2" : "#31574a"} />
        <Text style={[styles.choiceText, value === choice.value && styles.selectedText]}>{choice.text}</Text>
      </Pressable>)}
    </View>
  </View>;
}

/** @param {object} props - Магазин, название вещи и действие поиска. @returns {React.JSX.Element} Официальная иконка магазина с доступной зоной касания. */
function StoreLink({ store, item, onPress }: { store: "Ozon" | "WB"; item: string; onPress: () => void }): React.JSX.Element {
  return <Pressable accessibilityRole="link" accessibilityLabel={`Найти ${item} в ${store}`} onPress={onPress} style={styles.storeTouch}>
    {store === "Ozon" ? <View style={styles.ozonLogo}><SvgXml xml={ozonLogo} width={48} height={18} /></View> : <Image source={wbLogo} resizeMode="contain" fadeDuration={0} accessible={false} style={styles.storeLogo} />}
  </Pressable>;
}

/** @param {object} props - Комплект, текущие настройки и действия изменения и поиска. @returns {React.JSX.Element} Настройки образа и компактные строки поиска похожих вещей. */
export function OutfitCustomization({ advice, gender, occasion, warmth, onOccasionChange, onWarmthChange, onOpen }: {
  advice: OutfitAdvice; gender: "woman" | "man"; occasion: OutfitOccasion; warmth: WarmthPreference;
  onOccasionChange: (value: OutfitOccasion) => void; onWarmthChange: (value: WarmthPreference) => void; onOpen: (url: string) => Promise<void>;
}): React.JSX.Element {
  const { fontScale } = useWindowDimensions();
  const items = outfitItems(advice, gender, occasion);
  return <View style={styles.content}>
    <View style={styles.settings}>
      <PreferenceGroup label="Стиль" choices={occasions} value={occasion} onChange={onOccasionChange} />
      <View style={styles.divider} />
      <PreferenceGroup label="Ощущение температуры" choices={temperatures} value={warmth} onChange={onWarmthChange} />
    </View>
    <View style={styles.heading}><Text style={styles.title}>Найти похожее</Text><Text style={styles.hint}>Поиск в магазинах · не точные товары с фото</Text></View>
    <View>
      {items.map((item) => <View key={`${item.label}:${item.text}`} style={[styles.item, fontScale > 1.2 && styles.itemWrapped]}>
        <View style={styles.thumbnail}>{item.photo ? <ClothingItem item={item.photo} size={48} /> : <Ionicons name="bag-handle-outline" size={24} color="#31574a" />}</View>
        <View style={s.flex}><Text style={styles.itemName}>{item.text}</Text><Text style={styles.category}>{item.label}</Text></View>
        <View style={[styles.links, fontScale > 1.2 && styles.linksWrapped]}>
          <StoreLink store="Ozon" item={item.text} onPress={() => void onOpen(outfitSearchUrl("ozon", item.text, gender))} />
          <StoreLink store="WB" item={item.text} onPress={() => void onOpen(outfitSearchUrl("wb", item.text, gender))} />
        </View>
      </View>)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  settings: { padding: 12, gap: 12, backgroundColor: "#f0f2e9", borderRadius: 18 },
  group: { gap: 7 },
  groupLabel: { fontSize: 14, lineHeight: 20, color: "#294a3d" },
  segments: { flexDirection: "row", backgroundColor: "#e7ebdf", borderRadius: 12, overflow: "hidden" },
  choice: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 7, paddingHorizontal: 4, borderRadius: 12 },
  selected: { backgroundColor: "#21483e" },
  choiceText: { color: "#31574a", fontSize: 12, lineHeight: 17, flex: 1, minWidth: 0, textAlign: "center" },
  selectedText: { color: "#f6f8f2", fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#d7ddcf" },
  heading: { gap: 4 },
  title: { fontFamily: fontNames.heading, fontSize: 27, lineHeight: 33, fontWeight: "600", color: "#21483e" },
  hint: { fontSize: 12, lineHeight: 18, color: "#788278" },
  item: { minHeight: 68, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#dce1d5" },
  itemWrapped: { flexWrap: "wrap" },
  thumbnail: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  itemName: { fontSize: 14, lineHeight: 19, fontWeight: "600", color: "#21483e" },
  category: { fontSize: 11, lineHeight: 16, color: "#7c857b", marginTop: 2 },
  links: { flexDirection: "row", alignItems: "center", gap: 4 },
  linksWrapped: { width: "100%", paddingLeft: 56 },
  storeTouch: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" },
  storeLogo: { width: 32, height: 32, borderRadius: 8 },
  ozonLogo: { width: 60, height: 32, borderRadius: 8, backgroundColor: "#edf3ff", alignItems: "center", justifyContent: "center" },
});
