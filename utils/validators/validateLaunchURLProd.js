// utils/validators/validateLaunchURLProd.js

import { REQUIRED_PARAMS, OPTIONAL_PARAMS } from "../../staticData/queryParams.js";
import { VALID_CURRENCY_CODES } from "../../staticData/currencies.js";
import { CRASH_GAMES, TURBO_GAMES, SLOT_GAMES, MULTIPLAYER_GAMES } from "../../staticData/games.js";

const ALLOWED_QUERY_PARAMS_SET = new Set([...REQUIRED_PARAMS, ...OPTIONAL_PARAMS]);
const VALID_CURRENCY_CODES_SET = new Set(VALID_CURRENCY_CODES.map(c => c.toUpperCase()));
const VALID_GAMES = [...CRASH_GAMES, ...TURBO_GAMES, ...SLOT_GAMES, ...MULTIPLAYER_GAMES];

export const validateLaunchURLProd = (urlToValidate) => {
    if (!urlToValidate) return { errors: ['URL is empty'], warnings: [], components: null };
    urlToValidate = urlToValidate.trim();

    let validationErrors = [];
    let validationWarnings = []; 
    let urlObjectFull; 
    let components = { gameId: '', payload: {} }; 
    let params = {};
    
    let urlForParamsCheck = urlToValidate.replace(/return_url\+?=[^&]*/gi, "return_url=skipped");

    if (!urlToValidate.toLowerCase().startsWith('http://') && !urlToValidate.toLowerCase().startsWith('https://')) {
         validationErrors.push('URL must start with "http://" or "https://".');
         return { errors: validationErrors, warnings: [], components: null };
    }

    const inputWithoutProtocol = urlForParamsCheck.replace(/^https?:\/\//i, '');
    if (inputWithoutProtocol.includes('//')) validationErrors.push('Detected consecutive slashes "//" outside protocol.');
    if (urlForParamsCheck.includes('&&')) validationErrors.push('Detected double ampersand "&&" in URL.');

    try {
        urlObjectFull = new URL(urlToValidate);
        
        urlObjectFull.searchParams.forEach((value, key) => {
            if (key !== '') {
                if (key === 'return_url ') {
                    params['return_url+'] = value;
                } else {
                    params[key] = value;
                }
            }
        });

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
                validationErrors.push(`Unknown domain: "${host}".`);
        }

        components = {
            protocol: urlObjectFull.protocol,
            host: urlObjectFull.host,
            gameId: extractedGameId,
            payload: params
        };

        if (pathname !== '/' && pathname.endsWith('/') && urlObjectFull.search) {
            validationErrors.push('URL path ends with a slash "/" right before the query string.');
        }

    } catch (e) {
        if (validationErrors.length === 0) {
             validationErrors.push('Invalid URL format.');
        }
    }
    
    if (validationErrors.length > 0 && !components.gameId) {
        return { errors: validationErrors, warnings: validationWarnings, components: null };
    }

    const foundParams = Object.keys(components.payload);
    const unknownParams = foundParams.filter(key => {
        const cleanKey = key.replace(/\+$/, '');
        return !ALLOWED_QUERY_PARAMS_SET.has(cleanKey) && !ALLOWED_QUERY_PARAMS_SET.has(key);
    });

    if (unknownParams.length > 0) {
        validationWarnings.push(`Unknown parameters detected: "${unknownParams.join(', ')}".`);
    }

    if (!components.gameId) {
        validationErrors.push('Could not detect Game ID from URL.'); 
    } else {
        const gameId = components.gameId.toLowerCase();
        if (!VALID_GAMES.includes(gameId)) {
            validationErrors.push(`Game "${gameId}" not found in allowed games list.`);
        }
    }

    REQUIRED_PARAMS.forEach(key => {
        if (!components.payload[key] || components.payload[key].trim() === '') {
            validationErrors.push(`Missing mandatory parameter: "${key}"`);
        }
    });
    
    REQUIRED_PARAMS.forEach(key => {
        const value = components.payload[key];
        // === ИСПРАВЛЕНИЕ: Пропускаем проверку слэшей для return_url И token ===
        if (key.startsWith('return_url') || key === 'token') return;

        if (value && value.includes('/')) {
            validationErrors.push(`Invalid value: Mandatory parameter "${key}" contains slash (/).`);
        }
    });

    REQUIRED_PARAMS.forEach(key => {
        const value = components.payload[key];
        if (value && /\s/.test(value)) {
             validationErrors.push(`Invalid value: Parameter "${key}" contains whitespace ("${value}").`);
        }
    });

    const currencyCode = components.payload.currency;
    if (currencyCode) {
        if (/\s/.test(currencyCode)) {
             validationErrors.push(`Invalid value: Currency code "${currencyCode}" contains whitespace.`);
        } else {
            const isValidCurrency = VALID_CURRENCY_CODES_SET.has(currencyCode.toUpperCase());
            if (!isValidCurrency) {
                validationErrors.push(`Currency "${currencyCode}" not found in allowed list.`);
            }
        }
    }
    
    return { errors: validationErrors, warnings: validationWarnings, components: components };
};