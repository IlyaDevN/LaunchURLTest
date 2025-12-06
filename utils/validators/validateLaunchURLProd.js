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
    let urlObjectParams;
    let components = { gameId: '', payload: {} }; 
    let params = {};
    
    // === 1. ПОДГОТОВКА БЕЗОПАСНОЙ СТРОКИ ===
    // Заменяем return_url на заглушку
    let urlForParamsCheck = urlToValidate.replace(/return_url\+?=[^&]*/gi, "return_url=skipped");

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
        urlObjectFull.searchParams.forEach((value, key) => {
            if (key !== '') {
                if (key === 'return_url ') {
                    params['return_url+'] = value;
                } else {
                    params[key] = value;
                }
            }
        });

        // === ОПРЕДЕЛЕНИЕ ИГРЫ ПО ДОМЕНУ ===
        const host = urlObjectFull.host.toLowerCase().replace(/^www\./, '');
        const pathname = urlObjectFull.pathname;
        const pathSegments = pathname.split('/').filter(p => p);
        
        let extractedGameId = '';
        const isMirrorDomain = /aviator-next\.spribegaming\d+\.click/.test(host);

        switch (true) {
            case host === 'launch.spribegaming.com':
            case host === 'spribelaunch.com':
                extractedGameId = pathSegments[pathSegments.length - 1] || '';
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

        // Висячий слэш
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
        const cleanKey = key.replace(/\+$/, '');
        return !ALLOWED_QUERY_PARAMS_SET.has(cleanKey) && !ALLOWED_QUERY_PARAMS_SET.has(key);
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
        if (!components.payload[key] || components.payload[key].trim() === '') {
            validationErrors.push(`Отсутствует обязательный параметр: "${key}"`);
        }
    });
    
    // 6. ПРОВЕРКА: Слэши в значениях
    REQUIRED_PARAMS.forEach(key => {
        const value = components.payload[key];
        if (key.startsWith('return_url')) return;

        if (value && value.includes('/')) {
            validationErrors.push(`Некорректное значение: Обязательный параметр "${key}" содержит слэш (/).`);
        }
    });

    // === 7. НОВАЯ ПРОВЕРКА: ПРОБЕЛЫ В ЗНАЧЕНИЯХ ===
    REQUIRED_PARAMS.forEach(key => {
        const value = components.payload[key];
        // Проверяем на наличие пробельных символов (пробел, таб, неразрывный пробел)
        if (value && /\s/.test(value)) {
             validationErrors.push(`Некорректное значение: Параметр "${key}" содержит пробелы ("${value}").`);
        }
    });

    // 8. ПРОВЕРКА: Валюта
    const currencyCode = components.payload.currency;
    if (currencyCode) {
        // Проверка валюты тоже должна включать проверку на пробелы (на всякий случай)
        if (/\s/.test(currencyCode)) {
             validationErrors.push(`Некорректное значение: Код валюты "${currencyCode}" содержит пробелы.`);
        } else {
            const isValidCurrency = VALID_CURRENCY_CODES_SET.has(currencyCode.toUpperCase());
            if (!isValidCurrency) {
                validationErrors.push(`Валюта "${currencyCode}" не найдена в списке допустимых кодов.`);
            }
        }
    }
    
    return { errors: validationErrors, warnings: validationWarnings, components: components };
};