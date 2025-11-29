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

    // Состояние для ошибок валидации
    const [errors, setErrors] = useState({});
    
    const [generatedUrl, setGeneratedUrl] = useState(null);

    // Вычисляем текущего провайдера на основе выбранной игры
    const currentProvider = useMemo(() => {
        return GAMES_MAPPING.find(g => g.id === selectedGameId)?.provider || "";
    }, [selectedGameId]);

    // Обработчик изменения инпутов
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        // Очищаем ошибку при вводе
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Функция валидации
    const validate = () => {
        const newErrors = {};
        
        if (!formData.operator.trim()) newErrors.operator = "Operator Key is required";
        if (!formData.round_id.trim()) newErrors.round_id = "Round ID is required";
        if (!formData.player_token.trim()) newErrors.player_token = "Player Token is required";
        if (!formData.op_player_id.trim()) newErrors.op_player_id = "Operator Player ID is required";

        setErrors(newErrors);
        // Возвращает true, если ошибок нет
        return Object.keys(newErrors).length === 0;
    };

    // Генерация ссылки
    const handleGenerate = () => {
        // 1. Сбрасываем предыдущий URL, чтобы перерисовать iframe при новом нажатии
        setGeneratedUrl(null);

        // 2. Проверяем валидность
        if (!validate()) {
            return; // Прерываем, если есть ошибки
        }

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
        
        // Небольшой таймаут, чтобы React успел "сбросить" iframe (визуальный эффект перезагрузки)
        setTimeout(() => {
            setGeneratedUrl(fullUrl);
        }, 50);
    };

    // Вспомогательная функция для классов инпута
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
                Round Details Viewer
            </h1>

            {/* Блок настроек (Форма) */}
            <div className="bg-white p-6 rounded-xl shadow-xl border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    
                    {/* 1. Base Domain URL (Region) */}
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

                    {/* 2. Game Selector */}
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

                    {/* 3. Provider (Read Only) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Provider Key</label>
                        <input
                            type="text"
                            value={currentProvider}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-200 bg-gray-100 text-gray-500 rounded-md cursor-not-allowed"
                        />
                    </div>

                    {/* 4. Operator */}
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

                    {/* 5. Round ID */}
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

                     {/* 6. Player Token */}
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

                    {/* 7. Operator Player ID */}
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

                <div className="flex justify-end mt-4">
                    <button
                        onClick={handleGenerate}
                        className="px-6 py-2 bg-[#2e2691] text-white font-semibold rounded-lg shadow hover:bg-blue-800 transition transform hover:scale-[1.02] active:scale-95"
                    >
                        Показать детали раунда
                    </button>
                </div>
            </div>

            {/* Блок результата (Iframe) */}
            {generatedUrl && (
                <div className="flex flex-col bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden mx-auto w-[1080px] max-w-full">
                    <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex justify-between items-center shrink-0">
                        <span className="text-xs text-gray-500 font-mono truncate mr-4">
                            {generatedUrl}
                        </span>
                        <button 
                            onClick={() => navigator.clipboard.writeText(generatedUrl)}
                            className="text-xs text-[#2e2691] hover:underline font-semibold shrink-0"
                        >
                            Копировать ссылку
                        </button>
                    </div>
                    <iframe 
                        src={generatedUrl}
                        title="Round Details"
                        className="w-full h-[666px] border-0"
                        sandbox="allow-scripts allow-same-origin allow-forms"
                    />
                </div>
            )}
            
            {!generatedUrl && (
                <div className="flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 h-[400px]">
                    <div className="text-center">
                        <p>Заполните параметры и нажмите кнопку.</p>
                        <p className="text-xs text-gray-300 mt-2">Если данные неверны, ошибка отобразится внутри окна просмотра.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoundDetails;