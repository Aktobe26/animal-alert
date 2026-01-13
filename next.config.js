const isDev = process.env.NODE_ENV === "development";

const withPWA = require("next-pwa")({
  dest: "public",
  disable: isDev, // 🔥 ВОТ ЭТО РЕШАЕТ ЦИКЛ
});

module.exports = withPWA({
  reactStrictMode: false,
});
