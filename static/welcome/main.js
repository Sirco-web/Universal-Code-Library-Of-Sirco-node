function checkCookie() {
    const cookies = document.cookie.split("; ");
    const accessCookie = cookies.find(row => row.startsWith("access="));
    if (!accessCookie || accessCookie.split("=")[1] !== "1") {
        window.location.href = "/index.html"; // Redirect if no valid cookie
    }
}

// Check if user needs to register a username
function checkUserRegistration() {
    const clientId = localStorage.getItem('clientId');
    const username = localStorage.getItem('username');
    const accessCookieId = localStorage.getItem('accessCookieId');

    // Check URL params for register flag
    const urlParams = new URLSearchParams(window.location.search);
    const needsRegister = urlParams.get('register') === '1';

    if (!clientId || !username || needsRegister) {
        showRegistrationModal();
    } else {
        // Check status with server
        checkUserStatus(clientId, accessCookieId);
    }
}

function showRegistrationModal() {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'registration-overlay';
    overlay.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
            <div style="
                background: white;
                padding: 40px;
                border-radius: 20px;
                text-align: center;
                max-width: 450px;
                width: 90%;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            ">
                <div style="font-size: 50px; margin-bottom: 15px;">👋</div>
                <h2 style="color: #333; margin-bottom: 10px;">Welcome!</h2>
                <p style="color: #666; margin-bottom: 25px;">
                    Please choose a username to continue. This will be your identity on Code Universe.
                </p>
                <div style="margin-bottom: 20px;">
                    <input type="text" id="register-username" placeholder="Enter username" style="
                        width: 100%;
                        padding: 15px;
                        border: 2px solid #e0e0e0;
                        border-radius: 10px;
                        font-size: 16px;
                        text-align: center;
                    " maxlength="20">
                    <p style="color: #999; font-size: 12px; margin-top: 5px;">
                        3-20 characters, letters, numbers, underscores, hyphens only
                    </p>
                </div>
                <div id="register-error" style="
                    background: #f8d7da;
                    color: #721c24;
                    padding: 10px;
                    border-radius: 8px;
                    margin-bottom: 15px;
                    display: none;
                "></div>
                <button onclick="registerUser()" id="register-btn" style="
                    width: 100%;
                    padding: 15px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-size: 16px;
                    cursor: pointer;
                ">
                    Create Account
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Focus input and allow Enter key
    setTimeout(() => {
        const input = document.getElementById('register-username');
        if (input) {
            input.focus();
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') registerUser();
            });
        }
    }, 100);
}

async function registerUser() {
    const input = document.getElementById('register-username');
    const btn = document.getElementById('register-btn');
    const errorDiv = document.getElementById('register-error');
    const username = input.value.trim();

    // Validate username
    if (username.length < 3 || username.length > 20) {
        errorDiv.textContent = 'Username must be 3-20 characters';
        errorDiv.style.display = 'block';
        return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        errorDiv.textContent = 'Only letters, numbers, underscores, and hyphens allowed';
        errorDiv.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Creating account...';
    errorDiv.style.display = 'none';

    try {
        const accessCookieId = localStorage.getItem('accessCookieId') || generateId();
        localStorage.setItem('accessCookieId', accessCookieId);

        const res = await fetch('/api/register-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, accessCookieId })
        });

        const data = await res.json();

        if (data.success) {
            localStorage.setItem('clientId', data.clientId);
            localStorage.setItem('username', data.username);
            
            // Remove overlay
            const overlay = document.getElementById('registration-overlay');
            if (overlay) overlay.remove();

            // Remove register param from URL
            const url = new URL(window.location.href);
            url.searchParams.delete('register');
            window.history.replaceState({}, document.title, url.pathname);

            // Show welcome toast
            showWelcomeToast(data.username);
        } else {
            errorDiv.textContent = data.error || 'Registration failed';
            errorDiv.style.display = 'block';
        }
    } catch (err) {
        errorDiv.textContent = 'Connection error. Please try again.';
        errorDiv.style.display = 'block';
    }

    btn.disabled = false;
    btn.textContent = 'Create Account';
}

function showWelcomeToast(username) {
    const toast = document.createElement('div');
    toast.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
            z-index: 999999;
            animation: slideIn 0.3s ease;
        ">
            ✅ Welcome, <strong>${username}</strong>! Your account is ready.
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

async function checkUserStatus(clientId, accessCookieId) {
    try {
        const res = await fetch('/api/check-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId, accessCookieId })
        });

        const data = await res.json();

        if (data.status === 'banned') {
            localStorage.setItem('banned', 'true');
            showBannedPage(data.reason);
        } else if (data.status === 'access_revoked') {
            document.cookie = 'access=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            localStorage.clear();
            window.location.href = '/404.html';
        } else if (data.status === 'refresh_required') {
            window.location.reload();
        } else if (data.status === 'redirect') {
            // Owner redirected user to a specific URL - silent redirect
            window.location.href = data.url;
        } else if (data.status === 'ok' && data.clearBanned) {
            // User is no longer banned - clear stale banned status
            localStorage.removeItem('banned');
            localStorage.removeItem('banned_permanent');
        }
    } catch (err) {
        // Offline - continue normally
    }
}

function showBannedPage(reason) {
    document.body.innerHTML = `
        <div style="
            min-height: 100vh;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
            <div style="
                background: rgba(255,107,107,0.1);
                padding: 40px;
                border-radius: 20px;
                text-align: center;
                max-width: 500px;
                border: 2px solid rgba(255,107,107,0.3);
            ">
                <div style="font-size: 60px; margin-bottom: 20px;">🚫</div>
                <h1 style="color: #ff6b6b; margin-bottom: 15px;">Account Banned</h1>
                <p style="color: #ccc; margin-bottom: 20px;">
                    Your account has been banned from accessing this service.
                </p>
                <p style="color: #ff6b6b; font-weight: bold;">
                    Reason: ${reason || 'No reason provided'}
                </p>
            </div>
        </div>
    `;
}

function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function fetchVersion() {
    fetch(`/version.txt?nocache=${new Date().getTime()}`)
        .then(response => response.text())
        .then(data => {
            document.getElementById("siteVersion").textContent = data.trim();
        })
        .catch(error => {
            console.error("Error fetching site version:", error);
            document.getElementById("siteVersion").textContent = "Unavailable";
        });
}

function removeAccessKey() {
    document.cookie = "access=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    alert("Access key removed. Reloading page...");
    window.location.reload();
}

// Hardcoded toggle for banner display
const showBanner = true; // Set to false to hide the banner

// Adjust iframe height to match banner.html content
function resizeBannerFrame(height) {
    const bannerFrame = document.getElementById('banner-frame');
    if (bannerFrame) {
        bannerFrame.style.height = height + 'px';
    }
    // Also adjust body padding-top to prevent content overlap
    document.body.style.paddingTop = height + 'px';
}

// Add offline status checking
function checkOfflineStatus() {
    const isOffline = !navigator.onLine;
    localStorage.setItem('wasOffline', isOffline ? '1' : '0');
}

window.onload = function () {
    checkCookie(); // Verify cookie before loading the page
    checkUserRegistration(); // Check if user needs to register username
    fetchVersion(); // Fetch site version
    checkOfflineStatus();
    // Set the banner iframe src with cache-busting using JS (like fetchVersion)
    document.getElementById('banner-frame').src = `/banner.html?nocache=${new Date().getTime()}`;
};

window.addEventListener('DOMContentLoaded', function() {
    if (!showBanner) {
        const bannerFrame = document.getElementById('banner-frame');
        if (bannerFrame) bannerFrame.style.display = 'none';
    }
});

// Listen for postMessage from banner.html to set height dynamically
window.addEventListener('message', function(event) {
    // Optionally, check event.origin for security
    if (event.data && event.data.type === 'bannerHeight') {
        resizeBannerFrame(event.data.height);
    }
});

window.addEventListener('online', checkOfflineStatus);
window.addEventListener('offline', checkOfflineStatus);
window.addEventListener('DOMContentLoaded', checkOfflineStatus);
