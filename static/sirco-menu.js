/**
 * Sirco Floating Menu Component
 * A draggable, resizable floating menu with:
 * - User-to-user chat
 * - Mini AI chat
 * - Shortcuts
 * - Hide option (except on welcome page)
 */

(function() {
    'use strict';

    // Don't initialize if already initialized
    if (window.__sircoMenuInitialized) return;
    window.__sircoMenuInitialized = true;
    
    // Also check if DOM elements already exist (extra safety)
    if (document.querySelector('.sirco-menu-btn')) return;

    // Configuration
    const STORAGE_KEYS = {
        position: 'sirco_menu_position',
        hidden: 'sirco_menu_hidden',
        activeTab: 'sirco_menu_active_tab',
        menuSize: 'sirco_menu_size'
    };

    const DEFAULT_POSITION = { right: 20, bottom: 20 };
    const DEFAULT_SIZE = { width: 380, height: 500 };
    const MIN_SIZE = { width: 320, height: 400 };
    const MAX_SIZE = { width: 600, height: 700 };

    // Check if on welcome page
    const isWelcomePage = window.location.pathname.startsWith('/welcome');
    
    // Pages where menu should NOT be shown
    const EXCLUDED_PAGES = ['/', '/index.html', '/404.html', '/error.html'];
    const EXCLUDED_PREFIXES = ['/activate', '/owner'];
    
    const currentPath = window.location.pathname;
    const isExcludedPage = EXCLUDED_PAGES.includes(currentPath) || 
                           EXCLUDED_PREFIXES.some(prefix => currentPath.startsWith(prefix));
    
    // Don't show menu on excluded pages
    if (isExcludedPage) {
        return;
    }

    // Don't show menu when running inside an iframe
    const isInIframe = window !== window.top || window.self !== window.parent;
    if (isInIframe) {
        return;
    }

    // Get saved state
    function getPosition() {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.position);
            return saved ? JSON.parse(saved) : DEFAULT_POSITION;
        } catch { return DEFAULT_POSITION; }
    }

    function savePosition(pos) {
        try {
            localStorage.setItem(STORAGE_KEYS.position, JSON.stringify(pos));
        } catch {}
    }

    function getSize() {
        try {
            const saved = localStorage.getItem(STORAGE_KEYS.menuSize);
            return saved ? JSON.parse(saved) : DEFAULT_SIZE;
        } catch { return DEFAULT_SIZE; }
    }

    function saveSize(size) {
        try {
            localStorage.setItem(STORAGE_KEYS.menuSize, JSON.stringify(size));
        } catch {}
    }

    function isHidden() {
        if (isWelcomePage) return false;
        try {
            return localStorage.getItem(STORAGE_KEYS.hidden) === 'true';
        } catch { return false; }
    }

    function setHidden(hidden) {
        try {
            localStorage.setItem(STORAGE_KEYS.hidden, hidden ? 'true' : 'false');
        } catch {}
    }

    function getActiveTab() {
        try {
            return localStorage.getItem(STORAGE_KEYS.activeTab) || 'chat';
        } catch { return 'chat'; }
    }

    function setActiveTab(tab) {
        try {
            localStorage.setItem(STORAGE_KEYS.activeTab, tab);
        } catch {}
    }

    // Get current user info
    function getUserInfo() {
        // Try multiple sources for clientId
        const clientId = localStorage.getItem('clientId') 
            || localStorage.getItem('sirco_client_id')
            || localStorage.getItem('accessCookieId') // Fallback to accessCookieId as identifier
            || null;
        return {
            clientId,
            username: localStorage.getItem('username') || 'Anonymous',
            accessCookieId: localStorage.getItem('accessCookieId') || null
        };
    }

    // Inject styles
    const styles = `
        .sirco-menu-btn {
            position: fixed;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            cursor: pointer;
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s, box-shadow 0.2s;
            touch-action: none;
        }
        .sirco-menu-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
        }
        .sirco-menu-btn svg {
            width: 28px;
            height: 28px;
            fill: white;
        }
        .sirco-menu-btn.open svg.menu-icon { display: none; }
        .sirco-menu-btn.open svg.close-icon { display: block; }
        .sirco-menu-btn svg.close-icon { display: none; }
        
        .sirco-notification-badge {
            position: absolute;
            top: -4px;
            right: -4px;
            min-width: 20px;
            height: 20px;
            padding: 0 6px;
            border-radius: 10px;
            background: #ff3b30;
            color: white;
            font-size: 12px;
            font-weight: 600;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: none;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(255, 59, 48, 0.4);
            box-sizing: border-box;
        }
        .sirco-notification-badge.visible {
            display: flex;
        }

        .sirco-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 99998;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s, visibility 0.3s;
            pointer-events: none;
            backdrop-filter: blur(4px);
        }
        .sirco-overlay.visible {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
        }

        .sirco-menu-panel {
            position: fixed;
            background: #1e1e2e;
            border-radius: 16px;
            box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
            z-index: 100000;
            display: none;
            flex-direction: column;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #cdd6f4;
        }
        .sirco-menu-panel.visible {
            display: flex;
        }

        .sirco-menu-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 16px;
            background: #313244;
            cursor: move;
            user-select: none;
        }
        .sirco-menu-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: #cdd6f4;
        }
        .sirco-menu-header-actions {
            display: flex;
            gap: 8px;
        }
        .sirco-menu-header-actions button {
            background: rgba(255,255,255,0.1);
            border: none;
            border-radius: 6px;
            width: 28px;
            height: 28px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }
        .sirco-menu-header-actions button:hover {
            background: rgba(255,255,255,0.2);
        }
        .sirco-menu-header-actions button svg {
            width: 16px;
            height: 16px;
            fill: #cdd6f4;
        }

        .sirco-menu-tabs {
            display: flex;
            background: #1e1e2e;
            border-bottom: 1px solid #313244;
        }
        .sirco-menu-tab {
            flex: 1;
            padding: 12px;
            background: none;
            border: none;
            color: #6c7086;
            font-size: 13px;
            cursor: pointer;
            transition: color 0.2s, background 0.2s;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
        }
        .sirco-menu-tab:hover {
            color: #cdd6f4;
            background: rgba(255,255,255,0.05);
        }
        .sirco-menu-tab.active {
            color: #89b4fa;
            background: rgba(137, 180, 250, 0.1);
            border-bottom: 2px solid #89b4fa;
        }
        .sirco-menu-tab svg {
            width: 20px;
            height: 20px;
            fill: currentColor;
        }

        .sirco-menu-content {
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .sirco-tab-content {
            display: none;
            flex-direction: column;
            height: 100%;
            overflow: hidden;
        }
        .sirco-tab-content.active {
            display: flex;
        }

        /* Chat Tab Styles */
        .sirco-chat-search {
            padding: 12px;
            border-bottom: 1px solid #313244;
        }
        .sirco-chat-search input {
            width: 100%;
            padding: 10px 14px;
            border: 1px solid #45475a;
            border-radius: 8px;
            background: #313244;
            color: #cdd6f4;
            font-size: 14px;
            box-sizing: border-box;
        }
        .sirco-chat-search input::placeholder {
            color: #6c7086;
        }
        .sirco-chat-search input:focus {
            outline: none;
            border-color: #89b4fa;
        }

        .sirco-chat-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
        }
        .sirco-chat-item {
            display: flex;
            align-items: center;
            padding: 10px 12px;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s;
            gap: 10px;
        }
        .sirco-chat-item:hover {
            background: rgba(255,255,255,0.05);
        }
        .sirco-chat-item.active {
            background: rgba(137, 180, 250, 0.15);
        }
        .sirco-chat-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 600;
            color: white;
        }
        .sirco-chat-info {
            flex: 1;
            min-width: 0;
        }
        .sirco-chat-name {
            font-size: 14px;
            font-weight: 500;
            color: #cdd6f4;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .sirco-chat-preview {
            font-size: 12px;
            color: #6c7086;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .sirco-chat-time {
            font-size: 11px;
            color: #6c7086;
        }

        .sirco-chat-view {
            display: none;
            flex-direction: column;
            height: 100%;
        }
        .sirco-chat-view.active {
            display: flex;
        }
        .sirco-chat-header {
            display: flex;
            align-items: center;
            padding: 12px;
            border-bottom: 1px solid #313244;
            gap: 10px;
        }
        .sirco-chat-back {
            background: none;
            border: none;
            color: #89b4fa;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
        }
        .sirco-chat-back:hover {
            background: rgba(137, 180, 250, 0.1);
        }
        .sirco-chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .sirco-message {
            max-width: 80%;
            padding: 10px 14px;
            border-radius: 12px;
            font-size: 14px;
            line-height: 1.4;
            word-wrap: break-word;
        }
        .sirco-message.sent {
            align-self: flex-end;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-bottom-right-radius: 4px;
        }
        .sirco-message.received {
            align-self: flex-start;
            background: #313244;
            color: #cdd6f4;
            border-bottom-left-radius: 4px;
        }
        .sirco-message img {
            max-width: 100%;
            max-height: 200px;
            border-radius: 8px;
            margin-top: 4px;
        }
        .sirco-chat-input-area {
            display: flex;
            gap: 8px;
            padding: 12px;
            border-top: 1px solid #313244;
        }
        .sirco-chat-input-area input {
            flex: 1;
            padding: 10px 14px;
            border: 1px solid #45475a;
            border-radius: 8px;
            background: #313244;
            color: #cdd6f4;
            font-size: 14px;
        }
        .sirco-chat-input-area input:focus {
            outline: none;
            border-color: #89b4fa;
        }
        .sirco-chat-input-area button {
            padding: 10px 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }
        .sirco-chat-input-area button:hover {
            opacity: 0.9;
        }

        .sirco-chat-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 20px;
            text-align: center;
            color: #6c7086;
        }
        .sirco-chat-empty svg {
            width: 48px;
            height: 48px;
            margin-bottom: 12px;
            fill: #45475a;
        }

        /* AI Tab Styles */
        .sirco-ai-messages {
            flex: 1;
            overflow-y: auto;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .sirco-ai-message {
            padding: 12px;
            border-radius: 12px;
            font-size: 14px;
            line-height: 1.5;
        }
        .sirco-ai-message.user {
            align-self: flex-end;
            max-width: 85%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .sirco-ai-message.assistant {
            align-self: flex-start;
            background: #313244;
            color: #cdd6f4;
        }
        .sirco-ai-message pre {
            background: #1e1e2e;
            padding: 8px;
            border-radius: 6px;
            overflow-x: auto;
            font-size: 12px;
        }
        .sirco-ai-message code {
            font-family: 'Fira Code', monospace;
        }
        .sirco-ai-input-area {
            display: flex;
            gap: 8px;
            padding: 12px;
            border-top: 1px solid #313244;
        }
        .sirco-ai-input-area textarea {
            flex: 1;
            padding: 10px 14px;
            border: 1px solid #45475a;
            border-radius: 8px;
            background: #313244;
            color: #cdd6f4;
            font-size: 14px;
            resize: none;
            min-height: 40px;
            max-height: 120px;
            font-family: inherit;
        }
        .sirco-ai-input-area textarea:focus {
            outline: none;
            border-color: #89b4fa;
        }
        .sirco-ai-input-area button {
            padding: 10px 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 8px;
            color: white;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            align-self: flex-end;
        }
        .sirco-ai-thinking {
            text-align: center;
            padding: 12px;
            color: #6c7086;
            font-size: 13px;
        }
        .sirco-ai-model-select {
            padding: 8px 12px;
            border-bottom: 1px solid #313244;
        }
        .sirco-ai-model-select select {
            width: 100%;
            padding: 8px 10px;
            border: 1px solid #45475a;
            border-radius: 6px;
            background: #313244;
            color: #cdd6f4;
            font-size: 13px;
        }

        /* Shortcuts Tab Styles */
        .sirco-shortcuts-content {
            padding: 16px;
            overflow-y: auto;
        }
        .sirco-shortcut-section {
            background: #313244;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 12px;
        }
        .sirco-shortcut-section h4 {
            margin: 0 0 12px 0;
            font-size: 14px;
            color: #89b4fa;
        }
        .sirco-shortcut-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
        }
        .sirco-shortcut-row label {
            font-size: 13px;
            color: #a6adc8;
        }
        .sirco-shortcut-row input[type="checkbox"] {
            width: 16px;
            height: 16px;
            accent-color: #89b4fa;
        }
        .sirco-shortcut-row input[type="text"] {
            padding: 6px 10px;
            border: 1px solid #45475a;
            border-radius: 6px;
            background: #1e1e2e;
            color: #cdd6f4;
            font-size: 13px;
            width: 50px;
            text-align: center;
        }
        .sirco-shortcut-actions {
            display: flex;
            gap: 8px;
            margin-top: 8px;
        }
        .sirco-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
            transition: opacity 0.2s;
        }
        .sirco-btn:hover {
            opacity: 0.85;
        }
        .sirco-btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .sirco-btn-secondary {
            background: #45475a;
            color: #cdd6f4;
        }

        .sirco-shortcut-current {
            font-size: 12px;
            color: #6c7086;
            margin-top: 8px;
            padding: 8px;
            background: #1e1e2e;
            border-radius: 6px;
        }

        /* Chat Sub-tabs */
        .sirco-chat-subtabs {
            display: flex;
            border-bottom: 1px solid #313244;
            background: #1e1e2e;
        }
        .sirco-chat-subtab {
            flex: 1;
            padding: 10px 12px;
            background: none;
            border: none;
            color: #6c7086;
            font-size: 13px;
            cursor: pointer;
            transition: color 0.2s, background 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        .sirco-chat-subtab:hover {
            color: #cdd6f4;
            background: rgba(255,255,255,0.05);
        }
        .sirco-chat-subtab.active {
            color: #89b4fa;
            background: rgba(137, 180, 250, 0.1);
            border-bottom: 2px solid #89b4fa;
        }
        .sirco-chat-subtab-content {
            display: none;
            flex-direction: column;
            flex: 1;
            overflow: hidden;
        }
        .sirco-chat-subtab-content.active {
            display: flex;
        }
        .sirco-request-count {
            background: #f38ba8;
            color: white;
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 10px;
            font-weight: 600;
        }
        .sirco-request-item {
            display: flex;
            align-items: center;
            padding: 12px;
            border-bottom: 1px solid #313244;
            gap: 10px;
        }
        .sirco-request-item:last-child {
            border-bottom: none;
        }
        .sirco-request-info {
            flex: 1;
        }
        .sirco-request-name {
            font-size: 14px;
            font-weight: 500;
            color: #cdd6f4;
        }
        .sirco-request-time {
            font-size: 11px;
            color: #6c7086;
        }
        .sirco-request-actions {
            display: flex;
            gap: 6px;
        }
        .sirco-request-btn {
            padding: 6px 12px;
            border: none;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            font-weight: 500;
        }
        .sirco-request-btn.accept {
            background: #a6e3a1;
            color: #1e1e2e;
        }
        .sirco-request-btn.decline {
            background: #f38ba8;
            color: #1e1e2e;
        }
        .sirco-request-btn:hover {
            opacity: 0.85;
        }
        .sirco-requests-list {
            flex: 1;
            overflow-y: auto;
        }
        .sirco-pending-status {
            font-size: 11px;
            color: #fab387;
            margin-top: 4px;
        }

        /* Settings section */
        .sirco-settings-section {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #45475a;
        }
        .sirco-settings-section h4 {
            margin: 0 0 8px 0;
            font-size: 13px;
            color: #a6adc8;
        }

        /* Resize handle */
        .sirco-resize-handle {
            position: absolute;
            width: 16px;
            height: 16px;
            bottom: 0;
            right: 0;
            cursor: nwse-resize;
            background: transparent;
        }
        .sirco-resize-handle::after {
            content: '';
            position: absolute;
            bottom: 4px;
            right: 4px;
            width: 8px;
            height: 8px;
            border-right: 2px solid #6c7086;
            border-bottom: 2px solid #6c7086;
        }

        /* Request popup */
        .sirco-request-popup {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #1e1e2e;
            border-radius: 16px;
            padding: 24px;
            z-index: 100001;
            box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
            text-align: center;
            max-width: 300px;
        }
        .sirco-request-popup h3 {
            margin: 0 0 8px 0;
            color: #cdd6f4;
        }
        .sirco-request-popup p {
            margin: 0 0 16px 0;
            color: #a6adc8;
            font-size: 14px;
        }
        .sirco-request-popup-actions {
            display: flex;
            gap: 8px;
            justify-content: center;
        }

        /* User search results */
        .sirco-user-results {
            padding: 8px;
            max-height: 200px;
            overflow-y: auto;
        }
        .sirco-user-item {
            display: flex;
            align-items: center;
            padding: 10px 12px;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s;
            gap: 10px;
        }
        .sirco-user-item:hover {
            background: rgba(255,255,255,0.05);
        }

        /* Pending requests badge */
        .sirco-pending-badge {
            background: #f38ba8;
            color: white;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 10px;
            margin-left: 4px;
        }

        /* Scrollbar styling */
        .sirco-menu-panel ::-webkit-scrollbar {
            width: 6px;
        }
        .sirco-menu-panel ::-webkit-scrollbar-track {
            background: transparent;
        }
        .sirco-menu-panel ::-webkit-scrollbar-thumb {
            background: #45475a;
            border-radius: 3px;
        }
        .sirco-menu-panel ::-webkit-scrollbar-thumb:hover {
            background: #585b70;
        }

        /* Settings Tab Styles */
        .sirco-settings-content {
            padding: 16px;
            overflow-y: auto;
            flex: 1;
        }
        .sirco-setting-card {
            background: #313244;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 12px;
        }
        .sirco-setting-card.data-saver {
            border: 2px solid transparent;
            transition: border-color 0.3s;
        }
        .sirco-setting-card.data-saver.active {
            border-color: #a6e3a1;
        }
        .sirco-setting-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }
        .sirco-setting-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #a6e3a1 0%, #94e2d5 100%);
        }
        .sirco-setting-icon svg {
            width: 28px;
            height: 28px;
            fill: #1e1e2e;
        }
        .sirco-setting-icon.savings {
            background: linear-gradient(135deg, #f9e2af 0%, #fab387 100%);
        }
        .sirco-setting-info h4 {
            margin: 0 0 4px 0;
            font-size: 16px;
            color: #cdd6f4;
        }
        .sirco-setting-info p {
            margin: 0;
            font-size: 12px;
            color: #6c7086;
        }
        .sirco-toggle-switch {
            position: relative;
            width: 52px;
            height: 28px;
            margin-left: auto;
        }
        .sirco-toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .sirco-toggle-slider {
            position: absolute;
            cursor: pointer;
            inset: 0;
            background: #45475a;
            border-radius: 28px;
            transition: 0.3s;
        }
        .sirco-toggle-slider:before {
            position: absolute;
            content: "";
            height: 22px;
            width: 22px;
            left: 3px;
            bottom: 3px;
            background: #cdd6f4;
            border-radius: 50%;
            transition: 0.3s;
        }
        .sirco-toggle-switch input:checked + .sirco-toggle-slider {
            background: linear-gradient(135deg, #a6e3a1 0%, #94e2d5 100%);
        }
        .sirco-toggle-switch input:checked + .sirco-toggle-slider:before {
            transform: translateX(24px);
            background: #1e1e2e;
        }
        .sirco-data-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #45475a;
        }
        .sirco-stat-box {
            background: #1e1e2e;
            border-radius: 8px;
            padding: 12px;
            text-align: center;
        }
        .sirco-stat-value {
            font-size: 20px;
            font-weight: 600;
            color: #a6e3a1;
            margin-bottom: 4px;
        }
        .sirco-stat-label {
            font-size: 11px;
            color: #6c7086;
            text-transform: uppercase;
        }
        .sirco-savings-banner {
            background: linear-gradient(135deg, #a6e3a1 0%, #94e2d5 100%);
            border-radius: 8px;
            padding: 12px 16px;
            margin-top: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            color: #1e1e2e;
        }
        .sirco-savings-banner svg {
            width: 24px;
            height: 24px;
            fill: #1e1e2e;
        }
        .sirco-savings-banner span {
            font-size: 13px;
            font-weight: 500;
        }
        .sirco-cache-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }
        .sirco-cache-btn {
            flex: 1;
            padding: 10px;
            border: none;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: opacity 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        .sirco-cache-btn svg {
            width: 16px;
            height: 16px;
        }
        .sirco-cache-btn.clear {
            background: #f38ba8;
            color: #1e1e2e;
        }
        .sirco-cache-btn.clear svg {
            fill: #1e1e2e;
        }
        .sirco-cache-btn.preload {
            background: #89b4fa;
            color: #1e1e2e;
        }
        .sirco-cache-btn.preload svg {
            fill: #1e1e2e;
        }
        .sirco-cache-btn:hover {
            opacity: 0.85;
        }
        .sirco-data-saver-features {
            margin-top: 12px;
        }
        .sirco-feature-item {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 0;
            font-size: 13px;
            color: #a6adc8;
        }
        .sirco-feature-item svg {
            width: 16px;
            height: 16px;
            fill: #a6e3a1;
        }
        @keyframes sirco-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .sirco-cache-btn svg.spin {
            animation: sirco-spin 1s linear infinite;
        }
    `;

    // Inject styles
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    // Create DOM elements
    const overlay = document.createElement('div');
    overlay.className = 'sirco-overlay';
    document.body.appendChild(overlay);

    const menuBtn = document.createElement('button');
    menuBtn.className = 'sirco-menu-btn';
    menuBtn.innerHTML = `
        <svg class="menu-icon" viewBox="0 0 24 24"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>
        <svg class="close-icon" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        <span class="sirco-notification-badge" id="sirco-notif-badge">0</span>
    `;
    document.body.appendChild(menuBtn);

    const panel = document.createElement('div');
    panel.className = 'sirco-menu-panel';
    panel.innerHTML = `
        <div class="sirco-menu-header">
            <h3>Sirco Menu</h3>
            <div class="sirco-menu-header-actions">
                <button class="sirco-reset-pos" title="Reset position">
                    <svg viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
                </button>
                <button class="sirco-hide-menu" title="Hide menu">
                    <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                </button>
            </div>
        </div>
        <div class="sirco-menu-tabs">
            <button class="sirco-menu-tab active" data-tab="chat">
                <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
                <span>Chat</span>
            </button>
            <button class="sirco-menu-tab" data-tab="ai">
                <svg viewBox="0 0 24 24"><path d="M21 10.12h-6.78l2.74-2.82c-2.73-2.7-7.15-2.8-9.88-.1-2.73 2.71-2.73 7.08 0 9.79s7.15 2.71 9.88 0C18.32 15.65 19 14.08 19 12.1h2c0 1.98-.88 4.55-2.64 6.29-3.51 3.48-9.21 3.48-12.72 0-3.5-3.47-3.53-9.11-.02-12.58s9.14-3.47 12.65 0L21 3v7.12z"/></svg>
                <span>AI</span>
            </button>
            <button class="sirco-menu-tab" data-tab="shortcuts">
                <svg viewBox="0 0 24 24"><path d="M15 7.5V2H9v5.5l3 3 3-3zM7.5 9H2v6h5.5l3-3-3-3zM9 16.5V22h6v-5.5l-3-3-3 3zM16.5 9l-3 3 3 3H22V9h-5.5z"/></svg>
                <span>Shortcuts</span>
            </button>
            <button class="sirco-menu-tab" data-tab="settings">
                <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
                <span>Settings</span>
            </button>
        </div>
        <div class="sirco-menu-content">
            <!-- Chat Tab -->
            <div class="sirco-tab-content active" data-content="chat">
                <div class="sirco-chat-list-view">
                    <!-- Sub-tabs for Chats and Requests -->
                    <div class="sirco-chat-subtabs">
                        <button class="sirco-chat-subtab active" data-subtab="chats">Chats</button>
                        <button class="sirco-chat-subtab" data-subtab="requests">Requests <span class="sirco-request-count" id="sirco-request-count" style="display:none;">0</span></button>
                    </div>
                    
                    <!-- Chats Sub-tab -->
                    <div class="sirco-chat-subtab-content active" data-subcontent="chats">
                        <div class="sirco-chat-search">
                            <input type="text" placeholder="Search users by name or ID..." id="sirco-user-search">
                        </div>
                        <div class="sirco-user-results" id="sirco-user-results" style="display: none;"></div>
                        <div class="sirco-chat-list" id="sirco-chat-list">
                            <div class="sirco-chat-empty">
                                <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
                                <p>No conversations yet</p>
                                <span>Search for users to start chatting</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Requests Sub-tab -->
                    <div class="sirco-chat-subtab-content" data-subcontent="requests">
                        <div class="sirco-requests-list" id="sirco-requests-list">
                            <div class="sirco-chat-empty">
                                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                <p>No pending requests</p>
                                <span>Chat requests will appear here</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="sirco-chat-view" id="sirco-chat-view">
                    <div class="sirco-chat-header">
                        <button class="sirco-chat-back" id="sirco-chat-back">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                        </button>
                        <div class="sirco-chat-avatar" id="sirco-chat-partner-avatar">?</div>
                        <div class="sirco-chat-info">
                            <div class="sirco-chat-name" id="sirco-chat-partner-name">User</div>
                        </div>
                    </div>
                    <div class="sirco-chat-messages" id="sirco-chat-messages"></div>
                    <div class="sirco-chat-input-area">
                        <input type="text" placeholder="Type a message..." id="sirco-chat-input">
                        <button id="sirco-chat-send">Send</button>
                    </div>
                </div>
            </div>

            <!-- AI Tab -->
            <div class="sirco-tab-content" data-content="ai">
                <div class="sirco-ai-model-select">
                    <select id="sirco-ai-model">
                        <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>
                        <option value="llama-3.1-8b-instant">llama-3.1-8b-instant</option>
                        <option value="deepseek-r1-distill-llama-70b">deepseek-r1-distill-llama-70b</option>
                        <option value="qwen/qwen3-32b">qwen/qwen3-32b</option>
                    </select>
                </div>
                <div class="sirco-ai-messages" id="sirco-ai-messages"></div>
                <div class="sirco-ai-input-area">
                    <textarea id="sirco-ai-input" placeholder="Ask AI anything..." rows="1"></textarea>
                    <button id="sirco-ai-send">Send</button>
                </div>
            </div>

            <!-- Shortcuts Tab -->
            <div class="sirco-tab-content" data-content="shortcuts">
                <div class="sirco-shortcuts-content">
                    <div class="sirco-shortcut-section">
                        <h4>Panic Shortcut</h4>
                        <p style="font-size: 12px; color: #6c7086; margin-bottom: 12px;">Press the shortcut to remove access and optionally redirect</p>
                        <div class="sirco-shortcut-row">
                            <label><input type="checkbox" id="sirco-mod-ctrl"> Ctrl</label>
                            <label><input type="checkbox" id="sirco-mod-alt" checked> Alt</label>
                            <label><input type="checkbox" id="sirco-mod-shift"> Shift</label>
                            <label><input type="checkbox" id="sirco-mod-meta"> Meta</label>
                        </div>
                        <div class="sirco-shortcut-row">
                            <label>Key:</label>
                            <input type="text" id="sirco-shortcut-key" value="p" maxlength="1">
                        </div>
                        <div class="sirco-shortcut-row" style="flex-direction: column; align-items: flex-start; gap: 4px;">
                            <label><input type="radio" name="sirco-action" value="none"> No redirect</label>
                            <label><input type="radio" name="sirco-action" value="goto" checked> Go home</label>
                            <label><input type="radio" name="sirco-action" value="google"> Google</label>
                            <label><input type="radio" name="sirco-action" value="custom"> Custom URL:</label>
                            <input type="text" id="sirco-custom-url" placeholder="https://..." style="width: 100%;">
                        </div>
                        <div class="sirco-shortcut-actions">
                            <button class="sirco-btn sirco-btn-primary" id="sirco-save-shortcut">Save</button>
                            <button class="sirco-btn sirco-btn-secondary" id="sirco-reset-shortcut">Reset</button>
                        </div>
                        <div class="sirco-shortcut-current" id="sirco-shortcut-display">Current: Alt + P</div>
                    </div>

                    <div class="sirco-shortcut-section sirco-settings-section">
                        <h4>Menu Settings</h4>
                        <div class="sirco-shortcut-row">
                            <label style="flex: 1;">
                                <input type="checkbox" id="sirco-hide-on-other-pages" ${!isWelcomePage && isHidden() ? 'checked' : ''}>
                                Hide menu on other pages
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Settings Tab -->
            <div class="sirco-tab-content" data-content="settings">
                <div class="sirco-settings-content">
                    <!-- Data Saver Card -->
                    <div class="sirco-setting-card data-saver" id="sirco-data-saver-card">
                        <div class="sirco-setting-header">
                            <div class="sirco-setting-icon">
                                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                            </div>
                            <div class="sirco-setting-info">
                                <h4>Data Saver</h4>
                                <p>Skip network requests for cached pages</p>
                            </div>
                            <label class="sirco-toggle-switch">
                                <input type="checkbox" id="sirco-data-saver-toggle">
                                <span class="sirco-toggle-slider"></span>
                            </label>
                        </div>
                        
                        <div class="sirco-data-saver-features">
                            <div class="sirco-feature-item">
                                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                                <span>NO network requests for cached pages</span>
                            </div>
                            <div class="sirco-feature-item">
                                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                                <span>Loads instantly from local cache</span>
                            </div>
                            <div class="sirco-feature-item">
                                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                                <span>New pages still get cached</span>
                            </div>
                            <div class="sirco-feature-item">
                                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                                <span>Works offline for visited pages</span>
                            </div>
                            <div class="sirco-feature-item">
                                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                                <span>Reduces API calls by 5-12x</span>
                            </div>
                        </div>

                        <div class="sirco-data-stats">
                            <div class="sirco-stat-box">
                                <div class="sirco-stat-value" id="sirco-data-saved">0 MB</div>
                                <div class="sirco-stat-label">Data Saved</div>
                            </div>
                            <div class="sirco-stat-box">
                                <div class="sirco-stat-value" id="sirco-pages-cached">0</div>
                                <div class="sirco-stat-label">Pages Cached</div>
                            </div>
                        </div>

                        <div class="sirco-cache-actions" style="justify-content: center;">
                            <button class="sirco-cache-btn clear" id="sirco-refresh-stats">
                                <svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                                Refresh Stats
                            </button>
                        </div>
                        
                        <p style="font-size: 11px; color: #888; text-align: center; margin-top: 12px;">
                            💡 Visit pages once to cache them, then Data Saver serves them without using any data!
                        </p>
                    </div>

                    <!-- Savings Banner (shown when data saver is on) -->
                    <div class="sirco-savings-banner" id="sirco-savings-banner" style="display: none;">
                        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        <span id="sirco-savings-text">Data Saver ON: Cache-first + API throttling active!</span>
                    </div>

                    <!-- API Polling Info -->
                    <div class="sirco-polling-info" id="sirco-polling-info" style="display: none; padding: 8px 12px; background: rgba(30,144,255,0.1); border-radius: 8px; margin-top: 12px; font-size: 11px; color: #888;">
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#1e90ff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                            <span style="color: #1e90ff; font-weight: 600;">API Polling Intervals</span>
                        </div>
                        <div id="sirco-polling-values" style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                            <!-- Populated by JS -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="sirco-resize-handle"></div>
    `;
    document.body.appendChild(panel);

    // State
    let isOpen = false;
    let isDragging = false;
    let isResizing = false;
    let dragOffset = { x: 0, y: 0 };
    let currentChatUser = null;
    let conversations = [];
    let chatPollingInterval = null;

    // Position and size
    const pos = getPosition();
    const size = getSize();
    
    // Apply initial button position
    menuBtn.style.right = pos.right + 'px';
    menuBtn.style.bottom = pos.bottom + 'px';

    // Apply initial panel size
    panel.style.width = size.width + 'px';
    panel.style.height = size.height + 'px';

    // Check if hidden
    if (isHidden()) {
        menuBtn.style.display = 'none';
    }

    // Position panel relative to button
    function updatePanelPosition() {
        const btnRect = menuBtn.getBoundingClientRect();
        panel.style.right = (window.innerWidth - btnRect.right) + 'px';
        panel.style.bottom = (window.innerHeight - btnRect.top + 10) + 'px';
    }

    // Toggle menu
    function toggleMenu() {
        isOpen = !isOpen;
        menuBtn.classList.toggle('open', isOpen);
        overlay.classList.toggle('visible', isOpen);
        panel.classList.toggle('visible', isOpen);
        if (isOpen) {
            updatePanelPosition();
            loadConversations();
        }
    }

    menuBtn.addEventListener('click', (e) => {
        if (!isDragging) toggleMenu();
    });

    overlay.addEventListener('click', () => {
        if (isOpen) toggleMenu();
    });

    // Dragging
    let dragStartX, dragStartY;
    let wasDragged = false;

    menuBtn.addEventListener('mousedown', (e) => {
        isDragging = true;
        wasDragged = false;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        const rect = menuBtn.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging && !isResizing) {
            const dx = Math.abs(e.clientX - dragStartX);
            const dy = Math.abs(e.clientY - dragStartY);
            if (dx > 5 || dy > 5) wasDragged = true;

            const x = e.clientX - dragOffset.x;
            const y = e.clientY - dragOffset.y;
            const btnWidth = menuBtn.offsetWidth;
            const btnHeight = menuBtn.offsetHeight;

            const right = Math.max(0, Math.min(window.innerWidth - btnWidth, window.innerWidth - x - btnWidth));
            const bottom = Math.max(0, Math.min(window.innerHeight - btnHeight, window.innerHeight - y - btnHeight));

            menuBtn.style.right = right + 'px';
            menuBtn.style.bottom = bottom + 'px';
            menuBtn.style.left = 'auto';
            menuBtn.style.top = 'auto';

            if (isOpen) updatePanelPosition();
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (isDragging) {
            const pos = {
                right: parseInt(menuBtn.style.right) || 20,
                bottom: parseInt(menuBtn.style.bottom) || 20
            };
            savePosition(pos);
            
            if (wasDragged) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
        isDragging = false;
    });

    // Resizing
    const resizeHandle = panel.querySelector('.sirco-resize-handle');
    let resizeStartW, resizeStartH, resizeStartX, resizeStartY;

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizeStartW = panel.offsetWidth;
        resizeStartH = panel.offsetHeight;
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        e.preventDefault();
        e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
        if (isResizing) {
            // Since we position from right/bottom, we need to invert the deltas
            const dw = resizeStartX - e.clientX;
            const dh = resizeStartY - e.clientY;
            const newW = Math.max(MIN_SIZE.width, Math.min(MAX_SIZE.width, resizeStartW + dw));
            const newH = Math.max(MIN_SIZE.height, Math.min(MAX_SIZE.height, resizeStartH + dh));
            panel.style.width = newW + 'px';
            panel.style.height = newH + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            saveSize({
                width: panel.offsetWidth,
                height: panel.offsetHeight
            });
        }
        isResizing = false;
    });

    // Tab switching
    const tabs = panel.querySelectorAll('.sirco-menu-tab');
    const tabContents = panel.querySelectorAll('.sirco-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            panel.querySelector(`.sirco-tab-content[data-content="${tabName}"]`).classList.add('active');
            setActiveTab(tabName);
        });
    });

    // Set initial active tab
    const savedTab = getActiveTab();
    const savedTabBtn = panel.querySelector(`.sirco-menu-tab[data-tab="${savedTab}"]`);
    if (savedTabBtn) savedTabBtn.click();

    // Reset position
    panel.querySelector('.sirco-reset-pos').addEventListener('click', () => {
        menuBtn.style.right = DEFAULT_POSITION.right + 'px';
        menuBtn.style.bottom = DEFAULT_POSITION.bottom + 'px';
        savePosition(DEFAULT_POSITION);
        panel.style.width = DEFAULT_SIZE.width + 'px';
        panel.style.height = DEFAULT_SIZE.height + 'px';
        saveSize(DEFAULT_SIZE);
        updatePanelPosition();
    });

    // Hide menu
    panel.querySelector('.sirco-hide-menu').addEventListener('click', () => {
        if (isWelcomePage) {
            alert('Menu cannot be hidden on the welcome page');
            return;
        }
        setHidden(true);
        menuBtn.style.display = 'none';
        toggleMenu();
    });

    // Hide menu checkbox
    const hideCheckbox = document.getElementById('sirco-hide-on-other-pages');
    if (hideCheckbox) {
        hideCheckbox.addEventListener('change', () => {
            setHidden(hideCheckbox.checked);
            if (hideCheckbox.checked && !isWelcomePage) {
                menuBtn.style.display = 'none';
                toggleMenu();
            } else {
                menuBtn.style.display = 'flex';
            }
        });
    }

    // ==================== CHAT SUBTABS ====================
    const chatSubtabs = panel.querySelectorAll('.sirco-chat-subtab');
    const chatSubtabContents = panel.querySelectorAll('.sirco-chat-subtab-content');

    chatSubtabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const subtabName = tab.dataset.subtab;
            chatSubtabs.forEach(t => t.classList.remove('active'));
            chatSubtabContents.forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            panel.querySelector(`.sirco-chat-subtab-content[data-subcontent="${subtabName}"]`).classList.add('active');
            
            if (subtabName === 'requests') {
                loadChatRequests();
            }
        });
    });

    // ==================== CHAT FUNCTIONALITY ====================
    let pendingRequests = [];

    async function loadConversations() {
        const user = getUserInfo();
        if (!user.clientId) return;

        try {
            const res = await fetch('/api/chat/conversations?clientId=' + encodeURIComponent(user.clientId));
            if (res.ok) {
                const data = await res.json();
                conversations = data.conversations || [];
                renderConversations();
            }
        } catch (e) {
            console.error('Failed to load conversations:', e);
        }
        
        // Also load request count
        loadChatRequests();
    }

    async function loadChatRequests() {
        const user = getUserInfo();
        if (!user.clientId) return;

        try {
            const res = await fetch('/api/chat/requests?clientId=' + encodeURIComponent(user.clientId));
            if (res.ok) {
                const data = await res.json();
                pendingRequests = data.requests || [];
                renderChatRequests();
                updateRequestCount();
            }
        } catch (e) {
            console.error('Failed to load requests:', e);
        }
    }

    function updateRequestCount() {
        const countEl = document.getElementById('sirco-request-count');
        if (countEl) {
            if (pendingRequests.length > 0) {
                countEl.textContent = pendingRequests.length;
                countEl.style.display = 'inline';
            } else {
                countEl.style.display = 'none';
            }
        }
        // Also update the notification badge on the menu button
        updateNotificationBadge();
    }
    
    function updateNotificationBadge() {
        const badge = document.getElementById('sirco-notif-badge');
        if (!badge) return;
        
        // Count pending requests + unread messages
        const totalNotifications = pendingRequests.length;
        
        if (totalNotifications > 0) {
            badge.textContent = totalNotifications > 99 ? '99+' : totalNotifications;
            badge.classList.add('visible');
        } else {
            badge.classList.remove('visible');
        }
    }

    function renderChatRequests() {
        const listEl = document.getElementById('sirco-requests-list');
        if (!listEl) return;

        if (pendingRequests.length === 0) {
            listEl.innerHTML = `
                <div class="sirco-chat-empty">
                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    <p>No pending requests</p>
                    <span>Chat requests will appear here</span>
                </div>
            `;
            return;
        }

        listEl.innerHTML = pendingRequests.map(req => {
            const initial = (req.fromName || 'U')[0].toUpperCase();
            const time = new Date(req.createdAt).toLocaleString();
            return `
                <div class="sirco-request-item" data-request-id="${req.requestId}">
                    <div class="sirco-chat-avatar">${initial}</div>
                    <div class="sirco-request-info">
                        <div class="sirco-request-name">${req.fromName || 'Unknown'}</div>
                        <div class="sirco-request-time">${time}</div>
                    </div>
                    <div class="sirco-request-actions">
                        <button class="sirco-request-btn accept" data-action="accept">Accept</button>
                        <button class="sirco-request-btn decline" data-action="decline">Decline</button>
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers
        listEl.querySelectorAll('.sirco-request-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const item = btn.closest('.sirco-request-item');
                const requestId = item.dataset.requestId;
                const action = btn.dataset.action;
                
                if (action === 'accept') {
                    await acceptChatRequest(requestId);
                } else {
                    await declineChatRequest(requestId);
                }
            });
        });
    }

    async function acceptChatRequest(requestId) {
        const user = getUserInfo();
        try {
            const res = await fetch('/api/chat/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, clientId: user.clientId })
            });
            if (res.ok) {
                await loadChatRequests();
                await loadConversations();
                // Switch to chats tab
                chatSubtabs[0].click();
            }
        } catch (e) {
            console.error('Failed to accept request:', e);
        }
    }

    async function declineChatRequest(requestId) {
        const user = getUserInfo();
        try {
            const res = await fetch('/api/chat/decline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, clientId: user.clientId })
            });
            if (res.ok) {
                await loadChatRequests();
            }
        } catch (e) {
            console.error('Failed to decline request:', e);
        }
    }

    function renderConversations() {
        const listEl = document.getElementById('sirco-chat-list');
        if (!listEl) return;

        if (conversations.length === 0) {
            listEl.innerHTML = `
                <div class="sirco-chat-empty">
                    <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
                    <p>No conversations yet</p>
                    <span>Search for users to start chatting</span>
                </div>
            `;
            return;
        }

        listEl.innerHTML = conversations.map(conv => {
            const initial = (conv.partnerName || 'U')[0].toUpperCase();
            const time = conv.lastMessageTime ? new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            return `
                <div class="sirco-chat-item" data-partner-id="${conv.partnerId}">
                    <div class="sirco-chat-avatar">${initial}</div>
                    <div class="sirco-chat-info">
                        <div class="sirco-chat-name">${conv.partnerName || 'Unknown'}</div>
                        <div class="sirco-chat-preview">${conv.lastMessage || ''}</div>
                    </div>
                    <div class="sirco-chat-time">${time}</div>
                </div>
            `;
        }).join('');

        // Add click handlers
        listEl.querySelectorAll('.sirco-chat-item').forEach(item => {
            item.addEventListener('click', () => {
                const partnerId = item.dataset.partnerId;
                const conv = conversations.find(c => c.partnerId === partnerId);
                if (conv) openChat(conv);
            });
        });
    }

    function openChat(conv) {
        currentChatUser = conv;
        document.querySelector('.sirco-chat-list-view').style.display = 'none';
        document.getElementById('sirco-chat-view').classList.add('active');
        document.getElementById('sirco-chat-partner-name').textContent = conv.partnerName || 'Unknown';
        document.getElementById('sirco-chat-partner-avatar').textContent = (conv.partnerName || 'U')[0].toUpperCase();
        loadChatMessages();
        startChatPolling();
    }

    function closeChat() {
        currentChatUser = null;
        document.querySelector('.sirco-chat-list-view').style.display = 'block';
        document.getElementById('sirco-chat-view').classList.remove('active');
        stopChatPolling();
    }

    async function loadChatMessages() {
        if (!currentChatUser) return;
        const user = getUserInfo();

        try {
            const res = await fetch(`/api/chat/messages?clientId=${encodeURIComponent(user.clientId)}&partnerId=${encodeURIComponent(currentChatUser.partnerId)}`);
            if (res.ok) {
                const data = await res.json();
                renderChatMessages(data.messages || []);
            }
        } catch (e) {
            console.error('Failed to load messages:', e);
        }
    }

    function renderChatMessages(messages) {
        const container = document.getElementById('sirco-chat-messages');
        if (!container) return;

        const user = getUserInfo();
        container.innerHTML = messages.map(msg => {
            const isSent = msg.senderId === user.clientId;
            let content = msg.content;
            if (msg.type === 'image') {
                content = `<img src="${msg.content}" alt="Image">`;
            }
            return `<div class="sirco-message ${isSent ? 'sent' : 'received'}">${content}</div>`;
        }).join('');

        container.scrollTop = container.scrollHeight;
    }

    function startChatPolling() {
        stopChatPolling();
        // Use data saver interval if enabled (defined later, default to 3000)
        const dataSaverEnabled = localStorage.getItem('sirco_data_saver_enabled') === 'true';
        const chatInterval = dataSaverEnabled ? 15000 : 3000; // 15s vs 3s
        chatPollingInterval = setInterval(loadChatMessages, chatInterval);
    }

    function stopChatPolling() {
        if (chatPollingInterval) {
            clearInterval(chatPollingInterval);
            chatPollingInterval = null;
        }
    }

    async function sendChatMessage(content) {
        if (!currentChatUser || !content.trim()) return;
        const user = getUserInfo();

        try {
            const res = await fetch('/api/chat/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderId: user.clientId,
                    senderName: user.username,
                    recipientId: currentChatUser.partnerId,
                    content: content.trim(),
                    type: 'text'
                })
            });
            if (res.ok) {
                document.getElementById('sirco-chat-input').value = '';
                loadChatMessages();
            }
        } catch (e) {
            console.error('Failed to send message:', e);
        }
    }

    // User search
    const userSearchInput = document.getElementById('sirco-user-search');
    const userResultsContainer = document.getElementById('sirco-user-results');
    let searchTimeout;

    if (userSearchInput) {
        userSearchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const query = userSearchInput.value.trim();
            if (query.length < 2) {
                userResultsContainer.style.display = 'none';
                return;
            }
            searchTimeout = setTimeout(() => searchUsers(query), 300);
        });
    }

    async function searchUsers(query) {
        try {
            const res = await fetch('/api/chat/search-users?q=' + encodeURIComponent(query));
            if (res.ok) {
                const data = await res.json();
                renderUserResults(data.users || []);
            }
        } catch (e) {
            console.error('Failed to search users:', e);
        }
    }

    function renderUserResults(users) {
        if (!userResultsContainer) return;

        if (users.length === 0) {
            userResultsContainer.innerHTML = '<div style="padding: 12px; color: #6c7086; text-align: center;">No users found</div>';
            userResultsContainer.style.display = 'block';
            return;
        }

        const user = getUserInfo();
        userResultsContainer.innerHTML = users
            .filter(u => u.clientId !== user.clientId)
            .map(u => `
                <div class="sirco-user-item" data-user-id="${u.clientId}" data-user-name="${u.username}">
                    <div class="sirco-chat-avatar">${(u.username || 'U')[0].toUpperCase()}</div>
                    <div class="sirco-chat-info">
                        <div class="sirco-chat-name">${u.username}</div>
                        <div class="sirco-chat-preview">${u.clientId.slice(0, 8)}...</div>
                    </div>
                </div>
            `).join('');

        userResultsContainer.style.display = 'block';

        // Add click handlers
        userResultsContainer.querySelectorAll('.sirco-user-item').forEach(item => {
            item.addEventListener('click', () => {
                const userId = item.dataset.userId;
                const userName = item.dataset.userName;
                startChatWithUser(userId, userName);
            });
        });
    }

    async function startChatWithUser(userId, userName) {
        const user = getUserInfo();
        
        // Check if conversation already exists
        let conv = conversations.find(c => c.partnerId === userId);
        if (conv) {
            openChat(conv);
            userResultsContainer.style.display = 'none';
            userSearchInput.value = '';
            return;
        }

        // Send chat request
        try {
            const res = await fetch('/api/chat/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    initiatorId: user.clientId,
                    initiatorName: user.username,
                    recipientId: userId,
                    recipientName: userName
                })
            });
            if (res.ok) {
                const data = await res.json();
                
                if (data.accepted) {
                    // Conversation was created (either existed or mutual request)
                    conv = {
                        partnerId: userId,
                        partnerName: userName,
                        lastMessage: '',
                        lastMessageTime: Date.now()
                    };
                    conversations.unshift(conv);
                    openChat(conv);
                } else if (data.pending) {
                    // Request was sent, show feedback
                    alert('Chat request sent to ' + userName + '! They need to accept it first.');
                }
                
                userResultsContainer.style.display = 'none';
                userSearchInput.value = '';
                await loadConversations();
            }
        } catch (e) {
            console.error('Failed to start chat:', e);
        }
    }

    // Chat back button
    document.getElementById('sirco-chat-back')?.addEventListener('click', closeChat);

    // Chat send
    document.getElementById('sirco-chat-send')?.addEventListener('click', () => {
        const input = document.getElementById('sirco-chat-input');
        sendChatMessage(input.value);
    });

    document.getElementById('sirco-chat-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage(e.target.value);
        }
    });

    // ==================== AI FUNCTIONALITY ====================

    const aiMessages = [];
    const aiMessagesContainer = document.getElementById('sirco-ai-messages');
    const aiInput = document.getElementById('sirco-ai-input');
    const aiSendBtn = document.getElementById('sirco-ai-send');
    const aiModelSelect = document.getElementById('sirco-ai-model');

    // Load AI history from localStorage
    function loadAIHistory() {
        try {
            const saved = localStorage.getItem('sirco_mini_ai_history');
            if (saved) {
                const history = JSON.parse(saved);
                history.forEach(msg => {
                    aiMessages.push(msg);
                    appendAIMessage(msg.role, msg.content, false);
                });
            }
        } catch {}
    }

    function saveAIHistory() {
        try {
            // Keep only last 20 messages
            const toSave = aiMessages.slice(-20);
            localStorage.setItem('sirco_mini_ai_history', JSON.stringify(toSave));
        } catch {}
    }

    function appendAIMessage(role, content, save = true) {
        if (!aiMessagesContainer) return;

        const div = document.createElement('div');
        div.className = `sirco-ai-message ${role}`;

        // Simple markdown rendering
        let html = content
            .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');

        div.innerHTML = html;
        aiMessagesContainer.appendChild(div);
        aiMessagesContainer.scrollTop = aiMessagesContainer.scrollHeight;

        if (save) {
            aiMessages.push({ role, content });
            saveAIHistory();
        }
    }

    async function sendAIMessage() {
        const content = aiInput.value.trim();
        if (!content) return;

        aiInput.value = '';
        appendAIMessage('user', content);

        // Show thinking
        const thinking = document.createElement('div');
        thinking.className = 'sirco-ai-thinking';
        thinking.textContent = 'AI is thinking...';
        aiMessagesContainer.appendChild(thinking);

        try {
            const model = aiModelSelect?.value || 'llama-3.3-70b-versatile';
            const messages = aiMessages.map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content
            }));

            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, messages })
            });

            thinking.remove();

            if (res.ok) {
                const data = await res.json();
                const reply = data.choices?.[0]?.message?.content || 'No response';
                appendAIMessage('assistant', reply);
            } else {
                appendAIMessage('assistant', 'Error: Failed to get response');
            }
        } catch (e) {
            thinking.remove();
            appendAIMessage('assistant', 'Error: ' + e.message);
        }
    }

    aiSendBtn?.addEventListener('click', sendAIMessage);
    aiInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendAIMessage();
        }
    });

    // Auto-resize textarea
    aiInput?.addEventListener('input', () => {
        aiInput.style.height = 'auto';
        aiInput.style.height = Math.min(aiInput.scrollHeight, 120) + 'px';
    });

    loadAIHistory();

    // ==================== SHORTCUTS FUNCTIONALITY ====================

    const DEFAULT_SHORTCUT = { modifiers: { ctrl: false, alt: true, shift: false, meta: false }, key: 'p', action: 'goto', customURL: '/' };

    function getShortcutConfig() {
        try {
            const saved = localStorage.getItem('shortcut_config');
            return saved ? JSON.parse(saved) : DEFAULT_SHORTCUT;
        } catch { return DEFAULT_SHORTCUT; }
    }

    function saveShortcutConfig(config) {
        try {
            localStorage.setItem('shortcut_config', JSON.stringify(config));
        } catch {}
    }

    function loadShortcutUI() {
        const config = getShortcutConfig();
        document.getElementById('sirco-mod-ctrl').checked = config.modifiers.ctrl;
        document.getElementById('sirco-mod-alt').checked = config.modifiers.alt;
        document.getElementById('sirco-mod-shift').checked = config.modifiers.shift;
        document.getElementById('sirco-mod-meta').checked = config.modifiers.meta;
        document.getElementById('sirco-shortcut-key').value = config.key;
        document.getElementById('sirco-custom-url').value = config.customURL || '';
        
        const actionRadios = document.getElementsByName('sirco-action');
        for (const radio of actionRadios) {
            radio.checked = radio.value === config.action;
        }

        updateShortcutDisplay();
    }

    function updateShortcutDisplay() {
        const config = getShortcutConfig();
        const parts = [];
        if (config.modifiers.ctrl) parts.push('Ctrl');
        if (config.modifiers.alt) parts.push('Alt');
        if (config.modifiers.shift) parts.push('Shift');
        if (config.modifiers.meta) parts.push('Meta');
        parts.push(config.key.toUpperCase());
        document.getElementById('sirco-shortcut-display').textContent = 'Current: ' + parts.join(' + ');
    }

    document.getElementById('sirco-save-shortcut')?.addEventListener('click', () => {
        const action = document.querySelector('input[name="sirco-action"]:checked')?.value || 'goto';
        const config = {
            modifiers: {
                ctrl: document.getElementById('sirco-mod-ctrl').checked,
                alt: document.getElementById('sirco-mod-alt').checked,
                shift: document.getElementById('sirco-mod-shift').checked,
                meta: document.getElementById('sirco-mod-meta').checked
            },
            key: (document.getElementById('sirco-shortcut-key').value || 'p').toLowerCase(),
            action,
            customURL: document.getElementById('sirco-custom-url').value.trim()
        };
        saveShortcutConfig(config);
        updateShortcutDisplay();
        alert('Shortcut saved!');
    });

    document.getElementById('sirco-reset-shortcut')?.addEventListener('click', () => {
        if (confirm('Reset to default (Alt + P)?')) {
            saveShortcutConfig(DEFAULT_SHORTCUT);
            loadShortcutUI();
            alert('Reset to default.');
        }
    });

    loadShortcutUI();

    // ==================== INPUT FOCUS HANDLING ====================
    // Prevent game from capturing keystrokes when typing in menu inputs
    const menuInputs = panel.querySelectorAll('input, textarea');
    menuInputs.forEach(input => {
        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
        });
        input.addEventListener('keyup', (e) => {
            e.stopPropagation();
        });
        input.addEventListener('keypress', (e) => {
            e.stopPropagation();
        });
        // When input is focused, ensure menu panel has focus priority
        input.addEventListener('focus', () => {
            // Blur any iframes to stop them from capturing keys
            document.querySelectorAll('iframe').forEach(iframe => {
                try { iframe.blur(); } catch {}
            });
        });
    });

    // ==================== GLOBAL SHORTCUT LISTENER ====================
    // Use capture phase to intercept before games/iframes can capture
    function handleShortcut(e) {
        const config = getShortcutConfig();
        const match = (
            e.ctrlKey === config.modifiers.ctrl &&
            e.altKey === config.modifiers.alt &&
            e.shiftKey === config.modifiers.shift &&
            e.metaKey === config.modifiers.meta &&
            e.key.toLowerCase() === config.key.toLowerCase()
        );

        if (match) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            console.log('🚨 PANIC SHORTCUT TRIGGERED!');
            
            // Remove access cookie
            document.cookie = 'access=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'access=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=' + window.location.hostname;
            
            // Also clear from localStorage
            localStorage.removeItem('accessCookieId');
            localStorage.removeItem('sirco_user');
            
            // Perform action
            if (config.action === 'goto') {
                window.location.replace('/');
            } else if (config.action === 'google') {
                window.location.replace('https://www.google.com');
            } else if (config.action === 'custom' && config.customURL) {
                const url = config.customURL.startsWith('http') ? config.customURL : 'https://' + config.customURL;
                window.location.replace(url);
            } else if (config.action === 'none') {
                // Just remove cookie and stay
                window.location.reload();
            }
            
            return false;
        }
    }

    // Capture phase listener on document (catches before bubbling)
    document.addEventListener('keydown', handleShortcut, true);
    
    // Also listen on window for extra coverage
    window.addEventListener('keydown', handleShortcut, true);
    
    // Listen on body too
    document.body?.addEventListener('keydown', handleShortcut, true);
    
    // Add listener to all iframes on the page to catch shortcuts inside them
    function addShortcutToIframes() {
        document.querySelectorAll('iframe').forEach(iframe => {
            try {
                if (iframe.contentDocument) {
                    iframe.contentDocument.removeEventListener('keydown', handleShortcut, true);
                    iframe.contentDocument.addEventListener('keydown', handleShortcut, true);
                }
                if (iframe.contentWindow) {
                    iframe.contentWindow.removeEventListener('keydown', handleShortcut, true);
                    iframe.contentWindow.addEventListener('keydown', handleShortcut, true);
                }
            } catch (e) {
                // Cross-origin iframe, can't add listener
            }
        });
    }
    
    // Initial setup
    addShortcutToIframes();
    
    // Re-add listeners when iframes are added to the page
    const iframeObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                setTimeout(addShortcutToIframes, 100);
                setTimeout(addShortcutToIframes, 500);
                setTimeout(addShortcutToIframes, 1000);
            }
        }
    });
    iframeObserver.observe(document.body, { childList: true, subtree: true });
    
    // Periodically re-add listeners (for dynamically loaded iframes)
    setInterval(addShortcutToIframes, 2000);

    // Close menu on escape (use capture)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) {
            e.stopPropagation();
            toggleMenu();
        }
    }, true);
    
    // Periodically check for new messages/requests (every 30 seconds)
    async function checkForNotifications() {
        const user = getUserInfo();
        if (!user.clientId) return;
        
        try {
            const res = await fetch('/api/chat/requests?clientId=' + encodeURIComponent(user.clientId));
            if (res.ok) {
                const data = await res.json();
                pendingRequests = data.requests || [];
                updateNotificationBadge();
            }
        } catch (e) {
            // Silently fail
        }
    }
    
    // ============== FORCE REDIRECT (bypasses beforeunload dialogs) ==============
    function forceRedirect(url) {
        // Remove all beforeunload handlers to bypass "unsaved changes" dialogs
        window.onbeforeunload = null;
        // Remove event listeners added via addEventListener
        window.removeEventListener('beforeunload', () => {});
        // Some sites use these too
        if (window.onunload) window.onunload = null;
        // Force the redirect
        window.location.replace(url);
    }
    
    // ============== SITE STATUS / ANNOUNCEMENT POPUP ==============
    const ANNOUNCEMENT_DISMISSED_KEY = 'sirco_announcement_dismissed';
    
    async function checkSiteStatus() {
        try {
            const res = await fetch('/api/site-status');
            if (!res.ok) return;
            const data = await res.json();
            
            // Handle 404-lockdown - immediately redirect to /index.html if not there
            if (data.status === '404-lockdown') {
                const currentPath = window.location.pathname;
                // Only /index.html and /404.html are allowed
                if (currentPath !== '/' && currentPath !== '/index.html' && currentPath !== '/404.html') {
                    // Replace page content with 404 message and redirect
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
                                <div style="font-size: 60px; margin-bottom: 20px;">🔒</div>
                                <h1 style="color: #ff6b6b; margin-bottom: 15px;">Site Lockdown</h1>
                                <p style="color: #ccc; margin-bottom: 20px;">
                                    The site is currently in lockdown mode.
                                </p>
                                <p style="color: #ff6b6b; font-weight: bold;">
                                    Reason: ${data.reason || 'Maintenance'}
                                </p>
                                <p style="color: #888; margin-top: 20px;">Redirecting...</p>
                            </div>
                        </div>
                    `;
                    // Force redirect to index.html after a short delay
                    setTimeout(() => {
                        window.location.replace('/index.html');
                    }, 1500);
                    return; // Don't continue checking other status
                }
            }
            
            // Handle 401-popup (announcement)
            if (data.status === '401-popup' && data.message && data.message.trim()) {
                // Check if this specific announcement was already dismissed
                const dismissed = localStorage.getItem(ANNOUNCEMENT_DISMISSED_KEY);
                const currentMessage = data.message.trim();
                
                console.log('📢 Announcement check:', { dismissed, currentMessage, match: dismissed === currentMessage });
                
                // Only show if not dismissed OR if it's a different message
                if (!dismissed || dismissed !== currentMessage) {
                    // Save to localStorage IMMEDIATELY so other pages know we've seen it
                    localStorage.setItem(ANNOUNCEMENT_DISMISSED_KEY, currentMessage);
                    console.log('📢 Showing announcement popup');
                    showAnnouncementPopup(currentMessage);
                } else {
                    console.log('📢 Announcement already dismissed, not showing');
                }
            }
        } catch (e) {
            // Offline - continue normally
        }
    }
    
    function showAnnouncementPopup(message) {
        // Remove existing popup if any
        const existing = document.getElementById('sirco-announcement-popup');
        if (existing) existing.remove();
        
        // Normalize the message for consistent storage
        const normalizedMessage = message.trim();
        
        const popup = document.createElement('div');
        popup.id = 'sirco-announcement-popup';
        popup.dataset.message = normalizedMessage; // Store for dismiss handler
        popup.innerHTML = `
            <style>
                #sirco-announcement-popup {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.8);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 999999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    animation: announceFadeIn 0.3s ease;
                }
                @keyframes announceFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .announce-box {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    padding: 30px 40px;
                    border-radius: 16px;
                    text-align: center;
                    max-width: 500px;
                    margin: 20px;
                    border: 2px solid rgba(30, 144, 255, 0.3);
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                    animation: announceSlide 0.4s ease;
                }
                @keyframes announceSlide {
                    from { transform: translateY(-30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .announce-icon {
                    font-size: 50px;
                    margin-bottom: 15px;
                }
                .announce-title {
                    color: #1e90ff;
                    font-size: 1.5em;
                    margin: 0 0 15px 0;
                }
                .announce-message {
                    color: #fff;
                    font-size: 1.1em;
                    line-height: 1.6;
                    margin-bottom: 25px;
                }
                .announce-btn {
                    background: linear-gradient(135deg, #1e90ff, #00bfff);
                    color: white;
                    border: none;
                    padding: 12px 30px;
                    border-radius: 25px;
                    font-size: 1em;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .announce-btn:hover {
                    transform: scale(1.05);
                    box-shadow: 0 5px 20px rgba(30, 144, 255, 0.4);
                }
            </style>
            <div class="announce-box">
                <div class="announce-icon">📢</div>
                <h2 class="announce-title">Announcement</h2>
                <div class="announce-message">${escapeHtml(normalizedMessage)}</div>
                <button class="announce-btn" id="sirco-announce-dismiss">Got it!</button>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Close on button click - use normalized message from dataset
        document.getElementById('sirco-announce-dismiss').addEventListener('click', () => {
            const msg = popup.dataset.message;
            localStorage.setItem(ANNOUNCEMENT_DISMISSED_KEY, msg);
            console.log('📢 Announcement dismissed, saved to localStorage:', msg);
            popup.remove();
        });
        
        // Close on backdrop click
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                const msg = popup.dataset.message;
                localStorage.setItem(ANNOUNCEMENT_DISMISSED_KEY, msg);
                console.log('📢 Announcement dismissed (backdrop), saved to localStorage:', msg);
                popup.remove();
            }
        });
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Check site status on load (only in top window, not iframes)
    if (window === window.top) {
        checkSiteStatus();
    }
    
    // Check for realtime commands from owner (ban, redirect, refresh, revoke)
    async function checkUserStatus() {
        const user = getUserInfo();
        if (!user.clientId) return;
        
        try {
            const res = await fetch('/api/check-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: user.clientId,
                    accessCookieId: user.accessCookieId,
                    username: user.username
                })
            });
            
            if (!res.ok) return;
            const data = await res.json();
            
            switch (data.status) {
                case 'banned':
                    localStorage.setItem('banned', 'true');
                    showBannedOverlay(data.reason);
                    break;
                case 'access_revoked':
                    // Only remove access cookie, NOT username/password/data
                    document.cookie = 'access=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    document.cookie = 'accessCookieId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    forceRedirect('/404.html');
                    break;
                case 'account_deleted':
                    // Account was deleted - clear everything and show message
                    showAccountDeletedOverlay(data.reason);
                    break;
                case 'refresh_required':
                    window.location.reload();
                    break;
                case 'redirect':
                    forceRedirect(data.url);
                    break;
                case 'storage_sync':
                    // Owner changed storage data - apply to local device
                    if (data.key) {
                        // Determine if it's a localStorage or cookie key
                        const key = data.key;
                        if (data.action === 'delete') {
                            // Delete the key
                            if (key.startsWith('ls_')) {
                                localStorage.removeItem(key.substring(3));
                            } else if (key.startsWith('cookie_')) {
                                document.cookie = key.substring(7) + '=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                            } else {
                                // Try both
                                localStorage.removeItem(key);
                            }
                            console.log('[Sirco] Storage key deleted by owner:', key);
                        } else if (data.action === 'set' && data.value !== undefined) {
                            // Set the value
                            if (key.startsWith('ls_')) {
                                localStorage.setItem(key.substring(3), data.value);
                            } else if (key.startsWith('cookie_')) {
                                document.cookie = key.substring(7) + '=' + encodeURIComponent(data.value) + '; path=/; max-age=31536000';
                            } else {
                                // Default to localStorage
                                localStorage.setItem(key, data.value);
                            }
                            console.log('[Sirco] Storage key updated by owner:', key);
                        }
                    }
                    break;
                case 'username_sync':
                    // Owner changed username - update local storage
                    if (data.newUsername) {
                        localStorage.setItem('cookie_saver_username', data.newUsername);
                        localStorage.setItem('sirco_username', data.newUsername);
                        console.log('[Sirco] Username updated by owner:', data.newUsername);
                        // Update display if on user page
                        const usernameDisplay = document.getElementById('display-username');
                        if (usernameDisplay) {
                            usernameDisplay.textContent = data.newUsername;
                        }
                    }
                    break;
                case 'ok':
                    if (data.clearBanned) {
                        localStorage.removeItem('banned');
                        localStorage.removeItem('banned_permanent');
                    }
                    // Sync data from server
                    if (data.sync) {
                        // Store userCode if provided
                        if (data.sync.userCode) {
                            localStorage.setItem('userCode', data.sync.userCode);
                        }
                        // If local username is auto-generated (User_XXXXX) but server has real username, use server's
                        const localUsername = localStorage.getItem('username') || '';
                        if (localUsername.startsWith('User_') && data.sync.username && !data.sync.username.startsWith('User_')) {
                            localStorage.setItem('username', data.sync.username);
                        }
                    }
                    break;
            }
        } catch (e) {
            // Offline - continue normally
        }
    }
    
    // Sync user data to server
    async function syncUserData() {
        const user = getUserInfo();
        if (!user.clientId) return;
        
        // Keys that should never be synced (sensitive + internal state)
        const NEVER_SYNC_KEYS = [
            'supertube_access', 'accessToken', 'token', 'password', 'passwordHash',
            'sirco_session', 'session_token', 'access', 'accessCookieId', 
            'sirco_client_id', 'banned', 'supertube_session', 'sirco_owner_token',
            'clientId', 'userCode', 'username', // Auth/identity
            'cookie_saver_password', 'cookie_saver_signedup',
            // Internal UI state - don't sync
            'sirco_menu_hidden', 'sirco_menu_position', 'sirco_menu_active_tab', 'sirco_menu_size',
            'sirco_data_saver_enabled', 'sirco_data_saver_stats', 'sirco_data_saver',
            'sirco_last_sync', 'sirco_mini_ai_history', 'sirco_announcement_dismissed',
            'game_dictionary_recent', 'game_dictionary_recent_enabled',
            'readNewsletters', 'startup-time', 'chat_history',
            // Keys user specifically asked to exclude
            'messageCount', 'dark_mode', 'wasOffline', 'downloader_enabled',
            'welcome_tour_shown', 'sirco_access_expires', 'passwordPromptDismissed'
        ];
        
        // Combine all data into one object
        const combinedData = {};
        
        // Collect localStorage data
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!NEVER_SYNC_KEYS.includes(key)) {
                try {
                    combinedData['ls_' + key] = localStorage.getItem(key);
                } catch (e) {}
            }
        }
        
        // Collect cookies
        document.cookie.split(';').forEach(c => {
            const [key, val] = c.trim().split('=');
            if (key && !NEVER_SYNC_KEYS.includes(key)) {
                combinedData['cookie_' + key] = val;
            }
        });
        
        // Add access expiration for tracking
        const accessExpires = localStorage.getItem('sirco_access_expires');
        if (accessExpires) {
            combinedData['_accessExpires'] = accessExpires;
        }
        
        try {
            const resp = await fetch('/api/account/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: user.clientId,
                    data: combinedData
                })
            });
            if (resp.ok) {
                const result = await resp.json();
                console.log('[Sirco] Data synced:', result.syncedKeys?.length || 0, 'keys');
                localStorage.setItem('sirco_last_sync', new Date().toISOString());
            }
        } catch (e) {
            // Offline - sync later
        }
    }
    
    // Sync data periodically (every 20 seconds, or every 60 seconds if data saver is on)
    let lastSyncTime = 0;
    function scheduleSyncIfNeeded() {
        const dataSaver = localStorage.getItem('sirco_data_saver') === 'true';
        const syncInterval = dataSaver ? 60 * 1000 : 20 * 1000; // 60 or 20 seconds
        
        const now = Date.now();
        if (now - lastSyncTime >= syncInterval) {
            lastSyncTime = now;
            syncUserData();
        }
    }
    
    // Initial sync and schedule regular syncs
    if (window === window.top) {
        setTimeout(syncUserData, 3000); // First sync after 3 seconds
        setInterval(scheduleSyncIfNeeded, 10000); // Check every 10 seconds
    }
    
    function showBannedOverlay(reason) {
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
    
    function showAccountDeletedOverlay(reason) {
        // Clear all user data
        localStorage.clear();
        document.cookie = 'access=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'accessCookieId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'sirco_client_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        
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
                    background: rgba(100,100,100,0.1);
                    padding: 40px;
                    border-radius: 20px;
                    text-align: center;
                    max-width: 500px;
                    border: 2px solid rgba(100,100,100,0.3);
                ">
                    <div style="font-size: 60px; margin-bottom: 20px;">🗑️</div>
                    <h1 style="color: #888; margin-bottom: 15px;">Account Deleted</h1>
                    <p style="color: #ccc; margin-bottom: 20px;">
                        Your account has been deleted by an administrator.
                    </p>
                    <p style="color: #aaa; font-weight: bold; margin-bottom: 25px;">
                        Reason: ${reason || 'No reason provided'}
                    </p>
                    <p style="color: #666; font-size: 14px;">
                        You will need to create a new account to continue using this service.
                    </p>
                    <button onclick="window.location.href='/activate'" style="
                        margin-top: 20px;
                        background: linear-gradient(135deg, #1e90ff, #00bfff);
                        color: white;
                        border: none;
                        padding: 12px 30px;
                        border-radius: 25px;
                        font-size: 1em;
                        cursor: pointer;
                    ">Create New Account</button>
                </div>
            </div>
        `;
    }
    
    // ============== ACTIVITY HEARTBEAT ==============
    // Get access cookie expiration date
    function getAccessCookieExpiration() {
        try {
            const cookies = document.cookie.split(';');
            for (const cookie of cookies) {
                const [name] = cookie.trim().split('=');
                if (name === 'access') {
                    // We can't get expiration from document.cookie directly
                    // But we can check localStorage for when it was set
                    const storedExpiry = localStorage.getItem('sirco_access_expires');
                    if (storedExpiry) return storedExpiry;
                }
            }
        } catch (e) {}
        return null;
    }
    
    async function sendHeartbeat() {
        const user = getUserInfo();
        if (!user.clientId) return;
        
        try {
            await fetch('/api/heartbeat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: user.clientId,
                    page: window.location.pathname,
                    isActiveTab: document.hasFocus(),
                    visibilityState: document.visibilityState,
                    accessExpires: getAccessCookieExpiration()
                })
            });
        } catch (e) {
            // Silently fail
        }
    }
    
    // ============== DATA SAVER INTERVAL THROTTLING ==============
    // Store interval IDs so we can clear and reset them when data saver toggles
    let notificationIntervalId = null;
    let userStatusIntervalId = null;
    let heartbeatIntervalId = null;
    
    // Normal intervals (data saver OFF)
    const NORMAL_INTERVALS = {
        notifications: 30000,   // 30 seconds
        userStatus: 5000,       // 5 seconds
        heartbeat: 5000,        // 5 seconds
        chatPolling: 3000       // 3 seconds
    };
    
    // Data saver intervals (reduced frequency = less data)
    const DATA_SAVER_INTERVALS = {
        notifications: 120000,  // 2 minutes (4x less)
        userStatus: 30000,      // 30 seconds (6x less)
        heartbeat: 60000,       // 1 minute (12x less)
        chatPolling: 15000      // 15 seconds (5x less)
    };
    
    // Get current intervals based on data saver status
    function getIntervals() {
        const dataSaverEnabled = localStorage.getItem('sirco_data_saver_enabled') === 'true';
        return dataSaverEnabled ? DATA_SAVER_INTERVALS : NORMAL_INTERVALS;
    }
    
    // Setup all API polling intervals
    function setupPollingIntervals() {
        const intervals = getIntervals();
        const isDataSaver = localStorage.getItem('sirco_data_saver_enabled') === 'true';
        
        // Clear existing intervals
        if (notificationIntervalId) clearInterval(notificationIntervalId);
        if (userStatusIntervalId) clearInterval(userStatusIntervalId);
        if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
        
        // Set new intervals
        notificationIntervalId = setInterval(checkForNotifications, intervals.notifications);
        userStatusIntervalId = setInterval(checkUserStatus, intervals.userStatus);
        heartbeatIntervalId = setInterval(sendHeartbeat, intervals.heartbeat);
        
        console.log(`📡 Polling intervals set (Data Saver ${isDataSaver ? 'ON' : 'OFF'}):`,
            `notifications=${intervals.notifications/1000}s,`,
            `userStatus=${intervals.userStatus/1000}s,`,
            `heartbeat=${intervals.heartbeat/1000}s`);
    }
    
    // Update chat polling interval (called when chat opens)
    window.updateChatPollingInterval = function() {
        const intervals = getIntervals();
        if (chatPollingInterval) {
            clearInterval(chatPollingInterval);
            chatPollingInterval = setInterval(loadChatMessages, intervals.chatPolling);
        }
    };
    
    // Initial checks and setup intervals
    checkForNotifications();
    checkUserStatus();
    sendHeartbeat();
    setupPollingIntervals();

    // ============== DATA SAVER FUNCTIONALITY ==============
    const DATA_SAVER_KEY = 'sirco_data_saver_enabled';
    const DATA_STATS_KEY = 'sirco_data_saver_stats';
    const DATA_SAVER_CACHE_NAME = 'sirco-data-saver-v1';
    
    // Get data saver stats
    function getDataSaverStats() {
        try {
            const stats = localStorage.getItem(DATA_STATS_KEY);
            return stats ? JSON.parse(stats) : { dataSaved: 0, pagesCached: 0, requestsBlocked: 0 };
        } catch { return { dataSaved: 0, pagesCached: 0, requestsBlocked: 0 }; }
    }
    
    function saveDataSaverStats(stats) {
        try {
            localStorage.setItem(DATA_STATS_KEY, JSON.stringify(stats));
        } catch {}
    }
    
    function isDataSaverEnabled() {
        return localStorage.getItem(DATA_SAVER_KEY) === 'true';
    }
    
    function setDataSaverEnabled(enabled) {
        localStorage.setItem(DATA_SAVER_KEY, enabled ? 'true' : 'false');
    }
    
    // Format bytes to human readable
    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
    
    // Update stats display
    function updateDataSaverUI() {
        const stats = getDataSaverStats();
        const enabled = isDataSaverEnabled();
        
        const toggle = document.getElementById('sirco-data-saver-toggle');
        const card = document.getElementById('sirco-data-saver-card');
        const banner = document.getElementById('sirco-savings-banner');
        const savedEl = document.getElementById('sirco-data-saved');
        const cachedEl = document.getElementById('sirco-pages-cached');
        const savingsText = document.getElementById('sirco-savings-text');
        const pollingInfo = document.getElementById('sirco-polling-info');
        const pollingValues = document.getElementById('sirco-polling-values');
        
        if (toggle) toggle.checked = enabled;
        if (card) card.classList.toggle('active', enabled);
        if (banner) banner.style.display = enabled ? 'flex' : 'none';
        if (savedEl) savedEl.textContent = formatBytes(stats.dataSaved);
        if (cachedEl) cachedEl.textContent = stats.pagesCached.toString();
        if (savingsText && enabled) {
            savingsText.textContent = `Data Saver ON: Cache-first + API throttling active!`;
        }
        
        // Update polling info
        if (pollingInfo && pollingValues) {
            pollingInfo.style.display = enabled ? 'block' : 'none';
            if (enabled) {
                const intervals = getIntervals();
                pollingValues.innerHTML = `
                    <div>🔔 Notifications: <b>${intervals.notifications/1000}s</b></div>
                    <div>👤 User Status: <b>${intervals.userStatus/1000}s</b></div>
                    <div>💓 Heartbeat: <b>${intervals.heartbeat/1000}s</b></div>
                    <div>💬 Chat: <b>${intervals.chatPolling/1000}s</b></div>
                `;
            }
        }
    }
    
    // Register data saver service worker
    async function registerDataSaverSW() {
        // Use the existing analytics-sw.js - just enable data saver mode
        if (!('serviceWorker' in navigator)) return;
        
        try {
            // Make sure analytics-sw.js is registered
            const reg = await navigator.serviceWorker.ready;
            if (reg && reg.active) {
                // Send message to enable data saver
                reg.active.postMessage({ type: 'SET_DATA_SAVER', enabled: true });
                console.log('📦 Data Saver ENABLED in analytics-sw.js');
            }
        } catch (e) {
            console.log('Data Saver enable failed:', e);
        }
    }
    
    // Unregister data saver service worker
    async function unregisterDataSaverSW() {
        // Disable data saver mode in analytics-sw.js
        if (!('serviceWorker' in navigator)) return;
        
        try {
            const reg = await navigator.serviceWorker.ready;
            if (reg && reg.active) {
                // Send message to disable data saver
                reg.active.postMessage({ type: 'SET_DATA_SAVER', enabled: false });
                console.log('📦 Data Saver DISABLED in analytics-sw.js');
            }
        } catch (e) {
            console.log('Data Saver disable failed:', e);
        }
    }
    
    // Manual caching fallback (when SW not available)
    const manualCache = new Map();
    let interceptingFetch = false;
    
    function enableManualCaching() {
        if (interceptingFetch) return;
        interceptingFetch = true;
        
        const originalFetch = window.fetch;
        window.fetch = async function(url, options = {}) {
            // Skip non-GET and API requests
            if (options.method && options.method !== 'GET') {
                return originalFetch(url, options);
            }
            
            const urlStr = typeof url === 'string' ? url : url.toString();
            if (urlStr.includes('/api/') || urlStr.includes('/owner/')) {
                return originalFetch(url, options);
            }
            
            // Check manual cache
            const cached = manualCache.get(urlStr);
            if (cached && Date.now() - cached.time < 3600000) { // 1 hour cache
                const stats = getDataSaverStats();
                stats.dataSaved += cached.size || 1000;
                saveDataSaverStats(stats);
                updateDataSaverUI();
                return new Response(cached.data, { headers: cached.headers });
            }
            
            // Fetch and cache
            const response = await originalFetch(url, options);
            const clone = response.clone();
            
            try {
                const data = await clone.text();
                manualCache.set(urlStr, {
                    data,
                    headers: Object.fromEntries(response.headers.entries()),
                    time: Date.now(),
                    size: data.length
                });
                
                // Track
                if (urlStr.endsWith('/') || urlStr.endsWith('.html')) {
                    const stats = getDataSaverStats();
                    stats.pagesCached++;
                    saveDataSaverStats(stats);
                    updateDataSaverUI();
                }
            } catch {}
            
            return response;
        };
        
        // Also intercept XMLHttpRequest
        const originalXHROpen = XMLHttpRequest.prototype.open;
        const originalXHRSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            this._sircoUrl = url;
            this._sircoMethod = method;
            return originalXHROpen.call(this, method, url, ...args);
        };
        
        XMLHttpRequest.prototype.send = function(...args) {
            if (this._sircoMethod === 'GET' && !this._sircoUrl.includes('/api/')) {
                const cached = manualCache.get(this._sircoUrl);
                if (cached && Date.now() - cached.time < 3600000) {
                    const stats = getDataSaverStats();
                    stats.dataSaved += cached.size || 1000;
                    saveDataSaverStats(stats);
                    updateDataSaverUI();
                    
                    // Simulate response
                    Object.defineProperty(this, 'responseText', { value: cached.data });
                    Object.defineProperty(this, 'status', { value: 200 });
                    Object.defineProperty(this, 'readyState', { value: 4 });
                    
                    setTimeout(() => {
                        if (this.onreadystatechange) this.onreadystatechange();
                        if (this.onload) this.onload();
                    }, 0);
                    return;
                }
            }
            return originalXHRSend.call(this, ...args);
        };
        
        // Lazy load images
        document.querySelectorAll('img[src]').forEach(img => {
            if (!img.loading) img.loading = 'lazy';
        });
        
        // Observe for new images
        const imgObserver = new MutationObserver(mutations => {
            mutations.forEach(m => {
                m.addedNodes.forEach(node => {
                    if (node.tagName === 'IMG' && !node.loading) {
                        node.loading = 'lazy';
                    }
                    if (node.querySelectorAll) {
                        node.querySelectorAll('img').forEach(img => {
                            if (!img.loading) img.loading = 'lazy';
                        });
                    }
                });
            });
        });
        imgObserver.observe(document.body, { childList: true, subtree: true });
    }
    
    function disableManualCaching() {
        interceptingFetch = false;
        manualCache.clear();
    }
    
    // Listen for SW messages
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', event => {
            const stats = getDataSaverStats();
            
            if (event.data.type === 'DATA_SAVED') {
                stats.dataSaved += event.data.bytes;
                saveDataSaverStats(stats);
                updateDataSaverUI();
            }
            
            if (event.data.type === 'PAGE_CACHED') {
                stats.pagesCached++;
                saveDataSaverStats(stats);
                updateDataSaverUI();
            }
            
            // Handle analytics-sw.js message types
            if (event.data.type === 'DATA_SAVER_CACHE_CLEARED' || event.data.type === 'CACHE_CLEARED') {
                stats.pagesCached = 0;
                saveDataSaverStats(stats);
                updateDataSaverUI();
            }
            
            if (event.data.type === 'DATA_SAVER_STATS') {
                // Update pages cached from downloaded pages cache
                stats.pagesCached = event.data.pagesCached || 0;
                saveDataSaverStats(stats);
                updateDataSaverUI();
            }
        });
    }
    
    // Data Saver toggle handler
    const dataSaverToggle = document.getElementById('sirco-data-saver-toggle');
    if (dataSaverToggle) {
        dataSaverToggle.addEventListener('change', async (e) => {
            const enabled = e.target.checked;
            setDataSaverEnabled(enabled);
            
            if (enabled) {
                await registerDataSaverSW();
                enableManualCaching();
                console.log('📦 Data Saver ENABLED - using downloaded pages cache');
            } else {
                await unregisterDataSaverSW();
                disableManualCaching();
                console.log('📦 Data Saver DISABLED');
            }
            
            // Reset polling intervals with new timing
            setupPollingIntervals();
            // Also update chat polling if active
            if (typeof updateChatPollingInterval === 'function') {
                updateChatPollingInterval();
            }
            
            updateDataSaverUI();
            // Refresh stats to show downloaded pages count
            refreshDataSaverStats();
        });
    }
    
    // Refresh stats button - gets count from downloaded pages cache
    const refreshStatsBtn = document.getElementById('sirco-refresh-stats');
    if (refreshStatsBtn) {
        refreshStatsBtn.addEventListener('click', () => {
            refreshDataSaverStats();
        });
    }
    
    // Function to refresh stats from service worker
    function refreshDataSaverStats() {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'GET_DATA_SAVER_STATS' });
        }
    }
    
    // Initialize data saver on page load
    // Always sync data saver state with service worker
    async function initializeDataSaver() {
        const enabled = isDataSaverEnabled();
        
        // Wait for service worker to be ready
        if ('serviceWorker' in navigator) {
            try {
                const reg = await navigator.serviceWorker.ready;
                if (reg && reg.active) {
                    // Send current state to service worker
                    reg.active.postMessage({ type: 'SET_DATA_SAVER', enabled: enabled });
                    console.log('📦 Data Saver state synced:', enabled ? 'ON' : 'OFF');
                    
                    // Get stats from downloaded pages cache
                    setTimeout(() => {
                        reg.active.postMessage({ type: 'GET_DATA_SAVER_STATS' });
                    }, 500);
                }
            } catch (e) {
                console.log('Failed to sync data saver state:', e);
            }
        }
        
        if (enabled) {
            enableManualCaching();
        }
        
        updateDataSaverUI();
    }
    
    // Call initialization
    initializeDataSaver();

})();
