/**
 * User Client System - Handles user registration and status checks
 * This script should be included on protected pages
 */

(function() {
    'use strict';

    // Only run on pages that require authentication
    const cookies = document.cookie.split("; ");
    const accessCookie = cookies.find(c => c.startsWith("access="));
    const hasAccess = accessCookie && accessCookie.split("=")[1] === "1";

    if (!hasAccess) {
        return; // Let the page's own access check handle redirect
    }

    // Get stored user info
    const clientId = localStorage.getItem('clientId');
    const username = localStorage.getItem('username');
    const accessCookieId = localStorage.getItem('accessCookieId');

    // Check if user needs to register
    if (!clientId || !username) {
        // First visit with access - need to register
        if (window.location.pathname !== '/welcome/' && 
            window.location.pathname !== '/welcome/index.html' &&
            !window.location.pathname.startsWith('/welcome')) {
            // Redirect to welcome to complete registration
            window.location.href = '/welcome/?register=1';
            return;
        }
    }

    // Check user status with server
    async function checkStatus() {
        if (!clientId || !accessCookieId) return;

        try {
            const res = await fetch('/api/check-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId, accessCookieId, username })
            });

            const data = await res.json();

            switch (data.status) {
                case 'banned':
                    localStorage.setItem('banned', 'true');
                    localStorage.setItem('banReason', data.reason || 'No reason provided');
                    if (data.bannedAt) localStorage.setItem('bannedAt', data.bannedAt);
                    showBannedMessage(data.reason);
                    break;
                
                case 'access_revoked':
                    // Clear cookies and redirect
                    document.cookie = 'access=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    localStorage.removeItem('clientId');
                    localStorage.removeItem('username');
                    localStorage.removeItem('accessCookieId');
                    window.location.href = '/404.html';
                    break;
                
                case 'refresh_required':
                    window.location.reload();
                    break;
                
                case 'ok':
                    // Clear any stale banned status
                    if (data.clearBanned) {
                        localStorage.removeItem('banned');
                        localStorage.removeItem('banReason');
                        localStorage.removeItem('bannedAt');
                    }
                    // Sync data from server
                    if (data.sync) {
                        if (data.sync.username && data.sync.username !== localStorage.getItem('username')) {
                            localStorage.setItem('username', data.sync.username);
                        }
                        if (data.sync.clientId) {
                            localStorage.setItem('clientId', data.sync.clientId);
                        }
                        if (data.sync.accessCookieId) {
                            localStorage.setItem('accessCookieId', data.sync.accessCookieId);
                        }
                    }
                    break;
            }
        } catch (err) {
            // Network error - continue offline
            console.log('Status check failed, continuing offline');
        }
    }

    function showBannedMessage(reason) {
        document.body.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
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

    // Check status on page load
    if (clientId) {
        checkStatus();
    }

    // Periodic status check every 5 minutes
    setInterval(checkStatus, 5 * 60 * 1000);

    // Export for use by other scripts
    window.UserClient = {
        clientId,
        username,
        accessCookieId,
        checkStatus
    };
})();
