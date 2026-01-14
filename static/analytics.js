// Fast, lightweight analytics - sends directly to local server
// No external API calls for instant loading

(function() {
    function getOS() {
        const ua = navigator.userAgent;
        if (/windows phone/i.test(ua)) return "Windows Phone";
        if (/windows/i.test(ua)) return "Windows";
        if (/android/i.test(ua)) return "Android";
        if (/linux/i.test(ua) && !/cros/i.test(ua)) return "Linux";
        if (/cros/i.test(ua)) return "Chrome OS";
        if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
        if (/mac/i.test(ua)) return "MacOS";
        return "Unknown";
    }

    function getBrowser() {
        const ua = navigator.userAgent;
        if (/edg\//i.test(ua)) return "Edge";
        if (/opr\//i.test(ua) || /opera/i.test(ua)) return "Opera";
        if (/firefox|fxios/i.test(ua)) return "Firefox";
        if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua) && !/opr\//i.test(ua)) return "Chrome";
        if (/safari/i.test(ua) && !/chrome|crios|edg|opr/i.test(ua)) return "Safari";
        return "Unknown";
    }

    function sendAnalytics() {
        // Get clean page path
        const pagePath = window.location.pathname || '/';
        
        // Get user info from localStorage
        const clientId = localStorage.getItem('clientId') || null;
        const username = localStorage.getItem('username') || null;
        const accessCookieId = localStorage.getItem('accessCookieId') || null;
        
        const payload = {
            os: getOS(),
            browser: getBrowser(),
            page: pagePath,
            referrer: document.referrer || null,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            language: navigator.language,
            userId: clientId,
            clientId: clientId,
            username: username,
            accessCookieId: accessCookieId
        };
        
        // Use sendBeacon for non-blocking send (instant, doesn't slow page)
        const data = JSON.stringify(payload);
        if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/collect', data);
        } else {
            fetch('/api/collect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: data,
                keepalive: true
            }).catch(() => {});
        }
    }

    // Send immediately for fastest capture
    sendAnalytics();
})();
