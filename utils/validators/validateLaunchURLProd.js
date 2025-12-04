// utils/validators/validateLaunchURLProd.js

import { REQUIRED_PARAMS, OPTIONAL_PARAMS } from "../../staticData/queryParams.js";
import { VALID_CURRENCY_CODES } from "../../staticData/currencies.js";
import { CRASH_GAMES, TURBO_GAMES, SLOT_GAMES, MULTIPLAYER_GAMES } from "../../staticData/games.js";

const ALLOWED_QUERY_PARAMS_SET = new Set([...REQUIRED_PARAMS, ...OPTIONAL_PARAMS]);
const VALID_CURRENCY_CODES_SET = new Set(VALID_CURRENCY_CODES.map(c => c.toUpperCase()));
const VALID_GAMES = [...CRASH_GAMES, ...TURBO_GAMES, ...SLOT_GAMES, ...MULTIPLAYER_GAMES];

export const validateLaunchURLProd = (urlToValidate) => {
    // === 0. ПРЕДВАРИТЕЛЬНАЯ ОЧИСТКА ===
    if (!urlToValidate) return { errors: ['URL пуст'], warnings: [], components: null };
    urlToValidate = urlToValidate.trim();

    let validationErrors = [];
    let validationWarnings = []; 
    let urlObjectFull; 
    let components = { gameId: '', payload: {} }; 
    let params = {};
    
    // === 1. ПОДГОТОВКА БЕЗОПАСНОЙ СТРОКИ ===
    // Заменяем return_url на заглушку для проверки синтаксиса
    let urlForParamsCheck = urlToValidate.replace(/return_url=[^&]*/gi, "return_url=skipped");

    // Проверка протокола
    if (!urlToValidate.toLowerCase().startsWith('http://') && !urlToValidate.toLowerCase().startsWith('https://')) {
         validationErrors.push('URL должен начинаться с "http://" или "https://".');
         return { errors: validationErrors, warnings: [], components: null };
    }

    // 2.1. ПРОВЕРКА СИНТАКСИСА
    const inputWithoutProtocol = urlForParamsCheck.replace(/^https?:\/\//i, '');
    if (inputWithoutProtocol.includes('//')) validationErrors.push('Обнаружены последовательные слэши "//" вне протокола.');
    if (urlForParamsCheck.includes('&&')) validationErrors.push('Обнаружен двойной амперсанд "&&" в URL.');

    try {
        // Парсим ПОЛНЫЙ URL
        urlObjectFull = new URL(urlToValidate);
        
        // === СБОР ПАРАМЕТРОВ ===
        // Используем стандартный итератор
        urlObjectFull.searchParams.forEach((value, key) => {
            if (key !== '') {
                // Если ключ "return_url " (с пробелом), значит в исходнике было "return_url+"
                // Восстанавливаем плюс для наглядности ошибки
                if (key === 'return_url ') {
                    params['return_url+'] = value;
                } else {
                    params[key] = value;
                }
            }
        });

        // === ОПРЕДЕЛЕНИЕ ИГРЫ ПО ДОМЕНУ (HOST) ===
        const host = urlObjectFull.host.toLowerCase().replace(/^www\./, '');
        const pathname = urlObjectFull.pathname;
        const pathSegments = pathname.split('/').filter(p => p);
        
        let extractedGameId = '';
        const isMirrorDomain = /aviator-next\.spribegaming\d+\.click/.test(host);

        switch (true) {
            case host === 'launch.spribegaming.com':
            case host === 'spribelaunch.com':
                extractedGameId = pathSegments[pathSegments.length - 1] || '';
                if (host === 'launch.spribegaming.com' && pathSegments.length > 1) {
                    // validationWarnings.push(...)
                }
                break;

            case host === 'cdnet-launch.apac.spribegaming.com':
                extractedGameId = pathSegments[pathSegments.length - 1] || '';
                break;

            case host === 'aviator-next.spribegaming.com':
            case host === 'aviaport.spribegaming.com':
            case isMirrorDomain:
                extractedGameId = 'aviator';
                break;

            case host === 'turbo.spribegaming.com':
            case host === 'slots.spribegaming.com':
                extractedGameId = pathSegments[pathSegments.length - 1] || '';
                break;

            case host === 'keno80.spribegaming.com': extractedGameId = 'multikeno'; break;
            case host === 'trader.spribegaming.com': extractedGameId = 'trader'; break;
            case host === 'starline.spribegaming.com': extractedGameId = 'starline'; break;
            case host === 'pilot-chicken.spribegaming.com': extractedGameId = 'pilot-chicken'; break;

            default:
                validationErrors.push(`Неизвестный домен: "${host}".`);
        }

        components = {
            protocol: urlObjectFull.protocol,
            host: urlObjectFull.host,
            gameId: extractedGameId,
            payload: params
        };

        // 2.3. Висячий слэш
        if (pathname !== '/' && pathname.endsWith('/') && urlObjectFull.search) {
            validationErrors.push('Путь URL заканчивается слэшем "/" непосредственно перед строкой запроса.');
        }

    } catch (e) {
        if (validationErrors.length === 0) {
             validationErrors.push('Некорректный формат URL.');
        }
    }
    
    if (validationErrors.length > 0 && !components.gameId) {
        return { errors: validationErrors, warnings: validationWarnings, components: null };
    }

    // 3. ПРОВЕРКА: Неизвестные параметры
    const foundParams = Object.keys(components.payload);
    
    const unknownParams = foundParams.filter(key => {
        // Мы не добавляем 'return_url+' в белый список, чтобы он подсвечивался как warning.
        // Обычный 'return_url' там есть.
        return !ALLOWED_QUERY_PARAMS_SET.has(key);
    });

    if (unknownParams.length > 0) {
        validationWarnings.push(`Обнаружены неизвестные параметры: "${unknownParams.join(', ')}".`);
    }

    // 4. ПРОВЕРКА: Название игры
    if (!components.gameId) {
        validationErrors.push('Не удалось определить Game ID из URL.'); 
    } else {
        const gameId = components.gameId.toLowerCase();
        if (!VALID_GAMES.includes(gameId)) {
            validationErrors.push(`Игра "${gameId}" не найдена в списке допустимых игр.`);
        }
    }

    // 5. ПРОВЕРКА: Обязательные параметры
    REQUIRED_PARAMS.forEach(key => {
        // Проверяем наличие параметра. Если в URL был return_url+, то обычного return_url не будет (если он обязателен),
        // и это вызовет ошибку "Отсутствует параметр", что правильно для обязательных.
        // Но return_url у нас опциональный, так что ошибки не будет.
        if (!components.payload[key] || components.payload[key].trim() === '') {
            validationErrors.push(`Отсутствует обязательный параметр: "${key}"`);
        }
    });
    
    // 6. ПРОВЕРКА: Слэши
    REQUIRED_PARAMS.forEach(key => {
        const value = components.payload[key];
        if (value && value.includes('/')) {
            validationErrors.push(`Некорректное значение: Обязательный параметр "${key}" содержит слэш (/).`);
        }
    });

    // 7. ПРОВЕРКА: Валюта
    const currencyCode = components.payload.currency;
    if (currencyCode) {
        const isValidCurrency = VALID_CURRENCY_CODES_SET.has(currencyCode.toUpperCase());
        if (!isValidCurrency) {
            validationErrors.push(`Валюта "${currencyCode}" не найдена в списке допустимых кодов.`);
        }
    }
    
    return { errors: validationErrors, warnings: validationWarnings, components: components };
};