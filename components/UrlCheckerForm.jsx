// components/UrlCheckerForm.jsx

import { useState } from "react";
import { validateLaunchURLProd } from "../utils/validators/validateLaunchURLProd.js";
import { validateLaunchURLStage } from "../utils/validators/validateLaunchURLStage.js";
import { validateRoundDetailsUrl } from "../utils/validators/validateRoundDetailsUrl.js";

import ValidationResult from "./ValidationResult.jsx";
import OperatorConfigViewer from "./OperatorConfigViewer.jsx";

const UrlCheckerForm = () => {
    const [urlInput, setUrlInput] = useState('');
    const [validationType, setValidationType] = useState(''); 
    const [parsedParams, setParsedParams] = useState(null);
    const [error, setError] = useState(null);
    // Добавляем стейт для предупреждений
    const [warnings, setWarnings] = useState([]);

    const handleCheckUrl = () => {
        setError(null);
        setWarnings([]); // Сбрасываем предупреждения
        setParsedParams(null);

        if (!urlInput.trim()) {
            setError('Поле URL не может быть пустым.');
            return;
        }
        
        let result;

        if (validationType === 'prodLaunchURLValidation') {
            result = validateLaunchURLProd(urlInput);
        } else if (validationType === 'stageLaunchURLValidation') {
            result = validateLaunchURLStage(urlInput);
        } else if (validationType === 'roundDetailsValidation') {
            result = validateRoundDetailsUrl(urlInput);
        } else {
            setError('Пожалуйста, выберите корректный тип валидации.');
            return;
        }

        if (result.components) {
            setParsedParams(result.components);
        }

        // Обработка ошибок
        if (result.errors && result.errors.length > 0) {
            setError(result.errors.join(' | '));
        }

        // Обработка предупреждений (если они есть в ответе валидатора)
        if (result.warnings && result.warnings.length > 0) {
            setWarnings(result.warnings);
        }
    };

    return (
        <div className="font-sans w-full max-w-7xl mx-auto">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">
                Launch URL validator
            </h1>
            <div className="flex flex-col space-y-4 p-6 bg-white rounded-xl shadow-2xl border border-gray-200">
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
                            setWarnings([]);
                            setParsedParams(null);
                        }}
                        className="w-full px-4 py-3 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg 
                                   focus:outline-none focus:ring-2 focus:ring-[#2e2691] focus:border-transparent 
                                   transition duration-150 ease-in-out text-sm md:text-base shadow-inner cursor-pointer"
                    >
                        <option value="" disabled>-- Выберите тип валидации --</option>
                        <option value="prodLaunchURLValidation">Launch URL (Production)</option>
                        <option value="stageLaunchURLValidation">Launch URL (Stage)</option>
                        <option value="roundDetailsValidation">Round Details URL (History)</option>
                    </select>
                </div>

                {validationType && (
                    <div className="flex flex-col space-y-4 animate-fade-in-up">
                        <textarea
                            rows="4"
                            placeholder={validationType === 'roundDetailsValidation' 
                                ? "Вставьте ссылку на историю раунда (например, https://games-info.apac.spribegaming.com/?round_id=...)"
                                : "Вставьте launch URL сюда (например, https://launch.spribegaming.com/aviator?user=...)"
                            }
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            className={`w-full px-4 py-3 text-gray-900 bg-gray-50 border ${error ? 'border-red-500' : (warnings.length > 0 ? 'border-yellow-500' : 'border-gray-300')} rounded-lg 
                                    focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500' : (warnings.length > 0 ? 'focus:ring-yellow-500' : 'focus:ring-[#2e2691]')} focus:border-transparent 
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

            {/* Блок ОШИБОК (Красный) */}
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

            {/* Блок ПРЕДУПРЕЖДЕНИЙ (Желтый) - показываем даже если есть parsedParams */}
            {warnings.length > 0 && !error && (
                <div className="mt-6 p-4 bg-yellow-50 text-yellow-800 border border-yellow-400 rounded-xl shadow-md">
                    <div className="flex items-start">
                        <span className="text-2xl mr-3">⚠️</span>
                        <div>
                            <h4 className="font-bold text-lg mb-1">Предупреждение (URL рабочий, но нестандартный):</h4>
                            {warnings.map((warn, index) => (
                                <p key={index} className="whitespace-pre-wrap text-sm mb-1">{warn}</p>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Результаты (показываем, если нет критических ошибок, даже при варнингах) */}
            {parsedParams && !error && (
                <>
                    <ValidationResult data={parsedParams} />
                    
                    <OperatorConfigViewer 
                        gameId={parsedParams.gameId} 
                        operator={parsedParams.payload?.operator} 
                        validationType={validationType}
                        analyzedHost={parsedParams.host} 
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