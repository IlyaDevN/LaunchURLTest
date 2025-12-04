// pages/_app.jsx

import clsx from "clsx";
import "../styles/global.css";
import { Inter } from "next/font/google";
import Head from "next/head";

const inter = Inter({ subsets: ["latin"] });

export default function App({ Component, pageProps }) {
  // Получаем базовый путь (на локалке пустая строка, на проде "/LaunchURLTest")
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

  return (
    <div className={clsx(inter.className, "text-slate-900")}>
      <Head>
        <title>Toolbox Launch URL</title>
        <meta name="description" content="iGaming URL Validator and Tools" />
        
        {/* Подключаем Manifest */}
        <link rel="manifest" href={`${basePath}/site.webmanifest`} />

        {/* Подключаем иконки. Добавил ?v=2, чтобы сбросить кеш браузера */}
        <link rel="icon" type="image/svg+xml" href={`${basePath}/favicon.svg?v=2`} />
        <link rel="alternate icon" href={`${basePath}/favicon.svg?v=2`} />
        <link rel="apple-touch-icon" href={`${basePath}/favicon.svg?v=2`} />
      </Head>

      <Component {...pageProps} />
    </div>
  );
}