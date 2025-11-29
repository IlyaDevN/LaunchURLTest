// utils/validators/validateLaunchURLStage.js

import { REQUIRED_PARAMS, OPTIONAL_PARAMS } from "../../staticData/queryParams.js";
import { VALID_CURRENCY_CODES } from "../../staticData/currencies.js";
import { CRASH_GAMES, TURBO_GAMES, SLOT_GAMES, LIVE_GAMES } from "../../staticData/games.js";

// Создаем Set'ы
const ALLOWED_QUERY_PARAMS_SET = new Set([...REQUIRED_PARAMS, ...OPTIONAL_PARAMS]);
const VALID_CURRENCY_CODES_SET = new Set(VALID_CURRENCY_CODES.map(c => c.toUpperCase()));
const VALID_GAMES = [...CRASH_GAMES, ...TURBO_GAMES, ...SLOT_GAMES, ...LIVE_GAMES];

export const validateLaunchURLStage = (urlToValidate) => {
    let validationErrors = [];
    let urlObject;
    let components = { gameId: '', payload: {} }; 
    let params = {};
    
    // Ожидаемый префикс для этого окружения
    const REQUIRED_PREFIX = "https://dev-test.spribe.io/games/launch/";

    // 1. Жесткая проверка начала URL
    if (!urlToValidate.startsWith(REQUIRED_PREFIX)) {
         validationErrors.push(`Для этого типа проверки URL должен начинаться строго с "${REQUIRED_PREFIX}"`);
         return { errors: validationErrors, components: null };
    }

    // === ИГНОРИРОВАНИЕ RETURN_URL ПРИ ПРОВЕРКЕ СИНТАКСИСА ===
    // Создаем копию строки, где содержимое return_url заменено на заглушку.
    // Это нужно, чтобы слэши (//) внутри return_url не вызывали ошибок валидации основного URL.
    const urlForSyntaxCheck = urlToValidate.replace(/return_url=[^&]*/gi, "return_url=skipped");

    // 2.1. ПРОВЕРКА: Двойной слэш (//) вне протокола
    // Используем urlForSyntaxCheck вместо urlToValidate
    const inputWithoutProtocol = urlForSyntaxCheck.replace(/^https?:\/\//i, '');
    
    if (inputWithoutProtocol.includes('//')) {
        validationErrors.push('Обнаружены последовательные слэши "//" вне протокола.');
    }
    
    // 2.2. ПРОВЕРКА: Двойной амперсанд (&&)
    // Также используем очищенную строку
    if (urlForSyntaxCheck.includes('&&')) {
        validationErrors.push('Обнаружен двойной амперсанд "&&" в URL.');
    }

    try {
        // Парсим ОРИГИНАЛЬНЫЙ URL, чтобы получить реальные параметры
        urlObject = new URL(urlToValidate);

        // 2.3. ПРОВЕРКА: Висячий слэш перед параметрами (если не пустой path)
        if (urlObject.pathname.endsWith('/') && urlObject.search) {
            validationErrors.push('Путь URL заканчивается слэшем "/" непосредственно перед строкой запроса.');
        }

        urlObject.searchParams.forEach((value, key) => {
            if (key !== '') {
                params[key] = value;
            }
        });
        
        // НОВАЯ ЛОГИКА: gameId из пути (после /games/launch/)
        const pathParts = urlObject.pathname.split('/');
        const extractedGameId = pathParts[3] || '';

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
    
    // Если были критические ошибки парсинга
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
        validationErrors.push('Название игры (Game ID) отсутствует в пути URL (после /games/launch/).'); 
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
    // (return_url обычно не является обязательным параметром, но даже если он там окажется, 
    // проверка идет по ключам из REQUIRED_PARAMS)
    REQUIRED_PARAMS.forEach(key => {
        const value = components.payload[key];
        // Доп. проверка: если этот параметр return_url, мы его пропускаем (на всякий случай)
        if (key === 'return_url') return;

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