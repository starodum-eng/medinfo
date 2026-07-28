// Динамическая конфигурация Expo.
// Статические значения живут в app.json; здесь добавляем только baseUrl для
// сборки под GitHub Pages (проект отдаётся по под-пути /medinfo/).
// Локальная разработка (expo start) не задаёт EXPO_BASE_URL → baseUrl пустой.
const appJson = require('./app.json');

const baseUrl = process.env.EXPO_BASE_URL || undefined;

module.exports = () => ({
  expo: {
    ...appJson.expo,
    experiments: {
      ...appJson.expo.experiments,
      ...(baseUrl ? { baseUrl } : {}),
    },
  },
});
