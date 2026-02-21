// pages/index.jsx
import { useState } from "react";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import UrlCheckerForm from "../components/UrlCheckerForm.jsx";
import OperatorConfig from "../components/OperatorConfig.jsx"; // <--- Импорт нового компонента
import RoundDetails from "../components/RoundDetails.jsx";
import SignatureGenerator from "../components/SignatureGenerator.jsx";
import GameAvailability from "../components/GameAvailability.jsx";
import SettingsPanel from "../components/SettingsPanel.jsx";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("operatorConfig");

  const renderContent = () => {
    switch (activeTab) {
      case "validator":
        return <UrlCheckerForm />;
      case "operatorConfig":
        return <OperatorConfig />;
      case "roundDetails":
        return <RoundDetails />;
      case "signature":
        return <SignatureGenerator />;
      case "availability":
        return <GameAvailability />;
      case "settings":
        return <SettingsPanel />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 font-sans">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-10">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}