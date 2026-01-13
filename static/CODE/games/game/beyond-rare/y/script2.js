// script2.js

/******** Display Update Functions ********/
function updateShopDisplays() {
  document.getElementById("pointsDisplay").innerText = points;
  document.getElementById("autoCount").innerText = autoClickersCount;
  document.getElementById("doubleStatus").innerText = doublePointsActive ? "On" : "Off";
  document.getElementById("goldenStatus").innerText = goldenClickReady ? "Ready" : "Not Ready";
  document.getElementById("luckBoostStatus").innerText = luckBoostActive ? "Active" : "Inactive";
  document.getElementById("timeFreezeStatus").innerText = timeFreezeActive ? "Active" : "Inactive";
  document.getElementById("goldenModeStatus").innerText = goldenModeActive ? "Active" : "Inactive";
}

function updateLogElement() {
  const logElem = document.getElementById("log");
  logElem.innerHTML = "";
  logData.sort((a, b) => (rarityPoints[a] || 0) - (rarityPoints[b] || 0));
  logData.forEach(rarity => {
    let li = document.createElement("li");
    li.textContent = rarity;
    li.className = getClassName(rarity);
    logElem.appendChild(li);
  });
}
updateLogElement();

function updateStats() {
  document.getElementById("totalClicks").textContent = totalClicks;
  let rarestValue = 0, rarest = "None";
  logData.forEach(rarityName => {
    let value = rarityPoints[rarityName] || 0;
    if (value > rarestValue) {
      rarestValue = value;
      rarest = rarityName;
    }
  });
  document.getElementById("rarestFind").textContent = rarest;
  
  const chancesList = document.getElementById("chancesList");
  chancesList.innerHTML = "";
  rarities.forEach(rarity => {
    if (rarity.name === "Glitched" && !logData.includes("Glitched")) return;
    let li = document.createElement("li");
    li.textContent = logData.includes(rarity.name)
      ? (rarity.name + ": " + rarity.chance + "%")
      : "???";
    chancesList.appendChild(li);
  });
  
  // Mastery Medals
  let medal1 = rarities.every(r => logData.includes(r.name)) ? "🏅" : "";
  let permanentUnlocked = Object.keys(backgroundsPermanent).every(key => ownedBackgrounds[key]);
  let seasonalMainUnlocked = seasonalMainBackgrounds.every(bg => ownedSeasonalBackgrounds[bg.name]);
  let seasonalEventUnlocked = seasonalEventBackgrounds.every(bg => ownedSeasonalBackgrounds[bg.name]);
  let medal2 = (permanentUnlocked && seasonalMainUnlocked && seasonalEventUnlocked) ? "🏅" : "";
  let medal3 = (upstageCount > 0) ? "🏅" : "";
  let medals = medal1 + medal2 + medal3;
  document.getElementById("masteryMedals").innerText = "Mastery Medals: " + medals;
  
  // Upstage Button Visibility
  let indexImpossible = rarities.findIndex(r => r.name === "Impossible");
  let raritiesUpToImpossible = rarities.filter((r, i) => i <= indexImpossible);
  let unlockUpstage = raritiesUpToImpossible.every(r => logData.includes(r.name));
  document.getElementById("upstageButton").style.display = unlockUpstage ? "block" : "none";
}
updateStats();

function getClassName(rarity) {
  return rarity.toLowerCase().replace(/ /g, "-");
}

/******** Rarity Generation & Purchase Functions ********/
function generateRarity(isManual = true) {
  totalClicks++;
  localStorage.setItem("totalClicks", totalClicks);
  
  // Check for Glitched rarity possibility: 0.001% chance if every other rarity is unlocked.
  let canGlitch = rarities.every(r => r.name === "Glitched" || logData.includes(r.name));
  if (canGlitch && Math.random() < 0.00001) {
    logData.push("Glitched");
    points += rarityPoints["Glitched"];
    localStorage.setItem("logData", JSON.stringify(logData));
    updateLogElement();
    updateStats();
    document.getElementById("result").innerText = "You got: Glitched (+" + rarityPoints["Glitched"] + " pts)";
    document.getElementById("result").className = getClassName("Glitched");
    localStorage.setItem("points", points);
    updateShopDisplays();
    return;
  }
  
  let foundRarity = "";
  let multiplier = 1;
  
  if (isManual && goldenClickReady) {
    let eligible = rarities.filter(r => (rarityPoints[r.name] || 0) >= rarityPoints["Legendary"]);
    let totalChance = eligible.reduce((sum, r) => sum + r.chance, 0);
    let roll = Math.random() * totalChance;
    let cumulative = 0;
    for (let r of eligible) {
      cumulative += r.chance;
      if (roll <= cumulative) {
        foundRarity = r.name;
        break;
      }
    }
    goldenClickReady = false;
    console.log("Golden Click applied – guaranteed Legendary or above.");
  } else if (goldenModeActive) {
    let roll = Math.random() * 100;
    let cumulative = 0;
    for (let r of rarities) {
      if (r.name === "Glitched") continue;
      cumulative += r.chance;
      if (roll <= cumulative) {
        foundRarity = r.name;
        break;
      }
    }
  } else if (luckBoostActive) {
    let roll = Math.random() * 100;
    let cumulative = 0;
    for (let r of rarities) {
      if (r.name === "Glitched") continue;
      cumulative += r.chance;
      if (roll <= cumulative) {
        foundRarity = r.name;
        break;
      }
    }
  } else {
    let roll = Math.random() * 100;
    let cumulative = 0;
    for (let r of rarities) {
      if (r.name === "Glitched") continue;
      cumulative += r.chance;
      if (roll <= cumulative) {
        foundRarity = r.name;
        break;
      }
    }
  }
  
  if (doublePointsActive) multiplier *= 2;
  let basePoints = rarityPoints[foundRarity] || 0;
  let earned = basePoints * multiplier;
  points += earned;
  localStorage.setItem("points", points);
  updateShopDisplays();
  
  const resultElem = document.getElementById("result");
  resultElem.innerText = "You got: " + foundRarity + " (+" + earned + " pts)";
  resultElem.className = getClassName(foundRarity);
  
  if (!logData.includes(foundRarity)) {
    logData.push(foundRarity);
    localStorage.setItem("logData", JSON.stringify(logData));
    updateLogElement();
  }
  updateStats();
}

function purchaseAutoClicker() {
  const cost = 50 * shopPriceMultiplier;
  if (points >= cost) {
    points -= cost;
    localStorage.setItem("points", points);
    autoClickersCount++;
    updateShopDisplays();
    if (autoClickersCount === 1 && !timeFreezeActive) {
      autoInterval = setInterval(() => {
        for (let i = 0; i < autoClickersCount; i++) {
          generateRarity(false);
        }
      }, 2000);
    }
  } else {
    alert("Not enough pts for Auto Clicker!");
  }
}

function purchaseDoublePoints() {
  const cost = 150 * shopPriceMultiplier;
  if (points >= cost) {
    points -= cost;
    localStorage.setItem("points", points);
    doublePointsActive = true;
    updateShopDisplays();
    setTimeout(() => {
      doublePointsActive = false;
      updateShopDisplays();
    }, 30000);
  } else {
    alert("Not enough pts for Double Points!");
  }
}

function purchaseGoldenClick() {
  const cost = 200 * shopPriceMultiplier;
  if (points >= cost) {
    points -= cost;
    localStorage.setItem("points", points);
    goldenClickReady = true;
    updateShopDisplays();
  } else {
    alert("Not enough pts for Golden Click!");
  }
}

function purchaseLuckBoost() {
  const cost = 300 * shopPriceMultiplier;
  if (points >= cost) {
    points -= cost;
    localStorage.setItem("points", points);
    luckBoostActive = true;
    updateShopDisplays();
    setTimeout(() => {
      luckBoostActive = false;
      updateShopDisplays();
    }, 60000);
  } else {
    alert("Not enough pts for Luck Boost!");
  }
}

function purchaseTimeFreeze() {
  const cost = 200 * shopPriceMultiplier;
  if (points >= cost) {
    points -= cost;
    localStorage.setItem("points", points);
    updateShopDisplays();
    if (!timeFreezeActive) {
      timeFreezeActive = true;
      let freezeStart = Date.now();
      if (autoInterval) {
        clearInterval(autoInterval);
        autoInterval = null;
      }
      setTimeout(() => {
        timeFreezeActive = false;
        let freezeDuration = Date.now() - freezeStart;
        startTime += freezeDuration;
        localStorage.setItem("startTime", startTime);
        updateShopDisplays();
        if (autoClickersCount > 0) {
          autoInterval = setInterval(() => {
            for (let i = 0; i < autoClickersCount; i++) {
              generateRarity(false);
            }
          }, 2000);
        }
      }, 30000);
    }
  } else {
    alert("Not enough pts for Time Freeze!");
  }
}

function purchaseGoldenMode() {
  const cost = 1500 * shopPriceMultiplier;
  if (points >= cost) {
    points -= cost;
    localStorage.setItem("points", points);
    updateShopDisplays();
    if (!goldenModeActive) {
      goldenModeActive = true;
      document.body.style.background = "#FFD700";
      setTimeout(() => {
        goldenModeActive = false;
        setDefaultBackground();
        updateShopDisplays();
      }, 3000);
    }
  } else {
    alert("Not enough pts for Golden Mode!");
  }
}

/******** Background Shop Update ********/
function updateBackgroundShop() {
  const list = document.getElementById("backgroundShopList");
  list.innerHTML = "";
  
  const headerFixed = document.createElement("h5");
  headerFixed.textContent = "Permanent Backgrounds";
  list.appendChild(headerFixed);
  
  for (const bgName in backgroundsPermanent) {
    const bgData = backgroundsPermanent[bgName];
    const li = document.createElement("li");
    li.style.background = bgData.color;
    const textOverlay = document.createElement("div");
    textOverlay.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
    textOverlay.style.padding = "5px";
    textOverlay.textContent = `${bgName} - ${bgData.cost} pts (Requires ${bgData.requiredRarity})`;
    li.appendChild(textOverlay);
    
    if (ownedBackgrounds[bgName]) {
      if (activeBackground === bgName) {
        const activeLabel = document.createElement("div");
        activeLabel.textContent = "Active";
        activeLabel.style.backgroundColor = "rgba(0,0,0,0.7)";
        activeLabel.style.color = "white";
        activeLabel.style.padding = "5px";
        li.appendChild(activeLabel);
      } else {
        const selectBtn = document.createElement("button");
        selectBtn.textContent = "Select";
        selectBtn.onclick = () => setBackground(bgName);
        li.appendChild(selectBtn);
      }
    } else {
      if (points >= bgData.cost && logHasRarity(bgData.requiredRarity)) {
        const buyBtn = document.createElement("button");
        buyBtn.textContent = "Buy";
        buyBtn.onclick = () => purchaseBackground(bgName);
        li.appendChild(buyBtn);
      } else {
        li.classList.add("disabled");
      }
    }
    list.appendChild(li);
  }
  updateSeasonalBackgroundShop();
}

function updateSeasonalBackgroundShop() {
  const list = document.getElementById("backgroundShopList");
  const headerMain = document.createElement("h5");
  headerMain.textContent = "Seasonal Backgrounds";
  list.appendChild(headerMain);
  
  const now = new Date();
  const currentMonth = now.getMonth();
  
  seasonalMainBackgrounds.forEach(bg => {
    let available = false;
    if (bg.availableMonths) {
      if (bg.availableMonths.includes(currentMonth)) {
        available = true;
      }
    } else if (bg.availableDates) {
      if (now >= bg.availableDates.start && now <= bg.availableDates.end) {
        available = true;
      }
    }
    if (available) {
      const li = document.createElement("li");
      li.style.background = bg.color;
      li.style.position = "relative";
      const textOverlay = document.createElement("div");
      textOverlay.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
      textOverlay.style.padding = "5px";
      textOverlay.textContent = `${bg.name} - ${bg.cost} pts`;
      li.appendChild(textOverlay);
      
      if (ownedSeasonalBackgrounds[bg.name]) {
        if (activeSeasonalBackground === bg.name) {
          const activeLabel = document.createElement("div");
          activeLabel.textContent = "Active";
          activeLabel.style.backgroundColor = "rgba(0,0,0,0.7)";
          activeLabel.style.color = "white";
          activeLabel.style.padding = "5px";
          li.appendChild(activeLabel);
        } else {
          const selectBtn = document.createElement("button");
          selectBtn.textContent = "Select";
          selectBtn.onclick = () => setSeasonalBackground(bg.name, bg.color);
          li.appendChild(selectBtn);
        }
      } else {
        if (points >= bg.cost) {
          const buyBtn = document.createElement("button");
          buyBtn.textContent = "Buy";
          buyBtn.onclick = () => {
            points -= bg.cost;
            localStorage.setItem("points", points);
            ownedSeasonalBackgrounds[bg.name] = true;
            localStorage.setItem("ownedSeasonalBackgrounds", JSON.stringify(ownedSeasonalBackgrounds));
            updateShopDisplays();
            updateSeasonalBackgroundShop();
          };
          li.appendChild(buyBtn);
        } else {
          li.classList.add("disabled");
        }
      }
      list.appendChild(li);
    }
  });

  // Special Event Backgrounds
  const headerEvent = document.createElement("h5");
  headerEvent.textContent = "Special Event Backgrounds";
  list.appendChild(headerEvent);
  
  seasonalEventBackgrounds.forEach(bg => {
    let available = false;
    const now = new Date();
    if (bg.availableDates && now >= bg.availableDates.start && now <= bg.availableDates.end) {
      available = true;
    }
    if (available) {
      const li = document.createElement("li");
      li.style.background = bg.color;
      li.style.position = "relative";
      const limitedIcon = document.createElement("div");
      limitedIcon.textContent = "🕘";
      limitedIcon.className = "seasonal-event-icon";
      li.appendChild(limitedIcon);
      
      const textOverlay = document.createElement("div");
      textOverlay.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
      textOverlay.style.padding = "5px";
      textOverlay.textContent = `${bg.name} - ${bg.cost} pts`;
      li.appendChild(textOverlay);
      
      if (ownedSeasonalBackgrounds[bg.name]) {
        if (activeSeasonalBackground === bg.name) {
          const activeLabel = document.createElement("div");
          activeLabel.textContent = "Active";
          activeLabel.style.backgroundColor = "rgba(0,0,0,0.7)";
          activeLabel.style.color = "white";
          activeLabel.style.padding = "5px";
          li.appendChild(activeLabel);
        } else {
          const selectBtn = document.createElement("button");
          selectBtn.textContent = "Select";
          selectBtn.onclick = () => setSeasonalBackground(bg.name, bg.color);
          li.appendChild(selectBtn);
        }
      } else {
        if (points >= bg.cost) {
          const buyBtn = document.createElement("button");
          buyBtn.textContent = "Buy";
          buyBtn.onclick = () => {
            points -= bg.cost;
            localStorage.setItem("points", points);
            ownedSeasonalBackgrounds[bg.name] = true;
            localStorage.setItem("ownedSeasonalBackgrounds", JSON.stringify(ownedSeasonalBackgrounds));
            updateShopDisplays();
            updateSeasonalBackgroundShop();
          };
          li.appendChild(buyBtn);
        } else {
          li.classList.add("disabled");
        }
      }
      list.appendChild(li);
    }
  });
}

/******** Other Utility & UI Functions ********/
function purchaseBackground(bgName) {
  const bgData = backgroundsPermanent[bgName];
  if (!bgData || points < bgData.cost || !logHasRarity(bgData.requiredRarity)) return;
  points -= bgData.cost;
  localStorage.setItem("points", points);
  ownedBackgrounds[bgName] = true;
  localStorage.setItem("ownedBackgrounds", JSON.stringify(ownedBackgrounds));
  updateShopDisplays();
  updateBackgroundShop();
}

function setBackground(bgName) {
  if (!ownedBackgrounds[bgName]) return;
  activeBackground = bgName;
  localStorage.setItem("activeBackground", bgName);
  if (bgName === "Rainbow") {
    document.body.style.background = "linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet)";
  } else if (backgroundsPermanent[bgName]) {
    document.body.style.background = backgroundsPermanent[bgName].color;
  } else {
    document.body.style.background = "";
  }
}

function setSeasonalBackground(bgName, color) {
  activeSeasonalBackground = bgName;
  localStorage.setItem("activeSeasonalBackground", bgName);
  document.body.style.background = color;
}

function logHasRarity(requiredRarity) {
  return logData.includes(requiredRarity);
}

function toggleSettingsModal() {
  const modal = document.getElementById("settingsModal");
  modal.style.display = (modal.style.display === "block") ? "none" : "block";
  updateShopDisplays();
  updateBackgroundShop();
  updateStats();
}

function resetGame() {
  if (confirm("Are you sure you want to reset the game? This will clear all progress.")) {
    points = 0;
    localStorage.setItem("points", points);
    autoClickersCount = 0;
    doublePointsActive = false;
    goldenClickReady = false;
    luckBoostActive = false;
    timeFreezeActive = false;
    goldenModeActive = false;
    ownedBackgrounds = {};
    activeBackground = "Light Blue";
    localStorage.removeItem("ownedBackgrounds");
    localStorage.removeItem("activeBackground");
    localStorage.removeItem("logData");
    localStorage.removeItem("totalClicks");
    logData = [];
    totalClicks = 0;
    ownedSeasonalBackgrounds = {};
    localStorage.removeItem("ownedSeasonalBackgrounds");
    activeSeasonalBackground = "";
    localStorage.removeItem("activeSeasonalBackground");
    if (autoInterval) {
      clearInterval(autoInterval);
      autoInterval = null;
    }
    document.getElementById("log").innerHTML = "";
    updateShopDisplays();
    startTime = Date.now();
    localStorage.setItem("startTime", startTime);
    setDefaultBackground();
    updateBackgroundShop();
    updateStats();
  }
}

function setDefaultBackground() {
  if (activeBackground === "Light Blue") {
    document.body.style.background = "#e0f7fa";
  } else if (backgroundsPermanent[activeBackground]) {
    document.body.style.background = backgroundsPermanent[activeBackground].color;
  } else if (activeBackground === "Rainbow") {
    document.body.style.background = "linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet)";
  }
}

/******** Upstage Function ********/
function upstageGame() {
  if (confirm("Upstage? This will reset your rarity log and stats but keep your backgrounds. Shop prices will increase by 50%. Continue?")) {
    logData = [];
    totalClicks = 0;
    localStorage.setItem("logData", JSON.stringify(logData));
    localStorage.setItem("totalClicks", totalClicks);
    shopPriceMultiplier *= 1.5;
    localStorage.setItem("shopPriceMultiplier", shopPriceMultiplier);
    upstageCount++;
    localStorage.setItem("upstageCount", upstageCount);
    updateStats();
    updateShopDisplays();
  }
}

/******** Main Click Button Event Listener ********/
document.getElementById("clickButton").addEventListener("click", function() {
  generateRarity(true);
});
