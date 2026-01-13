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
  const API_HOST = "yt-api.p.rapidapi.com";
  const API_KEYS = [
    "628135d18cmsh9281abbf2c08801p1744fdjsndd8e9e7b173d",
    "f0818770admsh5ea686ccfe9dbd6p1376c5jsnd5ce231c2c6c"
  ];
  let apiKeyIndex = 0;
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
    const autoplayParam = settings.autoplay ? '?autoplay=1' : '';
    player.src = `https://www.youtube-nocookie.com/embed/${id}${autoplayParam}`;

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
    // Reload iframe
    player.src = `https://www.youtube.com/embed/${currentVideoId}?autoplay=1&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3`;
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

  // Fetch helper with automatic key fallback
  async function fetchAPI(path){
    const res = await fetch(`https://${API_HOST}${path}`,{
      headers: {
        "X-RapidAPI-Key": API_KEYS[apiKeyIndex],
        "X-RapidAPI-Host": API_HOST
      }
    });
    
    // If quota exceeded (429) or forbidden (403), try next key
    if ((res.status === 429 || res.status === 403) && apiKeyIndex < API_KEYS.length - 1) {
      console.log(`API key ${apiKeyIndex + 1} exhausted, switching to key ${apiKeyIndex + 2}`);
      apiKeyIndex++;
      return fetchAPI(path); // Retry with next key
    }
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
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
      const data = await fetchAPI(`/trending?geo=${encodeURIComponent(geo)}`);
      currentItems = normalize(data);
      pageIndex = 0;
      renderPage();
    } catch (err) {
      console.error(err);
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

      // Search for shorts specifically
      const data = await fetchAPI(`/search?query=shorts&type=video`);
      currentItems = normalize(data);
      pageIndex = 0;
      renderPage();
    } catch (err) {
      console.error(err);
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

    try {
      const data = await fetchAPI(`/search?query=${encodeURIComponent(query)}`);
      currentItems = normalize(data);
      pageIndex = 0;
      renderPage();
    } catch (err) {
      console.error(err);
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

  // Initial load
  loadTrending();
  // player hidden by default via CSS
});
