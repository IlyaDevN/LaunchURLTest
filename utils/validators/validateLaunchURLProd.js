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
    
    // === 1. ЛОГИКА "ЗАМЕНЫ" RETURN_URL ===
    // Вместо обрезки строки (split), мы заменяем значение return_url на 'skipped'.
    // Регулярка ищет 'return_url=' и все символы после него, КОТОРЫЕ НЕ ЯВЛЯЮТСЯ '&'.
    // Это позволяет сохранить параметры (например, &token=...), идущие ПОСЛЕ return_url.
    let urlForParamsCheck = urlToValidate.replace(/return_url=[^&]*/gi, "return_url=skipped");

    // Проверка протокола
    if (!urlToValidate.toLowerCase().startsWith('http://') && !urlToValidate.toLowerCase().startsWith('https://')) {
         validationErrors.push('URL должен начинаться с "http://" или "https://".');
         return { errors: validationErrors, warnings: [], components: null };
    }

    // 2.1. ПРОВЕРКА СИНТАКСИСА (на основе "очищенного" URL)
    const inputWithoutProtocol = urlForParamsCheck.replace(/^https?:\/\//i, '');
    
    if (inputWithoutProtocol.includes('//')) {
        validationErrors.push('Обнаружены последовательные слэши "//" вне протокола.');
    }
    
    if (urlForParamsCheck.includes('&&')) {
        validationErrors.push('Обнаружен двойной амперсанд "&&" в URL.');
    }

    try {
        // Парсим ПОЛНЫЙ URL (оригинал)
        urlObjectFull = new URL(urlToValidate);
        
        // Парсим ОЧИЩЕННЫЙ URL для безопасного сбора параметров
        urlObjectParams = new URL(urlForParamsCheck);

        // Собираем параметры из ОЧИЩЕННОГО URL
        urlObjectParams.searchParams.forEach((value, key) => {
            if (key !== '') {
                params[key] = value;
            }
        });

        // === ВОССТАНОВЛЕНИЕ РЕАЛЬНОГО RETURN_URL ДЛЯ ВЫВОДА ===
        // Берем значение из полного объекта URL. Это надежнее, чем вырезать подстроки.
        if (urlObjectFull.searchParams.has('return_url')) {
            params['return_url'] = urlObjectFull.searchParams.get('return_url');
        }

        // === ОПРЕДЕЛЕНИЕ ИГРЫ ПО ДОМЕНУ (HOST) ===
        const host = urlObjectFull.host.toLowerCase().replace(/^www\./, '');
        const pathname = urlObjectFull.pathname;
        
        // Разбиваем путь на части
        const pathSegments = pathname.split('/').filter(p => p);
        
        let extractedGameId = '';

        switch (host) {
            case 'launch.spribegaming.com':
                // Берем последний сегмент
                extractedGameId = pathSegments[pathSegments.length - 1] || '';

                if (pathSegments.length > 1) {
                    validationWarnings.push(`URL содержит лишние сегменты пути ("${pathname}").\nРекомендуемый стандарт для Prod: https://launch.spribegaming.com/${extractedGameId}`);
                }
                break;

            case 'cdnet-launch.apac.spribegaming.com':
                extractedGameId = pathSegments[pathSegments.length - 1] || '';
                break;

            case 'aviator-next.spribegaming.com':
            case 'aviaport.spribegaming.com':
                extractedGameId = 'aviator';
                break;

            case 'turbo.spribegaming.com':
                extractedGameId = pathSegments[pathSegments.length - 1] || '';
                break;

            case 'slots.spribegaming.com':
                extractedGameId = pathSegments[pathSegments.length - 1] || '';
                break;

            case 'keno80.spribegaming.com':
                extractedGameId = 'multikeno';
                break;

            case 'trader.spribegaming.com':
                extractedGameId = 'trader';
                break;

            case 'starline.spribegaming.com':
                extractedGameId = 'starline';
                break;
            
            case 'pilot-chicken.spribegaming.com':
                extractedGameId = 'pilot-chicken';
                break;

            default:
                validationErrors.push(`Неизвестный домен: "${host}". Ожидался launch.spribegaming.com, cdnet-launch или известные поддомены игр.`);
        }

        components = {
            protocol: urlObjectFull.protocol,
            host: urlObjectFull.host,
            gameId: extractedGameId,
            payload: params
        };

        // 2.3. ПРОВЕРКА: Висячий слэш
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

    // 3. ПРОВЕРКА: Некорректные параметры
    const foundParams = Object.keys(components.payload);
    const unknownParams = foundParams.filter(key => !ALLOWED_QUERY_PARAMS_SET.has(key));

    if (unknownParams.length > 0) {
        validationErrors.push(`Некорректные (неизвестные) параметры: "${unknownParams.join(', ')}".`);
    }

    // 4. ПРОВЕРКА: Название игры (Game ID)
    if (!components.gameId) {
        validationErrors.push('Не удалось определить Game ID из URL.'); 
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
    
    // 6. ПРОВЕРКА: Слэши в значениях
    REQUIRED_PARAMS.forEach(key => {
        const value = components.payload[key];
        if (key === 'return_url') return;

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