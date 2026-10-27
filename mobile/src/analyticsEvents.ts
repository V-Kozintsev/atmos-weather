export type AnalyticsEvent = "screen_view" | "outfit_view" | "store_open" | "city_selected" | "forecast_loaded";
export interface AnalyticsParameters { screen?: "weather" | "outfit" | "settings"; store?: "ozon" | "wb"; period?: "hour" | "day"; source?: "search" | "location" | "favorite" }
