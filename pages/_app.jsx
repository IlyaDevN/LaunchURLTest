// pages/_app.jsx

import clsx from "clsx";
import "../styles/global.css";
import { Inter } from "next/font/google";
// 1. Импортируем компонент Head для управления мета-тегами
import Head from "next/head";

const inter = Inter({ subsets: ["latin"] });

export default function App({ Component, pageProps }) {
  return (
    <div className={clsx(inter.className, "text-slate-900")}>
      {/* 2. Добавляем блок Head с настройками заголовка и иконки */}
      <Head>
          <title>Toolbox Launch URL</title>
          <meta name="description" content="iGaming URL Validator and Tools" />

          {/* Основная иконка */}
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

          {/* Apple Touch Icon (для закладок на айфонах/маках - будет использовать тот же svg, 
              но лучше в будущем сделать png, пока сойдет как заглушка) */}
          <link rel="apple-touch-icon" href="/favicon.svg" />
      </Head>

      <Component {...pageProps} />
    </div>
  );
}