//components\UrlCheckerForm.jsx

import { useState } from "react";
import { validateLaunchURLProd } from "../utils/validators/validateLaunchURLProd.js";
import { validateLaunchURLStage } from "../utils/validators/validateLaunchURLStage.js";

const UrlCheckerForm = () => {
    const [urlInput, setUrlInput] = useState('');
    const [validationType, setValidationType] = useState('prodLaunchURLValidation');
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
        } else {
            setError('Пожалуйста, выберите корректный тип валидации.');
            return;
        }

        // Обработка результата, который вернул валидатор
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
                {/* Выпадающий список для выбора типа валидации */}
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
                            // Сбрасываем ошибки при смене типа
                            setError(null);
                            setParsedParams(null);
                        }}
                        className="w-full px-4 py-3 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg 
                                   focus:outline-none focus:ring-2 focus:ring-[#2e2691] focus:border-transparent 
                                   transition duration-150 ease-in-out text-sm md:text-base shadow-inner cursor-pointer"
                    >
                        <option value="prodLaunchURLValidation">Launch URL prod</option>
                        <option value="stageLaunchURLValidation">Launch URL stage</option>
                        {/* <option value="other">Другой тип...</option> */}
                    </select>
                </div>
                {/* Поле Ввода (textarea) */}
                <textarea
                    rows="4"
                    placeholder="Вставьте launch URL сюда (например, https://launch.spribegaming.com/aviator?user=...)"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    
                    className={`w-full px-4 py-3 text-gray-900 bg-gray-50 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-lg 
                               focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500' : 'focus:ring-[#2e2691]'} focus:border-transparent 
                               transition duration-150 ease-in-out text-sm md:text-base resize-none min-h-[6rem] shadow-inner`} 
                />
                
                {/* Кнопка */}
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

            {/* Отображение ошибки */}
            {error && (
                <div className="mt-6 p-4 bg-red-100 text-red-800 border border-red-500 rounded-xl shadow-md">
                    <h4 className="font-bold text-lg mb-1">❌ Ошибка валидации:</h4>
                    <p className="whitespace-pre-wrap">{error}</p>
                </div>
            )}

            {/* Отображение разобранных параметров */}
            {parsedParams && (
                <div className="mt-6 p-6 bg-gray-50 rounded-xl shadow-xl border border-gray-200">
                    <h3 className="text-xl font-bold mb-3 text-gray-900">
                        {error ? '⚠️ Разобранные компоненты (есть ошибки):' : '✅ Разобранные компоненты (Локально OK):'}
                    </h3>
                    <pre className="p-4 bg-gray-100 rounded-lg overflow-auto text-sm text-gray-800 border border-gray-300">
                        {JSON.stringify(parsedParams, null, 2)}
                    </pre>
                </div>
            )}
            
            <div className="mt-6 p-4 text-center text-gray-500 text-sm">
                <p>Этот валидатор выполняет клиентские проверки синтаксиса, обязательных параметров и кодов валют.</p>
            </div>

        </div>
    );
};

export default UrlCheckerForm;