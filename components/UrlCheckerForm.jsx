// components/UrlCheckerForm.jsx

import { useState } from "react";
import { validateLaunchURLProd } from "../utils/validators/validateLaunchURLProd.js";
import { validateLaunchURLStage } from "../utils/validators/validateLaunchURLStage.js";
// 1. ИМПОРТ НОВОГО ВАЛИДАТОРА
import { validateRoundDetailsUrl } from "../utils/validators/validateRoundDetailsUrl.js";

import ValidationResult from "./ValidationResult.jsx";
import OperatorConfigViewer from "./OperatorConfigViewer.jsx";

const UrlCheckerForm = () => {
    const [urlInput, setUrlInput] = useState('');
    const [validationType, setValidationType] = useState(''); 
    const [parsedParams, setParsedParams] = useState(null);
    const [error, setError] = useState(null);

    // 3. ГЛАВНЫЙ ОБРАБОТЧИК (МАРШРУТИЗАТОР)
    const handleCheckUrl = () => {
        setError(null);
        setParsedParams(null);

        if (!urlInput.trim()) {
            setError('Поле URL не может быть пустым.');
            return;
        }
        
        let result;

        // Маршрутизация на основе validationType
        if (validationType === 'prodLaunchURLValidation') {
            result = validateLaunchURLProd(urlInput);
        } else if (validationType === 'stageLaunchURLValidation') {
            result = validateLaunchURLStage(urlInput);
        } 
        // 2. ДОБАВЛЕНИЕ НОВОГО КЕЙСА
        else if (validationType === 'roundDetailsValidation') {
            result = validateRoundDetailsUrl(urlInput);
        } else {
            setError('Пожалуйста, выберите корректный тип валидации.');
            return;
        }

        // Обработка результата
        if (result.components) {
            setParsedParams(result.components);
        }

        if (result.errors.length > 0) {
            setError(result.errors.join(' | '));
        }
    };

    return (
        <div className="font-sans w-full max-w-7xl mx-auto">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">
                Launch URL validator
            </h1>
            <div className="flex flex-col space-y-4 p-6 bg-white rounded-xl shadow-2xl border border-gray-200">
                {/* Выпадающий список */}
                <div>
                    <label htmlFor="validationType" className="block text-sm font-medium text-gray-700 mb-1">
                        Тип URL для проверки:
                    </label>
                    <select
                        id="validationType"
                        name="validationType"
                        value={validationType}
                        onChange={(e) => {
                            setValidationType(e.target.value);
                            setError(null);
                            setParsedParams(null);
                        }}
                        className="w-full px-4 py-3 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg 
                                   focus:outline-none focus:ring-2 focus:ring-[#2e2691] focus:border-transparent 
                                   transition duration-150 ease-in-out text-sm md:text-base shadow-inner cursor-pointer"
                    >
                        <option value="" disabled>-- Выберите тип валидации --</option>
                        <option value="prodLaunchURLValidation">Launch URL (Production)</option>
                        <option value="stageLaunchURLValidation">Launch URL (Stage)</option>
                        {/* 3. НОВАЯ ОПЦИЯ В СПИСКЕ */}
                        <option value="roundDetailsValidation">Round Details URL (History)</option>
                    </select>
                </div>

                {validationType && (
                    <div className="flex flex-col space-y-4 animate-fade-in-up">
                        <textarea
                            rows="4"
                            // Меняем плейсхолдер в зависимости от типа
                            placeholder={validationType === 'roundDetailsValidation' 
                                ? "Вставьте ссылку на историю раунда (например, https://games-info.apac.spribegaming.com/?round_id=...)"
                                : "Вставьте launch URL сюда (например, https://launch.spribegaming.com/aviator?user=...)"
                            }
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            className={`w-full px-4 py-3 text-gray-900 bg-gray-50 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-lg 
                                    focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500' : 'focus:ring-[#2e2691]'} focus:border-transparent 
                                    transition duration-150 ease-in-out text-sm md:text-base resize-none min-h-[6rem] shadow-inner`} 
                        />
                        
                        <button
                            type="button" 
                            onClick={handleCheckUrl} 
                            className="self-end px-6 py-3 text-white font-semibold bg-[#2e2691] rounded-lg shadow-md 
                                    hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#2e2691] focus:ring-offset-2 
                                    transition duration-150 shrink-0 transform hover:scale-[1.01] active:scale-95"
                        >
                            Проверить URL
                        </button>
                    </div>
                )}
            </div>

            {/* Ошибка */}
            {error && (
                <div className="mt-6 p-4 bg-red-100 text-red-800 border border-red-500 rounded-xl shadow-md">
                    <div className="flex items-start">
                        <span className="text-2xl mr-3">❌</span>
                        <div>
                            <h4 className="font-bold text-lg mb-1">Ошибка валидации:</h4>
                            <p className="whitespace-pre-wrap text-sm">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {parsedParams && !error && (
                <>
                    {/* Результат валидации */}
                    <ValidationResult data={parsedParams} />
                    
                    {/* Загрузчик конфига оператора.
                       Он сработает и для Round Details, так как валидатор
                       возвращает gameId и operator в той же структуре!
                    */}
                    <OperatorConfigViewer 
                        gameId={parsedParams.gameId} 
                        operator={parsedParams.payload?.operator} 
                        validationType={validationType} 
                    />
                </>
            )}

            <div className="mt-6 p-4 text-center text-gray-500 text-sm">
                <p>Этот валидатор выполняет клиентские проверки синтаксиса, обязательных параметров и кодов валют.</p>
            </div>
        </div>
    );
};

export default UrlCheckerForm;