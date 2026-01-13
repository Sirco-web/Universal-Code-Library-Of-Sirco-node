let BACKEND_URL = '';
fetch('/backend.json')
    .then(res => res.json())
    .then(cfg => {
        BACKEND_URL = cfg.url.replace(/\/$/, '');
        initApp();
    });

function initApp() {
    function checkCookie() {
        const cookies = document.cookie.split("; ");
        const accessCookie = cookies.find(row => row.startsWith("access="));
        if (!accessCookie || accessCookie.split("=")[1] !== "1") {
            window.location.href = "/index.html";
        }
    }

    // Move showCookies and showLocalStorage to window.onload so DOM is ready
    window.onload = function () {
        checkCookie();
        if (localStorage.getItem('banned_permanent') === '1') {
            localStorage.removeItem('cookie_saver_username');
            localStorage.removeItem('cookie_saver_password');
            localStorage.removeItem('cookie_saver_signedup');
            alert('This device is permanently banned from creating or accessing accounts.');
            window.location.href = '/';
        }
        showCookies();
        // Attach event handlers here so elements exist
        document.getElementById('refresh-cookies').onclick = showCookies;
        document.getElementById('export-all').onclick = function() {
            const cookies = getUserCookies();
            const local = {};
            Object.keys(localStorage).forEach(key => { local[key] = localStorage.getItem(key); });
            const data = { cookies, localStorage: local };
            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'cookies-localstorage.json';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        };
        document.getElementById('import-all').onclick = function() {
            const fileInput = document.getElementById('import-all-file');
            if (!fileInput.files.length) {
                document.getElementById('message').textContent = 'Please select a file to import.';
                document.getElementById('message').style.color = 'red';
                return;
            }
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.cookies && typeof data.cookies === 'object') {
                        Object.keys(data.cookies).forEach(name => {
                            document.cookie = name + '=' + encodeURIComponent(data.cookies[name]) + '; path=/';
                        });
                    }
                    if (data.localStorage && typeof data.localStorage === 'object') {
                        Object.keys(data.localStorage).forEach(key => {
                            localStorage.setItem(key, data.localStorage[key]);
                        });
                    }
                    document.getElementById('message').textContent = 'Data imported successfully.';
                    document.getElementById('message').style.color = 'green';
                    showCookies();
                } catch {
                    document.getElementById('message').textContent = 'Invalid file format.';
                    document.getElementById('message').style.color = 'red';
                }
            };
            reader.readAsText(file);
        };
    };

    function getAllCookies() {
        return document.cookie.split(';').reduce((acc, c) => {
            const idx = c.indexOf('=');
            if (idx > -1) {
                const k = c.slice(0, idx).trim();
                const v = c.slice(idx + 1);
                acc[k] = decodeURIComponent(v);
            }
            return acc;
        }, {});
    }
    function getUserCookies() {
        const exclude = [
            'cookie_saver_email',
            'cookie_saver_name',
            'cookie_saver_password',
            'newsletter_hide',
            'cookie_saver_signedup',
            'cookie_saver_username',
            'access',
            'device_code',
            'username',
            'removerKey',
            'token',
            'username',
            'downloader_enabled'
        ];
        const all = getAllCookies();
        const filtered = {};
        Object.keys(all).forEach(k => {
            if (!exclude.includes(k)) filtered[k] = all[k];
        });
        return filtered;
    }
    function showCookies() {
        const cookies = getUserCookies();
        const cookieList = document.getElementById('cookie-list');
        cookieList.innerHTML = '';
        const keys = Object.keys(cookies);
        if (keys.length === 0) {
            cookieList.innerHTML = '<li>No cookies found.</li>';
        } else {
            keys.forEach(key => {
                const li = document.createElement('li');
                li.innerHTML = `<span><b>${key}</b>: <span class="value">${cookies[key]}</span></span>`;
                const btns = document.createElement('span');
                const editBtn = document.createElement('button');
                editBtn.textContent = 'Edit';
                editBtn.onclick = function() {
                    const newValue = prompt('Edit cookie value for ' + key + ':', cookies[key]);
                    if (newValue !== null) {
                        document.cookie = key + '=' + encodeURIComponent(newValue) + '; path=/';
                        showCookies();
                    }
                };
                const delBtn = document.createElement('button');
                delBtn.textContent = 'Delete';
                delBtn.onclick = function() {
                    document.cookie = key + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                    showCookies();
                };
                btns.appendChild(editBtn);
                btns.appendChild(delBtn);
                li.appendChild(btns);
                cookieList.appendChild(li);
            });
        }
        showLocalStorage();
    }
    function showLocalStorage() {
        const localList = document.getElementById('localstorage-list');
        localList.innerHTML = '';
        const exclude = [
            'cookie_saver_email',
            'cookie_saver_name',
            'cookie_saver_password',
            'newsletter_hide',
            'cookie_saver_signedup',
            'cookie_saver_username',
            'access',
            'device_code',
            'username',
            'removerKey',
            'token',
            'username',
            'downloader_enabled',
            // Hide sensitive server-related data
            'clientId',
            'owner_token',
            'banned',
            'accessCookieId',
            'banned_permanent',
            'wasOffline'
        ];
        const keys = Object.keys(localStorage).filter(key => !exclude.includes(key));
        if (keys.length === 0) {
            localList.innerHTML = '<li>No localStorage data found.</li>';
        } else {
            keys.forEach(key => {
                const li = document.createElement('li');
                li.innerHTML = `<span><b>${key}</b>: <span class="value">${localStorage.getItem(key)}</span></span>`;
                const btns = document.createElement('span');
                const editBtn = document.createElement('button');
                editBtn.textContent = 'Edit';
                editBtn.onclick = function() {
                    const newValue = prompt('Edit localStorage value for ' + key + ':', localStorage.getItem(key));
                    if (newValue !== null) {
                        localStorage.setItem(key, newValue);
                        showLocalStorage();
                    }
                };
                const delBtn = document.createElement('button');
                delBtn.textContent = 'Delete';
                delBtn.onclick = function() {
                    localStorage.removeItem(key);
                    showLocalStorage();
                };
                btns.appendChild(editBtn);
                btns.appendChild(delBtn);
                li.appendChild(btns);
                localList.appendChild(li);
            });
        }
    }

    // Initialize when page loads
    window.onload = function() {
        checkCookie();
        showCookies();
        document.getElementById('refresh-cookies').onclick = showCookies;
        document.getElementById('export-all').onclick = exportAll;
        document.getElementById('import-all').onclick = importAll;
    };
} // End of initApp
