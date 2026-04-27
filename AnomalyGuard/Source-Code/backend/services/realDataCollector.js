const axios = require('axios');
const crypto = require('crypto');
const UAParser = require('ua-parser-js');
class RealDataCollector {
    constructor() {
    }
    async getRealGeolocation(ipAddress) {
        try {
            const response = await axios.get(`http://ip-api.com/json/${ipAddress}`, {
                timeout: 5000
            });
            if (response.data.status === 'success') {
                return {
                    country: response.data.countryCode,
                    country_name: response.data.country,
                    city: response.data.city,
                    latitude: response.data.lat,
                    longitude: response.data.lon,
                    timezone: response.data.timezone,
                    is_proxy: response.data.proxy || false,
                    isp: response.data.isp,
                    org: response.data.org
                };
            }
        } catch (error) {
            console.error('Primary geolocation lookup failed:', error.message);
        }
        try {
            const response = await axios.get(`https://ipinfo.io/${ipAddress}/json`, {
                timeout: 5000
            });
            const [lat, lon] = (response.data.loc || '').split(',');
            return {
                country: response.data.country,
                country_name: response.data.country,
                city: response.data.city,
                latitude: parseFloat(lat) || 0,
                longitude: parseFloat(lon) || 0,
                timezone: response.data.timezone,
                is_proxy: false,
                isp: response.data.org,
                org: response.data.org
            };
        } catch (error) {
            console.error('Fallback geolocation failed:', error.message);
        }
        return {
            country: 'US',
            country_name: 'United States',
            city: 'Unknown',
            latitude: 37.751,
            longitude: -97.822,
            timezone: 'America/Chicago',
            is_proxy: false,
            isp: 'Unknown',
            org: 'Unknown'
        };
    }
    async checkIPReputation(ipAddress) {
        let reputationScore = 100; // Start with clean score
        if (this.isKnownMaliciousIP(ipAddress)) {
            reputationScore -= 50;
        }
        if (this.isPrivateIP(ipAddress)) {
            reputationScore -= 10;
        }
        if (await this.isTorExitNode(ipAddress)) {
            reputationScore -= 30;
        }
        if (this.isCommonProxyIP(ipAddress)) {
            reputationScore -= 20;
        }
        return Math.max(0, Math.min(100, reputationScore));
    }
    isPrivateIP(ip) {
        const privateRanges = [
            /^10\./,
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
            /^192\.168\./,
            /^127\./,
            /^169\.254\./,
            /^::1$/,
            /^fc00:/,
            /^fe80:/
        ];
        return privateRanges.some(range => range.test(ip));
    }
    async isTorExitNode(ip) {
        try {
            const response = await axios.get('https://check.torproject.org/exit-addresses', {
                timeout: 5000
            });
            return response.data.includes(ip);
        } catch (error) {
            return false;
        }
    }
    isKnownMaliciousIP(ip) {
        const maliciousRanges = [
            '185.220.101.0/24',  // Known exit nodes
            '199.249.223.0/24',  // Known malicious ranges
            '107.189.0.0/16',    // Known suspicious range
            '154.53.0.0/16',     // Known suspicious range
            '172.67.0.0/16',     // Some cloud services often abused
        ];
        const ipToNumber = (ip) => {
            return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
        };
        const ipNum = ipToNumber(ip);
        return maliciousRanges.some(range => {
            const [network, prefix] = range.split('/');
            const networkNum = ipToNumber(network);
            const mask = (0xFFFFFFFF << (32 - parseInt(prefix))) >>> 0;
            return (ipNum & mask) === (networkNum & mask);
        });
    }
    isCommonProxyIP(ip) {
        const proxyRanges = [
            '8.8.8.0/24',      // Google DNS (sometimes used as proxy)
            '208.67.222.0/24',  // OpenDNS
            '1.1.1.0/24',       // Cloudflare DNS
        ];
        const ipToNumber = (ip) => {
            return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
        };
        const ipNum = ipToNumber(ip);
        return proxyRanges.some(range => {
            const [network, prefix] = range.split('/');
            const networkNum = ipToNumber(network);
            const mask = (0xFFFFFFFF << (32 - parseInt(prefix))) >>> 0;
            return (ipNum & mask) === (networkNum & mask);
        });
    }
    generateDeviceFingerprint(userAgent, ipAddress, acceptLanguage = '') {
        const parser = new UAParser(userAgent);
        const result = parser.getResult();
        const fingerprintData = {
            browser_family: result.browser.name,
            browser_version: result.browser.version,
            os_family: result.os.name,
            os_version: result.os.version,
            device_family: result.device.model || 'Unknown',
            device_type: result.device.type || 'desktop'
        };
        const fingerprintString = JSON.stringify(fingerprintData, Object.keys(fingerprintData).sort());
        const fingerprintHash = crypto.createHash('sha256')
            .update(fingerprintString)
            .digest('hex')
            .substring(0, 16);
        return {
            fingerprint: fingerprintHash,
            browser: result.browser.name,
            browser_version: result.browser.version,
            os: result.os.name,
            os_version: result.os.version,
            device_type: result.device.type || 'desktop',
            device_model: result.device.model || 'Unknown',
            is_mobile: result.device.type === 'mobile',
            is_tablet: result.device.type === 'tablet',
            is_pc: !result.device.type || result.device.type === 'desktop'
        };
    }
    calculateGeolocationAnomaly(currentLocation, knownLocations) {
        if (!knownLocations || knownLocations.length === 0) {
            return 0.0;
        }
        let minDistance = Infinity;
        for (const knownLoc of knownLocations) {
            if (knownLoc.latitude && knownLoc.longitude) {
                const distance = this.haversineDistance(
                    currentLocation.latitude, currentLocation.longitude,
                    knownLoc.latitude, knownLoc.longitude
                );
                minDistance = Math.min(minDistance, distance);
            }
        }
        if (minDistance < 100) return 0.0;      // < 100km
        if (minDistance < 500) return 0.3;      // 100-500km
        if (minDistance < 2000) return 0.6;     // 500-2000km
        return 1.0;                             // > 2000km
    }
    haversineDistance(lat1, lon1, lat2, lon2) {
        const toRad = (deg) => deg * (Math.PI / 180);
        const R = 6371; // Earth's radius in km
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    calculateTemporalAnomaly(currentTime, userHistory) {
        if (!userHistory || userHistory.length === 0) {
            return 0.0;
        }
        const currentHour = currentTime.getHours();
        const currentDay = currentTime.getDay();
        const hourCounts = new Array(24).fill(0);
        const dayCounts = new Array(7).fill(0);
        userHistory.forEach(login => {
            const loginTime = new Date(login.timestamp);
            hourCounts[loginTime.getHours()]++;
            dayCounts[loginTime.getDay()]++;
        });
        const totalLogins = userHistory.length;
        if (totalLogins === 0) return 0.0;
        const hourFrequency = hourCounts[currentHour] / totalLogins;
        const dayFrequency = dayCounts[currentDay] / totalLogins;
        const hourAnomaly = hourFrequency < 0.1 ? (1.0 - hourFrequency) : 0.0;
        const dayAnomaly = dayFrequency < 0.1 ? (1.0 - dayFrequency) : 0.0;
        return Math.max(hourAnomaly, dayAnomaly);
    }
    calculateVelocityAnomaly(currentLogin, previousLogin) {
        if (!previousLogin) return 0.0;
        const currentTime = new Date(currentLogin.timestamp);
        const prevTime = new Date(previousLogin.timestamp);
        const timeDiff = (currentTime - prevTime) / (1000 * 60 * 60); // hours
        if (timeDiff <= 0) return 0.0;
        const currentLoc = currentLogin.geoLocation || currentLogin.geo_location || {};
        const prevLoc = previousLogin.geoLocation || previousLogin.geo_location || {};
        if (!currentLoc.latitude || !currentLoc.longitude || 
            !prevLoc.latitude || !prevLoc.longitude) {
            return 0.0;
        }
        const distance = this.haversineDistance(
            currentLoc.latitude, currentLoc.longitude,
            prevLoc.latitude, prevLoc.longitude
        );
        const velocity = distance / timeDiff; // km/h
        if (velocity > 1000) return 1.0;    // > 1000 km/h (faster than commercial aircraft)
        if (velocity > 500) return 0.7;     // 500-1000 km/h
        if (velocity > 200) return 0.4;     // 200-500 km/h
        return 0.0;                          // < 200 km/h
    }
    async getRealLoginFeatures(userId, ipAddress, userAgent, acceptLanguage = '') {
        const geoLocation = await this.getRealGeolocation(ipAddress);
        const deviceInfo = this.generateDeviceFingerprint(userAgent, ipAddress, acceptLanguage);
        const ipReputation = await this.checkIPReputation(ipAddress);
        const now = new Date();
        return {
            user_id: userId,
            ip_address: ipAddress,
            geo_location: geoLocation,
            device_info: deviceInfo,
            ip_reputation: ipReputation,
            timestamp: now.toISOString(),
            hour_of_day: now.getHours(),
            day_of_week: now.getDay(),
            is_weekend: now.getDay() >= 5 ? 1 : 0,
            user_agent: userAgent
        };
    }
}
module.exports = RealDataCollector;
