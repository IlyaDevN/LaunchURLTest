// utils/validators/validateLaunchURLStage.js

import { REQUIRED_PARAMS, OPTIONAL_PARAMS } from "../../staticData/queryParams.js";
import { VALID_CURRENCY_CODES } from "../../staticData/currencies.js";
import { CRASH_GAMES, TURBO_GAMES, SLOT_GAMES, MULTIPLAYER_GAMES } from "../../staticData/games.js";

const ALLOWED_QUERY_PARAMS_SET = new Set([...REQUIRED_PARAMS, ...OPTIONAL_PARAMS]);
const VALID_CURRENCY_CODES_SET = new Set(VALID_CURRENCY_CODES.map(c => c.toUpperCase()));
const VALID_GAMES = [...CRASH_GAMES, ...TURBO_GAMES, ...SLOT_GAMES, ...MULTIPLAYER_GAMES];

export const validateLaunchURLStage = (urlToValidate) => {
    if (!urlToValidate) return { errors: ['URL is empty'], components: null };
    urlToValidate = urlToValidate.trim();

    let validationErrors = [];
    let urlObject;
    let components = { gameId: '', payload: {} }; 
    let params = {};
    
    const urlForSyntaxCheck = urlToValidate.replace(/return_url=[^&]*/gi, "return_url=skipped");

    if (!urlToValidate.toLowerCase().startsWith('http://') && !urlToValidate.toLowerCase().startsWith('https://')) {
         validationErrors.push('URL must start with "http://" or "https://".');
         return { errors: validationErrors, components: null };
    }

    const inputWithoutProtocol = urlForSyntaxCheck.replace(/^https?:\/\//i, '');
    if (inputWithoutProtocol.includes('//')) {
        validationErrors.push('Detected consecutive slashes "//" outside protocol.');
    }
    
    if (urlForSyntaxCheck.includes('&&')) {
        validationErrors.push('Detected double ampersand "&&" in URL.');
    }

    try {
        urlObject = new URL(urlToValidate);

        urlObject.searchParams.forEach((value, key) => {
            if (key !== '') {
                params[key] = value;
            }
        });
        
        const host = urlObject.host.toLowerCase();
        const pathname = urlObject.pathname;
        let extractedGameId = '';

        switch (host) {
            case 'dev-test.spribe.io':
                if (pathname.startsWith('/games/launch/')) {
                    extractedGameId = pathname.split('/')[3] || '';
                } else {
                    validationErrors.push(`For domain ${host}, path must start with /games/launch/`);
                }
                break;

            case 'slots.staging.spribe.dev':
                extractedGameId = pathname.split('/')[1] || '';
                break;

            case 'aviator.staging.spribe.dev':
                extractedGameId = 'aviator';
                break;

            default:
                if (host.endsWith('.staging.spribe.dev')) {
                    extractedGameId = pathname.split('/')[1] || '';
                } else {
                    validationErrors.push(`Unknown Stage domain: "${host}".`);
                }
        }

        components = {
            protocol: urlObject.protocol,
            host: urlObject.host,
            gameId: extractedGameId, 
            payload: params
        };

        if (pathname !== '/' && pathname.endsWith('/') && urlObject.search) {
            validationErrors.push('URL path ends with a slash "/" right before the query string.');
        }

    } catch (e) {
        if (validationErrors.length === 0) {
             validationErrors.push('Invalid URL format.');
        }
    }
    
    if (validationErrors.length > 0 && !components.gameId) {
        return { errors: validationErrors, components: null };
    }

    const foundParams = Object.keys(components.payload);
    const unknownParams = foundParams.filter(key => !ALLOWED_QUERY_PARAMS_SET.has(key));

    if (unknownParams.length > 0) {
        validationErrors.push(`Invalid (unknown) parameters: "${unknownParams.join(', ')}".`);
    }

    if (!components.gameId) {
        validationErrors.push('Game ID missing in URL.'); 
    } else {
        const gameId = components.gameId.toLowerCase();
        if (!VALID_GAMES.includes(gameId)) {
            validationErrors.push(`Game "${gameId}" not found in allowed games list.`);
        }
    }

    REQUIRED_PARAMS.forEach(key => {
        if (!components.payload[key] || components.payload[key].trim() === '') {
            validationErrors.push(`Missing or empty mandatory parameter: "${key}"`);
        }
    });
    
    REQUIRED_PARAMS.forEach(key => {
        const value = components.payload[key];
        if (key === 'return_url') return;

        if (value && value.includes('/')) {
            validationErrors.push(`Invalid value: Mandatory parameter "${key}" contains slash (/).`);
        }
    });

    const currencyCode = components.payload.currency;
    if (currencyCode) {
        const isValidCurrency = VALID_CURRENCY_CODES_SET.has(currencyCode.toUpperCase());
        if (!isValidCurrency) {
            validationErrors.push(`Currency "${currencyCode}" not found in allowed list.`);
        }
    }
    
    return { errors: validationErrors, components: components };
};