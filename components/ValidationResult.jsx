// components/ValidationResult.jsx
import { useState } from "react";
import clsx from "clsx";

const ValidationResult = ({ data }) => {
    const [showJson, setShowJson] = useState(false);

    if (!data) return null;

    // Функция для копирования в буфер обмена
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // Можно добавить уведомление (toast), но пока просто скопируем
    };

    return (
        <div className="mt-8 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-fade-in-up">
            {/* Заголовок блока */}
            <div className="bg-[#2e2691] px-6 py-4 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    ✅ Результат анализа
                </h3>
                <span className="text-xs text-blue-200 bg-white/10 px-2 py-1 rounded">
                    Valid Format
                </span>
            </div>

            <div className="p-6">
                {/* 1. Верхняя панель: Основная инфо */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {/* Game ID Card */}
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex flex-col items-center text-center">
                        <span className="text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">Game ID</span>
                        <span className="text-2xl font-extrabold text-indigo-900">{data.gameId}</span>
                    </div>

                    {/* Host Card */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex flex-col items-center text-center">
                        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Host / Environment</span>
                        <span className="text-lg font-bold text-gray-700 break-all">{data.host}</span>
                    </div>

                    {/* Protocol Card */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex flex-col items-center text-center">
                        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Protocol</span>
                        <span className={`text-lg font-bold ${data.protocol === 'https:' ? 'text-green-600' : 'text-orange-500'}`}>
                            {data.protocol}
                        </span>
                    </div>
                </div>

                {/* 2. Таблица параметров (Payload) */}
                <div className="mb-6">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 border-b pb-2">
                        Параметры запроса (Query Params)
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                        {Object.entries(data.payload).map(([key, value]) => (
                            <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-colors group">
                                <span className="font-semibold text-gray-700 w-1/3 mb-1 sm:mb-0">{key}</span>
                                <div className="flex items-center w-full sm:w-2/3 bg-gray-50 sm:bg-transparent rounded px-2 sm:px-0 py-1 sm:py-0">
                                    <code className="text-sm text-blue-600 font-mono break-all flex-1">
                                        {value}
                                    </code>
                                    {/* Кнопка копирования (появляется при наведении) */}
                                    <button 
                                        onClick={() => copyToClipboard(value)}
                                        className="ml-2 text-gray-400 hover:text-[#2e2691] opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                        title="Копировать значение"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 3. Спойлер с JSON */}
                <div className="border-t pt-4">
                    <button
                        onClick={() => setShowJson(!showJson)}
                        className="text-xs text-gray-500 hover:text-[#2e2691] font-medium flex items-center gap-1 focus:outline-none"
                    >
                        {showJson ? '🔼 Скрыть сырой JSON' : '🔽 Показать сырой JSON для разработчиков'}
                    </button>
                    
                    {showJson && (
                        <pre className="mt-3 p-4 bg-gray-900 text-green-400 rounded-lg overflow-auto text-xs font-mono border border-gray-700 shadow-inner max-h-64">
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ValidationResult;