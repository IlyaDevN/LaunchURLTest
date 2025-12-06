// utils/validators/validateRoundDetailsUrl.js

// 1. Допустимые домены (Region Hubs)
const VALID_HOSTS = [
    "games-info.spribegaming.com",      // EU
    "games-info-af.spribegaming.com",   // AF
    "games-info.apac.spribegaming.com", // APAC
    "games-info-sa.spribegaming.com",   // SA
    "games-info-hr.spribegaming.com",   // HR
    "games-info.staging.spribe.dev"     // Stage
];

// 2. Маппинг Игра -> Провайдер
const GAMES_MAPPING = [
    { id: "aviator", provider: "spribe_aviator" },
    { id: "dice", provider: "spribe_crypto" },
    { id: "goal", provider: "spribe_crypto" },
    { id: "plinko", provider: "spribe_crypto" },
    { id: "mines", provider: "spribe_crypto" },
    { id: "hi-lo", provider: "spribe_crypto" },
    { id: "keno", provider: "spribe_crypto" },
    { id: "mini-roulette", provider: "spribe_crypto" },
    { id: "hotline", provider: "spribe_crypto" },
    { id: "balloon", provider: "spribe_crypto" },
    { id: "multikeno", provider: "spribe_keno" },
    { id: "trader", provider: "spribe_trader" },
    { id: "crystal-fall", provider: "spribe_slots" },
    { id: "neo-vegas", provider: "spribe_slots" },
    { id: "gates-of-egypt", provider: "spribe_slots" },
    { id: "forest-of-wisps", provider: "spribe_slots" },
    { id: "keplers-paradise", provider: "spribe_slots" },
    { id: "alien-farm", provider: "spribe_slots" },
    { id: "viking-pub", provider: "spribe_slots" },
    { id: "fruit-garden", provider: "spribe_slots" },
    { id: "piggy-heist", provider: "spribe_slots" }
];

// 3. Обязательные параметры
const REQUIRED_PARAMS = ["round_id", "game", "provider", "operator", "op_player_id"];

export const validateRoundDetailsUrl = (urlToValidate) => {
    // Очистка
    if (!urlToValidate) return { errors: ['URL пуст'], components: null };
    urlToValidate = urlToValidate.trim();

    let validationErrors = [];
    let urlObject;
    let components = { gameId: '', payload: {} };
    let params = {};

    // 1. Проверка протокола
    if (!urlToValidate.toLowerCase().startsWith('http://') && !urlToValidate.toLowerCase().startsWith('https://')) {
         return { errors: ['URL должен начинаться с "http://" или "https://"'], components: null };
    }

    try {
        urlObject = new URL(urlToValidate);
        
        // Извлекаем параметры
        urlObject.searchParams.forEach((value, key) => {
            if (key !== '') params[key] = value;
        });

        // 2. Проверка Хоста (Региона) с Умными Подсказками
        const host = urlObject.host.toLowerCase();
        
        if (!VALID_HOSTS.includes(host)) {
            let errorMsg = `Некорректный домен: "${host}".`;
            let suggestion = "";

            // Эвристика для определения намерения пользователя
            // Проверка на APAC (ap vs apac)
            if (host.includes("-ap") || host.includes(".ap.") || host.includes("asia")) {
                suggestion = " Похоже на регион APAC. Правильный домен: games-info.apac.spribegaming.com";
            } 
            // Проверка на EU (часто пытаются написать games-info-eu)
            else if (host.includes("-eu") || host.includes(".eu.")) {
                suggestion = " Похоже на регион EU. Правильный домен: games-info.spribegaming.com";
            }
            // Проверка на AF
            else if (host.includes("-af") || host.includes(".af.")) {
                suggestion = " Похоже на регион AF (Africa). Правильный домен: games-info-af.spribegaming.com";
            }
            // Проверка на SA
            else if (host.includes("-sa") || host.includes(".sa.") || host.includes("latam")) {
                suggestion = " Похоже на регион SA (South America). Правильный домен: games-info-sa.spribegaming.com";
            }
            // Проверка на Stage (часто путают .com / .io / .dev)
            else if (host.includes("staging") || host.includes("test")) {
                suggestion = " Для стейджа правильный домен: games-info.staging.spribe.dev";
            }

            if (suggestion) {
                // Если нашли догадку - выводим её
                errorMsg += suggestion;
            } else {
                // Иначе стандартное сообщение
                errorMsg += " Ожидался один из доменов games-info (EU, APAC, SA, AF, HR или Stage).";
            }
            
            validationErrors.push(errorMsg);
        }

        // Подготавливаем объект компонентов
        components = {
            protocol: urlObject.protocol,
            host: urlObject.host,
            gameId: params['game'] || '', 
            payload: params
        };

    } catch (e) {
        return { errors: ['Некорректный формат URL'], components: null };
    }

    // 3. Проверка обязательных параметров
    REQUIRED_PARAMS.forEach(key => {
        if (!params[key] || params[key].trim() === '') {
            validationErrors.push(`Отсутствует обязательный параметр: "${key}"`);
        }
    });

    // 3.1 Проверка токена
    if (!params['player_token'] && !params['session_token']) {
        validationErrors.push(`Отсутствует токен игрока (ожидался "player_token" или "session_token")`);
    }

    // Если уже есть ошибки отсутствия параметров, возвращаем их
    if (validationErrors.length > 0) {
        return { errors: validationErrors, components };
    }

    // 4. Логическая валидация (Игра + Провайдер)
    const gameId = components.gameId;
    const provider = params['provider'];

    const gameConfig = GAMES_MAPPING.find(g => g.id === gameId);
    
    if (!gameConfig) {
        validationErrors.push(`Предупреждение: ID игры "${gameId}" не найден в справочнике валидатора.`);
    } else {
        if (provider !== gameConfig.provider) {
            validationErrors.push(`Неверный provider для игры "${gameId}". Ожидался: "${gameConfig.provider}", получен: "${provider}"`);
        }
    }

    return { errors: validationErrors, components };
};