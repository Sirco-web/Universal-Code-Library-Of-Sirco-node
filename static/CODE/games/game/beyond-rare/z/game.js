// ==== GAME META ====
const GAME_VERSION = "5.2.4";
const GAME_MODEL = "z"; // Change to "X", "Y", or "Z" for your team

// ========== 100 RARITIES =============
const rarities = [
  { name: "Common", chance: 18, showAchievement: true },
  { name: "Uncommon", chance: 14, showAchievement: true },
  { name: "Unusual", chance: 10, showAchievement: true },
  { name: "Weird", chance: 7, showAchievement: true },
  { name: "Odd", chance: 6, showAchievement: true },
  { name: "Curious", chance: 5.5, showAchievement: true },
  { name: "Rare", chance: 5, showAchievement: true },
  { name: "Unreal", chance: 4.6, showAchievement: true },
  { name: "Super Rare", chance: 4.2, showAchievement: true },
  { name: "Ultra Rare", chance: 3.8, showAchievement: true },
  { name: "Epic", chance: 3.4, showAchievement: true },
  { name: "Very Epic", chance: 3.0, showAchievement: true },
  { name: "Insane", chance: 2.7, showAchievement: true },
  { name: "Legendary", chance: 2.4, showAchievement: true },
  { name: "Mythic", chance: 2.1, showAchievement: true },
  { name: "Chroma", chance: 1.9, showAchievement: true },
  { name: "Godly", chance: 1.7, showAchievement: true },
  { name: "Impossible", chance: 1.5, showAchievement: true },
  { name: "Ethereal", chance: 1.3, showAchievement: true },
  { name: "Extraordinary", chance: 1.1, showAchievement: true },
  { name: "Cosmic", chance: 0.95, showAchievement: true },
  { name: "Transcendent", chance: 0.9, showAchievement: true },
  { name: "Paradoxical", chance: 0.8, showAchievement: true },
  { name: "Absolute", chance: 0.7, showAchievement: true },
  { name: "Omniversal", chance: 0.65, showAchievement: true },
  { name: "Impossible+", chance: 0.6, showAchievement: true },
  { name: "Divine", chance: 0.55, showAchievement: true },
  { name: "Singular", chance: 0.5, showAchievement: true },
  { name: "Eternal", chance: 0.48, showAchievement: true },
  { name: "Quantum", chance: 0.46, showAchievement: true },
  { name: "Quantum+", chance: 0.44, showAchievement: true },
  { name: "Fractal", chance: 0.42, showAchievement: true },
  { name: "Glitched", chance: 0.4, showAchievement: true },
  { name: "Exotic", chance: 0.38, showAchievement: true },
  { name: "Hallowed", chance: 0.36, showAchievement: true },
  { name: "Primordial", chance: 0.34, showAchievement: true },
  { name: "Nuclear", chance: 0.32, showAchievement: true },
  { name: "Radiant", chance: 0.3, showAchievement: true },
  { name: "Corrupted", chance: 0.28, showAchievement: true },
  { name: "Frozen", chance: 0.25, showAchievement: true },
  { name: "Infernal", chance: 0.22, showAchievement: true },
  { name: "Parallel", chance: 0.2, showAchievement: true },
  { name: "Temporal", chance: 0.19, showAchievement: true },
  { name: "Anomalous", chance: 0.18, showAchievement: true },
  { name: "Ascended", chance: 0.17, showAchievement: true },
  { name: "Unobtainium", chance: 0.16, showAchievement: true },
  { name: "Galactic", chance: 0.15, showAchievement: true },
  { name: "Supreme", chance: 0.14, showAchievement: true },
  { name: "Ancient", chance: 0.13, showAchievement: true },
  { name: "Enigmatic", chance: 0.12, showAchievement: true },
  { name: "Spectral", chance: 0.11, showAchievement: true },
  { name: "Astral", chance: 0.1, showAchievement: true },
  { name: "Solar", chance: 0.09, showAchievement: true },
  { name: "Lunar", chance: 0.085, showAchievement: true },
  { name: "Stellar", chance: 0.08, showAchievement: true },
  { name: "Nebulous", chance: 0.075, showAchievement: true },
  { name: "Void", chance: 0.07, showAchievement: true },
  { name: "Dimensional", chance: 0.065, showAchievement: true },
  { name: "Hyper", chance: 0.06, showAchievement: true },
  { name: "Ultra", chance: 0.055, showAchievement: true },
  { name: "Mega", chance: 0.05, showAchievement: true },
  { name: "Nano", chance: 0.045, showAchievement: true },
  { name: "Micro", chance: 0.04, showAchievement: true },
  { name: "Pico", chance: 0.035, showAchievement: true },
  { name: "Femto", chance: 0.03, showAchievement: true },
  { name: "Atto", chance: 0.025, showAchievement: true },
  { name: "Zepto", chance: 0.021, showAchievement: true },
  { name: "Yocto", chance: 0.019, showAchievement: true },
  { name: "Planck", chance: 0.017, showAchievement: true },
  { name: "Infinity", chance: 0.015, showAchievement: true },
  { name: "Omega", chance: 0.013, showAchievement: true },
  { name: "Alpha", chance: 0.011, showAchievement: true },
  { name: "Beta", chance: 0.009, showAchievement: true },
  { name: "Gamma", chance: 0.008, showAchievement: true },
  { name: "Delta", chance: 0.007, showAchievement: true },
  { name: "Epsilon", chance: 0.006, showAchievement: true },
  { name: "Zeta", chance: 0.005, showAchievement: true },
  { name: "Theta", chance: 0.004, showAchievement: true },
  { name: "Iota", chance: 0.003, showAchievement: true },
  { name: "Kappa", chance: 0.0025, showAchievement: true },
  { name: "Lambda", chance: 0.002, showAchievement: true },
  { name: "Sigma", chance: 0.0018, showAchievement: true },
  { name: "Tau", chance: 0.0016, showAchievement: true },
  { name: "Upsilon", chance: 0.0014, showAchievement: true },
  { name: "Phi", chance: 0.0012, showAchievement: true },
  { name: "Chi", chance: 0.0011, showAchievement: true },
  { name: "Psi", chance: 0.001, showAchievement: true },
  { name: "Omega+", chance: 0.0009, showAchievement: true },
  { name: "Reality", chance: 0.0008, showAchievement: true },
  { name: "Oblivion", chance: 0.0007, showAchievement: true },
  { name: "Unseen", chance: 0.0006, showAchievement: true },
  { name: "Shadow", chance: 0.0005, showAchievement: true },
  { name: "Ghost", chance: 0.0004, showAchievement: true },
  { name: "Phantom", chance: 0.0003, showAchievement: true },
  { name: "Ultra Secret", chance: 0.0002, showAchievement: true },
  { name: "Secret", chance: 0.0001, showAchievement: true },
  { name: "???", chance: 0.00005, showAchievement: true },
  { name: "Glitch", chance: 0.00004, showAchievement: true },
  { name: "Impossible++", chance: 0.00003, showAchievement: true },
  { name: "Rainbow", chance: 0.00002, showAchievement: true },
  { name: "Memetic", chance: 0.00001, showAchievement: true },
  { name: "404", chance: 0.000009, showAchievement: true },
  { name: "???+", chance: 0.000008, showAchievement: false },
  { name: "Secret+", chance: 0.000007, showAchievement: false },
  { name: "Ultra Secret+", chance: 0.000006, showAchievement: false }
];
const rarityPoints = {};
rarities.forEach((r, i) => {
  if (r.name === "Uncommon") {
    rarityPoints[r.name] = -20;
  } else {
    rarityPoints[r.name] = Math.max(1, Math.floor(10 - i / 10));
  }
});

// --- Achievements (see previous code for full baseAchievements/rules) ---
function getRarityIcon(rarity) {
  // Fun icons for each rarity
  const iconList = [
    "⚪","🟢","🟠","👾","🔸","💡","🔵","💫","💠","🔷","💜","🟣","🤪","🌟","🐉","🌈","😇","❗","👻","🔥","🪐","✨","🌀","🔶","🌌","‼️","🛐","🔸","♾️","⚛️","🧬","🧩","🖤","🍉","🎃","🌋","☢️","💎","💀","❄️","🔥","🪞",
    "⏳","🧿","🚀","🛸","🌠","💎","🕳️","🧿","🌒","🌞","🌚","🌟","🌌","🧬","🐾","🍀","💍","🪁","🦄","👑","🔮","🧸","🎲","🍔","🧊","🧱","🦠","🛰️","🧭","🦜","🍄","🧞","🧙‍♂️","🧙‍♀️","🧚‍♀️","🧚‍♂️","🦋","🦖","🦕","🦑","🦐","🦞","🦀"
  ];
  const idx = rarities.findIndex(r => r.name === rarity);
  return idx >= 0 && idx < iconList.length ? iconList[idx] : "⭐";
}
function getRarityDesc(rarity) {
  return `Discover ${rarity}!`;
}
const rarityAchievements = rarities.filter(r => r.showAchievement).map(r => ({
  key: 'rarity_' + r.name.replace(/\s+/g, '').toLowerCase(),
  name: r.name + " Found",
  desc: getRarityDesc(r.name),
  icon: getRarityIcon(r.name),
  rarity: r.name,
  hidden: false
}));
const allAchievements = [
  // Core progress
  { key: 'firstClick', name: 'First Click!', desc: 'Make your first click.', icon: '🖱️' },
  { key: 'tenClicks', name: 'Getting Started', desc: 'Reach 10 clicks.', icon: '🔟' },
  { key: 'fiftyClicks', name: 'Click Apprentice', desc: 'Reach 50 clicks.', icon: '5️⃣0️⃣' },
  { key: 'hundredClicks', name: 'Click Machine', desc: 'Reach 100 total clicks.', icon: '💯' },
  { key: 'oneKClicks', name: 'Click Storm', desc: 'Reach 1,000 total clicks.', icon: '🌪️' },
  { key: 'tenKClicks', name: 'Click Monster', desc: 'Reach 10,000 total clicks.', icon: '🤖' },
  { key: 'hundredKClicks', name: 'Click Demon', desc: 'Reach 100,000 total clicks.', icon: '👹' },
  { key: 'millionClicks', name: 'Click Legend', desc: 'Reach 1,000,000 total clicks.', icon: '🏆' },
  { key: 'billionClicks', name: 'Click God', desc: 'Reach 1,000,000,000 total clicks.', icon: '💀' },

  // Points milestones
  { key: 'firstPoints', name: 'First Points', desc: 'Earn your first point.', icon: '1️⃣' },
  { key: 'hundredPoints', name: 'Hundredaire', desc: 'Earn 100 points.', icon: '💵' },
  { key: 'oneKPoints', name: 'Thousandaire', desc: 'Earn 1,000 points.', icon: '💸' },
  { key: 'tenKPoints', name: 'Ten Thousand!', desc: 'Earn 10,000 points.', icon: '💰' },
  { key: 'hundredKPoints', name: 'Hundred K!', desc: 'Earn 100,000 points.', icon: '💴' },
  { key: 'millionPoints', name: 'Millionaire', desc: 'Accumulate 1,000,000 points (lifetime).', icon: '💎' },

  // Shop
  { key: 'shopper', name: 'Shopper', desc: 'Purchase any shop upgrade.', icon: '🛒' },
  { key: 'allShop', name: 'Fully Stocked', desc: 'Buy every shop upgrade at least once.', icon: '🛍️' },
  { key: 'autoClicker', name: 'Auto Time', desc: 'Buy your first auto clicker.', icon: '🤖' },
  { key: 'doublePoints', name: 'Doubled Up', desc: 'Buy your first double points.', icon: '🟪' },
  { key: 'goldenClick', name: 'Golden Finger', desc: 'Buy your first golden click.', icon: '🟨' },
  { key: 'luckBoost', name: 'Feeling Lucky', desc: 'Buy your first luck boost.', icon: '🍀' },
  { key: 'timeFreeze', name: 'Stopwatch', desc: 'Buy your first time freeze.', icon: '⏱️' },
  { key: 'goldenMode', name: 'Gold Rush', desc: 'Buy your first golden mode.', icon: '💰' },

  // Backgrounds
  { key: 'backgroundCollector', name: 'Decorator', desc: 'Buy your first background.', icon: '🎨' },
  { key: 'allBackgrounds', name: 'Interior Designer', desc: 'Own every background.', icon: '🏡' },
  { key: 'rainbowBg', name: 'Taste the Rainbow', desc: 'Unlock the Rainbow background.', icon: '🌈' },
  { key: 'godlyBg', name: 'Heavenly View', desc: 'Unlock the Godly background.', icon: '😇' },

  // Resets
  { key: 'softReset', name: 'Soft Start', desc: 'Do a SOFT reset at least once.', icon: '♻️' },
  { key: 'softReset5', name: 'Soft Pro', desc: 'Do 5 SOFT resets.', icon: '♻️' },
  { key: 'softReset10', name: 'Soft Master', desc: 'Do 10 SOFT resets.', icon: '♻️' },
  { key: 'resetGame', name: 'Fresh Start', desc: 'Do a HARD reset at least once.', icon: '🔄' },
  { key: 'resetGame5', name: 'Hard Pro', desc: 'Do 5 HARD resets.', icon: '🔄' },

  // Lifetime points
  { key: 'lifetime10K', name: 'Lifetime 10K', desc: 'Earn 10,000 points lifetime.', icon: '🎉' },
  { key: 'lifetime100K', name: 'Lifetime 100K', desc: 'Earn 100,000 points lifetime.', icon: '🎊' },
  { key: 'lifetime1M', name: 'Lifetime 1M', desc: 'Earn 1,000,000 points lifetime.', icon: '🏆' },
  { key: 'lifetime10M', name: 'Lifetime 10M', desc: 'Earn 10,000,000 points lifetime.', icon: '🏵️' },
  { key: 'lifetime100M', name: 'Lifetime 100M', desc: 'Earn 100,000,000 points lifetime.', icon: '🎖️' },
  { key: 'lifetime1B', name: 'Lifetime 1B', desc: 'Earn 1,000,000,000 points lifetime.', icon: '🥇' },
  { key: 'lifetime10B', name: 'Lifetime 10B', desc: 'Earn 10,000,000,000 points lifetime.', icon: '🥈' },
  { key: 'lifetime100B', name: 'Lifetime 100B', desc: 'Earn 100,000,000,000 points lifetime.', icon: '🥉' },
  { key: 'lifetime1T', name: 'Lifetime 1T', desc: 'Earn 1,000,000,000,000 points lifetime.', icon: '🏅' },

  // Combo achievements
  { key: 'combo5', name: 'Quick Five', desc: 'Click 5 times in 2 seconds.', icon: '⚡' },
  { key: 'combo10', name: 'Turbo Ten', desc: 'Click 10 times in 4 seconds.', icon: '💨' },
  { key: 'combo25', name: 'Blazing 25', desc: 'Click 25 times in 8 seconds.', icon: '🔥' },
  { key: 'combo100', name: 'Unstoppable', desc: 'Click 100 times in 30 seconds.', icon: '🚀' },
  { key: 'combo1000', name: 'Machine', desc: 'Click 1000 times in 5 minutes.', icon: '🤖' },
  { key: 'comboStreak', name: 'Click Streak', desc: 'Maintain a click streak for 60 seconds.', icon: '⏱️' },
  { key: 'comboStreak2', name: 'Double Streak', desc: 'Maintain a click streak for 120 seconds.', icon: '⏱️' },
  { key: 'comboStreak3', name: 'Triple Streak', desc: 'Maintain a click streak for 180 seconds.', icon: '⏱️' },
  { key: 'maxCombo', name: 'Streak God', desc: 'Break your combo streak record.', icon: '🏅' },
  { key: 'comboPerfection', name: 'Perfection', desc: 'No miss for 100 clicks.', icon: '🎯' },

  // Log/Collection
  { key: 'log10', name: 'Discover 10', desc: 'Discover 10 different rarities.', icon: '🔟' },
  { key: 'log25', name: 'Discover 25', desc: 'Discover 25 different rarities.', icon: '2️⃣5️⃣' },
  { key: 'log50', name: 'Discover 50', desc: 'Discover 50 different rarities.', icon: '5️⃣0️⃣' },
  { key: 'log75', name: 'Discover 75', desc: 'Discover 75 different rarities.', icon: '7️⃣5️⃣' },
  { key: 'logAll', name: 'All Found', desc: 'Discover all rarities.', icon: '🧠' },

  // Date/Fun/Hidden
  { key: 'clickAtMidnight', name: 'Night Owl', desc: 'Click at midnight.', icon: '🌙' },
  { key: 'clickAtNoon', name: 'Day Clicker', desc: 'Click at noon.', icon: '☀️' },
  { key: 'clickOnLeapDay', name: 'Leap Year', desc: 'Click on Feb 29.', icon: '🐸' },
  { key: 'clickOnBirthday', name: 'Birthday Click', desc: 'Click on your birthday.', icon: '🎂' },
  { key: 'clickOnHalloween', name: 'Spooky Click', desc: 'Click on October 31.', icon: '🎃' },

  // Secrets
  { key: 'cheater', name: 'Caught Cheating', desc: 'Try to import a tampered save.', icon: '⛔' },
  { key: 'secret1', name: 'Top Secret', desc: '???', icon: '❓' },
  { key: 'secret2', name: 'Ultra Hidden', desc: '???', icon: '❓' },
  { key: 'secret3', name: 'Mystery', desc: '???', icon: '❓' },
  { key: 'secret4', name: '???', desc: '???', icon: '❓' },
  { key: 'secret5', name: '???', desc: '???', icon: '❓' },

  // Challenge
  { key: 'challenge1', name: 'Challenge 1', desc: '???', icon: '🎯' },
  { key: 'challenge2', name: 'Challenge 2', desc: '???', icon: '🎯' },
  { key: 'challenge3', name: 'Challenge 3', desc: '???', icon: '🎯' },
  { key: 'challenge4', name: 'Challenge 4', desc: '???', icon: '🎯' },
  { key: 'challenge5', name: 'Challenge 5', desc: '???', icon: '🎯' },
  { key: 'challenge6', name: 'Challenge 6', desc: '???', icon: '🎯' },
  { key: 'challenge7', name: 'Challenge 7', desc: '???', icon: '🎯' },
  { key: 'challenge8', name: 'Challenge 8', desc: '???', icon: '🎯' },
  { key: 'challenge9', name: 'Challenge 9', desc: '???', icon: '🎯' },
  { key: 'challenge10', name: 'Challenge 10', desc: '???', icon: '🎯' }
];

// Add all 100 rarity achievements (showAchievement for last 3 is false/hidden)
const rarityNames = [
  "Common", "Uncommon", "Unusual", "Weird", "Odd", "Curious", "Rare", "Unreal", "Super Rare", "Ultra Rare",
  "Epic", "Very Epic", "Insane", "Legendary", "Mythic", "Chroma", "Godly", "Impossible", "Ethereal", "Extraordinary",
  "Cosmic", "Transcendent", "Paradoxical", "Absolute", "Omniversal", "Impossible+", "Divine", "Singular", "Eternal", "Quantum",
  "Quantum+", "Fractal", "Glitched", "Exotic", "Hallowed", "Primordial", "Nuclear", "Radiant", "Corrupted", "Frozen",
  "Infernal", "Parallel", "Temporal", "Anomalous", "Ascended", "Unobtainium", "Galactic", "Supreme", "Ancient", "Enigmatic",
  "Spectral", "Astral", "Solar", "Lunar", "Stellar", "Nebulous", "Void", "Dimensional", "Hyper", "Ultra",
  "Mega", "Nano", "Micro", "Pico", "Femto", "Atto", "Zepto", "Yocto", "Planck", "Infinity",
  "Omega", "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Theta", "Iota", "Kappa",
  "Lambda", "Sigma", "Tau", "Upsilon", "Phi", "Chi", "Psi", "Omega+", "Reality", "Oblivion",
  "Unseen", "Shadow", "Ghost", "Phantom", "Ultra Secret", "Secret", "???"
];
rarityNames.forEach(rarity => {
  allAchievements.push({
    key: 'rarity_' + rarity.replace(/\s+/g, '').toLowerCase(),
    name: (["Secret", "Ultra Secret", "???"].includes(rarity) ? "???" : rarity + " Found"),
    desc: (["Secret", "Ultra Secret", "???"].includes(rarity) ? "" : `Discover a ${rarity} item!`),
    icon: "⭐",
    rarity: rarity,
    hidden: ["Secret", "Ultra Secret", "???"].includes(rarity)
  });
});

// Use this as the achievements array
const achievements = allAchievements.slice(0, 125);

// --- Game State Variables ---
let points = parseInt(localStorage.getItem("points") || "0");
let autoClickersCount = parseInt(localStorage.getItem("autoClickersCount") || "0");
let autoInterval = null;
let doublePointsActive = localStorage.getItem("doublePointsActive") === "true";
let goldenClickReady = localStorage.getItem("goldenClickReady") === "true";
let luckBoostActive = localStorage.getItem("luckBoostActive") === "true";
let timeFreezeActive = localStorage.getItem("timeFreezeActive") === "true";
let goldenModeActive = localStorage.getItem("goldenModeActive") === "true";
let totalClicks = parseInt(localStorage.getItem("totalClicks") || "0");
let logData = JSON.parse(localStorage.getItem("logData") || "[]");
let ownedBackgrounds = JSON.parse(localStorage.getItem("ownedBackgrounds") || "{}" );
let activeBackground = localStorage.getItem("activeBackground") || "Light Blue";
let lifetimePoints = parseInt(localStorage.getItem("lifetimePoints") || "0");
let secondsPlayed = parseInt(localStorage.getItem("secondsPlayed") || "0");
let startTime = Date.now();
function updateTimer() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000) + secondsPlayed;
  document.getElementById('timer').textContent = `Time: ${elapsed}s`;
  localStorage.setItem("secondsPlayed", elapsed);
}
setInterval(updateTimer, 1000);

// --- Achievements Logic ---
function loadAchievementState() {
  return JSON.parse(localStorage.getItem('achievements') || '{}');
}
function saveAchievementState(state) {
  localStorage.setItem('achievements', JSON.stringify(state));
}
function unlockAchievement(key) {
  const state = loadAchievementState();
  if (!state[key]) {
    state[key] = true;
    saveAchievementState(state);
    renderAchievements();
  }
}
function renderAchievements() {
  const achievementState = loadAchievementState();
  const container = document.getElementById('achievementsContainer');
  container.innerHTML = '';
  achievements.forEach(a => {
    const achieved = achievementState[a.key] === true;
    if (a.hidden && !achieved) return;
    const div = document.createElement('div');
    div.className = 'achievement' + (achieved ? ' achieved' : '');
    div.innerHTML = `
      <span class="icon">${achieved ? '✅' : a.icon}</span>
      <div class="details">
        <span class="name">${a.name}</span>
        <div class="desc">${a.desc}</div>
      </div>
    `;
    container.appendChild(div);
  });
}

// --- Main Game Logic ---
document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("gameVersion").textContent = GAME_VERSION;
  document.getElementById("gameModel").textContent = GAME_MODEL;
  renderAchievements();
  updateStats();
  updateShopDisplays();
  updateLogElement(); // Ensure log is shown on page load
  // Make achievements collapsible
  const achSection = document.getElementById('achievementsSection');
  const achHeader = document.getElementById('achievementsHeader');
  if (achHeader && achSection) {
    achHeader.onclick = function() {
      achSection.classList.toggle('collapsed');
    };
  }
  // Attach click event only once after DOM is loaded
  const clickBtn = document.getElementById("clickButton");
  if (clickBtn) {
    clickBtn.onclick = function() { generateRarity(true); };
  }
});
function toggleSettingsModal() {
  const modal = document.getElementById('settingsModal');
  modal.style.display = (modal.style.display === 'block' ? 'none' : 'block');
}
function closeSaveModal() { console.log('closeSaveModal (real) called'); }
function openSaveModal(mode) { console.log('openSaveModal (real) called with mode:', mode); }
function copySaveToClipboard() { console.log('copySaveToClipboard (real) called'); }
function downloadSave() { console.log('downloadSave (real) called'); }
function importSave() { console.log('importSave (real) called'); }
function showCheaterOverlay() {
  unlockAchievement("cheater");
  document.getElementById("cheaterOverlay").style.display = "flex";
  document.getElementById("clickButton").disabled = true;
  document.getElementById("settingsIcon").onclick = null;
  document.getElementById("settingsIcon").style.pointerEvents = "none";
  document.body.classList.add("cheater-mode");
}
async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function crc32(str) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < str.length; i++) {
    crc = (crc >>> 8) ^ [0,1996959894,3993919788,2567524794,124634137,1886057615,3915621685,2657392035,249268274,2044508324,3772115230,2547177864,162941995,2125561021,3887607047,2428444049][(crc ^ str.charCodeAt(i)) & 15];
  }
  return (crc ^ (-1)) >>> 0;
}
function getSaveData() {
  return {
    version: GAME_VERSION,
    model: GAME_MODEL,
    points,
    autoClickersCount,
    doublePointsActive,
    goldenClickReady,
    luckBoostActive,
    timeFreezeActive,
    goldenModeActive,
    totalClicks,
    logData,
    ownedBackgrounds,
    activeBackground,
    achievements: loadAchievementState(),
    lifetimePoints,
    secondsPlayed: Math.floor((Date.now() - startTime) / 1000)
  };
}
async function importSave() {
  const textarea = document.getElementById("saveTextarea");
  const errorDiv = document.getElementById("importError");
  const lines = textarea.value.trim().split("\n");
  if (lines.length < 4 || !lines[0].startsWith("RARITYCLICKER-SAVE")) {
    errorDiv.textContent = "Invalid save format!";
    return;
  }
  const [hdr, cs1, cs2, b64] = lines;
  let saveStr;
  try {
    saveStr = decodeURIComponent(escape(atob(b64)));
  } catch (e) {
    errorDiv.textContent = "Corrupted save data!";
    return;
  }
  // Validate checksums
  const salt1 = "rarityclicker-1";
  const salt2 = "rarityclicker-2";
  const cs1Calc = await sha256(saveStr + salt1);
  const cs2Calc = crc32(saveStr + salt2).toString(16);
  if (cs1 !== cs1Calc || cs2 !== cs2Calc) {
    closeSaveModal();
    showCheaterOverlay();
    return;
  }
  let obj;
  try {
    obj = JSON.parse(saveStr);
  } catch (e) {
    errorDiv.textContent = "Invalid save data!";
    return;
  }
  if (!obj.model || !obj.version) {
    errorDiv.textContent = "Save missing model/version info!";
    return;
  }
  if (obj.model !== GAME_MODEL) {
    errorDiv.textContent = `Model mismatch! This save is for model "${obj.model}", but you're using "${GAME_MODEL}". You cannot load saves across models.`;
    return;
  }
  // Overwrite all relevant game data
  points = obj.points || 0;
  autoClickersCount = obj.autoClickersCount || 0;
  doublePointsActive = !!obj.doublePointsActive;
  goldenClickReady = !!obj.goldenClickReady;
  luckBoostActive = !!obj.luckBoostActive;
  timeFreezeActive = !!obj.timeFreezeActive;
  goldenModeActive = !!obj.goldenModeActive;
  totalClicks = obj.totalClicks || 0;
  logData = obj.logData || [];
  ownedBackgrounds = obj.ownedBackgrounds || {};
  activeBackground = obj.activeBackground || "Light Blue";
  lifetimePoints = obj.lifetimePoints || 0;
  secondsPlayed = obj.secondsPlayed || 0;
  localStorage.setItem("points", points);
  localStorage.setItem("autoClickersCount", autoClickersCount);
  localStorage.setItem("doublePointsActive", doublePointsActive);
  localStorage.setItem("goldenClickReady", goldenClickReady);
  localStorage.setItem("luckBoostActive", luckBoostActive);
  localStorage.setItem("timeFreezeActive", timeFreezeActive);
  localStorage.setItem("goldenModeActive", goldenModeActive);
  localStorage.setItem("totalClicks", totalClicks);
  localStorage.setItem("logData", JSON.stringify(logData));
  localStorage.setItem("ownedBackgrounds", JSON.stringify(ownedBackgrounds));
  localStorage.setItem("activeBackground", activeBackground);
  localStorage.setItem("lifetimePoints", lifetimePoints);
  localStorage.setItem("secondsPlayed", secondsPlayed);
  saveAchievementState(obj.achievements || {});
  updateShopDisplays();
  updateBackgroundShop && updateBackgroundShop();
  updateStats();
  updateLogElement();
  setDefaultBackground && setDefaultBackground();
  renderAchievements && renderAchievements();
  closeSaveModal();
}
// --- Clicking ---
document.getElementById("clickButton").addEventListener("click", function() {
  generateRarity(true);
});
let pointsPerClick = 1; // was higher before
let autoClickerPoints = 1; // was higher before
// Buff timer state
let buffTimers = {
  doublePoints: 0,
  goldenClick: 0,
  luckBoost: 0,
  timeFreeze: 0,
  goldenMode: 0
};
let buffIntervals = {};

function renderBuffTimers() {
  const buffDiv = document.getElementById('buffTimers');
  let html = '';
  if (buffTimers.doublePoints > 0) html += `<span style="color:#a80;font-weight:bold;">Double Points: ${buffTimers.doublePoints}s</span>`;
  if (buffTimers.luckBoost > 0) html += `<span style="color:#0a0;font-weight:bold;">Luck Boost: ${buffTimers.luckBoost}s</span>`;
  if (buffTimers.timeFreeze > 0) html += `<span style="color:#08c;font-weight:bold;">Time Freeze: ${buffTimers.timeFreeze}s</span>`;
  if (buffTimers.goldenMode > 0) html += `<span style="color:#e6b800;font-weight:bold;">Golden Mode: ${buffTimers.goldenMode}s</span>`;
  buffDiv.innerHTML = html;
}

function startBuffTimer(buff, duration) {
  buffTimers[buff] = duration;
  renderBuffTimers();
  if (buffIntervals[buff]) clearInterval(buffIntervals[buff]);
  buffIntervals[buff] = setInterval(() => {
    buffTimers[buff]--;
    renderBuffTimers();
    if (buffTimers[buff] <= 0) {
      clearInterval(buffIntervals[buff]);
      buffTimers[buff] = 0;
      renderBuffTimers();
      if (buff === 'doublePoints') doublePointsActive = false;
      if (buff === 'luckBoost') luckBoostActive = false;
      if (buff === 'timeFreeze') timeFreezeActive = false;
      if (buff === 'goldenMode') goldenModeActive = false;
    }
  }, 1000);
}

function generateRarity(isManual = true) {
  totalClicks++;
  localStorage.setItem("totalClicks", totalClicks);
  checkGeneralAchievements();
  let foundRarity = "";
  let multiplier = 1;
  let roll = Math.random() * 100;
  let cumulative = 0;
  let rarityList = rarities;
  // Luck Boost: remove Common, shift all down
  if (luckBoostActive && buffTimers.luckBoost > 0) {
    rarityList = rarities.filter(r => r.name !== "Common");
    let totalChance = rarityList.reduce((a, b) => a + b.chance, 0);
    roll = Math.random() * totalChance;
  }
  // Golden Mode: all clicks Legendary or above
  if (goldenModeActive && buffTimers.goldenMode > 0) {
    rarityList = rarities.filter(r => r.name === "Legendary" || r.name === "Mythic" || r.name === "Chroma" || r.name === "Godly" || r.name === "Impossible" || r.name === "Ethereal" || r.name === "Extraordinary" || r.name === "Cosmic" || r.name === "Transcendent" || r.name === "Paradoxical" || r.name === "Absolute" || r.name === "Omniversal" || r.name === "Impossible+" || r.name === "Divine" || r.name === "Singular" || r.name === "Eternal" || r.name === "Quantum" || r.name === "Quantum+" || r.name === "Fractal" || r.name === "Glitched" || r.name === "Exotic" || r.name === "Hallowed" || r.name === "Primordial" || r.name === "Nuclear" || r.name === "Radiant" || r.name === "Corrupted" || r.name === "Frozen" || r.name === "Infernal" || r.name === "Parallel" || r.name === "Temporal" || r.name === "Anomalous" || r.name === "Ascended" || r.name === "Unobtainium" || r.name === "Galactic" || r.name === "Supreme" || r.name === "Ancient" || r.name === "Enigmatic" || r.name === "Spectral" || r.name === "Astral" || r.name === "Solar" || r.name === "Lunar" || r.name === "Stellar" || r.name === "Nebulous" || r.name === "Void" || r.name === "Dimensional" || r.name === "Hyper" || r.name === "Ultra" || r.name === "Mega" || r.name === "Nano" || r.name === "Micro" || r.name === "Pico" || r.name === "Femto" || r.name === "Atto" || r.name === "Zepto" || r.name === "Yocto" || r.name === "Planck" || r.name === "Infinity" || r.name === "Omega" || r.name === "Alpha" || r.name === "Beta" || r.name === "Gamma" || r.name === "Delta" || r.name === "Epsilon" || r.name === "Zeta" || r.name === "Theta" || r.name === "Iota" || r.name === "Kappa" || r.name === "Lambda" || r.name === "Sigma" || r.name === "Tau" || r.name === "Upsilon" || r.name === "Phi" || r.name === "Chi" || r.name === "Psi" || r.name === "Omega+" || r.name === "Reality" || r.name === "Oblivion" || r.name === "Unseen" || r.name === "Shadow" || r.name === "Ghost" || r.name === "Phantom" || r.name === "Ultra Secret" || r.name === "Secret" || r.name === "???");
    let totalChance = rarityList.reduce((a, b) => a + b.chance, 0);
    roll = Math.random() * totalChance;
  }
  // Golden Click: next click is Legendary or above (for Z)
  if (goldenClickReady && GAME_MODEL.toLowerCase() === 'z') {
    rarityList = rarities.filter(r => r.name === "Legendary" || r.name === "Mythic" || r.name === "Chroma" || r.name === "Godly" || r.name === "Impossible" || r.name === "Ethereal" || r.name === "Extraordinary" || r.name === "Cosmic" || r.name === "Transcendent" || r.name === "Paradoxical" || r.name === "Absolute" || r.name === "Omniversal" || r.name === "Impossible+" || r.name === "Divine" || r.name === "Singular" || r.name === "Eternal" || r.name === "Quantum" || r.name === "Quantum+" || r.name === "Fractal" || r.name === "Glitched" || r.name === "Exotic" || r.name === "Hallowed" || r.name === "Primordial" || r.name === "Nuclear" || r.name === "Radiant" || r.name === "Corrupted" || r.name === "Frozen" || r.name === "Infernal" || r.name === "Parallel" || r.name === "Temporal" || r.name === "Anomalous" || r.name === "Ascended" || r.name === "Unobtainium" || r.name === "Galactic" || r.name === "Supreme" || r.name === "Ancient" || r.name === "Enigmatic" || r.name === "Spectral" || r.name === "Astral" || r.name === "Solar" || r.name === "Lunar" || r.name === "Stellar" || r.name === "Nebulous" || r.name === "Void" || r.name === "Dimensional" || r.name === "Hyper" || r.name === "Ultra" || r.name === "Mega" || r.name === "Nano" || r.name === "Micro" || r.name === "Pico" || r.name === "Femto" || r.name === "Atto" || r.name === "Zepto" || r.name === "Yocto" || r.name === "Planck" || r.name === "Infinity" || r.name === "Omega" || r.name === "Alpha" || r.name === "Beta" || r.name === "Gamma" || r.name === "Delta" || r.name === "Epsilon" || r.name === "Zeta" || r.name === "Theta" || r.name === "Iota" || r.name === "Kappa" || r.name === "Lambda" || r.name === "Sigma" || r.name === "Tau" || r.name === "Upsilon" || r.name === "Phi" || r.name === "Chi" || r.name === "Psi" || r.name === "Omega+" || r.name === "Reality" || r.name === "Oblivion" || r.name === "Unseen" || r.name === "Shadow" || r.name === "Ghost" || r.name === "Phantom" || r.name === "Ultra Secret" || r.name === "Secret" || r.name === "???");
    let totalChance = rarityList.reduce((a, b) => a + b.chance, 0);
    roll = Math.random() * totalChance;
    goldenClickReady = false;
    localStorage.setItem("goldenClickReady", goldenClickReady);
    updateShopDisplays();
  }
  // Time Freeze: freeze timer
  if (timeFreezeActive && buffTimers.timeFreeze > 0) {
    // Don't increment secondsPlayed in updateTimer (handled there)
  }
  for (let r of rarityList) {
    cumulative += r.chance;
    if (roll <= cumulative) {
      foundRarity = r.name;
      break;
    }
  }
  let basePoints = rarityPoints[foundRarity] || 0;
  let earned = basePoints * (doublePointsActive && buffTimers.doublePoints > 0 ? 2 : 1);
  points += earned;
  if (points < 0) points = 0;
  lifetimePoints += Math.max(0, earned);
  localStorage.setItem("points", points);
  localStorage.setItem("lifetimePoints", lifetimePoints);
  if (!logData.includes(foundRarity)) {
    logData.push(foundRarity);
    updateLogElement();
  } else {
    updateLogElement();
  }
  updateShopDisplays();
  const resultElem = document.getElementById("result");
  resultElem.innerText = "You got: " + foundRarity + " (" + (earned >= 0 ? "+" : "") + earned + " pts)";
  checkRarityAchievements(foundRarity);
  updateStats();
}

// Ensure toggleShopModal is globally accessible
if (typeof toggleShopModal === 'function') {
  window.toggleShopModal = toggleShopModal;
} else {
  window.toggleShopModal = function() {};
}
// Ensure updateStats exists
if (typeof updateStats !== 'function') {
  function updateStats() {}
}
// Ensure checkGeneralAchievements exists
if (typeof checkGeneralAchievements !== 'function') {
  function checkGeneralAchievements() {}
}
function checkRarityAchievements() {}
function updateShopDisplays() {}
function updateLogElement() {}
function resetGame() { console.log('resetGame (real) called'); }
function softResetGame() { console.log('softResetGame (real) called'); }
