// Check for access cookie and prompt if present
window.addEventListener('DOMContentLoaded', function() {
    const cookies = document.cookie.split("; ");
    const accessCookie = cookies.find(row => row.startsWith("access="));
    if (accessCookie && accessCookie.split("=")[1] === "1") {
        // Show popup
        const popup = document.createElement('div');
        popup.style.position = 'fixed';
        popup.style.top = '0';
        popup.style.left = '0';
        popup.style.width = '100vw';
        popup.style.height = '100vh';
        popup.style.background = 'rgba(0,0,0,0.5)';
        popup.style.display = 'flex';
        popup.style.alignItems = 'center';
        popup.style.justifyContent = 'center';
        popup.style.zIndex = '2000';

        // build popup depending on 404S restriction
        (function(){
            const restricted = !!(window.__SITE_404S_BLOCK);
            if (!restricted) {
                popup.innerHTML = `
                    <div style="background:white;color:#222;padding:30px 40px;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.2);text-align:center;max-width:90vw;">
                        <h2 style="margin-top:0;">Access Granted</h2>
                        <p style="font-size:1.1em;">You already have access. Would you like to go to the second site?</p>
                        <div style="margin-top:20px;">
                            <button id="goSecondSite" style="padding:8px 20px;margin-right:10px;background:#007bff;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:1em;">OK</button>
                            <button id="cancelPopup" style="padding:8px 20px;background:#ccc;color:#222;border:none;border-radius:5px;cursor:pointer;font-size:1em;">Cancel</button>
                        </div>
                    </div>
                `;
            } else {
                // restricted UI: no welcome navigation button
                popup.innerHTML = `
                    <div style="background:white;color:#222;padding:30px 40px;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.2);text-align:center;max-width:90vw;">
                        <h2 style="margin-top:0;">Access Restricted</h2>
                        <p style="font-size:1.05em;color:#b00;">The site is currently in restricted mode. Navigation to the welcome page is disabled.</p>
                        <div style="margin-top:20px;">
                            <button id="cancelPopup" style="padding:8px 20px;background:#ccc;color:#222;border:none;border-radius:5px;cursor:pointer;font-size:1em;">Close</button>
                        </div>
                    </div>
                `;
            }

            // ensure popup is actually added to the document so elements are visible and queryable
            if (!document.body.contains(popup)) {
                document.body.appendChild(popup);
            }

            // attach handlers (guarded) — query inside the popup to be robust
            const goBtn = popup.querySelector('#goSecondSite');
            const cancelBtn = popup.querySelector('#cancelPopup');

            if (goBtn) {
                goBtn.addEventListener('click', function() {
                    // defensive check in case the restriction was applied after popup creation
                    if (window.__SITE_404S_BLOCK) {
                        // do nothing or close
                        if (cancelBtn) cancelBtn.click();
                        return;
                    }
                    window.location.href = "/welcome/index.html";
                });
            }
            if (cancelBtn) {
                cancelBtn.addEventListener('click', function() {
                    popup.remove();
                });
            }
        })();
    }

    // Add activate button area if not already present
    if (!document.querySelector('.activate-btn-area')) {
        const activateDiv = document.createElement('div');
        activateDiv.className = 'activate-btn-area';
        activateDiv.innerHTML = `<a href="/activate/" class="activate-btn" tabindex="-1">Activate</a>`;
        document.body.appendChild(activateDiv);
    }
});
