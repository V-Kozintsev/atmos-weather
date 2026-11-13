import { memo, useEffect, useId, useMemo, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from "react-native-svg";
import { rainLayers, rainNoise } from "./rainMotion";

interface Props { strength: number; wind: number; width: number; height: number; ice: boolean; running: boolean }

/** @param {Props} props - Интенсивность, ветер, размеры и общее состояние анимации. @returns {React.JSX.Element} Независимые планы дождя с согласованными наклоном и траекторией, без обновления React на каждый кадр. */
function RainfallView({ strength, wind, width, height, ice, running }: Props): React.JSX.Element {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "") + "rain";
  const layers = useMemo(() => rainLayers(strength, wind, width, height), [strength, wind, width, height]);
  const [progress] = useState(() => [new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]);
  useEffect(() => {
    progress.forEach((value) => value.setValue(0));
    if (!running) return;
    const loops = layers.flatMap((layer, index) => layer.count > 0 ? [Animated.loop(Animated.timing(progress[index], { toValue: 1, duration: layer.duration, easing: Easing.linear, useNativeDriver: Platform.OS !== "web", isInteraction: false }))] : []);
    loops.forEach((animation) => animation.start());
    return () => loops.forEach((animation) => animation.stop());
  }, [running, layers, progress]);
  const color = ice ? "#c6e7ff" : "#eaf2f7";
  return <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>{layers.map((layer, index) => {
    const delta = layer.slope * layer.height;
    const drops = Array.from({ length: layer.count }, (_, particle) => {
      const seed = particle + index * 251;
      return { x: rainNoise(seed + .13) * layer.width, y: rainNoise(seed + 87.9) * layer.height, length: layer.length * (.55 + rainNoise(seed + 19.4) * .9), opacity: layer.opacity * (.35 + rainNoise(seed + 64.2) * .65), thickness: layer.thickness * (.75 + rainNoise(seed + 22.7) * .5) };
    });
    return layer.count > 0 && <Animated.View key={layer.depth} style={{ position: "absolute", top: -layer.height, left: -layer.margin, width: layer.width, height: layer.height * 2, transform: [{ translateY: progress[index].interpolate({ inputRange: [0, 1], outputRange: [0, layer.height] }) }, { translateX: progress[index].interpolate({ inputRange: [0, 1], outputRange: [0, delta] }) }] }}>
      <Svg width={layer.width} height={layer.height * 2}>
        <Defs><LinearGradient id={`${id}${index}`} x1="0%" y1="0%" x2="0%" y2="100%"><Stop offset={0} stopColor={color} stopOpacity={0} /><Stop offset={0.55} stopColor={color} stopOpacity={.4} /><Stop offset={1} stopColor={color} stopOpacity={1} /></LinearGradient></Defs>
        {[0, 1].map((copy) => <G key={copy} transform={`translate(${copy * delta} ${copy * layer.height})`}>
          {drops.map((drop, particle) => layer.depth === "distant" ? <Circle key={particle} cx={drop.x} cy={drop.y} r={drop.thickness} fill={color} opacity={drop.opacity} /> : <Path key={particle} d={`M${drop.x} ${drop.y}l${layer.slope * drop.length} ${drop.length}`} fill="none" stroke={`url(#${id}${index})`} strokeWidth={drop.thickness} strokeLinecap="round" opacity={drop.opacity} />)}
        </G>)}
      </Svg>
    </Animated.View>;
  })}</View>;
}

export const Rainfall = memo(RainfallView);
