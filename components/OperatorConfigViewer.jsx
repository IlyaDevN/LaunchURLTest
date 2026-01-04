// components/OperatorConfigViewer.jsx
import { useState, useEffect, useCallback } from "react";
// Импортируем общий конфиг
import { GAMES_CONFIG } from "../staticData/games.js";

const OperatorConfigViewer = ({ gameId, operator, validationType, analyzedHost }) => {
    const [configData, setConfigData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fetchedUrl, setFetchedUrl] = useState(null);
    const [showJson, setShowJson] = useState(false);

    useEffect(() => {
        setConfigData(null);
        setError(null);
        setFetchedUrl(null);
        setShowJson(false); 
    }, [gameId, operator, validationType, analyzedHost]);

    // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
    // Оборачиваем в useCallback, чтобы использовать как зависимость
    const isStageEnvironment = useCallback(() => {
        if (validationType === 'stageLaunchURLValidation') return true;
        if (validationType === 'roundDetailsValidation' && analyzedHost) {
            if (analyzedHost.includes('staging') || analyzedHost.includes('spribe.dev')) return true;
        }
        return false;
    }, [validationType, analyzedHost]);

    const isStage = isStageEnvironment();

    const getRegionInfo = (host) => {
        if (!host || host === "-") return { code: "UNKNOWN", color: "bg-gray-100 text-gray-600" };
        const h = host.toLowerCase();
        if (h.includes("eu-west-1")) return { code: "STAGE EU", color: "bg-pink-100 text-pink-800" };
        if (h.includes("eu-central-1")) return { code: "EU", color: "bg-blue-100 text-blue-800" };
        if (h.includes("af-south-1")) return { code: "AF", color: "bg-yellow-100 text-yellow-800" };
        if (h.includes("apac") || h.includes("ap-east-1") || h.includes("ap-southeast-1")) return { code: "APAC", color: "bg-red-100 text-red-800" };
        if (h.includes("sa-east-1")) return { code: "SA", color: "bg-green-100 text-green-800" };
        if (h.includes("app-hr1")) return { code: "HR", color: "bg-purple-100 text-purple-800" };
        if (h.includes("staging")) return { code: "STAGE", color: "bg-yellow-100 text-yellow-800" };
        return { code: "CUSTOM / UNKNOWN", color: "bg-gray-100 text-gray-800" };
    };

    const getGeneralHostForLinks = (data) => {
        if (!data) return null;
        if (data.games) {
            if (data.games[gameId] && data.games[gameId].host) return data.games[gameId].host;
            const firstGameKey = Object.keys(data.games)[0];
            if (firstGameKey && data.games[firstGameKey].host) return data.games[firstGameKey].host;
        }
        if (data.servers && Array.isArray(data.servers) && data.servers.length > 0) return data.servers[0].host;
        else if (data.ws) return data.ws.host;
        return null;
    };

    const getManagementLinks = () => {
        if (isStage) return { 
            clientArea: "https://clientarea.staging.spribe.dev", 
            adminArea: "https://admin.staging.spribe.dev",
            openSearch: null 
        };

        const host = getGeneralHostForLinks(configData);
        const regionInfo = getRegionInfo(host);
        
        let clientAreaUrl = "https://clientarea.spribegaming.com"; 
        let openSearchUrl = null;

        switch (regionInfo.code) {
            case 'AF': 
                clientAreaUrl = "https://clientarea-af.spribegaming.com"; 
                openSearchUrl = "https://login.spribe.co/home/spribe_opensearchgameproviderprodafs1_1/0oamv28x6qud0KGcn417/alnmv2e4en2fjOq0u417";
                break;
            case 'APAC': 
                clientAreaUrl = "https://clientarea-ap.spribegaming.com"; 
                openSearchUrl = "https://login.spribe.co/home/spribe_opensearchgameproviderprodapac1_1/0oan20vt3gAD14xe0417/alnn210xxwAPR9mMw417";
                break;
            case 'SA': 
                clientAreaUrl = "https://clientarea-sa.spribegaming.com"; 
                openSearchUrl = "https://login.spribe.co/home/spribe_opensearchgameproviderprodsaest1_1/0oan2135ycaDYNsxy417/alnn21gafdEgawzBc417";
                break;
            case 'HR': 
                clientAreaUrl = "https://clientarea-hr.spribegaming.com"; 
                break;
            case 'EU':
                openSearchUrl = "https://login.spribe.co/home/spribe_opensearchgameproviderprodeuc1_1/0oamm3koxiTWi4fna417/alnmm3tuiqTybDTqd417";
                break;
        }

        return { 
            clientArea: clientAreaUrl, 
            adminArea: "https://admin.spribe.io",
            openSearch: openSearchUrl
        };
    };
    
    const fetchConfig = useCallback(async () => {
        if (!gameId || !operator) return;

        setLoading(true);
        setError(null);
        setConfigData(null);

        let urlGamePath = gameId; 
        const gameInfo = GAMES_CONFIG.find(g => g.id === gameId);
        
        if (gameInfo) {
            if (gameInfo.category === 'turbo') {
                urlGamePath = 'turbo';
            } else if (gameInfo.category === 'slots') {
                urlGamePath = 'slots';
            }
        }

        let baseUrl;
        const _isStage = isStageEnvironment();

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
    }, [gameId, operator, isStageEnvironment]); // Добавлена зависимость isStageEnvironment

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const renderGameData = () => {
        let host = "-";
        let zone = "-";
        let isGameFound = true; 
        let isFallbackData = false; 

        if (configData?.games) {
            if (configData.games[gameId]) {
                const gameConfig = configData.games[gameId];
                host = gameConfig.host || "-";
                zone = gameConfig.zone || "-";
            } else {
                isGameFound = false;
                const availableGames = Object.keys(configData.games);
                if (availableGames.length > 0) {
                    const firstGameKey = availableGames[0];
                    const fallbackConfig = configData.games[firstGameKey];
                    host = fallbackConfig.host || "-";
                    zone = fallbackConfig.zone || "-";
                    isFallbackData = true;
                }
            }
        } else if (configData?.servers && Array.isArray(configData.servers) && configData.servers.length > 0) {
            host = configData.servers[0].host || "-";
            zone = configData.servers[0].zone || "-";
        } else if (configData?.ws) {
            host = configData.ws.host || "-";
            zone = configData.ws.zone || "-";
        } else {
            host = "-";
        }

        const regionInfo = getRegionInfo(host);
        const cardClass = "bg-gray-50 p-4 rounded-lg border border-gray-100 flex flex-col items-center justify-center text-center h-full";
        const labelClass = "text-gray-400 text-xs font-bold uppercase tracking-wider mb-2";
        const valueClass = "text-sm font-mono font-bold text-gray-700 break-all";

        return (
            <div className="mb-6">
                {!isGameFound && isFallbackData && (
                    <div className="p-4 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-lg mb-4 text-sm">
                        ⚠️ Настройки для <strong>{gameId}</strong> отсутствуют! <strong>Возможно игра не включена для данного оператора.</strong>
                        <br/>
                        Ниже показаны параметры региона на основе других игр из конфигурации оператора.
                    </div>
                )}
                
                {!isGameFound && !isFallbackData && (
                    <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded-lg mb-4 text-sm">
                        ❌ Игра <strong>{gameId}</strong> не найдена, и нет данных других игр для определения региона.
                    </div>
                )}

                {(isGameFound || isFallbackData) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center h-full">
                            <span className={labelClass}>Detected Region</span>
                            <span className={`px-4 py-1 rounded-full font-extrabold text-xl ${regionInfo.color}`}>
                                {regionInfo.code}
                            </span>
                        </div>
                        <div className={cardClass}>
                            <span className={labelClass}>Server Host {isFallbackData ? '(Fallback)' : ''}</span>
                            <span className={valueClass}>{host}</span>
                        </div>
                        <div className={cardClass}>
                            <span className={labelClass}>Zone {isFallbackData ? '(Fallback)' : ''}</span>
                            <span className={valueClass}>{zone}</span>
                        </div>
                    </div>
                )}
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
                {loading && (
                    <div className="flex items-center text-indigo-600 py-4 justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Загрузка конфигурации...
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
                        <p className="font-bold">❌ Ошибка загрузки конфига:</p>
                        <p className="whitespace-pre-wrap mt-1">{error}</p>
                        <button onClick={fetchConfig} className="mt-3 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded border border-red-300 transition text-xs font-semibold">
                            Повторить попытку
                        </button>
                    </div>
                )}

                {configData && !loading && (
                    <div className="animate-fade-in">
                        <p className="text-xs text-gray-500 mb-4 flex justify-between">
                            <span>Конфиг для: <strong>{operator}</strong> / <strong>{gameId}</strong></span>
                            <span className="font-mono text-[10px] text-gray-400">{fetchedUrl}</span>
                        </p>
                        
                        {renderGameData()}

                        {(() => {
                            const links = getManagementLinks();
                            const gridColsClass = links.openSearch 
                                ? "grid-cols-1 sm:grid-cols-3" 
                                : "grid-cols-1 sm:grid-cols-2";

                            return (
                                <div className={`grid ${gridColsClass} gap-4 mb-6`}>
                                    
                                    <a href={links.clientArea} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 font-bold hover:bg-indigo-100 hover:shadow-md transition-all group">
                                        <span>👤 Client Area</span>
                                        <svg className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                    </a>

                                    <a href={links.adminArea} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[#990000] font-bold hover:bg-red-100 hover:shadow-md transition-all group">
                                        <span>🛠️ Admin Area</span>
                                        <svg className="w-4 h-4 text-red-400 group-hover:text-[#990000]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                    </a>

                                    {links.openSearch && (
                                        <a href={links.openSearch} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-3 bg-teal-50 border border-teal-200 rounded-lg text-teal-700 font-bold hover:bg-teal-100 hover:shadow-md transition-all group">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className="w-6 h-6 shrink-0">
                                                <path fill="#00A3E0" d="M61.74 23.5a2.26 2.26 0 0 0-2.27 2.26 33.71 33.71 0 0 1-33.7 33.71 2.26 2.26 0 1 0 0 4.53A38.24 38.24 0 0 0 64 25.76a2.26 2.26 0 0 0-2.26-2.26Z"/>
                                                <path fill="#00A3E0" d="M3.92 14A24.43 24.43 0 0 0 .05 28.9c.86 13.73 13.3 24.14 25.03 23.02 4.6-.45 9.31-4.2 8.9-10.9-.19-2.92-1.62-4.64-3.93-5.96C27.84 33.8 25 33 21.79 32.1c-3.89-1.1-8.4-2.32-11.85-4.87-4.15-3.06-6.99-6.6-6.02-13.23Z"/>
                                                <path fill="#B9D9EB" d="M48.08 38a24.43 24.43 0 0 0 3.87-14.9C51.09 9.36 38.65-1.05 26.92.07c-4.6.45-9.31 4.2-8.9 10.9.19 2.92 1.62 4.64 3.93 5.96C24.16 18.2 27 19 30.21 19.9c3.89 1.1 8.4 2.32 11.85 4.87 4.15 3.06 6.99 6.6 6.02 13.23Z"/>
                                            </svg>
                                            
                                            <span>Opensearch</span>
                                            
                                            {/* Убран ml-auto, теперь центрирование корректное */}
                                            <svg className="w-4 h-4 text-teal-400 group-hover:text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                        </a>
                                    )}
                                </div>
                            );
                        })()}

                        <div className="border-t border-gray-100 pt-4">
                            <button onClick={() => setShowJson(!showJson)} className="text-xs text-gray-500 hover:text-[#2e2691] font-medium flex items-center gap-1 focus:outline-none transition-colors">
                                {showJson ? '🔼 Скрыть сырой JSON' : '🔽 Показать сырой JSON'}
                            </button>
                            {showJson && (
                                <div className="mt-3 relative group">
                                    <pre className="p-4 bg-gray-900 text-green-400 rounded-lg overflow-auto text-xs font-mono border border-gray-700 shadow-inner max-h-96">
                                        {JSON.stringify(configData, null, 2)}
                                    </pre>
                                    <button onClick={() => navigator.clipboard.writeText(JSON.stringify(configData, null, 2))} className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                        Copy JSON
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <div className="mt-4 flex justify-end">
                            <button onClick={fetchConfig} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
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