import { isCity, type City } from "./weather";

/** @returns {City | undefined} Город из публичной веб-ссылки; некорректные параметры игнорируются. */
export function cityFromUrl(): City | undefined {
  const p = new URLSearchParams(location.search);
  if (!p.has("lat") || !p.has("lon")) return;
  const latitude = Number(p.get("lat")),
    longitude = Number(p.get("lon"));
  const city = {
    id: `${latitude},${longitude}`,
    name: p.get("city") || "На карте",
    country: p.get("region") || "",
    latitude,
    longitude,
  };
  return isCity(city) ? city : undefined;
}
