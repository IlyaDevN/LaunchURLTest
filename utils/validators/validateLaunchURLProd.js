// utils/validators/validateLaunchURLProd.js

import { REQUIRED_PARAMS, OPTIONAL_PARAMS } from "../../staticData/queryParams.js";
import { VALID_CURRENCY_CODES } from "../../staticData/currencies.js";
import { CRASH_GAMES, TURBO_GAMES, SLOT_GAMES, LIVE_GAMES } from "../../staticData/games.js";

// Создаем Set'ы
const ALLOWED_QUERY_PARAMS_SET = new Set([...REQUIRED_PARAMS, ...OPTIONAL_PARAMS]);
const VALID_CURRENCY_CODES_SET = new Set(VALID_CURRENCY_CODES.map(c => c.toUpperCase()));
const VALID_GAMES = [...CRASH_GAMES, ...TURBO_GAMES, ...SLOT_GAMES, ...LIVE_GAMES];

export const validateLaunchURLProd = (urlToValidate) => {
    // === 0. ПРЕДВАРИТЕЛЬНАЯ ОЧИСТКА ===
    // Удаляем случайные пробелы в начале и конце строки
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

        // Собираем параметры
        urlObject.searchParams.forEach((value, key) => {
            if (key !== '') {
                params[key] = value;
            }
        });

        // === ГЛАВНОЕ ИЗМЕНЕНИЕ: ОПРЕДЕЛЕНИЕ ИГРЫ ПО ДОМЕНУ (HOST) ===
        // Приводим к нижнему регистру и убираем 'www.' если есть
        const host = urlObject.host.toLowerCase().replace(/^www\./, '');
        const pathname = urlObject.pathname;
        let extractedGameId = '';

        switch (host) {
            case 'launch.spribegaming.com':
                // Стандартный лаунч: /aviator -> aviator
                extractedGameId = pathname.split('/')[1] || '';
                break;

            case 'aviator-next.spribegaming.com':
            case 'aviaport.spribegaming.com':
                // Специфичные домены для Авиатора
                extractedGameId = 'aviator';
                break;

            case 'turbo.spribegaming.com':
                // Турбо игры: /dice -> dice
                extractedGameId = pathname.split('/')[1] || '';
                break;

            case 'slots.spribegaming.com':
                // Слоты: /crystal-fall -> crystal-fall
                extractedGameId = pathname.split('/')[1] || '';
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

            default:
                // Если домен неизвестен, считаем это ошибкой
                validationErrors.push(`Неизвестный домен: "${host}". Ожидался launch.spribegaming.com или известные поддомены (aviator-next, turbo, slots...).`);
        }

        components = {
            protocol: urlObject.protocol,
            host: urlObject.host,
            gameId: extractedGameId,
            payload: params
        };

        // 2.3. ПРОВЕРКА: Висячий слэш (только если это путь к игре, а не корень домена)
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
    
    // 6. ПРОВЕРКА: Слэши (/) в значениях обязательных параметров
    REQUIRED_PARAMS.forEach(key => {
        const value = components.payload[key];
        // Пропускаем return_url
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
    
    return { errors: validationErrors, components: components };
};