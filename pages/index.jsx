// pages/index.jsx
import { useState } from "react";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import UrlCheckerForm from "../components/UrlCheckerForm.jsx";
import RoundDetails from "../components/RoundDetails.jsx";
import SignatureGenerator from "../components/SignatureGenerator.jsx"; // Импорт нового компонента
import SettingsPanel from "../components/SettingsPanel.jsx";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("validator");

  const renderContent = () => {
    switch (activeTab) {
      case "validator":
        return <UrlCheckerForm />;
      case "roundDetails":
        return <RoundDetails />;
      case "signature":
        return <SignatureGenerator />; // Добавлен в рендер
      case "settings":
        return <SettingsPanel />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 font-sans">
      <Header />

      {/* Основной контейнер с боковой панелью */}
      <div className="flex flex-1 overflow-hidden">
        {/* Боковая панель */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Главная область контента */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-10">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}