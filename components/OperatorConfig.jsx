// components/OperatorConfig.jsx
import { useState } from "react";
import { GAMES_CONFIG } from "../staticData/games.js";

const OperatorConfig = () => {
    const [operatorKey, setOperatorKey] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [results, setResults] = useState([]);

    // === ЛОГИКА ===
    const getRegionCodeFromHost = (host) => {
        if (!host || host === "-") return "UNKNOWN";
        const h = host.toLowerCase();
        if (h.includes("eu-central-1")) return "EU";
        if (h.includes("af-south-1")) return "AF";
        if (h.includes("apac") || h.includes("ap-east-1") || h.includes("ap-southeast-1")) return "APAC";
        if (h.includes("sa-east-1")) return "SA";
        if (h.includes("app-hr1")) return "HR";
        if (h.includes("staging") || h.includes("dev-test") || h.includes("spribe.dev")) return "Stage";
        return "Custom";
    };

    const getGeneralHost = (data) => {
        if (!data) return null;
        if (data.games) {
            if (data.games['aviator']?.host) return data.games['aviator'].host;
            const firstKey = Object.keys(data.games)[0];
            if (firstKey && data.games[firstKey].host) return data.games[firstKey].host;
        }
        if (data.servers?.[0]?.host) return data.servers[0].host;
        if (data.ws?.host) return data.ws.host;
        return null;
    };

    const getGeneralZone = (data) => {
        if (!data) return "-";
        if (data.games) {
            if (data.games['aviator']?.zone) return data.games['aviator'].zone;
            const firstKey = Object.keys(data.games)[0];
            if (firstKey && data.games[firstKey].zone) return data.games[firstKey].zone;
        }
        if (data.servers?.[0]?.zone) return data.servers[0].zone;
        if (data.ws?.zone) return data.ws.zone;
        return "-";
    };

    const analyzeGames = (data, type) => {
        const masterList = GAMES_CONFIG.filter(g => g.category === type).map(g => g.id).sort();

        if (!data || !data.games) {
            if (type === 'turbo' || type === 'slots') {
                return { available: [], unavailable: masterList };
            }
            return { available: [], unavailable: [] };
        }

        const available = Object.keys(data.games).sort();
        let unavailable = [];

        if (type === 'turbo' || type === 'slots') {
            unavailable = masterList
                .filter(g => !available.includes(g))
                .sort();
        }
        return { available, unavailable };
    };

    const fetchConfig = async () => {
        if (!operatorKey.trim()) return;
        setLoading(true);
        setError(null);
        setResults([]);

        const opKey = operatorKey.trim();
        const timestamp = Date.now();

        const targets = [
            // Prod
            { env: "Production", type: "aviator", baseUrl: "https://app-config.spribegaming.com" },
            { env: "Production", type: "turbo", baseUrl: "https://app-config.spribegaming.com" },
            { env: "Production", type: "slots", baseUrl: "https://app-config.spribegaming.com" },
            { env: "Production", type: "trader", baseUrl: "https://app-config.spribegaming.com" },
            { env: "Production", type: "starline", baseUrl: "https://app-config.spribegaming.com" },
            { env: "Production", type: "multikeno", baseUrl: "https://app-config.spribegaming.com" },
            { env: "Production", type: "pilot-chicken", baseUrl: "https://app-config.spribegaming.com" },
            // Stage
            { env: "Stage", type: "aviator", baseUrl: "https://app-config.spribe.dev" },
            { env: "Stage", type: "turbo", baseUrl: "https://app-config.spribe.dev" },
            { env: "Stage", type: "slots", baseUrl: "https://app-config.spribe.dev" },
            { env: "Stage", type: "trader", baseUrl: "https://app-config.spribe.dev" },
            { env: "Stage", type: "starline", baseUrl: "https://app-config.spribe.dev" },
            { env: "Stage", type: "multikeno", baseUrl: "https://app-config.spribe.dev" },
            { env: "Stage", type: "pilot-chicken", baseUrl: "https://app-config.spribe.dev" }
        ];

        try {
            const promises = targets.map(async (target) => {
                const url = `${target.baseUrl}/${target.type}/${opKey}.json?t=${timestamp}`;
                try {
                    const res = await fetch(url);
                    if (res.ok) {
                        const data = await res.json();
                        const host = getGeneralHost(data);
                        return {
                            env: target.env,
                            type: target.type,
                            data,
                            host,
                            zone: getGeneralZone(data),
                            region: getRegionCodeFromHost(host),
                            games: analyzeGames(data, target.type),
                            url,
                            status: 'active'
                        };
                    } else {
                        return {
                            env: target.env,
                            type: target.type,
                            status: 'disabled',
                            data: null, 
                            host: null, zone: null, region: null, 
                            games: analyzeGames(null, target.type), 
                            url
                        };
                    }
                } catch (e) {
                    return {
                        env: target.env,
                        type: target.type,
                        status: 'disabled',
                        data: null, host: null, zone: null, region: null, 
                        games: analyzeGames(null, target.type),
                        url
                    };
                }
            });

            const allResults = await Promise.all(promises);

            const activeEnvironments = new Set(
                allResults.filter(r => r.status === 'active').map(r => r.env)
            );

            if (activeEnvironments.size === 0) {
                throw new Error(`Operator "${opKey}" not found.`);
            }

            const finalResults = allResults.filter(r => activeEnvironments.has(r.env));
            setResults(finalResults);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getTypeColor = (type, active) => {
        if (active === false) return 'border-l-4 border-l-gray-300 bg-gray-50';
        switch (type) {
            case 'aviator': return 'border-l-4 border-l-red-600 bg-red-50/30';
            case 'turbo': return 'border-l-4 border-l-blue-500 bg-white';
            case 'slots': return 'border-l-4 border-l-purple-500 bg-white';
            case 'trader': return 'border-l-4 border-l-orange-500 bg-white';
            case 'starline': return 'border-l-4 border-l-teal-500 bg-white';
            case 'multikeno': return 'border-l-4 border-l-pink-500 bg-white';
            case 'pilot-chicken': return 'border-l-4 border-l-amber-500 bg-white';
            default: return 'border-l-4 border-gray-500 bg-white';
        }
    };

    const getTypeBadge = (type, active) => {
        if (active === false) return 'bg-gray-400 text-white shadow-none';
        switch (type) {
            case 'aviator': return 'bg-red-600 text-white shadow-sm ring-2 ring-red-100';
            case 'turbo': return 'bg-blue-100 text-blue-800';
            case 'slots': return 'bg-purple-100 text-purple-800';
            case 'trader': return 'bg-orange-100 text-orange-800';
            case 'starline': return 'bg-teal-100 text-teal-800';
            case 'multikeno': return 'bg-pink-100 text-pink-800';
            case 'pilot-chicken': return 'bg-amber-100 text-amber-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // --- КОМПОНЕНТ СТРОКИ ---
    const ConfigRow = ({ item, isGrid = false }) => {
        const isAviator = item.type === 'aviator';
        const isActive = item.status !== 'disabled';
        
        const allGamesList = [
            ...(item.games?.available || []).map(g => ({ name: g, active: true })),
            ...(item.games?.unavailable || []).map(g => ({ name: g, active: false }))
        ];
        const hasGamesList = allGamesList.length > 0;

        const containerClasses = `relative flex flex-row items-stretch border border-gray-200 rounded-lg shadow-sm h-24 hover:shadow-md transition-all overflow-hidden ${getTypeColor(item.type, isActive)}`;

        const leftColWidth = "w-48 border-r border-gray-100";

        const LeftColumn = () => (
            <div className={`flex-shrink-0 ${leftColWidth} flex items-center justify-center`}>
                <span className={`text-xs font-black px-4 py-1.5 rounded uppercase tracking-widest ${getTypeBadge(item.type, isActive)}`}>
                    {item.type}
                </span>
            </div>
        );

        const RightColumn = () => {
            if (!isActive && !hasGamesList) {
                return (
                    <div className="flex-grow flex items-center justify-center bg-gray-50/50">
                        <div className="flex items-center gap-2 text-gray-400 italic font-bold text-xs uppercase">
                            <span className="text-lg">🚫</span> Disabled
                        </div>
                    </div>
                );
            }

            if (hasGamesList) {
                return (
                    <div className="flex-grow p-3 overflow-y-auto">
                        <div className="flex flex-wrap gap-1 content-start">
                            {allGamesList.map(g => (
                                <span key={g.name} className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                    g.active 
                                    ? 'bg-green-50 text-green-800 border-green-200' 
                                    : 'bg-red-50 text-red-400 border-red-100 line-through decoration-red-300'
                                }`}>
                                    {g.name}
                                </span>
                            ))}
                        </div>
                    </div>
                );
            }

            return (
                <div className={`flex-grow flex ${isGrid ? 'flex-col justify-center px-4 gap-1' : 'flex-row items-center justify-start gap-10 px-8'}`}>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Host</span>
                        <span className="font-mono text-sm font-black text-gray-800 truncate leading-tight" title={item.host}>
                            {item.host || "N/A"}
                        </span>
                    </div>
                    {(item.type === 'aviator' || item.zone !== '-') && (
                        <div className={`flex flex-col min-w-0 ${isGrid ? '' : 'border-l border-gray-200 pl-8'}`}>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Zone</span>
                            <span className="font-mono text-sm font-black text-gray-800 truncate leading-tight">
                                {item.zone || "-"}
                            </span>
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div className={containerClasses}>
                <LeftColumn />
                <RightColumn />
            </div>
        );
    };

    const EnvironmentBlock = ({ envName, items }) => {
        const activeItem = items.find(i => i.status === 'active');
        const region = activeItem?.region || "Unknown";
        const isProd = envName === 'Production';
        
        const headerClass = isProd ? 'bg-gradient-to-r from-green-700 to-green-600' : 'bg-gradient-to-r from-yellow-500 to-yellow-400 text-black';
        const badgeClass = isProd ? 'bg-black/20 text-white' : 'bg-black/10 text-black';

        const fullWidthTypes = ['aviator', 'turbo', 'slots'];
        const fullWidthItems = items
            .filter(i => fullWidthTypes.includes(i.type))
            .sort((a, b) => {
                const priority = { 'aviator': 1, 'turbo': 2, 'slots': 3 };
                return priority[a.type] - priority[b.type];
            });

        const gridItems = items
            .filter(i => !fullWidthTypes.includes(i.type))
            .sort((a, b) => a.type.localeCompare(b.type));

        return (
            <div className="rounded-xl overflow-hidden shadow-xl border border-gray-200 bg-white animate-fade-in-up w-full">
                <div className={`${headerClass} px-6 py-4 flex items-center justify-between text-white`}>
                    <div className="flex items-center gap-4">
                        <span className={`text-2xl font-black tracking-tight ${!isProd && 'text-gray-900'}`}>{envName.toUpperCase()}</span>
                        <div className={`px-3 py-1 rounded text-sm font-bold backdrop-blur-md ${badgeClass}`}>
                            Region: {region}
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-6">
                    <div className="flex flex-col gap-4">
                        {fullWidthItems.map((item, idx) => (
                            <ConfigRow key={idx} item={item} isGrid={false} />
                        ))}
                    </div>

                    {gridItems.length > 0 && (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                            {gridItems.map((item, idx) => (
                                <ConfigRow key={idx} item={item} isGrid={true} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Определение найденных сред для бейджика
    const hasProd = results.some(r => r.env === 'Production');
    const hasStage = results.some(r => r.env === 'Stage');

    const prodItems = results.filter(r => r.env === 'Production');
    const stageItems = results.filter(r => r.env === 'Stage');

    return (
        <div className="flex flex-col h-full space-y-4 max-w-[1920px] mx-auto w-full pb-10">
            {/* SEARCH HEADER */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 sticky top-0 z-20 relative">
                {/* Используем h-9 (36px) для всех элементов управления.
                */}
                <div className="flex gap-4 items-center max-w-2xl mx-auto">
                    <h1 className="text-xl font-extrabold text-gray-900 whitespace-nowrap">
                         Config Viewer
                    </h1>
                    <div className="flex-grow relative">
                        <input
                            type="text"
                            value={operatorKey}
                            onChange={(e) => setOperatorKey(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchConfig()}
                            placeholder="Operator Key"
                            className="w-full pl-4 pr-10 h-9 border border-gray-300 rounded-lg focus:ring-[#2e2691] focus:border-[#2e2691] text-sm shadow-sm"
                        />
                         {operatorKey && (
                            <button 
                                onClick={() => setOperatorKey("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    <button
                        onClick={fetchConfig}
                        disabled={loading}
                        className="px-6 h-9 bg-[#2e2691] text-white font-bold rounded-lg hover:bg-blue-800 transition disabled:opacity-50 text-sm shadow-md"
                    >
                        {loading ? "Searching..." : "Search"}
                    </button>
                </div>
                
                {/* БЕЙДЖ СТАТУСА (В правом углу, абсолютное позиционирование) */}
                {!loading && results.length > 0 && (
                    <div className="absolute top-1/2 -translate-y-1/2 right-4 hidden xl:block">
                        {hasProd && hasStage ? (
                            <span className="flex items-center justify-center h-9 px-4 rounded-lg bg-gradient-to-r from-green-600 to-yellow-500 text-white font-black text-xs uppercase tracking-wider shadow-sm whitespace-nowrap">
                                Prod & Stage
                            </span>
                        ) : hasProd ? (
                            <span className="flex items-center justify-center h-9 px-4 rounded-lg bg-green-100 text-green-800 border border-green-200 font-black text-xs uppercase tracking-wider whitespace-nowrap">
                                Production
                            </span>
                        ) : hasStage ? (
                            <span className="flex items-center justify-center h-9 px-4 rounded-lg bg-yellow-100 text-yellow-800 border border-yellow-200 font-black text-xs uppercase tracking-wider whitespace-nowrap">
                                Stage
                            </span>
                        ) : null}
                    </div>
                )}

                {error && (
                    <div className="mt-3 text-center text-xs text-red-600 bg-red-50 py-2 rounded border border-red-100 font-semibold animate-pulse">
                        ⚠️ {error}
                    </div>
                )}
            </div>

            {/* RESULTS */}
            <div className="space-y-10 w-full">
                {prodItems.length > 0 && <EnvironmentBlock envName="Production" items={prodItems} />}
                {stageItems.length > 0 && <EnvironmentBlock envName="Stage" items={stageItems} />}
            </div>
            
            {/* EMPTY STATE */}
            {!loading && results.length === 0 && !error && (
                <div className="text-center py-20 text-gray-400">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-lg font-medium">Enter an operator key to verify configuration</h3>
                    <p className="text-sm">Checks Prod & Stage for Aviator, Turbo, Slots, Trader, and more.</p>
                </div>
            )}
        </div>
    );
};

export default OperatorConfig;