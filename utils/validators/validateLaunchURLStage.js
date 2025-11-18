// utils/validators/validateLaunchURLStage.js

import { REQUIRED_PARAMS, OPTIONAL_PARAMS } from "../../staticData/queryParams.js";
import { VALID_CURRENCY_CODES } from "../../staticData/currencies.js";
import { VALID_GAMES } from "../../staticData/games.js";

// Создаем Set'ы здесь
const ALLOWED_QUERY_PARAMS_SET = new Set([...REQUIRED_PARAMS, ...OPTIONAL_PARAMS]);
const VALID_CURRENCY_CODES_SET = new Set(VALID_CURRENCY_CODES.map(c => c.toUpperCase()));

export const validateLaunchURLStage = (urlToValidate) => {
    let validationErrors = [];
    let urlObject;
    let components = { gameId: '', payload: {} }; 
    let params = {};
    
    // 1. Строгая проверка протокола
    if (!urlToValidate.toLowerCase().startsWith('http://') && !urlToValidate.toLowerCase().startsWith('https://')) {
         validationErrors.push('URL должен начинаться с "http://" или "https://".');
    }

    if (validationErrors.length === 0) {
        // 2.1. ПРОВЕРКА: Двойной слэш (//) вне протокола
        const inputWithoutProtocol = urlToValidate.replace(/^https?:\/\//i, '');
        if (inputWithoutProtocol.includes('//')) {
            validationErrors.push('Обнаружены последовательные слэши "//" вне протокола.');
        }
        
        // 2.2. ПРОВЕРКА: Двойной амперсанд (&&)
        if (urlToValidate.includes('&&')) {
            validationErrors.push('Обнаружен двойной амперсанд "&&" в URL.');
        }

        try {
            urlObject = new URL(urlToValidate);
            
            urlObject.searchParams.forEach((value, key) => {
                if (key !== '') {
                    params[key] = value;
                }
            });
            
            // НОВАЯ ЛОГИКА: gameId из хоста
            const hostParts = urlObject.host.split('.'); // e.g., ['aviator', 'staging', 'spribe', 'dev']
            const gameId = hostParts[0] || '';

            components = {
                protocol: urlObject.protocol,
                host: urlObject.host,
                // pathname: urlObject.pathname,
                gameId: gameId, // gameId из хоста!
                payload: params
            };
        } catch (e) {
            if (validationErrors.length === 0) {
                 validationErrors.push('Некорректный формат URL.');
            }
        }
    }
    
    if (validationErrors.length > 0 && !components.gameId) {
        return { errors: validationErrors, components: null };
    }

    // 3. ПРОВЕРКА: Некорректные (неизвестные) параметры
    const foundParams = Object.keys(components.payload);
    const unknownParams = foundParams.filter(key => !ALLOWED_QUERY_PARAMS_SET.has(key));

    if (unknownParams.length > 0) {
        validationErrors.push(`Некорректные (неизвестные) параметры: "${unknownParams.join(', ')}".`);
    }

    // 4. ПРОВЕРКА: Название игры (Game ID)
    if (!components.gameId) {
        validationErrors.push('Название игры (Game ID) отсутствует в хосте (subdomain) URL.'); // Ошибка для Staging
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
    
    // Возвращаем финальный результат
    return { errors: validationErrors, components: components };
};