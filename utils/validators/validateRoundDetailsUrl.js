// utils/validators/validateRoundDetailsUrl.js
import { GAMES_CONFIG } from "../../staticData/games.js";

const VALID_HOSTS = [
    "games-info.spribegaming.com",      // EU
    "games-info-af.spribegaming.com",   // AF
    "games-info.apac.spribegaming.com", // APAC
    "games-info-sa.spribegaming.com",   // SA
    "games-info-hr.spribegaming.com",   // HR
    "games-info.staging.spribe.dev"     // Stage
];

const MANDATORY_PARAMS = ["round_id", "game", "provider", "operator", "op_player_id", "player_token"];

export const validateRoundDetailsUrl = (urlToValidate) => {
    if (!urlToValidate) return { errors: ['URL is empty'], warnings: [], components: null };
    urlToValidate = urlToValidate.trim();

    let validationErrors = [];
    let validationWarnings = [];
    let urlObject;
    let components = { gameId: '', payload: {} };
    let params = {};

    if (!urlToValidate.toLowerCase().startsWith('http://') && !urlToValidate.toLowerCase().startsWith('https://')) {
         return { errors: ['URL must start with "http://" or "https://"'], warnings: [], components: null };
    }

    try {
        urlObject = new URL(urlToValidate);
        
        urlObject.searchParams.forEach((value, key) => {
            if (key !== '') params[key] = value;
        });

        const host = urlObject.host.toLowerCase();
        
        if (!VALID_HOSTS.includes(host)) {
            let errorMsg = `Invalid domain: "${host}".`;
            let suggestion = "";

            if (host.includes("-ap") || host.includes(".ap.") || host.includes("asia")) {
                suggestion = " Looks like APAC region. Correct domain: games-info.apac.spribegaming.com";
            } else if (host.includes("-eu") || host.includes(".eu.")) {
                suggestion = " Looks like EU region. Correct domain: games-info.spribegaming.com";
            } else if (host.includes("-af") || host.includes(".af.")) {
                suggestion = " Looks like AF region. Correct domain: games-info-af.spribegaming.com";
            } else if (host.includes("-sa") || host.includes(".sa.") || host.includes("latam")) {
                suggestion = " Looks like SA region. Correct domain: games-info-sa.spribegaming.com";
            } else if (host.includes("staging") || host.includes("test")) {
                suggestion = " For stage, correct domain is: games-info.staging.spribe.dev";
            }

            if (suggestion) errorMsg += suggestion;
            else errorMsg += " Expected one of the games-info domains (EU, APAC, SA, AF, HR or Stage).";
            
            validationErrors.push(errorMsg);
        }

        components = {
            protocol: urlObject.protocol,
            host: urlObject.host,
            gameId: params['game'] || '', 
            payload: params
        };

    } catch (e) {
        return { errors: ['Invalid URL format'], warnings: [], components: null };
    }

    MANDATORY_PARAMS.forEach(key => {
        if (!params[key] || params[key].trim() === '') {
            validationErrors.push(`Missing mandatory parameter: "${key}"`);
        }
    });
    
    Object.keys(params).forEach(key => {
        const value = params[key];
        if (MANDATORY_PARAMS.includes(key) && value && /\s/.test(value)) {
             validationErrors.push(`Invalid value: Parameter "${key}" contains whitespace ("${value}").`);
        }
    });

    if (validationErrors.length > 0) {
        return { errors: validationErrors, warnings: validationWarnings, components };
    }

    const gameId = (components.gameId || '').trim();
    const provider = (params['provider'] || '').trim();

    const gameConfig = GAMES_CONFIG.find(g => g.id === gameId);
    
    if (!gameConfig) {
        validationWarnings.push(`Warning: Game ID "${gameId}" not found in validator database.`);
    } else {
        if (provider !== gameConfig.provider) {
            validationErrors.push(`Invalid provider for game "${gameId}". Expected: "${gameConfig.provider}", got: "${provider}"`);
        }
    }

    return { errors: validationErrors, warnings: validationWarnings, components };
};