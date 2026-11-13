import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ComfortIcon, type ComfortSymbol } from "./ComfortIcon";
import type { ComfortVote } from "./comfortPolicy";
import { ClothingItem } from "./OutfitPreview";
import { Text } from "./typography";

const choices: { value: ComfortVote; label: string; icon: ComfortSymbol }[] = [{ value: "cold", label: "Мёрз", icon: "cold" }, { value: "comfortable", label: "Комфортно", icon: "comfortable" }, { value: "hot", label: "Было жарко", icon: "hot" }];

/** @param {object} props - Видимость, вариант одежды и сохранение ответа. @returns {React.JSX.Element} Нижнее окно комфорта с иконками из утверждённого макета. */
export function ComfortSheet({ visible, gender, onClose, onSave }: { visible: boolean; gender: "woman" | "man"; onClose: () => void; onSave: (value: ComfortVote) => Promise<void> }): React.JSX.Element {
  const [vote, setVote] = useState<ComfortVote>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { height } = useWindowDimensions();
  useEffect(() => { if (visible) { setVote(undefined); setError(""); } }, [visible]);
  /** @returns {Promise<void>} Сохраняет единственный ответ дня и оставляет окно открытым при ошибке записи. */
  async function save(): Promise<void> {
    if (!vote || saving) return;
    setSaving(true); setError("");
    try { await onSave(vote); } catch { setError("Не удалось сохранить ответ. Попробуйте ещё раз."); } finally { setSaving(false); }
  }
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <View style={styles.backdrop}><Pressable accessibilityRole="button" accessibilityLabel="Закрыть ответ о комфорте" onPress={onClose} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={["bottom", "left", "right"]} style={[styles.sheet, { maxHeight: height * .9 }]} accessibilityViewIsModal><View style={styles.handle} /><ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Как было по ощущениям?</Text><Text style={styles.description}>Подходит ли вам сегодняшний комплект?</Text>
        <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel="Ваш комфорт после прогулки">{choices.map((choice) => <Pressable key={choice.value} accessibilityRole="radio" accessibilityLabel={choice.label} accessibilityState={{ checked: vote === choice.value }} onPress={() => setVote(choice.value)} style={[styles.choice, vote === choice.value && styles.selected]}><ComfortIcon kind={choice.icon} /><Text style={styles.label}>{choice.label}</Text></Pressable>)}</View>
        <View style={styles.explanation}><Text style={styles.explanationTitle}>{vote === "cold" ? "Завтра предложим чуть теплее." : vote === "hot" ? "Завтра предложим чуть легче." : vote === "comfortable" ? "Сохраним подходящий вам уровень тепла." : "Ваш ответ поможет точнее подобрать одежду."}</Text>
          <View style={styles.preview}><ClothingItem item={gender === "man" ? "men-knit" : "women-knit"} size={74} /><View style={styles.previewCopy}><Text style={styles.description}>{vote === "cold" ? "Учтём, что сегодня вам было холодно" : vote === "hot" ? "Учтём, что сегодня было слишком тепло" : "Подстроим совет под ваши ощущения"}</Text><Text style={styles.note}>Следующий комплект зависит и от погоды.</Text></View></View>
        </View>
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <Pressable accessibilityRole="button" disabled={!vote || saving} accessibilityState={{ disabled: !vote || saving, busy: saving }} onPress={() => void save()} style={[styles.primary, (!vote || saving) && styles.disabled]}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Сохранить ответ</Text>}</Pressable>
        <Pressable accessibilityRole="button" onPress={onClose} disabled={saving} style={styles.later}><Text style={styles.laterText}>Позже</Text></Pressable>
      </ScrollView></SafeAreaView>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({ backdrop: { flex: 1, backgroundColor: "rgba(20,30,25,.46)", justifyContent: "flex-end", alignItems: "center" }, sheet: { width: "100%", maxWidth: 520, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: "#f6f2eb", overflow: "hidden" }, handle: { width: 36, height: 4, borderRadius: 3, alignSelf: "center", backgroundColor: "#b9b4ac", marginTop: 14 }, content: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 10 }, title: { fontSize: 27, lineHeight: 33, fontWeight: "700", color: "#203a2d" }, description: { fontSize: 15, lineHeight: 22, color: "#41483e", marginTop: 6 }, choices: { flexDirection: "row", gap: 8, marginTop: 23, marginBottom: 20 }, choice: { flex: 1, minHeight: 100, paddingHorizontal: 4, paddingVertical: 16, borderWidth: 1, borderColor: "#d4ccbf", borderRadius: 11, alignItems: "center", gap: 12 }, selected: { borderColor: "#284c37", backgroundColor: "#dce4d1" }, label: { fontSize: 14, color: "#243a2c", textAlign: "center" }, explanation: { borderTopWidth: 1, borderColor: "#d4ccbf", paddingTop: 16 }, explanationTitle: { fontSize: 17, lineHeight: 24, color: "#233a2c" }, preview: { flexDirection: "row", gap: 15, alignItems: "center", paddingVertical: 16 }, previewCopy: { flex: 1, paddingLeft: 15, borderLeftWidth: 1, borderColor: "#d4ccbf" }, note: { fontSize: 12, lineHeight: 18, color: "#626657", marginTop: 6 }, primary: { minHeight: 48, backgroundColor: "#284c37", borderRadius: 9, alignItems: "center", justifyContent: "center", padding: 12 }, disabled: { opacity: .45 }, primaryText: { color: "#fff", fontSize: 17, fontWeight: "500" }, later: { minHeight: 44, alignItems: "center", justifyContent: "center" }, laterText: { fontSize: 15, color: "#284c37", textDecorationLine: "underline" }, error: { color: "#8c362c", fontSize: 14, marginBottom: 12 } });
