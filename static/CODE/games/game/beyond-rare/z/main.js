// --- Game Meta (import from game.js or define here if not present) ---
var GAME_VERSION = typeof GAME_VERSION !== 'undefined' ? GAME_VERSION : '1.0.0';
var GAME_MODEL = typeof GAME_MODEL !== 'undefined' ? GAME_MODEL : 'z';

// --- Game State ---
let totalClicks = 0;
let rarestFind = null;
let log = [];
let achievements = [
  { id: 'firstClick', name: 'First Click!', desc: 'Click the button once.', unlocked: false },
  { id: 'tenClicks', name: 'Click Novice', desc: 'Click 10 times.', unlocked: false },
  { id: 'fiftyClicks', name: 'Click Pro', desc: 'Click 50 times.', unlocked: false }
];

// ==== RARITIES & POINTS ====
const rarities = [
  { name: "Common", chance: 18 },
  { name: "Uncommon", chance: 14 },
  { name: "Unusual", chance: 10 },
  { name: "Weird", chance: 7 },
  { name: "Odd", chance: 6 },
  { name: "Curious", chance: 5.5 },
  { name: "Rare", chance: 5 },
  { name: "Unreal", chance: 4.6 },
  { name: "Super Rare", chance: 4.2 },
  { name: "Ultra Rare", chance: 3.8 },
  { name: "Epic", chance: 3.4 },
  { name: "Very Epic", chance: 3.0 },
  { name: "Insane", chance: 2.7 },
  { name: "Legendary", chance: 2.4 },
  { name: "Mythic", chance: 2.1 },
  { name: "Chroma", chance: 1.9 },
  { name: "Godly", chance: 1.7 },
  { name: "Impossible", chance: 1.5 },
  { name: "Ethereal", chance: 1.3 },
  { name: "Extraordinary", chance: 1.1 },
  { name: "Cosmic", chance: 0.95 },
  { name: "Transcendent", chance: 0.9 },
  { name: "Paradoxical", chance: 0.8 },
  { name: "Absolute", chance: 0.7 },
  { name: "Omniversal", chance: 0.65 },
  { name: "Impossible+", chance: 0.6 },
  { name: "Divine", chance: 0.55 },
  { name: "Singular", chance: 0.5 },
  { name: "Eternal", chance: 0.48 },
  { name: "Quantum", chance: 0.46 },
  { name: "Quantum+", chance: 0.44 },
  { name: "Fractal", chance: 0.42 },
  { name: "Glitched", chance: 0.4 },
  { name: "Exotic", chance: 0.38 },
  { name: "Hallowed", chance: 0.36 },
  { name: "Primordial", chance: 0.34 },
  { name: "Nuclear", chance: 0.32 },
  { name: "Radiant", chance: 0.3 },
  { name: "Corrupted", chance: 0.28 },
  { name: "Frozen", chance: 0.25 },
  { name: "Infernal", chance: 0.22 },
  { name: "Parallel", chance: 0.2 },
  { name: "Temporal", chance: 0.19 },
  { name: "Anomalous", chance: 0.18 },
  { name: "Ascended", chance: 0.17 },
  { name: "Unobtainium", chance: 0.16 },
  { name: "Galactic", chance: 0.15 },
  { name: "Supreme", chance: 0.14 },
  { name: "Ancient", chance: 0.13 },
  { name: "Enigmatic", chance: 0.12 },
  { name: "Spectral", chance: 0.11 },
  { name: "Astral", chance: 0.1 },
  { name: "Solar", chance: 0.09 },
  { name: "Lunar", chance: 0.085 },
  { name: "Stellar", chance: 0.08 },
  { name: "Nebulous", chance: 0.075 },
  { name: "Void", chance: 0.07 },
  { name: "Dimensional", chance: 0.065 },
  { name: "Hyper", chance: 0.06 },
  { name: "Ultra", chance: 0.055 },
  { name: "Mega", chance: 0.05 },
  { name: "Nano", chance: 0.045 },
  { name: "Micro", chance: 0.04 },
  { name: "Pico", chance: 0.035 },
  { name: "Femto", chance: 0.03 },
  { name: "Atto", chance: 0.025 },
  { name: "Zepto", chance: 0.021 },
  { name: "Yocto", chance: 0.019 },
  { name: "Planck", chance: 0.017 },
  { name: "Infinity", chance: 0.015 },
  { name: "Omega", chance: 0.013 },
  { name: "Alpha", chance: 0.011 },
  { name: "Beta", chance: 0.009 },
  { name: "Gamma", chance: 0.008 },
  { name: "Delta", chance: 0.007 },
  { name: "Epsilon", chance: 0.006 },
  { name: "Zeta", chance: 0.005 },
  { name: "Theta", chance: 0.004 },
  { name: "Iota", chance: 0.003 },
  { name: "Kappa", chance: 0.0025 },
  { name: "Lambda", chance: 0.002 },
  { name: "Sigma", chance: 0.0018 },
  { name: "Tau", chance: 0.0016 },
  { name: "Upsilon", chance: 0.0014 },
  { name: "Phi", chance: 0.0012 },
  { name: "Chi", chance: 0.0011 },
  { name: "Psi", chance: 0.001 },
  { name: "Omega+", chance: 0.0009 },
  { name: "Reality", chance: 0.0008 },
  { name: "Oblivion", chance: 0.0007 },
  { name: "Unseen", chance: 0.0006 },
  { name: "Shadow", chance: 0.0005 },
  { name: "Ghost", chance: 0.0004 },
  { name: "Phantom", chance: 0.0003 },
  { name: "Ultra Secret", chance: 0.0002 },
  { name: "Secret", chance: 0.0001 },
  { name: "???", chance: 0.00005 }
];
const rarityPoints = {};
rarities.forEach((r, i) => {
  if (r.name === "Uncommon") {
    rarityPoints[r.name] = -20;
  } else {
    rarityPoints[r.name] = Math.max(1, Math.floor(10 - i / 10));
  }
});

// --- Points State ---
let points = 0;
let unlockedRarities = [];

// --- Buff State ---
let autoClickers = 0;
let doublePointsActive = false;
let doublePointsTimeout = null;
let goldenClickActive = false;
let luckBoostActive = false;
let luckBoostTimeout = null;
let timeFreezeActive = false;
let timeFreezeTimeout = null;
let goldenModeActive = false;
let goldenModeTimeout = null;
let autoClickerInterval = null;
let timer = 0;
let timerInterval = null;

// --- Shop Purchase Logic ---
let stage = 1;
let baseShopCosts = {
  'Auto Clicker': 50,
  'Double Points': 150,
  'Golden Click': 200,
  'Luck Boost': 300,
  'Time Freeze': 200,
  'Golden Mode': 1000
};

// --- Achievements Logic ---
const rarityAchievements = rarities.map(r => ({
  id: 'rarity_' + r.name.replace(/\s+/g, '').toLowerCase(),
  name: r.name + ' Found',
  desc: 'Unlock the ' + r.name + ' rarity.',
  unlocked: false,
  rarity: r.name
}));
achievements = achievements.concat(rarityAchievements);

// --- Display Logic ---
function updatePointsDisplay() {
  document.getElementById('pointsTopBar').textContent = 'Points for Z: ' + points;
  const shopPoints = document.getElementById('pointsDisplayShop');
  if (shopPoints) shopPoints.textContent = points;
}

function toggleSettingsModal() {
  const modal = document.getElementById('settingsModal');
  modal.style.display = (modal.style.display === 'block') ? 'none' : 'block';
}
function toggleShopModal() {
  const modal = document.getElementById('shopModal');
  modal.style.display = (modal.style.display === 'block') ? 'none' : 'block';
}
function openSaveModal(mode) {
  const modal = document.getElementById('saveModal');
  modal.style.display = 'block';
  document.getElementById('saveModalTitle').textContent = mode === 'export' ? 'Export Save' : 'Import Save';
  document.getElementById('copySaveBtn').style.display = mode === 'export' ? '' : 'none';
  document.getElementById('downloadSaveBtn').style.display = mode === 'export' ? '' : 'none';
  document.getElementById('importSaveBtn').style.display = mode === 'import' ? '' : 'none';
  document.getElementById('saveTextarea').value = '';
  document.getElementById('importError').textContent = '';
}
function closeSaveModal() {
  document.getElementById('saveModal').style.display = 'none';
}
function copySaveToClipboard() {
  const textarea = document.getElementById('saveTextarea');
  textarea.select();
  document.execCommand('copy');
}
function downloadSave() {
  const textarea = document.getElementById('saveTextarea');
  const blob = new Blob([textarea.value], {type: 'text/plain'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'rarity_clicker_save.txt';
  a.click();
}
function importSave() {
  alert('Import not implemented.');
}

// --- Game Logic ---
function resetGame() {
  // Hard reset: everything
  points = 0;
  totalClicks = 0;
  rarestFind = null;
  log = [];
  unlockedRarities = [];
  autoClickers = 0;
  doublePointsActive = false;
  goldenClickActive = false;
  luckBoostActive = false;
  timeFreezeActive = false;
  goldenModeActive = false;
  timer = 0;
  stage = 1;
  achievements.forEach(a => a.unlocked = false);
  updateStageDisplay();
  updateShopButtonLabels();
  rarities.forEach(r => { r.scaledChance = r.chance; });
  document.getElementById('totalClicks').textContent = totalClicks;
  document.getElementById('rarestFind').textContent = 'None';
  document.getElementById('timer').textContent = `Time: 0s`;
  updateBuffTimers();
  updateAchievementsDisplay();
  updatePointsDisplay();
  updateUnlockedRaritiesBox();
  updateShopStatus();
  updateShopButtonLabels();
  updateStageDisplay();
  const logList = document.getElementById('log');
  logList.innerHTML = '<li id="logFallback">No finds yet. Start clicking!</li>';
}

function softResetGame() {
  // Soft reset: keep achievements, reset everything else
  points = 0;
  totalClicks = 0;
  rarestFind = null;
  log = [];
  unlockedRarities = [];
  autoClickers = 0;
  doublePointsActive = false;
  goldenClickActive = false;
  luckBoostActive = false;
  timeFreezeActive = false;
  goldenModeActive = false;
  timer = 0;
  stage = 1;
  updateStageDisplay();
  updateShopButtonLabels();
  rarities.forEach(r => { r.scaledChance = r.chance; });
  document.getElementById('totalClicks').textContent = totalClicks;
  document.getElementById('rarestFind').textContent = 'None';
  document.getElementById('timer').textContent = `Time: 0s`;
  updateBuffTimers();
  updateAchievementsDisplay();
  updatePointsDisplay();
  updateUnlockedRaritiesBox();
  updateShopStatus();
  updateShopButtonLabels();
  updateStageDisplay();
  const logList = document.getElementById('log');
  logList.innerHTML = '<li id="logFallback">No finds yet. Start clicking!</li>';
}

// --- Achievements Logic ---
function updateLogDisplay() {
  const logList = document.getElementById('log');
  logList.innerHTML = '';
  const rarityOrder = rarities.map(r => r.name);
  log.forEach(item => {
    const li = document.createElement('li');
    const rObj = rarities.find(r => r.name === item);
    const chance = rObj ? getRarityChance(rObj) : 0;
    const pts = rarityPoints[item] || 0;
    li.innerHTML = `<b>${item}</b> <span style='color:#888;font-size:0.9em;'>(Chance: ${chance.toFixed(5)}%, Points: ${pts})</span>`;
    logList.appendChild(li);
  });
  if (log.length === 0) {
    logList.innerHTML = '<li id="logFallback">No finds yet. Start clicking!</li>';
  }
}

function updateAchievementsDisplay() {
  const container = document.getElementById('achievementsContainer');
  if (!container) return;
  container.innerHTML = '';
  let any = false;
  // Make the achievements box two columns using flex
  container.style.display = 'flex';
  container.style.flexDirection = 'row';
  container.style.justifyContent = 'space-between';
  container.style.alignItems = 'flex-start';
  container.style.width = '100%';
  // Sort achievements by rarity order for rarity achievements
  const rarityOrder = rarities.map(r => r.name);
  const sorted = achievements.slice().sort((a, b) => {
    if (a.id.startsWith('rarity_') && b.id.startsWith('rarity_')) {
      return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
    }
    return 0;
  });
  // Split achievements into two columns
  const half = Math.ceil(sorted.length / 2);
  const col1 = sorted.slice(0, half);
  const col2 = sorted.slice(half);
  const colDiv1 = document.createElement('div');
  const colDiv2 = document.createElement('div');
  colDiv1.style.width = colDiv2.style.width = '48%';
  col1.forEach(a => {
    if (a.unlocked) {
      any = true;
      const div = document.createElement('div');
      div.className = 'achievement unlocked';
      div.style.background = '#2ecc40';
      div.style.color = 'white';
      div.innerHTML = `<b>${a.name}</b><br><span style='font-size:0.9em;'>${a.desc}</span>`;
      colDiv1.appendChild(div);
    }
  });
  col2.forEach(a => {
    if (a.unlocked) {
      any = true;
      const div = document.createElement('div');
      div.className = 'achievement unlocked';
      div.style.background = '#2ecc40';
      div.style.color = 'white';
      div.innerHTML = `<b>${a.name}</b><br><span style='font-size:0.9em;'>${a.desc}</span>`;
      colDiv2.appendChild(div);
    }
  });
  container.appendChild(colDiv1);
  container.appendChild(colDiv2);
  if (!any) {
    container.innerHTML = '<div style="color:#888;">No achievements yet.</div>';
  }
}
function checkAchievements() {
  achievements.forEach(a => {
    if (!a.unlocked) {
      if (a.id === 'firstClick' && totalClicks >= 1) a.unlocked = true;
      if (a.id === 'tenClicks' && totalClicks >= 10) a.unlocked = true;
      if (a.id === 'fiftyClicks' && totalClicks >= 50) a.unlocked = true;
      // Rarity achievements
      if (a.id.startsWith('rarity_') && unlockedRarities.includes(a.rarity)) a.unlocked = true;
    }
  });
  updateAchievementsDisplay();
}

// --- Buff State ---
function updateBuffTimers() {
  const buffDiv = document.getElementById('buffTimers');
  if (!buffDiv) return;
  let buffs = [];
  if (doublePointsActive && doublePointsTimeout) {
    let ms = 0;
    if (typeof doublePointsTimeout._idleStart !== 'undefined' && typeof doublePointsTimeout._idleTimeout !== 'undefined') {
      ms = Math.max(0, Math.ceil((doublePointsTimeout._idleStart + doublePointsTimeout._idleTimeout - Date.now()) / 1000));
    } else if (doublePointsTimeout.expires) {
      ms = Math.max(0, Math.ceil((doublePointsTimeout.expires - Date.now()) / 1000));
    }
    buffs.push(`<span style="color:gold;">Double Points: ${ms}s</span>`);
  }
  if (goldenClickActive) buffs.push('<span style="color:orange;">Golden Click Ready</span>');
  if (luckBoostActive && luckBoostTimeout) {
    let ms = 0;
    if (typeof luckBoostTimeout._idleStart !== 'undefined' && typeof luckBoostTimeout._idleTimeout !== 'undefined') {
      ms = Math.max(0, Math.ceil((luckBoostTimeout._idleStart + luckBoostTimeout._idleTimeout - Date.now()) / 1000));
    } else if (luckBoostTimeout.expires) {
      ms = Math.max(0, Math.ceil((luckBoostTimeout.expires - Date.now()) / 1000));
    }
    buffs.push(`<span style="color:lime;">Luck Boost: ${ms}s</span>`);
  }
  if (timeFreezeActive && timeFreezeTimeout) {
    let ms = 0;
    if (typeof timeFreezeTimeout._idleStart !== 'undefined' && typeof timeFreezeTimeout._idleTimeout !== 'undefined') {
      ms = Math.max(0, Math.ceil((timeFreezeTimeout._idleStart + timeFreezeTimeout._idleTimeout - Date.now()) / 1000));
    } else if (timeFreezeTimeout.expires) {
      ms = Math.max(0, Math.ceil((timeFreezeTimeout.expires - Date.now()) / 1000));
    }
    buffs.push(`<span style="color:cyan;">Time Freeze: ${ms}s</span>`);
  }
  if (goldenModeActive && goldenModeTimeout) {
    let ms = 0;
    if (typeof goldenModeTimeout._idleStart !== 'undefined' && typeof goldenModeTimeout._idleTimeout !== 'undefined') {
      ms = Math.max(0, Math.ceil((goldenModeTimeout._idleStart + goldenModeTimeout._idleTimeout - Date.now()) / 1000));
    } else if (goldenModeTimeout.expires) {
      ms = Math.max(0, Math.ceil((goldenModeTimeout.expires - Date.now()) / 1000));
    }
    buffs.push(`<span style="color:gold;">Golden Mode: ${ms}s</span>`);
  }
  buffDiv.innerHTML = buffs.join(' ');
}

function startAutoClicker() {
  if (!autoClickerInterval) {
    autoClickerInterval = setInterval(() => {
      for (let i = 0; i < autoClickers; i++) mainClick(true);
    }, 1000);
  }
}

function startAutoClickers() {
  if (autoClickerInterval) clearInterval(autoClickerInterval);
  if (autoClickers > 0) {
    autoClickerInterval = setInterval(() => {
      for (let i = 0; i < autoClickers; i++) mainClick(true);
    }, Math.max(2000 / autoClickers, 200)); // Minimum 200ms interval
  }
}

function startTimer() {
  if (!timerInterval) {
    timerInterval = setInterval(() => {
      if (!timeFreezeActive) {
        timer++;
        document.getElementById('timer').textContent = `Time: ${timer}s`;
      }
    }, 1000);
  }
}

// --- Main Click Button Logic ---
function getRarityChance(rarity) {
  // Dynamically calculate the chance for a rarity based on current stage
  if (stage <= 1) return rarity.chance;
  if (rarity.name === 'Common') {
    // Common gets all the chance removed from others
    let totalRemoved = 0;
    rarities.forEach(r => {
      if (r.name !== 'Common') {
        let prev = r.chance;
        for (let s = 2; s <= stage; s++) {
          prev = prev * 0.95;
        }
        totalRemoved += (r.chance - prev);
      }
    });
    return rarity.chance + totalRemoved;
  } else {
    let c = rarity.chance;
    for (let s = 2; s <= stage; s++) {
      c = c * 0.95;
    }
    return c;
  }
}

function mainClick(isAuto) {
  totalClicks++;
  document.getElementById('totalClicks').textContent = totalClicks;
  // Pick a rarity
  let roll = Math.random() * 100;
  let sum = 0;
  let rarityPool = rarities;
  if (luckBoostActive) {
    // Remove bottom-tier rarities (lowest 5) and shift up
    const minIndex = 5;
    rarityPool = rarities.slice(minIndex);
  }
  let found = 'Common';
  if (goldenModeActive || (goldenClickActive && !isAuto)) {
    // Only allow legendary or above
    const order = rarities.map(r => r.name);
    const legendaryIndex = order.indexOf('Legendary');
    rarityPool = rarities.slice(legendaryIndex);
    goldenClickActive = false;
    updateShopStatus();
    updateShopButtonLabels();
  }
  for (let r of rarityPool) {
    let chance = getRarityChance(r);
    sum += chance;
    if (roll < sum) { found = r.name; break; }
  }
  // Only show new unlocks, in order
  if (!unlockedRarities.includes(found)) {
    unlockedRarities.push(found);
    // Sort unlockedRarities by rarity order
    const rarityOrder = rarities.map(r => r.name);
    unlockedRarities.sort((a, b) => rarityOrder.indexOf(a) - rarityOrder.indexOf(b));
    // Removed: document.getElementById('result').textContent = `Unlocked: ${found}`;
    updateUnlockedRaritiesBox();
  } else if (!isAuto) {
    document.getElementById('result').textContent = '';
  }
  // Update log
  log.unshift(found);
  if (log.length > 50) log.pop();
  updateLogDisplay();
  // Update rarest find
  const rarityOrder = rarities.map(r => r.name);
  if (!rarestFind || rarityOrder.indexOf(found) > rarityOrder.indexOf(rarestFind)) {
    rarestFind = found;
    document.getElementById('rarestFind').textContent = rarestFind;
  }
  // Award points
  let pts = rarityPoints[found] || 0;
  if (doublePointsActive) pts *= 2;
  points += pts;
  updatePointsDisplay();
  checkAchievements();
}

// --- Unlocked Rarities Box ---
function updateUnlockedRaritiesBox() {
  const listDiv = document.getElementById('unlockedRaritiesList');
  if (!listDiv) return;
  listDiv.innerHTML = '';
  if (!unlockedRarities || unlockedRarities.length === 0) {
    listDiv.textContent = 'None yet!';
    return;
  }
  // Sort by rarity order
  const rarityOrder = rarities.map(r => r.name);
  let sorted = unlockedRarities.slice().sort((a, b) => rarityOrder.indexOf(a) - rarityOrder.indexOf(b));
  if (raritySortDescending) sorted = sorted.reverse();
  sorted.forEach(rarityName => {
    const rObj = rarities.find(r => r.name === rarityName);
    const chance = rObj ? getRarityChance(rObj) : 0;
    const pts = rarityPoints[rarityName] || 0;
    const div = document.createElement('div');
    div.className = 'rarity-unlocked';
    div.innerHTML = `<b>${rarityName}</b> | chance %: ${chance.toFixed(5)} | points: ${pts} | <span style='color:#888;font-size:0.9em;'>(Unlocked!)</span>`;
    listDiv.appendChild(div);
  });
  // Add sort toggle button
  let toggleBtn = document.getElementById('raritySortToggleBtn');
  if (!toggleBtn) {
    toggleBtn = document.createElement('button');
    toggleBtn.id = 'raritySortToggleBtn';
    toggleBtn.textContent = raritySortDescending ? 'Sort: Highest → Lowest' : 'Sort: Lowest → Highest';
    toggleBtn.style.margin = '8px 0 12px 0';
    toggleBtn.style.fontSize = '1em';
    toggleBtn.onclick = function() {
      raritySortDescending = !raritySortDescending;
      toggleBtn.textContent = raritySortDescending ? 'Sort: Highest → Lowest' : 'Sort: Lowest → Highest';
      updateUnlockedRaritiesBox();
    };
    listDiv.parentNode.insertBefore(toggleBtn, listDiv);
  } else {
    toggleBtn.textContent = raritySortDescending ? 'Sort: Highest → Lowest' : 'Sort: Lowest → Highest';
  }
}

// --- Save Indicator Logic ---
function showSaveIndicator(msg) {
  let indicator = document.getElementById('saveIndicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'saveIndicator';
    indicator.style.position = 'fixed';
    indicator.style.bottom = '24px';
    indicator.style.right = '24px';
    indicator.style.background = '#222';
    indicator.style.color = '#fff';
    indicator.style.padding = '10px 22px';
    indicator.style.borderRadius = '12px';
    indicator.style.fontSize = '1.1em';
    indicator.style.zIndex = '9999';
    indicator.style.opacity = '0';
    indicator.style.transition = 'opacity 0.4s';
    document.body.appendChild(indicator);
  }
  indicator.textContent = msg;
  indicator.style.opacity = '1';
  setTimeout(() => { indicator.style.opacity = '0'; }, 1200);
}

// Patch saveGameToStorage to show indicator
const origSaveGameToStorage = window.saveGameToStorage;
window.saveGameToStorage = function() {
  if (origSaveGameToStorage) origSaveGameToStorage();
  showSaveIndicator('Auto-saved');
};

// Manual save shortcut
window.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    if (window.saveGameToStorage) window.saveGameToStorage();
    showSaveIndicator('Manually saved');
  }
});

// --- Reset and Ascend Logic ---
function resetGame() {
  // Hard reset: everything
  points = 0;
  totalClicks = 0;
  rarestFind = null;
  log = [];
  unlockedRarities = [];
  autoClickers = 0;
  doublePointsActive = false;
  goldenClickActive = false;
  luckBoostActive = false;
  timeFreezeActive = false;
  goldenModeActive = false;
  timer = 0;
  stage = 1;
  achievements.forEach(a => a.unlocked = false);
  updateStageDisplay();
  updateShopButtonLabels();
  rarities.forEach(r => { r.scaledChance = r.chance; });
  updatePointsDisplay();
  updateTotalClicksDisplay();
  updateRarestFindDisplay();
  updateTimerDisplay();
  updateBuffTimers();
  updateAchievementsDisplay();
  updateUnlockedRaritiesBox();
  updateShopStatus();
  updateShopButtonLabels();
  updateStageDisplay();
  const logList = document.getElementById('log');
  logList.innerHTML = '<li id="logFallback">No finds yet. Start clicking!</li>';
}

function softResetGame() {
  // Soft reset: keep achievements, reset everything else
  points = 0;
  totalClicks = 0;
  rarestFind = null;
  log = [];
  unlockedRarities = [];
  autoClickers = 0;
  doublePointsActive = false;
  goldenClickActive = false;
  luckBoostActive = false;
  timeFreezeActive = false;
  goldenModeActive = false;
  timer = 0;
  stage = 1;
  updateStageDisplay();
  updateShopButtonLabels();
  rarities.forEach(r => { r.scaledChance = r.chance; });
  updatePointsDisplay();
  updateTotalClicksDisplay();
  updateRarestFindDisplay();
  updateTimerDisplay();
  updateBuffTimers();
  updateAchievementsDisplay();
  updateUnlockedRaritiesBox();
  updateShopStatus();
  updateShopButtonLabels();
  updateStageDisplay();
  const logList = document.getElementById('log');
  logList.innerHTML = '<li id="logFallback">No finds yet. Start clicking!</li>';
}

// --- Local Storage Save/Load ---
function saveGameToStorage() {
  localStorage.setItem('points_for_model_Z', JSON.stringify(points));
  localStorage.setItem('totalClicks_for_model_Z', JSON.stringify(totalClicks));
  localStorage.setItem('rarestFind_for_model_Z', JSON.stringify(rarestFind));
  localStorage.setItem('log_for_model_Z', JSON.stringify(log));
  localStorage.setItem('achievements_for_model_Z', JSON.stringify(achievements));
  localStorage.setItem('unlockedRarities_for_model_Z', JSON.stringify(unlockedRarities));
  localStorage.setItem('autoClickers_for_model_Z', JSON.stringify(autoClickers));
  localStorage.setItem('doublePointsActive_for_model_Z', JSON.stringify(doublePointsActive));
  localStorage.setItem('goldenClickActive_for_model_Z', JSON.stringify(goldenClickActive));
  localStorage.setItem('luckBoostActive_for_model_Z', JSON.stringify(luckBoostActive));
  localStorage.setItem('timeFreezeActive_for_model_Z', JSON.stringify(timeFreezeActive));
  localStorage.setItem('goldenModeActive_for_model_Z', JSON.stringify(goldenModeActive));
  localStorage.setItem('stage_for_model_Z', JSON.stringify(stage));
  localStorage.setItem('timer_for_model_Z', JSON.stringify(timer));
}

function loadGameFromStorage() {
  if (localStorage.getItem('points_for_model_Z')) points = JSON.parse(localStorage.getItem('points_for_model_Z'));
  if (localStorage.getItem('totalClicks_for_model_Z')) totalClicks = JSON.parse(localStorage.getItem('totalClicks_for_model_Z'));
  if (localStorage.getItem('rarestFind_for_model_Z')) rarestFind = JSON.parse(localStorage.getItem('rarestFind_for_model_Z'));
  if (localStorage.getItem('log_for_model_Z')) log = JSON.parse(localStorage.getItem('log'));
  if (!Array.isArray(log)) log = [];
  if (localStorage.getItem('achievements_for_model_Z')) {
    let loadedAchievements = JSON.parse(localStorage.getItem('achievements_for_model_Z'));
    achievements.forEach((a, i) => { if (loadedAchievements[i]) a.unlocked = loadedAchievements[i].unlocked; });
  }
  if (localStorage.getItem('unlockedRarities_for_model_Z')) unlockedRarities = JSON.parse(localStorage.getItem('unlockedRarities_for_model_Z'));
  if (localStorage.getItem('autoClickers_for_model_Z')) autoClickers = JSON.parse(localStorage.getItem('autoClickers'));
  let val;
  val = localStorage.getItem('luckBoostActive_for_model_Z');
  luckBoostActive = safeBool(val);
  val = localStorage.getItem('doublePointsActive_for_model_Z');
  doublePointsActive = safeBool(val);
  val = localStorage.getItem('goldenClickActive_for_model_Z');
  goldenClickActive = safeBool(val);
  val = localStorage.getItem('timeFreezeActive_for_model_Z');
  timeFreezeActive = safeBool(val);
  val = localStorage.getItem('goldenModeActive_for_model_Z');
  goldenModeActive = safeBool(val);
  if (localStorage.getItem('stage_for_model_Z')) stage = JSON.parse(localStorage.getItem('stage'));
  if (localStorage.getItem('timer_for_model_Z')) timer = JSON.parse(localStorage.getItem('timer'));
}

// Load game state on start
loadGameFromStorage();
// Update all UI on page load/refresh
if (typeof updatePointsDisplay === 'function') updatePointsDisplay();
if (typeof updateTotalClicksDisplay === 'function') updateTotalClicksDisplay();
if (typeof updateRarestFindDisplay === 'function') updateRarestFindDisplay();
if (typeof updateUnlockedRaritiesBox === 'function') updateUnlockedRaritiesBox();
if (typeof updateAchievementsDisplay === 'function') updateAchievementsDisplay();
if (typeof updateShopStatus === 'function') updateShopStatus();
if (typeof updateShopButtonLabels === 'function') updateShopButtonLabels();
if (typeof updateStageDisplay === 'function') updateStageDisplay();
if (typeof updateTimerDisplay === 'function') updateTimerDisplay();
if (typeof updateBuffTimers === 'function') updateBuffTimers();
if (typeof updateLogDisplay === 'function') updateLogDisplay();

// --- Rarity Sort Toggle ---
let raritySortDescending = false;

// --- Timer Logic ---
function updateTimerDisplay() {
  let t = timer;
  let sec = t % 60;
  t = Math.floor(t / 60);
  let min = t % 60;
  t = Math.floor(t / 60);
  let hr = t % 24;
  t = Math.floor(t / 24);
  let day = t % 7;
  let week = Math.floor(t / 7);
  let parts = [];
  if (week > 0) parts.push(week + 'w');
  if (day > 0) parts.push(day + 'd');
  if (hr > 0) parts.push(hr + 'h');
  if (min > 0) parts.push(min + 'm');
  if (sec > 0 || parts.length === 0) parts.push(sec + 's');
  const timerEl = document.getElementById('timer');
  if (timerEl) timerEl.textContent = 'Time for Z: ' + parts.join(' ');
}
setInterval(function() {
  if (!timeFreezeActive) {
    timer++;
    updateTimerDisplay();
  }
}, 1000);

// --- Shop Cost Helper ---
function getShopCost(name) {
  return Math.floor(baseShopCosts[name] * Math.pow(1.5, stage - 1));
}

// --- Shop Purchase Functions ---
function purchaseAutoClicker() {
  const cost = getShopCost('Auto Clicker');
  if (points >= cost) {
    points -= cost;
    autoClickers++;
    updatePointsDisplay();
    updateShopStatus();
    updateShopButtonLabels();
    startAutoClickers();
  } else {
    alert('Not enough points!');
  }
}
function purchaseDoublePoints() {
  const cost = getShopCost('Double Points');
  if (points >= cost && !doublePointsActive) {
    points -= cost;
    doublePointsActive = true;
    updatePointsDisplay();
    updateShopStatus();
    updateShopButtonLabels();
    let dpTimer = setTimeout(() => {
      doublePointsActive = false;
      updateShopStatus();
      updateShopButtonLabels();
    }, 30000);
    if (!window._dpTimers) window._dpTimers = [];
    window._dpTimers.push(dpTimer);
  } else {
    alert('Not enough points or already active!');
  }
}
function purchaseGoldenClick() {
  const cost = getShopCost('Golden Click');
  if (points >= cost && !goldenClickActive) {
    points -= cost;
    goldenClickActive = true;
    updatePointsDisplay();
    updateShopStatus();
    updateShopButtonLabels();
  } else {
    alert('Not enough points or already ready!');
  }
}
function purchaseLuckBoost() {
  const cost = getShopCost('Luck Boost');
  if (points >= cost && !luckBoostActive) {
    points -= cost;
    luckBoostActive = true;
    updatePointsDisplay();
    updateShopStatus();
    updateShopButtonLabels();
    let lbTimer = setTimeout(() => {
      luckBoostActive = false;
      updateShopStatus();
      updateShopButtonLabels();
    }, 30000);
    if (!window._lbTimers) window._lbTimers = [];
    window._lbTimers.push(lbTimer);
  } else {
    alert('Not enough points or already active!');
  }
}
function purchaseTimeFreeze() {
  const cost = getShopCost('Time Freeze');
  if (points >= cost && !timeFreezeActive) {
    points -= cost;
    timeFreezeActive = true;
    updatePointsDisplay();
    updateShopStatus();
    updateShopButtonLabels();
    // Pause all timers
    if (window._dpTimers) window._dpTimers.forEach(t => clearTimeout(t));
    if (window._lbTimers) window._lbTimers.forEach(t => clearTimeout(t));
    let tfTimer = setTimeout(() => {
      timeFreezeActive = false;
      updateShopStatus();
      updateShopButtonLabels();
      // Resume Double Points and Luck Boost if they were active
      if (doublePointsActive) purchaseDoublePoints();
      if (luckBoostActive) purchaseLuckBoost();
    }, 30000);
    if (!window._tfTimers) window._tfTimers = [];
    window._tfTimers.push(tfTimer);
  } else {
    alert('Not enough points or already active!');
  }
}
function purchaseGoldenMode() {
  const cost = getShopCost('Golden Mode');
  if (points >= cost && !goldenModeActive) {
    points -= cost;
    goldenModeActive = true;
    updatePointsDisplay();
    updateShopStatus();
    updateShopButtonLabels();
    setTimeout(() => {
      goldenModeActive = false;
      updateShopStatus();
      updateShopButtonLabels();
    }, 5000);
  } else {
    alert('Not enough points or already active!');
  }
}
window.purchaseAutoClicker = purchaseAutoClicker;
window.purchaseDoublePoints = purchaseDoublePoints;
window.purchaseGoldenClick = purchaseGoldenClick;
window.purchaseLuckBoost = purchaseLuckBoost;
window.purchaseTimeFreeze = purchaseTimeFreeze;
window.purchaseGoldenMode = purchaseGoldenMode;
window.startAutoClickers = startAutoClickers;

// --- Update Shop Status ---
function updateShopStatus() {
  if (document.getElementById('autoCountShop')) document.getElementById('autoCountShop').textContent = autoClickers;
  if (document.getElementById('doubleStatusShop')) document.getElementById('doubleStatusShop').textContent = doublePointsActive ? 'On' : 'Off';
  if (document.getElementById('goldenStatusShop')) document.getElementById('goldenStatusShop').textContent = goldenClickActive ? 'Ready' : 'Not Ready';
  if (document.getElementById('luckBoostStatusShop')) document.getElementById('luckBoostStatusShop').textContent = luckBoostActive ? 'Active' : 'Inactive';
  if (document.getElementById('timeFreezeStatusShop')) document.getElementById('timeFreezeStatusShop').textContent = timeFreezeActive ? 'Active' : 'Inactive';
  if (document.getElementById('goldenModeStatusShop')) document.getElementById('goldenModeStatusShop').textContent = goldenModeActive ? 'Active' : 'Inactive';
}

// --- Ensure all update functions are called on load ---
window.addEventListener('DOMContentLoaded', function() {
  if (typeof updatePointsDisplay === 'function') updatePointsDisplay();
  if (typeof updateTotalClicksDisplay === 'function') updateTotalClicksDisplay();
  if (typeof updateRarestFindDisplay === 'function') updateRarestFindDisplay();
  if (typeof updateUnlockedRaritiesBox === 'function') updateUnlockedRaritiesBox();
  if (typeof updateAchievementsDisplay === 'function') updateAchievementsDisplay();
  if (typeof updateShopStatus === 'function') updateShopStatus();
  if (typeof updateShopButtonLabels === 'function') updateShopButtonLabels();
  if (typeof updateStageDisplay === 'function') updateStageDisplay();
  if (typeof updateTimerDisplay === 'function') updateTimerDisplay();
  if (typeof updateBuffTimers === 'function') updateBuffTimers();
  if (typeof updateLogDisplay === 'function') updateLogDisplay();
});

// --- Next Stage Logic ---
function canAdvanceStage() {
  // Must have unlocked Sigma or above and have at least 8000 points * (1.5)^(stage-1)
  const rarityOrder = rarities.map(r => r.name);
  const sigmaIndex = rarityOrder.indexOf('Sigma');
  const hasSigmaOrAbove = unlockedRarities.some(r => rarityOrder.indexOf(r) >= sigmaIndex);
  const requiredPoints = Math.floor(8000 * Math.pow(1.5, stage - 1));
  return hasSigmaOrAbove && points >= requiredPoints;
}
function advanceStage() {
  if (!canAdvanceStage()) {
    const requiredPoints = Math.floor(8000 * Math.pow(1.5, stage - 1));
    alert('You must unlock Sigma or above and have at least ' + requiredPoints + ' points to advance!');
    return;
  }
  stage++;
  // Reward: points go up by 5000 per stage (example, adjust as needed)
  points += 5000 * stage;
  updateStageDisplay();
  updateShopButtonLabels();
  updatePointsDisplay();
  updateShopStatus();
  updateLogDisplay();
  saveGameToStorage();
}
window.advanceStage = advanceStage;

// Add event listener for nextStageBtn
if (document.getElementById('nextStageBtn')) {
  document.getElementById('nextStageBtn').onclick = advanceStage;
}

// Update next stage requirements display
function updateNextStageReq() {
  // Requirements: must have unlocked 'Sigma' or above and enough points
  const rarityOrder = rarities.map(r => r.name);
  const sigmaIndex = rarityOrder.indexOf('Sigma');
  let hasSigmaOrAbove = unlockedRarities.some(r => rarityOrder.indexOf(r) >= sigmaIndex);
  let requiredPoints = Math.floor(8000 * Math.pow(1.5, stage - 1));
  let reqText = `<b>Next Stage Requirements:</b><br>`;
  reqText += `Unlock <b>Sigma</b> or above: ` + (hasSigmaOrAbove ? '<span style="color:green;">✔</span>' : '<span style="color:red;">✘</span>') + '<br>';
  reqText += `Points: <span id='nextStagePointsText'>${points} / ${requiredPoints}</span>`;
  // Progress bar
  let percent = Math.min(100, Math.floor((points / requiredPoints) * 100));
  reqText += `<div style='background:#eee;border-radius:8px;height:18px;width:100%;margin:6px 0;'><div style='background:#4caf50;height:100%;width:${percent}%;border-radius:8px;transition:width 0.3s;'></div></div>`;
  const reqBox = document.getElementById('nextStageReqBox');
  if (reqBox) reqBox.innerHTML = reqText;
}
// Patch point/rarity update functions to also update requirements
(function() {
  const origUpdatePointsDisplay = window.updatePointsDisplay;
  window.updatePointsDisplay = function() {
    if (origUpdatePointsDisplay) origUpdatePointsDisplay();
    updateNextStageReq();
  };
  const origUpdateUnlockedRaritiesBox = window.updateUnlockedRaritiesBox;
  window.updateUnlockedRaritiesBox = function() {
    if (origUpdateUnlockedRaritiesBox) origUpdateUnlockedRaritiesBox();
    updateNextStageReq();
  };
})();
// Call on load
if (document.getElementById('nextStageReqBox')) updateNextStageReq();

// --- Auto-save interval logic ---
let autoSaveIntervalSec = 10;
let autoSaveTimer = null;
function setAutoSaveInterval(sec) {
  if (typeof sec !== 'number' || isNaN(sec) || sec < 5) sec = 5;
  autoSaveIntervalSec = sec;
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer = setInterval(() => {
    if (typeof saveGameToStorage === 'function') saveGameToStorage();
  }, autoSaveIntervalSec * 1000);
}

// --- Settings UI for auto-save interval ---
function injectAutoSaveSetting() {
  const settingsModal = document.getElementById('settingsModal');
  if (!settingsModal) return;
  let existing = document.getElementById('autoSaveSettingRow');
  if (existing) return;
  const row = document.createElement('div');
  row.id = 'autoSaveSettingRow';
  row.style.margin = '12px 0';
  row.innerHTML = '<label for="autoSaveIntervalInput"><b>Auto-save interval (sec):</b></label> <input id="autoSaveIntervalInput" type="number" min="5" max="120" value="' + autoSaveIntervalSec + '" style="width:60px;">';
  const saveSection = settingsModal.querySelector('.save-section') || settingsModal.querySelector('.stats-section');
  if (saveSection) saveSection.parentNode.insertBefore(row, saveSection);
  else settingsModal.querySelector('.modal-content').appendChild(row);
  document.getElementById('autoSaveIntervalInput').addEventListener('change', function() {
    let v = parseInt(this.value, 10);
    if (isNaN(v) || v < 5) v = 5;
    setAutoSaveInterval(v);
    this.value = v;
  });
}

// --- Patch settings modal open to inject auto-save setting ---
const origToggleSettingsModal = window.toggleSettingsModal;
window.toggleSettingsModal = function() {
  if (origToggleSettingsModal) origToggleSettingsModal();
  setTimeout(injectAutoSaveSetting, 100);
};
// --- Start auto-save on load ---
setAutoSaveInterval(autoSaveIntervalSec);

// --- Ensure boolean flags never null ---
function safeBool(val) {
  return val === true || val === 'true';
}
