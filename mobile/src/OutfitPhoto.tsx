import { useRef, useState } from "react";
import { Animated, Image, Modal, PanResponder, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type ImageSourcePropType, type LayoutChangeEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { s } from "./ui";

interface Position { scale: number; x: number; y: number }
interface TouchFrame { count: number; x: number; y: number; distance: number }

/** @param {GestureResponderEvent} event - Касания области фотографии. @returns {TouchFrame | undefined} Центр жеста и расстояние между пальцами. */
function touchFrame(event: GestureResponderEvent): TouchFrame | undefined {
  const touches = event.nativeEvent.touches;
  if (!touches.length) return undefined;
  const first = touches[0];
  const second = touches[1];
  return second
    ? { count: 2, x: (first.pageX + second.pageX) / 2, y: (first.pageY + second.pageY) / 2, distance: Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY) }
    : { count: 1, x: first.pageX, y: first.pageY, distance: 0 };
}

/** @param {object} props - Источник фото и действие закрытия. @returns {React.JSX.Element} Полноэкранное фото с приближением и перемещением без дополнительных библиотек. */
function PhotoLightbox({ source, onClose }: { source: ImageSourcePropType; onClose: () => void }): React.JSX.Element {
  const position = useRef<Position>({ scale: 1, x: 0, y: 0 });
  const area = useRef({ width: 1, height: 1 });
  const baseline = useRef<{ frame: TouchFrame; position: Position } | undefined>(undefined);
  const scaleValue = useRef(new Animated.Value(1)).current;
  const offset = useRef(new Animated.ValueXY()).current;
  const [zoom, setZoom] = useState(1);

  /** @param {Position} next - Новый масштаб и смещение. @returns {void} Ограничивает масштаб и удерживает фотографию в области просмотра. */
  function applyPosition(next: Position): void {
    const scale = Math.max(1, Math.min(4, next.scale));
    const maxX = area.current.width * (scale - 1) / 2;
    const maxY = area.current.height * (scale - 1) / 2;
    position.current = { scale, x: Math.max(-maxX, Math.min(maxX, next.x)), y: Math.max(-maxY, Math.min(maxY, next.y)) };
    scaleValue.setValue(scale);
    offset.setValue({ x: position.current.x, y: position.current.y });
  }

  /** @param {GestureResponderEvent} event - Начало или изменение количества касаний. @returns {void} Запоминает положение для плавного продолжения жеста. */
  function beginGesture(event: GestureResponderEvent): void {
    const frame = touchFrame(event);
    baseline.current = frame ? { frame, position: { ...position.current } } : undefined;
  }

  /** @param {GestureResponderEvent} event - Перемещение одного или двух пальцев. @returns {void} Приближает двумя пальцами и перемещает увеличенное фото. */
  function moveGesture(event: GestureResponderEvent): void {
    const frame = touchFrame(event);
    if (!frame) return;
    const start = baseline.current;
    if (!start || start.frame.count !== frame.count) { beginGesture(event); return; }
    const scale = frame.count === 2 && start.frame.distance > 0 ? start.position.scale * frame.distance / start.frame.distance : start.position.scale;
    applyPosition({ scale, x: start.position.x + frame.x - start.frame.x, y: start.position.y + frame.y - start.frame.y });
  }

  /** @returns {void} Завершает жест и обновляет доступность кнопок масштаба. */
  function endGesture(): void { baseline.current = undefined; setZoom(position.current.scale); }

  /** @returns {boolean} Передаёт касания области фото обработчику жестов. */
  function captureGesture(): boolean { return true; }

  const responder = useRef(PanResponder.create({ onStartShouldSetPanResponder: captureGesture, onMoveShouldSetPanResponder: captureGesture, onPanResponderGrant: beginGesture, onPanResponderMove: moveGesture, onPanResponderStart: beginGesture, onPanResponderEnd: beginGesture, onPanResponderRelease: endGesture, onPanResponderTerminate: endGesture })).current;

  /** @param {number} factor - Множитель приближения. @returns {void} Изменяет масштаб с сохранением смещения для кнопочного управления. */
  function changeZoom(factor: number): void { applyPosition({ ...position.current, scale: position.current.scale * factor }); setZoom(position.current.scale); }

  /** @returns {void} Возвращает исходный размер и положение фотографии. */
  function resetZoom(): void { applyPosition({ scale: 1, x: 0, y: 0 }); setZoom(1); }

  /** @param {LayoutChangeEvent} event - Размер области после поворота экрана. @returns {void} Пересчитывает ограничения и сбрасывает смещение. */
  function measureArea(event: LayoutChangeEvent): void { area.current = event.nativeEvent.layout; resetZoom(); }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={[s.subtitle, styles.heading]}>Ваш образ</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Закрыть фото" onPress={onClose} style={styles.control}><Ionicons name="close" size={26} color="#f3f6ee" /></Pressable>
      </View>
      <View style={styles.viewport} onLayout={measureArea} {...responder.panHandlers}>
        <Animated.View pointerEvents="none" style={[styles.imageArea, { transform: offset.getTranslateTransform() }]}>
          <Animated.Image source={source} resizeMode="contain" accessibilityLabel="Увеличенный пример образа по погоде" style={[styles.imageArea, { transform: [{ scale: scaleValue }] }]} />
        </Animated.View>
      </View>
      <View style={styles.toolbar}>
        <Text style={[s.caption, styles.hint]}>Приближайте двумя пальцами</Text>
        <View style={styles.controls}>
          <Pressable accessibilityRole="button" accessibilityLabel="Уменьшить фото" disabled={zoom <= 1} onPress={() => changeZoom(1 / 1.5)} style={[styles.control, zoom <= 1 && styles.disabled]}><Ionicons name="remove" size={24} color="#f3f6ee" /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Сбросить масштаб" onPress={resetZoom} style={styles.reset}><Text style={[s.chipText, styles.heading]}>{Math.round(zoom * 100)}%</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Приблизить фото" disabled={zoom >= 4} onPress={() => changeZoom(1.5)} style={[styles.control, zoom >= 4 && styles.disabled]}><Ionicons name="add" size={24} color="#f3f6ee" /></Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

/** @param {object} props - Фото выбранного комплекта. @returns {React.JSX.Element} Нажимаемое превью и просмотр на весь экран. */
export function OutfitPhoto({ source }: { source: ImageSourcePropType }): React.JSX.Element {
  const [visible, setVisible] = useState(false);
  /** @returns {void} Открывает фотографию с исходным масштабом. */
  function openPhoto(): void { setVisible(true); }
  /** @returns {void} Закрывает просмотр и освобождает состояние жестов. */
  function closePhoto(): void { setVisible(false); }
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Открыть фото образа" accessibilityHint="Полноэкранный просмотр с приближением двумя пальцами" onPress={openPhoto} style={s.photo}>
        <Image source={source} style={s.model} resizeMode="contain" />
        <View pointerEvents="none" style={styles.badge}><Ionicons name="expand-outline" size={18} color="#21483e" /><Text style={s.caption}>Рассмотреть</Text></View>
      </Pressable>
      <Modal visible={visible} animationType="fade" onRequestClose={closePhoto}>{visible && <PhotoLightbox source={source} onClose={closePhoto} />}</Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#142d31" },
  header: { paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heading: { color: "#f3f6ee" },
  viewport: { flex: 1, overflow: "hidden" },
  imageArea: { width: "100%", height: "100%" },
  control: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#284449", alignItems: "center", justifyContent: "center" },
  reset: { minWidth: 80, minHeight: 48, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.4 },
  toolbar: { alignItems: "center", padding: 12, gap: 8 },
  hint: { color: "#b7c9c4" },
  controls: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { position: "absolute", bottom: 10, right: 10, flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: "#fffffff0" },
});
