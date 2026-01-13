(function() {
    try {
        // Classic mode support
        if (window.localStorage && localStorage.classic_mode === '1') {
            document.documentElement.classList.add('classic-mode');
        } else {
            document.documentElement.classList.remove('classic-mode');
        }
        // Optionally, you could add dark mode support here if you want it on all pages
        // Example:
        // if (window.localStorage && localStorage.dark_mode === '1') {
        //     document.documentElement.classList.add('dark-mode');
        // }
    } catch(e){}
})();
