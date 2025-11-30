// utils/helpers/urlTypeDetector.js

export const detectUrlType = (urlString) => {
    if (!urlString || !urlString.trim()) return null;

    try {
        const url = new URL(urlString.trim());
        const host = url.host.toLowerCase();

        // 1. Round Details (История раундов)
        // Ключевой признак: 'games-info' в домене.
        // Примеры: games-info.spribegaming.com, games-info.staging.spribe.dev
        if (host.includes('games-info')) {
            return 'roundDetailsValidation';
        }

        // 2. Stage Launch URL
        // Ключевой признак: домены разработки .dev или .io (кроме games-info)
        // Примеры: aviator.staging.spribe.dev, dev-test.spribe.io, slots.staging.spribe.dev
        if (host.includes('spribe.dev') || host.includes('spribe.io')) {
            return 'stageLaunchURLValidation';
        }

        // 3. Prod Launch URL
        // Ключевой признак: домен spribegaming.com (и не games-info)
        // Примеры: launch.spribegaming.com, aviator-next.spribegaming.com, turbo.spribegaming.com
        if (host.includes('spribegaming.com')) {
            return 'prodLaunchURLValidation';
        }

        // Если домен не распознан
        return null;

    } catch (e) {
        // Если строка вообще не является валидным URL
        return null;
    }
};