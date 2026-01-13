// ban-blocker.js
// To use: <script src="/ban-blocker.js"></script> in your HTML
(function(){
    // Create overlay
    function showBanOverlay(msg) {
        let overlay = document.getElementById('ban-blocker-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'ban-blocker-overlay';
            overlay.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(30,0,0,0.97);color:#fff;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:1.5em;text-align:center;';
            overlay.innerHTML = `<div style='max-width:90vw;'><h2 style='color:#ff4444;'>Access Blocked</h2><p id='ban-blocker-msg'></p></div>`;
            document.body.appendChild(overlay);
        }
        document.getElementById('ban-blocker-msg').textContent = msg || 'This device or one of your accounts has been banned.';
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    // Check for permanent ban
    if (localStorage.getItem('banned_permanent') === '1') {
        showBanOverlay('This device is permanently banned.');
        return;
    }
    // Check all_usernames for banned accounts
    let all = [];
    try { all = JSON.parse(localStorage.getItem('all_usernames') || '[]'); } catch {}
    if (all.length > 0) {
        fetch('/banned-accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames: all })
        })
        .then(res => res.json())
        .then(data => {
            if (data && data.banned && data.banned.length > 0) {
                showBanOverlay('One or more of your accounts (' + data.banned.join(', ') + ') has been banned. Access is blocked.');
            }
        });
    }
})();
