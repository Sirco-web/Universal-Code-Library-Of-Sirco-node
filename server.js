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
const crypto = require('crypto');

// ============== ENCRYPTION FOR EXPORT/IMPORT ==============
const EXPORT_SECRET = 'sircoonline2026iscooldonothackthispleaseslim';

function encryptData(data) {
    const key = crypto.createHash('sha256').update(EXPORT_SECRET).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    encrypted += cipher.final('base64');
    // Combine IV + encrypted data and encode as base64
    const combined = Buffer.concat([iv, Buffer.from(encrypted, 'base64')]);
    return combined.toString('base64');
}

function decryptData(encryptedBase64) {
    try {
        const key = crypto.createHash('sha256').update(EXPORT_SECRET).digest();
        const combined = Buffer.from(encryptedBase64, 'base64');
        const iv = combined.subarray(0, 16);
        const encrypted = combined.subarray(16);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, undefined, 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
    } catch (e) {
        return null;
    }
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password + EXPORT_SECRET).digest('hex');
}

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
        sessionSecret: process.env.SESSION_SECRET || 'change-me-in-production',
        siteStatus: 'normal' // normal, 404-lockdown, 401-popup
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
const USER_ACTIVITY_FILE = path.join(DATA_DIR, 'user-activity.json');

// User activity tracking (in-memory, persisted periodically)
let userActivity = {};
function loadUserActivity() {
    if (fs.existsSync(USER_ACTIVITY_FILE)) {
        try { userActivity = JSON.parse(fs.readFileSync(USER_ACTIVITY_FILE, 'utf8')); } catch {}
    }
}
loadUserActivity();

function saveUserActivity() {
    fs.writeFileSync(USER_ACTIVITY_FILE, JSON.stringify(userActivity, null, 2));
}

// Save activity every 30 seconds
setInterval(saveUserActivity, 30000);

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

// ============== USER CODE SYSTEM ==============
// Generate a short memorable user code like "ABC-1234"
function generateUserCode() {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // No I/O to avoid confusion
    const numbers = '0123456789';
    let code = '';
    for (let i = 0; i < 3; i++) code += letters[Math.floor(Math.random() * letters.length)];
    code += '-';
    for (let i = 0; i < 4; i++) code += numbers[Math.floor(Math.random() * numbers.length)];
    return code;
}

// Find user by their code
function findUserByCode(code) {
    const users = loadUsers();
    const upperCode = code.toUpperCase().trim();
    return Object.values(users).find(u => u.userCode === upperCode);
}

// ============== REALTIME COMMAND SYSTEM ==============
// Commands to execute on specific users when they next check in
// Format: { clientId: { command: 'ban'|'redirect'|'refresh'|'revoke', data: {...}, timestamp } }
const COMMANDS_FILE = path.join(DATA_DIR, 'user-commands.json');

function loadUserCommands() {
    if (fs.existsSync(COMMANDS_FILE)) {
        try { return JSON.parse(fs.readFileSync(COMMANDS_FILE, 'utf8')); } catch {}
    }
    return {};
}

function saveUserCommands(commands) {
    fs.writeFileSync(COMMANDS_FILE, JSON.stringify(commands, null, 2));
}

function queueUserCommand(clientId, command, data = {}) {
    const commands = loadUserCommands();
    commands[clientId] = {
        command,
        data,
        timestamp: new Date().toISOString()
    };
    saveUserCommands(commands);
    console.log(`Queued command '${command}' for user ${clientId}`);
}

function popUserCommand(clientId) {
    const commands = loadUserCommands();
    const cmd = commands[clientId];
    if (cmd) {
        delete commands[clientId];
        saveUserCommands(commands);
    }
    return cmd;
}

// ============== MIDDLEWARE ==============

// UNIFIED ACCESS CONTROL - Handles site status, access cookies, and public pages
app.use((req, res, next) => {
    const reqPath = req.path;
    const status = serverSettings.siteStatus || 'normal';
    
    // ========== ALWAYS ALLOWED (no checks at all) ==========
    const PUBLIC_PAGES = [
        '/', '/index.html', '/404.html', '/error.html',
        '/style.css', '/main.js', '/analytics.js', '/sw.js', '/analytics-sw.js',
        '/banner.html', '/version.txt', '/CNAME', '/README.md', '/LICENSE',
        '/404-status', '/sirco-menu.js'
    ];
    
    const PUBLIC_PREFIXES = [
        '/owner',      // Owner panel
        '/welcome',    // Welcome page (where users get the cookie)
        '/agree',      // Agreement page
        '/activate',   // Activation page
        '/api/'        // API endpoints
    ];
    
    // Check if public page
    if (PUBLIC_PAGES.includes(reqPath)) {
        return next();
    }
    
    // Check if public prefix
    if (PUBLIC_PREFIXES.some(prefix => reqPath.startsWith(prefix))) {
        return next();
    }
    
    // Allow static assets (no access cookie needed for CSS, JS, images, fonts)
    if (reqPath.endsWith('.css') || 
        reqPath.endsWith('.js') ||
        reqPath.endsWith('.ico') ||
        reqPath.endsWith('.png') ||
        reqPath.endsWith('.jpg') ||
        reqPath.endsWith('.jpeg') ||
        reqPath.endsWith('.gif') ||
        reqPath.endsWith('.svg') ||
        reqPath.endsWith('.woff') ||
        reqPath.endsWith('.woff2') ||
        reqPath.endsWith('.mp3') ||
        reqPath.endsWith('.wav') ||
        reqPath.endsWith('.ogg') ||
        reqPath.endsWith('.webp')) {
        return next();
    }
    
    // ========== SITE STATUS CHECKS ==========
    // In 404-lockdown mode, block ALL non-public pages
    if (status === '404-lockdown') {
        return res.redirect('/404.html');
    }
    
    // In 401-popup mode, mark for popup injection but allow access
    if (status === '401-popup') {
        res.locals.inject401Popup = true;
    }
    
    // ========== ACCESS COOKIE CHECK ==========
    // Everything else requires access cookie
    const accessCookie = req.cookies?.access;
    
    if (accessCookie !== '1') {
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

// Log only important page visits (not every request)
app.use((req, res, next) => {
    // Only log page visits, not API calls or static assets
    if (!req.path.startsWith('/api/') && 
        !req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|json)$/) &&
        req.method === 'GET') {
        logEvent('page_visit', {
            path: req.path,
            referer: req.headers.referer || null
        }, req);
    }
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

// ============== REALTIME USER CONTROL ==============

// Search for user by code (ABC-1234 format)
app.get('/api/owner/search-user', verifyOwnerToken, (req, res) => {
    const { code, username, clientId } = req.query;
    const users = loadUsers();
    
    let found = null;
    
    if (code) {
        found = Object.values(users).find(u => u.userCode === code.toUpperCase().trim());
    } else if (username) {
        found = Object.values(users).find(u => 
            u.username.toLowerCase().includes(username.toLowerCase())
        );
    } else if (clientId) {
        found = users[clientId];
    }
    
    if (found) {
        res.json({ found: true, user: found });
    } else {
        res.json({ found: false });
    }
});

// Send real-time command to user (executes on their next check-in, which is every few seconds)
app.post('/api/owner/send-command', verifyOwnerToken, (req, res) => {
    const { clientId, command, data } = req.body;
    
    if (!clientId || !command) {
        return res.status(400).json({ error: 'clientId and command required' });
    }
    
    const validCommands = ['ban', 'redirect', 'refresh', 'revoke'];
    if (!validCommands.includes(command)) {
        return res.status(400).json({ error: `Invalid command. Valid: ${validCommands.join(', ')}` });
    }
    
    // Validate redirect has URL
    if (command === 'redirect' && !data?.url) {
        return res.status(400).json({ error: 'redirect command requires data.url' });
    }
    
    queueUserCommand(clientId, command, data || {});
    logEvent('command_queued', { clientId, command, data }, req);
    
    res.json({ success: true, message: `Command '${command}' queued for user` });
});

// Get pending commands (for debugging)
app.get('/api/owner/pending-commands', verifyOwnerToken, (req, res) => {
    res.json(loadUserCommands());
});

// Immediately ban and queue command (so it happens on next check-in)
app.post('/api/owner/instant-ban', verifyOwnerToken, (req, res) => {
    const { clientId, username, reason } = req.body;
    
    if (!clientId) {
        return res.status(400).json({ error: 'clientId required' });
    }
    
    // Queue the ban command for immediate effect
    queueUserCommand(clientId, 'ban', { username, reason });
    
    // Also add to banned users list
    let bannedUsers = loadBannedUsers();
    if (!bannedUsers.find(u => u.clientId === clientId)) {
        bannedUsers.push({
            clientId,
            username,
            reason,
            bannedAt: new Date().toISOString()
        });
        saveBannedUsers(bannedUsers);
    }
    
    logEvent('instant_ban', { clientId, username, reason }, req);
    res.json({ success: true, message: 'User banned and will be disconnected on next check-in' });
});

// Redirect user to any URL
app.post('/api/owner/redirect-user', verifyOwnerToken, (req, res) => {
    const { clientId, url, message } = req.body;
    
    if (!clientId || !url) {
        return res.status(400).json({ error: 'clientId and url required' });
    }
    
    queueUserCommand(clientId, 'redirect', { url, message });
    logEvent('user_redirect', { clientId, url }, req);
    
    res.json({ success: true, message: `User will be redirected to ${url} on next check-in` });
});

// Get user activity/status for dashboard
app.get('/api/owner/user-activity/:clientId', verifyOwnerToken, (req, res) => {
    const { clientId } = req.params;
    const activity = userActivity[clientId] || null;
    const users = loadUsers();
    const user = users[clientId] || null;
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
        user,
        activity: activity ? {
            ...activity,
            isOnline: activity.lastHeartbeat && (Date.now() - new Date(activity.lastHeartbeat).getTime()) < 15000,
            isActiveTab: activity.isActiveTab,
            currentPage: activity.currentPage,
            recentPages: activity.recentPages || [],
            totalTimeOnSite: activity.totalTimeOnSite || 0
        } : null
    });
});

// Get all user activities for dashboard
app.get('/api/owner/all-activity', verifyOwnerToken, (req, res) => {
    const users = loadUsers();
    const result = {};
    
    for (const [clientId, user] of Object.entries(users)) {
        const activity = userActivity[clientId];
        result[clientId] = {
            username: user.username,
            userCode: user.userCode,
            isOnline: activity?.lastHeartbeat && (Date.now() - new Date(activity.lastHeartbeat).getTime()) < 15000,
            isActiveTab: activity?.isActiveTab || false,
            currentPage: activity?.currentPage || null,
            lastSeen: user.lastSeen
        };
    }
    
    res.json(result);
});

// ============== USER ACTIVITY HEARTBEAT ==============

// User sends heartbeat with activity info
app.post('/api/heartbeat', (req, res) => {
    const { clientId, page, isActiveTab, visibilityState } = req.body;
    
    if (!clientId) {
        return res.status(400).json({ error: 'clientId required' });
    }
    
    const now = new Date().toISOString();
    
    if (!userActivity[clientId]) {
        userActivity[clientId] = {
            recentPages: [],
            totalTimeOnSite: 0,
            sessionStart: now
        };
    }
    
    const activity = userActivity[clientId];
    activity.lastHeartbeat = now;
    activity.currentPage = page;
    activity.isActiveTab = isActiveTab && visibilityState === 'visible';
    activity.visibilityState = visibilityState;
    
    // Track page visits (keep last 20)
    if (page && (!activity.recentPages.length || activity.recentPages[0].page !== page)) {
        activity.recentPages.unshift({ page, timestamp: now });
        activity.recentPages = activity.recentPages.slice(0, 20);
    }
    
    // Calculate time on site (if active)
    if (activity.isActiveTab && activity.lastActiveTime) {
        const elapsed = Date.now() - new Date(activity.lastActiveTime).getTime();
        if (elapsed < 10000) { // Only count if heartbeat is within 10s
            activity.totalTimeOnSite = (activity.totalTimeOnSite || 0) + elapsed;
        }
    }
    activity.lastActiveTime = now;
    
    res.json({ ok: true });
});

// ============== USERNAME CHANGE ==============

// Change username
app.post('/api/change-username', (req, res) => {
    const { clientId, newUsername } = req.body;
    
    if (!clientId || !newUsername) {
        return res.status(400).json({ error: 'clientId and newUsername required' });
    }
    
    if (newUsername.length < 3 || newUsername.length > 20) {
        return res.status(400).json({ error: 'Username must be 3-20 characters' });
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(newUsername)) {
        return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and hyphens' });
    }
    
    const users = loadUsers();
    
    // Check if username is taken by another user
    const existingUser = Object.values(users).find(
        u => u.username.toLowerCase() === newUsername.toLowerCase() && u.clientId !== clientId
    );
    if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
    }
    
    if (!users[clientId]) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const oldUsername = users[clientId].username;
    users[clientId].username = newUsername;
    saveUsers(users);
    
    logEvent('username_changed', { clientId, oldUsername, newUsername }, req);
    
    res.json({ success: true, username: newUsername });
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
    
    // Generate unique user code
    let userCode = generateUserCode();
    while (Object.values(users).some(u => u.userCode === userCode)) {
        userCode = generateUserCode(); // Regenerate if collision
    }
    
    users[clientId] = {
        clientId,
        username,
        userCode,
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
    
    logEvent('user_registered', { clientId, username, userCode }, req);
    
    res.json({ success: true, clientId, username, userCode });
});

// ============== ACCOUNT SYSTEM ==============

// Set password for user account
app.post('/api/account/set-password', (req, res) => {
    const { clientId, password } = req.body;
    
    if (!clientId || !password) {
        return res.status(400).json({ error: 'clientId and password required' });
    }
    
    if (password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    
    const users = loadUsers();
    if (!users[clientId]) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    users[clientId].passwordHash = hashPassword(password);
    users[clientId].passwordSetAt = new Date().toISOString();
    saveUsers(users);
    
    logEvent('password_set', { clientId, userCode: users[clientId].userCode }, req);
    
    res.json({ success: true });
});

// Login to account (verify password)
app.post('/api/account/login', (req, res) => {
    const { userCode, password } = req.body;
    
    if (!userCode || !password) {
        return res.status(400).json({ error: 'userCode and password required' });
    }
    
    const users = loadUsers();
    const user = Object.values(users).find(u => u.userCode === userCode);
    
    if (!user) {
        logEvent('login_failed', { userCode, reason: 'user_not_found' }, req);
        return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.passwordHash) {
        return res.status(400).json({ error: 'no_password', message: 'Account has no password set' });
    }
    
    if (user.passwordHash !== hashPassword(password)) {
        logEvent('login_failed', { userCode, reason: 'wrong_password' }, req);
        return res.status(401).json({ error: 'Incorrect password' });
    }
    
    logEvent('login_success', { userCode, clientId: user.clientId }, req);
    
    res.json({ 
        success: true, 
        user: {
            clientId: user.clientId,
            username: user.username,
            userCode: user.userCode,
            accessCookieId: user.accessCookieId,
            createdAt: user.createdAt
        }
    });
});

// Check if user has password
app.get('/api/account/has-password', (req, res) => {
    const { clientId, userCode } = req.query;
    
    const users = loadUsers();
    let user = null;
    
    if (clientId) {
        user = users[clientId];
    } else if (userCode) {
        user = Object.values(users).find(u => u.userCode === userCode);
    }
    
    if (!user) {
        return res.json({ hasPassword: false, exists: false });
    }
    
    res.json({ hasPassword: !!user.passwordHash, exists: true });
});

// Export account data (encrypted .uni file)
app.post('/api/account/export', (req, res) => {
    const { clientId, password } = req.body;
    
    if (!clientId) {
        return res.status(400).json({ error: 'clientId required' });
    }
    
    const users = loadUsers();
    const user = users[clientId];
    
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify password if set
    if (user.passwordHash) {
        if (!password || user.passwordHash !== hashPassword(password)) {
            return res.status(401).json({ error: 'Incorrect password' });
        }
    }
    
    // Create export data
    const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        user: {
            clientId: user.clientId,
            username: user.username,
            userCode: user.userCode,
            accessCookieId: user.accessCookieId,
            createdAt: user.createdAt,
            passwordHash: user.passwordHash || null
        }
    };
    
    const encrypted = encryptData(exportData);
    
    logEvent('account_exported', { clientId, userCode: user.userCode }, req);
    
    res.json({ 
        success: true, 
        data: encrypted,
        filename: `sirco-account-${user.userCode}.uni`
    });
});

// Import account data (from encrypted .uni file)
app.post('/api/account/import', (req, res) => {
    const { encryptedData, currentClientId } = req.body;
    
    if (!encryptedData) {
        return res.status(400).json({ error: 'encryptedData required' });
    }
    
    const decrypted = decryptData(encryptedData);
    
    if (!decrypted || !decrypted.user) {
        logEvent('import_failed', { reason: 'decrypt_failed' }, req);
        return res.status(400).json({ error: 'Invalid or corrupted file' });
    }
    
    const importedUser = decrypted.user;
    const users = loadUsers();
    
    // Check if user already exists
    if (users[importedUser.clientId]) {
        // User exists - verify they can claim it
        if (users[importedUser.clientId].passwordHash && 
            users[importedUser.clientId].passwordHash !== importedUser.passwordHash) {
            logEvent('import_failed', { reason: 'password_mismatch', userCode: importedUser.userCode }, req);
            return res.status(401).json({ error: 'Account exists with different password' });
        }
    }
    
    // Import/update the user
    users[importedUser.clientId] = {
        ...users[importedUser.clientId],
        ...importedUser,
        lastIP: getClientIP(req),
        lastSeen: new Date().toISOString(),
        importedAt: new Date().toISOString()
    };
    saveUsers(users);
    
    // Also update access cookies
    if (importedUser.accessCookieId) {
        const accessCookies = loadAccessCookies();
        accessCookies[importedUser.accessCookieId] = {
            clientId: importedUser.clientId,
            username: importedUser.username,
            createdAt: importedUser.createdAt,
            lastUsed: new Date().toISOString(),
            imported: true
        };
        saveAccessCookies(accessCookies);
    }
    
    logEvent('account_imported', { 
        clientId: importedUser.clientId, 
        userCode: importedUser.userCode,
        fromClientId: currentClientId 
    }, req);
    
    res.json({ 
        success: true, 
        user: {
            clientId: importedUser.clientId,
            username: importedUser.username,
            userCode: importedUser.userCode,
            accessCookieId: importedUser.accessCookieId,
            hasPassword: !!importedUser.passwordHash
        }
    });
});

// Check if client needs to do anything (banned, refresh, etc.)
// Also syncs users - if user doesn't exist on this server, create them
app.post('/api/check-status', (req, res) => {
    const { clientId, accessCookieId, username } = req.body;
    
    // Check for queued commands FIRST (real-time ban, redirect, etc.)
    if (clientId) {
        const cmd = popUserCommand(clientId);
        if (cmd) {
            switch (cmd.command) {
                case 'redirect':
                    return res.json({ 
                        status: 'redirect', 
                        url: cmd.data.url,
                        message: cmd.data.message || 'Redirecting...'
                    });
                case 'ban':
                    // Actually ban the user
                    let bannedUsers = loadBannedUsers();
                    if (!bannedUsers.find(u => u.clientId === clientId)) {
                        bannedUsers.push({
                            clientId,
                            username: cmd.data.username || username,
                            reason: cmd.data.reason || 'Banned by owner',
                            bannedAt: new Date().toISOString()
                        });
                        saveBannedUsers(bannedUsers);
                    }
                    return res.json({ 
                        status: 'banned', 
                        reason: cmd.data.reason || 'You have been banned',
                        bannedAt: new Date().toISOString()
                    });
                case 'revoke':
                    // Revoke access cookie
                    const cookies = loadAccessCookies();
                    if (cookies[accessCookieId]) {
                        cookies[accessCookieId].revoked = true;
                        cookies[accessCookieId].revokedAt = new Date().toISOString();
                        saveAccessCookies(cookies);
                    }
                    return res.json({ status: 'access_revoked' });
                case 'refresh':
                    return res.json({ status: 'refresh_required' });
            }
        }
    }
    
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
    
    // Sync user - if user doesn't exist on this server but client has valid ID, create them
    const users = loadUsers();
    if (clientId && !users[clientId]) {
        // Generate user code for synced user
        let userCode = generateUserCode();
        while (Object.values(users).some(u => u.userCode === userCode)) {
            userCode = generateUserCode();
        }
        
        // User doesn't exist - create them (syncing from another server or restored backup)
        users[clientId] = {
            clientId,
            username: username || 'User_' + clientId.substring(0, 8),
            userCode,
            accessCookieId: accessCookieId,
            createdAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            lastIP: getClientIP(req),
            synced: true // Mark as synced from client
        };
        saveUsers(users);
        console.log(`Synced user from client: ${clientId} (${username}) [${userCode}]`);
        logEvent('user_synced', { clientId, username, userCode }, req);
        
        // Also create/update access cookie record
        if (accessCookieId && !accessCookies[accessCookieId]) {
            accessCookies[accessCookieId] = {
                clientId,
                createdAt: new Date().toISOString(),
                synced: true
            };
            saveAccessCookies(accessCookies);
        }
    } else if (users[clientId]) {
        // Update last seen and sync username if provided
        users[clientId].lastSeen = new Date().toISOString();
        users[clientId].lastIP = getClientIP(req);
        // Update username if provided and different (sync from client)
        // But DON'T overwrite with auto-generated User_XXXXX format
        if (username && users[clientId].username !== username && !username.startsWith('User_')) {
            users[clientId].username = username;
        }
        // Generate userCode if missing (for old users)
        if (!users[clientId].userCode) {
            let userCode = generateUserCode();
            while (Object.values(users).some(u => u.userCode === userCode)) {
                userCode = generateUserCode();
            }
            users[clientId].userCode = userCode;
        }
        saveUsers(users);
    }
    
    // User is OK - return sync data (including userCode for client to store)
    const user = users[clientId] || {};
    return res.json({ 
        status: 'ok', 
        clearBanned: true,
        sync: {
            username: user.username,
            userCode: user.userCode,
            clientId: user.clientId,
            accessCookieId: user.accessCookieId,
            createdAt: user.createdAt
        }
    });
});

// ============== NEWSLETTER SYSTEM ==============
const NEWSLETTER_FILE = path.join(DATA_DIR, 'newsletters.json');
const NEWSLETTER_SUBS_FILE = path.join(DATA_DIR, 'newsletter-subscribers.json');

function loadNewsletters() {
    if (fs.existsSync(NEWSLETTER_FILE)) {
        try { return JSON.parse(fs.readFileSync(NEWSLETTER_FILE, 'utf8')); } catch {}
    }
    return [];
}

function saveNewsletters(newsletters) {
    fs.writeFileSync(NEWSLETTER_FILE, JSON.stringify(newsletters, null, 2));
}

function loadNewsletterSubs() {
    if (fs.existsSync(NEWSLETTER_SUBS_FILE)) {
        try { return JSON.parse(fs.readFileSync(NEWSLETTER_SUBS_FILE, 'utf8')); } catch {}
    }
    return {};
}

function saveNewsletterSubs(subs) {
    fs.writeFileSync(NEWSLETTER_SUBS_FILE, JSON.stringify(subs, null, 2));
}

// Subscribe to newsletter
app.post('/api/newsletter/subscribe', (req, res) => {
    const { userCode } = req.body;
    
    if (!userCode) {
        return res.status(400).json({ error: 'userCode required' });
    }
    
    const subs = loadNewsletterSubs();
    const isNew = !subs[userCode];
    subs[userCode] = {
        userCode,
        subscribedAt: subs[userCode]?.subscribedAt || new Date().toISOString(),
        lastRead: subs[userCode]?.lastRead || null
    };
    saveNewsletterSubs(subs);
    
    if (isNew) {
        logEvent('newsletter_subscribe', { userCode }, req);
    }
    
    res.json({ success: true, subscribed: true });
});

// Unsubscribe from newsletter
app.post('/api/newsletter/unsubscribe', (req, res) => {
    const { userCode } = req.body;
    
    if (!userCode) {
        return res.status(400).json({ error: 'userCode required' });
    }
    
    const subs = loadNewsletterSubs();
    if (subs[userCode]) {
        delete subs[userCode];
        saveNewsletterSubs(subs);
        logEvent('newsletter_unsubscribe', { userCode }, req);
    }
    
    res.json({ success: true, subscribed: false });
});

// Check subscription status
app.get('/api/newsletter/status', (req, res) => {
    const { userCode } = req.query;
    
    if (!userCode) {
        return res.json({ subscribed: false });
    }
    
    const subs = loadNewsletterSubs();
    res.json({ subscribed: !!subs[userCode] });
});

// Get newsletters for user (public)
app.get('/api/newsletter/posts', (req, res) => {
    const newsletters = loadNewsletters();
    // Return only published newsletters, sorted by date (newest first)
    const published = newsletters
        .filter(n => n.published)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(published);
});

// Mark newsletter as read
app.post('/api/newsletter/read', (req, res) => {
    const { clientId, newsletterId } = req.body;
    
    if (!clientId) return res.json({ success: false });
    
    const subs = loadNewsletterSubs();
    if (subs[clientId]) {
        subs[clientId].lastRead = new Date().toISOString();
        subs[clientId].readPosts = subs[clientId].readPosts || [];
        if (!subs[clientId].readPosts.includes(newsletterId)) {
            subs[clientId].readPosts.push(newsletterId);
        }
        saveNewsletterSubs(subs);
    }
    
    res.json({ success: true });
});

// Get unread count for user
app.get('/api/newsletter/unread', (req, res) => {
    const { clientId } = req.query;
    
    if (!clientId) return res.json({ unread: 0 });
    
    const subs = loadNewsletterSubs();
    const sub = subs[clientId];
    
    if (!sub) return res.json({ unread: 0, subscribed: false });
    
    const newsletters = loadNewsletters().filter(n => n.published);
    const readPosts = sub.readPosts || [];
    const unread = newsletters.filter(n => !readPosts.includes(n.id)).length;
    
    res.json({ unread, subscribed: true });
});

// ============== OWNER NEWSLETTER MANAGEMENT ==============

// Get all newsletters (owner)
app.get('/api/owner/newsletters', verifyOwnerToken, (req, res) => {
    res.json(loadNewsletters());
});

// Get newsletter subscribers (owner)
app.get('/api/owner/newsletter-subscribers', verifyOwnerToken, (req, res) => {
    const subs = loadNewsletterSubs();
    const users = loadUsers();
    
    // Enrich with user info - subs are keyed by userCode
    const enriched = Object.entries(subs).map(([userCode, sub]) => {
        // Find user by userCode
        const user = Object.values(users).find(u => u.userCode === userCode);
        return {
            userCode,
            username: user?.username || 'Unknown',
            clientId: user?.clientId || 'N/A',
            subscribedAt: sub.subscribedAt,
            ...sub
        };
    });
    
    res.json(enriched);
});

// Create newsletter (owner)
app.post('/api/owner/newsletter', verifyOwnerToken, (req, res) => {
    const { title, content, published } = req.body;
    
    if (!title || !content) {
        return res.status(400).json({ error: 'title and content required' });
    }
    
    const newsletters = loadNewsletters();
    const newsletter = {
        id: uuidv4(),
        title,
        content, // Markdown content
        published: published !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    newsletters.push(newsletter);
    saveNewsletters(newsletters);
    logEvent('newsletter_created', { id: newsletter.id, title }, req);
    
    res.json({ success: true, newsletter });
});

// Update newsletter (owner)
app.put('/api/owner/newsletter/:id', verifyOwnerToken, (req, res) => {
    const { id } = req.params;
    const { title, content, published } = req.body;
    
    const newsletters = loadNewsletters();
    const idx = newsletters.findIndex(n => n.id === id);
    
    if (idx === -1) {
        return res.status(404).json({ error: 'Newsletter not found' });
    }
    
    if (title) newsletters[idx].title = title;
    if (content) newsletters[idx].content = content;
    if (published !== undefined) newsletters[idx].published = published;
    newsletters[idx].updatedAt = new Date().toISOString();
    
    saveNewsletters(newsletters);
    logEvent('newsletter_updated', { id, title }, req);
    
    res.json({ success: true, newsletter: newsletters[idx] });
});

// Delete newsletter (owner)
app.delete('/api/owner/newsletter/:id', verifyOwnerToken, (req, res) => {
    const { id } = req.params;
    
    let newsletters = loadNewsletters();
    const found = newsletters.find(n => n.id === id);
    
    if (!found) {
        return res.status(404).json({ error: 'Newsletter not found' });
    }
    
    newsletters = newsletters.filter(n => n.id !== id);
    saveNewsletters(newsletters);
    logEvent('newsletter_deleted', { id, title: found.title }, req);
    
    res.json({ success: true });
});

// ============== SUPERTUBE TIME CODES ==============
const TIMECODES_FILE = path.join(DATA_DIR, 'supertube-timecodes.json');

function loadTimeCodes() {
    try {
        if (fs.existsSync(TIMECODES_FILE)) {
            return JSON.parse(fs.readFileSync(TIMECODES_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Failed to load time codes:', e);
    }
    return [];
}

function saveTimeCodes(codes) {
    fs.writeFileSync(TIMECODES_FILE, JSON.stringify(codes, null, 2));
}

// Generate a random time code (6 alphanumeric chars)
function generateTimeCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Get all time codes (owner)
app.get('/api/owner/timecodes', verifyOwnerToken, (req, res) => {
    const codes = loadTimeCodes();
    res.json(codes);
});

// Create a time code (owner)
app.post('/api/owner/timecodes', verifyOwnerToken, (req, res) => {
    const { minutes, note } = req.body;
    
    if (!minutes || minutes < 1 || minutes > 1440) {
        return res.status(400).json({ error: 'Minutes must be between 1 and 1440 (24 hours)' });
    }
    
    const code = generateTimeCode();
    const codes = loadTimeCodes();
    
    codes.push({
        code,
        minutes: parseInt(minutes),
        note: note || '',
        createdAt: new Date().toISOString(),
        usedAt: null,
        usedBy: null
    });
    
    saveTimeCodes(codes);
    logEvent('timecode_created', { code, minutes, note }, req);
    
    res.json({ success: true, code, minutes });
});

// Delete a time code (owner)
app.delete('/api/owner/timecodes/:code', verifyOwnerToken, (req, res) => {
    const { code } = req.params;
    let codes = loadTimeCodes();
    
    const idx = codes.findIndex(c => c.code === code);
    if (idx === -1) {
        return res.status(404).json({ error: 'Time code not found' });
    }
    
    codes.splice(idx, 1);
    saveTimeCodes(codes);
    logEvent('timecode_deleted', { code }, req);
    
    res.json({ success: true });
});

// Token signing secret for SuperTube (derived from export secret)
const SUPERTUBE_SECRET = crypto.createHash('sha256').update(EXPORT_SECRET + 'supertube').digest('hex');

// Sign a SuperTube token
function signSupertubeToken(data) {
    const payload = JSON.stringify(data);
    const signature = crypto.createHmac('sha256', SUPERTUBE_SECRET)
        .update(payload)
        .digest('hex');
    return signature;
}

// Verify a SuperTube token signature
function verifySupertubeToken(token) {
    if (!token || !token.signature || !token.expiresAt || !token.issuedAt) {
        return { valid: false, reason: 'Invalid token structure' };
    }
    
    // Check expiry using server time
    const now = Date.now();
    if (now >= token.expiresAt) {
        return { valid: false, reason: 'Token expired' };
    }
    
    // Verify signature
    const data = {
        code: token.code,
        expiresAt: token.expiresAt,
        issuedAt: token.issuedAt
    };
    const expectedSig = signSupertubeToken(data);
    
    if (token.signature !== expectedSig) {
        return { valid: false, reason: 'Invalid signature' };
    }
    
    return { valid: true };
}

// Get server time (for syncing client clock)
app.get('/api/supertube/time', (req, res) => {
    res.json({ serverTime: Date.now() });
});

// Validate an existing token
app.post('/api/supertube/validate-token', (req, res) => {
    const { token } = req.body;
    
    if (!token) {
        return res.json({ valid: false, reason: 'No token provided', serverTime: Date.now() });
    }
    
    const result = verifySupertubeToken(token);
    res.json({ 
        ...result, 
        serverTime: Date.now() 
    });
});

// Validate and redeem a time code (public API for SuperTube)
app.post('/api/supertube/redeem-code', (req, res) => {
    const { code, clientId } = req.body;
    
    if (!code) {
        return res.status(400).json({ error: 'Code required' });
    }
    
    const codes = loadTimeCodes();
    const idx = codes.findIndex(c => c.code === code.toUpperCase() && !c.usedAt);
    
    if (idx === -1) {
        return res.status(400).json({ error: 'Invalid or already used code' });
    }
    
    const timeCode = codes[idx];
    const now = Date.now();
    const expiresAt = now + timeCode.minutes * 60 * 1000;
    
    timeCode.usedAt = new Date().toISOString();
    timeCode.usedBy = clientId || 'anonymous';
    
    saveTimeCodes(codes);
    logEvent('timecode_redeemed', { code: timeCode.code, minutes: timeCode.minutes, clientId }, req);
    
    // Create signed token
    const tokenData = {
        code: timeCode.code,
        expiresAt: expiresAt,
        issuedAt: now
    };
    const signature = signSupertubeToken(tokenData);
    
    res.json({ 
        success: true, 
        code: timeCode.code,
        minutes: timeCode.minutes,
        expiresAt: expiresAt,
        issuedAt: now,
        signature: signature,
        serverTime: now
    });
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
    
    // Get user ID from request body or try to find by accessCookieId
    let userId = req.body.userId || req.body.clientId || null;
    let username = req.body.username || null;
    
    // If we have an accessCookieId, try to look up the user
    if (!userId && req.body.accessCookieId) {
        const users = loadUsers();
        const user = Object.values(users).find(u => u.accessCookieId === req.body.accessCookieId);
        if (user) {
            userId = user.clientId;
            username = user.username;
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
        userAgent: req.headers['user-agent'],
        userId: userId,
        username: username
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
// Handle dynamic CODE folder routing - REWRITE only, no redirects
app.use((req, res, next) => {
    // If the path starts with /CODE and folder name is different, rewrite to serve from /CODE
    // This way links always use /CODE and we don't need redirects
    
    // If the path starts with the dynamic folder name, rewrite to /CODE
    if (serverSettings.dynamicFolderName !== 'CODE' && req.path.startsWith('/' + serverSettings.dynamicFolderName)) {
        req.url = req.url.replace('/' + serverSettings.dynamicFolderName, '/CODE');
    }
    
    next();
});

// ============== GAME LIBRARY API ==============
// Serve the games index.xml for the library
app.get('/api/games/index.xml', async (req, res) => {
    try {
        // Use local static files - list directories in /static/CODE/games/ext/
        const gamesDir = path.join(STATIC_ROOT, 'CODE', 'games', 'ext');
        const entries = fs.readdirSync(gamesDir, { withFileTypes: true });
        const games = entries.filter(e => e.isDirectory() && !e.name.startsWith('.'));
        
        // Generate XML
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\\n<games>\\n';
        for (const game of games) {
            xml += `  <game>\\n    <name>${game.name}</name>\\n    <path>/CODE/games/ext/${game.name}/</path>\\n  </game>\\n`;
        }
        xml += '</games>';
        
        res.set('Content-Type', 'application/xml');
        res.send(xml);
    } catch (err) {
        console.error('Games XML error:', err);
        res.status(500).send('<?xml version="1.0"?><games></games>');
    }
});

// ============== SITE STATUS MANAGEMENT ==============
// Queue for status changes
let statusChangeQueue = [];
let processingQueue = false;

async function processStatusQueue() {
    if (processingQueue || statusChangeQueue.length === 0) return;
    processingQueue = true;
    
    while (statusChangeQueue.length > 0) {
        const change = statusChangeQueue.shift();
        try {
            serverSettings.siteStatus = change.status;
            serverSettings.siteMessage = change.message || '';
            serverSettings.siteReason = change.reason || '';
            saveSettings();
            logEvent('site_status_change', { 
                status: change.status,
                message: change.message || null,
                reason: change.reason || null,
                changedBy: change.ip 
            }, { ip: change.ip });
        } catch (e) {
            console.error('Failed to process status change:', e);
        }
    }
    
    processingQueue = false;
}

// Get current site status
app.get('/api/site-status', (req, res) => {
    res.json({ 
        status: serverSettings.siteStatus || 'normal',
        message: serverSettings.siteMessage || '',
        reason: serverSettings.siteReason || '',
        queueLength: statusChangeQueue.length
    });
});

// Set site status (requires owner PIN)
app.post('/api/site-status', (req, res) => {
    const { status, ownerPin, message, reason } = req.body;
    
    // Verify owner PIN
    if (ownerPin !== serverSettings.ownerPassword) {
        return res.status(401).json({ error: 'Invalid owner PIN' });
    }
    
    // Validate status
    const validStatuses = ['normal', '404-lockdown', '401-popup'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be: normal, 404-lockdown, or 401-popup' });
    }
    
    // Require reason for 404 lockdown
    if (status === '404-lockdown' && !reason) {
        return res.status(400).json({ error: 'Reason is required for 404 Lockdown' });
    }
    
    // Add to queue with message/reason
    statusChangeQueue.push({
        status,
        message: message || '',
        reason: reason || '',
        ip: req.ip,
        timestamp: Date.now()
    });
    
    // Start processing queue (async, so client can disconnect)
    setImmediate(processStatusQueue);
    
    res.json({ 
        success: true, 
        message: `Status change to '${status}' queued`,
        queuePosition: statusChangeQueue.length
    });
});

// Serve the 404-status management page
app.get('/404-status', (req, res) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Site Status Management</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: #1e1e2e;
            border-radius: 16px;
            padding: 40px;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        h1 {
            color: #cdd6f4;
            margin-bottom: 8px;
            font-size: 24px;
        }
        .subtitle {
            color: #6c7086;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .current-status {
            background: #313244;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 24px;
        }
        .current-status label {
            color: #6c7086;
            font-size: 12px;
            text-transform: uppercase;
        }
        .current-status .status {
            color: #89b4fa;
            font-size: 20px;
            font-weight: 600;
            margin-top: 4px;
        }
        .current-status .status.normal { color: #a6e3a1; }
        .current-status .status.lockdown { color: #f38ba8; }
        .current-status .status.popup { color: #fab387; }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            color: #cdd6f4;
            margin-bottom: 8px;
            font-size: 14px;
        }
        .form-group input, .form-group select {
            width: 100%;
            padding: 12px 16px;
            background: #313244;
            border: 1px solid #45475a;
            border-radius: 8px;
            color: #cdd6f4;
            font-size: 16px;
        }
        .form-group input:focus, .form-group select:focus {
            outline: none;
            border-color: #89b4fa;
        }
        .status-option {
            padding: 12px;
            margin-bottom: 8px;
            background: #313244;
            border: 2px solid transparent;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .status-option:hover {
            background: #45475a;
        }
        .status-option.selected {
            border-color: #89b4fa;
        }
        .status-option h3 {
            color: #cdd6f4;
            font-size: 16px;
            margin-bottom: 4px;
        }
        .status-option p {
            color: #6c7086;
            font-size: 12px;
        }
        .btn {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
        }
        .message {
            margin-top: 16px;
            padding: 12px;
            border-radius: 8px;
            text-align: center;
            display: none;
        }
        .message.success {
            background: rgba(166, 227, 161, 0.2);
            color: #a6e3a1;
            display: block;
        }
        .message.error {
            background: rgba(243, 139, 168, 0.2);
            color: #f38ba8;
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔒 Site Status Control</h1>
        <p class="subtitle">Manage site access mode</p>
        
        <div class="current-status">
            <label>Current Status</label>
            <div class="status" id="currentStatus">Loading...</div>
        </div>
        
        <div class="form-group">
            <label>Owner PIN</label>
            <input type="password" id="ownerPin" placeholder="Enter owner PIN">
        </div>
        
        <div class="form-group">
            <label>Select New Status</label>
            <div class="status-option" data-status="normal">
                <h3>✅ Normal</h3>
                <p>Site operates normally, all pages accessible</p>
            </div>
            <div class="status-option" data-status="404-lockdown">
                <h3>🚫 404 Lockdown</h3>
                <p>Only / and /404.html accessible, everything else redirects to /404.html</p>
            </div>
            <div class="status-option" data-status="401-popup">
                <h3>📢 Announcement Popup</h3>
                <p>Shows a custom announcement popup on all pages (e.g. new game, update notice)</p>
            </div>
        </div>
        
        <div class="form-group" id="reason-group" style="display:none;">
            <label>Lockdown Reason (required)</label>
            <input type="text" id="lockdownReason" placeholder="e.g. Maintenance, Security update...">
        </div>
        
        <div class="form-group" id="message-group" style="display:none;">
            <label>Announcement Message</label>
            <input type="text" id="announcementMessage" placeholder="e.g. 🎮 Check out our new game!">
        </div>
        
        <button class="btn" id="submitBtn" disabled>Set Status</button>
        <div class="message" id="message"></div>
    </div>
    
    <script>
        let selectedStatus = null;
        
        // Fetch current status
        fetch('/api/site-status')
            .then(r => r.json())
            .then(data => {
                const el = document.getElementById('currentStatus');
                el.textContent = data.status.toUpperCase().replace('-', ' ').replace('401 POPUP', 'ANNOUNCEMENT');
                el.className = 'status ' + (data.status === 'normal' ? 'normal' : 
                    data.status === '404-lockdown' ? 'lockdown' : 'popup');
                // Show current message/reason if set
                if (data.message) {
                    document.getElementById('announcementMessage').value = data.message;
                }
                if (data.reason) {
                    document.getElementById('lockdownReason').value = data.reason;
                }
            });
        
        // Status option selection
        document.querySelectorAll('.status-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.status-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                selectedStatus = opt.dataset.status;
                
                // Show/hide message and reason fields
                document.getElementById('message-group').style.display = selectedStatus === '401-popup' ? 'block' : 'none';
                document.getElementById('reason-group').style.display = selectedStatus === '404-lockdown' ? 'block' : 'none';
                
                updateButton();
            });
        });
        
        document.getElementById('ownerPin').addEventListener('input', updateButton);
        document.getElementById('lockdownReason').addEventListener('input', updateButton);
        
        function updateButton() {
            const pin = document.getElementById('ownerPin').value;
            const reason = document.getElementById('lockdownReason').value;
            // Require reason for 404 lockdown
            const reasonOk = selectedStatus !== '404-lockdown' || reason.trim().length > 0;
            document.getElementById('submitBtn').disabled = !pin || !selectedStatus || !reasonOk;
        }
        
        document.getElementById('submitBtn').addEventListener('click', async () => {
            const pin = document.getElementById('ownerPin').value;
            const message = document.getElementById('announcementMessage').value;
            const reason = document.getElementById('lockdownReason').value;
            const btn = document.getElementById('submitBtn');
            const msg = document.getElementById('message');
            
            btn.disabled = true;
            btn.textContent = 'Processing...';
            
            try {
                const res = await fetch('/api/site-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: selectedStatus, ownerPin: pin, message, reason })
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    msg.className = 'message success';
                    msg.textContent = data.message;
                    // Reload to show new status
                    setTimeout(() => location.reload(), 1500);
                } else {
                    msg.className = 'message error';
                    msg.textContent = data.error;
                }
            } catch (e) {
                msg.className = 'message error';
                msg.textContent = 'Failed to update status';
            }
            
            btn.disabled = false;
            btn.textContent = 'Set Status';
        });
    </script>
</body>
</html>`;
    
    res.send(html);
});

// ============== REDIRECTS ==============
// Redirect /CODE/games/dictionary to /CODE/games/ext (no loop because target is /CODE)
app.get('/CODE/games/dictionary', (req, res) => {
    res.redirect('/CODE/games/ext/');
});
app.get('/CODE/games/dictionary/', (req, res) => {
    res.redirect('/CODE/games/ext/');
});

// ============== USER CHAT API ==============
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');

function loadChats() {
    if (fs.existsSync(CHATS_FILE)) {
        try { return JSON.parse(fs.readFileSync(CHATS_FILE, 'utf8')); } catch {}
    }
    return { conversations: {}, messages: {} };
}

function saveChats(data) {
    fs.writeFileSync(CHATS_FILE, JSON.stringify(data, null, 2));
}

// Search users by username or ID
app.get('/api/chat/search-users', (req, res) => {
    const query = (req.query.q || '').toLowerCase().trim();
    if (query.length < 2) {
        return res.json({ users: [] });
    }
    
    const users = loadUsers();
    const results = Object.values(users)
        .filter(u => 
            (u.username && u.username.toLowerCase().includes(query)) ||
            (u.clientId && u.clientId.toLowerCase().includes(query))
        )
        .slice(0, 20)
        .map(u => ({
            clientId: u.clientId,
            username: u.username || `User_${u.clientId.slice(0, 8)}`
        }));
    
    res.json({ users: results });
});

// Get user's conversations
app.get('/api/chat/conversations', (req, res) => {
    const clientId = req.query.clientId;
    if (!clientId) {
        return res.status(400).json({ error: 'clientId required' });
    }
    
    const chatData = loadChats();
    const userConversations = [];
    
    // Find all conversations involving this user
    for (const [convId, conv] of Object.entries(chatData.conversations || {})) {
        if (conv.participants.includes(clientId)) {
            const partnerId = conv.participants.find(p => p !== clientId);
            const messages = chatData.messages[convId] || [];
            const lastMsg = messages[messages.length - 1];
            
            // Get partner info
            const users = loadUsers();
            const partner = users[partnerId] || {};
            
            userConversations.push({
                conversationId: convId,
                partnerId,
                partnerName: partner.username || `User_${partnerId?.slice(0, 8) || 'unknown'}`,
                lastMessage: lastMsg?.content?.slice(0, 50) || '',
                lastMessageTime: lastMsg?.timestamp || conv.createdAt
            });
        }
    }
    
    // Sort by last message time
    userConversations.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
    
    res.json({ conversations: userConversations });
});

// Start a new conversation (sends a request)
app.post('/api/chat/start', (req, res) => {
    const { initiatorId, initiatorName, recipientId, recipientName } = req.body;
    
    if (!initiatorId || !recipientId) {
        return res.status(400).json({ error: 'Both user IDs required' });
    }
    
    const chatData = loadChats();
    chatData.requests = chatData.requests || {};
    
    // Check if conversation already exists and is accepted
    const existingConv = Object.entries(chatData.conversations || {}).find(([id, conv]) => 
        conv.participants.includes(initiatorId) && conv.participants.includes(recipientId) && conv.accepted
    );
    
    if (existingConv) {
        return res.json({ conversationId: existingConv[0], exists: true, accepted: true });
    }
    
    // Check if there's already a pending request
    const existingRequest = Object.entries(chatData.requests).find(([id, req]) =>
        (req.from === initiatorId && req.to === recipientId) ||
        (req.from === recipientId && req.to === initiatorId)
    );
    
    if (existingRequest) {
        // If the other person sent us a request, accept it automatically
        if (existingRequest[1].from === recipientId && existingRequest[1].to === initiatorId) {
            // Accept the request
            const reqId = existingRequest[0];
            const request = chatData.requests[reqId];
            
            // Create conversation
            const convId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            chatData.conversations = chatData.conversations || {};
            chatData.conversations[convId] = {
                participants: [initiatorId, recipientId],
                createdAt: new Date().toISOString(),
                createdBy: request.from,
                accepted: true,
                acceptedAt: new Date().toISOString()
            };
            chatData.messages = chatData.messages || {};
            chatData.messages[convId] = [];
            
            // Remove request
            delete chatData.requests[reqId];
            
            saveChats(chatData);
            return res.json({ conversationId: convId, exists: false, accepted: true, wasRequest: true });
        }
        
        return res.json({ requestId: existingRequest[0], pending: true, message: 'Request already sent' });
    }
    
    // Create new request
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    chatData.requests[requestId] = {
        from: initiatorId,
        fromName: initiatorName || `User_${initiatorId.slice(0, 8)}`,
        to: recipientId,
        toName: recipientName || `User_${recipientId.slice(0, 8)}`,
        createdAt: new Date().toISOString()
    };
    
    saveChats(chatData);
    
    res.json({ requestId, pending: true, message: 'Chat request sent' });
});

// Get pending chat requests for a user
app.get('/api/chat/requests', (req, res) => {
    const clientId = req.query.clientId;
    if (!clientId) {
        return res.status(400).json({ error: 'clientId required' });
    }
    
    const chatData = loadChats();
    const requests = [];
    
    for (const [reqId, request] of Object.entries(chatData.requests || {})) {
        if (request.to === clientId) {
            requests.push({
                requestId: reqId,
                from: request.from,
                fromName: request.fromName,
                createdAt: request.createdAt
            });
        }
    }
    
    res.json({ requests });
});

// Accept a chat request
app.post('/api/chat/accept', (req, res) => {
    const { requestId, clientId } = req.body;
    
    if (!requestId || !clientId) {
        return res.status(400).json({ error: 'requestId and clientId required' });
    }
    
    const chatData = loadChats();
    const request = chatData.requests?.[requestId];
    
    if (!request) {
        return res.status(404).json({ error: 'Request not found' });
    }
    
    if (request.to !== clientId) {
        return res.status(403).json({ error: 'Not authorized to accept this request' });
    }
    
    // Create conversation
    const convId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    chatData.conversations = chatData.conversations || {};
    chatData.conversations[convId] = {
        participants: [request.from, request.to],
        createdAt: request.createdAt,
        createdBy: request.from,
        accepted: true,
        acceptedAt: new Date().toISOString()
    };
    chatData.messages = chatData.messages || {};
    chatData.messages[convId] = [];
    
    // Remove request
    delete chatData.requests[requestId];
    
    saveChats(chatData);
    
    res.json({ success: true, conversationId: convId });
});

// Decline a chat request
app.post('/api/chat/decline', (req, res) => {
    const { requestId, clientId } = req.body;
    
    if (!requestId || !clientId) {
        return res.status(400).json({ error: 'requestId and clientId required' });
    }
    
    const chatData = loadChats();
    const request = chatData.requests?.[requestId];
    
    if (!request) {
        return res.status(404).json({ error: 'Request not found' });
    }
    
    if (request.to !== clientId) {
        return res.status(403).json({ error: 'Not authorized to decline this request' });
    }
    
    // Remove request
    delete chatData.requests[requestId];
    
    saveChats(chatData);
    
    res.json({ success: true });
});

// Get messages for a conversation
app.get('/api/chat/messages', (req, res) => {
    const { clientId, partnerId } = req.query;
    
    if (!clientId || !partnerId) {
        return res.status(400).json({ error: 'clientId and partnerId required' });
    }
    
    const chatData = loadChats();
    
    // Find conversation
    const conv = Object.entries(chatData.conversations || {}).find(([id, c]) => 
        c.participants.includes(clientId) && c.participants.includes(partnerId)
    );
    
    if (!conv) {
        return res.json({ messages: [] });
    }
    
    const messages = chatData.messages[conv[0]] || [];
    
    // Return last 20 messages
    res.json({ messages: messages.slice(-20) });
});

// Send a message
app.post('/api/chat/send', (req, res) => {
    const { senderId, senderName, recipientId, content, type = 'text' } = req.body;
    
    if (!senderId || !recipientId || !content) {
        return res.status(400).json({ error: 'senderId, recipientId, and content required' });
    }
    
    // Limit message size (200KB for images)
    if (content.length > 200 * 1024) {
        return res.status(400).json({ error: 'Message too large (max 200KB)' });
    }
    
    const chatData = loadChats();
    
    // Find or create conversation
    let convId = Object.entries(chatData.conversations || {}).find(([id, c]) => 
        c.participants.includes(senderId) && c.participants.includes(recipientId)
    )?.[0];
    
    if (!convId) {
        // Create new conversation
        convId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        chatData.conversations = chatData.conversations || {};
        chatData.conversations[convId] = {
            participants: [senderId, recipientId],
            createdAt: new Date().toISOString(),
            createdBy: senderId
        };
        chatData.messages = chatData.messages || {};
        chatData.messages[convId] = [];
    }
    
    // Add message
    const message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        senderId,
        senderName: senderName || `User_${senderId.slice(0, 8)}`,
        content,
        type,
        timestamp: new Date().toISOString()
    };
    
    chatData.messages[convId] = chatData.messages[convId] || [];
    chatData.messages[convId].push(message);
    
    // Keep only last 20 messages per conversation
    if (chatData.messages[convId].length > 20) {
        chatData.messages[convId] = chatData.messages[convId].slice(-20);
    }
    
    saveChats(chatData);
    
    res.json({ success: true, message });
});

// ============== STATIC FILE SERVING ==============
// Middleware to inject sirco-menu.js into HTML pages
const injectMenuScript = (req, res, next) => {
    // Only process HTML files
    const ext = path.extname(req.path).toLowerCase();
    const isHtmlRequest = ext === '.html' || ext === '.htm' || ext === '' || !ext;
    
    // Skip non-HTML requests
    if (!isHtmlRequest) {
        return next();
    }
    
    // Skip API requests and specific paths (including banner.html which is loaded in iframe)
    if (req.path.startsWith('/api/') || 
        req.path === '/404.html' || 
        req.path === '/error.html' ||
        req.path === '/banner.html') {
        return next();
    }
    
    // Determine the file path
    let filePath = path.join(STATIC_ROOT, req.path);
    
    // Try with index.html for directories
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
    }
    
    // Try with .html extension
    if (!fs.existsSync(filePath)) {
        filePath = path.join(STATIC_ROOT, req.path + '.html');
    }
    
    // If file doesn't exist, continue to next middleware
    if (!fs.existsSync(filePath)) {
        return next();
    }
    
    // Read and inject script
    try {
        let html = fs.readFileSync(filePath, 'utf8');
        
        // Don't inject if already present
        if (!html.includes('sirco-menu.js')) {
            // Inject before </body> or </html> or at end
            const menuScript = '<script src="/sirco-menu.js"></script>';
            if (html.includes('</body>')) {
                // Insert before the LAST </body> tag
                const lastBodyIdx = html.lastIndexOf('</body>');
                html = html.slice(0, lastBodyIdx) + menuScript + '\n' + html.slice(lastBodyIdx);
            } else if (html.includes('</html>')) {
                html = html.replace('</html>', menuScript + '\n</html>');
            } else {
                html += '\n' + menuScript;
            }
        }
        
        // Inject 401 popup if in 401-popup mode (now an announcement popup)
        if (res.locals.inject401Popup && !html.includes('sirco-announcement-popup')) {
            const announcementMessage = serverSettings.siteMessage || 'Check out what is new on Code Universe!';
            const popupScript = `
<div id="sirco-announcement-popup" style="
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    z-index: 999999;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
">
    <div style="
        background: linear-gradient(135deg, #1e1e2e 0%, #2d2d44 100%);
        border-radius: 16px;
        padding: 40px;
        max-width: 450px;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        border: 1px solid #4ecdc4;
    ">
        <div style="font-size: 64px; margin-bottom: 20px;">📢</div>
        <h1 style="color: #4ecdc4; margin-bottom: 12px; font-size: 24px;">Announcement</h1>
        <p style="color: #cdd6f4; line-height: 1.6; margin-bottom: 24px; font-size: 16px;">
            ${announcementMessage.replace(/'/g, "\\'")}
        </p>
        <button onclick="document.getElementById('sirco-announcement-popup').style.display='none'" style="
            background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
            color: #1e1e2e;
            border: none;
            padding: 12px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
        ">Got it!</button>
    </div>
</div>`;
            if (html.includes('</body>')) {
                const lastBodyIdx = html.lastIndexOf('</body>');
                html = html.slice(0, lastBodyIdx) + popupScript + '\n' + html.slice(lastBodyIdx);
            } else {
                html += popupScript;
            }
        }
        
        res.set('Content-Type', 'text/html');
        res.send(html);
    } catch (e) {
        next();
    }
};

// ============== PROTECTED OWNER DASHBOARD ==============
// This route MUST be before static middleware to intercept dashboard requests
app.get('/owner/dashboard.html', (req, res) => {
    // Check for owner token in cookies or localStorage (sent via query param for initial load)
    const token = req.query.token;
    
    if (!token) {
        // Return blank page with redirect to login
        return res.send(`
            <!DOCTYPE html>
            <html><head><title>Owner Dashboard</title>
            <script>
                // Check for token in localStorage
                const token = localStorage.getItem('owner_token');
                if (token) {
                    // Verify token is still valid
                    fetch('/api/owner/settings', {
                        headers: { 'X-Owner-Token': token }
                    }).then(res => {
                        if (res.ok) {
                            // Token valid - reload with token to get dashboard
                            window.location.href = '/owner/dashboard.html?token=' + encodeURIComponent(token);
                        } else {
                            localStorage.removeItem('owner_token');
                            window.location.href = '/owner/';
                        }
                    }).catch(() => {
                        window.location.href = '/owner/';
                    });
                } else {
                    window.location.href = '/owner/';
                }
            </script>
            </head><body style="background:#1a1a2e"></body></html>
        `);
    }
    
    // Verify the token
    const sessionsPath = path.join(DATA_DIR, 'owner-sessions.json');
    let sessions = {};
    if (fs.existsSync(sessionsPath)) {
        try { sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf8')); } catch {}
    }
    
    const session = sessions[token];
    if (!session || session.expires < Date.now()) {
        return res.send(`
            <!DOCTYPE html>
            <html><head><title>Session Expired</title>
            <script>
                localStorage.removeItem('owner_token');
                window.location.href = '/owner/';
            </script>
            </head><body style="background:#1a1a2e"></body></html>
        `);
    }
    
    // Token valid - serve the actual dashboard
    res.sendFile(path.join(STATIC_ROOT, 'owner', 'dashboard.html'));
});

// Use menu injection before static serving
app.use(injectMenuScript);

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
