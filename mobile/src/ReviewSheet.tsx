import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, fontNames } from "./typography";
import { storeName } from "./distribution";
import config from "../app.json";

interface Props {
  visible: boolean;
  storeOpened: boolean;
  confirmation: boolean;
  onShown: () => void;
  onLater: () => Promise<void>;
  onRated: () => Promise<void>;
  onRate: () => Promise<void>;
}

/** @param {Props} props - Видимость, состоявшийся переход в магазин и действия пользователя. @returns {React.JSX.Element} Приглашение к отзыву со свободным закрытием и отдельным подтверждением уже оставленной оценки. */
export function ReviewSheet({ visible, storeOpened, confirmation, onShown, onLater, onRated, onRate }: Props): React.JSX.Element {
  const { height } = useWindowDimensions();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (visible) setError(""); }, [visible]);

  useEffect(() => {
    if (!visible || Platform.OS !== "web") return;
    const frame = requestAnimationFrame(onShown);
    return () => cancelAnimationFrame(frame);
  }, [visible, onShown]);

  /** @returns {Promise<void>} Показывает ошибку открытия внутри окна, сохраняя возможность повторить переход. */
  async function openStore(): Promise<void> {
    if (opening) return;
    setOpening(true);
    setError("");
    try { await onRate(); }
    catch { setError(`Не удалось открыть ${storeName}. Попробуйте ещё раз.`); }
    finally { setOpening(false); }
  }

  /** @returns {void} Откладывает просьбу, в том числе по системной кнопке «Назад». */
  function close(): void { void onLater(); }

  return <Modal visible={visible} transparent animationType="fade" onShow={onShown} onRequestClose={close} statusBarTranslucent>
    <View style={styles.backdrop}>
      <Pressable accessibilityRole="button" accessibilityLabel="Закрыть и напомнить через три дня" style={StyleSheet.absoluteFill} onPress={close} />
      <SafeAreaView edges={["bottom", "left", "right"]} style={[styles.sheet, { maxHeight: height * 0.88 }]} accessibilityViewIsModal>
        <View style={styles.handle} />
        <ScrollView bounces={false} contentContainerStyle={styles.content}>
          <View style={styles.top}>
            <View style={styles.illustration} accessible={false}>
              <Image source={require("../assets/widget/partial.webp")} resizeMode="contain" style={styles.weather} />
              <Ionicons name="sparkles-outline" size={30} color="#466457" />
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Закрыть и напомнить через три дня" onPress={close} style={styles.close}><Ionicons name="close" size={25} color="#526058" /></Pressable>
          </View>
          <Text style={styles.title}>{confirmation ? "Удалось оставить отзыв?" : `Как вам «${config.expo.name}»?`}</Text>
          <Text style={styles.description}>{confirmation ? "Если вы уже оценили приложение, подтвердите это — больше не будем напоминать." : "Поделитесь впечатлениями о прогнозе и подборе одежды. Это поможет нам сделать приложение лучше."}</Text>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" disabled={opening} accessibilityState={{ disabled: opening, busy: opening }} onPress={() => confirmation ? void onRated() : void openStore()} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>{confirmation ? "Уже оценил" : opening ? "Открываем магазин…" : "Оставить отзыв"}</Text>
            {opening ? <ActivityIndicator color="#fff" /> : <Ionicons name={confirmation ? "checkmark" : "arrow-forward"} size={22} color="#fff" style={confirmation ? undefined : { transform: [{ rotate: "-45deg" }] }} />}
          </Pressable>
          <Pressable accessibilityRole="button" onPress={close} style={styles.secondary}><Text style={styles.secondaryText}>Позже</Text></Pressable>
          {confirmation ? <Pressable accessibilityRole="button" disabled={opening} onPress={() => void openStore()} style={styles.secondary}><Text style={styles.ratedText}>Открыть магазин ещё раз</Text></Pressable> : storeOpened && <Pressable accessibilityRole="button" onPress={() => void onRated()} style={styles.secondary}><Text style={styles.ratedText}>Уже оценил</Text></Pressable>}
          <Text style={styles.note}>{confirmation ? "Подтверждение сохранится на этом устройстве" : `Откроется страница приложения в ${storeName}`}</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(20,30,25,0.48)", justifyContent: "flex-end", alignItems: "center" },
  sheet: { width: "100%", maxWidth: 520, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "#faf8f3", overflow: "hidden" },
  handle: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, marginTop: 10, backgroundColor: "#d4d3cf" },
  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 14 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  illustration: { flexDirection: "row", alignItems: "center", gap: 6 },
  weather: { width: 94, height: 76 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fontNames.heading, fontSize: 29, lineHeight: 37, color: "#243b30", marginBottom: 12 },
  description: { fontSize: 15, lineHeight: 23, color: "#414d44", marginBottom: 22 },
  primary: { minHeight: 50, paddingVertical: 13, paddingHorizontal: 18, borderRadius: 12, backgroundColor: "#293f32", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "600", flexShrink: 1 },
  pressed: { opacity: 0.85 },
  secondary: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingVertical: 10 },
  secondaryText: { fontSize: 16, color: "#354b3d" },
  ratedText: { fontSize: 14, color: "#667268", textDecorationLine: "underline" },
  note: { fontSize: 11, lineHeight: 17, color: "#7a8079", textAlign: "center", marginTop: 4 },
  error: { color: "#9d3e32", fontSize: 13, lineHeight: 20, marginBottom: 12 },
});
