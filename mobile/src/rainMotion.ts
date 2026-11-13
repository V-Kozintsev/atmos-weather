export interface RainLayer {
  depth: "distant" | "middle" | "near";
  count: number;
  slope: number;
  margin: number;
  width: number;
  height: number;
  duration: number;
  length: number;
  opacity: number;
  thickness: number;
}

/** @param {number} seed - Независимое зерно координаты или размера. @returns {number} Повторяемое число от 0 до 1 без регулярной решётки частиц. */
export function rainNoise(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

/** @param {number} strength - Интенсивность осадков от 0 до 1. @param {number} wind - Скорость ветра в м/с. @param {number} width - Ширина сцены. @param {number} height - Высота сцены. @returns {RainLayer[]} Три плана дождя: дальняя водяная пыль, средние капли и редкие быстрые ближние. */
export function rainLayers(strength: number, wind: number, width: number, height: number): RainLayer[] {
  const intensity = Math.max(0, Math.min(1, Number.isFinite(strength) ? strength : 0));
  const safeHeight = Math.max(1, height);
  const density = Math.max(.5, Math.min(1.9, width * safeHeight / (390 * 350)));
  const slope = -.006 - Math.min(.32, Math.max(0, Number.isFinite(wind) ? wind : 0) * .022);
  const depths = [
    { depth: "distant" as const, count: 22 + intensity * 54, limit: 96, speed: 80 + intensity * 40, length: 1 + intensity, opacity: .18, thickness: .65, wind: 1.15 },
    { depth: "middle" as const, count: 14 + intensity * 36, limit: 72, speed: 170 + intensity * 150, length: 5 + intensity * 8, opacity: .42, thickness: .8, wind: 1 },
    { depth: "near" as const, count: Math.max(0, (intensity - .25) * 18), limit: 18, speed: 340 + intensity * 270, length: 9 + intensity * 10, opacity: .5, thickness: 1.1, wind: .85 },
  ];
  return depths.map((layer) => {
    const slant = slope * layer.wind;
    const margin = Math.ceil(Math.abs(slant) * safeHeight * 2 + 24);
    return { depth: layer.depth, count: intensity > 0 ? Math.min(layer.limit, Math.floor(layer.count * density)) : 0, slope: slant, margin, width: Math.max(1, width) + margin * 2, height: safeHeight, duration: Math.max(400, Math.round(safeHeight / layer.speed * 1000)), length: layer.length, opacity: layer.opacity, thickness: layer.thickness };
  });
}
