// components/ValidationResult.jsx
import { useState } from "react";
import clsx from "clsx";

const ValidationResult = ({ data }) => {
    const [showJson, setShowJson] = useState(false);
    // НОВОЕ СОСТОЯНИЕ: Хранит ключ поля, которое было только что скопировано
    const [copiedKey, setCopiedKey] = useState(null);

    if (!data) return null;

    // Обновленная функция для копирования
    const handleCopy = (key, text) => {
        // Используем promise-based подход navigator.clipboard
        navigator.clipboard.writeText(text)
            .then(() => {
                // Успех: устанавливаем ключ скопированного элемента
                setCopiedKey(key);
                // Через 2 секунды сбрасываем состояние, возвращая иконку обратно
                setTimeout(() => {
                    setCopiedKey(null);
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
            });
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
                    
                    {/* 1. Operator Card (Слева) */}
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex flex-col items-center text-center">
                        <span className="text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">Operator</span>
                        <span className="text-2xl font-extrabold text-indigo-900">
                            {data.payload?.operator || '-'}
                        </span>
                    </div>

                    {/* 2. Game ID Card (Центр) */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex flex-col items-center text-center">
                        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Game ID</span>
                        <span className="text-xl font-bold text-gray-700 break-all">
                            {data.gameId}
                        </span>
                    </div>

                    {/* 3. Host / Environment Card (Справа) */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex flex-col items-center text-center">
                        <span className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Host / Environment</span>
                        <span className="text-lg font-bold text-gray-700 break-all">
                            {data.host}
                        </span>
                    </div>
                </div>

                {/* 2. Таблица параметров (Payload) */}
                <div className="mb-6">
                    <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 border-b pb-2">
                        Параметры запроса (Query Params)
                    </h4>
                    <div className="grid grid-cols-1 gap-1">
                        {Object.entries(data.payload).map(([key, value]) => {
                            // Проверяем, является ли этот элемент тем, который только что скопировали
                            const isCopied = copiedKey === key;

                            return (
                                <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between py-1 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-colors group">
                                    <span className="font-semibold text-gray-700 w-1/3 mb-1 sm:mb-0">{key}</span>
                                    <div className="flex items-center w-full sm:w-2/3 bg-gray-50 sm:bg-transparent rounded px-2 sm:px-0 py-1 sm:py-0">
                                        <code className="text-sm text-blue-600 font-mono break-all flex-1">
                                            {value}
                                        </code>
                                        {/* Кнопка копирования */}
                                        <button 
                                            // Передаем key и value в обработчик
                                            onClick={() => handleCopy(key, value)}
                                            // Динамические стили: если скопировано, кнопка зеленая и всегда видна (opacity-100). Иначе - серая и видна при наведении.
                                            className={`ml-2 transition-all p-1 ${isCopied ? 'text-green-500 opacity-100' : 'text-gray-400 hover:text-[#2e2691] opacity-0 group-hover:opacity-100'}`}
                                            title="Копировать значение"
                                        >
                                            {isCopied ? (
                                                // Иконка зеленой галочки (успех)
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                // Стандартная иконка буфера обмена
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 3. Спойлер с JSON */}
                <div className="border-t pt-4">
                    <button
                        onClick={() => setShowJson(!showJson)}
                        className="text-xs text-gray-500 hover:text-[#2e2691] font-medium flex items-center gap-1 focus:outline-none"
                    >
                        {showJson ? '🔼 Скрыть сырой JSON' : '🔽 Показать сырой JSON'}
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