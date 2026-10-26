import { useId } from "react";
import { Image, View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Svg, { ClipPath, Defs, Ellipse, G, Image as SvgImage, LinearGradient, Path, Rect, Stop, SvgXml } from "react-native-svg";
import type { Forecast } from "../../src/lib/weather";
import type { OutfitAdvice, OutfitOccasion } from "../../src/lib/outfit";
import { selectWardrobe, upperPhoto } from "./wardrobeSelection";
import { garmentArt, type CharacterGender } from "./illustratedWardrobe";
import type { WardrobePhoto } from "./wardrobeAssets";
import { useTimeTheme } from "./timeTheme";
import { garmentSprite, illustratedAssets } from "./illustratedAssets";

const faces = require("../assets/illustrated/faces.webp");
const seasons = require("../assets/illustrated/seasons.webp");

/** @param {Forecast} forecast - Дата и фактическая погода выбранного города. @returns {number} Панель сезонного парка; снег показывается только при холоде или снегопаде. */
export function seasonPanel(forecast: Forecast): number {
  const month = Number(forecast.current.time.slice(5, 7));
  const localMonth = forecast.city.latitude < 0 ? (month + 5) % 12 + 1 : month;
  if ([71, 73, 75, 77, 85, 86].includes(forecast.current.code) || forecast.current.temperature <= 1) return 3;
  if (Math.abs(forecast.city.latitude) < 23.5 || forecast.current.temperature >= 27) return 1;
  if (localMonth >= 3 && localMonth <= 5) return 0;
  if (localMonth >= 6 && localMonth <= 8) return 1;
  return 2;
}

/** @param {object} props - Предмет и размер миниатюры. @returns {React.JSX.Element} Тот же слой одежды, который надевается на модель, без растяжения. */
export function IllustratedGarment({ item, size }: { item: WardrobePhoto; size: number }): React.JSX.Element {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const sprite = garmentSprite(item);
  if (sprite) return <Image source={sprite.source} resizeMode="contain" fadeDuration={0} accessible={false} style={{ width: size, height: size }} />;
  const art = garmentArt(item, item.startsWith("women") ? "woman" : "man", id);
  return <SvgXml xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${art.viewBox}">${art.markup}</svg>`} width={size} height={size} />;
}

/** @param {object} props - Вещи из общего подбора и пол персонажа. @returns {React.JSX.Element} Послойная фигура: база, одежда, лицо и аксессуары в единых координатах. */
function LayeredCharacter({ advice, gender, occasion }: { advice: OutfitAdvice; gender: CharacterGender; occasion: OutfitOccasion }): React.JSX.Element {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const wardrobe = selectWardrobe(advice, gender, occasion);
  const feet = garmentSprite(wardrobe.lower)?.feet || [98, 143];
  const accessories = wardrobe.accessories;
  const umbrella = accessories.filter(item => item.includes("umbrella"));
  const underlayers = accessories.filter(item => /leggings|socks/.test(item));
  const upperLayers = advice.pieces.upper.split(/ и /).map(name => upperPhoto(name, gender, advice));
  const layers = [...underlayers, wardrobe.lower, ...upperLayers, ...(advice.pieces.outer ? [wardrobe.outer] : []), wardrobe.shoes, ...accessories.filter(item => !/umbrella|leggings|socks/.test(item))];
  /** @param {WardrobePhoto[]} items - Слои в порядке от дальнего к ближнему. @param {string} group - Уникальная группа SVG. @returns {React.JSX.Element} Совмещённые слои без изменения посадки. */
  function garments(items: WardrobePhoto[], group: string): React.JSX.Element {
    return <G>{items.map((item, index) => {
      const sprite = garmentSprite(item);
      const key = `${id}${group}${index}`;
      if (sprite && item === wardrobe.shoes) {
        const [, y, width, height] = sprite.bounds;
        const half = width / 2;
        return <G key={key}>{feet.map((center, side) => <G key={side}><Defs><ClipPath id={`${key}foot${side}`}><Rect x={center - half / 2} y={y} width={half} height={height} /></ClipPath></Defs><G clipPath={`url(#${key}foot${side})`}><SvgImage href={sprite.source} x={center - half / 2 - side * half} y={y} width={width} height={height} preserveAspectRatio="xMidYMid meet" /></G></G>)}</G>;
      }
      if (item === "gloves" || item === "mittens") return <G key={key}><SvgImage href={illustratedAssets["gloves-left"]} x={43} y={310} width={17} height={35} preserveAspectRatio="xMidYMid meet" /><SvgImage href={illustratedAssets["gloves-right"]} x={181} y={310} width={17} height={35} preserveAspectRatio="xMidYMid meet" /></G>;
      if (sprite) return <SvgImage key={key} href={sprite.source} x={sprite.bounds[0]} y={sprite.bounds[1]} width={sprite.bounds[2]} height={sprite.bounds[3]} preserveAspectRatio="xMidYMid meet" />;
      return <SvgXml key={key} xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 640">${garmentArt(item, gender, key).markup}</svg>`} width={280} height={640} />;
    })}</G>;
  }
  return <Svg width="100%" height="100%" viewBox="0 0 280 640" preserveAspectRatio="xMidYMax meet">
    <Defs><ClipPath id={`${id}head`}><Rect x={68} y={5} width={104} height={102} /></ClipPath><LinearGradient id={`${id}skin`}><Stop stopColor="#e7c5a7" /><Stop offset="1" stopColor="#ba8f71" /></LinearGradient></Defs>
    <Ellipse cx={123} cy={618} rx={56} ry={6} fill="#203b34" opacity={.12} />
    {garments(umbrella, "back")}
    <Path d="M103 93h34l5 17 22 15 12 31 18 161-11 5-30-147-2 111H87l-4-111-26 147-12-4 20-163 15-35 24-14Z" fill={`url(#${id}skin)`} />
    {/skirt|shorts/.test(wardrobe.lower) && <Path d="M85 270h70l-2 314-22 1-11-250-9 250-24-1Z" fill={`url(#${id}skin)`} />}
    {!/skirt|shorts/.test(wardrobe.lower) && feet.map((center, index) => <Rect key={index} x={center - 7} y={526} width={14} height={63} rx={4} fill={`url(#${id}skin)`} />)}
    <Path d="M45 301l13 3 1 17-3 12q-4 5-6 0l-2-12-4-4Zm136 3 12-3 3 17-3 13q-5 6-8 0l-3-11Z" fill={`url(#${id}skin)`} />
    <G clipPath={`url(#${id}head)`}><SvgImage href={faces} x={gender === "woman" ? 68 : -36} y={4} width={208} height={104} preserveAspectRatio="none" /></G>
    {garments(layers, "front")}
  </Svg>;
}

/** @param {object} props - Живая погода и реальный комплект. @returns {React.JSX.Element} Статичная сезонная иллюстрация с персонажем; текст располагается поверх спокойного левого края. */
export function CharacterScene({ forecast, advice, gender, occasion, style, full = false }: { forecast: Forecast; advice: OutfitAdvice; gender: CharacterGender; occasion: OutfitOccasion; style?: StyleProp<ViewStyle>; full?: boolean }): React.JSX.Element {
  const theme = useTimeTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const panel = seasonPanel(forecast);
  const snow = [71, 73, 75, 77, 85, 86].includes(forecast.current.code);
  const rain = !snow && advice.rain;
  const overcast = forecast.current.code >= 3 && forecast.current.code <= 48;
  return <View pointerEvents="none" accessible={false} style={[styles.scene, style]}>
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 384 1024" preserveAspectRatio="xMidYMid slice">
      <SvgImage href={seasons} x={-panel * 384} y={0} width={1536} height={1024} />
      {overcast && <Rect width={384} height={1024} fill="#677787" opacity={.2} />}
      {(theme.dark || !forecast.current.day) && <Rect width={384} height={1024} fill="#142736" opacity={theme.dark ? .62 : .2} />}
      {rain && <><Rect width={384} height={1024} fill="#657781" opacity={.12} />{Array.from({ length: 18 }, (_, i) => <Path key={i} d={`M${(i * 67 + 23) % 384} ${120 + (i * 93) % 700}l-9 26`} stroke="#eaf0f3" opacity={.7} strokeWidth={2} strokeLinecap="round" />)}</>}
      {snow && Array.from({ length: 22 }, (_, i) => <Ellipse key={i} cx={(i * 83 + 31) % 384} cy={120 + (i * 71) % 800} rx={2.5} ry={2.5} fill="#fff" opacity={.85} />)}
    </Svg>
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs><LinearGradient id={`${id}side`} x1="0%" y1="0%" x2="100%" y2="0%"><Stop offset="0%" stopColor={theme.page} stopOpacity={full ? .1 : 1} /><Stop offset="55%" stopColor={theme.page} stopOpacity={full ? .05 : .98} /><Stop offset="90%" stopColor={theme.page} stopOpacity={.13} /><Stop offset="100%" stopColor={theme.page} stopOpacity={.13} /></LinearGradient><LinearGradient id={`${id}bottom`} x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset="0%" stopColor={theme.page} stopOpacity={0} /><Stop offset="80%" stopColor={theme.page} stopOpacity={0} /><Stop offset="100%" stopColor={theme.page} /></LinearGradient></Defs>
      <Rect width={100} height={100} fill={`url(#${id}side)`} /><Rect width={100} height={100} fill={`url(#${id}bottom)`} />
    </Svg>
    <View style={[styles.character, full && styles.fullCharacter]}><LayeredCharacter advice={advice} gender={gender} occasion={occasion} /></View>
  </View>;
}

const styles = StyleSheet.create({
  scene: { width: "100%", height: "100%", overflow: "hidden" },
  character: { position: "absolute", right: -10, top: 22, bottom: 0, width: "61%" },
  fullCharacter: { width: "100%", right: 0, top: 10 },
});
