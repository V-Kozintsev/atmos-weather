import { useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { City } from "../../src/lib/weather";
import { CITIES } from "../../src/lib/weather";
import { Text, fontNames } from "./typography";
import { sameCity, searchCities } from "./weather";

type Props = { visible: boolean; favorites: City[]; locating: boolean; notice: string; onClose: () => void; onChoose: (city: City) => void; onFavorite: (city: City) => void; onLocate: () => void };

/** @param {object} props - Город, избранное и действия строки. @returns {React.JSX.Element} Выбор города и отдельная доступная кнопка избранного. */
function CityRow({ city, favorite, onChoose, onFavorite }: { city: City; favorite: boolean; onChoose: Props["onChoose"]; onFavorite: Props["onFavorite"] }): React.JSX.Element {
  return <View style={styles.row}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${city.name}, ${city.country}`} onPress={() => onChoose(city)} style={styles.cityButton}>
      <Ionicons name="location-outline" size={23} color="#29483b" />
      <View style={styles.copy}><Text style={styles.cityName}>{city.name}</Text><Text style={styles.country}>{city.country}</Text></View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`${favorite ? "Убрать из избранного" : "В избранное"}: ${city.name}`} accessibilityState={{ selected: favorite }} onPress={() => onFavorite(city)} style={styles.action}>
      <Ionicons name={favorite ? "star" : "star-outline"} size={21} color={favorite ? "#58724d" : "#627369"} />
    </Pressable>
  </View>;
}

/** @param {Props} props - Видимость и существующие действия приложения. @returns {React.JSX.Element} Поиск города с локальными результатами, геолокацией и избранным. */
export function CitySearch({ visible, favorites, locating, notice, onClose, onChoose, onFavorite, onLocate }: Props): React.JSX.Element {
  const [query, setQuery] = useState("");
  const input = useRef<TextInput>(null);
  const deferred = useDeferredValue(query);
  const searching = deferred.trim().length >= 2;
  const results = useMemo(() => visible && searching ? searchCities(deferred) : [], [visible, searching, deferred]);
  const popular = CITIES.filter((city) => !favorites.some((favorite) => sameCity(city, favorite)));
  /** @returns {void} Сбрасывает прошлый поиск и фокусирует поле после появления Android-модального окна. */
  const onShow = useCallback((): void => { setQuery(""); input.current?.focus(); }, []);
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={onShow}>
    <SafeAreaView style={styles.safe} edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        <Pressable accessibilityRole="button" accessibilityLabel="Закрыть поиск" onPress={onClose} style={styles.back}><Ionicons name="chevron-back" size={26} color="#242b29" /></Pressable>
        <Text style={styles.title}>Выбрать город</Text>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={24} color="#395448" />
          <TextInput ref={input} accessibilityLabel="Название города" placeholder="Название города" placeholderTextColor="#7b897f" value={query} onChangeText={setQuery} autoCorrect={false} autoCapitalize="words" returnKeyType="search" onSubmitEditing={Keyboard.dismiss} style={styles.input} />
          {!!query && <Pressable accessibilityRole="button" accessibilityLabel="Очистить поиск" onPress={() => { setQuery(""); input.current?.focus(); }} style={styles.action}><Ionicons name="close-circle-outline" size={22} color="#64766b" /></Pressable>}
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <Pressable accessibilityRole="button" accessibilityLabel="Моё местоположение" onPress={onLocate} disabled={locating} style={styles.location}>
            <Ionicons name="navigate-outline" size={25} color="#29483b" /><View style={styles.copy}><Text style={styles.cityName}>{locating ? "Определяем город…" : "Моё местоположение"}</Text><Text style={styles.country}>Определить город автоматически</Text></View>{locating ? <ActivityIndicator color="#285a45" /> : <Ionicons name="chevron-forward" size={18} color="#627369" />}
          </Pressable>
          {!!notice && <Text accessibilityRole="alert" style={styles.note}>{notice}</Text>}
          {searching ? <View><Text style={styles.groupLabel}>РЕЗУЛЬТАТЫ ПОИСКА</Text>{results.map((city) => <CityRow key={city.id} city={city} favorite={favorites.some((value) => sameCity(value, city))} onChoose={onChoose} onFavorite={onFavorite} />)}{!results.length && <View style={styles.empty}><Ionicons name="search-outline" size={28} color="#7b897f" /><Text style={styles.cityName}>Город не найден</Text><Text style={styles.note}>Проверьте название или попробуйте другое написание.</Text></View>}</View> : <>
            {!!favorites.length && <View><Text style={styles.groupLabel}>ИЗБРАННОЕ</Text>{favorites.map((city) => <CityRow key={city.id} city={city} favorite onChoose={onChoose} onFavorite={onFavorite} />)}</View>}
            {!!popular.length && <View><Text style={styles.groupLabel}>ГОРОДА</Text>{popular.map((city) => <CityRow key={city.id} city={city} favorite={false} onChoose={onChoose} onFavorite={onFavorite} />)}</View>}
            <Text style={styles.note}>Начните вводить название, чтобы найти другой город.</Text>
          </>}
        </ScrollView>
      </View>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#eef1eb" },
  container: { flex: 1, width: "100%", maxWidth: 680, alignSelf: "center", paddingHorizontal: 22 },
  back: { width: 44, minHeight: 44, justifyContent: "center", marginLeft: -10 },
  title: { fontFamily: fontNames.heading, fontSize: 29, lineHeight: 38, color: "#242b29", marginTop: 4, marginBottom: 20 },
  search: { flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#9fae9f", minHeight: 50 },
  input: { flex: 1, minWidth: 0, minHeight: 48, fontFamily: fontNames.regular, fontSize: 16, color: "#242b29", paddingVertical: 10 },
  action: { minWidth: 44, minHeight: 48, alignItems: "center", justifyContent: "center" },
  scroll: { flex: 1 }, content: { paddingBottom: 24 },
  location: { minHeight: 80, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: "#d3dcd0", paddingVertical: 15 },
  row: { flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#d3dcd0" },
  cityButton: { flex: 1, minHeight: 66, paddingVertical: 12, flexDirection: "row", gap: 12, alignItems: "center" },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  cityName: { fontSize: 15, lineHeight: 22, fontWeight: "500", color: "#242b29" },
  country: { fontSize: 12, lineHeight: 18, color: "#637368" },
  groupLabel: { fontSize: 10, lineHeight: 16, fontWeight: "600", letterSpacing: 1.4, color: "#53635a", marginTop: 26, marginBottom: 4 },
  note: { fontSize: 12, lineHeight: 19, color: "#637368", paddingVertical: 19 },
  empty: { alignItems: "center", paddingVertical: 30, gap: 10 },
});
