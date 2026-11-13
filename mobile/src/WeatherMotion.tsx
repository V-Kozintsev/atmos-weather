import { memo, useEffect, useId, useRef, useState } from "react";
import { AccessibilityInfo, Animated, AppState, Easing, Platform, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import type { WeatherSceneModel, WeatherScenePeriod } from "./weatherScene";
import { log } from "./weather";
import { Rainfall } from "./Rainfall";

interface Props { scene: WeatherSceneModel; period: WeatherScenePeriod; width: number; height: number; visible: boolean; enabled: boolean; sceneKey: string }
const clouds = require("../assets/weather-clouds.webp");
const particles = Array.from({ length: 110 }, (_, index) => ({ x: ((index * 73.31) % 101) / 101, y: ((index * 31.93) % 103) / 103, depth: .3 + (index % 7) / 9 }));

/** @param {string} event - Запуск или остановка движения. @param {Record<string, unknown>} detail - Технические признаки без города и координат. @returns {void} Пишет диагностику в dev; в production только при явном включении. */
function sceneLog(event: string, detail: Record<string, unknown>): void {
  if (__DEV__) console.info(`[Atmos Scene] ${event}`, detail);
  else log(`scene ${event}`, detail);
}

/** @param {Props} props - Погода, размеры сцены и её фактическая видимость. @returns {React.JSX.Element} Непрерывное движение готовых слоёв с остановкой в фоне; на Android кадры не проходят через React и JS. */
function WeatherMotionView({ scene, period, width, height, visible, enabled, sceneKey }: Props): React.JSX.Element {
  const glowId = useId().replace(/[^a-zA-Z0-9]/g, "") + "weatherGlow";
  const drift = useRef(new Animated.Value(0)).current;
  const fall = useRef(new Animated.Value(0)).current;
  const gust = useRef(new Animated.Value(0)).current;
  const [reduced, setReduced] = useState(true);
  const [active, setActive] = useState(AppState.currentState == null || AppState.currentState === "active");
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (alive) setReduced(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    const app = AppState.addEventListener("change", (state) => setActive(state === "active"));
    return () => { alive = false; motion.remove(); app.remove(); };
  }, []);
  useEffect(() => {
    if (!enabled || reduced || !active || !visible || width <= 0 || height <= 0) return;
    drift.setValue(0); fall.setValue(0); gust.setValue(0);
    const native = Platform.OS !== "web";
    const movement = Animated.loop(Animated.timing(drift, { toValue: 1, duration: 24000, easing: Easing.linear, useNativeDriver: native, isInteraction: false }));
    const precipitation = Animated.loop(Animated.timing(fall, { toValue: 1, duration: scene.snow ? scene.kind === "blizzard" ? 2700 : 6500 : scene.rain < .35 && !scene.hail ? 3500 : 1700, easing: Easing.linear, useNativeDriver: native, isInteraction: false }));
    const windMotion = Animated.loop(Animated.timing(gust, { toValue: 1, duration: 10000, easing: Easing.linear, useNativeDriver: native, isInteraction: false }));
    movement.start();
    if (scene.snow || scene.hail) precipitation.start();
    if (scene.kind === "wind") windMotion.start();
    sceneLog("started", { kind: scene.kind, continuous: true, nativeDriver: native });
    return () => {
      movement.stop(); precipitation.stop(); windMotion.stop();
      sceneLog("stopped", { reason: AppState.currentState === "background" || AppState.currentState === "inactive" ? "background" : "hidden-or-changed" });
    };
  }, [sceneKey, width, height, visible, enabled, reduced, active, drift, fall, gust, scene.rain, scene.snow, scene.hail, scene.kind]);
  const night = period === "night";
  const cloudOpacity = scene.clouds * (night ? .3 : .62);
  const broad = width * 1.6;
  const wave = [0, .125, .25, .375, .5, .625, .75, .875, 1];
  const cloudShift = drift.interpolate({ inputRange: wave, outputRange: [-24, -15, 4, 24, 34, 24, 4, -15, -24] });
  const fogShift = drift.interpolate({ inputRange: wave, outputRange: [24, 16, -2, -20, -28, -20, -2, 16, 24] });
  const fallY = fall.interpolate({ inputRange: [0, 1], outputRange: [0, height] });
  const snowShift = drift.interpolate({ inputRange: [0, .5, 1], outputRange: [0, scene.kind === "blizzard" ? 90 : 18, 0] });
  const leafShift = gust.interpolate({ inputRange: [0, 1], outputRange: [0, width] });
  const lightning = drift.interpolate({ inputRange: [0, .37, .4, .45, .48, 1], outputRange: [0, 0, .05, .025, 0, 0] });
  const glowOpacity = drift.interpolate({ inputRange: wave, outputRange: [.7, .74, .85, .96, 1, .96, .85, .74, .7] });
  return <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    {scene.clouds < .6 && <Animated.View style={[StyleSheet.absoluteFill, { opacity: glowOpacity }]}><Svg width={width} height={height}>
      <Defs><RadialGradient id={glowId} cx="79%" cy="18%" r="40%"><Stop stopColor={night ? "#e4edff" : period === "evening" ? "#ffd7ad" : "#fff3be"} stopOpacity={night ? .2 : .45} /><Stop offset="1" stopColor="#fff3be" stopOpacity={0} /></RadialGradient></Defs><Rect width={width} height={height} fill={`url(#${glowId})`} />
      {night && <G><Circle cx={width * .8} cy={height * .18} r={13} fill="#eaf1ff" opacity={.8} /><Circle cx={width * .8 - 5} cy={height * .18 - 4} r={12} fill="#183048" />{particles.slice(0, 15).map((point, index) => <Circle key={index} cx={point.x * width} cy={point.y * height * .45} r={.7} fill="#fff" opacity={.3 + point.depth * .2} />)}</G>}
    </Svg></Animated.View>}
    {scene.clouds > 0 && <>
      <Animated.Image source={clouds} resizeMode="stretch" fadeDuration={0} style={{ position: "absolute", width: broad, height: height * .55, left: -width * .23, top: -14, opacity: cloudOpacity, transform: [{ translateX: cloudShift }] }} />
      <Animated.Image source={clouds} resizeMode="stretch" fadeDuration={0} style={{ position: "absolute", width: broad, height: height * .4, left: -width * .3, top: 32, opacity: cloudOpacity * .65, transform: [{ translateX: fogShift }] }} />
    </>}
    {(scene.fog || scene.kind === "blizzard") && [0, 1, 2].map((index) => <Animated.Image key={index} source={clouds} resizeMode="stretch" fadeDuration={0} style={{ position: "absolute", width: broad, height: height * .5, left: -width * .3, top: height * (.34 + index * .17), opacity: scene.fog ? .22 : .12, transform: [{ translateX: fogShift }] }} />)}
    {scene.rain > 0 && <Rainfall strength={scene.rain} wind={scene.wind} width={width} height={height} ice={scene.ice} running={enabled && !reduced && active && visible && width > 0 && height > 0} />}
    {!!(scene.snow || scene.hail) && <Animated.View style={{ position: "absolute", top: -height, left: -width * .3, width: broad, height: height * 2, transform: [{ translateY: fallY }, { translateX: snowShift }] }}>
      <Svg width={broad} height={height * 2}>
        {[0, 1].map((copy) => <G key={copy} transform={`translate(0 ${copy * height})`}>
          {scene.snow > 0 && particles.slice(0, Math.round(20 + scene.snow * 65)).map((point, index) => <Ellipse key={`s${index}`} cx={point.x * broad} cy={point.y * height} rx={scene.kind === "snow-grains" ? 1 : 1 + point.depth * 1.3} ry={scene.kind === "blizzard" ? 1 : 1 + point.depth * 1.3} fill="#f3f7fa" opacity={.24 + point.depth * .4} />)}
          {scene.hail && particles.slice(0, 35).map((point, index) => <Circle key={`h${index}`} cx={point.x * broad} cy={point.y * height} r={1 + point.depth} fill="#dceafa" opacity={.35 + point.depth * .4} />)}
        </G>)}
      </Svg>
    </Animated.View>}
    {scene.kind === "wind" && <Animated.View style={{ position: "absolute", top: 0, left: -width, width: width * 3, height, transform: [{ translateX: leafShift }] }}><Svg width={width * 3} height={height}>{[0, 1, 2].map((copy) => <G key={copy} transform={`translate(${copy * width} 0)`}>{particles.slice(0, 12).map((point, index) => <Ellipse key={index} cx={point.x * width} cy={height * (.65 + point.y * .3)} rx={3.3} ry={1.2} fill={index % 2 ? "#d6bd8d" : "#e1d2ac"} opacity={.5} />)}</G>)}</Svg></Animated.View>}
    {scene.ice && <Svg width={width} height={height} style={StyleSheet.absoluteFill}>{[0, 1].map((side) => <G key={side} stroke="#dcefff" strokeWidth={.8} opacity={.19}>{[0, 1, 2, 3, 4, 5].map((index) => { const x = side ? width - index * 5 : index * 5; const y = height - 22 - index * 8; return <Path key={index} d={`M${x} ${y}l${side ? -9 : 9} -18M${x} ${y - 4}l${side ? -9 : 9} -5`} />; })}</G>)}</Svg>}
    {scene.storm && <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "#e6efff", opacity: lightning }]} />}
  </View>;
}

export const WeatherMotion = memo(WeatherMotionView);
