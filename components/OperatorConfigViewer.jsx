// components/OperatorConfigViewer.jsx
import { useState, useEffect, useCallback } from "react";
import { TURBO_GAMES, SLOT_GAMES } from "../staticData/games.js";

const OperatorConfigViewer = ({ gameId, operator, validationType, analyzedHost }) => {
    const [configData, setConfigData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fetchedUrl, setFetchedUrl] = useState(null);
    
    // Состояние для скрытия/показа сырого JSON
    const [showJson, setShowJson] = useState(false);

    // Сброс при смене параметров
    useEffect(() => {
        setConfigData(null);
        setError(null);
        setFetchedUrl(null);
        setShowJson(false); 
    }, [gameId, operator, validationType, analyzedHost]);

    // === ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ: ОПРЕДЕЛЕНИЕ СРЕДЫ (PROD/STAGE) ===
    const isStageEnvironment = () => {
        // 1. Если это явная проверка Stage Launch URL
        if (validationType === 'stageLaunchURLValidation') return true;
        
        // 2. Если это Round Details, смотрим на домен (analyzedHost)
        if (validationType === 'roundDetailsValidation' && analyzedHost) {
            // Если в домене есть 'staging' или 'spribe.dev' - считаем это стейджем
            if (analyzedHost.includes('staging') || analyzedHost.includes('spribe.dev')) {
                return true;
            }
        }
        
        // В остальных случаях - Prod
        return false;
    };

    const isStage = isStageEnvironment();

    // === ЛОГИКА ОПРЕДЕЛЕНИЯ РЕГИОНА ===
    const getAviatorRegion = (host) => {
        if (!host || host === "-") return { code: "UNKNOWN", color: "bg-gray-100 text-gray-600" };

        if (host.includes("eu-west-1")) return { code: "STAGE EU", color: "bg-pink-100 text-pink-800" };
        if (host.includes("eu-central-1")) return { code: "EU", color: "bg-blue-100 text-blue-800" };
        if (host.includes("af-south-1")) return { code: "AF", color: "bg-yellow-100 text-yellow-800" };
        if (host.includes("apac")) return { code: "APAC", color: "bg-red-100 text-red-800" };
        if (host.includes("sa-east-1")) return { code: "SA", color: "bg-green-100 text-green-800" };
        if (host.includes("app-hr1")) return { code: "HR", color: "bg-purple-100 text-purple-800" };

        return { code: "CUSTOM / UNKNOWN", color: "bg-gray-100 text-gray-800" };
    };

    // === БЕЗОПАСНОЕ ИЗВЛЕЧЕНИЕ ХОСТА ===
    const getServerHost = (data) => {
        if (!data) return null;
        
        let serverInfo = {};
        if (data.servers && Array.isArray(data.servers) && data.servers.length > 0) {
            serverInfo = data.servers[0];
        } else if (data.ws) {
            serverInfo = data.ws;
        }
        return serverInfo.host || null;
    };

    // === ГЕНЕРАЦИЯ ССЫЛОК УПРАВЛЕНИЯ ===
    const getManagementLinks = () => {
        // 1. ССЫЛКИ ДЛЯ STAGE
        if (isStage) {
            return {
                clientArea: "https://clientarea.staging.spribe.dev",
                adminArea: "https://admin.staging.spribe.dev"
            };
        }

        // 2. ССЫЛКИ ДЛЯ PROD
        const host = getServerHost(configData);
        const regionInfo = getAviatorRegion(host);
        
        // Базовая ссылка (EU или дефолт)
        let clientAreaUrl = "https://clientarea.spribegaming.com"; 

        // Переопределение в зависимости от региона
        switch (regionInfo.code) {
            case 'AF':
                clientAreaUrl = "https://clientarea-af.spribegaming.com";
                break;
            case 'APAC':
                clientAreaUrl = "https://clientarea-ap.spribegaming.com";
                break;
            case 'SA':
                clientAreaUrl = "https://clientarea-sa.spribegaming.com";
                break;
            case 'HR':
                clientAreaUrl = "https://clientarea-hr.spribegaming.com";
                break;
        }

        return {
            clientArea: clientAreaUrl,
            adminArea: "https://admin.spribe.io"
        };
    };

    const fetchConfig = useCallback(async () => {
        if (!gameId || !operator) return;

        setLoading(true);
        setError(null);
        setConfigData(null);

        // 1. ОПРЕДЕЛЯЕМ ПУТЬ К ИГРЕ
        let urlGamePath;
        if (TURBO_GAMES.includes(gameId)) {
            urlGamePath = 'turbo';
        } else if (SLOT_GAMES.includes(gameId)) {
            urlGamePath = 'slots';
        } else {
            urlGamePath = gameId;
        }

        // 2. ОПРЕДЕЛЯЕМ ДОМЕН
        let baseUrl;
        const _isStage = isStageEnvironment(); // Вычисляем внутри колбэка для актуальности

        if (_isStage) {
            baseUrl = "https://app-config.spribe.dev";
        } else {
            baseUrl = "https://app-config.spribegaming.com";
        }

        const timestamp = Date.now(); 
        const url = `${baseUrl}/${urlGamePath}/${operator}.json?t=${timestamp}`;
        setFetchedUrl(url);

        try {
            const response = await fetch(url);

            if (!response.ok) {
                if (response.status === 404) {
                    const fallbackUrl = `${baseUrl}/${urlGamePath}/${operator}?t=${timestamp}`;
                    const fallbackResponse = await fetch(fallbackUrl);
                    if (fallbackResponse.ok) {
                        const data = await fallbackResponse.json();
                        setConfigData(data);
                        setFetchedUrl(fallbackUrl);
                        return;
                    }
                }
                throw new Error(`Ошибка HTTP: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            setConfigData(data);
        } catch (err) {
            console.error(err);
            setError(`Не удалось загрузить конфиг.\nURL: ${url}\nДетали: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [gameId, operator, validationType, analyzedHost]);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    // === РЕНДЕРИНГ ДАННЫХ ДЛЯ AVIATOR ===
    const renderAviatorData = () => {
        const host = getServerHost(configData) || "-";
        
        // Получаем зону
        let zone = "-";
        if (configData?.servers && Array.isArray(configData.servers) && configData.servers.length > 0) {
            zone = configData.servers[0].zone || "-";
        } else if (configData?.ws) {
            zone = configData.ws.zone || "-";
        }

        const regionInfo = getAviatorRegion(host);

        // Стили
        const cardClass = "bg-gray-50 p-4 rounded-lg border border-gray-100 flex flex-col items-center justify-center text-center h-full";
        const labelClass = "text-gray-400 text-xs font-bold uppercase tracking-wider mb-2";
        const valueClass = "text-sm font-mono font-bold text-gray-700 break-all";

        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 items-stretch">
                
                {/* 1. REGION */}
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center h-full">
                    <span className={labelClass}>Detected Region</span>
                    <span className={`px-4 py-1 rounded-full font-extrabold text-xl ${regionInfo.color}`}>
                        {regionInfo.code}
                    </span>
                </div>

                {/* 2. HOST */}
                <div className={cardClass}>
                    <span className={labelClass}>Server Host</span>
                    <span className={valueClass}>
                        {host}
                    </span>
                </div>

                {/* 3. ZONE */}
                <div className={cardClass}>
                    <span className={labelClass}>Zone</span>
                    <span className={valueClass}>
                        {zone}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="mt-6 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-fade-in-up">
            <div className="bg-[#2e2691] px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    ⚙️ Конфигурация оператора
                </h3>
                <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${isStage ? 'bg-yellow-500 text-black' : 'bg-green-600 text-white'}`}>
                    {isStage ? 'Stage (Dev)' : 'Production'}
                </span>
            </div>

            <div className="p-6">
                {/* Состояние загрузки */}
                {loading && (
                    <div className="flex items-center text-indigo-600 py-4 justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Загрузка конфигурации...
                    </div>
                )}

                {/* Ошибка */}
                {error && (
                    <div className="mt-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
                        <p className="font-bold">❌ Ошибка загрузки конфига:</p>
                        <p className="whitespace-pre-wrap mt-1">{error}</p>
                        <button 
                            onClick={fetchConfig}
                            className="mt-3 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded border border-red-300 transition text-xs font-semibold"
                        >
                            Повторить попытку
                        </button>
                    </div>
                )}

                {/* Данные успешно загружены */}
                {configData && !loading && (
                    <div className="animate-fade-in">
                        <p className="text-xs text-gray-500 mb-4 flex justify-between">
                            <span>Конфиг для: <strong>{operator}</strong> / <strong>{gameId}</strong></span>
                            <span className="font-mono text-[10px] text-gray-400">{fetchedUrl}</span>
                        </p>
                        
                        {/* === БЛОК ВИЗУАЛИЗАЦИИ === */}
                        {gameId === 'aviator' && renderAviatorData()}

                        {gameId !== 'aviator' && (
                            <div className="p-4 bg-blue-50 text-blue-800 rounded-lg mb-4 text-sm">
                                Для игры <strong>{gameId}</strong> визуализация параметров еще не настроена.
                            </div>
                        )}

                        {/* === НОВЫЙ БЛОК: ССЫЛКИ УПРАВЛЕНИЯ === */}
                        {(() => {
                            const links = getManagementLinks();
                            return (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                    <a 
                                        href={links.clientArea}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 font-bold hover:bg-indigo-100 hover:shadow-md transition-all group"
                                    >
                                        <span>👤 Client Area</span>
                                        <svg className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                    </a>
                                    <a 
                                        href={links.adminArea}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 font-bold hover:bg-gray-200 hover:shadow-md transition-all group"
                                    >
                                        <span>🛠️ Admin Area</span>
                                        <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                    </a>
                                </div>
                            );
                        })()}

                        {/* Кнопка спойлера для JSON */}
                        <div className="border-t border-gray-100 pt-4">
                            <button
                                onClick={() => setShowJson(!showJson)}
                                className="text-xs text-gray-500 hover:text-[#2e2691] font-medium flex items-center gap-1 focus:outline-none transition-colors"
                            >
                                {showJson ? '🔼 Скрыть сырой JSON' : '🔽 Показать сырой JSON'}
                            </button>
                            
                            {showJson && (
                                <div className="mt-3 relative group">
                                    <pre className="p-4 bg-gray-900 text-green-400 rounded-lg overflow-auto text-xs font-mono border border-gray-700 shadow-inner max-h-96">
                                        {JSON.stringify(configData, null, 2)}
                                    </pre>
                                    <button 
                                        onClick={() => navigator.clipboard.writeText(JSON.stringify(configData, null, 2))}
                                        className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        Copy JSON
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-4 flex justify-end">
                            <button 
                                onClick={fetchConfig}
                                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
                            >
                                🔄 Обновить данные
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OperatorConfigViewer;