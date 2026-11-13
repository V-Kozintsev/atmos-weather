/** @param {object} _props - Выбор персонализации. @returns {null} Реклама доступна только в Android-приложении. */
export function WeatherAd(_props: { personalizedAds?: boolean } = {}): null { return null; }

/** @param {boolean} _enabled - Выбор пользователя. @returns {void} Рекламный SDK не подключается на вебе и iOS. */
export function setAdPersonalization(_enabled: boolean): void {}
