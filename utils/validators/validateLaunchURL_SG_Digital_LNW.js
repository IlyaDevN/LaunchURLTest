// utils/validators/validateLaunchURL_SG_Digital_LNW.js

import { VALID_CURRENCY_CODES } from "../../staticData/currencies.js";

const VALID_CURRENCY_CODES_SET = new Set(VALID_CURRENCY_CODES.map(c => c.toUpperCase()));

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
    if (!urlToValidate) return { errors: ['URL is empty'], components: null };
    urlToValidate = urlToValidate.trim();

    let validationErrors = [];
    let validationWarnings = [];
    let urlObject;
    let components = { gameId: '', payload: {} }; 
    let params = {};

    if (!urlToValidate.toLowerCase().startsWith('http://') && !urlToValidate.toLowerCase().startsWith('https://')) {
         return { errors: ['URL must start with "http://" or "https://"'], components: null };
    }

    try {
        urlObject = new URL(urlToValidate);
        
        urlObject.searchParams.forEach((value, key) => {
            if (key !== '') params[key] = value;
        });

        const operatorId = params['nogsoperatorid'] || params['operatorid'] || '';
        
        let rawGameId = params['gameid'] || params['nogsgameid'] || params['ogsgameid'] || params['gameName'] || '';
        
        if (SG_GAME_MAPPING[rawGameId]) {
            rawGameId = SG_GAME_MAPPING[rawGameId];
        }

        const currency = params['nogscurrency'] || params['currency'] || '';
        const mode = params['nogsmode'] || params['mode'] || '';

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
                _operator: operatorId, 
                _currency: currency,
                _environment: environment,
                _mode: mode
            }
        };

    } catch (e) {
        return { errors: ['Invalid URL format'], components: null };
    }

    if (!components.payload._operator) {
        validationErrors.push('Could not find Operator ID (nogsoperatorid / operatorid).');
    }
    
    if (!components.gameId) {
        validationErrors.push('Could not find Game ID (nogsgameid / gameid / gameName).');
    }
    
    if (!components.payload._currency && components.payload._mode?.toLowerCase() !== 'demo') {
        validationErrors.push('Could not find currency (nogscurrency / currency).');
    }

    const isDemo = components.payload._mode?.toLowerCase() === 'demo';
    if (!params['sessionid'] && !isDemo) {
        validationErrors.push('Missing sessionid parameter (mandatory for real play).');
    }

    const cur = components.payload._currency;
    if (cur) {
        if (!VALID_CURRENCY_CODES_SET.has(cur.toUpperCase())) {
            validationErrors.push(`Currency "${cur}" not found in allowed list.`);
        }
    }

    const jurisdiction = params['jurisdiction'];
    if (jurisdiction && jurisdiction.trim() !== '') {
        if (!VALID_JURISDICTIONS.has(jurisdiction.toLowerCase())) {
            validationErrors.push(`Invalid jurisdiction: "${jurisdiction}". Expected one of: ${Array.from(VALID_JURISDICTIONS).join(', ')}`);
        }
    }

    return { 
        errors: validationErrors, 
        warnings: validationWarnings, 
        components: components
    };
};