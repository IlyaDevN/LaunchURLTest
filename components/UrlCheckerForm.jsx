// components/UrlCheckerForm.jsx

import { useState } from "react";
import { validateLaunchURLProd } from "../utils/validators/validateLaunchURLProd.js";
import { validateLaunchURLStage } from "../utils/validators/validateLaunchURLStage.js";
import { validateRoundDetailsUrl } from "../utils/validators/validateRoundDetailsUrl.js";
import { detectUrlType } from "../utils/helpers/urlTypeDetector.js";

import ValidationResult from "./ValidationResult.jsx";
import OperatorConfigViewer from "./OperatorConfigViewer.jsx";

const UrlCheckerForm = () => {
    const [urlInput, setUrlInput] = useState('');
    const [validationType, setValidationType] = useState(''); 
    const [parsedParams, setParsedParams] = useState(null);
    const [error, setError] = useState(null);
    const [warnings, setWarnings] = useState([]);
    
    const [isCopied, setIsCopied] = useState(false);

    // === ЖИВОЕ ОПРЕДЕЛЕНИЕ ТИПА ПРИ ВВОДЕ ===
    const handleInputChange = (e) => {
        const value = e.target.value;
        setUrlInput(value);

        // Сбрасываем старые результаты при изменении ввода
        if (parsedParams || error) {
            setParsedParams(null);
            setError(null);
            setWarnings([]);
        }

        // Пытаемся определить тип на лету
        const detected = detectUrlType(value);
        setValidationType(detected || '');
    };

    // === ГЛАВНЫЙ ОБРАБОТЧИК ===
    const handleCheckUrl = () => {
        setError(null);
        setWarnings([]);
        setParsedParams(null);

        if (!urlInput.trim()) {
            setError('Поле URL не может быть пустым.');
            return;
        }

        // Если тип не определился автоматически при вводе (например, ссылка кривая), пробуем еще раз
        // или выдаем ошибку, если urlTypeDetector вернул null.
        let currentType = validationType;
        if (!currentType) {
            currentType = detectUrlType(urlInput);
            if (!currentType) {
                setError('Не удалось определить тип ссылки. Убедитесь, что это корректный URL Spribe.');
                return;
            }
            setValidationType(currentType);
        }
        
        let result;

        if (currentType === 'prodLaunchURLValidation') {
            result = validateLaunchURLProd(urlInput);
        } else if (currentType === 'stageLaunchURLValidation') {
            result = validateLaunchURLStage(urlInput);
        } else if (currentType === 'roundDetailsValidation') {
            result = validateRoundDetailsUrl(urlInput);
        }

        if (result.components) {
            setParsedParams(result.components);
        }

        if (result.errors && result.errors.length > 0) {
            setError(result.errors.join(' | '));
        }

        if (result.warnings && result.warnings.length > 0) {
            setWarnings(result.warnings);
        }
    };

    const handleClear = () => {
        setUrlInput('');
        setError(null);
        setWarnings([]);
        setParsedParams(null);
        setValidationType('');
        setIsCopied(false);
    };

    const handleCopy = () => {
        if (!urlInput) return;
        navigator.clipboard.writeText(urlInput).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCheckUrl();
        }
    };

    // Вспомогательная функция для получения красивого лейбла
    const getTypeLabel = () => {
        switch (validationType) {
            case 'prodLaunchURLValidation':
                return { text: 'Prod Launch', color: 'bg-green-100 text-green-800 border-green-200' };
            case 'stageLaunchURLValidation':
                return { text: 'Stage Launch', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
            case 'roundDetailsValidation':
                return { text: 'Round History', color: 'bg-blue-100 text-blue-800 border-blue-200' };
            default:
                return null;
        }
    };

    const typeLabel = getTypeLabel();

    return (
        <div className="font-sans w-full max-w-7xl mx-auto">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">
                Universal URL Validator
            </h1>
            
            <div className="flex flex-col space-y-4 p-6 bg-white rounded-xl shadow-2xl border border-gray-200">
                <div className="flex flex-col space-y-4">
                    
                    {/* Поле ввода */}
                    <textarea
                        rows="4"
                        placeholder="Вставьте ссылку сюда (Launch URL или Round Details)..."
                        value={urlInput}
                        // Используем новый обработчик
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        className={`w-full px-4 py-3 text-gray-900 bg-gray-50 border ${error ? 'border-red-500' : (warnings.length > 0 ? 'border-yellow-500' : 'border-gray-300')} rounded-lg 
                                focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500' : (warnings.length > 0 ? 'focus:ring-yellow-500' : 'focus:ring-[#2e2691]')} focus:border-transparent 
                                transition duration-150 ease-in-out text-sm md:text-base resize-none min-h-[6rem] shadow-inner`} 
                    />
                    
                    {/* === ПАНЕЛЬ УПРАВЛЕНИЯ (Бейдж слева + Кнопки справа) === */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
                        
                        {/* ЛЕВЫЙ УГОЛ: Бейдж типа ссылки (появляется автоматически) */}
                        <div className="w-full sm:w-auto h-10 flex items-center">
                            {typeLabel ? (
                                <span className={`px-4 py-2 rounded-lg text-sm font-bold border ${typeLabel.color} animate-fade-in w-full sm:w-auto text-center shadow-sm`}>
                                    {typeLabel.text}
                                </span>
                            ) : (
                                // Пустой блок, чтобы кнопки справа не прыгали, или текст-подсказка
                                urlInput && <span className="text-gray-400 text-sm italic animate-pulse">Определение типа...</span>
                            )}
                        </div>

                        {/* ПРАВЫЙ УГОЛ: Кнопки */}
                        <div className="flex w-full sm:w-auto gap-2 justify-end">
                            <button
                            type="button"
                            onClick={handleClear}
                            // Убраны: focus:ring-2 focus:ring-gray-200
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-600 border border-gray-300 font-medium rounded-lg shadow-sm hover:bg-gray-50 hover:text-red-600 hover:border-red-200 transition-all focus:outline-none"
                            title="Очистить"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            onClick={handleCopy}
                            // Убраны: focus:ring-2 focus:ring-gray-200
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-white text-gray-600 border border-gray-300 font-medium rounded-lg shadow-sm hover:bg-gray-50 hover:text-[#2e2691] hover:border-[#2e2691] transition-all focus:outline-none"
                            title="Копировать"
                        >
                            {isCopied ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>
                            )}
                        </button>

                        <button
                            type="button" 
                            onClick={handleCheckUrl} 
                            // Убраны: focus:ring-2 focus:ring-[#2e2691] focus:ring-offset-2
                            className="flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold bg-[#2e2691] rounded-lg shadow-md 
                                    hover:bg-blue-700 hover:shadow-lg focus:outline-none 
                                    transition duration-150 transform hover:scale-[1.01] active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            <span className="hidden sm:inline">Проверить URL</span>
                            <span className="sm:hidden">Check</span>
                        </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ошибки */}
            {error && (
                <div className="mt-6 p-4 bg-red-100 text-red-800 border border-red-500 rounded-xl shadow-md animate-fade-in-up">
                    <div className="flex items-start">
                        <span className="text-2xl mr-3">❌</span>
                        <div>
                            <h4 className="font-bold text-lg mb-1">Ошибка валидации:</h4>
                            <p className="whitespace-pre-wrap text-sm">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Предупреждения */}
            {warnings.length > 0 && !error && (
                <div className="mt-6 p-4 bg-yellow-50 text-yellow-800 border border-yellow-400 rounded-xl shadow-md animate-fade-in-up">
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

            {/* Результаты */}
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
                <p>Этот валидатор автоматически определяет тип ссылки и выполняет соответствующие проверки.</p>
            </div>
        </div>
    );
};

export default UrlCheckerForm;