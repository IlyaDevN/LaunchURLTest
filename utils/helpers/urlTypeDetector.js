// utils/helpers/urlTypeDetector.js

export const detectUrlType = (urlString) => {
    if (!urlString || !urlString.trim()) return null;

    try {
        const url = new URL(urlString.trim());
        const host = url.host.toLowerCase();

        // 1. Round Details (История раундов)
        if (host.includes('games-info')) {
            return 'roundDetailsValidation';
        }

        // 2. Stage Launch URL
        if (host.includes('spribe.dev') || host.includes('spribe.io')) {
            return 'stageLaunchURLValidation';
        }

        // 3. Prod Launch URL
        // Добавляем новые паттерны для прода:
        // - spribelaunch.com (зеркало-редиректор)
        // - spribegamingXX.click (динамические зеркала, где XX - цифры)
        // - pilot-chicken.spribegaming.com (новый домен)
        if (
            host.includes('spribegaming.com') || 
            host.includes('spribelaunch.com') || 
            /spribegaming\d+\.click/.test(host) // Регулярка для spribegaming35.click и т.д.
        ) {
            return 'prodLaunchURLValidation';
        }

        return null;

    } catch (e) {
        return null;
    }
};