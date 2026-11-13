/**
 * @param {string | undefined} template - Партнёрская ссылка с местом {url}, например deeplink партнёрской сети.
 * @param {string} url - Обычная ссылка на поиск в магазине.
 * @returns {string} Партнёрская ссылка, если шаблон задан корректно, иначе исходная ссылка без изменений.
 */
export function partnerLink(template: string | undefined, url: string): string {
  if (!isPartnerTemplate(template)) return url;
  return template.replace("{url}", encodeURIComponent(url));
}

/** @param {string | undefined} template - Значение из сборки. @returns {boolean} Шаблон ведёт на HTTPS и содержит ровно одно место для ссылки. */
export function isPartnerTemplate(template: string | undefined): template is string {
  return typeof template === "string" && template.startsWith("https://") && template.split("{url}").length === 2;
}
