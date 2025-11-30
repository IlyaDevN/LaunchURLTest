/** @type {import('next').NextConfig} */

// Определяем, работаем ли мы в режиме продакшена (для деплоя)
const isProd = process.env.NODE_ENV === 'production'

// *** Имя вашего репозитория: LaunchURLTest
const REPO_NAME = 'LaunchURLTest';

const nextConfig = {
  // КЛЮЧЕВАЯ НАСТРОЙКА: Включает режим статического экспорта (папка 'out')
  output: 'export',
  
  // Указывает базовый путь для всех ресурсов (CSS, JS).
  // Будет: https://ilyadevn.github.io/LaunchURLTest/
  basePath: isProd ? `/${REPO_NAME}` : '',

  // === ВАЖНОЕ ДОБАВЛЕНИЕ ===
  // Передаем этот путь в код приложения, чтобы _app.jsx мог его прочитать
  env: {
    NEXT_PUBLIC_BASE_PATH: isProd ? `/${REPO_NAME}` : '',
  },
  
  // Дополнительные настройки для статики
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig;