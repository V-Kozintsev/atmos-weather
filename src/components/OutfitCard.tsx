import { useState } from "react";
import { CloudRain, CloudSnow, ExternalLink, Settings2, Sparkles } from "lucide-react";
import { defaultOutfitPreferences, outfitForDay, outfitForHour, type OutfitOccasion, type OutfitPreferences, type WarmthPreference } from "../lib/outfit";
import type { Day, Hour } from "../lib/weather";
import { readStorage, saveStorage } from "../lib/api";
import "./OutfitCard.css";

interface Props {
  hour: Hour;
  day: Day;
  remainingHours: Hour[];
  hourLabel: string;
}

/** @param {Props} props - Прогноз для ближайшего часа и оставшегося дня. @returns {JSX.Element} Образ и настройки подбора. */
export default function OutfitCard({ hour, day, remainingHours, hourLabel }: Props) {
  const [mode, setMode] = useState<"hour" | "day">("hour");
  const [gender, setGender] = useState<"woman" | "man">(() => readStorage<string>("atmos-outfit-gender", "woman") === "man" ? "man" : "woman");
  const [selectedPiece, setSelectedPiece] = useState("outer");
  const [preferences, setPreferences] = useState<OutfitPreferences>(() => {
    const saved = readStorage<Partial<OutfitPreferences>>("atmos-outfit-preferences", defaultOutfitPreferences);
    if (!saved || typeof saved !== "object") return defaultOutfitPreferences;
    return {
      occasion: saved.occasion === "office" || saved.occasion === "sport" ? saved.occasion : "casual",
      warmth: saved.warmth === "warmer" || saved.warmth === "lighter" ? saved.warmth : "balanced",
    };
  });
  const advice = mode === "hour" ? outfitForHour(hour, { ...preferences, gender }) : outfitForDay(day, remainingHours, hour, { ...preferences, gender });
  const bottomStyle = advice.style === "heat" || advice.style === "warm" ? "warm" : advice.style === "mild" ? "mild" : advice.style === "cool" ? "cool" : "cold";
  const topStyle = advice.rain && (advice.style === "mild" || advice.style === "cool") ? "rain" : bottomStyle;
  const shoppingPieces = [
    { id: "upper", label: "Верх", name: advice.pieces.upper },
    ...(advice.pieces.outer ? [{ id: "outer", label: "Слой", name: advice.pieces.outer }] : []),
    { id: "lower", label: "Низ", name: advice.pieces.lower },
    { id: "shoes", label: "Обувь", name: advice.pieces.shoes },
  ];
  const activePiece = shoppingPieces.find((piece) => piece.id === selectedPiece) ?? shoppingPieces[0];
  const productQuery = `${gender === "woman" ? "женская" : "мужская"} ${activePiece.name}`;

  /** @param {"ozon" | "wildberries"} marketplace - Площадка поиска. @returns {string} Ссылка на поиск похожей вещи без партнёрского идентификатора. */
  function shoppingUrl(marketplace: "ozon" | "wildberries"): string {
    const search = encodeURIComponent(productQuery);
    return marketplace === "ozon" ? `https://www.ozon.ru/search/?text=${search}` : `https://www.wildberries.ru/catalog/0/search.aspx?search=${search}`;
  }

  /** @param {"woman" | "man"} next - Вариант персонажа. @returns {void} Сохраняет выбор только на этом устройстве. */
  function selectGender(next: "woman" | "man"): void {
    setGender(next);
    saveStorage("atmos-outfit-gender", next);
  }

  /** @param {Partial<OutfitPreferences>} change - Изменение стиля или комфорта. @returns {void} Сохраняет настройки на устройстве. */
  function updatePreferences(change: Partial<OutfitPreferences>): void {
    const next = { ...preferences, ...change };
    setPreferences(next);
    saveStorage("atmos-outfit-preferences", next);
  }

  return (
    <section className="outfit-card" aria-labelledby="outfit-heading">
      <div className="outfit-visual" aria-hidden="true">
        <span className="outfit-halo" />
        <img className="outfit-model" src={`${import.meta.env.BASE_URL}outfits/${gender}-${bottomStyle}.webp`} alt="" width="480" height="720" />
        {topStyle !== bottomStyle && <img className="outfit-model outfit-model-top" src={`${import.meta.env.BASE_URL}outfits/${gender}-${topStyle}.webp`} alt="" width="480" height="720" />}
        {advice.rain && (advice.feels <= 0
          ? <CloudSnow className="outfit-weather-icon" size={30} strokeWidth={1.5} />
          : <CloudRain className="outfit-weather-icon" size={30} strokeWidth={1.5} />)}
      </div>
      <div className="outfit-content">
        <span className="eyebrow"><Sparkles size={14} /> ЧТО НАДЕТЬ</span>
        <div className="outfit-gender" aria-label="Вариант образа">
          <button type="button" aria-pressed={gender === "woman"} className={gender === "woman" ? "active" : ""} onClick={() => selectGender("woman")}>Женский</button>
          <button type="button" aria-pressed={gender === "man"} className={gender === "man" ? "active" : ""} onClick={() => selectGender("man")}>Мужской</button>
        </div>
        <div className="outfit-tabs" aria-label="Период рекомендации">
          <button type="button" aria-pressed={mode === "hour"} className={mode === "hour" ? "active" : ""} onClick={() => setMode("hour")}>Ближайший час</button>
          <button type="button" aria-pressed={mode === "day"} className={mode === "day" ? "active" : ""} onClick={() => setMode("day")}>На весь день</button>
        </div>
        <details className="outfit-settings">
          <summary><Settings2 size={16} /> Настроить образ</summary>
          <div className="outfit-setting-group" aria-label="Стиль одежды">
            <span>Стиль</span>
            {([ ["casual", "Повседневный"], ["office", "Офис"], ["sport", "Активный"] ] as [OutfitOccasion, string][]).map(([value, label]) => (
              <button type="button" key={value} aria-pressed={preferences.occasion === value} onClick={() => updatePreferences({ occasion: value })}>{label}</button>
            ))}
          </div>
          <div className="outfit-setting-group" aria-label="Чувствительность к холоду">
            <span>Комфорт</span>
            {([ ["balanced", "Обычно"], ["warmer", "Мёрзну"], ["lighter", "Мне жарко"] ] as [WarmthPreference, string][]).map(([value, label]) => (
              <button type="button" key={value} aria-pressed={preferences.warmth === value} onClick={() => updatePreferences({ warmth: value })}>{label}</button>
            ))}
          </div>
        </details>
        <h2 id="outfit-heading">{advice.title}</h2>
        <p className="outfit-note">{mode === "hour" ? `${hourLabel} · ` : "До конца дня · "}{advice.note}</p>
        <dl className="outfit-list">
          <div><dt>Верх</dt><dd>{advice.pieces.upper}</dd></div>
          {advice.pieces.outer && <div><dt>Слой</dt><dd>{advice.pieces.outer}</dd></div>}
          <div><dt>Низ</dt><dd>{advice.pieces.lower}</dd></div>
          <div><dt>Обувь</dt><dd>{advice.pieces.shoes}</dd></div>
          {advice.pieces.accessories.length > 0 && <div><dt>С собой</dt><dd>{advice.pieces.accessories.join(" · ")}</dd></div>}
        </dl>
        <p className="outfit-disclaimer">Фото показывает уровень утепления. Детали комплекта — в списке; выбирайте вещи под свой комфорт.</p>
        <details className="outfit-shopping">
          <summary>Найти похожую вещь</summary>
          <div className="outfit-shopping-controls">
            <label htmlFor="outfit-piece">Что искать</label>
            <select id="outfit-piece" value={activePiece.id} onChange={(event) => setSelectedPiece(event.target.value)}>
              {shoppingPieces.map((piece) => <option key={piece.id} value={piece.id}>{piece.label} · {piece.name}</option>)}
            </select>
          </div>
          <div className="outfit-shopping-links">
            <a href={shoppingUrl("ozon")} target="_blank" rel="noopener noreferrer">Ozon <ExternalLink size={14} /></a>
            <a href={shoppingUrl("wildberries")} target="_blank" rel="noopener noreferrer">Wildberries <ExternalLink size={14} /></a>
          </div>
          <p>Откроется поиск в магазине. Цены и наличие проверяйте там.</p>
        </details>
      </div>
    </section>
  );
}
