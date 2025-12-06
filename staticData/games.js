// staticData/games.js

// Единый конфигурационный файл для всех игр
// category: влияет на формирование URL для конфига (turbo/slots/live или gameId)
export const GAMES_CONFIG = [
    // --- CRASH / MAIN ---
    { id: "aviator", name: "Aviator", provider: "spribe_aviator", category: "crash" },
    { id: "pilot-chicken", name: "Pilot Chicken", provider: "spribe_aviator", category: "crash" }, // Провайдер предположительный

    // --- TURBO ---
    { id: "dice", name: "Dice", provider: "spribe_crypto", category: "turbo" },
    { id: "goal", name: "Goal", provider: "spribe_crypto", category: "turbo" },
    { id: "plinko", name: "Plinko", provider: "spribe_crypto", category: "turbo" },
    { id: "mines", name: "Mines", provider: "spribe_crypto", category: "turbo" },
    { id: "hi-lo", name: "Hi Lo", provider: "spribe_crypto", category: "turbo" },
    { id: "keno", name: "Keno", provider: "spribe_crypto", category: "turbo" },
    { id: "mini-roulette", name: "Mini Roulette", provider: "spribe_crypto", category: "turbo" },
    { id: "hotline", name: "Hotline", provider: "spribe_crypto", category: "turbo" },
    { id: "balloon", name: "Balloon", provider: "spribe_crypto", category: "turbo" },

    // --- SLOTS ---
    { id: "crystal-fall", name: "Crystal Fall", provider: "spribe_slots", category: "slots" },
    { id: "neo-vegas", name: "Neo Vegas", provider: "spribe_slots", category: "slots" },
    { id: "gates-of-egypt", name: "Gates of Egypt", provider: "spribe_slots", category: "slots" },
    { id: "alien-farm", name: "Alien Farm", provider: "spribe_slots", category: "slots" },
    { id: "forest-of-wisps", name: "Forest of Wisps", provider: "spribe_slots", category: "slots" },
    { id: "keplers-paradise", name: "Kepler's Paradise", provider: "spribe_slots", category: "slots" },
    { id: "viking-pub", name: "Viking Pub", provider: "spribe_slots", category: "slots" },
    { id: "fruit-garden", name: "Fruit Garden", provider: "spribe_slots", category: "slots" },
    { id: "piggy-heist", name: "Piggy Heist", provider: "spribe_slots", category: "slots" },

    // --- MULTIPLAYER / LIVE ---
    { id: "multikeno", name: "Keno 80 (Multikeno)", provider: "spribe_keno", category: "multiplayer" },
    { id: "trader", name: "Trader", provider: "spribe_trader", category: "multiplayer" },
    { id: "starline", name: "Starline", provider: "spribe_trader", category: "multiplayer" },
];

// Генерируем вспомогательные списки автоматически, чтобы не ломать импорты в валидаторах
export const CRASH_GAMES = GAMES_CONFIG.filter(g => g.category === 'crash').map(g => g.id);
export const TURBO_GAMES = GAMES_CONFIG.filter(g => g.category === 'turbo').map(g => g.id);
export const SLOT_GAMES = GAMES_CONFIG.filter(g => g.category === 'slots').map(g => g.id);
export const MULTIPLAYER_GAMES = GAMES_CONFIG.filter(g => g.category === 'multiplayer').map(g => g.id);

// Общий список валидных ID для валидаторов
export const VALID_GAMES = GAMES_CONFIG.map(g => g.id);