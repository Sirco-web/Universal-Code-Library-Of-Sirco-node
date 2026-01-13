/**
 * Code Universe - Dynamic Node.js Server
 * Combines static site hosting with dynamic owner control
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const https = require('https');
const fetch = require('node-fetch');

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Trust proxy for accurate IP detection
app.set('trust proxy', true);

// ============== CONFIGURATION ==============
const DATA_DIR = path.join(__dirname, 'server-data');
const STATIC_ROOT = path.join(__dirname, 'static');

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Server Settings (can be changed via owner panel)
let serverSettings = loadSettings();

function loadSettings() {
    const settingsPath = path.join(DATA_DIR, 'server-settings.json');
    const defaults = {
        ownerPassword: process.env.OWNER_PASSWORD || '2629',
        tempActivationPin: process.env.TEMP_ACTIVATION_PIN || '1234',
        permActivationPin: process.env.PERM_ACTIVATION_PIN || '5678',
        dynamicFolderName: process.env.DYNAMIC_FOLDER_NAME || 'CODE',
        adminApiPassword: process.env.ADMIN_API_PASSWORD || 'letmein',
        aiApiKeys: (process.env.AI_API_KEYS || '').split(',').filter(Boolean),
        sessionSecret: process.env.SESSION_SECRET || 'change-me-in-production'
    };
    
    if (fs.existsSync(settingsPath)) {
        try {
            const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            return { ...defaults, ...saved };
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    }
    return defaults;
}

function saveSettings() {
    const settingsPath = path.join(DATA_DIR, 'server-settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(serverSettings, null, 2));
}

// ============== LOGGING SYSTEM ==============
const EVENT_LOG_FILE = path.join(DATA_DIR, 'event-log.json');
const WARNING_LOG_FILE = path.join(DATA_DIR, 'warning-log.json');
const NOT_FOUND_LOG_FILE = path.join(DATA_DIR, 'not-found-log.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const BANNED_IPS_FILE = path.join(DATA_DIR, 'banned-ips.json');
const BANNED_USERS_FILE = path.join(DATA_DIR, 'banned-users.json');
const ACCESS_COOKIES_FILE = path.join(DATA_DIR, 'access-cookies.json');
const ANALYTICS_FILE = path.join(DATA_DIR, 'analytics.json');

// In-memory 404 cache for fast access
let notFoundCache = [];
function loadNotFoundCache() {
    if (fs.existsSync(NOT_FOUND_LOG_FILE)) {
        try { notFoundCache = JSON.parse(fs.readFileSync(NOT_FOUND_LOG_FILE, 'utf8')); } catch {}
    }
}
loadNotFoundCache();

function log404(path, req) {
    const entry = {
        path,
        timestamp: new Date().toISOString(),
        ip: getClientIP(req),
        location: getLocationFromIP(getClientIP(req)),
        userAgent: req.headers['user-agent'] || 'Unknown',
        referer: req.headers['referer'] || req.headers['referrer'] || null
    };
    notFoundCache.push(entry);
    // Keep last 1000 entries
    if (notFoundCache.length > 1000) {
        notFoundCache = notFoundCache.slice(-1000);
    }
    // Write async
    fs.writeFile(NOT_FOUND_LOG_FILE, JSON.stringify(notFoundCache, null, 2), () => {});
}

// Simple GeoIP function (for basic location detection)
function getLocationFromIP(ip) {
    try {
        const geoip = require('geoip-lite');
        const geo = geoip.lookup(ip);
        if (geo) {
            return {
                country: geo.country,
                region: geo.region,
                city: geo.city,
                timezone: geo.timezone
            };
        }
    } catch (e) {}
    return { country: 'Unknown', region: 'Unknown', city: 'Unknown', timezone: 'Unknown' };
}

function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.headers['x-real-ip'] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           'unknown';
}

function logEvent(type, data, req) {
    const entry = {
        timestamp: new Date().toISOString(),
        type,
        data,
        ip: req ? getClientIP(req) : 'server',
        location: req ? getLocationFromIP(getClientIP(req)) : null,
        userAgent: req ? req.headers['user-agent'] : null
    };
    
    let events = [];
    if (fs.existsSync(EVENT_LOG_FILE)) {
        try { events = JSON.parse(fs.readFileSync(EVENT_LOG_FILE, 'utf8')); } catch {}
    }
    events.unshift(entry);
    // Keep only last 1000 events
    events = events.slice(0, 1000);
    fs.writeFileSync(EVENT_LOG_FILE, JSON.stringify(events, null, 2));
}

function logWarning(type, data, req) {
    const entry = {
        timestamp: new Date().toISOString(),
        type,
        data,
        ip: req ? getClientIP(req) : 'server',
        location: req ? getLocationFromIP(getClientIP(req)) : null,
        userAgent: req ? req.headers['user-agent'] : null,
        severity: data.severity || 'warning'
    };
    
    let warnings = [];
    if (fs.existsSync(WARNING_LOG_FILE)) {
        try { warnings = JSON.parse(fs.readFileSync(WARNING_LOG_FILE, 'utf8')); } catch {}
    }
    warnings.unshift(entry);
    warnings = warnings.slice(0, 500);
    fs.writeFileSync(WARNING_LOG_FILE, JSON.stringify(warnings, null, 2));
}

// ============== USER SYSTEM ==============
function loadUsers() {
    if (fs.existsSync(USERS_FILE)) {
        try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } catch {}
    }
    return {};
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function loadBannedIPs() {
    if (fs.existsSync(BANNED_IPS_FILE)) {
        try { return JSON.parse(fs.readFileSync(BANNED_IPS_FILE, 'utf8')); } catch {}
    }
    return [];
}

function saveBannedIPs(ips) {
    fs.writeFileSync(BANNED_IPS_FILE, JSON.stringify(ips, null, 2));
}

function loadBannedUsers() {
    if (fs.existsSync(BANNED_USERS_FILE)) {
        try { return JSON.parse(fs.readFileSync(BANNED_USERS_FILE, 'utf8')); } catch {}
    }
    return [];
}

function saveBannedUsers(users) {
    fs.writeFileSync(BANNED_USERS_FILE, JSON.stringify(users, null, 2));
}

function loadAccessCookies() {
    if (fs.existsSync(ACCESS_COOKIES_FILE)) {
        try { return JSON.parse(fs.readFileSync(ACCESS_COOKIES_FILE, 'utf8')); } catch {}
    }
    return {};
}

function saveAccessCookies(cookies) {
    fs.writeFileSync(ACCESS_COOKIES_FILE, JSON.stringify(cookies, null, 2));
}

// ============== MIDDLEWARE ==============

// FIRST: Access cookie check - fastest rejection for unauthorized users
app.use((req, res, next) => {
    const path = req.path;
    
    // These are normal public pages - no access cookie required
    const PUBLIC_PAGES = [
        '/', '/index.html', '/404.html', '/error.html',
        '/style.css', '/main.js', '/analytics.js', '/sw.js',
        '/banner.html', '/version.txt', '/CNAME', '/README.md', '/LICENSE'
    ];
    
    // These paths are public (no cookie needed)
    const PUBLIC_PREFIXES = [
        '/owner',      // Owner panel
        '/welcome',    // Welcome page (where users get the cookie)
        '/agree',      // Agreement page
        '/activate',   // Activation page
        '/api/'        // API endpoints
    ];
    
    // Check if it's a public page
    if (PUBLIC_PAGES.includes(path)) {
        return next();
    }
    
    // Check if it starts with a public prefix
    if (PUBLIC_PREFIXES.some(prefix => path.startsWith(prefix))) {
        return next();
    }
    
    // Allow static assets (css, images, fonts)
    if (path.endsWith('.css') || 
        path.endsWith('.ico') ||
        path.endsWith('.png') ||
        path.endsWith('.jpg') ||
        path.endsWith('.svg') ||
        path.endsWith('.woff') ||
        path.endsWith('.woff2')) {
        return next();
    }
    
    // Everything else (CODE, ai, Pro, games, etc.) requires access cookie
    const accessCookie = req.cookies?.access;
    
    if (accessCookie !== '1') {
        // No valid access cookie - redirect to 404 immediately
        return res.redirect('/404.html');
    }
    
    next();
});

// Detect Windows/Mac access and log warnings
app.use((req, res, next) => {
    const ua = req.headers['user-agent'] || '';
    const isWindows = ua.includes('Windows');
    const isMac = ua.includes('Macintosh');
    
    if (isWindows || isMac) {
        logWarning('desktop_access_attempt', {
            os: isWindows ? 'Windows' : 'Mac',
            path: req.path,
            severity: 'high',
            message: `${isWindows ? 'Windows' : 'Mac'} user attempted to access: ${req.path}`
        }, req);
    }
    next();
});

// Public paths that banned users CAN access
const PUBLIC_PATHS = ['/', '/index.html', '/404.html', '/error.html', '/owner', '/owner/', '/owner/index.html', '/api/owner/authenticate'];

// IP & User Ban middleware - blocks all pages except public ones
app.use((req, res, next) => {
    const ip = getClientIP(req);
    const path = req.path;
    
    // Allow public paths
    if (PUBLIC_PATHS.some(p => path === p || path.startsWith('/api/owner/'))) {
        return next();
    }
    
    // Check IP ban
    const bannedIPs = loadBannedIPs();
    if (bannedIPs.some(entry => (typeof entry === 'string' ? entry : entry.ip) === ip)) {
        logWarning('banned_ip_blocked', { ip, path }, req);
        return res.status(403).send(`
            <!DOCTYPE html>
            <html><head><title>Banned</title></head>
            <body style="background:#1a1a2e;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0">
                <div style="text-align:center;max-width:500px;padding:40px">
                    <h1 style="color:#ff6b6b;font-size:3em">🚫</h1>
                    <h2>Access Denied</h2>
                    <p style="color:#888">Your IP address has been banned from this service.</p>
                </div>
            </body></html>
        `);
    }
    
    // Check user ban via cookies
    const accessCookieId = req.cookies?.accessCookieId;
    if (accessCookieId) {
        const bannedUsers = loadBannedUsers();
        const bannedUser = bannedUsers.find(u => u.accessCookieId === accessCookieId);
        if (bannedUser) {
            logWarning('banned_user_blocked', { accessCookieId, path }, req);
            return res.status(403).send(`
                <!DOCTYPE html>
                <html><head><title>Banned</title></head>
                <body style="background:#1a1a2e;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0">
                    <div style="text-align:center;max-width:500px;padding:40px">
                        <h1 style="color:#ff6b6b;font-size:3em">🚫</h1>
                        <h2>Account Banned</h2>
                        <p style="color:#888">Your account has been banned from this service.</p>
                        <p style="color:#ff6b6b">Reason: ${bannedUser.reason || 'No reason provided'}</p>
                    </div>
                </body></html>
            `);
        }
    }
    
    next();
});

// Note: Access cookie check is now the FIRST middleware above for faster rejection

// Log all requests
app.use((req, res, next) => {
    logEvent('request', {
        method: req.method,
        path: req.path,
        query: req.query
    }, req);
    next();
});

// ============== OWNER PANEL API ==============

// Owner authentication middleware
function ownerAuth(req, res, next) {
    const password = req.body.ownerPassword || req.query.ownerPassword || req.headers['x-owner-password'];
    
    if (password !== serverSettings.ownerPassword) {
        logWarning('owner_auth_failed', { attemptedPassword: password ? '[redacted]' : 'none' }, req);
        return res.status(403).json({ error: 'Invalid owner password' });
    }
    next();
}

// Get owner dashboard HTML (password protected)
app.post('/api/owner/authenticate', (req, res) => {
    const { password } = req.body;
    
    if (password !== serverSettings.ownerPassword) {
        logWarning('owner_login_failed', {}, req);
        return res.status(403).json({ error: 'Invalid password', success: false });
    }
    
    logEvent('owner_login', { success: true }, req);
    
    // Generate a session token
    const token = uuidv4();
    
    // Store token in memory/file (expires in 24 hours)
    let sessions = {};
    const sessionsPath = path.join(DATA_DIR, 'owner-sessions.json');
    if (fs.existsSync(sessionsPath)) {
        try { sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf8')); } catch {}
    }
    
    // Clean expired sessions
    const now = Date.now();
    Object.keys(sessions).forEach(t => {
        if (sessions[t].expires < now) delete sessions[t];
    });
    
    sessions[token] = {
        created: now,
        expires: now + 24 * 60 * 60 * 1000, // 24 hours
        ip: getClientIP(req)
    };
    
    fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2));
    
    res.json({ success: true, token });
});

// Verify owner session token
function verifyOwnerToken(req, res, next) {
    const token = req.headers['x-owner-token'] || req.query.token;
    
    if (!token) {
        return res.status(401).json({ error: 'No session token provided' });
    }
    
    const sessionsPath = path.join(DATA_DIR, 'owner-sessions.json');
    let sessions = {};
    if (fs.existsSync(sessionsPath)) {
        try { sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf8')); } catch {}
    }
    
    const session = sessions[token];
    if (!session || session.expires < Date.now()) {
        return res.status(401).json({ error: 'Session expired or invalid' });
    }
    
    next();
}

// Get owner dashboard (returns HTML only if authenticated)
app.get('/api/owner/dashboard', verifyOwnerToken, (req, res) => {
    // Send the full dashboard HTML with all APIs
    res.sendFile(path.join(__dirname, 'owner', 'dashboard-content.html'));
});

// Get current settings
app.get('/api/owner/settings', verifyOwnerToken, (req, res) => {
    res.json({
        tempActivationPin: serverSettings.tempActivationPin,
        permActivationPin: serverSettings.permActivationPin,
        dynamicFolderName: serverSettings.dynamicFolderName,
        adminApiPassword: serverSettings.adminApiPassword,
        ownerPassword: '********' // Never send actual password
    });
});

// Update settings
app.post('/api/owner/settings', verifyOwnerToken, (req, res) => {
    const { tempActivationPin, permActivationPin, dynamicFolderName, adminApiPassword, ownerPassword } = req.body;
    
    const oldFolderName = serverSettings.dynamicFolderName;
    
    if (tempActivationPin) serverSettings.tempActivationPin = tempActivationPin;
    if (permActivationPin) serverSettings.permActivationPin = permActivationPin;
    if (dynamicFolderName && dynamicFolderName !== oldFolderName) {
        serverSettings.dynamicFolderName = dynamicFolderName;
        logEvent('folder_rename', { from: oldFolderName, to: dynamicFolderName }, req);
    }
    if (adminApiPassword) serverSettings.adminApiPassword = adminApiPassword;
    if (ownerPassword && ownerPassword !== '********') serverSettings.ownerPassword = ownerPassword;
    
    saveSettings();
    
    res.json({ success: true, message: 'Settings updated' });
});

// Get event log
app.get('/api/owner/events', verifyOwnerToken, (req, res) => {
    let events = [];
    if (fs.existsSync(EVENT_LOG_FILE)) {
        try { events = JSON.parse(fs.readFileSync(EVENT_LOG_FILE, 'utf8')); } catch {}
    }
    res.json(events);
});

// Get warning log
app.get('/api/owner/warnings', verifyOwnerToken, (req, res) => {
    let warnings = [];
    if (fs.existsSync(WARNING_LOG_FILE)) {
        try { warnings = JSON.parse(fs.readFileSync(WARNING_LOG_FILE, 'utf8')); } catch {}
    }
    res.json(warnings);
});

// Get 404 log
app.get('/api/owner/404s', verifyOwnerToken, (req, res) => {
    // Return from cache (most recent first)
    res.json(notFoundCache.slice().reverse());
});

// Clear 404 log
app.post('/api/owner/404s/clear', verifyOwnerToken, (req, res) => {
    notFoundCache = [];
    fs.writeFile(NOT_FOUND_LOG_FILE, '[]', () => {});
    res.json({ success: true });
});

// Get all users
app.get('/api/owner/users', verifyOwnerToken, (req, res) => {
    const users = loadUsers();
    res.json(Object.values(users));
});

// Ban user
app.post('/api/owner/ban-user', verifyOwnerToken, (req, res) => {
    const { clientId, username, reason } = req.body;
    
    let bannedUsers = loadBannedUsers();
    const entry = {
        clientId,
        username,
        reason,
        bannedAt: new Date().toISOString()
    };
    
    if (!bannedUsers.find(u => u.clientId === clientId)) {
        bannedUsers.push(entry);
        saveBannedUsers(bannedUsers);
    }
    
    logEvent('user_banned', entry, req);
    res.json({ success: true });
});

// Unban user
app.post('/api/owner/unban-user', verifyOwnerToken, (req, res) => {
    const { clientId } = req.body;
    
    let bannedUsers = loadBannedUsers();
    bannedUsers = bannedUsers.filter(u => u.clientId !== clientId);
    saveBannedUsers(bannedUsers);
    
    logEvent('user_unbanned', { clientId }, req);
    res.json({ success: true });
});

// Ban IP
app.post('/api/owner/ban-ip', verifyOwnerToken, (req, res) => {
    const { ip, reason } = req.body;
    
    let bannedIPs = loadBannedIPs();
    if (!bannedIPs.includes(ip)) {
        bannedIPs.push(ip);
        saveBannedIPs(bannedIPs);
    }
    
    logEvent('ip_banned', { ip, reason }, req);
    res.json({ success: true });
});

// Unban IP
app.post('/api/owner/unban-ip', verifyOwnerToken, (req, res) => {
    const { ip } = req.body;
    
    let bannedIPs = loadBannedIPs();
    bannedIPs = bannedIPs.filter(i => i !== ip);
    saveBannedIPs(bannedIPs);
    
    logEvent('ip_unbanned', { ip }, req);
    res.json({ success: true });
});

// Get banned IPs
app.get('/api/owner/banned-ips', verifyOwnerToken, (req, res) => {
    res.json(loadBannedIPs());
});

// Get banned users
app.get('/api/owner/banned-users', verifyOwnerToken, (req, res) => {
    res.json(loadBannedUsers());
});

// Revoke access cookie
app.post('/api/owner/revoke-access', verifyOwnerToken, (req, res) => {
    const { clientId } = req.body;
    
    let accessCookies = loadAccessCookies();
    if (accessCookies[clientId]) {
        accessCookies[clientId].revoked = true;
        accessCookies[clientId].revokedAt = new Date().toISOString();
        saveAccessCookies(accessCookies);
    }
    
    logEvent('access_revoked', { clientId }, req);
    res.json({ success: true });
});

// Force refresh for a client
app.post('/api/owner/force-refresh', verifyOwnerToken, (req, res) => {
    const { clientId } = req.body;
    
    let accessCookies = loadAccessCookies();
    if (accessCookies[clientId]) {
        accessCookies[clientId].forceRefresh = true;
        saveAccessCookies(accessCookies);
    }
    
    logEvent('force_refresh', { clientId }, req);
    res.json({ success: true });
});

// ============== ACTIVATION API ==============

// Verify activation pin
app.post('/api/verify-pin', (req, res) => {
    const { pin } = req.body;
    
    if (pin === serverSettings.tempActivationPin) {
        logEvent('pin_verified', { type: 'temp' }, req);
        return res.json({ valid: true, type: 'temp', days: 10 });
    }
    
    if (pin === serverSettings.permActivationPin) {
        logEvent('pin_verified', { type: 'perm' }, req);
        return res.json({ valid: true, type: 'perm', days: 36500 }); // ~100 years
    }
    
    logWarning('invalid_pin_attempt', { pin: '[redacted]' }, req);
    return res.json({ valid: false });
});

// Generate client ID and register user
app.post('/api/register-user', (req, res) => {
    const { username, accessCookieId } = req.body;
    
    if (!username || username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: 'Username must be 3-20 characters' });
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and hyphens' });
    }
    
    const users = loadUsers();
    
    // Check if username exists
    const existingUser = Object.values(users).find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
    }
    
    const clientId = uuidv4();
    const ip = getClientIP(req);
    
    users[clientId] = {
        clientId,
        username,
        accessCookieId,
        createdAt: new Date().toISOString(),
        creationIP: ip,
        lastIP: ip,
        lastSeen: new Date().toISOString(),
        userAgent: req.headers['user-agent']
    };
    
    saveUsers(users);
    
    // Track access cookie
    let accessCookies = loadAccessCookies();
    accessCookies[accessCookieId] = {
        clientId,
        username,
        createdAt: new Date().toISOString(),
        lastUsed: new Date().toISOString()
    };
    saveAccessCookies(accessCookies);
    
    logEvent('user_registered', { clientId, username }, req);
    
    res.json({ success: true, clientId, username });
});

// Check if client needs to do anything (banned, refresh, etc.)
app.post('/api/check-status', (req, res) => {
    const { clientId, accessCookieId } = req.body;
    
    // Check if user is banned
    const bannedUsers = loadBannedUsers();
    const isBanned = bannedUsers.find(u => u.clientId === clientId);
    
    if (isBanned) {
        return res.json({ 
            status: 'banned', 
            reason: isBanned.reason,
            bannedAt: isBanned.bannedAt
        });
    }
    
    // Check access cookie status
    const accessCookies = loadAccessCookies();
    const cookie = accessCookies[accessCookieId];
    
    if (cookie?.revoked) {
        return res.json({ status: 'access_revoked' });
    }
    
    if (cookie?.forceRefresh) {
        // Clear the flag
        cookie.forceRefresh = false;
        saveAccessCookies(accessCookies);
        return res.json({ status: 'refresh_required' });
    }
    
    // Update last seen
    const users = loadUsers();
    if (users[clientId]) {
        users[clientId].lastSeen = new Date().toISOString();
        users[clientId].lastIP = getClientIP(req);
        saveUsers(users);
    }
    
    // User is OK - tell client to clear any stale banned status
    return res.json({ status: 'ok', clearBanned: true });
});

// ============== AI CHAT API ==============
app.post('/api/ai/chat', async (req, res) => {
    const { messages, model } = req.body;
    
    // Get API key from settings or use default
    let apiKeys = serverSettings.aiApiKeys || [];
    if (apiKeys.length === 0) {
        // Use default key
        apiKeys = ['Z3NrXzRlVHlXcWZOR202a056NXZDN1hsV0dkeWIzRllYNXdlNnlmVVl5YWxNOWx4VUtDMXc5Tzg='];
    }
    
    // Decode base64 API key
    let apiKey;
    try {
        apiKey = Buffer.from(apiKeys[0], 'base64').toString('utf8');
    } catch (e) {
        apiKey = apiKeys[0]; // Use as-is if not base64
    }
    
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model || 'llama-3.3-70b-versatile',
                messages,
                temperature: 0.7,
                max_tokens: 4096
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            console.error('Groq API error:', data.error);
            return res.status(500).json({ error: data.error.message || 'AI service error' });
        }
        
        logEvent('ai_chat', { model, messageCount: messages.length }, req);
        
        res.json(data);
    } catch (error) {
        console.error('AI API error:', error.message);
        res.status(500).json({ error: 'Failed to connect to AI service: ' + error.message });
    }
});

// ============== ANALYTICS API ==============
// In-memory cache for fast loading
let analyticsCache = [];
let analyticsCacheLoaded = false;

function loadAnalyticsCache() {
    if (fs.existsSync(ANALYTICS_FILE)) {
        try { 
            analyticsCache = JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8')); 
            analyticsCacheLoaded = true;
        } catch {}
    }
}

// Load cache on startup
loadAnalyticsCache();

app.post('/api/collect', (req, res) => {
    // Get the actual page from request body, referer header, or default
    let page = req.body.page || '-';
    
    // If page is empty or just '/', try to get from referer
    if (!page || page === '-' || page === '') {
        const referer = req.headers['referer'] || req.headers['referrer'] || '';
        if (referer) {
            try {
                const url = new URL(referer);
                page = url.pathname || '/';
            } catch {}
        }
    }
    
    const data = {
        os: req.body.os || 'Unknown',
        browser: req.body.browser || 'Unknown',
        page: page,
        referrer: req.body.referrer || null,
        screenWidth: req.body.screenWidth || 0,
        screenHeight: req.body.screenHeight || 0,
        language: req.body.language || 'Unknown',
        ip: getClientIP(req),
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent']
    };
    
    // Add to cache immediately
    analyticsCache.push(data);
    
    // Keep last 10000 entries in memory
    if (analyticsCache.length > 10000) {
        analyticsCache = analyticsCache.slice(-10000);
    }
    
    // Write to file async (non-blocking)
    fs.writeFile(ANALYTICS_FILE, JSON.stringify(analyticsCache), () => {});
    
    res.json({ success: true });
});

app.get('/api/owner/analytics', verifyOwnerToken, (req, res) => {
    // Support pagination for faster loading
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    // Return from cache (instant)
    const total = analyticsCache.length;
    const data = analyticsCache.slice(-limit - offset, total - offset || undefined).reverse();
    
    res.json({
        data: data,
        total: total,
        limit: limit,
        offset: offset
    });
});

// ============== DYNAMIC FOLDER ROUTING ==============
// Handle dynamic CODE folder routing
app.use((req, res, next) => {
    // If the path starts with /CODE, redirect to the current dynamic folder name
    if (req.path.startsWith('/CODE') && serverSettings.dynamicFolderName !== 'CODE') {
        const newPath = req.path.replace('/CODE', '/' + serverSettings.dynamicFolderName);
        return res.redirect(newPath);
    }
    
    // If the path starts with the dynamic folder name, serve from /CODE
    if (serverSettings.dynamicFolderName !== 'CODE' && req.path.startsWith('/' + serverSettings.dynamicFolderName)) {
        req.url = req.url.replace('/' + serverSettings.dynamicFolderName, '/CODE');
    }
    
    next();
});

// ============== REDIRECTS ==============
// Redirect /CODE/games/dictionary to /CODE/games/ext
app.get('/CODE/games/dictionary', (req, res) => res.redirect('/CODE/games/ext/'));
app.get('/CODE/games/dictionary/', (req, res) => res.redirect('/CODE/games/ext/'));

// ============== STATIC FILE SERVING ==============
// Serve static files from root
app.use(express.static(STATIC_ROOT, {
    extensions: ['html', 'htm'],
    index: ['index.html']
}));

// Handle 404s
app.use((req, res, next) => {
    // Try to serve index.html in directory
    const tryPath = path.join(STATIC_ROOT, req.path, 'index.html');
    if (fs.existsSync(tryPath)) {
        return res.sendFile(tryPath);
    }
    
    // Check for .html extension
    const htmlPath = path.join(STATIC_ROOT, req.path + '.html');
    if (fs.existsSync(htmlPath)) {
        return res.sendFile(htmlPath);
    }
    
    // Log the 404 (skip common assets like favicons)
    if (!req.path.match(/\.(ico|png|jpg|svg|woff|woff2|map|js\.map)$/i)) {
        log404(req.path, req);
    }
    
    // Send 404 page
    const notFoundPage = path.join(STATIC_ROOT, '404.html');
    if (fs.existsSync(notFoundPage)) {
        return res.status(404).sendFile(notFoundPage);
    }
    
    res.status(404).send('Page not found');
});

// ============== START SERVER ==============
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Try HTTPS first
const keyPath = process.env.SSL_KEY_PATH || './certs/key.pem';
const certPath = process.env.SSL_CERT_PATH || './certs/cert.pem';

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    const sslOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };
    
    https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
        console.log(`🔒 HTTPS Server running on port ${HTTPS_PORT}`);
    });
    
    // Also run HTTP that redirects to HTTPS
    http.createServer((req, res) => {
        res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
        res.end();
    }).listen(PORT, () => {
        console.log(`↪️ HTTP->HTTPS redirect on port ${PORT}`);
    });
} else {
    // HTTP only
    app.listen(PORT, () => {
        console.log(`🚀 HTTP Server running on port ${PORT}`);
        console.log(`📁 Serving static files from: ${STATIC_ROOT}`);
        console.log(`⚙️ Owner panel: http://localhost:${PORT}/owner/`);
        console.log(`🔐 Default owner password: ${serverSettings.ownerPassword}`);
    });
}

// Export for testing
module.exports = app;
