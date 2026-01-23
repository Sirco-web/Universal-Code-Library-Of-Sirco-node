// Cookie check (redirect to /index.html if access cookie not set)
function checkCookie() {
    const cookies = document.cookie ? document.cookie.split("; ") : [];
    const accessCookie = cookies.find(row => row.startsWith("access="));
    if (!accessCookie || accessCookie.split("=")[1] !== "1") {
        window.location.href = "/index.html"; // Redirect if no valid cookie
    }
}
checkCookie();

document.addEventListener('DOMContentLoaded', () => {
  // API calls now go through our server (keys hidden, responses cached)
  const PAGE_SIZE = 8;

  const q = document.getElementById('q');
  const btnSearch = document.getElementById('btnSearch');
  const btnTrending = document.getElementById('btnTrending');
  const btnShorts = document.getElementById('btnShorts');
  const region = document.getElementById('region');
  const grid = document.getElementById('grid');
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');
  const player = document.getElementById('player');
  const nativePlayer = document.getElementById('nativePlayer');
  const btnNative = document.getElementById('btnNative');
  const btnIframe = document.getElementById('btnIframe');
  const nowTitle = document.getElementById('nowTitle');
  const nowChannel = document.getElementById('nowChannel');
  const playerToggle = document.getElementById('playerToggle');
  const shortsContainer = document.getElementById('shortsContainer');
  const btnSettings = document.getElementById('btnSettings');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettings = document.getElementById('closeSettings');

  // Settings elements
  const settingAutoScroll = document.getElementById('settingAutoScroll');
  const settingDarkMode = document.getElementById('settingDarkMode');
  const settingAutoplay = document.getElementById('settingAutoplay');
  const settingShowDuration = document.getElementById('settingShowDuration');
  const settingShowViews = document.getElementById('settingShowViews');
  const settingPageSize = document.getElementById('settingPageSize');
  const settingDefaultRegion = document.getElementById('settingDefaultRegion');
  const settingConfirmPlay = document.getElementById('settingConfirmPlay');
  const settingTheaterMode = document.getElementById('settingTheaterMode');

  let currentItems = [];
  let pageIndex = 0;
  let currentVideoId = null;
  let preferredPlayer = localStorage.getItem('supertube_player') || 'youtube';

  // Settings object with defaults
  let settings = {
    autoScroll: true,
    darkMode: true,
    autoplay: true,
    showDuration: true,
    showViews: true,
    pageSize: 8,
    defaultRegion: 'US',
    confirmPlay: false,
    theaterMode: false
  };

  // Load settings from localStorage
  function loadSettings() {
    const saved = localStorage.getItem('supertube_settings');
    if (saved) {
      try {
        settings = { ...settings, ...JSON.parse(saved) };
      } catch(e) {}
    }
    applySettings();
  }

  // Apply settings to UI
  function applySettings() {
    if (settingAutoScroll) settingAutoScroll.checked = settings.autoScroll;
    if (settingDarkMode) settingDarkMode.checked = settings.darkMode;
    if (settingAutoplay) settingAutoplay.checked = settings.autoplay;
    if (settingShowDuration) settingShowDuration.checked = settings.showDuration;
    if (settingShowViews) settingShowViews.checked = settings.showViews;
    if (settingPageSize) settingPageSize.value = settings.pageSize;
    if (settingDefaultRegion) settingDefaultRegion.value = settings.defaultRegion;
    if (settingConfirmPlay) settingConfirmPlay.checked = settings.confirmPlay;
    if (settingTheaterMode) settingTheaterMode.checked = settings.theaterMode;
    if (playerToggle) playerToggle.value = preferredPlayer;
    if (region) region.value = settings.defaultRegion;

    // Apply dark/light mode
    if (settings.darkMode) {
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
    }
  }

  // Save settings to localStorage
  function saveSettings() {
    localStorage.setItem('supertube_settings', JSON.stringify(settings));
    localStorage.setItem('supertube_player', preferredPlayer);
  }

  // Settings modal handlers
  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      settingsModal.style.display = 'flex';
    });
  }
  if (closeSettings) {
    closeSettings.addEventListener('click', () => {
      settingsModal.style.display = 'none';
    });
  }
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) settingsModal.style.display = 'none';
    });
  }

  // Settings change listeners
  if (settingAutoScroll) settingAutoScroll.addEventListener('change', () => { settings.autoScroll = settingAutoScroll.checked; saveSettings(); });
  if (settingDarkMode) settingDarkMode.addEventListener('change', () => { settings.darkMode = settingDarkMode.checked; saveSettings(); applySettings(); });
  if (settingAutoplay) settingAutoplay.addEventListener('change', () => { settings.autoplay = settingAutoplay.checked; saveSettings(); });
  if (settingShowDuration) settingShowDuration.addEventListener('change', () => { settings.showDuration = settingShowDuration.checked; saveSettings(); renderPage(); });
  if (settingShowViews) settingShowViews.addEventListener('change', () => { settings.showViews = settingShowViews.checked; saveSettings(); renderPage(); });
  if (settingPageSize) settingPageSize.addEventListener('change', () => { settings.pageSize = parseInt(settingPageSize.value); saveSettings(); renderPage(); });
  if (settingDefaultRegion) settingDefaultRegion.addEventListener('change', () => { settings.defaultRegion = settingDefaultRegion.value; saveSettings(); if (region) region.value = settings.defaultRegion; });
  if (settingConfirmPlay) settingConfirmPlay.addEventListener('change', () => { settings.confirmPlay = settingConfirmPlay.checked; saveSettings(); });
  if (settingTheaterMode) settingTheaterMode.addEventListener('change', () => { settings.theaterMode = settingTheaterMode.checked; saveSettings(); });

  loadSettings();

  // Initialize toggle
  if (playerToggle) {
    playerToggle.value = preferredPlayer;
    playerToggle.addEventListener('change', () => {
      preferredPlayer = playerToggle.value;
      localStorage.setItem('supertube_player', preferredPlayer);
    });
  }

  // Format helpers
  function fmtInt(n){const num=Number(n||0);if(num>=1e6)return(num/1e6).toFixed(1)+"M";if(num>=1e3)return(num/1e3).toFixed(1)+"K";return num;}
  function fmtDur(s){if(s==null)return"";s=Number(s);const m=Math.floor(s/60),sec=s%60;return `${m}:${String(sec).padStart(2,'0')}`;}

  // Extract YouTube ID from URL or raw input
  function extractYouTubeID(input){
    if(!input) return null;
    input = input.trim();
    // raw id (11 chars)
    if(/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
    try{
      const u = new URL(input);
      if(u.hostname.includes('youtu.be')) return u.pathname.slice(1);
      if(u.hostname.includes('youtube.com')){
        const p = new URLSearchParams(u.search);
        if(p.has('v')) return p.get('v');
        // sometimes in /shorts/VIDEOID or /embed/VIDEOID
        const parts = u.pathname.split('/');
        return parts.pop() || null;
      }
    } catch(e){}
    return null;
  }

  // Play video and reveal player (switch to side layout)
  function playVideo(id,title,channel){
    if (!id) return;
    
    // Confirm before playing if setting is enabled
    if (settings.confirmPlay) {
      if (!confirm(`Play "${title || 'this video'}"?`)) return;
    }
    
    currentVideoId = id;
    
    document.body.classList.add('player-open');
    const playerBox = document.querySelector('.player');
    if (playerBox) playerBox.style.display = "block";

    // Auto-scroll to top/player if setting is enabled
    if (settings.autoScroll) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Check preference
    if (preferredPlayer === 'native') {
      playNative();
      return;
    }

    // Reset to Iframe mode
    player.style.display = "block";
    nativePlayer.style.display = "none";
    nativePlayer.pause();
    btnNative.style.display = "inline-block";
    btnIframe.style.display = "none";

    // Use youtube-nocookie.com for better embedding compatibility
    // Enable JS API for pause/resume control
    const autoplayParam = settings.autoplay ? 'autoplay=1&' : '';
    player.src = `https://www.youtube-nocookie.com/embed/${id}?${autoplayParam}enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;

    nowTitle.textContent = title || `Video ${id}`;
    nowChannel.textContent = channel || "";
  }

  async function playNative() {
    if (!currentVideoId) return;
    
    try {
      btnNative.textContent = "Loading...";
      btnNative.disabled = true;

      const data = await fetchAPI(`/dl?id=${currentVideoId}`);
      // The API returns various formats. We need a playable video/mp4 with audio.
      // Usually data.formats or data.adaptiveFormats
      // Let's look for a combined stream first (has video and audio)
      
      let videoUrl = null;
      
      // Check for formats array
      const formats = data.formats || [];
      const adaptive = data.adaptiveFormats || [];
      const allFormats = [...formats, ...adaptive];

      // Find best quality mp4 with audio
      // itag 22 is usually 720p mp4 with audio
      // itag 18 is 360p mp4 with audio
      const bestFormat = allFormats.find(f => f.itag === 22) || 
                         allFormats.find(f => f.itag === 18) ||
                         allFormats.find(f => f.mimeType?.includes('video/mp4') && f.audioQuality);

      if (bestFormat) {
        videoUrl = bestFormat.url;
      } else {
        // Fallback: try to find any video url
        // Note: if we pick a video-only stream, there will be no audio.
        // The /dl endpoint usually provides combined streams in 'formats'.
        if (formats.length > 0) videoUrl = formats[0].url;
      }

      if (videoUrl) {
        player.style.display = "none";
        player.src = ""; // Stop iframe
        nativePlayer.style.display = "block";
        nativePlayer.src = videoUrl;
        nativePlayer.play();
        
        btnNative.style.display = "none";
        btnIframe.style.display = "inline-block";
      } else {
        alert("No compatible download link found for this video.");
      }

    } catch (e) {
      console.error(e);
      alert("Failed to load native video: " + e.message);
    } finally {
      btnNative.textContent = "Watch Native / Download";
      btnNative.disabled = false;
    }
  }

  function switchToIframe() {
    if (!currentVideoId) return;
    nativePlayer.pause();
    nativePlayer.style.display = "none";
    player.style.display = "block";
    btnNative.style.display = "inline-block";
    btnIframe.style.display = "none";
    // Reload iframe with JS API enabled for pause/resume control
    player.src = `https://www.youtube-nocookie.com/embed/${currentVideoId}?autoplay=1&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
  }

  // Normalize API data
  function normalize(data){
    const out=[];
    const list = data?.data || data?.contents || data?.videos || (Array.isArray(data) ? data : []);
    
    if(Array.isArray(list)){
      for(const item of list){
        const v = item.video || item;
        const id = v.videoId || v.id;
        if(!id) continue;

        const title = v.title || "";
        const channel = v.channelTitle || v.channelName || v.uploaderName || v.channel?.title || "";
        
        let thumb = "";
        if(Array.isArray(v.thumbnail)) thumb = v.thumbnail[0]?.url;
        else if(Array.isArray(v.thumbnails)) thumb = v.thumbnails[0]?.url;
        else thumb = v.thumbnail || "";

        const views = v.viewCount || v.views || 0;
        
        let duration = v.lengthSeconds || v.duration || v.lengthText;
        // Parse "MM:SS" or "HH:MM:SS" to seconds if needed
        if (typeof duration === 'string' && duration.includes(':')) {
             const parts = duration.split(':').map(Number);
             if (parts.length === 2) duration = parts[0] * 60 + parts[1];
             else if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
        }

        out.push({id, title, channel, thumb, views, duration});
      }
    }
    return out;
  }

  // Render current page
  function renderPage(){
    grid.innerHTML="";
    const pageSize = settings.pageSize || 8;
    const start = pageIndex * pageSize;
    const slice = currentItems.slice(start, start + pageSize);
    slice.forEach(item=>{
      const card=document.createElement("div");
      card.className="card";
      
      const durationHtml = settings.showDuration ? `<div class="duration">${fmtDur(item.duration)}</div>` : '';
      const viewsHtml = settings.showViews ? `<div class="stats">${fmtInt(item.views)} views</div>` : '';
      
      card.innerHTML=`
        <div class="thumb">
          <img src="${item.thumb}" alt="">
          ${durationHtml}
        </div>
        <div class="info">
          <div class="title">${item.title}</div>
          <div class="channel">${item.channel}</div>
          ${viewsHtml}
        </div>`;
      card.onclick=()=>playVideo(item.id,item.title,item.channel);
      grid.appendChild(card);
    });
    prev.disabled=pageIndex===0;
    next.disabled=(start+pageSize)>=currentItems.length;
  }

  // Client-side cache for instant repeated searches
  const clientCache = {
    search: {},
    trending: {},
    shorts: null,
    CACHE_TIME: 5 * 60 * 1000 // 5 minutes
  };

  function isClientCacheValid(entry) {
    return entry && entry.timestamp && (Date.now() - entry.timestamp < clientCache.CACHE_TIME);
  }

  // Show loading state
  function showLoading() {
    grid.innerHTML = '<div class="loading-spinner" style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;"><div style="font-size: 2em; animation: spin 1s linear infinite; display: inline-block;">⏳</div><p>Loading...</p></div>';
  }

  // Fetch from our server API (keys hidden, responses cached on server + client)
  async function fetchAPI(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/supertube${endpoint}${queryString ? '?' + queryString : ''}`;
    const cacheKey = url;
    
    // Check client cache first for INSTANT response
    if (endpoint === '/search' && clientCache.search[cacheKey] && isClientCacheValid(clientCache.search[cacheKey])) {
      console.log('⚡ Instant from client cache:', cacheKey);
      return clientCache.search[cacheKey].data;
    }
    if (endpoint === '/trending' && clientCache.trending[cacheKey] && isClientCacheValid(clientCache.trending[cacheKey])) {
      console.log('⚡ Instant from client cache:', cacheKey);
      return clientCache.trending[cacheKey].data;
    }
    if (endpoint === '/shorts' && clientCache.shorts && isClientCacheValid(clientCache.shorts)) {
      console.log('⚡ Instant from client cache: shorts');
      return clientCache.shorts.data;
    }
    
    const res = await fetch(url);
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(error.error || `HTTP ${res.status}`);
    }
    
    const data = await res.json();
    
    // Cache the result client-side for instant future access
    if (endpoint === '/search') {
      clientCache.search[cacheKey] = { data, timestamp: Date.now() };
    } else if (endpoint === '/trending') {
      clientCache.trending[cacheKey] = { data, timestamp: Date.now() };
    } else if (endpoint === '/shorts') {
      clientCache.shorts = { data, timestamp: Date.now() };
    }
    
    return data;
  }

  // Load trending
  async function loadTrending(){
    try {
      // Hide player and reset layout when going home
      document.body.classList.remove('player-open');
      const playerBox = document.querySelector('.player');
      if (playerBox) playerBox.style.display = "none";
      if (shortsContainer) shortsContainer.style.display = "none";
      grid.parentElement.style.display = "block"; // Show grid section

      nowTitle.textContent = "Pick a video";
      nowChannel.textContent = "";
      nativePlayer.pause(); // Ensure native player is stopped

      const geo = region.value || "US";
      
      // Show loading if not cached
      const cacheKey = `/api/supertube/trending?geo=${geo}`;
      if (!clientCache.trending[cacheKey] || !isClientCacheValid(clientCache.trending[cacheKey])) {
        showLoading();
      }
      
      const data = await fetchAPI('/trending', { geo });
      currentItems = normalize(data);
      pageIndex = 0;
      renderPage();
    } catch (err) {
      console.error(err);
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ff6b6b;">Failed to load trending. Try again.</div>';
    }
  }

  // Load Shorts
  async function loadShorts(){
    try {
      document.body.classList.remove('player-open');
      const playerBox = document.querySelector('.player');
      if (playerBox) playerBox.style.display = "none";
      if (shortsContainer) shortsContainer.style.display = "none";
      grid.parentElement.style.display = "block"; // Show grid section

      nowTitle.textContent = "Shorts";
      nowChannel.textContent = "";
      nativePlayer.pause();

      // Show loading if not cached
      if (!clientCache.shorts || !isClientCacheValid(clientCache.shorts)) {
        showLoading();
      }

      // Search for shorts specifically
      const data = await fetchAPI('/shorts');
      currentItems = normalize(data);
      pageIndex = 0;
      renderPage();
    } catch (err) {
      console.error(err);
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ff6b6b;">Failed to load shorts. Try again.</div>';
    }
  }

  // Search
  async function searchVideos(){
    const query = q.value.trim();
    if (!query) return;
    // If the input is a YouTube URL or raw id, play immediately
    const id = extractYouTubeID(query);
    if(id){
      playVideo(id, `YouTube Video`, "");
      return;
    }

    // Otherwise close player until user clicks a result
    document.body.classList.remove('player-open');
    document.querySelector('.player').style.display = "none";

    // Show loading immediately (unless cached)
    const cacheKey = `/api/supertube/search?query=${encodeURIComponent(query)}`;
    if (!clientCache.search[cacheKey] || !isClientCacheValid(clientCache.search[cacheKey])) {
      showLoading();
    }

    try {
      const data = await fetchAPI('/search', { query });
      currentItems = normalize(data);
      pageIndex = 0;
      renderPage();
    } catch (err) {
      console.error(err);
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #ff6b6b;">Failed to search. Try again.</div>';
    }
  }

  // Pagination
  function doPrev(){if(pageIndex>0){pageIndex--;renderPage();}}
  function doNext(){
    const pageSize = settings.pageSize || 8;
    if((pageIndex+1)*pageSize<currentItems.length){pageIndex++;renderPage();}
  }

  // Event bindings
  btnTrending.addEventListener("click", loadTrending);
  btnShorts.addEventListener("click", loadShorts);
  btnSearch.addEventListener("click", searchVideos);
  btnNative.addEventListener("click", playNative);
  btnIframe.addEventListener("click", switchToIframe);
  q.addEventListener("keydown", e => { if (e.key === "Enter") searchVideos(); });
  prev.addEventListener("click", doPrev);
  next.addEventListener("click", doNext);
  region.addEventListener("change", loadTrending);

  // Add logo click to go home
  const logoEl = document.getElementById('logo');
  if (logoEl) {
    logoEl.addEventListener('click', () => {
      q.value = "";
      loadTrending();
    });
  }

  // ============== SECURE TIME CODE SYSTEM ==============
  const FREE_MINUTES = 10; // Free trial time in minutes
  const STORAGE_KEY = 'supertube_session';
  const TOKEN_COOKIE = 'supertube_access'; // Cookie name for access token
  
  // Session data now tracks:
  // - usedSeconds: For free trial mode
  // - serverTimeOffset: To sync with server time
  // - hasChosen: If user saw welcome popup
  // - pausedAt: TIMESTAMP when paused (null = not paused)
  // - totalPausedMs: Total milliseconds spent paused (persists across refreshes)
  // - lastActiveTime: Last time user was actively using SuperTube
  let sessionData = { 
    usedSeconds: 0, 
    serverTimeOffset: 0, 
    hasChosen: false, 
    pausedAt: null,           // Timestamp when paused (null = running)
    totalPausedMs: 0,         // Total ms paused (added to token expiry)
    lastActiveTime: null,     // Last time user was on SuperTube and running
    _autoPaused: false        // True if paused automatically (will auto-resume)
  };
  let accessToken = null;
  let timeCheckInterval = null;
  let isTimeLocked = false;
  let serverTime = Date.now(); // Will be synced with server
  let isPageActive = true; // Track if user is on this page
  
  // isPaused is now derived from sessionData.pausedAt
  function isPaused() {
    return sessionData.pausedAt !== null;
  }
  
  // Track page visibility and focus
  // Timer auto-pauses when leaving tab and auto-resumes when returning
  document.addEventListener('visibilitychange', () => {
    const wasActive = isPageActive;
    isPageActive = !document.hidden;
    
    if (wasActive && !isPageActive) {
      // Leaving page - auto-pause
      if (!isPaused()) {
        autoPause('left_page');
      }
    } else if (!wasActive && isPageActive) {
      // Returning to page - auto-resume
      if (isPaused() && sessionData._autoPaused) {
        autoResume('returned_to_page');
      }
    }
    
    updateTimerWidget();
  });
  
  window.addEventListener('focus', () => {
    const wasActive = isPageActive;
    isPageActive = true;
    
    // Auto-resume if we were auto-paused
    if (!wasActive && isPaused() && sessionData._autoPaused) {
      autoResume('window_focus');
    }
    
    updateTimerWidget();
  });
  
  window.addEventListener('blur', () => {
    isPageActive = false;
    // Auto-pause when leaving focus
    if (!isPaused()) {
      autoPause('lost_focus');
    }
    updateTimerWidget();
  });
  
  // Auto-pause function (doesn't require user interaction)
  // NOTE: Only pauses the TIMER, not the video - user can keep watching if they want
  function autoPause(reason) {
    if (isPaused()) return; // Already paused
    
    sessionData.pausedAt = getServerTime();
    sessionData._autoPaused = true; // Mark as auto-paused (will auto-resume)
    saveSession();
    // Don't pause video - only pause the timer
    // User might have video in background while doing other things
    console.log('⏸️ Auto-paused timer:', reason);
  }
  
  // Auto-resume function (when returning to page)
  function autoResume(reason) {
    if (!isPaused()) return; // Not paused
    
    const now = getServerTime();
    const pauseDuration = now - sessionData.pausedAt;
    sessionData.totalPausedMs += pauseDuration;
    sessionData.pausedAt = null;
    sessionData._autoPaused = false; // Clear auto-pause flag
    saveSession();
    // Don't auto-resume video - let user control it
    console.log('▶️ Auto-resumed timer:', reason, 'Paused for', Math.floor(pauseDuration / 1000), 'seconds');
  }
  
  // Cookie helper functions
  function setCookie(name, value, expiresMs) {
    const expires = new Date(expiresMs);
    document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
  }
  
  function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let c of cookies) {
      const [key, val] = c.trim().split('=');
      if (key === name) return decodeURIComponent(val);
    }
    return null;
  }
  
  function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Strict`;
  }
  
  // Get accurate server time (prevents user from changing local clock)
  async function syncServerTime() {
    try {
      const response = await fetch('/api/supertube/time');
      if (response.ok) {
        const data = await response.json();
        serverTime = data.serverTime;
        sessionData.serverTimeOffset = serverTime - Date.now();
        return true;
      }
    } catch (e) {
      console.error('Failed to sync server time');
    }
    return false;
  }
  
  function getServerTime() {
    return Date.now() + (sessionData.serverTimeOffset || 0);
  }
  
  function loadSession() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        sessionData = { 
          usedSeconds: data.usedSeconds || 0,
          serverTimeOffset: data.serverTimeOffset || 0,
          hasChosen: data.hasChosen || false,
          pausedAt: data.pausedAt || null,
          totalPausedMs: data.totalPausedMs || 0,
          lastActiveTime: data.lastActiveTime || null,
          _autoPaused: data._autoPaused || false
        };
        
        // If user was away from page, calculate time passed and add to paused time
        if (sessionData.lastActiveTime && !sessionData.pausedAt) {
          // User left without pausing - auto-pause was triggered
          // The pausedAt should have been set by autoPause
        }
      }
      
      // Load access token from COOKIE (auto-expires!)
      const tokenData = getCookie(TOKEN_COOKIE);
      if (tokenData) {
        try {
          const token = JSON.parse(tokenData);
          // Cookie exists = not expired by browser
          // Calculate effective expiry (original expiry + total paused time)
          const effectiveExpiry = token.expiresAt + sessionData.totalPausedMs;
          
          // If currently paused, add time since pause started
          let currentPausedMs = 0;
          if (sessionData.pausedAt) {
            currentPausedMs = getServerTime() - sessionData.pausedAt;
          }
          
          if (getServerTime() < effectiveExpiry + currentPausedMs) {
            accessToken = token;
          } else {
            // Token expired according to server time - delete it
            deleteCookie(TOKEN_COOKIE);
            accessToken = null;
          }
        } catch (e) {
          deleteCookie(TOKEN_COOKIE);
          accessToken = null;
        }
      } else {
        // Cookie doesn't exist = expired or never set
        accessToken = null;
      }
    } catch (e) {
      sessionData = { 
        usedSeconds: 0, 
        serverTimeOffset: 0, 
        hasChosen: false, 
        pausedAt: null, 
        totalPausedMs: 0,
        lastActiveTime: null,
        _autoPaused: false
      };
      accessToken = null;
    }
  }
  
  function saveSession() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
  }
  
  function saveToken(token) {
    accessToken = token;
    // Save token as cookie that expires at the token's expiry time
    // Cookie will auto-delete when expired, even offline!
    setCookie(TOKEN_COOKIE, JSON.stringify(token), token.expiresAt);
  }
  
  function deleteTokenAndRedirect() {
    deleteCookie(TOKEN_COOKIE);
    localStorage.removeItem(STORAGE_KEY);
    accessToken = null;
    // Redirect to home page
    window.location.href = '/index.html';
  }
  
  async function validateTokenWithServer() {
    if (!accessToken || !accessToken.signature) return false;
    
    // If offline, check if cookie still exists (browser auto-deletes expired cookies)
    const cookieExists = getCookie(TOKEN_COOKIE);
    if (!cookieExists) {
      // Cookie expired - redirect
      deleteTokenAndRedirect();
      return false;
    }
    
    // If offline, trust the cookie (it auto-expires)
    if (!navigator.onLine) {
      return true;
    }
    
    // Online - validate with server
    try {
      const response = await fetch('/api/supertube/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: accessToken })
      });
      
      const result = await response.json();
      
      if (!result.valid) {
        // Token invalid or expired - delete and redirect
        deleteTokenAndRedirect();
        return false;
      }
      
      // Update server time offset
      if (result.serverTime) {
        sessionData.serverTimeOffset = result.serverTime - Date.now();
        saveSession();
      }
      
      return true;
    } catch (e) {
      // Network error - trust the cookie
      return true;
    }
  }
  
  function hasTimeRemaining() {
    // Check if cookie exists (auto-expires when time is up)
    const cookieExists = getCookie(TOKEN_COOKIE);
    if (cookieExists && accessToken && accessToken.expiresAt) {
      const remaining = getTimeRemainingSeconds();
      if (remaining > 0) {
        return true;
      } else {
        // Expired - delete cookie
        deleteCookie(TOKEN_COOKIE);
        accessToken = null;
      }
    }
    // Check free trial time
    return sessionData.usedSeconds < FREE_MINUTES * 60;
  }
  
  function getTimeRemainingSeconds() {
    if (accessToken && accessToken.expiresAt) {
      const now = getServerTime();
      
      // Calculate effective expiry: original + total paused time
      let effectiveExpiry = accessToken.expiresAt + sessionData.totalPausedMs;
      
      // If currently paused, freeze the timer at the pause point
      if (isPaused()) {
        // Time remaining = expiry - pausedAt + totalPausedMs before this pause
        const timeWhenPaused = sessionData.pausedAt;
        const remaining = accessToken.expiresAt + sessionData.totalPausedMs - timeWhenPaused;
        // But we need to subtract the totalPausedMs that was already counted before this pause
        // Actually simpler: remaining = expiresAt - (pausedAt - totalPausedMs)
        // Wait, let me think... when paused at time T:
        // - Token expires at E
        // - Total paused before this = P
        // - So effective runtime before pause = T - sessionStart - P
        // - Time remaining when paused = E - T + P
        // Which is what we have: effectiveExpiry - pausedAt
        const pauseTimeRemaining = accessToken.expiresAt + sessionData.totalPausedMs - sessionData.pausedAt;
        return Math.max(0, Math.floor(pauseTimeRemaining / 1000));
      }
      
      // Not paused - calculate normally
      const remaining = effectiveExpiry - now;
      return Math.max(0, Math.floor(remaining / 1000));
    }
    
    // Free trial mode
    return Math.max(0, FREE_MINUTES * 60 - sessionData.usedSeconds);
  }
  
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  // ============== TIMER WIDGET ==============
  function createTimerWidget() {
    // Remove existing
    const existing = document.getElementById('supertube-timer');
    if (existing) existing.remove();
    
    const widget = document.createElement('div');
    widget.id = 'supertube-timer';
    widget.innerHTML = `
      <style>
        #supertube-timer {
          position: fixed;
          top: 15px;
          right: 15px;
          z-index: 9999;
          font-family: 'Segoe UI', sans-serif;
        }
        #timer-display {
          background: linear-gradient(135deg, #1a1a2e, #16213e);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 10px 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        #timer-display:hover {
          transform: scale(1.02);
          box-shadow: 0 6px 20px rgba(0,0,0,0.4);
        }
        #timer-display .time-value {
          font-size: 1.3em;
          font-weight: bold;
          color: #4ecdc4;
          font-family: 'Courier New', monospace;
          min-width: 55px;
        }
        #timer-display .time-value.warning {
          color: #ffd93d;
        }
        #timer-display .time-value.critical {
          color: #ff6b6b;
          animation: pulse 1s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        #timer-display .status-icon {
          font-size: 1.1em;
        }
        #timer-display .status-text {
          font-size: 0.75em;
          color: #666;
        }
        #timer-dropdown {
          display: none;
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          background: linear-gradient(135deg, #1a1a2e, #16213e);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 12px;
          min-width: 220px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }
        #timer-dropdown.show {
          display: block;
        }
        #timer-dropdown .dropdown-item {
          padding: 12px 15px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #ccc;
          transition: background 0.2s;
          margin-bottom: 5px;
        }
        #timer-dropdown .dropdown-item:last-child {
          margin-bottom: 0;
        }
        #timer-dropdown .dropdown-item:hover {
          background: rgba(255,255,255,0.1);
        }
        #timer-dropdown .dropdown-item.active {
          background: rgba(78, 205, 196, 0.2);
          color: #4ecdc4;
        }
        #timer-dropdown .dropdown-item .icon {
          font-size: 1.2em;
        }
        #timer-dropdown .divider {
          height: 1px;
          background: rgba(255,255,255,0.1);
          margin: 10px 0;
        }
        #timer-dropdown .time-info {
          padding: 10px 15px;
          color: #888;
          font-size: 0.85em;
          text-align: center;
        }
      </style>
      <div id="timer-display" onclick="window.toggleTimerDropdown()">
        <span class="status-icon">⏱️</span>
        <div>
          <span class="time-value" id="timer-value">--:--</span>
          <div class="status-text" id="timer-status">Loading...</div>
        </div>
      </div>
      <div id="timer-dropdown">
        <div class="time-info" id="timer-type-info">Free Trial</div>
        <div class="divider"></div>
        <div class="dropdown-item" id="pause-btn" onclick="window.toggleTimerPause()">
          <span class="icon">⏸️</span>
          <span>Pause Timer</span>
        </div>
        <div class="dropdown-item" onclick="window.showAddCodePopup()">
          <span class="icon">➕</span>
          <span>Add Time Code</span>
        </div>
        <div class="divider"></div>
        <div class="dropdown-item" onclick="window.location.href='/index.html'">
          <span class="icon">🏠</span>
          <span>Exit to Home</span>
        </div>
      </div>
    `;
    document.body.appendChild(widget);
    
    // Close dropdown when clicking outside - DON'T auto-resume (user must click resume)
    document.addEventListener('click', (e) => {
      const timer = document.getElementById('supertube-timer');
      const dropdown = document.getElementById('timer-dropdown');
      if (timer && dropdown && !timer.contains(e.target)) {
        dropdown.classList.remove('show');
      }
    });
  }
  
  window.toggleTimerDropdown = function() {
    const dropdown = document.getElementById('timer-dropdown');
    if (dropdown) {
      dropdown.classList.toggle('show');
    }
  };
  
  window.toggleTimerPause = function() {
    const now = getServerTime();
    
    if (isPaused()) {
      // RESUME: Calculate how long we were paused and add to totalPausedMs
      const pauseDuration = now - sessionData.pausedAt;
      sessionData.totalPausedMs += pauseDuration;
      sessionData.pausedAt = null; // Clear pause state
      sessionData._autoPaused = false; // Manual resume clears auto-pause flag
      saveSession();
      
      resumeAllMedia();
      console.log('▶️ Timer resumed. Paused for', Math.floor(pauseDuration / 1000), 'seconds');
    } else {
      // PAUSE: Record when we paused (manual pause)
      sessionData.pausedAt = now;
      sessionData._autoPaused = false; // Manual pause won't auto-resume
      saveSession();
      
      pauseAllMedia();
      console.log('⏸️ Timer paused (manual)');
    }
    
    updateTimerWidget();
  };
  
  window.showAddCodePopup = function() {
    // Close dropdown
    const dropdown = document.getElementById('timer-dropdown');
    if (dropdown) dropdown.classList.remove('show');
    
    // Create mini popup for adding code
    const existing = document.querySelector('.add-code-popup');
    if (existing) existing.remove();
    
    const popup = document.createElement('div');
    popup.className = 'add-code-popup supertube-popup';
    popup.innerHTML = `
      <style>${popupStyles}</style>
      <div class="popup-content" style="max-width: 360px;">
        <div class="time-icon">➕</div>
        <h2>Add Time Code</h2>
        <p class="subtitle">Enter a code to add more time</p>
        <input type="text" id="add-code-input" placeholder="XXXXXX" maxlength="6" autocomplete="off">
        <button class="btn-primary" onclick="window.submitAddCode()">Add Time</button>
        <button class="btn-secondary" onclick="this.closest('.add-code-popup').remove()">Cancel</button>
        <p class="error" id="add-code-error"></p>
      </div>
    `;
    document.body.appendChild(popup);
    
    setTimeout(() => document.getElementById('add-code-input').focus(), 100);
    
    document.getElementById('add-code-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') window.submitAddCode();
      if (e.key === 'Escape') popup.remove();
    });
  };
  
  window.submitAddCode = async function() {
    const input = document.getElementById('add-code-input');
    const error = document.getElementById('add-code-error');
    const code = input.value.trim().toUpperCase();
    
    if (!code || code.length !== 6) {
      error.textContent = 'Please enter a 6-character code';
      error.style.display = 'block';
      return;
    }
    
    try {
      const response = await fetch('/api/supertube/redeem-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code, 
          clientId: localStorage.getItem('clientId') || 'anonymous' 
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        saveToken({
          code: result.code,
          expiresAt: result.expiresAt,
          signature: result.signature,
          issuedAt: result.issuedAt
        });
        
        if (result.serverTime) {
          sessionData.serverTimeOffset = result.serverTime - Date.now();
        }
        // Reset timer state for new code
        sessionData.usedSeconds = 0;
        sessionData.pausedAt = null;
        sessionData.totalPausedMs = 0;
        saveSession();
        
        document.querySelector('.add-code-popup').remove();
        updateTimerWidget();
        
        // Show success toast
        showToast(`✅ Added ${result.minutes} minutes!`);
      } else {
        error.textContent = result.error || 'Invalid code';
        error.style.display = 'block';
        input.value = '';
        input.focus();
      }
    } catch (e) {
      error.textContent = 'Failed to verify code';
      error.style.display = 'block';
    }
  };
  
  function showToast(message) {
    const existing = document.querySelector('.supertube-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'supertube-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #4ecdc4, #44a08d);
      color: #000;
      padding: 15px 25px;
      border-radius: 10px;
      font-weight: bold;
      z-index: 99999;
      animation: toastIn 0.3s ease;
    `;
    toast.innerHTML = `<style>@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(20px); } }</style>${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
  }
  
  // Non-blocking welcome banner for first-time visitors
  function showWelcomeBanner() {
    const banner = document.createElement('div');
    banner.id = 'welcome-banner';
    banner.style.cssText = `
      position: fixed;
      top: 70px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      padding: 15px 25px;
      border-radius: 12px;
      font-size: 14px;
      z-index: 9998;
      box-shadow: 0 5px 20px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 15px;
      max-width: 90%;
    `;
    banner.innerHTML = `
      <span>🎉 Welcome! You have ${FREE_MINUTES} free minutes. <a href="#" onclick="window.showAddCodePopup(); document.getElementById('welcome-banner').remove(); return false;" style="color:#fff; text-decoration:underline;">Add time code</a> for more.</span>
      <button onclick="this.parentElement.remove()" style="background:transparent; border:none; color:#fff; font-size:18px; cursor:pointer; padding:0;">×</button>
    `;
    document.body.appendChild(banner);
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      const el = document.getElementById('welcome-banner');
      if (el) el.remove();
    }, 10000);
  }
  
  function updateTimerWidget() {
    const timeValue = document.getElementById('timer-value');
    const statusText = document.getElementById('timer-status');
    const typeInfo = document.getElementById('timer-type-info');
    const pauseBtn = document.getElementById('pause-btn');
    
    if (!timeValue) return;
    
    const remaining = getTimeRemainingSeconds();
    timeValue.textContent = formatTime(remaining);
    
    // Color coding
    timeValue.classList.remove('warning', 'critical');
    if (remaining <= 60) {
      timeValue.classList.add('critical');
    } else if (remaining <= 180) {
      timeValue.classList.add('warning');
    }
    
    // Status text - use isPaused() function now
    if (isPaused()) {
      statusText.textContent = '⏸️ Paused';
      statusText.style.color = '#ffd93d';
    } else if (!isPageActive) {
      statusText.textContent = '⏸️ Away (Paused)';
      statusText.style.color = '#888';
    } else {
      statusText.textContent = '▶️ Running';
      statusText.style.color = '#4ecdc4';
    }
    
    // Type info
    if (typeInfo) {
      if (accessToken) {
        typeInfo.textContent = `🎫 Code: ${accessToken.code || 'Active'}`;
      } else {
        typeInfo.textContent = `🆓 Free Trial`;
      }
    }
    
    // Pause button state
    if (pauseBtn) {
      if (isPaused()) {
        pauseBtn.innerHTML = '<span class="icon">▶️</span><span>Resume Timer</span>';
        pauseBtn.classList.add('active');
      } else {
        pauseBtn.innerHTML = '<span class="icon">⏸️</span><span>Pause Timer</span>';
        pauseBtn.classList.remove('active');
      }
    }
  }
  
  // Common popup styles
  const popupStyles = `
    .supertube-popup {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.95);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .supertube-popup .popup-content {
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      border-radius: 16px;
      padding: 40px;
      max-width: 420px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.1);
    }
    .supertube-popup h2 {
      color: #fff;
      margin: 0 0 10px 0;
      font-size: 1.8em;
    }
    .supertube-popup .subtitle {
      color: #9ca3af;
      margin-bottom: 25px;
    }
    .supertube-popup .time-icon {
      font-size: 4em;
      margin-bottom: 15px;
    }
    .supertube-popup input {
      width: 100%;
      padding: 15px;
      font-size: 1.4em;
      text-align: center;
      letter-spacing: 8px;
      border: 2px solid rgba(255,255,255,0.2);
      border-radius: 10px;
      background: rgba(255,255,255,0.05);
      color: #fff;
      text-transform: uppercase;
      margin-bottom: 15px;
      box-sizing: border-box;
    }
    .supertube-popup input:focus {
      outline: none;
      border-color: #4ecdc4;
    }
    .supertube-popup button {
      width: 100%;
      padding: 15px;
      font-size: 1.1em;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      margin-bottom: 10px;
      box-sizing: border-box;
    }
    .supertube-popup button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(0,0,0,0.3);
    }
    .supertube-popup .btn-primary {
      background: linear-gradient(135deg, #4ecdc4, #44a08d);
      color: #000;
      font-weight: bold;
    }
    .supertube-popup .btn-free {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: #fff;
      font-weight: bold;
    }
    .supertube-popup .btn-secondary {
      background: rgba(255,255,255,0.1);
      color: #9ca3af;
    }
    .supertube-popup .btn-disabled {
      background: rgba(255,255,255,0.05);
      color: #555;
      cursor: not-allowed;
    }
    .supertube-popup .btn-disabled:hover {
      transform: none;
      box-shadow: none;
    }
    .supertube-popup .error {
      color: #ff6b6b;
      margin-top: 15px;
      display: none;
    }
    .supertube-popup .success {
      color: #4ecdc4;
      margin-top: 15px;
    }
    .supertube-popup .info {
      color: #666;
      font-size: 0.85em;
      margin-top: 20px;
    }
    .supertube-popup .divider {
      color: #555;
      margin: 20px 0;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .supertube-popup .divider::before,
    .supertube-popup .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgba(255,255,255,0.1);
    }
  `;
  
  // Welcome popup - shows immediately on first visit or when no active session
  function createWelcomePopup() {
    const existing = document.getElementById('supertube-welcome');
    if (existing) existing.remove();
    
    const freeUsed = sessionData.usedSeconds >= FREE_MINUTES * 60;
    const freeRemaining = Math.max(0, FREE_MINUTES * 60 - sessionData.usedSeconds);
    const freeRemainingMins = Math.ceil(freeRemaining / 60);
    
    const popup = document.createElement('div');
    popup.id = 'supertube-welcome';
    popup.className = 'supertube-popup';
    popup.innerHTML = `
      <style>${popupStyles}</style>
      <div class="popup-content">
        <div class="time-icon">📺</div>
        <h2>Welcome to SuperTube!</h2>
        <p class="subtitle">Choose how you'd like to access SuperTube</p>
        
        ${freeUsed ? `
          <button class="btn-disabled" disabled>❌ Free Trial Used</button>
        ` : `
          <button class="btn-free" onclick="window.startFreeTrial()">
            🎉 Use Free ${freeRemainingMins} Minutes
          </button>
        `}
        
        <div class="divider">OR</div>
        
        <input type="text" id="welcome-code-input" placeholder="XXXXXX" maxlength="6" autocomplete="off">
        <button class="btn-primary" onclick="window.redeemWelcomeCode()">🔓 Enter Time Code</button>
        
        <button class="btn-secondary" onclick="window.location.href='/index.html'">← Back to Home</button>
        
        <p class="error" id="welcome-error"></p>
        <p class="info">💡 Time codes give you extended access. Get them from the site owner.</p>
      </div>
    `;
    document.body.appendChild(popup);
    
    // Enter key to submit code
    document.getElementById('welcome-code-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') window.redeemWelcomeCode();
    });
  }
  
  // Start free trial
  window.startFreeTrial = function() {
    const popup = document.getElementById('supertube-welcome');
    if (popup) popup.remove();
    sessionData.hasChosen = true;
    saveSession();
    isTimeLocked = false;
  };
  
  // Redeem code from welcome popup
  window.redeemWelcomeCode = async function() {
    const input = document.getElementById('welcome-code-input');
    const error = document.getElementById('welcome-error');
    const code = input.value.trim().toUpperCase();
    
    if (!code || code.length !== 6) {
      error.textContent = 'Please enter a 6-character code';
      error.style.display = 'block';
      return;
    }
    
    try {
      const response = await fetch('/api/supertube/redeem-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code, 
          clientId: localStorage.getItem('clientId') || 'anonymous' 
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Save the signed token
        saveToken({
          code: result.code,
          expiresAt: result.expiresAt,
          signature: result.signature,
          issuedAt: result.issuedAt
        });
        
        if (result.serverTime) {
          sessionData.serverTimeOffset = result.serverTime - Date.now();
        }
        sessionData.usedSeconds = 0;
        saveSession();
        
        // Show "another code" popup
        showAnotherCodePopup(result.minutes);
      } else {
        error.textContent = result.error || 'Invalid code';
        error.style.display = 'block';
        input.value = '';
        input.focus();
      }
    } catch (e) {
      error.textContent = 'Failed to verify code. Check your connection.';
      error.style.display = 'block';
    }
  };
  
  // Popup after code redeemed - ask for another or start
  function showAnotherCodePopup(minutes) {
    const existing = document.getElementById('supertube-welcome');
    if (existing) existing.remove();
    
    const freeUsed = sessionData.usedSeconds >= FREE_MINUTES * 60;
    
    const popup = document.createElement('div');
    popup.id = 'supertube-another';
    popup.className = 'supertube-popup';
    popup.innerHTML = `
      <style>${popupStyles}</style>
      <div class="popup-content">
        <div class="time-icon">✅</div>
        <h2>Code Accepted!</h2>
        <p class="success">You now have ${minutes} minutes of access!</p>
        <p class="subtitle">Do you have another code to add more time?</p>
        
        <input type="text" id="another-code-input" placeholder="XXXXXX" maxlength="6" autocomplete="off">
        <button class="btn-primary" onclick="window.redeemAnotherCode()">➕ Add Another Code</button>
        
        <div class="divider">OR</div>
        
        <button class="btn-free" onclick="window.startWatching()">▶️ Start Watching Now</button>
        
        ${!freeUsed ? `
          <button class="btn-secondary" onclick="window.startFreeTrial()">
            🎉 Use Free ${FREE_MINUTES} Mins Instead
          </button>
        ` : ''}
        
        <p class="error" id="another-error"></p>
      </div>
    `;
    document.body.appendChild(popup);
    
    document.getElementById('another-code-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') window.redeemAnotherCode();
    });
  }
  
  // Redeem another code
  window.redeemAnotherCode = async function() {
    const input = document.getElementById('another-code-input');
    const error = document.getElementById('another-error');
    const code = input.value.trim().toUpperCase();
    
    if (!code || code.length !== 6) {
      error.textContent = 'Please enter a 6-character code';
      error.style.display = 'block';
      return;
    }
    
    try {
      const response = await fetch('/api/supertube/redeem-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code, 
          clientId: localStorage.getItem('clientId') || 'anonymous' 
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Save new token (extends/replaces old)
        saveToken({
          code: result.code,
          expiresAt: result.expiresAt,
          signature: result.signature,
          issuedAt: result.issuedAt
        });
        
        if (result.serverTime) {
          sessionData.serverTimeOffset = result.serverTime - Date.now();
        }
        saveSession();
        
        // Show another code popup again with updated time
        const popup = document.getElementById('supertube-another');
        if (popup) popup.remove();
        showAnotherCodePopup(result.minutes);
      } else {
        error.textContent = result.error || 'Invalid code';
        error.style.display = 'block';
        input.value = '';
        input.focus();
      }
    } catch (e) {
      error.textContent = 'Failed to verify code. Check your connection.';
      error.style.display = 'block';
    }
  };
  
  // Start watching
  window.startWatching = function() {
    const popup = document.getElementById('supertube-another');
    if (popup) popup.remove();
    sessionData.hasChosen = true;
    saveSession();
    isTimeLocked = false;
  };
  
  // Time's up popup - when free trial ends
  function createTimeCodePopup() {
    const existing = document.querySelectorAll('.supertube-popup');
    existing.forEach(p => p.remove());
    
    const popup = document.createElement('div');
    popup.id = 'timecode-popup';
    popup.className = 'supertube-popup';
    popup.innerHTML = `
      <style>${popupStyles}</style>
      <div class="popup-content">
        <div class="time-icon">⏱️</div>
        <h2>Time's Up!</h2>
        <p class="subtitle">Your free ${FREE_MINUTES}-minute trial has ended.<br>Enter a time code to continue watching.</p>
        <input type="text" id="timecode-input" placeholder="XXXXXX" maxlength="6" autocomplete="off">
        <button class="btn-primary" onclick="window.redeemTimeCode()">🔓 Unlock Access</button>
        <button class="btn-secondary" onclick="window.location.href='/index.html'">← Back to Home</button>
        <p class="error" id="timecode-error"></p>
        <p class="info">💡 Get time codes from the site owner</p>
      </div>
    `;
    document.body.appendChild(popup);
    
    setTimeout(() => {
      document.getElementById('timecode-input').focus();
    }, 100);
    
    document.getElementById('timecode-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') window.redeemTimeCode();
    });
  }
  
  window.redeemTimeCode = async function() {
    const input = document.getElementById('timecode-input');
    const error = document.getElementById('timecode-error');
    const code = input.value.trim().toUpperCase();
    
    if (!code || code.length !== 6) {
      error.textContent = 'Please enter a 6-character code';
      error.style.display = 'block';
      return;
    }
    
    try {
      const response = await fetch('/api/supertube/redeem-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code, 
          clientId: localStorage.getItem('clientId') || 'anonymous' 
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Save the signed token from server
        saveToken({
          code: result.code,
          expiresAt: result.expiresAt,
          signature: result.signature,
          issuedAt: result.issuedAt
        });
        
        // Update server time offset
        if (result.serverTime) {
          sessionData.serverTimeOffset = result.serverTime - Date.now();
        }
        sessionData.usedSeconds = 0; // Reset free trial counter
        saveSession();
        
        // Remove popup and show another code option
        document.getElementById('timecode-popup').remove();
        isTimeLocked = false;
        resumeAllMedia();
        
        // Show another code popup
        showAnotherCodePopup(result.minutes);
      } else {
        error.textContent = result.error || 'Invalid code';
        error.style.display = 'block';
        input.value = '';
        input.focus();
      }
    } catch (e) {
      error.textContent = 'Failed to verify code. Check your connection.';
      error.style.display = 'block';
    }
  };
  
  function pauseAllMedia() {
    // Pause native player
    if (nativePlayer) nativePlayer.pause();
    // Pause YouTube iframe using postMessage API
    if (player && player.contentWindow) {
      try {
        player.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'pauseVideo',
          args: []
        }), '*');
      } catch (e) {
        console.log('Could not pause iframe video');
      }
    }
  }
  
  function resumeAllMedia() {
    // Resume YouTube iframe using postMessage API
    if (player && player.contentWindow) {
      try {
        player.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: 'playVideo',
          args: []
        }), '*');
      } catch (e) {
        console.log('Could not resume iframe video');
      }
    }
    // Resume native player if it was playing
    // Note: Don't auto-play native, let user click play
  }
  
  function lockForTimeCode() {
    if (isTimeLocked) return;
    isTimeLocked = true;
    pauseAllMedia();
    createTimeCodePopup();
  }
  
  async function startTimeTracking() {
    // Sync server time first
    await syncServerTime();
    
    // Load session data
    loadSession();
    
    // If page loaded while was auto-paused, resume immediately
    if (sessionData._autoPaused && isPaused() && isPageActive) {
      autoResume('page_reload');
    }
    
    // If returning to page and was paused from leaving, resume
    if (sessionData.pausedAt && sessionData._autoPaused && isPageActive) {
      autoResume('session_restore');
    }
    
    // Create timer widget (always visible)
    createTimerWidget();
    
    // Validate existing token with server
    if (accessToken) {
      const valid = await validateTokenWithServer();
      if (!valid) return; // Already redirected
      
      // Has valid token - no popup needed, timer runs immediately
      sessionData.hasChosen = true;
      isTimeLocked = false;
      saveSession();
    }
    
    // For new visitors - skip welcome popup, start timer immediately
    // Show a non-blocking info banner instead
    if (!sessionData.hasChosen && !accessToken) {
      // Auto-start free trial - no blocking popup
      sessionData.hasChosen = true;
      isTimeLocked = false;
      saveSession();
      
      // Show non-blocking welcome toast
      showWelcomeBanner();
    }
    
    // Initial timer update
    updateTimerWidget();
    
    // Update lastActiveTime
    sessionData.lastActiveTime = getServerTime();
    saveSession();
    
    if (timeCheckInterval) clearInterval(timeCheckInterval);
    
    timeCheckInterval = setInterval(async () => {
      // Always update timer display
      updateTimerWidget();
      
      // Check token expiry
      if (accessToken && accessToken.expiresAt) {
        // Calculate effective expiry with paused time
        let effectiveExpiry = accessToken.expiresAt + sessionData.totalPausedMs;
        
        // If currently paused, don't check expiry (timer is frozen)
        if (!isPaused()) {
          const now = getServerTime();
          if (now >= effectiveExpiry) {
            // Token expired - delete and redirect
            deleteTokenAndRedirect();
            return;
          }
        }
      }
      
      // Only count FREE TRIAL time if:
      // 1. Page is visible/focused (isPageActive)
      // 2. Not locked (isTimeLocked)
      // 3. Not paused (isPaused())
      // 4. Using free trial (no accessToken)
      if (isPageActive && !isTimeLocked && !isPaused() && !accessToken) {
        sessionData.usedSeconds++;
        sessionData.lastActiveTime = getServerTime();
        saveSession();
        
        // Check if time ran out (free trial ended)
        if (!hasTimeRemaining()) {
          lockForTimeCode();
        }
      }
      
      // Update lastActiveTime when running
      if (isPageActive && !isPaused()) {
        sessionData.lastActiveTime = getServerTime();
        // Don't save every second to reduce writes
      }
      
      // Periodically validate token with server (every ~60 seconds when online)
      if (accessToken && navigator.onLine && Math.random() < 0.017) { // ~1/60 chance per second
        await validateTokenWithServer();
      }
    }, 1000);
  }
  
  // Start tracking
  startTimeTracking();

  // Initial load
  loadTrending();
  // player hidden by default via CSS
});
