# code-universe


    <script src="/newsletter.js?67herth676"></script>

### /workspaces/code-universe/cookie-saver.js

Refactor the code to remove duplicate event listener assignments and improve code organization.

````javascript
// filepath: /workspaces/code-universe/cookie-saver.js
// ...existing code...
safeAddClick('recover-btn', function() {
    const emailInput = document.getElementById('recover-email');
    const nameInput = document.getElementById('recover-name');
    if (!emailInput || !nameInput) return;
// ...existing code...
    });
};

// Remove duplicate BACKEND_URL declaration at the bottom
// Only declare BACKEND_URL once at the top and only call main() after it is set

let BACKEND_URL = '';
fetch('/backend.json')
    .then(res => res.json())
    .then(cfg => {
        BACKEND_URL = cfg.url.replace(/\/$/, '');
        main();
    });

function main() {
    // On load, check if signed up and verify account with server
    window.addEventListener('DOMContentLoaded', () => {
        if (hasAccountCreatedCookie()) {
            showSection('cookie-section');
            showCookies();
            showAllSiteData();
            addRefreshButton();
            return;
        }
        const cookies = getAllCookies();
        if (cookies.cookie_saver_signedup === '1') {
            // Verify account with server before showing cookies
            const username = cookies.cookie_saver_username;
            const password = cookies.cookie_saver_password;
            if (username && password) {
                fetch(BACKEND_URL + '/cookie-verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.valid) {
                        showSection('cookie-section');
                        showCookies();
                        showAllSiteData();
                        addRefreshButton();
                    } else {
                        clearAccountCookies();
                        showSection('signup-section');
                        showMessage('Account not valid. Please sign up or log in again.', 'red');
                    }
                })
                .catch(() => {
                    clearAccountCookies();
                    showSection('signup-section');
                    showMessage('Could not verify account. Please try again.', 'red');
                    showCookieSaverErrorNotification();
                });
            } else {
                clearAccountCookies();
                showSection('signup-section');
            }
        }
    });

    // Signup form
    document.getElementById('signup-form').onsubmit = function(e) {
        e.preventDefault();

        // Check if account_created cookie exists
        if (hasAccountCreatedCookie()) {
            showMessage('An account has already been created. Further sign-ups are disabled.', 'red');
            return;
        }

        const username = document.getElementById('signup-username').value.trim();
        const password = document.getElementById('signup-password').value.trim();
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();

        if (!username || !password || !name || !email) {
            showMessage('Please fill all fields.', 'red');
            return;
        }

        // Check if a user with the same username already exists
        fetch(BACKEND_URL + '/cookie-check-username?username=' + encodeURIComponent(username), {
            method: 'GET',
            headers: { 'ngrok-skip-browser-warning': 'true' }
        })
        .then(res => res.json())
        .then(data => {
            if (data.exists) {
                showMessage('This username is already taken. Please choose a different one.', 'red');
            } else {
                // Check with server if account is valid or needs to be created
                fetch(BACKEND_URL + '/cookie-verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                })
                .then(res => {
                    if (!res.ok) throw new Error('Network error');
                    return res.json();
                })
                .then(data => {
                    if (data.valid) {
                        setCookie('cookie_saver_signedup', '1', 365);
                        setCookie('cookie_saver_username', username, 365);
                        setCookie('cookie_saver_password', password, 365);
                        setCookie('cookie_saver_name', name, 365);
                        setCookie('cookie_saver_email', email, 365);
                        setCookie('account_created', '1', 365); // Set the account_created cookie
                        showSection('cookie-section');
                        showCookies();
                        showMessage('Logged in and cookies loaded!');
                    } else {
                        // Save signup info to backend (register new account)
                        fetch(BACKEND_URL + '/cookie-signup', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                            body: JSON.stringify({ username, password, name, email, timestamp: new Date().toISOString() })
                        })
                        .then(resp => {
                            if (!resp.ok) throw new Error('Network error');
                            return resp.json();
                        })
                        .then(data => {
                            if (data.success) {
                                // Auto sign-in after signup
                                setCookie('cookie_saver_signedup', '1', 365);
                                setCookie('cookie_saver_username', data.username, 365);
                                setCookie('cookie_saver_password', data.password, 365);
                                setCookie('cookie_saver_name', data.name, 365);
                                setCookie('cookie_saver_email', data.email, 365);
                                setCookie('account_created', '1', 365); // Set the account_created cookie
                                showSection('cookie-section');
                                showCookies();
                                showMessage('Signed up and logged in!');
                            } else {
                                showMessage('Sign up failed: ' + (data.error || 'Unknown error'), 'red');
                                clearAccountCookies();
                                showSection('signup-section');
                            }
                        })
                        .catch(() => {
                            showMessage('Could not create account. Please try again.', 'red');
                            clearAccountCookies();
                            showSection('signup-section');
                            showCookieSaverErrorNotification();
                        });
                    }
                })
                .catch(() => {
                    showMessage('Could not verify or create account. Please check your connection.', 'red');
                    clearAccountCookies();
                    showSection('signup-section');
                    showCookieSaverErrorNotification();
                });
            }
        })
        .catch(() => {
            showMessage('Could not check username. Please try again.', 'red');
            showCookieSaverErrorNotification();
        });
    };

    // Download cookies
    document.getElementById('download-cookies').onclick = function() {
        const cookies = getUserCookies();
        const blob = new Blob([JSON.stringify(cookies, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cookies.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    // Import cookies from file
    document.getElementById('import-cookies').onclick = function() {
        const fileInput = document.getElementById('import-file');
        if (!fileInput.files.length) {
            showMessage('Please select a file to import.', 'red');
            return;
        }
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                setAllCookies(data, 365);
                showCookies();
                showMessage('Cookies imported!');
            } catch {
                showMessage('Invalid JSON.', 'red');
            }
        };
        reader.readAsText(file);
    };

    // Cloud save
    document.getElementById('cloud-save').onclick = function() {
        const username = getAllCookies().cookie_saver_username;
        const password = getAllCookies().cookie_saver_password;
        if (!username || !password) {
            showMessage('No username/password found.', 'red');
            return;
        }
        const cookies = getUserCookies();
        fetch(BACKEND_URL + '/cookie-cloud', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({ username, password, cookies, timestamp: new Date().toISOString() })
        }).then(() => {
            showMessage('Cloud save successful!');
        }).catch(() => {
            showMessage('Cloud save failed.', 'red');
            showCookieSaverErrorNotification();
        });
    };

    // Cloud load
    document.getElementById('cloud-load').onclick = function() {
        const username = getAllCookies().cookie_saver_username;
        const password = getAllCookies().cookie_saver_password;
        if (!username || !password) {
            showMessage('No username/password found.', 'red');
            return;
        }
        fetch(BACKEND_URL + '/cookie-cloud?username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password), {
            method: 'GET',
            headers: { 'ngrok-skip-browser-warning': 'true' }
        })
        .then(res => res.json())
        .then(data => {
            if (data && data.cookies) {
                setAllCookies(data.cookies, 365);
                showCookies();
                showMessage('Cloud load successful!');
            } else {
                showMessage('No cloud save found.', 'red');
            }
        })
        .catch(() => {
            showMessage('Cloud load failed.', 'red');
            showCookieSaverErrorNotification();
        });
    };

    // Recover username/password by email and name
    document.getElementById('recover-btn').onclick = function() {
        const email = document.getElementById('recover-email').value.trim();
        const name = document.getElementById('recover-name').value.trim();
        if (!email || !name) {
            showMessage('Please enter your email and name.', 'red');
            return;
        }
        fetch(BACKEND_URL + '/cookie-recover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({ email, name })
        })
        .then(res => res.json())
        .then(data => {
            if (data && data.username && data.password) {
                showMessage(`Recovered! Username: ${data.username}, Password: ${data.password}`, 'green');
                // Optionally, auto-fill the login/signup form:
                document.getElementById('signup-username').value = data.username;
                document.getElementById('signup-password').value = data.password;
            } else {
                showMessage('No account found for that email and name.', 'red');
            }
        })
        .catch(() => {
            showMessage('Recovery failed. Please try again.', 'red');
            showCookieSaverErrorNotification();
        });
    };
}