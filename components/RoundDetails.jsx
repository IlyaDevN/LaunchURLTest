// components/RoundDetails.jsx
import { useState, useMemo } from "react";

// === 1. СПИСОК РЕГИОНОВ ===
const REGIONS = [
    { name: "EU", url: "https://games-info.spribegaming.com/" },
    { name: "AF", url: "https://games-info-af.spribegaming.com/" },
    { name: "APAC", url: "https://games-info.apac.spribegaming.com/" },
    { name: "SA", url: "https://games-info-sa.spribegaming.com/" },
    { name: "HR", url: "https://games-info-hr.spribegaming.com/" },
    { name: "Stage", url: "https://games-info.staging.spribe.dev/" }
];

// === 2. МАППИНГ ИГР ===
const GAMES_MAPPING = [
    { name: "Aviator", id: "aviator", provider: "spribe_aviator" },
    { name: "Dice", id: "dice", provider: "spribe_crypto" },
    { name: "Goal", id: "goal", provider: "spribe_crypto" },
    { name: "Plinko", id: "plinko", provider: "spribe_crypto" },
    { name: "Mines", id: "mines", provider: "spribe_crypto" },
    { name: "Hi Lo", id: "hi-lo", provider: "spribe_crypto" },
    { name: "Keno", id: "keno", provider: "spribe_crypto" },
    { name: "Mini Roulette", id: "mini-roulette", provider: "spribe_crypto" },
    { name: "Hotline", id: "hotline", provider: "spribe_crypto" },
    { name: "Balloon", id: "balloon", provider: "spribe_crypto" },
    { name: "Keno 80 (Multikeno)", id: "multikeno", provider: "spribe_keno" },
    { name: "Trader", id: "trader", provider: "spribe_trader" },
    { name: "Crystal Fall", id: "crystal-fall", provider: "spribe_slots" },
    { name: "Neo Vegas", id: "neo-vegas", provider: "spribe_slots" },
    { name: "Gates of Egypt", id: "gates-of-egypt", provider: "spribe_slots" },
];

const RoundDetails = () => {
    // Состояние формы
    const [baseUrl, setBaseUrl] = useState(REGIONS[0].url);
    const [selectedGameId, setSelectedGameId] = useState(GAMES_MAPPING[0].id);
    const [formData, setFormData] = useState({
        round_id: "",
        operator: "",
        player_token: "",
        op_player_id: "",
    });

    const [errors, setErrors] = useState({});
    const [generatedUrl, setGeneratedUrl] = useState(null);
    const [isCopied, setIsCopied] = useState(false);

    // Вычисляем текущего провайдера
    const currentProvider = useMemo(() => {
        return GAMES_MAPPING.find(g => g.id === selectedGameId)?.provider || "";
    }, [selectedGameId]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.operator.trim()) newErrors.operator = "Operator Key is required";
        if (!formData.round_id.trim()) newErrors.round_id = "Round ID is required";
        if (!formData.player_token.trim()) newErrors.player_token = "Player Token is required";
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
            player_token: formData.player_token,
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
        <div className="flex flex-col h-full space-y-6 max-w-7xl mx-auto w-full pb-10">
            <h1 className="text-3xl font-extrabold text-gray-900 text-center">
                Round Details Generator
            </h1>

            {/* Блок формы */}
            <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-200">
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
                            {GAMES_MAPPING.map((game) => (
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Player Token</label>
                        <input
                            type="text"
                            name="player_token"
                            value={formData.player_token}
                            onChange={handleInputChange}
                            placeholder="Token string"
                            className={getInputClass("player_token")}
                        />
                        {errors.player_token && <p className="text-red-500 text-xs mt-1">{errors.player_token}</p>}
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

                <div className="flex justify-end border-t border-gray-100 pt-4">
                    <button
                        onClick={handleGenerate}
                        className="px-6 py-3 bg-[#2e2691] text-white font-semibold rounded-lg shadow hover:bg-blue-800 transition transform hover:scale-[1.02] active:scale-95 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Сгенерировать ссылку
                    </button>
                </div>
            </div>

            {/* Блок результата (БЕЗ IFRAME) */}
            {generatedUrl && (
                <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-fade-in-up">
                    <div className="bg-green-50 px-6 py-4 border-b border-green-100 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-green-800 flex items-center gap-2">
                            ✅ Ссылка готова
                        </h3>
                    </div>
                    
                    <div className="p-6">
                        <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 font-mono text-sm text-gray-700 break-all mb-6">
                            {generatedUrl}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-end">
                            {/* Кнопка Копировать */}
                            <button 
                                onClick={handleCopy}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50 hover:text-[#2e2691] hover:border-[#2e2691] transition-all w-full sm:w-auto"
                            >
                                {isCopied ? (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-green-600">Скопировано</span>
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        <span>Копировать</span>
                                    </>
                                )}
                            </button>

                            {/* Кнопка Открыть */}
                            <a 
                                href={generatedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-[#2e2691] text-white font-bold rounded-lg hover:bg-blue-800 shadow-md transition-all w-full sm:w-auto no-underline"
                            >
                                <span>Открыть в новой вкладке</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoundDetails;