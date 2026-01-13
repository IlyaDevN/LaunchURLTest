// utils/helpers/urlTypeDetector.js

export const detectUrlType = (urlString) => {
    if (!urlString || !urlString.trim()) return null;

    try {
        const url = new URL(urlString.trim());
        const host = url.host.toLowerCase();

        // 1. Round Details
        if (host.includes('games-info')) {
            return 'roundDetailsValidation';
        }

        // 2. SG Digital (LnW) - Reverse Integration
        // Добавлены: nyxmalta.com, sgaws.net (LatAm/US)
        if (
            host.includes('nyxop.net') || 
            host.includes('nyxmalta.com') || 
            host.includes('sgaws.net')
        ) {
            return 'sgLaunchURLValidation';
        }

        // 3. Stage Launch URL
        if (host.includes('spribe.dev') || host.includes('spribe.io')) {
            return 'stageLaunchURLValidation';
        }

        // 4. Prod Launch URL
        if (
            host.includes('spribegaming.com') || 
            host.includes('spribelaunch.com') || 
            /spribegaming\d+\.click/.test(host)
        ) {
            return 'prodLaunchURLValidation';
        }

        return null;

    } catch (e) {
        return null;
    }
};