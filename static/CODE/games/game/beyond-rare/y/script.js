// script.js

/******** Global Variables & Persistent Storage ********/
let points = localStorage.getItem("points")
  ? parseInt(localStorage.getItem("points"))
  : 0;
let startTime = localStorage.getItem("startTime")
  ? parseInt(localStorage.getItem("startTime"))
  : Date.now();
localStorage.setItem("startTime", startTime);

let autoClickersCount = 0,
  autoInterval = null;
let doublePointsActive = false,
  goldenClickReady = false;
let luckBoostActive = false,
  timeFreezeActive = false,
  goldenModeActive = false;

let totalClicks = localStorage.getItem("totalClicks")
  ? parseInt(localStorage.getItem("totalClicks"))
  : 0;
let logData = JSON.parse(localStorage.getItem("logData")) || [];
let shopPriceMultiplier = localStorage.getItem("shopPriceMultiplier")
  ? parseFloat(localStorage.getItem("shopPriceMultiplier"))
  : 1;
let upstageCount = localStorage.getItem("upstageCount")
  ? parseInt(localStorage.getItem("upstageCount"))
  : 0;

/******** Rarity Definitions ********/
const rarities = [
  { name: "Common", chance: 50 },
  { name: "Uncommon", chance: 25 },
  { name: "Rare", chance: 12.5 },
  { name: "Super Rare", chance: 6.25 },
  { name: "Ultra Rare", chance: 3.13 },
  { name: "Epic", chance: 1.56 },
  { name: "Very Epic", chance: 0.78 },
  { name: "Legendary", chance: 0.39 },
  { name: "Mythic", chance: 0.2 },
  { name: "Chroma", chance: 0.1 },
  { name: "Godly", chance: 0.05 },
  { name: "Impossible", chance: 0.03 },
  { name: "Ethereal", chance: 0.02 },
  { name: "Extraordinary", chance: 0.01 },
  { name: "Stellar", chance: 0.005 },
  { name: "Unknown", chance: 0.002 }
];

const rarityPoints = {
  "Common": 0,
  "Uncommon": 0,
  "Rare": 1,
  "Super Rare": 2,
  "Ultra Rare": 3,
  "Epic": 5,
  "Very Epic": 7,
  "Legendary": 10,
  "Mythic": 15,
  "Chroma": 25,
  "Godly": 40,
  "Impossible": 75,
  "Ethereal": 100,
  "Extraordinary": 200,
  "Stellar": 500,
  "Unknown": 600,
  "Glitched": 999
};

/******** Permanent Backgrounds ********/
const backgroundsPermanent = {
  "White": { cost: 200, requiredRarity: "Common", color: "#ffffff" },
  "Light Red": { cost: 200, requiredRarity: "Mythic", color: "#ffcccb" },
  "Medium Red": { cost: 200, requiredRarity: "Mythic", color: "#ff6666" },
  "Dark Red": { cost: 200, requiredRarity: "Mythic", color: "#8b0000" },
  "Light Blue": { cost: 200, requiredRarity: "Rare", color: "#add8e6" },
  "Medium Blue": { cost: 200, requiredRarity: "Rare", color: "#6495ed" },
  "Dark Blue": { cost: 200, requiredRarity: "Rare", color: "#00008b" },
  "Light Yellow": { cost: 200, requiredRarity: "Legendary", color: "#fffacd" },
  "Medium Yellow": { cost: 200, requiredRarity: "Legendary", color: "#f0e68c" },
  "Dark Yellow": { cost: 200, requiredRarity: "Legendary", color: "#ffd700" },
  "Light Orange": { cost: 200, requiredRarity: "Chroma", color: "#ffdab9" },
  "Medium Orange": { cost: 200, requiredRarity: "Chroma", color: "#ffa500" },
  "Dark Orange": { cost: 200, requiredRarity: "Chroma", color: "#ff8c00" },
  "Light Green": { cost: 200, requiredRarity: "Uncommon", color: "#90ee90" },
  "Medium Green": { cost: 200, requiredRarity: "Uncommon", color: "#32cd32" },
  "Dark Green": { cost: 200, requiredRarity: "Uncommon", color: "#006400" },
  "Light Purple": { cost: 200, requiredRarity: "Epic", color: "#d8bfd8" },
  "Medium Purple": { cost: 200, requiredRarity: "Epic", color: "#9370db" },
  "Dark Purple": { cost: 200, requiredRarity: "Epic", color: "#4b0082" },
  "Red-Blue Gradient": {
    cost: 400,
    requiredRarity: "Impossible",
    color: "linear-gradient(45deg, red, blue)"
  },
  "Red-Yellow Gradient": {
    cost: 400,
    requiredRarity: "Impossible",
    color: "linear-gradient(45deg, red, yellow)"
  },
  "Blue-Yellow Gradient": {
    cost: 400,
    requiredRarity: "Impossible",
    color: "linear-gradient(45deg, blue, yellow)"
  }
};

/******** Seasonal Backgrounds ********/
const seasonalMainBackgrounds = [
  {
    name: "Cherry Blossom Bliss",
    cost: 500,
    availableMonths: [2, 3, 4],
    color: "linear-gradient(135deg, #FFC0CB, #FFFAF0)"
  },
  {
    name: "Meadow Bloom",
    cost: 500,
    availableMonths: [2, 3, 4],
    color: "linear-gradient(135deg, #50C878, #FFD700)"
  },
  {
    name: "Ocean Sunset",
    cost: 500,
    availableMonths: [5, 6, 7],
    color: "linear-gradient(135deg, #008080, #FF4500)"
  },
  {
    name: "Summer Vibes",
    cost: 500,
    availableMonths: [5, 6, 7],
    color: "linear-gradient(135deg, #40E0D0, #FFD700)"
  },
  {
    name: "Harvest Glow",
    cost: 500,
    availableMonths: [8, 9, 10],
    color: "linear-gradient(135deg, #FF8C00, #8B4513)"
  },
  {
    name: "Crisp Autumn",
    cost: 500,
    availableMonths: [8, 9, 10],
    color: "linear-gradient(135deg, #DC143C, #FFBF00)"
  },
  {
    name: "Frostbite Chill",
    cost: 500,
    availableMonths: [11, 0, 1],
    color: "linear-gradient(135deg, #B0E0E6, #DCDCDC)"
  },
  {
    name: "Snowy Cabin",
    cost: 500,
    availableMonths: [11, 0, 1],
    color: "linear-gradient(135deg, #006400, #8B4513)"
  }
];

const seasonalEventBackgrounds = [
  {
    name: "July 4th Fireworks",
    cost: 750,
    availableDates: {
      start: new Date(new Date().getFullYear(), 5, 15),
      end: new Date(new Date().getFullYear(), 6, 15)
    },
    color: "linear-gradient(135deg, #00008B, #B22222, #FFFFFF)"
  },
  {
    name: "Halloween Haunt",
    cost: 750,
    availableDates: {
      start: new Date(new Date().getFullYear(), 9, 15),
      end: new Date(new Date().getFullYear(), 9, 31)
    },
    color: "linear-gradient(135deg, #555555, #FF7518)"
  },
  {
    name: "Christmas Cheer",
    cost: 750,
    availableMonths: [11],
    color: "linear-gradient(135deg, #D32F2F, #008000)"
  },
  {
    name: "Summer Freedom",
    cost: 750,
    availableDates: {
      start: new Date(new Date().getFullYear(), 4, 28),
      end: new Date(new Date().getFullYear(), 5, 10)
    },
    color: "linear-gradient(135deg, #87CEEB, #F5DEB3)"
  },
  {
    name: "Happy New Year",
    cost: 750,
    availableDates: {
      start: new Date(new Date().getFullYear(), 0, 1),
      end: new Date(new Date().getFullYear(), 0, 5)
    },
    color: "linear-gradient(135deg, #00008B, #8B0000, #FFD700)"
  }
];

/******** Persistent Background State ********/
let ownedBackgrounds =
  JSON.parse(localStorage.getItem("ownedBackgrounds")) || {};
let activeBackground =
  localStorage.getItem("activeBackground") || "Light Blue";

let ownedSeasonalBackgrounds =
  JSON.parse(localStorage.getItem("ownedSeasonalBackgrounds")) || {};
let activeSeasonalBackground =
  localStorage.getItem("activeSeasonalBackground") || "";

/******** Timer Update (every 100ms) ********/
function updateTimer() {
  if (!timeFreezeActive) {
    const now = Date.now();
    const secondsElapsed = ((now - startTime) / 1000).toFixed(1);
    document.getElementById("timer").innerText =
      "Time: " + secondsElapsed + "s";
    localStorage.setItem("startTime", startTime);
  }
}
setInterval(updateTimer, 100);
/******** Mute/Play Music *******/
document.getElementById("musicToggleBtn").addEventListener("click", function () {
  const bgm = document.getElementById("bgm");
  if (bgm.paused) {
    bgm.play();
    this.textContent = "Mute Music";
  } else {
    bgm.pause();
    this.textContent = "Unmute Music";
  }
});
