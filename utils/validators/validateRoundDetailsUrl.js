// utils/validators/validateRoundDetailsUrl.js
import { GAMES_CONFIG } from "../../staticData/games.js";

// 1. Допустимые домены (Region Hubs)
const VALID_HOSTS = [
    "games-info.spribegaming.com",      // EU
    "games-info-af.spribegaming.com",   // AF
    "games-info.apac.spribegaming.com", // APAC
    "games-info-sa.spribegaming.com",   // SA
    "games-info-hr.spribegaming.com",   // HR
    "games-info.staging.spribe.dev"     // Stage
];

// 3. Обязательные параметры
const REQUIRED_PARAMS = ["round_id", "game", "provider", "operator", "op_player_id"];

export const validateRoundDetailsUrl = (urlToValidate) => {
    if (!urlToValidate) return { errors: ['URL пуст'], components: null };
    urlToValidate = urlToValidate.trim();

    let validationErrors = [];
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

        const host = urlObject.host.toLowerCase();
        
        if (!VALID_HOSTS.includes(host)) {
            let errorMsg = `Некорректный домен: "${host}".`;
            let suggestion = "";

            if (host.includes("-ap") || host.includes(".ap.") || host.includes("asia")) {
                suggestion = " Похоже на регион APAC. Правильный домен: games-info.apac.spribegaming.com";
            } else if (host.includes("-eu") || host.includes(".eu.")) {
                suggestion = " Похоже на регион EU. Правильный домен: games-info.spribegaming.com";
            } else if (host.includes("-af") || host.includes(".af.")) {
                suggestion = " Похоже на регион AF (Africa). Правильный домен: games-info-af.spribegaming.com";
            } else if (host.includes("-sa") || host.includes(".sa.") || host.includes("latam")) {
                suggestion = " Похоже на регион SA (South America). Правильный домен: games-info-sa.spribegaming.com";
            } else if (host.includes("staging") || host.includes("test")) {
                suggestion = " Для стейджа правильный домен: games-info.staging.spribe.dev";
            }

            if (suggestion) errorMsg += suggestion;
            else errorMsg += " Ожидался один из доменов games-info (EU, APAC, SA, AF, HR или Stage).";
            
            validationErrors.push(errorMsg);
        }

        components = {
            protocol: urlObject.protocol,
            host: urlObject.host,
            gameId: params['game'] || '', 
            payload: params
        };

    } catch (e) {
        return { errors: ['Некорректный формат URL'], components: null };
    }

    REQUIRED_PARAMS.forEach(key => {
        if (!params[key] || params[key].trim() === '') {
            validationErrors.push(`Отсутствует обязательный параметр: "${key}"`);
        }
    });

    if (!params['player_token'] && !params['session_token']) {
        validationErrors.push(`Отсутствует токен игрока (ожидался "player_token" или "session_token")`);
    }

    if (validationErrors.length > 0) {
        return { errors: validationErrors, components };
    }

    const gameId = components.gameId;
    const provider = params['provider'];

    // Ищем игру в общем конфиге
    const gameConfig = GAMES_CONFIG.find(g => g.id === gameId);
    
    if (!gameConfig) {
        validationErrors.push(`Предупреждение: ID игры "${gameId}" не найден в справочнике валидатора.`);
    } else {
        if (provider !== gameConfig.provider) {
            validationErrors.push(`Неверный provider для игры "${gameId}". Ожидался: "${gameConfig.provider}", получен: "${provider}"`);
        }
    }

    return { errors: validationErrors, components };
};