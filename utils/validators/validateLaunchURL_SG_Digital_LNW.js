// utils/validators/validateLaunchURL_SG_Digital_LNW.js

import { VALID_CURRENCY_CODES } from "../../staticData/currencies.js";

const VALID_CURRENCY_CODES_SET = new Set(VALID_CURRENCY_CODES.map(c => c.toUpperCase()));

// Список допустимых юрисдикций (White list)
const VALID_JURISDICTIONS = new Set([
    'br', 'it', 'gr', 'co', 'es', 'uk', 'be', 
    'lv', 'pe', 'nl', 'ca-on', 'ro', 'ee', 'se', 'bg'
]);

const SG_GAME_MAPPING = {
    '2440001': 'aviator',
    '2440002': 'mines',
    '2440003': 'goal',
    '2440004': 'plinko',
    '2440005': 'dice'
};

export const validateLaunchURL_SG_Digital_LNW = (urlToValidate) => {
    // 0. Базовая проверка
    if (!urlToValidate) return { errors: ['URL пуст'], components: null };
    urlToValidate = urlToValidate.trim();

    let validationErrors = [];
    let validationWarnings = [];
    let urlObject;
    let components = { gameId: '', payload: {} }; 
    let params = {};

    if (!urlToValidate.toLowerCase().startsWith('http://') && !urlToValidate.toLowerCase().startsWith('https://')) {
         return { errors: ['URL должен начинаться с "http://" или "https://"'], components: null };
    }

    try {
        urlObject = new URL(urlToValidate);
        
        urlObject.searchParams.forEach((value, key) => {
            if (key !== '') params[key] = value;
        });

        // === НОРМАЛИЗАЦИЯ ===
        const operatorId = params['nogsoperatorid'] || params['operatorid'] || '';
        
        let rawGameId = params['gameid'] || params['nogsgameid'] || params['ogsgameid'] || params['gameName'] || '';
        
        if (SG_GAME_MAPPING[rawGameId]) {
            rawGameId = SG_GAME_MAPPING[rawGameId];
        }

        const currency = params['nogscurrency'] || params['currency'] || '';
        const mode = params['nogsmode'] || params['mode'] || '';

        // Определяем среду по домену (для UI)
        let environment = 'PROD';
        if (urlObject.host.includes('stage') || urlObject.host.includes('dev') || urlObject.host.includes('test')) {
            environment = 'STAGE';
        }

        components = {
            protocol: urlObject.protocol,
            host: urlObject.host,
            gameId: rawGameId, 
            payload: {
                ...params,
                // Служебные поля (начинаются с _ чтобы их легко фильтровать в UI)
                _operator: operatorId, 
                _currency: currency,
                _environment: environment,
                _mode: mode
            }
        };

    } catch (e) {
        return { errors: ['Некорректный формат URL'], components: null };
    }

    // === ПРОВЕРКИ (Логика не прерывается, просто копим ошибки) ===

    // 1. Operator
    if (!components.payload._operator) {
        validationErrors.push('Не удалось найти ID оператора (nogsoperatorid / operatorid).');
    }
    
    // 2. Game ID
    if (!components.gameId) {
        validationErrors.push('Не удалось найти ID игры (nogsgameid / gameid / gameName).');
    }
    
    // 3. Currency (обязательна для Real mode)
    if (!components.payload._currency && components.payload._mode?.toLowerCase() !== 'demo') {
        validationErrors.push('Не удалось найти валюту (nogscurrency / currency).');
    }

    // 4. Session ID (обязателен для Real mode)
    const isDemo = components.payload._mode?.toLowerCase() === 'demo';
    if (!params['sessionid'] && !isDemo) {
        validationErrors.push('Отсутствует параметр sessionid (обязателен для реальной игры).');
    }

    // 5. Проверка валидности кода валюты
    const cur = components.payload._currency;
    if (cur) {
        if (!VALID_CURRENCY_CODES_SET.has(cur.toUpperCase())) {
            validationErrors.push(`Валюта "${cur}" не найдена в списке допустимых кодов.`);
        }
    }

    // 6. ПРОВЕРКА JURISDICTION (Не прерывает выполнение, просто добавляет ошибку)
    const jurisdiction = params['jurisdiction'];
    if (jurisdiction && jurisdiction.trim() !== '') {
        if (!VALID_JURISDICTIONS.has(jurisdiction.toLowerCase())) {
            validationErrors.push(`Недопустимое значение jurisdiction: "${jurisdiction}". Ожидалось одно из: ${Array.from(VALID_JURISDICTIONS).join(', ')}`);
        }
    }

    // В конце возвращаем всё, что собрали. 
    // Даже если есть ошибки, components вернутся, и UI сможет их отрисовать.
    return { 
        errors: validationErrors, 
        warnings: validationWarnings, 
        components: components
    };
};