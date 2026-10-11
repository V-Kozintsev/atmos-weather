/** @param {number} code - Код WMO. @param {boolean} night - Ночное время. @returns {string} Локальная SVG-иконка без сети, фильтров и анимации. */
export function weatherArtwork(code: number, night = false): string {
  const clear = code === 0;
  const fog = code === 45 || code === 48;
  const snow = (code >= 71 && code <= 77) || code === 85 || code === 86;
  const rain = (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
  const storm = code >= 95;
  const sun = `<g stroke="#fbc568" stroke-width="3" stroke-linecap="round"><path d="M42 8v7M42 69v7M8 42h7M69 42h7M18 18l5 5M61 61l5 5M18 66l5-5M61 23l5-5"/></g><circle cx="42" cy="42" r="23" fill="url(#sun)"/><circle cx="35" cy="34" r="12" fill="#fff1c0" opacity=".35"/>`;
  const moon = `<path d="M62 17a29 29 0 1 0 17 43A28 28 0 0 1 62 17" fill="url(#moon)"/><circle cx="29" cy="53" r="4" fill="#abc6e7" opacity=".4"/>`;
  const cloud = `<path d="M27 72a15 15 0 0 1-1-30 22 22 0 0 1 42-7 18 18 0 1 1 9 37Z" fill="url(#cloud)"/><path d="M29 46a18 18 0 0 1 33-5" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>`;
  const drops = `<g fill="#77c9ee"><path d="M32 76c-2 4-6 9-6 12a4 4 0 0 0 8 0c0-3-2-8-2-12ZM54 76c-2 4-6 9-6 12a4 4 0 0 0 8 0c0-3-2-8-2-12ZM76 76c-2 4-6 9-6 12a4 4 0 0 0 8 0c0-3-2-8-2-12Z"/></g>`;
  const flakes = `<g stroke="#a1d9f3" stroke-width="2.5" stroke-linecap="round"><path d="M32 78v16m-7-12 14 8m-14 0 14-8M68 78v16m-7-12 14 8m-14 0 14-8"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><defs><radialGradient id="sun" cx=".35" cy=".3" r=".8"><stop stop-color="#fff0a2"/><stop offset=".65" stop-color="#ffd064"/><stop offset="1" stop-color="#f6a841"/></radialGradient><linearGradient id="cloud" x2="0" y2="1"><stop stop-color="#fff"/><stop offset="1" stop-color="#b6c9d5"/></linearGradient><linearGradient id="moon" x2="1" y2="1"><stop stop-color="#e9f5ff"/><stop offset="1" stop-color="#a2c1e2"/></linearGradient></defs>${clear ? (night ? moon : sun) : code <= 2 ? `<g transform="translate(7 -3) scale(.75)">${night ? moon : sun}</g>${cloud}` : cloud}${storm ? '<path d="m53 68-12 18h11l-4 13 20-21H56l5-10Z" fill="#ffd365"/>' : snow ? flakes : rain ? drops : fog ? '<g stroke="#bbd2d8" stroke-width="4" stroke-linecap="round"><path d="M18 80h61M28 89h57"/></g>' : ""}</svg>`;
}
