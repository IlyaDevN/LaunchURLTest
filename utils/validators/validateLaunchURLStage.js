// utils/validators/validateLaunchURLStage.js

import { REQUIRED_PARAMS, OPTIONAL_PARAMS } from "../../staticData/queryParams.js";
import { VALID_CURRENCY_CODES } from "../../staticData/currencies.js";
import { CRASH_GAMES, TURBO_GAMES, SLOT_GAMES, MULTIPLAYER_GAMES } from "../../staticData/games.js";

// Создаем Set'ы
const ALLOWED_QUERY_PARAMS_SET = new Set([...REQUIRED_PARAMS, ...OPTIONAL_PARAMS]);
const VALID_CURRENCY_CODES_SET = new Set(VALID_CURRENCY_CODES.map(c => c.toUpperCase()));
const VALID_GAMES = [...CRASH_GAMES, ...TURBO_GAMES, ...SLOT_GAMES, ...MULTIPLAYER_GAMES];

export const validateLaunchURLStage = (urlToValidate) => {
    // === 0. ПРЕДВАРИТЕЛЬНАЯ ОЧИСТКА ===
    if (!urlToValidate) return { errors: ['URL пуст'], components: null };
    urlToValidate = urlToValidate.trim();

    let validationErrors = [];
    let urlObject;
    let components = { gameId: '', payload: {} }; 
    let params = {};
    
    // === 1. ИГНОРИРОВАНИЕ RETURN_URL ПРИ ПРОВЕРКЕ СИНТАКСИСА ===
    const urlForSyntaxCheck = urlToValidate.replace(/return_url=[^&]*/gi, "return_url=skipped");

    // Проверка протокола
    if (!urlToValidate.toLowerCase().startsWith('http://') && !urlToValidate.toLowerCase().startsWith('https://')) {
         validationErrors.push('URL должен начинаться с "http://" или "https://".');
         return { errors: validationErrors, components: null };
    }

    // 2.1. ПРОВЕРКА: Двойной слэш (//) вне протокола
    const inputWithoutProtocol = urlForSyntaxCheck.replace(/^https?:\/\//i, '');
    if (inputWithoutProtocol.includes('//')) {
        validationErrors.push('Обнаружены последовательные слэши "//" вне протокола.');
    }
    
    // 2.2. ПРОВЕРКА: Двойной амперсанд (&&)
    if (urlForSyntaxCheck.includes('&&')) {
        validationErrors.push('Обнаружен двойной амперсанд "&&" в URL.');
    }

    try {
        // Парсим ОРИГИНАЛЬНЫЙ URL
        urlObject = new URL(urlToValidate);

        urlObject.searchParams.forEach((value, key) => {
            if (key !== '') {
                params[key] = value;
            }
        });
        
        // === НОВАЯ ЛОГИКА: ОПРЕДЕЛЕНИЕ ИГРЫ ПО ДОМЕНУ (HOST) ===
        const host = urlObject.host.toLowerCase();
        const pathname = urlObject.pathname;
        let extractedGameId = '';

        switch (host) {
            case 'dev-test.spribe.io':
                // Старый формат: /games/launch/{game}
                // Path parts: ['', 'games', 'launch', 'neo-vegas'] -> индекс 3
                if (pathname.startsWith('/games/launch/')) {
                    extractedGameId = pathname.split('/')[3] || '';
                } else {
                    validationErrors.push(`Для домена ${host} путь должен начинаться с /games/launch/`);
                }
                break;

            case 'slots.staging.spribe.dev':
                // Новый формат слотов: /{game}
                // Path parts: ['', 'neo-vegas'] -> индекс 1
                extractedGameId = pathname.split('/')[1] || '';
                break;

            case 'aviator.staging.spribe.dev':
                // Для авиатора обычно корень или /aviator, но чаще всего это спец домен под игру
                extractedGameId = 'aviator';
                break;

            default:
                // Обработка других поддоменов *.staging.spribe.dev (например turbo.staging...)
                if (host.endsWith('.staging.spribe.dev')) {
                    // Предполагаем формат /{game}
                    extractedGameId = pathname.split('/')[1] || '';
                } else {
                    validationErrors.push(`Неизвестный домен для Stage: "${host}".`);
                }
        }

        components = {
            protocol: urlObject.protocol,
            host: urlObject.host,
            gameId: extractedGameId, 
            payload: params
        };

        // 2.3. ПРОВЕРКА: Висячий слэш (если это путь к игре, а не корень)
        // Для dev-test висячий слэш после ID игры будет ошибкой парсинга выше, либо тут
        if (pathname !== '/' && pathname.endsWith('/') && urlObject.search) {
            validationErrors.push('Путь URL заканчивается слэшем "/" непосредственно перед строкой запроса.');
        }

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
        validationErrors.push('Название игры (Game ID) отсутствует в URL.'); 
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
        if (key === 'return_url') return; // Игнорируем return_url

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
    
    return { errors: validationErrors, components: components };
};