// utils/validators/validateLaunchURLProd.js

import { REQUIRED_PARAMS, OPTIONAL_PARAMS } from "../../staticData/queryParams.js";
import { VALID_CURRENCY_CODES } from "../../staticData/currencies.js";
import { VALID_GAMES } from "../../staticData/games.js";

// Создаем Set'ы здесь
const ALLOWED_QUERY_PARAMS_SET = new Set([...REQUIRED_PARAMS, ...OPTIONAL_PARAMS]);
const VALID_CURRENCY_CODES_SET = new Set(VALID_CURRENCY_CODES.map(c => c.toUpperCase()));

export const validateLaunchURLProd = (urlToValidate) => {
    let validationErrors = [];
    let urlObject;
    let components = { gameId: '', payload: {} }; 
    let params = {};
    
    // Ожидаемый префикс для Production
    const REQUIRED_PREFIX = "https://launch.spribegaming.com/";

    // 1. Жесткая проверка начала URL
    if (!urlToValidate.startsWith(REQUIRED_PREFIX)) {
         validationErrors.push(`Для этого типа проверки URL должен начинаться строго с "${REQUIRED_PREFIX}"`);
         // Прерываем валидацию, если домен неверный
         return { errors: validationErrors, components: null };
    }

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

        // 2.3. ПРОВЕРКА: Висячий слэш в конце пути перед параметрами
        if (urlObject.pathname.endsWith('/') && urlObject.search) {
            validationErrors.push('Путь URL заканчивается слэшем "/" непосредственно перед строкой запроса.');
        }

        urlObject.searchParams.forEach((value, key) => {
            if (key !== '') {
                params[key] = value;
            }
        });
        
        // НОВАЯ ЛОГИКА: gameId из пути
        // URL: https://launch.spribegaming.com/aviator
        // Pathname: /aviator
        // Parts: ['', 'aviator'] -> index 1
        const pathParts = urlObject.pathname.split('/');
        // Берем элемент с индексом 1. Если там пусто (например просто домен/), будет undefined
        const extractedGameId = pathParts[1] || '';

        components = {
            protocol: urlObject.protocol,
            host: urlObject.host,
            gameId: extractedGameId,
            payload: params
        };
    } catch (e) {
        if (validationErrors.length === 0) {
             validationErrors.push('Некорректный формат URL.');
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
        validationErrors.push('Название игры (Game ID) отсутствует в пути URL (сразу после домена).'); 
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