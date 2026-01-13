/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    turbo: false, // ⛔ отключаем Turbopack
  },
};

module.exports = nextConfig;
