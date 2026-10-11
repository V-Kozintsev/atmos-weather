/** @param {object} options - Статическая конфигурация Expo. @returns {object} Общая конфигурация с базовым путём для веб-публикации. */
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, baseUrl: process.env.ATMOS_WEB_BASE_PATH || "" },
});
