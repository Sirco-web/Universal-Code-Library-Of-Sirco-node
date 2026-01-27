const RAW_BASE = 'https://raw.githubusercontent.com/Firewall-Freedom/file-s/refs/heads/master/';

// --- blob URL tracking ---
const createdBlobUrls = new Set();
function registerBlobUrl(u) { createdBlobUrls.add(u); return u; }
window.addEventListener('unload', () => {
  for (const u of createdBlobUrls) {
    try { URL.revokeObjectURL(u); } catch (e) {}
  }
  createdBlobUrls.clear();
});

function q(name) {
  return new URLSearchParams(location.search).get(name) || "";
}
function showMsg(text) {
  const m = document.getElementById('msg');
  m.textContent = text;
  m.style.display = 'block';
  m.style.opacity = '1';
}
function hideMsg() {
  const m = document.getElementById('msg');
  m.style.opacity = '0';
  setTimeout(() => { m.style.display = 'none'; m.textContent = ""; }, 600);
}

async function fetchNoCache(url, as = 'text') {
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r || !r.ok) return null;
    if (as === 'arraybuffer') return await r.arrayBuffer();
    if (as === 'blob') return await r.blob();
    return { text: await r.text(), contentType: r.headers.get('content-type') || "" };
  } catch (e) { return null; }
}

function xmlParse(text) {
  try { return new DOMParser().parseFromString(text, 'application/xml'); }
  catch (e) { return null; }
}
function isAbsoluteUrl(v) {
  return /^[a-zA-Z]+:/.test(v) ||
         v.startsWith('data:') || v.startsWith('blob:') ||
         v.startsWith('mailto:') || v.startsWith('javascript:');
}
function inferMimeFromPath(path) {
  const ext = (path.split('.').pop() || "").toLowerCase();
  if (ext === 'css') return 'text/css';
  if (ext === 'js' || ext === 'mjs') return 'application/javascript';
  if (ext === 'html' || ext === 'htm') return 'text/html';
  if (ext === 'json') return 'application/json';
  if (ext === 'svg') return 'image/svg+xml';
  if (['png','jpg','jpeg','gif','webp','ico'].includes(ext))
    return 'image/' + (ext === 'jpg' ? 'jpeg' : ext);
  if (['woff','woff2','ttf','eot'].includes(ext)) {
    if (ext === 'woff') return 'font/woff';
    if (ext === 'woff2') return 'font/woff2';
    if (ext === 'ttf') return 'font/ttf';
    if (ext === 'eot') return 'application/vnd.ms-fontobject';
  }
  return 'application/octet-stream';
}

// fetch resource and return a blob URL; prefers server content-type when available
async function fetchToBlobUrl(rawUrl, fileMap) {
  try {
    const resp = await fetch(rawUrl, { cache: 'no-store' });
    if (resp && resp.ok) {
      const blob = await resp.blob();
      let mime = resp.headers.get('content-type') || "";
      if (!mime) mime = inferMimeFromPath(rawUrl);
      const fixedBlob = blob.type ? blob : new Blob([await blob.arrayBuffer()], { type: mime });
      const url = URL.createObjectURL(fixedBlob);
      updateProgress();
      return registerBlobUrl(url);
    }
  } catch (e) {}

  // fallback: case-insensitive retry
  try {
    if (fileMap && rawUrl.startsWith(RAW_BASE)) {
      const rel = rawUrl.substring(RAW_BASE.length).replace(/^\/+/, "");
      const alt = fileMap[rel.toLowerCase()];
      if (alt && alt !== rel) {
        const altRaw = RAW_BASE + alt;
        const resp2 = await fetch(altRaw, { cache: 'no-store' });
        if (resp2 && resp2.ok) {
          const blob2 = await resp2.blob();
          const mime2 = resp2.headers.get('content-type') || inferMimeFromPath(altRaw);
          const fixed2 = blob2.type ? blob2 : new Blob([await blob2.arrayBuffer()], { type: mime2 });
          const url2 = URL.createObjectURL(fixed2);
          updateProgress();
          return registerBlobUrl(url2);
        }
      }
    }
  } catch (e) {}
  return null;
}

// resolve a relative path or absolute URL to the actual raw URL
function resolveRepoRawUrl(pathOrUrl, baseRaw, fileMap) {
  if (typeof pathOrUrl === 'string' && pathOrUrl.startsWith('/')) {
    const lower = pathOrUrl.toLowerCase();
    if (lower.startsWith('/code/')) return null;
    const trimmed = pathOrUrl.replace(/^\/+/, "");
    return RAW_BASE + trimmed;
  }
  if (isAbsoluteUrl(pathOrUrl)) return pathOrUrl;
  try {
    const abs = new URL(pathOrUrl, baseRaw).href;
    if (abs.startsWith(RAW_BASE) && fileMap) {
      const rel = abs.substring(RAW_BASE.length).replace(/^\/+/, "");
      const alt = fileMap[rel.toLowerCase()];
      if (alt) return RAW_BASE + alt;
    }
    return abs;
  } catch (e) { return null; }
}

async function rewriteCssAndCreateBlob(cssText, baseRaw, fileMap) {
  const urlPattern = /url\(\s*(['"]?)([^")]+)\1\s*\)/g;
  const matches = [];
  let m;
  while ((m = urlPattern.exec(cssText)) !== null) matches.push(m[2]);
  const unique = Array.from(new Set(matches));
  const replacements = {};
  for (const rel of unique) {
    if (isAbsoluteUrl(rel) || rel.startsWith('data:') || rel.startsWith('#')) continue;
    try {
      const resolved = resolveRepoRawUrl(rel, baseRaw, fileMap);
      const blobUrl = await fetchToBlobUrl(resolved, fileMap);
      if (blobUrl) replacements[rel] = blobUrl;
        updateProgress();

    } catch (e) {}
  }
  const rewritten = cssText.replace(urlPattern, (m, q, path) => {
    if (replacements[path]) return `url("${replacements[path]}")`;
    return m;
  });
  const blob = new Blob([rewritten], { type: 'text/css' });
  const cssBlob = URL.createObjectURL(blob);
  return registerBlobUrl(cssBlob);
}

function preferHtmlCandidate(files, gameName) {
  const idx = files.find(f => /(^|\/)index\.html$/i.test(f));
  if (idx) return idx;
  const anyHtml = files.find(f => /\.x?html?$/i.test(f));
  if (anyHtml) return anyHtml;
  return null;
}

function looksLikeHTML(text) {
  if (!text) return false;
  const t = text.trim().slice(0, 1200).toLowerCase();
  return t.startsWith('<!doctype') || t.includes('<html') || t.includes('<body') ||
         t.includes('<script') || t.includes('<meta') || t.includes('<!doctype html');
}

async function findPlayableEntry(files, gameName) {
  const candidates = Array.from(files);
  if (candidates.length === 0 && gameName) candidates.push(gameName + '/index.html');
  const preferred = preferHtmlCandidate(candidates, gameName);
  if (preferred) {
    const i = candidates.indexOf(preferred);
    if (i > 0) { candidates.splice(i, 1); candidates.unshift(preferred); }
  } else {
    const folderIndex = gameName + '/index.html';
    if (!candidates.includes(folderIndex)) candidates.push(folderIndex);
  }

  for (const c of candidates) {
    const rawUrl = RAW_BASE + c;
    const r = await fetchNoCache(rawUrl, 'text');
    if (!r) continue;
    const ct = (r.contentType || "").toLowerCase();
    if (ct.includes('text/html') || ct.includes('application/xhtml+xml') || looksLikeHTML(r.text)) {
      return { path: c, rawUrl, htmlText: r.text, files };
    }
  }
  if (candidates.length > 0) return { path: candidates[0], rawUrl: RAW_BASE + candidates[0], htmlText: null, files };
  return null;
}

async function loadGame(gameId) {
  hideMsg();
  const xmlResp = await fetchNoCache(RAW_BASE + 'index.xml', 'text');
  if (!xmlResp) { showMsg('Unable to fetch index.xml.'); return; }
  const xml = xmlParse(xmlResp.text);
  if (!xml) { showMsg('Invalid index.xml'); return; }
  const games = Array.from(xml.querySelectorAll('game'));
  const target = games.find(g => {
    const attr = g.getAttribute('name') || "";
    const inner = (g.querySelector('name') && g.querySelector('name').textContent) || "";
    return attr === gameId || inner === gameId;
  });
  if (!target) { showMsg('Game not found in index.xml: ' + gameId); return; }

  const files = [];
  target.querySelectorAll('file').forEach(f => {
    const fp = (f.textContent || "").trim();
    if (fp) files.push(fp);
  });
  const gameName = target.getAttribute('name') || gameId;
  showProgress(files.length);

  const playable = await findPlayableEntry(files, gameName);
  if (!playable) {
    showMsg('No files listed for this game.');
    return;
  }

  if (!playable.htmlText) {
    showMsg('No HTML entry found for this game. Open the game repo directly if needed.');
    document.getElementById('frame').srcdoc =
      '<!doctype html><meta charset="utf-8"><body style="font-family:Inter,Arial,sans-serif;padding:20px;">' +
      '<h3>No HTML entry</h3><p>The repository lists a non-HTML entry as primary; open the repo if needed.</p></body>';
    return;
  }

  // Build case-insensitive lookup map for files in this game
  const fileMap = {};
  files.forEach(f => {
    const key = f.replace(/^\/+/, "").toLowerCase();
    if (!fileMap[key]) fileMap[key] = f;
  });

  // parse and prepare rewriting
  const htmlText = playable.htmlText;
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const baseRaw = RAW_BASE + (playable.path.includes('/') ? playable.path.substring(0, playable.path.lastIndexOf('/') + 1) : "");

  // CSS: fetch, rewrite url(...) refs, blob and point links to blobs
  const linkEls = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
  await Promise.all(linkEls.map(async link => {
    try {
      const href = link.getAttribute('href');
      if (!href) return;
      const resolved = resolveRepoRawUrl(href, baseRaw, fileMap);
      if (!resolved) return;
      const cssFetch = await fetch(resolved, { cache: 'no-store' }).catch(() => null);
      if (!cssFetch || !cssFetch.ok) return;
      const cssText = await cssFetch.text();
      const cssBlobUrl = await rewriteCssAndCreateBlob(cssText, resolved.substring(0, resolved.lastIndexOf('/') + 1), fileMap);
      if (cssBlobUrl) link.setAttribute('href', cssBlobUrl);

      updateProgress();
    } catch (e) {}
  }));

  // Scripts: fetch and replace src with blob URLs
  const scriptEls = Array.from(doc.querySelectorAll('script[src]'));
  await Promise.all(scriptEls.map(async s => {
    try {
      const src = s.getAttribute('src');
      if (!src) return;
      const resolved = resolveRepoRawUrl(src, baseRaw, fileMap);
      if (!resolved) return;
      const blobUrl = await fetchToBlobUrl(resolved, fileMap);
      if (blobUrl) s.setAttribute('src', blobUrl);

      updateProgress();
    } catch (e) {}
  }));

  // Images, media, icons
  const srcSelectors = ['img[src]','audio[src]','video[src]','source[src]','track[src]','link[rel~="icon"]'];
  const srcEls = Array.from(doc.querySelectorAll(srcSelectors.join(',')));
  await Promise.all(srcEls.map(async el => {
    try {
      const isLinkIcon = el.tagName.toLowerCase() === 'link' && el.getAttribute('rel') &&
                         el.getAttribute('rel').toLowerCase().includes('icon');
      const attr = isLinkIcon ? 'href' : 'src';
      const val = el.getAttribute(attr);
      if (!val) return;
      const resolved = resolveRepoRawUrl(val, baseRaw, fileMap);
      if (resolved) {
        const blobUrl = await fetchToBlobUrl(resolved, fileMap);
        if (blobUrl) el.setAttribute(attr, blobUrl);
      }
      // handle srcset if present
      if (el.hasAttribute('srcset')) {
        const srcset = el.getAttribute('srcset') || "";
        const parts = srcset.split(',').map(p => p.trim()).filter(Boolean);
        const rewrittenParts = await Promise.all(parts.map(async part => {
          const [urlPart, ...rest] = part.split(/\s+/);
          try {
            const abs = resolveRepoRawUrl(urlPart, baseRaw, fileMap);
            if (!abs) return part;
            const b = await fetchToBlobUrl(abs, fileMap);
            return (b || urlPart) + (rest.length ? ' ' + rest.join(' ') : "");
          } catch (e) { return part; }
        }));
        el.setAttribute('srcset', rewrittenParts.join(', '));
      }
    } catch (e) {}
  }));

  // inline styles and <style> url(...) rewriting
  Array.from(doc.querySelectorAll('[style]')).forEach(el => {
    const s = el.getAttribute('style') || "";
    const replaced = s.replace(/url\(\s*(['"]?)([^")]+)\1\s*\)/g, (m, q, path) => {
      if (isAbsoluteUrl(path) || path.startsWith('#') || path.startsWith('data:')) return m;
      try { const abs = resolveRepoRawUrl(path, baseRaw, fileMap); return `url("${abs}")`; }
      catch (e) { return m; }
    });
    if (replaced !== s) el.setAttribute('style', replaced);
  });
  Array.from(doc.querySelectorAll('style')).forEach(st => {
    const s = st.textContent || "";
    const replaced = s.replace(/url\(\s*(['"]?)([^")]+)\1\s*\)/g, (m, q, path) => {
      if (isAbsoluteUrl(path) || path.startsWith('#') || path.startsWith('data:')) return m;
      try { const abs = resolveRepoRawUrl(path, baseRaw, fileMap); return `url("${abs}")`; }
      catch (e) { return m; }
    });
    if (replaced !== s) st.textContent = replaced;
  });

  // remove any existing <base>, then insert a base pointing to the repo raw folder
  const existingBase = doc.querySelector('base');
  if (existingBase) existingBase.remove();
  try {
    const baseEl = doc.createElement('base');
    baseEl.setAttribute('href', baseRaw);
    if (doc.head) doc.head.insertBefore(baseEl, doc.head.firstChild);
  } catch (e) {}

  // inject rewritten HTML into iframe
  const out = '<!doctype html>\n' + doc.documentElement.outerHTML;
  const iframe = document.getElementById('frame');
  iframe.srcdoc = out;

  // finally reveal the body
  document.body.style.visibility = "visible";
}

// Entry point
const gameId = q('game') || "";
if (!gameId) {
  showMsg('No game specified.');
} else {
  loadGame(gameId);
}

// Immersive (fullscreen + pointer lock) helpers
const iframeEl = document.getElementById('frame');
const enterBtn = document.getElementById('enterImmersive');
const exitBtn = document.getElementById('exitImmersive');

function updateImmersiveUI() {
  const locked = (document.pointerLockElement === iframeEl);
  const fs = (document.fullscreenElement === iframeEl);
  if (fs) enterBtn.style.display = 'none';
  else enterBtn.style.display = "";
  exitBtn.style.display = (fs || locked) ? "" : 'none';
}

async function enterImmersive() {
  try {
    if (iframeEl.requestFullscreen) {
      await iframeEl.requestFullscreen({ navigationUI: 'hide' });
    }
  } catch (e) {
    showMsg('Fullscreen request failed: ' + (e && e.message || e));
    return;
  }
  try {
    if (iframeEl.requestPointerLock) {
      iframeEl.requestPointerLock();
    }
  } catch (e) {}
  updateImmersiveUI();
}

function exitImmersive() {
  try { if (document.exitPointerLock) document.exitPointerLock(); } catch (e) {}
  try { if (document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
  updateImmersiveUI();
}

enterBtn.addEventListener('click', ev => { ev.preventDefault(); enterImmersive(); });
exitBtn.addEventListener('click', ev => { ev.preventDefault(); exitImmersive(); });

iframeEl.addEventListener('click', ev => {
// Clicking the iframe is a user gesture - attempt to enter immersive mode
iframeEl.addEventListener('click', ev => {
  // do not auto-enter if already fullscreen or locked
  if (document.fullscreenElement === iframeEl || document.pointerLockElement === iframeEl) return;
  // user-intent: try immersive
  enterImmersive();
});

// Track pointer lock / fullscreen changes
document.addEventListener('fullscreenchange', () => {
  updateImmersiveUI();
  if (document.fullscreenElement !== iframeEl) {
    // only show transient exited message (fade out) when truly exited
    if (document.pointerLockElement !== iframeEl) {
      showMsg('Exited fullscreen.');
      setTimeout(hideMsg, 3500);
    }
  }
});

document.addEventListener('pointerlockchange', () => {
  updateImmersiveUI();
  if (document.pointerLockElement !== iframeEl) {
    showMsg('Pointer unlocked. Press immersive icon to relock and fullscreen.');
    setTimeout(hideMsg, 3500);
  } else {
    hideMsg();
  }
});

document.addEventListener('pointerlockerror', () => {
  showMsg('Pointer lock failed or was blocked by the browser.');
  setTimeout(hideMsg, 3500);
});

// Initialize UI state
updateImmersiveUI();

// --- Cookie recheck loop (10–25s randomized) ---
function checkCookie() {
  const cookies = document.cookie.split("; ").map(c => c.trim());
  const accessCookie = cookies.find(c => c.startsWith("access="));
  const accessValue = accessCookie ? accessCookie.split("=")[1] : null;
  if (accessValue !== "1") {
    window.location.replace("/404.html");
  }
}

function scheduleNextCheck() {
  const next = Math.floor(Math.random() * (25000 - 10000 + 1)) + 10000;
  setTimeout(() => {
    checkCookie();
    scheduleNextCheck();
  }, next);
}

// Run immediately and schedule
checkCookie();
scheduleNextCheck();
})
