// utils/validators/validateLaunchURLProd.js

import { REQUIRED_PARAMS, OPTIONAL_PARAMS } from "../../staticData/queryParams.js";
import { VALID_CURRENCY_CODES } from "../../staticData/currencies.js";
import { CRASH_GAMES, TURBO_GAMES, SLOT_GAMES, MULTIPLAYER_GAMES } from "../../staticData/games.js";

// Создаем Set'ы
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
    
    // === 1. УМНАЯ ОБРАБОТКА RETURN_URL (через REPLACE) ===
    // Это ключевой момент. Мы не обрезаем строку, а ЗАМЕНЯЕМ значение return_url.
    // Регулярка захватывает всё от 'return_url=' до следующего '&' (или конца строки).
    // Это позволяет корректно распарсить параметры, идущие ПОСЛЕ return_url (например: ...&return_url=...&user=123).
    let urlForParamsCheck = urlToValidate.replace(/return_url=[^&]*/gi, "return_url=skipped");

    // Проверка протокола
    if (!urlToValidate.toLowerCase().startsWith('http://') && !urlToValidate.toLowerCase().startsWith('https://')) {
         validationErrors.push('URL должен начинаться с "http://" или "https://".');
         return { errors: validationErrors, warnings: [], components: null };
    }

    // 2.1. ПРОВЕРКА СИНТАКСИСА (на основе безопасного URL)
    const inputWithoutProtocol = urlForParamsCheck.replace(/^https?:\/\//i, '');
    
    if (inputWithoutProtocol.includes('//')) {
        validationErrors.push('Обнаружены последовательные слэши "//" вне протокола.');
    }
    
    if (urlForParamsCheck.includes('&&')) {
        validationErrors.push('Обнаружен двойной амперсанд "&&" в URL.');
    }

    try {
        // Парсим ПОЛНЫЙ URL (для хоста и восстановления return_url)
        urlObjectFull = new URL(urlToValidate);
        
        // Парсим БЕЗОПАСНЫЙ URL (для сбора остальных параметров)
        urlObjectParams = new URL(urlForParamsCheck);

        // Собираем параметры из безопасного объекта
        urlObjectParams.searchParams.forEach((value, key) => {
            if (key !== '') {
                params[key] = value;
            }
        });

        // === ВОССТАНОВЛЕНИЕ РЕАЛЬНОГО RETURN_URL ===
        // Берем значение из полного объекта URL, чтобы показать пользователю оригинал
        if (urlObjectFull.searchParams.has('return_url')) {
            params['return_url'] = urlObjectFull.searchParams.get('return_url');
        } 
        // Обработка случая с опечаткой 'return_url ' (пробел или плюс в конце)
        else if (urlObjectFull.searchParams.has('return_url ')) {
             params['return_url'] = urlObjectFull.searchParams.get('return_url ');
        }

        // === ОПРЕДЕЛЕНИЕ ИГРЫ ПО ДОМЕНУ (HOST) ===
        const host = urlObjectFull.host.toLowerCase().replace(/^www\./, '');
        const pathname = urlObjectFull.pathname;
        const pathSegments = pathname.split('/').filter(p => p);
        
        let extractedGameId = '';

        // Проверка на зеркала (spribegaming35.click и т.д.)
        const isMirrorDomain = /aviator-next\.spribegaming\d+\.click/.test(host);

        switch (true) {
            case host === 'launch.spribegaming.com':
            case host === 'spribelaunch.com':
                // Берем последний сегмент пути
                extractedGameId = pathSegments[pathSegments.length - 1] || '';
                
                if (host === 'launch.spribegaming.com' && pathSegments.length > 1) {
                    validationWarnings.push(`URL содержит лишние сегменты пути ("${pathname}").\nРекомендуемый стандарт: https://launch.spribegaming.com/${extractedGameId}`);
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
                extractedGameId = pathSegments[pathSegments.length - 1] || '';
                break;

            case host === 'slots.spribegaming.com':
                extractedGameId = pathSegments[pathSegments.length - 1] || '';
                break;

            case host === 'keno80.spribegaming.com':
                extractedGameId = 'multikeno';
                break;
            case host === 'trader.spribegaming.com':
                extractedGameId = 'trader';
                break;
            case host === 'starline.spribegaming.com':
                extractedGameId = 'starline';
                break;
            case host === 'pilot-chicken.spribegaming.com':
                extractedGameId = 'pilot-chicken';
                break;

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

    // 3. ПРОВЕРКА: Неизвестные параметры (WARNING)
    const foundParams = Object.keys(components.payload);
    
    const unknownParams = foundParams.filter(key => {
        // Убираем возможный плюс/пробел в конце ключа (для случаев типа return_url+=)
        const cleanKey = key.replace(/[+ ]$/, '');
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
    
    // 6. ПРОВЕРКА: Слэши
    REQUIRED_PARAMS.forEach(key => {
        const value = components.payload[key];
        // Игнорируем проверку содержимого для return_url
        if (key.startsWith('return_url')) return;

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