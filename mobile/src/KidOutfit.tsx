import { Pressable, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, fontNames } from "./typography";
import { useTimeTheme, type TimeTheme } from "./timeTheme";
import { UnderlineTabs } from "./UnderlineTabs";
import { kidAgeLabels, kidPlanLabels, type KidAge, type KidOutfit, type KidPlan } from "../../src/lib/kids";
import { outfitSearchUrl, partnerLinksEnabled } from "./outfitItems";
import { trackEvent } from "./analytics";

interface PanelProps {
  outfit: KidOutfit; age: KidAge; plan: KidPlan; pickup?: string;
  onAge: (age: KidAge) => void; onPlan: (plan: KidPlan) => void; onOpen: (url: string) => Promise<void>;
}

/** @param {PanelProps} props - Комплект ребёнка, возраст, сценарий и переходы в магазины. @returns {React.JSX.Element} Детский комплект по слоям с вещами «с собой» и погодой к 18:00. */
export function KidOutfitPanel({ outfit, age, plan, pickup, onAge, onPlan, onOpen }: PanelProps): React.JSX.Element {
  const theme = useTimeTheme();
  const styles = createStyles(theme);
  /** @param {"ozon" | "wb"} store - Магазин. @param {string} item - Вещь. @returns {void} Открывает поиск детской вещи. */
  function open(store: "ozon" | "wb", item: string): void {
    trackEvent("store_open", { store });
    void onOpen(outfitSearchUrl(store, item, "kid"));
  }
  return <View style={styles.panel}>
    <UnderlineTabs label="Возраст ребёнка" choices={(Object.keys(kidAgeLabels) as KidAge[]).map((value) => ({ value, label: kidAgeLabels[value] }))} value={age} onChange={onAge} />
    <UnderlineTabs label="Куда идёт ребёнок" choices={(Object.keys(kidPlanLabels) as KidPlan[]).map((value) => ({ value, label: kidPlanLabels[value] }))} value={plan} onChange={onPlan} />
    <View style={styles.heading}><Text style={styles.title}>{outfit.title}</Text><Text style={styles.note}>{outfit.note}</Text></View>
    <View>
      {outfit.items.map((item, index) => <View key={item} style={styles.row}>
        <Text style={styles.number}>{String(index + 1).padStart(2, "0")}</Text>
        <Text style={styles.item}>{item}</Text>
        <Pressable accessibilityRole="link" accessibilityLabel={`Найти похожее: ${item} в Ozon`} onPress={() => open("ozon", item)} style={styles.store}><Text style={styles.storeText}>Ozon</Text></Pressable>
        <Pressable accessibilityRole="link" accessibilityLabel={`Найти похожее: ${item} в Wildberries`} onPress={() => open("wb", item)} style={styles.store}><Text style={styles.storeText}>WB</Text></Pressable>
      </View>)}
    </View>
    {!!outfit.extras.length && <View style={styles.extras}><Ionicons name="bag-handle-outline" size={20} color={theme.primary} /><View style={styles.extrasCopy}><Text style={styles.extrasTitle}>С собой</Text>{outfit.extras.map((extra) => <Text key={extra} style={styles.extra}>{extra}</Text>)}</View></View>}
    {!!pickup && <View style={styles.extras}><Ionicons name="time-outline" size={20} color={theme.primary} /><Text style={[styles.extra, styles.extrasCopy]}>{pickup}</Text></View>}
    <Text style={styles.disclaimer}>Ориентир, а не правило. Следите за ребёнком: вспотел — снимите слой, замёрз — добавьте.{partnerLinksEnabled ? " Ссылки на магазины партнёрские." : ""}</Text>
  </View>;
}

/** @param {object} props - Комплект ребёнка и переход в «Что надеть». @returns {React.JSX.Element} Карточка на главном экране вместо взрослого образа. */
export function KidOutfitCard({ outfit, plan, onPress }: { outfit: KidOutfit; plan: KidPlan; onPress: () => void }): React.JSX.Element {
  const theme = useTimeTheme();
  const styles = createStyles(theme);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Что надеть ребёнку: ${outfit.title}. ${outfit.items.join(", ")}`} onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
    <Text style={styles.eyebrow}>{`ЧТО НАДЕТЬ РЕБЁНКУ · ${kidPlanLabels[plan].toUpperCase()}`}</Text>
    <Text style={styles.title}>{outfit.title}</Text>
    <Text style={styles.note}>{outfit.items.slice(0, 4).map((item, index) => index ? item.charAt(0).toLocaleLowerCase("ru") + item.slice(1) : item).join(", ")}{outfit.items.length > 4 ? "…" : ""}</Text>
    <View style={styles.cta}><Text style={styles.ctaText}>Весь комплект</Text><Ionicons name="arrow-forward-outline" size={19} color={theme.accent} style={{ transform: [{ rotate: "-45deg" }] }} /></View>
  </Pressable>;
}

/** @param {TimeTheme} theme - Палитра времени суток. @returns {object} Стили детского комплекта. */
const createStyles = (theme: TimeTheme) => StyleSheet.create({
  panel: { gap: 14 },
  heading: { gap: 5, paddingTop: 6 },
  title: { fontFamily: fontNames.heading, fontSize: 26, lineHeight: 32, fontWeight: "600", color: theme.primary },
  note: { fontSize: 13, lineHeight: 20, color: theme.text },
  row: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderColor: theme.divider },
  number: { width: 26, fontSize: 13, color: theme.muted },
  item: { flex: 1, fontSize: 15, lineHeight: 21, color: theme.primary },
  store: { minHeight: 40, minWidth: 44, paddingHorizontal: 8, justifyContent: "center", alignItems: "center", borderRadius: 8, borderWidth: 1, borderColor: theme.divider },
  storeText: { fontSize: 12, fontWeight: "600", color: theme.primary },
  extras: { flexDirection: "row", gap: 12, alignItems: "flex-start", paddingVertical: 10, borderBottomWidth: 1, borderColor: theme.divider },
  extrasCopy: { flex: 1, gap: 3 },
  extrasTitle: { fontSize: 15, fontWeight: "600", color: theme.primary },
  extra: { fontSize: 13, lineHeight: 20, color: theme.text },
  disclaimer: { fontSize: 11, lineHeight: 16, color: theme.muted, textAlign: "center" },
  card: { paddingVertical: 18, gap: 6, borderBottomWidth: 1, borderColor: theme.divider },
  pressed: { opacity: .7 },
  eyebrow: { fontSize: 11, lineHeight: 16, letterSpacing: 1.4, fontWeight: "700", color: theme.primary },
  cta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  ctaText: { fontSize: 16, color: theme.accent, textDecorationLine: "underline" },
});
