//components\UrlCheckerForm.jsx

import { useState, useMemo } from "react";
import { REQUIRED_PARAMS, OPTIONAL_PARAMS } from "../staticData/queryParams.js"
import { VALID_CURRENCY_CODES } from "../staticData/currencies.js";
import { VALID_GAMES } from "../staticData/games.js";

const UrlCheckerForm = () => {
    const [urlInput, setUrlInput] = useState('');
    const [parsedParams, setParsedParams] = useState(null);
    const [error, setError] = useState(null);
    
    // Мемоизация для оптимизации
    const ALLOWED_QUERY_PARAMS_SET = useMemo(() => new Set([...REQUIRED_PARAMS, ...OPTIONAL_PARAMS]), []);
    const VALID_CURRENCY_CODES_SET = useMemo(() => new Set(VALID_CURRENCY_CODES.map(c => c.toUpperCase())), []);

    const handleCheckUrl = () => {
        setError(null);
        setParsedParams(null);

        if (!urlInput.trim()) {
            setError('Поле URL не может быть пустым.');
            return;
        }

        let validationErrors = [];
        let urlObject;
        let components = { gameId: '', payload: {} }; 
        let params = {};
        
        // 1. Строгая проверка протокола
        if (!urlInput.toLowerCase().startsWith('http://') && !urlInput.toLowerCase().startsWith('https://')) {
             validationErrors.push('URL должен начинаться с "http://" или "https://".');
        }

        if (validationErrors.length === 0) {
            // 2.1. ПРОВЕРКА: Двойной слэш (//) вне протокола
            const inputWithoutProtocol = urlInput.replace(/^https?:\/\//i, '');
            if (inputWithoutProtocol.includes('//')) {
                validationErrors.push('Обнаружены последовательные слэши "//" вне протокола.');
            }
            
            // 2.2. ПРОВЕРКА: Двойной амперсанд (&&)
            if (urlInput.includes('&&')) {
                validationErrors.push('Обнаружен двойной амперсанд "&&" в URL.');
            }

            try {
                urlObject = new URL(urlInput);

                // 2.3. ПРОВЕРКА: Висячий слэш в конце пути перед параметрами
                if (urlObject.pathname.endsWith('/') && urlObject.search) {
                    validationErrors.push('Путь URL заканчивается слэшем "/" непосредственно перед строкой запроса.');
                }

                urlObject.searchParams.forEach((value, key) => {
                    if (key !== '') {
                        params[key] = value;
                    }
                });
                
                components = {
                    protocol: urlObject.protocol,
                    host: urlObject.host,
                    // pathname: urlObject.pathname,
                    gameId: urlObject.pathname.split('/').filter(p => p)[0] || '',
                    payload: params
                };
            } catch (e) {
                if (validationErrors.length === 0) {
                     validationErrors.push('Некорректный формат URL.');
                }
            }
        }
        
        if (validationErrors.length > 0 && !components.gameId) {
            setError(validationErrors.join(' | '));
            setParsedParams(null); 
            return; 
        }

        // 3. ПРОВЕРКА: Некорректные (неизвестные) параметры
        const foundParams = Object.keys(components.payload);
        const unknownParams = foundParams.filter(key => !ALLOWED_QUERY_PARAMS_SET.has(key));

        if (unknownParams.length > 0) {
            validationErrors.push(`Некорректные (неизвестные) параметры: "${unknownParams.join(', ')}".`);
        }

        // 4. ПРОВЕРКА: Название игры (Game ID)
        if (!components.gameId) {
            validationErrors.push('Название игры (Game ID) отсутствует в пути URL.');
        } else {
            const gameId = components.gameId.toLowerCase();
            if (!VALID_GAMES.includes(gameId)) {
                validationErrors.push(`Игра "${gameId}" не найдена в списке допустимых игр.`);
            }
        }

        // 5. ПРОВЕРКА: Наличие обязательных параметров
        REQUIRED_PARAMS.forEach(key => {
            if (!components.payload[key] || components.payload[key].trim() === '') {
                validationErrors.push(`Отсутствует или пустое значение обязательного параметра: "${key}"`);
            }
        });
        
        // 6. ПРОВЕРКА: Слэши (/) в значениях обязательных параметров
        REQUIRED_PARAMS.forEach(key => {
            const value = components.payload[key];
            if (value && value.includes('/')) {
                validationErrors.push(`Некорректное значение: Обязательный параметр "${key}" содержит слэш (/).`);
            }
        });

        // 7. ПРОВЕРКА: Корректность кода валюты
        const currencyCode = components.payload.currency;
        if (currencyCode) {
            const isValidCurrency = VALID_CURRENCY_CODES_SET.has(currencyCode.toUpperCase());
            if (!isValidCurrency) {
                validationErrors.push(`Валюта "${currencyCode}" не найдена в списке допустимых кодов.`);
            }
        }
        
        // Обработка всех ошибок локальной валидации
        if (validationErrors.length > 0) {
            setError(validationErrors.join(' | ')); 
            setParsedParams(components); 
            return;
        }

        // Успех локальных проверок
        setParsedParams(components);
    };

    return (
        <div className="font-sans w-full max-w-7xl mx-auto">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">
                Launch URL validator
            </h1>
            <div className="flex flex-col space-y-4 p-6 bg-white rounded-xl shadow-2xl border border-gray-200">
                
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
                <div className="mt-6 p-6 bg-gray-50 rounded-xl shadow-2xl border border-gray-200">
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