// /////////////////////////////
// Proxy Settings and Utilities
// /////////////////////////////
const proxyMapping = {
  "1": "https://corsproxy.io/?url=",
  "2": "https://cors-anywhere.herokuapp.com/",
  "3": "https://thingproxy.freeboard.io/fetch/",
  "4": "https://api.allorigins.hexocode.repl.co/get?disableCache=true&url=",
  "5": "https://proxy.cors.sh/",
  "6": "https://api.codetabs.com/v1/proxy/?quest=",
  "7": "https://api.scraperlink.com/cors?url=",
  "8": "https://api.corsproxy.org/?url="
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
          !/^mailto:/.test(val) &&
          !/^javascript:/.test(val)
        ) {
          // If the value is a data: URL, do NOT proxy it
          if (/^data:/i.test(val)) {
            // leave as is
            return;
          }
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
// Helper: check if a URL is a proxy endpoint
function isProxyUrl(url) {
  return (
    url.startsWith(proxyMapping["1"]) ||
    url.startsWith(proxyMapping["2"]) ||
    url.startsWith(proxyMapping["3"]) ||
    url.startsWith(proxyMapping["4"]) ||
    url.startsWith(proxyMapping["5"]) ||
    url.startsWith(proxyMapping["6"]) ||
    url.startsWith(proxyMapping["7"]) ||
    url.startsWith(proxyMapping["8"])
  );
}

// /////////////////////////////
// Tab manager
// /////////////////////////////
const Tabs = {
  nextId: 1,
  activeId: null,
  create(url, proxyVal, settings) {
    // Always create a blank tab if no URL is provided
    if (!url) url = "";

    // Prevent double-proxy: if url is already a proxy endpoint, extract the real target
    if (isProxyUrl(url)) {
      // Try to extract the real target URL from the proxy endpoint
      try {
        if (proxyVal === "4") {
          // AllOrigins: url param is after ...url=
          const match = url.match(/url=([^&]+)/);
          if (match && match[1]) url = decodeURIComponent(match[1]);
        } else {
          // Other proxies: after ?url= or /fetch/
          const match = url.match(/url=([^&]+)/);
          if (match && match[1]) url = decodeURIComponent(match[1]);
          else if (url.includes("/fetch/")) {
            url = url.split("/fetch/")[1];
          }
        }
      } catch (e) { /* fallback: leave url as-is */ }
    }

    const id = "t" + (this.nextId++);
    const tabsEl = document.getElementById("tabs");
    const contents = document.getElementById("tabContents");

    // Tab button
    const tabBtn = document.createElement("button");
    tabBtn.className = "tab";
    tabBtn.id = "tab-" + id;
    tabBtn.innerText = url ? url.replace(/^https?:\/\//,'').slice(0,30) : "New Tab";
    tabBtn.addEventListener("click", () => this.activate(id));
    tabsEl.appendChild(tabBtn);

    // iframe container
    const iframe = document.createElement("iframe");
    iframe.id = "frame-" + id;
    iframe.className = "tabFrame";
    // sandbox: allow-scripts and allow-forms and allow-same-origin so proxied content can run,
    // but keep parent safe by not allowing top-level navigation.
    iframe.setAttribute("sandbox", "allow-scripts allow-forms allow-same-origin");
    contents.appendChild(iframe);

    // store meta
    tabBtn.dataset.proxy = proxyVal;
    tabBtn.dataset.url = url || "";
    tabBtn.dataset.settings = settings || "";

    this.activate(id);

    if (url) {
      // load into this tab
      const proxyBase = proxyMapping[proxyVal] || proxyMapping["1"];
      fetchAndReplace(proxyBase, url, proxyVal, settings, id);
    } else {
      // Blank tab: clear iframe
      iframe.srcdoc = "<!DOCTYPE html><html><head><title>New Tab</title></head><body style='font-family:sans-serif;color:#888;text-align:center;padding-top:3em;'>New Tab</body></html>";
      Tabs.updateTabTitle(id, "New Tab");
    }

    return id;
  },

  activate(id) {
    // deactivate old
    if (this.activeId) {
      const oldBtn = document.getElementById("tab-" + this.activeId);
      const oldFrame = document.getElementById("frame-" + this.activeId);
      if (oldBtn) oldBtn.classList.remove("active");
      if (oldFrame) oldFrame.classList.remove("visible");
    }
    // activate new
    this.activeId = id;
    const btn = document.getElementById("tab-" + id);
    const frame = document.getElementById("frame-" + id);
    if (btn) btn.classList.add("active");
    if (frame) frame.classList.add("visible");
  },

  close(id) {
    const btn = document.getElementById("tab-" + id);
    const frame = document.getElementById("frame-" + id);
    if (btn) btn.remove();
    if (frame) frame.remove();
    // activate neighbor
    const tabsEl = document.getElementById("tabs");
    const remaining = tabsEl.querySelectorAll(".tab");
    if (remaining.length) {
      const last = remaining[remaining.length - 1];
      const nid = last.id.replace(/^tab-/, "");
      this.activate(nid);
    } else {
      this.activeId = null;
    }
  },

  getActiveFrame() {
    if (!this.activeId) return null;
    return document.getElementById("frame-" + this.activeId);
  },

  updateTabTitle(id, titleText) {
    const btn = document.getElementById("tab-" + id);
    if (btn) btn.innerText = titleText.slice(0, 30);
  }
};

// /////////////////////////////
// Fetch & Replace Content (update to never iframe a proxy endpoint)
// /////////////////////////////
async function fetchAndReplace(proxyBase, targetUrl, proxyId, settings, tabId) {
  // Prevent double-proxy: if targetUrl is a proxy endpoint, extract the real target
  if (isProxyUrl(targetUrl)) {
    try {
      if (proxyId === "4") {
        const match = targetUrl.match(/url=([^&]+)/);
        if (match && match[1]) targetUrl = decodeURIComponent(match[1]);
      } else {
        const match = targetUrl.match(/url=([^&]+)/);
        if (match && match[1]) targetUrl = decodeURIComponent(match[1]);
        else if (targetUrl.includes("/fetch/")) {
          targetUrl = targetUrl.split("/fetch/")[1];
        }
      }
    } catch (e) { /* fallback: leave as-is */ }
  }

  let data;
  if (proxyId === "4") {
    // AllOrigins returns JSON with "contents"
    const fetchUrl = proxyBase + encodeURIComponent(targetUrl);
    try {
      let response = await fetch(fetchUrl);
      if (!response.ok) throw new Error("HTTP error " + response.status);
      let json = await response.json();
      data = json.contents;
    } catch (error) {
      const frame = document.getElementById("frame-" + tabId);
      if (frame && frame.contentDocument) {
        frame.contentDocument.body.innerHTML = "Error loading site (AllOrigins): " + error;
      }
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
          const frame = document.getElementById("frame-" + tabId);
          if (frame && frame.contentDocument) {
            frame.contentDocument.body.innerHTML = "Error loading site (fallback): " + err;
          }
          return;
        }
      } else {
        const frame = document.getElementById("frame-" + tabId);
        if (frame && frame.contentDocument) {
          frame.contentDocument.body.innerHTML = "Error loading site: " + error;
        }
        return;
      }
    }
    data = await response.text();
  }

  data = forceBaseTag(data, targetUrl);
  data = rewriteResourceUrls(data, targetUrl, proxyBase);

  // Inject interceptor script so navigation inside the iframe uses the proxy.
  data = injectInterceptor(data, targetUrl, proxyBase, proxyId);

  // Ensure proxied <title> does not affect parent — keep it for iframe only
  if (/<title>/i.test(data)) {
    data = data.replace(/<title>.*<\/title>/i, `<title>${new URL(targetUrl).hostname} — Aurora Preview</title>`);
  } else if (/<head>/i.test(data)) {
    data = data.replace(/<head>/i, `<head><title>${new URL(targetUrl).hostname} — Aurora Preview</title>`);
  }

  // Write into iframe
  const frame = document.getElementById("frame-" + tabId);
  if (!frame) return;
  try {
    const doc = frame.contentDocument || frame.contentWindow.document;
    doc.open();
    doc.write(data);
    doc.close();
    // update tab button title
    Tabs.updateTabTitle(tabId, (doc.title || targetUrl));
  } catch (e) {
    // Some browsers may restrict writing to sandboxed frames; fallback to srcdoc
    try {
      frame.srcdoc = data;
    } catch (err) {
      console.error("Failed to write proxied content into iframe:", err);
    }
  }
}

// /////////////////////////////
// Proxy status & UI wiring
// /////////////////////////////
async function checkProxyStatus(proxyKey, proxyBase) {
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
      opt.disabled = false;
    } else {
      opt.text = opt.text.split(" (")[0] + " (Offline)";
      opt.className = "offline";
      opt.disabled = true;
    }
  }
}

if (!window.location.search) { updateProxyStatus(); }

// /////////////////////////////
// UI & Settings Modal Logic (unchanged, but ensure buttons for new/open/close exist)
// /////////////////////////////
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const settingsModalClose = document.getElementById("settingsModalClose");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");

if (settingsBtn) {
  settingsBtn.addEventListener("click", () => {
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

// Wire new/open/close buttons and search logic
(function() {
  const newBtn = document.getElementById("newTabBtn");
  const openBtn = document.getElementById("openActiveBtn");
  const closeBtn = document.getElementById("closeTabBtn");
  const backBtn = document.getElementById("backBtn");
  const forwardBtn = document.getElementById("forwardBtn");
  const reloadBtn = document.getElementById("reloadBtn");

  function getInputUrlOrSearch() {
    const raw = document.getElementById("urlInput").value.trim();
    if (!raw) return "";
    // if it's a plain query (no spaces? or no scheme), use search engine
    const isLikelyQuery = !/^https?:\/\//i.test(raw) && raw.indexOf(" ") !== -1 || (!raw.includes(".") && raw.indexOf(" ") === -1);
    if (isLikelyQuery) {
      const engine = document.getElementById("searchEngine").value;
      return engine + encodeURIComponent(raw);
    }
    // If user typed domain without scheme, ensure https first
    if (!/^https?:\/\//i.test(raw)) return "https://" + raw;
    return raw;
  }

  newBtn.addEventListener("click", () => {
    // Always open a blank tab (not a duplicate)
    const proxyVal = document.getElementById("proxySelect").value;
    const saved = getSavedSettings();
    const settings = saved ? JSON.stringify(saved) : "";
    Tabs.create("", proxyVal, settings);
  });

  openBtn.addEventListener("click", () => {
    const url = getInputUrlOrSearch();
    if (!url) { alert("Please enter a URL or search query."); return; }
    const activeFrame = Tabs.getActiveFrame();
    if (!activeFrame) {
      const proxyVal = document.getElementById("proxySelect").value;
      const saved = getSavedSettings();
      Tabs.create(url, proxyVal, saved ? JSON.stringify(saved) : "");
      return;
    }
    // load into active tab
    const proxyVal = document.getElementById("proxySelect").value;
    const saved = getSavedSettings();
    const settings = saved ? JSON.stringify(saved) : "";
    const proxyBase = proxyMapping[proxyVal] || proxyMapping["1"];
    fetchAndReplace(proxyBase, url, proxyVal, settings, Tabs.activeId);
  });

  closeBtn.addEventListener("click", () => {
    if (Tabs.activeId) Tabs.close(Tabs.activeId);
  });

  // Navigation buttons for active tab
  backBtn.addEventListener("click", () => {
    const frame = Tabs.getActiveFrame();
    if (frame && frame.contentWindow && frame.contentWindow.history) {
      try { frame.contentWindow.history.back(); } catch(e) {}
    }
  });
  forwardBtn.addEventListener("click", () => {
    const frame = Tabs.getActiveFrame();
    if (frame && frame.contentWindow && frame.contentWindow.history) {
      try { frame.contentWindow.history.forward(); } catch(e) {}
    }
  });
  reloadBtn.addEventListener("click", () => {
    const frame = Tabs.getActiveFrame();
    if (frame && frame.contentWindow) {
      try { frame.contentWindow.location.reload(); } catch(e) {}
    }
  });

  document.getElementById("urlInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      openBtn.click();
    }
  });
})();

// /////////////////////////////
// Auto-load from query parameters (creates a tab instead of replacing document)
// /////////////////////////////
(function() {
  const urlParam = getQueryParam("url");
  const proxyVal = getQueryParam("proxy") || "1";
  if (urlParam) {
    // Hide browser UI and show only the proxied site
    const mainContainer = document.getElementById("main-container");
    if (mainContainer) {
      mainContainer.style.display = "none";
    }
    // Create a full-window iframe for the proxied site
    const proxyBase = proxyMapping[proxyVal] || proxyMapping["1"];
    const settings = getQueryParam("settings");
    const decoded = decodeURIComponent(urlParam);
    const urlToLoad = /^https?:\/\//i.test(decoded) ? decoded : "https://" + decoded;

    const fullFrame = document.createElement("iframe");
    fullFrame.style.position = "fixed";
    fullFrame.style.top = "0";
    fullFrame.style.left = "0";
    fullFrame.style.width = "100vw";
    fullFrame.style.height = "100vh";
    fullFrame.style.border = "none";
    fullFrame.style.zIndex = "9999";
    fullFrame.setAttribute("sandbox", "allow-scripts allow-forms allow-same-origin");
    document.body.appendChild(fullFrame);

    // Fetch and inject proxied content into the full-frame
    fetchAndReplace(proxyBase, urlToLoad, proxyVal, settings, null, fullFrame);
  }
})();

// Patch fetchAndReplace to allow direct iframe injection if a frame is provided
async function fetchAndReplace(proxyBase, targetUrl, proxyId, settings, tabId, directFrame) {
  // If the target is a data: URL, just show it directly in the iframe
  if (/^data:/i.test(targetUrl)) {
    let frame = directFrame;
    if (!frame && tabId) frame = document.getElementById("frame-" + tabId);
    if (!frame) return;
    frame.src = targetUrl;
    // Optionally set tab title
    if (tabId) Tabs.updateTabTitle(tabId, "data: resource");
    return;
  }

  // Prevent double-proxy: if targetUrl is a proxy endpoint, extract the real target
  if (isProxyUrl(targetUrl)) {
    try {
      if (proxyId === "4") {
        const match = targetUrl.match(/url=([^&]+)/);
        if (match && match[1]) targetUrl = decodeURIComponent(match[1]);
      } else {
        const match = targetUrl.match(/url=([^&]+)/);
        if (match && match[1]) targetUrl = decodeURIComponent(match[1]);
        else if (targetUrl.includes("/fetch/")) {
          targetUrl = targetUrl.split("/fetch/")[1];
        }
      }
    } catch (e) { /* fallback: leave as-is */ }
  }

  let data;
  if (proxyId === "4") {
    const fetchUrl = proxyBase + encodeURIComponent(targetUrl);
    try {
      let response = await fetch(fetchUrl);
      if (!response.ok) throw new Error("HTTP error " + response.status);
      let json = await response.json();
      data = json.contents;
    } catch (error) {
      if (directFrame) {
        directFrame.contentDocument.body.innerHTML = "Error loading site (AllOrigins): " + error;
      } else if (tabId) {
        const frame = document.getElementById("frame-" + tabId);
        if (frame && frame.contentDocument) {
          frame.contentDocument.body.innerHTML = "Error loading site (AllOrigins): " + error;
        }
      }
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
          if (directFrame) {
            directFrame.contentDocument.body.innerHTML = "Error loading site (fallback): " + err;
          } else if (tabId) {
            const frame = document.getElementById("frame-" + tabId);
            if (frame && frame.contentDocument) {
              frame.contentDocument.body.innerHTML = "Error loading site (fallback): " + err;
            }
          }
          return;
        }
      } else {
        if (directFrame) {
          directFrame.contentDocument.body.innerHTML = "Error loading site: " + error;
        } else if (tabId) {
          const frame = document.getElementById("frame-" + tabId);
          if (frame && frame.contentDocument) {
            frame.contentDocument.body.innerHTML = "Error loading site: " + error;
          }
        }
        return;
      }
    }
    data = await response.text();
  }

  data = forceBaseTag(data, targetUrl);
  data = rewriteResourceUrls(data, targetUrl, proxyBase);
  data = injectInterceptor(data, targetUrl, proxyBase, proxyId);

  if (/<title>/i.test(data)) {
    data = data.replace(/<title>.*<\/title>/i, `<title>${new URL(targetUrl).hostname} — Aurora Preview</title>`);
  } else if (/<head>/i.test(data)) {
    data = data.replace(/<head>/i, `<head><title>${new URL(targetUrl).hostname} — Aurora Preview</title>`);
  }

  // Write into provided iframe or tab iframe
  let frame = directFrame;
  if (!frame && tabId) frame = document.getElementById("frame-" + tabId);
  if (!frame) return;
  try {
    const doc = frame.contentDocument || frame.contentWindow.document;
    doc.open();
    doc.write(data);
    doc.close();
    if (tabId) Tabs.updateTabTitle(tabId, (doc.title || targetUrl));
  } catch (e) {
    try {
      frame.srcdoc = data;
    } catch (err) {
      console.error("Failed to write proxied content into iframe:", err);
    }
  }
}

// After DOMContentLoaded or in your UI setup logic, set DuckDuckGo as default search engine
document.addEventListener("DOMContentLoaded", () => {
  const searchEngine = document.getElementById("searchEngine");
  if (searchEngine) {
    searchEngine.value = "https://duckduckgo.com/?q=";
  }
  // Add more proxies to the proxy selector if not already present
  const proxySelect = document.getElementById("proxySelect");
  if (proxySelect && proxySelect.options.length < 8) {
    proxySelect.innerHTML = `
      <option value="1">CorsProxy.io</option>
      <option value="2">CORS Anywhere</option>
      <option value="3">ThingProxy</option>
      <option value="4">AllOrigins</option>
      <option value="5">cors.sh</option>
      <option value="6">Codetabs</option>
      <option value="7">ScraperLink</option>
      <option value="8">corsproxy.org</option>
    `;
  }
});
