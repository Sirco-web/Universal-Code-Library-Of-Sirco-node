const CACHE_NAME = 'site-offline-cache-v1';
const SOUNDBOARD_CACHE_NAME = 'soundboard-v1';
let downloaderEnabled = false;
// Store last-known shortcut config (sent from clients)
let shortcutConfig = null;

// New: store current analytics-sw.js hash so we can detect updates
let currentAnalyticsSWHash = null;

// New: RAW_BASE used by the pages when caching from raw.githubusercontent
const RAW_BASE = 'https://raw.githubusercontent.com/Firewall-Freedom/file-s/refs/heads/master/';

// New helper: try matching the cache by several possible keys (request, RAW_BASE mapping, suffix)
async function cacheMatchAny(cache, request) {
    // direct match
    let m = await cache.match(request);
    if (m) return m;

    try {
        const reqUrl = new URL(request.url);
        const rel = reqUrl.pathname.replace(/^\/+/, ''); // e.g. CODE/games/...
        const rawUrl = RAW_BASE + rel;
        m = await cache.match(rawUrl);
        if (m) return m;

        // fallback: try to find any cached entry that ends with the same path (suffix match)
        const keys = await cache.keys();
        for (const k of keys) {
            try {
                if (k.url.endsWith('/' + rel) || k.url.endsWith(rel)) {
                    const r = await cache.match(k);
                    if (r) return r;
                }
            } catch (_) { /* ignore key parse errors */ }
        }
    } catch (e) {
        // ignore parsing errors
    }
    return null;
}

async function computeSHA256Hex(arrayBuffer) {
    try {
        const hashBuf = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuf));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        return null;
    }
}

async function fetchTextNoCache(url) {
    try {
        const resp = await fetch(url, { cache: 'no-store' });
        if (!resp || !resp.ok) return null;
        return await resp.text();
    } catch (e) {
        return null;
    }
}

async function fetchArrayBufferNoCache(url) {
    try {
        const resp = await fetch(url, { cache: 'no-store' });
        if (!resp || !resp.ok) return null;
        return await resp.arrayBuffer();
    } catch (e) {
        return null;
    }
}

async function computeCurrentAnalyticsHash() {
    try {
        // Try to fetch the currently-registered analytics-sw script (best-effort)
        const scriptUrl = '/analytics-sw.js';
        const buf = await fetchArrayBufferNoCache(scriptUrl);
        if (!buf) return null;
        const h = await computeSHA256Hex(buf);
        return h;
    } catch (e) {
        return null;
    }
}

// Listen for messages from the page to control downloader
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SET_DOWNLOADER') {
        downloaderEnabled = !!event.data.enabled;
    }
    if (event.data && event.data.type === 'SET_SHORTCUT_CONFIG' && event.data.config) {
        try { shortcutConfig = event.data.config; } catch (e) { shortcutConfig = null; }
    }
    if (event.data && event.data.type === 'REMOVE_FILE' && event.data.url) {
        caches.open(CACHE_NAME).then(cache => cache.delete(event.data.url));
    }
    if (event.data && event.data.type === 'REMOVE_ALL') {
        caches.delete(CACHE_NAME);
    }
    // Soundboard: cache all sounds for offline use
    if (event.data && event.data.type === 'CACHE_SOUNDBOARD' && event.data.files) {
        (async () => {
            try {
                const cache = await caches.open(SOUNDBOARD_CACHE_NAME);
                const files = event.data.files;
                const basePath = event.data.basePath || '/CODE/sound/';
                for (const file of files) {
                    try {
                        const url = basePath + file;
                        const resp = await fetch(url);
                        if (resp && resp.ok) {
                            await cache.put(url, resp);
                        }
                    } catch (e) { /* ignore individual file errors */ }
                }
                // Notify clients that caching is complete
                self.clients.matchAll().then(clients => {
                    for (const c of clients) {
                        c.postMessage({ type: 'SOUNDBOARD_CACHED', success: true });
                    }
                });
            } catch (e) {
                self.clients.matchAll().then(clients => {
                    for (const c of clients) {
                        c.postMessage({ type: 'SOUNDBOARD_CACHED', success: false, error: e.message });
                    }
                });
            }
        })();
    }
    if (event.data && event.data.type === 'SKIP_WAITING') {
        try { self.skipWaiting(); } catch (e) { /* fail silently */ }
    }

    // New: allow clients to request a registration of a new service worker URL
    if (event.data && event.data.type === 'REQUEST_CLIENT_REGISTER_SW' && event.data.url) {
        // Ask all clients to register the provided URL (clients must run the registration on their side)
        try {
            const url = event.data.url;
            self.clients.matchAll().then(clients => {
                for (const c of clients) {
                    c.postMessage({ type: 'DO_REGISTER_SW', url });
                }
            });
        } catch (e) { /* fail silently */ }
    }

    // Broadcast shortcut action to all clients when triggered by one page.
    // Only act if the trigger includes a recent timestamp (to avoid stale triggers on navigation),
    // or if the sender explicitly sets force=true.
    if (event.data && event.data.type === 'SHORTCUT_TRIGGERED') {
        try {
            const now = Date.now();
            const ts = typeof event.data.timestamp === 'number' ? event.data.timestamp : 0;
            const force = !!event.data.force;
            // Accept triggers only if forced or not older than 3000ms
            if (!force && (ts === 0 || Math.abs(now - ts) > 3000)) {
                // ignore stale/untimestamped triggers
                return;
            }

            (async () => {
                // Determine action and customURL as before
                const action = (event.data.action !== undefined && event.data.action !== null)
                    ? event.data.action
                    : (shortcutConfig && shortcutConfig.action) || 'none';
                const customURL = event.data.customURL || (shortcutConfig && shortcutConfig.customURL) || '';

                // Perform version checks: try /ver then /CODE/ver
                let verText = null;
                let verNetworkOk = false;
                verText = await fetchTextNoCache('/ver');
                if (verText !== null) verNetworkOk = true;
                else {
                    verText = await fetchTextNoCache('/CODE/ver');
                    if (verText !== null) verNetworkOk = true;
                }
                if (verText) verText = verText.trim();

                // Ensure we have a baseline hash for the currently-installed analytics-sw
                if (!currentAnalyticsSWHash) {
                    currentAnalyticsSWHash = await computeCurrentAnalyticsHash();
                }

                // Fetch latest analytics-sw.js from network (cache-busted) and compute hash
                let newSwAvailable = false;
                let latestSwUrl = '/analytics-sw.js';
                let swNetworkOk = false;
                try {
                    const url = '/analytics-sw.js?_=' + Date.now();
                    const buf = await fetchArrayBufferNoCache(url);
                    if (buf) {
                        swNetworkOk = true;
                        const latestHash = await computeSHA256Hex(buf);
                        if (latestHash && latestHash !== currentAnalyticsSWHash) {
                            newSwAvailable = true;
                            latestSwUrl = '/analytics-sw.js?_=' + Date.now();
                        }
                    }
                } catch (e) {
                    // ignore
                }

                // Broadcast to all clients a VERSION_MENU message with gathered info
                self.clients.matchAll().then(clients => {
                    for (const c of clients) {
                        c.postMessage({
                            type: 'VERSION_MENU',
                            action,
                            customURL,
                            currentVersion: verText || 'unknown',
                            verNetworkOk,
                            swNetworkOk,
                            newAnalyticsSW: {
                                available: newSwAvailable,
                                url: newSwAvailable ? latestSwUrl : null
                            }
                        });
                    }
                });

                // Also send legacy PERFORM_SHORTCUT_ACTION for compatibility
                self.clients.matchAll().then(clients => {
                    for (const c of clients) {
                        c.postMessage({ type: 'PERFORM_SHORTCUT_ACTION', action, customURL });
                    }
                });

            })();

        } catch (e) {
            // fail silently
        }
    }
});

self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        // Compute current analytics-sw hash on activation (best-effort)
        try {
            currentAnalyticsSWHash = await computeCurrentAnalyticsHash();
        } catch (e) { /* ignore */ }
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    // Soundboard audio files: serve from soundboard cache if available
    if (event.request.url.includes('/CODE/sound/') && 
        (event.request.url.endsWith('.mp3') || event.request.url.endsWith('.wav') || event.request.url.endsWith('.ogg'))) {
        event.respondWith(
            (async () => {
                const cache = await caches.open(SOUNDBOARD_CACHE_NAME);
                
                // Try direct match first
                let cached = await cache.match(event.request);
                if (cached) return cached;
                
                // Try matching by pathname (handles protocol/domain differences)
                try {
                    const reqUrl = new URL(event.request.url);
                    const pathname = reqUrl.pathname; // e.g. /CODE/sound/bruh.mp3
                    
                    // Try matching with just the pathname as key
                    cached = await cache.match(pathname);
                    if (cached) return cached;
                    
                    // Try matching all cache keys by pathname
                    const keys = await cache.keys();
                    for (const k of keys) {
                        try {
                            // k might be a string or Request
                            const kUrl = typeof k === 'string' ? k : k.url;
                            if (kUrl === pathname || kUrl.endsWith(pathname) || new URL(kUrl).pathname === pathname) {
                                const r = await cache.match(k);
                                if (r) return r;
                            }
                        } catch (_) {}
                    }
                } catch (_) {}
                
                // Not in cache, try network (will fail if offline)
                try {
                    const resp = await fetch(event.request);
                    if (resp && resp.ok) {
                        // Cache it for future offline use
                        const reqUrl = new URL(event.request.url);
                        cache.put(reqUrl.pathname, resp.clone());
                    }
                    return resp;
                } catch (e) {
                    console.error('Offline - sound not cached:', event.request.url);
                    return new Response('Offline - sound not cached', { status: 503 });
                }
            })()
        );
        return;
    }

    // Special handling for games list JSON
    if (event.request.url.endsWith('/CODE/games/games-list.json')) {
        event.respondWith(
            (async () => {
                // Try network first
                try {
                    const resp = await fetch(event.request);
                    // Cache if downloader enabled
                    if (downloaderEnabled && resp && resp.status === 200) {
                        const cache = await caches.open(CACHE_NAME);
                        cache.put(event.request, resp.clone());
                    }
                    return resp;
                } catch (e) {
                    // Fallback to cache (try site key, then RAW_BASE mapping)
                    const cache = await caches.open(CACHE_NAME);
                    const cached = await cacheMatchAny(cache, event.request);
                    if (cached) return cached;
                    return new Response('[]', { headers: { 'Content-Type': 'application/json' } });
                }
            })()
        );
        return;
    }

    // For HTML pages, always inject analytics.js
    if (event.request.destination === 'document') {
        event.respondWith(
            fetch(event.request)
                .then(async response => {
                    const ct = response.headers.get('content-type') || '';
                    let respToReturn = response;
                    if (ct.includes('text/html')) {
                        let text = await response.text();
                        text = text.replace(
                            /<body[^>]*>/i,
                            `$&<script src="/analytics.js?v=${Date.now()}"></script>`
                        );
                        respToReturn = new Response(text, {
                            headers: new Headers(response.headers)
                        });
                    }
                    // Cache for offline
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(event.request, respToReturn.clone());
                    return respToReturn;
                })
                .catch(async () => {
                    const cache = await caches.open(CACHE_NAME);
                    const cached = await cacheMatchAny(cache, event.request);
                    if (cached) return cached;
                    return new Response('Offline', {status: 503});
                })
        );
    } else if (downloaderEnabled) {
        // For other resources, try network then cache, and cache if successful
        event.respondWith(
            fetch(event.request)
                .then(async response => {
                    if (response && response.status === 200) {
                        const cache = await caches.open(CACHE_NAME);
                        cache.put(event.request, response.clone());
                    }
                    return response;
                })
                .catch(async () => {
                    const cache = await caches.open(CACHE_NAME);
                    const cached = await cacheMatchAny(cache, event.request);
                    if (cached) return cached;
                    return Response.error();
                })
        );
    } else {
        // If downloader is not enabled, just try network, fallback to cache if offline
        event.respondWith(
            fetch(event.request).catch(async () => {
                const cache = await caches.open(CACHE_NAME);
                const cached = await cacheMatchAny(cache, event.request);
                if (cached) return cached;
                return Response.error();
            })
        );
    }
});
