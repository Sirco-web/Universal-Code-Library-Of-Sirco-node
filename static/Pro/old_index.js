// /////////////////////////////
// Proxy Settings and Utilities
// /////////////////////////////
const proxyMapping = {
  "1": "https://corsproxy.io/?url=",
  "2": "https://cors-anywhere.herokuapp.com/",
  "3": "https://thingproxy.freeboard.io/fetch/",
  // Option 4: AllOrigins returns JSON with HTML in "contents"
  "4": "https://api.allorigins.hexocode.repl.co/get?disableCache=true&url="
};

function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

// Load & save settings for the proxy (from localStorage)
function getSavedSettings() {
  const settings = localStorage.getItem("proxySettings");
  return settings ? JSON.parse(settings) : null;
}

function saveSettings(settings) {
  localStorage.setItem("proxySettings", JSON.stringify(settings));
}

// /////////////////////////////
// Force Base Tag Insertion
// /////////////////////////////
// Remove any existing <base> tag and insert one with href equal to the target URL
function forceBaseTag(html, baseHref) {
  html = html.replace(/<base\s+href=["'][^"']*["']\s*\/?>/i, "");
  return html.replace(/<head>/i, `<head><base href="${baseHref}">`);
}

// /////////////////////////////
// Rewrite Resource URLs
// /////////////////////////////
// This function processes any element with src, href, or action attribute (except links)
// that is a relative URL and rewrites it so that the attribute becomes: proxyBase + resolved URL.
// For example, <link rel="manifest" href="/manifest"> becomes:
//   <link rel="manifest" href="https://cors-anywhere.herokuapp.com/https://crazygames.com/manifest">
function rewriteResourceUrls(html, baseUrl, proxyBase) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const elements = doc.querySelectorAll("[src], [href], [action]");
    elements.forEach(el => {
      if (el.tagName.toLowerCase() === "a") return;
      ["src", "href", "action"].forEach(attr => {
        const val = el.getAttribute(attr);
        if (
          val &&
          !val.startsWith("data:") &&
          !/^mailto:/.test(val) &&
          !/^javascript:/.test(val)
        ) {
          // If the value is relative (does not start with a full "http(s)://" or "//")
          if (!/^https?:\/\//i.test(val) && !/^\/\//.test(val)) {
            try {
              const resolved = new URL(val, baseUrl).href;
              const newVal = proxyBase + resolved;
              el.setAttribute(attr, newVal);
            } catch(e) { }
          }
        }
      });
    });
    // Remove any <base> tag so that the browser does not later re-resolve URLs incorrectly.
    const baseTag = doc.querySelector("base");
    if (baseTag) baseTag.remove();
    return "<!DOCTYPE html>" + doc.documentElement.outerHTML;
  } catch(e) {
    return html;
  }
}

// /////////////////////////////
// Navigation Interceptor & Overrides (for fetch, XHR, and dynamic nodes)
// /////////////////////////////
function getInterceptorScript(originalUrl, proxyBase, proxyId) {
  return `<script>
(function() {
  const __ORIGINAL_URL = "${originalUrl}";
  const __PROXY_BASE = "${proxyBase}";
  const __PROXY_ID = "${proxyId}";
  
  try {
    const origReplaceState = history.replaceState;
    history.replaceState = function(...args) {
      try { return origReplaceState.apply(history, args); }
      catch (error) { console.warn("Blocked history.replaceState:", error); }
    };
  } catch(e) { }
  
  function handleNavigation(url) {
    if (
      url.startsWith("https://corsproxy.io/") ||
      url.startsWith("https://cors-anywhere.herokuapp.com/") ||
      url.startsWith("https://thingproxy.freeboard.io/fetch/")
    ) {
      try {
        const u = new URL(url);
        const orig = u.searchParams.get("url");
        if (orig) { url = orig; }
      } catch(e) { }
    }
    if (!/^https?:\\/\\//i.test(url)) {
      try { url = new URL(url, __ORIGINAL_URL).href; }
      catch(e) { }
    }
    var newUrl = window.location.origin + window.location.pathname + "?proxy=" + __PROXY_ID + "&url=" + encodeURIComponent(url);
    const settings = getQueryParam("settings");
    if (settings) { newUrl += "&settings=" + encodeURIComponent(settings); }
    window.location.href = newUrl;
  }
  
  window.location.assign = function(url) { handleNavigation(url); };
  window.location.replace = function(url) { handleNavigation(url); };
  window.open = function(url, name, specs) { handleNavigation(url); return null; };
  
  document.addEventListener("click", function(e) {
    const anchor = e.target.closest("a");
    if (anchor && anchor.getAttribute("href")) {
      e.preventDefault();
      handleNavigation(anchor.href);
      return;
    }
    const button = e.target.closest("button");
    if (button) {
      const onclickAttr = button.getAttribute("onclick");
      if (onclickAttr && /location\\.href\\s*=\\s*["'][^"']+["']/i.test(onclickAttr)) {
        e.preventDefault();
        const match = onclickAttr.match(/location\\.href\\s*=\\s*["']([^"']+)["']/i);
        if (match && match[1]) { handleNavigation(match[1]); return; }
      }
    }
  }, true);
  
  // Override fetch: if a relative URL is provided, resolve it against __ORIGINAL_URL.
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    let url;
    if (typeof input === "string") { url = input; }
    else if (input instanceof Request) { url = input.url; }
    if (!/^https?:\\/\\//i.test(url)) {
      try { url = new URL(url, __ORIGINAL_URL).href; } catch(e) { }
    }
    return originalFetch(__PROXY_BASE + url, init);
  };
  
  // Override XMLHttpRequest.open similarly.
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    if (!/^https?:\\/\\//i.test(url)) {
      try { url = new URL(url, __ORIGINAL_URL).href; } catch(e) { }
    }
    return origOpen.call(this, method, __PROXY_BASE + url, async, user, password);
  };
  
  // MutationObserver for dynamic nodes.
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) { processElement(node); }
      });
    });
  });
  
  function processElement(el) {
    if (el.nodeType !== 1) return;
    ["src", "href", "action"].forEach(attr => {
      const val = el.getAttribute(attr);
      if (val && !/^https?:\\/\\//i.test(val) && !/^\\/\\//.test(val)) {
        try {
          const resolved = new URL(val, __ORIGINAL_URL).href;
          el.setAttribute(attr, __PROXY_BASE + resolved);
        } catch(e) { }
      }
    });
    el.querySelectorAll("[src], [href], [action]").forEach(child => { processElement(child); });
  }
  
  observer.observe(document.documentElement || document.body, {
    childList: true,
    subtree: true
  });
  
  // Expose getQueryParam for use within this script.
  window.getQueryParam = ${getQueryParam.toString()};
})();
<\/script>`;
}

function injectInterceptor(html, originalUrl, proxyBase, proxyId) {
  const interceptorScript = getInterceptorScript(originalUrl, proxyBase, proxyId);
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, interceptorScript + "</body>");
  } else {
    return html + interceptorScript;
  }
}

// /////////////////////////////
// Fetch & Replace Content
// /////////////////////////////
async function fetchAndReplace(proxyBase, targetUrl, proxyId, settings) {
  let data;
  if (proxyId === "4") {
    // For AllOrigins, call the API and extract "contents".
    const fetchUrl = proxyBase + targetUrl;
    try {
      let response = await fetch(fetchUrl);
      if (!response.ok) throw new Error("HTTP error " + response.status);
      let json = await response.json();
      data = json.contents;
    } catch (error) {
      document.body.innerHTML = "Error loading site (AllOrigins): " + error;
      return;
    }
  } else {
    let fetchUrl = proxyBase + targetUrl;
    let response;
    try {
      response = await fetch(fetchUrl);
      if (!response.ok) throw new Error("HTTP error " + response.status);
    } catch (error) {
      if (targetUrl.startsWith("https://")) {
        targetUrl = targetUrl.replace("https://", "http://");
        fetchUrl = proxyBase + targetUrl;
        try {
          response = await fetch(fetchUrl);
          if (!response.ok) throw new Error("Fallback HTTP error " + response.status);
        } catch (err) {
          document.body.innerHTML = "Error loading site (fallback): " + err;
          return;
        }
      } else {
        document.body.innerHTML = "Error loading site: " + error;
        return;
      }
    }
    data = await response.text();
  }
  
  data = forceBaseTag(data, targetUrl);
  data = rewriteResourceUrls(data, targetUrl, proxyBase);
  data = injectInterceptor(data, targetUrl, proxyBase, proxyId);
  
  // Force the title to always be "Aurora Gateway".
  if (/<title>/i.test(data)) {
    data = data.replace(/<title>.*<\/title>/i, "<title>Aurora Gateway</title>");
  } else if (/<head>/i.test(data)) {
    data = data.replace(/<head>/i, "<head><title>Aurora Gateway</title>");
  } else {
    data = "<title>Aurora Gateway</title>" + data;
  }
  
  document.open();
  document.write(data);
  document.close();
}

// /////////////////////////////
// UI & Settings Modal Logic
// /////////////////////////////
function loadSite() {
  const proxyVal = document.getElementById("proxySelect").value;
  const proxyBase = proxyMapping[proxyVal] || proxyMapping["1"];
  let url = document.getElementById("urlInput").value.trim();
  if (!url) {
    alert("Please enter a URL!");
    return;
  }
  if (!/^https?:\/\//i.test(url)) { url = "https://" + url; }
  
  let settings = "";
  const saved = getSavedSettings();
  if (saved) { settings = JSON.stringify(saved); }
  let newSearch = `?proxy=${proxyVal}&url=${encodeURIComponent(url)}`;
  if (settings) { newSearch += `&settings=${encodeURIComponent(settings)}`; }
  window.location.search = newSearch;
}

function checkProxyStatus(proxyKey, proxyBase) {
  return new Promise((resolve) => {
    const testUrl = proxyBase + "https://example.com";
    let responded = false;
    fetch(testUrl, { mode: "no-cors" })
      .then(response => {
        responded = true;
        if (response.type === "opaque") { resolve(true); }
        else { resolve(response.ok); }
      })
      .catch(err => { resolve(false); });
    setTimeout(() => { if (!responded) resolve(false); }, 5000);
  });
}

async function updateProxyStatus() {
  const select = document.getElementById("proxySelect");
  for (let i = 0; i < select.options.length; i++) {
    const opt = select.options[i];
    const key = opt.value;
    const base = proxyMapping[key];
    const online = await checkProxyStatus(key, base);
    if (online) {
      opt.text = opt.text.split(" (")[0] + " (Online)";
      opt.className = "online";
    } else {
      opt.text = opt.text.split(" (")[0] + " (Offline)";
      opt.className = "offline";
    }
  }
}

if (!window.location.search) { updateProxyStatus(); }

// /////////////////////////////
// Settings Modal Logic
// /////////////////////////////
const settingsIcon = document.getElementById("settingsIcon");
const settingsModal = document.getElementById("settingsModal");
const settingsModalClose = document.getElementById("settingsModalClose");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");

if (settingsIcon) {
  settingsIcon.addEventListener("click", () => {
    const saved = getSavedSettings();
    if (saved) {
      document.getElementById("debugMode").checked = !!saved.debug;
      document.getElementById("extraOptions").value = saved.extra || "";
    }
    settingsModal.style.display = "flex";
  });
}
if (settingsModalClose) {
  settingsModalClose.addEventListener("click", () => {
    settingsModal.style.display = "none";
  });
}
if (saveSettingsBtn) {
  saveSettingsBtn.addEventListener("click", () => {
    const debug = document.getElementById("debugMode").checked;
    const extra = document.getElementById("extraOptions").value.trim();
    const settings = { debug, extra };
    saveSettings(settings);
    settingsModal.style.display = "none";
  });
}

// /////////////////////////////
// Auto-load if Query Parameters Are Present
// /////////////////////////////
(function() {
  const urlParam = getQueryParam("url");
  const proxyVal = getQueryParam("proxy") || "1";
  if (urlParam) {
    const proxyBase = proxyMapping[proxyVal] || proxyMapping["1"];
    document.getElementById("main-container").style.display = "none";
    const settings = getQueryParam("settings");
    fetchAndReplace(proxyBase, decodeURIComponent(urlParam), proxyVal, settings);
  }
})();