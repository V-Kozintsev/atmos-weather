import type { OutfitAdvice, OutfitOccasion } from "../../src/lib/outfit";
import type { WardrobePhoto } from "./wardrobeAssets";

type Gender = "woman" | "man";

/** @param {string} name - Название верхнего слоя из рекомендации. @param {Gender} gender - Мужской или женский крой. @param {OutfitAdvice} advice - Текущая степень утепления. @returns {WardrobePhoto} Фотография конкретного вида верхней одежды. */
export function upperPhoto(name: string, gender: Gender, advice: OutfitAdvice): WardrobePhoto {
  const text = name.toLocaleLowerCase("ru");
  const woman = gender === "woman";
  if (/дождевик|непромокаем|плащ/.test(text)) return woman ? "women-raincoat" : "men-raincoat";
  if (/пуховик/.test(text)) return woman ? "women-puffer" : "men-parka";
  if (/пальто/.test(text)) return woman ? /зимн|утепл|тёпл/.test(text) ? "women-warm-coat" : "women-coat" : /зимн|утепл|тёпл/.test(text) ? "men-warm-coat" : "men-coat";
  if (/жакет|пиджак/.test(text)) return woman ? "women-blazer" : "men-blazer";
  if (/кардиган/.test(text)) return "women-cardigan";
  if (/ветров|ветрозащит|от ветра/.test(text)) return woman ? "women-windbreaker" : "men-windbreaker";
  if (/куртк/.test(text)) return /зимн|утепл|тёпл/.test(text) ? woman ? "women-puffer" : "men-parka" : woman ? "women-windbreaker" : "men-jacket";
  if (/флис/.test(text)) return woman ? "women-fleece" : "men-fleece";
  if (/термо/.test(text)) return woman ? "women-thermal" : "men-thermal";
  if (/лонгслив/.test(text)) return woman ? "women-longsleeve" : "men-longsleeve";
  if (/свитер|джемпер|тёплый слой/.test(text)) return woman ? ["cold", "frost"].includes(advice.style) || /тёпл|свитер/.test(text) ? "women-warm-knit" : "women-knit" : /тёпл|свитер/.test(text) ? "men-warm-knit" : "men-knit";
  if (/блуз/.test(text)) return /льн/.test(text) || advice.style === "heat" ? "women-linen-blouse" : "women-blouse";
  if (/рубашк/.test(text)) return /льн/.test(text) ? "men-linen-shirt" : "men-shirt";
  return woman ? /спортив|топ/.test(text) ? "women-sport-tee" : "women-tee" : /спортив/.test(text) ? "men-sport-tee" : "men-tee";
}

/** @param {string} name - Название аксессуара. @param {Gender} gender - Вариант комплекта. @returns {WardrobePhoto | undefined} Соответствующий предмет без подмены обуви или зимних вещей зонтом. */
export function accessoryPhoto(name: string, gender: Gender): WardrobePhoto | undefined {
  if (/перчат/i.test(name)) return "gloves";
  if (/вареж/i.test(name)) return "mittens";
  if (/шапк/i.test(name)) return gender === "woman" ? "hat-cream" : "hat-navy";
  if (/шарф/i.test(name)) return "scarf";
  if (/снуд|ветр/i.test(name)) return "snood";
  if (/дождевик|дождя/i.test(name)) return /зонт/i.test(name) ? "umbrella-folded" : "rain-poncho";
  if (/зонт/i.test(name)) return "umbrella-folded";
  if (/очки/i.test(name)) return "sunglasses";
  if (/панам|головн/i.test(name)) return "sun-hat";
  if (/кепк/i.test(name)) return "cap";
  if (/носк/i.test(name)) return /тёпл|шерст/i.test(name) ? "wool-socks" : "sports-socks";
  if (/термо/i.test(name)) return "thermal-leggings";
  return;
}

/** @param {OutfitAdvice} advice - Рекомендация и категории одежды. @param {Gender} gender - Крой вещей. @param {OutfitOccasion} occasion - Повседневный, офисный или спортивный стиль. @returns {object} Изображения, соответствующие тексту комплекта и условиям погоды. */
export function selectWardrobe(advice: OutfitAdvice, gender: Gender, occasion: OutfitOccasion): { top: WardrobePhoto; outer: WardrobePhoto; lower: WardrobePhoto; shoes: WardrobePhoto; accessories: WardrobePhoto[] } {
  const woman = gender === "woman";
  const lowerName = advice.pieces.lower.toLocaleLowerCase("ru");
  const shoeName = advice.pieces.shoes.toLocaleLowerCase("ru");
  const winter = advice.style === "frost" || /зимн/.test(shoeName);
  const wet = /непромок|водо/.test(shoeName);
  const warm = /тёпл|утепл/.test(shoeName);
  const boots = /ботин|ботильон|сапог/.test(shoeName);
  let lower: WardrobePhoto;
  if (/юбк/.test(lowerName)) lower = /льн|лёгк/.test(lowerName) ? "women-linen-skirt" : "women-skirt";
  else if (/шорт/.test(lowerName)) lower = woman ? "women-shorts" : occasion === "sport" ? "men-sport-shorts" : "men-shorts";
  else if (/утепл|тёпл/.test(lowerName)) lower = woman ? "women-warm-trousers" : "men-warm-trousers";
  else if (/спортив|джоггер/.test(lowerName)) lower = woman ? "women-joggers" : "men-joggers";
  else lower = woman ? occasion === "office" ? "women-formal-trousers" : "women-trousers" : occasion === "office" ? "men-trousers" : "men-chinos";
  let shoes: WardrobePhoto;
  if (winter) shoes = woman ? "women-winter-boots" : occasion === "sport" ? "men-winter-sport-boots" : "men-winter-boots";
  else if (wet) shoes = woman ? "women-rain-boots" : "men-rain-boots";
  else if (warm) shoes = woman ? "women-warm-boots" : "men-winter-boots";
  else if (boots || /закрытая обувь/.test(shoeName)) shoes = woman ? "women-boots" : "men-boots";
  else if (/лофер/.test(shoeName)) shoes = woman ? "women-loafers" : "men-loafers";
  else if (/сандал|открыт/.test(shoeName)) shoes = woman ? "women-sandals" : "men-sandals";
  else shoes = woman ? occasion === "sport" ? "women-running" : "women-sneakers" : occasion === "sport" ? "men-running" : "men-sneakers";
  const visibleTop = advice.pieces.upper.split(/ и /).at(-1)!;
  return { top: upperPhoto(visibleTop, gender, advice), outer: upperPhoto(advice.pieces.outer || visibleTop, gender, advice), lower, shoes, accessories: advice.pieces.accessories.map((name) => accessoryPhoto(name, gender)).filter((item): item is WardrobePhoto => Boolean(item)) };
}

/** @param {OutfitAdvice} advice - Реальный комплект. @returns {string} Краткая подпись карточки без длинных уточнений кроя, которые остаются в полном списке. */
export function outfitCardSummary(advice: OutfitAdvice): string {
  const upper = advice.pieces.outer || advice.pieces.upper;
  const top = /плащ|дождевик|непромок/i.test(upper) ? "Дождевик" : /пальто/i.test(upper) ? "Пальто" : /пуховик/i.test(upper) ? "Пуховик" : /ветров|ветрозащит/i.test(upper) ? "Ветровка" : /куртк/i.test(upper) ? "Куртка" : /жакет|пиджак/i.test(upper) ? "Жакет" : /кардиган/i.test(upper) ? "Кардиган" : /блуз/i.test(upper) ? "Блуза" : /рубашк/i.test(upper) ? "Рубашка" : /термо/i.test(upper) ? "Термослой" : /свитер|джемпер/i.test(upper) ? "Джемпер" : "Футболка";
  const bottom = /юбк/i.test(advice.pieces.lower) ? "юбка" : /шорт/i.test(advice.pieces.lower) ? "шорты" : /джоггер|спортив/i.test(advice.pieces.lower) ? "джоггеры" : "брюки";
  const shoes = /зимн|тёпл|утепл|ботин|ботильон|сапог/i.test(advice.pieces.shoes) ? "ботинки" : /лофер/i.test(advice.pieces.shoes) ? "лоферы" : /сандал|открыт/i.test(advice.pieces.shoes) ? "сандалии" : /кед/i.test(advice.pieces.shoes) ? "кеды" : "закрытая обувь";
  return `${top}, ${bottom} и ${shoes}`;
}
