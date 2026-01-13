
const soundFiles = [
  "21.mp3", "67.mp3", "adultscheer.mp3", "airhorn.mp3", "amogus.mp3", 
  "apple.mp3", "applepay.mp3", "awww.mp3", "bababoi.mp3", "bone.mp3", 
  "boom.mp3", "br_br_patapim.mp3", "brainfart.mp3", "brainrot-song.mp3", 
  "bruh.mp3", "burgerking.mp3", "butttwin.mp3", "caseohburgerking.mp3", 
  "catlaugh.mp3", "cheer.mp3", "chickenroyale.mp3", "chingchong.mp3", 
  "clashroyale.mp3", "coming.mp3", "crack.mp3", "diddyblud.mp3", 
  "ding.mp3", "dingdong.mp3", "dingdong2.mp3", "discord.mp3", 
  "dogsniff.mp3", "dun.mp3", "eagle.mp3", "eardrumwhopper.mp3", 
  "electriczoo.mp3", "emotionaldamage.mp3", "fah.mp3", "fart.mp3", 
  "fears.mp3", "fish.mp3", "gay.mp3", "geda.mp3", "genalpha.mp3", 
  "getout.mp3", "goku.mp3", "gotye.mp3", "gulp.mp3", "gyat.mp3", 
  "heartbreak.mp3", "heaven.mp3", "helicopter.mp3", "hellnaw.mp3", 
  "hellothere.mp3", "hogrider.mp3", "homeless.mp3", "hub.mp3", 
  "huh.mp3", "idiot.mp3", "ihaten.mp3", "imspongebob.mp3", 
  "incorrect.mp3", "india.mp3", "jet2.mp3", "johncena.mp3", 
  "kachow.mp3", "kafutilaugh.mp3", "krustykrab.mp3", "linging.mp3", 
  "lizard.mp3", "mariojump.mp3", "metalpipe.mp3", "mexicoahh.mp3", 
  "mid.mp3", "moan.mp3", "mustard.mp3", "nono.mp3", "ohio.mp3", 
  "ohmygod.mp3", "ohyes.mp3", "oof.mp3", "pew.mp3", "piano/sample.wav", 
  "pluh.mp3", "prowler.mp3", "punch.mp3", "quack.mp3", "redbull.mp3", 
  "rickroll.mp3", "samsung.mp3", "samsungremix.mp3", "saxy.mp3", 
  "scream.mp3", "sniffsniff.mp3", "sodapop.mp3", "soulmate.mp3", 
  "spinningcat.mp3", "spongebob.mp3", "squidward.mp3", "subway.mp3", 
  "taco.mp3", "thomas.mp3", "toddler.mp3", "toxicroyale.mp3", 
  "uwu.mp3", "uwuburp.mp3", "uwuvomit.mp3", "violin.mp3", 
  "weird.mp3", "whatthehell.mp3", "wiisports.mp3", "wow.mp3", 
  "wtf.mp3", "yahaha.mp3", "yippee.mp3"
];

// Register main Service Worker (analytics-sw.js handles everything)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/analytics-sw.js')
    .then(reg => console.log('Main SW registered', reg))
    .catch(err => console.error('SW failed', err));
}

async function downloadAllSounds() {
  const statusDiv = document.getElementById('download-status');
  if (statusDiv) statusDiv.textContent = "Starting caching...";

  try {
    const cache = await caches.open('soundboard-v1');
    const total = soundFiles.length;
    let count = 0;

    // Add critical assets first
    const criticalAssets = [
        '/CODE/sound/index.html',
        '/CODE/sound/offline-downloader.js',
        '/CODE/sound/background.html',
        '/CODE/sound/upload.html'
    ];
    
    for (const asset of criticalAssets) {
        try {
            const response = await fetch(asset);
            if (response.ok) {
                await cache.put(asset, response);
            }
        } catch (e) {
            console.error(`Failed to cache ${asset}`, e);
        }
    }

    for (const file of soundFiles) {
        try {
            const url = '/CODE/sound/' + file;
            const response = await fetch(url);
            if (response.ok) {
                // Store with the pathname as key so service worker can find it
                await cache.put(url, response.clone());
                count++;
                if (statusDiv) statusDiv.textContent = `Caching: ${count}/${total}`;
            } else {
                console.error(`Failed to fetch ${file}: ${response.status}`);
            }
        } catch (e) {
            console.error(`Failed to cache ${file}`, e);
        }
    }

    if (statusDiv) statusDiv.textContent = "Caching complete! Available offline.";
    setTimeout(() => {
        if (statusDiv) statusDiv.textContent = "";
    }, 3000);

  } catch (error) {
    console.error("Caching failed:", error);
    if (statusDiv) statusDiv.textContent = "Caching failed. Check console.";
  }
}

// Expose function globally
window.downloadAllSounds = downloadAllSounds;
