// components/RoundDetails.jsx
import { useState, useMemo } from "react";
// Импорт общего конфига
import { GAMES_CONFIG } from "../staticData/games.js";

// === 1. СПИСОК РЕГИОНОВ ===
const REGIONS = [
    { name: "EU", url: "https://games-info.spribegaming.com/" },
    { name: "AF", url: "https://games-info-af.spribegaming.com/" },
    { name: "APAC", url: "https://games-info.apac.spribegaming.com/" },
    { name: "SA", url: "https://games-info-sa.spribegaming.com/" },
    { name: "HR", url: "https://games-info-hr.spribegaming.com/" },
    { name: "Stage", url: "https://games-info.staging.spribe.dev/" }
];

const RoundDetails = () => {
    // Состояние формы
    const [baseUrl, setBaseUrl] = useState(REGIONS[0].url);
    const [selectedGameId, setSelectedGameId] = useState(GAMES_CONFIG[0].id);
    const [tokenType, setTokenType] = useState("player_token");

    const [formData, setFormData] = useState({
        round_id: "",
        operator: "",
        token: "",
        op_player_id: "",
    });

    // === STATE ДЛЯ ПОИСКА ОПЕРАТОРА ===
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [searchSuccess, setSearchSuccess] = useState(null);

    const [errors, setErrors] = useState({});
    const [generatedUrl, setGeneratedUrl] = useState(null);
    const [isCopied, setIsCopied] = useState(false);

    const currentProvider = useMemo(() => {
        return GAMES_CONFIG.find(g => g.id === selectedGameId)?.provider || "";
    }, [selectedGameId]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // === ЛОГИКА ОПРЕДЕЛЕНИЯ РЕГИОНА ===
    const getRegionCodeFromHost = (host) => {
        if (!host || host === "-") return null;
        const h = host.toLowerCase();
        
        if (h.includes("eu-central-1")) return "EU";
        if (h.includes("af-south-1")) return "AF";
        if (h.includes("apac") || h.includes("ap-east-1") || h.includes("ap-southeast-1")) return "APAC";
        if (h.includes("sa-east-1")) return "SA";
        if (h.includes("app-hr1")) return "HR";
        if (h.includes("staging") || h.includes("dev-test") || h.includes("spribe.dev")) return "Stage";
        
        return "UNKNOWN";
    };

    const getGeneralHost = (data) => {
        if (data.games) {
            if (data.games['aviator'] && data.games['aviator'].host) return data.games['aviator'].host;
            const firstGameKey = Object.keys(data.games)[0];
            if (firstGameKey && data.games[firstGameKey].host) return data.games[firstGameKey].host;
        }
        if (data.servers && Array.isArray(data.servers) && data.servers.length > 0) return data.servers[0].host;
        else if (data.ws) return data.ws.host;
        return null;
    };

    const handleLookup = async () => {
        if (!searchQuery.trim()) return;
        
        setIsSearching(true);
        setSearchError(null);
        setSearchSuccess(null);

        const opKey = searchQuery.trim();
        const timestamp = Date.now();
        
        const configSources = [
            { url: `https://app-config.spribegaming.com/aviator/${opKey}.json?t=${timestamp}`, env: "Prod" },
            { url: `https://app-config.spribe.dev/aviator/${opKey}.json?t=${timestamp}`, env: "Stage" }
        ];

        let foundConfig = null;
        let foundEnv = null;

        try {
            for (const source of configSources) {
                try {
                    const res = await fetch(source.url);
                    if (res.ok) {
                        foundConfig = await res.json();
                        foundEnv = source.env;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!foundConfig) {
                throw new Error("Operator config not found on Prod or Stage.");
            }

            const host = getGeneralHost(foundConfig);
            const regionCode = getRegionCodeFromHost(host);

            setFormData(prev => ({ ...prev, operator: opKey }));

            if (regionCode) {
                const matchedRegion = REGIONS.find(r => r.name.toUpperCase() === regionCode.toUpperCase());
                
                if (matchedRegion) {
                    setBaseUrl(matchedRegion.url);
                    setSearchSuccess(`Found on ${foundEnv}. Region detected: ${regionCode}`);
                } else {
                    setSearchSuccess(`Found on ${foundEnv}. Host: ${host}. Please select region manually.`);
                }
            } else {
                setSearchSuccess(`Found on ${foundEnv}, but could not detect region host.`);
            }

        } catch (err) {
            setSearchError(err.message || "Failed to lookup operator.");
        } finally {
            setIsSearching(false);
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.operator.trim()) newErrors.operator = "Operator Key is required";
        if (!formData.round_id.trim()) newErrors.round_id = "Round ID is required";
        if (!formData.token.trim()) newErrors.token = "Token is required";
        if (!formData.op_player_id.trim()) newErrors.op_player_id = "Operator Player ID is required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleGenerate = () => {
        setGeneratedUrl(null);
        if (!validate()) return;

        const cleanBaseUrl = baseUrl.trim().replace(/\/$/, "");
        
        const params = new URLSearchParams({
            round_id: formData.round_id,
            game: selectedGameId,
            provider: currentProvider,
            [tokenType]: formData.token, 
            op_player_id: formData.op_player_id,
            operator: formData.operator
        });

        const fullUrl = `${cleanBaseUrl}/?${params.toString()}`;
        setGeneratedUrl(fullUrl);
    };

    const handleCopy = () => {
        if (!generatedUrl) return;
        navigator.clipboard.writeText(generatedUrl).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    const getInputClass = (fieldName) => {
        const baseClass = "w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-offset-1 transition-colors";
        if (errors[fieldName]) {
            return `${baseClass} border-red-500 focus:border-red-500 focus:ring-red-200 bg-red-50`;
        }
        return `${baseClass} border-gray-300 focus:ring-[#2e2691] focus:border-[#2e2691]`;
    };

    return (
        // ИЗМЕНЕНИЕ: Убран pt-8, space-y-8 заменен на space-y-6
        <div className="flex flex-col h-full space-y-6 max-w-7xl mx-auto w-full pb-10">
            <h1 className="text-3xl font-extrabold text-gray-900 text-center">
                Round Details Generator
            </h1>

            {/* Блок формы */}
            <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-200">
                
                {/* === БЛОК: ПОИСК ОПЕРАТОРА (AUTO-DETECT) === */}
                <div className="mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                        Region detection by operator key
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Enter Operator Key (e.g. demo) to auto-fill settings..."
                            className="flex-grow px-3 py-2 border border-gray-300 rounded-md focus:ring-[#2e2691] focus:border-[#2e2691] text-sm"
                            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                        />
                        <button
                            onClick={handleLookup}
                            disabled={isSearching}
                            className="px-4 py-2 bg-gray-800 text-white text-sm font-bold rounded-md hover:bg-gray-700 transition disabled:opacity-50 min-w-[120px]"
                        >
                            {/* ИЗМЕНЕНИЕ: Текст кнопки изменен на Detect */}
                            {isSearching ? "Searching..." : "Detect"}
                        </button>
                    </div>
                    {/* Сообщения о статусе поиска */}
                    {searchError && <p className="text-red-500 text-xs mt-2 font-semibold flex items-center gap-1">❌ {searchError}</p>}
                    {searchSuccess && <p className="text-green-600 text-xs mt-2 font-semibold flex items-center gap-1">✅ {searchSuccess}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    
                    <div className="col-span-1 lg:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Base Domain URL (Region)</label>
                        <div className="flex gap-2">
                             <select 
                                className="w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:ring-[#2e2691] focus:border-[#2e2691] text-sm bg-gray-50"
                                onChange={(e) => setBaseUrl(e.target.value)}
                                value={REGIONS.some(r => r.url === baseUrl) ? baseUrl : "custom"}
                            >
                                {REGIONS.map((region) => (
                                    <option key={region.name} value={region.url}>
                                        {region.name}
                                    </option>
                                ))}
                                <option value="custom">Custom...</option>
                            </select>
                            <input
                                type="text"
                                value={baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                                placeholder="https://..."
                                className="w-2/3 px-3 py-2 border border-gray-300 rounded-md focus:ring-[#2e2691] focus:border-[#2e2691]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Game</label>
                        <select
                            value={selectedGameId}
                            onChange={(e) => setSelectedGameId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#2e2691] focus:border-[#2e2691] bg-white"
                        >
                            {[...GAMES_CONFIG]
                                .sort((a, b) => a.name.localeCompare(b.name))
                                .map((game) => (
                                    <option key={game.id} value={game.id}>
                                        {game.name}
                                    </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Provider Key</label>
                        <input
                            type="text"
                            value={currentProvider}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-200 bg-gray-100 text-gray-500 rounded-md cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Operator Key</label>
                        <input
                            type="text"
                            name="operator"
                            value={formData.operator}
                            onChange={handleInputChange}
                            placeholder="e.g. demo"
                            className={getInputClass("operator")}
                        />
                        {errors.operator && <p className="text-red-500 text-xs mt-1">{errors.operator}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Round ID</label>
                        <input
                            type="text"
                            name="round_id"
                            value={formData.round_id}
                            onChange={handleInputChange}
                            placeholder="e.g. 123456789"
                            className={getInputClass("round_id")}
                        />
                         {errors.round_id && <p className="text-red-500 text-xs mt-1">{errors.round_id}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {tokenType === 'player_token' ? 'Player Token' : 'Session Token'}
                        </label>
                        
                        <div className="relative">
                            <input
                                type="text"
                                name="token"
                                value={formData.token}
                                onChange={handleInputChange}
                                placeholder={tokenType === 'player_token' ? "Enter Player Token" : "Enter Session Token"}
                                className={`${getInputClass("token")} pr-36`} 
                            />
                            
                            <div className="absolute right-1.5 top-1/2 transform -translate-y-1/2 flex bg-gray-100 rounded p-0.5 border border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setTokenType('player_token')}
                                    className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded transition-all ${
                                        tokenType === 'player_token' 
                                            ? 'bg-white text-[#2e2691] shadow-sm' 
                                            : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    Player
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTokenType('session_token')}
                                    className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded transition-all ${
                                        tokenType === 'session_token' 
                                            ? 'bg-white text-[#2e2691] shadow-sm' 
                                            : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    Session
                                </button>
                            </div>
                        </div>
                        
                        {errors.token && <p className="text-red-500 text-xs mt-1">{errors.token}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Operator Player ID</label>
                        <input
                            type="text"
                            name="op_player_id"
                            value={formData.op_player_id}
                            onChange={handleInputChange}
                            placeholder="User ID"
                            className={getInputClass("op_player_id")}
                        />
                        {errors.op_player_id && <p className="text-red-500 text-xs mt-1">{errors.op_player_id}</p>}
                    </div>
                </div>

                {/* НИЖНЯЯ ПАНЕЛЬ С КНОПКАМИ */}
                <div className="flex flex-col sm:flex-row justify-end items-center border-t border-gray-100 pt-4 gap-3">
                    
                    {/* Кнопки появляются только после генерации */}
                    {generatedUrl && (
                        <>
                            {/* Кнопка Копировать ссылку */}
                            <button 
                                onClick={handleCopy}
                                className="order-2 sm:order-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50 hover:text-[#2e2691] hover:border-[#2e2691] transition-all w-full sm:w-auto"
                            >
                                {isCopied ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-green-600">Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        <span>Copy Link</span>
                                    </>
                                )}
                            </button>

                            {/* Кнопка Открыть в новой вкладке */}
                            <a 
                                href={generatedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="order-3 sm:order-2 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50 hover:text-[#2e2691] hover:border-[#2e2691] transition-all w-full sm:w-auto no-underline"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                <span>Open in New Tab</span>
                            </a>
                        </>
                    )}

                    {/* Кнопка Получить детали (Главная) */}
                    <button
                        onClick={handleGenerate}
                        className="order-1 sm:order-3 px-6 py-3 bg-[#2e2691] text-white font-semibold rounded-lg shadow hover:bg-blue-800 transition transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Get Round Details
                    </button>
                </div>
            </div>

            {/* Блок результата (Только Iframe) */}
            {generatedUrl && (
                <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-fade-in-up">
                    <div className="border-gray-300 overflow-hidden bg-white">
                        <iframe 
                            src={generatedUrl} 
                            width="100%" 
                            height="670px" 
                            className="w-full h-[670px]"
                            frameBorder="0"
                            title="Round Details"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoundDetails;