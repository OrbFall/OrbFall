# Monetization & PWA Implementation Plan

**Project:** Ball Drop Puzzle Game  
**Plan Version:** 1.0  
**Date:** February 2026  
**Estimated Duration:** 3-4 weeks

---

## Executive Summary

This plan outlines the implementation of monetization features (ads and Buy Me a Coffee integration) and Progressive Web App (PWA) functionality for the Ball Drop Puzzle Game. The goal is to create sustainable revenue while maintaining excellent user experience and enabling offline gameplay.

### Core Objectives
1. **Monetization:** Integrate non-intrusive advertising with ad-free periods for supporters
2. **PWA:** Enable installation, offline play, and app-like experience
3. **User Experience:** Maintain fast, smooth gameplay with minimal disruption
4. **FOSS Principles:** Use open-source solutions where possible, maintain transparency

### Architecture Notes
- **100% Client-Side:** No backend server required
- **Service Worker:** Caches assets (files) only, not data
- **Data Storage:** localStorage per-device/browser (no cloud sync in Phase 1)
- **Token Validation:** Client-side HMAC verification (optional server endpoint for stricter validation)
- **Ad Integration:** Third-party scripts only (AdSense)

---

## Phase 1: Project Setup & Configuration (Days 1-2)

### 1.1 Update Project Structure
```
ball-drop-game/
├── manifest.json                    # NEW: PWA manifest
├── service-worker.js                # NEW: Service worker
├── config.json                      # UPDATE: Add monetization config
├── src/
│   ├── modules/
│   │   ├── AdManager.js            # NEW: Ad display logic
│   │   ├── MonetizationManager.js  # NEW: BMAC & ad-free state
│   │   ├── PWAManager.js           # NEW: Install prompts, offline detection
│   │   └── ServiceWorkerManager.js # NEW: SW registration & updates
│   └── utils/
│       └── TokenValidator.js        # NEW: BMAC token validation
└── src/img/
    └── icons/                       # NEW: PWA icons (multiple sizes)
```

### 1.2 Configuration Updates

**Update `config.json`:**
```json
{
  "monetization": {
    "ads": {
      "enabled": true,
      "provider": "adsense",
      "adSenseId": "ca-pub-XXXXXXXXXX",
      "slotIds": {
        "banner": "XXXXXXXXXX",
        "mobileBanner": "XXXXXXXXXX",
        "interstitial": "XXXXXXXXXX",
        "sidebar": "XXXXXXXXXX"
      },
      "displayRules": {
        "interstitialFrequency": 3,
        "levelAdFrequency": 5,
        "interstitialMinInterval": 300000,
        "skipDelay": 5000
      }
    },
    "bmac": {
      "enabled": true,
      "username": "yourusername",
      "buttonText": "☕ Support",
      "tokenValidation": true,
      "validationEndpoint": "",
      "adFreePeriods": {
        "3": 7,
        "5": 30,
        "10": 90
      }
    }
  },
  "pwa": {
    "enabled": true,
    "installPrompt": {
      "enabled": true,
      "triggerDelay": 120000,
      "minGamesPlayed": 3,
      "rePromptDelay": 604800000
    },
    "offlineMode": {
      "enabled": true,
      "showIndicator": true
    }
  }
}
```

### 1.3 Dependencies
- **No external libraries required** (vanilla JS approach)
- **Optional:** Consider AdSense alternatives (Media.net, Carbon Ads, etc.)
- **Testing Tools:** Lighthouse, workbox-cli (for SW debugging)

**Deliverables:**
- ✅ Updated config.json
- ✅ Project structure prepared
- ✅ Icon assets created (use placeholder generator if needed)

---

## Phase 2: PWA Foundation (Days 3-5)

### 2.1 Create Web App Manifest

**Create `manifest.json`:**
```json
{
  "name": "Ball Drop Puzzle Game",
  "short_name": "Ball Drop",
  "description": "Match colored balls in this Tetris-inspired puzzle game with special abilities",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#1a1a1a",
  "theme_color": "#4080FF",
  "orientation": "any",
  "icons": [
    {
      "src": "/src/img/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/src/img/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/src/img/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/src/img/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/src/img/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/src/img/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/src/img/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/src/img/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["games", "entertainment"],
  "shortcuts": [
    {
      "name": "New Game",
      "short_name": "New",
      "description": "Start a new game",
      "url": "/?action=new",
      "icons": [{ "src": "/src/img/icons/icon-96x96.png", "sizes": "96x96" }]
    }
  ]
}
```

**Update `index.html` head:**
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#4080FF">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Ball Drop">
<link rel="apple-touch-icon" href="/src/img/icons/icon-192x192.png">
```

### 2.2 Implement Service Worker

**Purpose:** Cache static assets (HTML, CSS, JS files) for offline gameplay. This is purely client-side - no server sync or data caching needed since all game state is in localStorage.

**Important:** This implementation assumes 100% client-side architecture:
- Service worker caches **files only** (HTML, CSS, JS, images)
- Game data stays in **localStorage** (per-device, per-browser)
- No backend API calls to cache or sync
- Each device/browser is independent

**Create `service-worker.js`:**
```javascript
const CACHE_VERSION = 'ball-drop-v1.0.0';
const CACHE_NAME = `${CACHE_VERSION}`;

// Assets to cache on install (files only, not data - data lives in localStorage)
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/config.json',
  '/src/main.js',
  '/src/styles/main.css',
  '/src/styles/shared-components.css',
  '/src/styles/shared-variables.css',
  // Add all module files
  '/src/modules/GameEngine.js',
  '/src/modules/Grid.js',
  '/src/modules/Piece.js',
  '/src/modules/Ball.js',
  '/src/modules/InputHandler.js',
  '/src/modules/Renderer.js',
  '/src/modules/ScoreManager.js',
  '/src/modules/LevelManager.js',
  '/src/modules/AudioManager.js',
  '/src/modules/ConfigManager.js',
  '/src/modules/PlayerManager.js',
  '/src/modules/PieceFactory.js',
  '/src/modules/FloatingText.js',
  '/src/modules/AnimationManager.js',
  '/src/modules/AnalyticsManager.js',
  '/src/modules/ParticleSystem.js',
  '/src/modules/WeatherBackground.js',
  '/src/modules/StatisticsTracker.js',
  // Add all utility files
  '/src/utils/Constants.js',
  '/src/utils/EventEmitter.js',
  '/src/utils/Helpers.js',
  '/src/utils/DebugMode.js',
  '/src/utils/DOMHelpers.js',
  // Add icons
  '/src/img/icons/icon-192x192.png',
  '/src/img/icons/icon-512x512.png'
];

// Install event: cache core assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching core assets');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Fetch event: serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip ad requests - always fetch from network
  if (request.url.includes('doubleclick.net') || 
      request.url.includes('googlesyndication.com') ||
      request.url.includes('buymeacoffee.com')) {
    return;
  }
  
  // Cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Don't cache if not successful
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }
            
            // Clone the response for caching
            const responseToCache = networkResponse.clone();
            
            // Cache for future use
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
            
            return networkResponse;
          })
          .catch(() => {
            // Network failed, return offline page if available
            if (request.destination === 'document') {
              return caches.match('/');
            }
          });
      })
  );
});
```

### 2.3 Create PWAManager Module

**Create `src/modules/PWAManager.js`:**
```javascript
/**
 * PWAManager.js
 * 
 * Manages Progressive Web App functionality including:
 * - Service worker registration
 * - Install prompt handling
 * - Offline detection
 * - Update notifications
 * 
 * @module PWAManager
 */

export default class PWAManager {
  constructor(config, eventEmitter) {
    this.config = config;
    this.eventEmitter = eventEmitter;
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.isOnline = navigator.onLine;
    
    this.init();
  }
  
  init() {
    // Register service worker
    this.registerServiceWorker();
    
    // Listen for install prompt
    this.setupInstallPrompt();
    
    // Monitor online/offline status
    this.setupOnlineDetection();
    
    // Check if already installed
    this.checkInstallation();
  }
  
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers not supported');
      return;
    }
    
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('[PWA] Service worker registered:', registration.scope);
      
      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            this.eventEmitter.emit('PWA_UPDATE_AVAILABLE');
          }
        });
      });
    } catch (error) {
      console.error('[PWA] Service worker registration failed:', error);
    }
  }
  
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      console.log('[PWA] Install prompt available');
      
      // Trigger install prompt based on config
      if (this.config.pwa?.installPrompt?.enabled) {
        this.scheduleInstallPrompt();
      }
    });
    
    // Track successful installation
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed');
      this.isInstalled = true;
      this.eventEmitter.emit('PWA_INSTALLED');
      this.deferredPrompt = null;
    });
  }
  
  scheduleInstallPrompt() {
    const { triggerDelay, minGamesPlayed, rePromptDelay } = this.config.pwa.installPrompt;
    
    // Check if we should prompt
    const lastPrompt = localStorage.getItem('pwa_last_prompt');
    const now = Date.now();
    
    if (lastPrompt && (now - parseInt(lastPrompt)) < rePromptDelay) {
      console.log('[PWA] Install prompt deferred (too soon)');
      return;
    }
    
    // Wait for trigger conditions
    setTimeout(() => {
      const gamesPlayed = parseInt(localStorage.getItem('stats_games_played') || '0');
      
      if (gamesPlayed >= minGamesPlayed && !this.isInstalled) {
        this.showInstallPrompt();
      }
    }, triggerDelay);
  }
  
  async showInstallPrompt() {
    if (!this.deferredPrompt) {
      console.log('[PWA] No install prompt available');
      return;
    }
    
    // Show the prompt
    this.deferredPrompt.prompt();
    
    // Wait for user response
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log('[PWA] Install prompt outcome:', outcome);
    
    // Store prompt timestamp
    localStorage.setItem('pwa_last_prompt', Date.now().toString());
    
    // Clear the prompt
    this.deferredPrompt = null;
  }
  
  setupOnlineDetection() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.eventEmitter.emit('PWA_ONLINE');
      console.log('[PWA] Online');
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.eventEmitter.emit('PWA_OFFLINE');
      console.log('[PWA] Offline');
    });
  }
  
  checkInstallation() {
    // Check if running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true) {
      this.isInstalled = true;
      console.log('[PWA] Running as installed app');
    }
  }
  
  // Public API
  
  async triggerInstall() {
    return this.showInstallPrompt();
  }
  
  isAppInstalled() {
    return this.isInstalled;
  }
  
  isAppOnline() {
    return this.isOnline;
  }
}
```

**Deliverables:**
- ✅ manifest.json created
- ✅ service-worker.js implemented
- ✅ PWAManager.js module created
- ✅ Icon assets generated
- ✅ index.html updated with PWA meta tags

---

## Phase 3: Monetization - Ad Integration (Days 6-9)

### 3.1 Create AdManager Module

**Create `src/modules/AdManager.js`:**
```javascript
/**
 * AdManager.js
 * 
 * Manages advertisement display and tracking:
 * - Load ad scripts dynamically
 * - Display banner, mobile, sidebar, interstitial ads
 * - Respect ad-free state
 * - Track ad frequency/timing
 * 
 * @module AdManager
 */

export default class AdManager {
  constructor(config, eventEmitter) {
    this.config = config;
    this.eventEmitter = eventEmitter;
    this.adsEnabled = config.monetization?.ads?.enabled || false;
    this.adProvider = config.monetization?.ads?.provider || 'adsense';
    this.lastInterstitialTime = 0;
    this.gameOverCount = 0;
    this.levelCompleteCount = 0;
    
    this.init();
  }
  
  init() {
    if (!this.adsEnabled) {
      console.log('[Ads] Disabled in config');
      return;
    }
    
    // Check ad-free status
    if (this.isAdFree()) {
      console.log('[Ads] Ad-free mode active');
      this.showAdFreeIndicator();
      return;
    }
    
    // Load ad scripts
    this.loadAdScript();
    
    // Setup event listeners
    this.eventEmitter.on('GAME_OVER', () => this.onGameOver());
    this.eventEmitter.on('LEVEL_COMPLETE', () => this.onLevelComplete());
    this.eventEmitter.on('AD_FREE_ACTIVATED', () => this.onAdFreeActivated());
  }
  
  isAdFree() {
    const adFreeUntil = localStorage.getItem('monetization_ad_free_until');
    if (!adFreeUntil) return false;
    
    const expirationTime = parseInt(adFreeUntil);
    const now = Date.now();
    
    if (now < expirationTime) {
      return true;
    } else {
      // Ad-free period expired
      localStorage.removeItem('monetization_ad_free_until');
      return false;
    }
  }
  
  loadAdScript() {
    if (this.adProvider === 'adsense') {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${this.config.monetization.ads.adSenseId}`;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
      
      console.log('[Ads] AdSense script loaded');
    }
  }
  
  displayBannerAd() {
    if (!this.adsEnabled || this.isAdFree()) return;
    
    // Create banner ad container
    const bannerContainer = document.getElementById('banner-ad');
    if (!bannerContainer) return;
    
    // Insert ad code
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', this.config.monetization.ads.adSenseId);
    ins.setAttribute('data-ad-slot', this.config.monetization.ads.slotIds.banner);
    ins.setAttribute('data-ad-format', 'horizontal');
    ins.setAttribute('data-full-width-responsive', 'true');
    
    bannerContainer.appendChild(ins);
    
    // Push ad
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    
    console.log('[Ads] Banner ad displayed');
  }
  
  displaySidebarAd() {
    if (!this.adsEnabled || this.isAdFree()) return;
    
    // Only on desktop
    if (window.innerWidth < 1024) return;
    
    const sidebarContainer = document.getElementById('sidebar-ad');
    if (!sidebarContainer) return;
    
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', this.config.monetization.ads.adSenseId);
    ins.setAttribute('data-ad-slot', this.config.monetization.ads.slotIds.sidebar);
    ins.setAttribute('data-ad-format', 'rectangle');
    
    sidebarContainer.appendChild(ins);
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    
    console.log('[Ads] Sidebar ad displayed');
  }
  
  async displayInterstitial() {
    if (!this.adsEnabled || this.isAdFree()) return;
    
    const { interstitialMinInterval, skipDelay } = this.config.monetization.ads.displayRules;
    const now = Date.now();
    
    // Check minimum interval
    if (now - this.lastInterstitialTime < interstitialMinInterval) {
      console.log('[Ads] Interstitial skipped (too soon)');
      return;
    }
    
    // Show interstitial overlay
    this.showInterstitialOverlay(skipDelay);
    this.lastInterstitialTime = now;
  }
  
  showInterstitialOverlay(skipDelay) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'interstitial-overlay';
    overlay.className = 'interstitial-overlay';
    
    // Skip button (appears after delay)
    const skipButton = document.createElement('button');
    skipButton.className = 'skip-ad-button';
    skipButton.textContent = `Skip in ${skipDelay / 1000}s`;
    skipButton.disabled = true;
    
    let countdown = skipDelay / 1000;
    const timer = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        skipButton.textContent = `Skip in ${countdown}s`;
      } else {
        skipButton.textContent = 'Skip Ad ✕';
        skipButton.disabled = false;
        clearInterval(timer);
      }
    }, 1000);
    
    skipButton.addEventListener('click', () => {
      document.body.removeChild(overlay);
      clearInterval(timer);
    });
    
    // Ad container
    const adContainer = document.createElement('div');
    adContainer.id = 'interstitial-ad';
    adContainer.className = 'interstitial-ad-container';
    
    // Insert AdSense code
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', this.config.monetization.ads.adSenseId);
    ins.setAttribute('data-ad-slot', this.config.monetization.ads.slotIds.interstitial);
    ins.setAttribute('data-ad-format', 'interstitial');
    ins.setAttribute('data-full-width-responsive', 'true');
    
    adContainer.appendChild(ins);
    overlay.appendChild(adContainer);
    overlay.appendChild(skipButton);
    document.body.appendChild(overlay);
    
    // Push ad
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    
    console.log('[Ads] Interstitial displayed');
  }
  
  onGameOver() {
    this.gameOverCount++;
    const { interstitialFrequency } = this.config.monetization.ads.displayRules;
    
    if (this.gameOverCount % interstitialFrequency === 0) {
      this.displayInterstitial();
    }
  }
  
  onLevelComplete() {
    this.levelCompleteCount++;
    const { levelAdFrequency } = this.config.monetization.ads.displayRules;
    
    if (this.levelCompleteCount % levelAdFrequency === 0) {
      this.displayInterstitial();
    }
  }
  
  onAdFreeActivated() {
    // Remove all existing ads
    document.querySelectorAll('.adsbygoogle').forEach(ad => ad.remove());
    document.querySelectorAll('#banner-ad, #sidebar-ad').forEach(container => {
      container.innerHTML = '';
    });
    
    this.showAdFreeIndicator();
    console.log('[Ads] All ads removed (ad-free activated)');
  }
  
  showAdFreeIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'ad-free-badge';
    indicator.innerHTML = '✨ Ad-Free Mode';
    
    // Add to HUD
    const hud = document.querySelector('.hud');
    if (hud) {
      hud.appendChild(indicator);
    }
  }
}
```

### 3.2 Update HTML for Ad Containers

**Update `index.html`:**
```html
<!-- Add ad containers -->
<div id="banner-ad" class="ad-container banner-ad"></div>

<div class="game-container">
  <!-- Existing game content -->
</div>

<div id="sidebar-ad" class="ad-container sidebar-ad"></div>
```

### 3.3 Add Ad Styles

**Update `src/styles/main.css`:**
```css
/* Ad Containers */
.ad-container {
  margin: 10px auto;
  text-align: center;
  min-height: 50px;
}

.banner-ad {
  max-width: 728px;
}

.sidebar-ad {
  position: fixed;
  top: 100px;
  right: 20px;
  width: 300px;
  display: none;
}

@media (min-width: 1400px) {
  .sidebar-ad {
    display: block;
  }
}

/* Interstitial Overlay */
.interstitial-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.interstitial-ad-container {
  max-width: 90%;
  max-height: 80%;
  background: white;
  padding: 20px;
  border-radius: 8px;
}

.skip-ad-button {
  margin-top: 20px;
  padding: 12px 24px;
  font-size: 16px;
  background: #4080FF;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.skip-ad-button:disabled {
  background: #666;
  cursor: not-allowed;
}

/* Ad-Free Badge */
.ad-free-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #1a1a1a;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(255, 215, 0, 0.3);
}
```

**Deliverables:**
- ✅ AdManager.js module created
- ✅ Ad containers added to HTML
- ✅ Ad styles implemented
- ✅ Interstitial logic complete
- ✅ Ad-free state checking

---

## Phase 4: Monetization - Buy Me a Coffee (Days 10-12)

### 4.1 Create MonetizationManager Module

**Create `src/modules/MonetizationManager.js`:**
```javascript
/**
 * MonetizationManager.js
 * 
 * Manages Buy Me a Coffee integration and ad-free state:
 * - BMAC widget integration
 * - Token redemption
 * - Ad-free period management
 * - Supporter benefits
 * 
 * @module MonetizationManager
 */

export default class MonetizationManager {
  constructor(config, eventEmitter) {
    this.config = config;
    this.eventEmitter = eventEmitter;
    this.bmacEnabled = config.monetization?.bmac?.enabled || false;
    this.bmacUsername = config.monetization?.bmac?.username || '';
    
    this.init();
  }
  
  init() {
    if (!this.bmacEnabled) {
      console.log('[BMAC] Disabled in config');
      return;
    }
    
    // Add BMAC button to UI
    this.addBMACButton();
    
    // Check current ad-free status
    this.checkAdFreeStatus();
  }
  
  addBMACButton() {
    // Create floating support button
    const button = document.createElement('a');
    button.href = `https://www.buymeacoffee.com/${this.bmacUsername}`;
    button.target = '_blank';
    button.rel = 'noopener noreferrer';
    button.className = 'bmac-button';
    button.innerHTML = this.config.monetization.bmac.buttonText;
    
    document.body.appendChild(button);
    
    console.log('[BMAC] Support button added');
  }
  
  checkAdFreeStatus() {
    const adFreeUntil = localStorage.getItem('monetization_ad_free_until');
    if (!adFreeUntil) return;
    
    const expirationTime = parseInt(adFreeUntil);
    const now = Date.now();
    
    if (now < expirationTime) {
      const daysRemaining = Math.ceil((expirationTime - now) / (1000 * 60 * 60 * 24));
      console.log(`[BMAC] Ad-free for ${daysRemaining} more days`);
      
      // Warn if expiring soon (3 days)
      if (daysRemaining <= 3) {
        this.showExpirationWarning(daysRemaining);
      }
    }
  }
  
  showRedeemDialog() {
    // Create modal dialog
    const modal = document.createElement('div');
    modal.className = 'bmac-modal';
    
    modal.innerHTML = `
      <div class="bmac-modal-content">
        <h2>Redeem Support Code</h2>
        <p>Thank you for supporting the development! Enter your code below to activate ad-free mode.</p>
        
        <input type="text" id="bmac-token-input" placeholder="BMAC-XXX-XXXXX-XXXX" />
        
        <div class="bmac-modal-actions">
          <button id="bmac-redeem-btn" class="btn-primary">Redeem</button>
          <button id="bmac-cancel-btn" class="btn-secondary">Cancel</button>
        </div>
        
        <div id="bmac-error" class="bmac-error"></div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    document.getElementById('bmac-redeem-btn').addEventListener('click', () => {
      const token = document.getElementById('bmac-token-input').value.trim();
      this.redeemToken(token);
    });
    
    document.getElementById('bmac-cancel-btn').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
  }
  
  async redeemToken(token) {
    if (!token) {
      this.showError('Please enter a token');
      return;
    }
    
    // Validate token format
    if (!token.startsWith('BMAC-')) {
      this.showError('Invalid token format');
      return;
    }
    
    try {
      // Parse token (format: BMAC-[amount]-[timestamp]-[signature])
      const parts = token.split('-');
      if (parts.length !== 4) {
        throw new Error('Invalid token structure');
      }
      
      const amount = parseInt(parts[1]);
      const timestamp = parseInt(parts[2]);
      const signature = parts[3];
      
      // Validate token (if validation enabled)
      if (this.config.monetization.bmac.tokenValidation) {
        const isValid = await this.validateToken(token, amount, timestamp, signature);
        if (!isValid) {
          throw new Error('Token validation failed');
        }
      }
      
      // Calculate ad-free duration
      const days = this.calculateAdFreeDays(amount);
      
      // Activate ad-free mode
      this.activateAdFree(days, token);
      
    } catch (error) {
      console.error('[BMAC] Token redemption failed:', error);
      this.showError('Invalid or expired token');
    }
  }
  
  async validateToken(token, amount, timestamp, signature) {
    // If validation endpoint provided, verify with server
    if (this.config.monetization.bmac.validationEndpoint) {
      try {
        const response = await fetch(this.config.monetization.bmac.validationEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, amount, timestamp, signature })
        });
        
        const result = await response.json();
        return result.valid === true;
      } catch (error) {
        console.error('[BMAC] Validation request failed:', error);
        return false;
      }
    }
    
    // Client-side validation (basic checks)
    const now = Date.now();
    const tokenAge = now - timestamp;
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    
    // Token must be less than 1 year old
    if (tokenAge > oneYear) {
      return false;
    }
    
    // Check if token already used
    const usedTokens = JSON.parse(localStorage.getItem('monetization_used_tokens') || '[]');
    if (usedTokens.includes(token)) {
      return false;
    }
    
    return true;
  }
  
  calculateAdFreeDays(amount) {
    const periods = this.config.monetization.bmac.adFreePeriods;
    
    // Find matching tier
    const amounts = Object.keys(periods).map(Number).sort((a, b) => b - a);
    for (const tierAmount of amounts) {
      if (amount >= tierAmount) {
        return periods[tierAmount];
      }
    }
    
    // Default: 1 day per dollar
    return Math.max(1, Math.floor(amount));
  }
  
  activateAdFree(days, token) {
    const now = Date.now();
    const duration = days * 24 * 60 * 60 * 1000;
    const expirationTime = now + duration;
    
    // Store expiration
    localStorage.setItem('monetization_ad_free_until', expirationTime.toString());
    
    // Mark token as used
    const usedTokens = JSON.parse(localStorage.getItem('monetization_used_tokens') || '[]');
    usedTokens.push(token);
    localStorage.setItem('monetization_used_tokens', JSON.stringify(usedTokens));
    
    // Emit event
    this.eventEmitter.emit('AD_FREE_ACTIVATED', { days, expirationTime });
    
    // Show confirmation
    this.showConfirmation(days);
    
    // Close modal
    const modal = document.querySelector('.bmac-modal');
    if (modal) {
      document.body.removeChild(modal);
    }
    
    console.log(`[BMAC] Ad-free activated for ${days} days`);
  }
  
  showConfirmation(days) {
    const expirationDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const dateString = expirationDate.toLocaleDateString();
    
    alert(`✅ Thank you for your support!\n\nAds disabled until ${dateString}\n(${days} days)`);
  }
  
  showError(message) {
    const errorDiv = document.getElementById('bmac-error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  }
  
  showExpirationWarning(daysRemaining) {
    // Could show a notification or banner
    console.log(`[BMAC] Ad-free expires in ${daysRemaining} days`);
  }
  
  // Public API
  
  openRedeemDialog() {
    this.showRedeemDialog();
  }
  
  getAdFreeStatus() {
    const adFreeUntil = localStorage.getItem('monetization_ad_free_until');
    if (!adFreeUntil) return null;
    
    const expirationTime = parseInt(adFreeUntil);
    const now = Date.now();
    
    if (now < expirationTime) {
      return {
        active: true,
        expiresAt: expirationTime,
        daysRemaining: Math.ceil((expirationTime - now) / (1000 * 60 * 60 * 24))
      };
    }
    
    return null;
  }
}
```

### 4.2 Add BMAC Styles

**Update `src/styles/main.css`:**
```css
/* Buy Me a Coffee Button */
.bmac-button {
  position: fixed;
  top: 20px;
  right: 20px;
  background: linear-gradient(135deg, #FFDD00, #FBB034);
  color: #000;
  padding: 10px 20px;
  border-radius: 25px;
  text-decoration: none;
  font-weight: bold;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(251, 176, 52, 0.3);
  z-index: 1000;
  transition: transform 0.2s, box-shadow 0.2s;
}

.bmac-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(251, 176, 52, 0.5);
}

/* BMAC Modal */
.bmac-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.bmac-modal-content {
  background: #2a2a2a;
  padding: 30px;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  color: white;
}

.bmac-modal-content h2 {
  margin-top: 0;
  color: #FFDD00;
}

.bmac-modal-content input {
  width: 100%;
  padding: 12px;
  margin: 15px 0;
  border: 2px solid #4080FF;
  border-radius: 6px;
  background: #1a1a1a;
  color: white;
  font-size: 16px;
  font-family: monospace;
}

.bmac-modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.btn-primary, .btn-secondary {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-primary {
  background: #4080FF;
  color: white;
}

.btn-secondary {
  background: #666;
  color: white;
}

.btn-primary:hover, .btn-secondary:hover {
  opacity: 0.8;
}

.bmac-error {
  display: none;
  color: #ff4444;
  margin-top: 10px;
  font-size: 14px;
}
```

### 4.3 Add Redeem Option to Settings

Update settings menu to include "Redeem Support Code" button that calls `monetizationManager.openRedeemDialog()`.

**Deliverables:**
- ✅ MonetizationManager.js module created (migrated to LemonSqueezy)
- ✅ "Go Ad-Free" purchase button integrated
- ✅ License key activation dialog implemented
- ✅ Ad-free state management working (license-based, perpetual)
- ✅ Supporter styles added

---

## Phase 5: Token Generation Utility (Days 13-14) — CANCELLED

> **This phase is no longer required.** The original plan used a custom BMAC token
> system (HMAC-signed tokens, manual generation script, optional validation server).
> We migrated to **LemonSqueezy**, which handles license key generation, delivery,
> and validation natively via its API. No custom tooling needed.

### 5.1 Create Token Generator Tool

**Create `tools/generate-bmac-token.js`:**
```javascript
/**
 * BMAC Token Generator
 * 
 * Generates redemption tokens for Buy Me a Coffee supporters.
 * Run with: node tools/generate-bmac-token.js [amount]
 * 
 * Format: BMAC-[amount]-[timestamp]-[signature]
 */

const crypto = require('crypto');

// SECRET KEY - Store securely, never commit to repo
const SECRET_KEY = process.env.BMAC_SECRET || 'CHANGE_ME_IN_PRODUCTION';

function generateToken(amount) {
  amount = parseInt(amount);
  if (!amount || amount < 1) {
    console.error('Error: Amount must be a positive number');
    process.exit(1);
  }
  
  const timestamp = Date.now();
  const data = `${amount}-${timestamp}`;
  
  // Generate HMAC signature
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(data);
  const signature = hmac.digest('hex').substring(0, 8);
  
  const token = `BMAC-${amount}-${timestamp}-${signature}`;
  
  return {
    token,
    amount,
    timestamp,
    createdAt: new Date(timestamp).toISOString()
  };
}

// CLI usage
if (require.main === module) {
  const amount = process.argv[2];
  
  if (!amount) {
    console.log('Usage: node generate-bmac-token.js [amount]');
    console.log('Example: node generate-bmac-token.js 5');
    process.exit(1);
  }
  
  const result = generateToken(amount);
  
  console.log('\n✅ Token Generated Successfully!\n');
  console.log(`Amount: $${result.amount}`);
  console.log(`Created: ${result.createdAt}`);
  console.log(`\nToken:\n${result.token}\n`);
  console.log('Send this token to the supporter after confirming their donation.\n');
}

module.exports = { generateToken };
```

### 5.2 Token Validator (Optional Server)

**Create `tools/validate-token-server.js`:**
```javascript
/**
 * Simple token validation server (optional)
 * Run with: node tools/validate-token-server.js
 */

const http = require('http');
const crypto = require('crypto');

const SECRET_KEY = process.env.BMAC_SECRET || 'CHANGE_ME_IN_PRODUCTION';
const PORT = process.env.PORT || 3000;

function validateToken(token, amount, timestamp, signature) {
  // Recreate signature
  const data = `${amount}-${timestamp}`;
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(data);
  const expectedSignature = hmac.digest('hex').substring(0, 8);
  
  return signature === expectedSignature;
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.method === 'POST' && req.url === '/validate') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const { token, amount, timestamp, signature } = JSON.parse(body);
        const isValid = validateToken(token, amount, timestamp, signature);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ valid: isValid }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Token validation server running on port ${PORT}`);
});
```

**Deliverables:**
- ~~Token generator tool created~~ (N/A — LemonSqueezy handles this)
- ~~Optional validation server ready~~ (N/A — LemonSqueezy handles this)
- ~~Documentation for token generation process~~ (N/A)

---

## Phase 6: Integration & UI Updates (Days 15-17)

### 6.1 Update main.js

**Update `src/main.js`:**
```javascript
import PWAManager from './modules/PWAManager.js';
import AdManager from './modules/AdManager.js';
import MonetizationManager from './modules/MonetizationManager.js';

// Add to initialization
const pwaManager = new PWAManager(config, eventEmitter);
const adManager = new AdManager(config, eventEmitter);
const monetizationManager = new MonetizationManager(config, eventEmitter);

// Make available globally for UI interactions
window.pwaManager = pwaManager;
window.monetizationManager = monetizationManager;
```

### 6.2 Update Settings Menu

Add new settings options:
- **Install App** button (calls `pwaManager.triggerInstall()`)
- **Activate License Key** button (calls `MonetizationManager.showActivateDialog()`)
- **Support Development** link (opens LemonSqueezy store page)
- **Ad-Free Status** display (if active)

### 6.3 Update HUD

Add elements:
- Ad-free badge (when active)
- Offline indicator (when offline)
- PWA install prompt (when applicable)

### 6.4 Responsive Design

Ensure all new elements work well on:
- Desktop (1920×1080+)
- Tablet (768×1024)
- Mobile (375×667, 414×896)

**Deliverables:**
- ✅ All modules integrated into main.js
- ✅ Settings menu updated
- ✅ HUD elements added
- ✅ Responsive design verified

---

## Phase 7: Testing & Quality Assurance (Days 18-20)

### 7.1 PWA Testing

**Lighthouse Audit:**
- [ ] PWA score: 100%
- [ ] Performance score: 90%+
- [ ] Accessibility score: 100%
- [ ] Best Practices score: 100%
- [ ] SEO score: 100%

**Manual Testing:**
- [ ] Service worker registers successfully
- [ ] Assets cached correctly
- [ ] Offline mode works
- [ ] Install prompt appears
- [ ] App installs on Chrome (desktop)
- [ ] App installs on Chrome (Android)
- [ ] App icon displays correctly
- [ ] Splash screen shows on launch
- [ ] Updates detected and applied

### 7.2 Ad Testing

- [ ] Banner ads display correctly
- [ ] Sidebar ads display on desktop only
- [ ] Interstitial ads show at correct frequency
- [ ] Skip button works after delay
- [ ] Ads don't interfere with gameplay
- [ ] Ads removed when ad-free active
- [ ] Ad containers hidden when offline

### 7.3 Monetization Testing

- [ ] BMAC button visible and functional
- [ ] Redeem dialog opens correctly
- [ ] Token validation works
- [ ] Valid tokens activate ad-free mode
- [ ] Invalid tokens show error
- [ ] Ad-free expiration calculated correctly
- [ ] Ad-free badge displays
- [ ] Ads resume after expiration

### 7.4 Cross-Browser Testing

- [ ] Chrome (desktop/mobile)
- [ ] Edge (desktop)
- [ ] Brave (desktop/mobile)
- [ ] Opera (desktop)

### 7.5 Performance Testing

- [ ] Initial load time < 3s
- [ ] Service worker install < 2s
- [ ] No performance impact from ad scripts
- [ ] Smooth gameplay maintained (60fps)

**Deliverables:**
- ✅ All tests passed
- ✅ Issues documented and fixed
- ✅ Performance benchmarks met

---

## Phase 8: Documentation & Deployment (Days 21-22)

### 8.1 Update Documentation

**Update README.md:**
- Add PWA installation instructions
- Add monetization information
- Add offline play details

**Create docs/MONETIZATION_GUIDE.md:**
- How to support the project
- Token redemption process
- Ad-free benefits

**Create docs/PWA_GUIDE.md:**
- Installation steps for different browsers
- Offline functionality explanation
- Update process

### 8.2 Deployment Preparation

**HTTPS Hosting Options:**
- GitHub Pages (free, HTTPS)
- Netlify (free tier, HTTPS)
- Vercel (free tier, HTTPS)
- Cloudflare Pages (free, HTTPS)

**Pre-Deployment Checklist:**
- [ ] All sensitive keys removed from code
- [ ] Config.json defaults set correctly
- [ ] AdSense account configured
- [ ] BMAC username set
- [ ] Service worker version updated
- [ ] Icons generated and optimized
- [ ] manifest.json URLs updated for production

### 8.3 Deploy

1. Configure chosen hosting platform
2. Set up HTTPS
3. Deploy application
4. Test live version
5. Submit to AdSense (if using)
6. Monitor for 48 hours

**Deliverables:**
- ✅ Documentation complete
- ✅ Application deployed
- ✅ HTTPS working
- ✅ PWA installable
- ✅ Ads serving (if approved)

---

## Post-Launch Monitoring (Week 4+)

### Week 1 Metrics
- Install rate
- Ad impressions
- Ad click-through rate
- BMAC donations
- Token redemptions
- Offline usage

### Ongoing Maintenance
- Monitor service worker updates
- Track ad performance
- Process BMAC donations
- Generate tokens for supporters
- Respond to user feedback
- Fix bugs as reported

---

## Risk Management

### Potential Issues & Solutions

**1. AdSense Approval Delays**
- **Risk:** AdSense takes 1-2 weeks to approve
- **Solution:** Implement with test ads first, deploy with option to disable ads

**2. Service Worker Caching Issues**
- **Risk:** Users stuck on old version
- **Solution:** Implement versioning and update notifications

**3. Token Abuse**
- **Risk:** Tokens shared or reused
- **Solution:** Single-use tokens, signature validation, optional server validation

**4. LocalStorage Data Loss**
- **Risk:** Browser data clearing loses all progress/scores
- **Solution:** Clear warnings in UI, export/import save data feature (future), educate users to not clear site data

**5. PWA Install Rates Low**
- **Risk:** Users don't install
- **Solution:** A/B test install prompts, educate on benefits

---

## Success Criteria

### MVP Success (End of Phase 8)
- ✅ PWA installable on Chrome desktop/mobile
- ✅ Offline gameplay functional (assets cached via service worker)
- ✅ LocalStorage saves working (per-device, no cloud sync in Phase 1)
- ✅ Ads displaying (or test ads if pending approval)
- ✅ BMAC integration working
- ✅ Token system functional
- ✅ Ad-free mode activating correctly
- ✅ Lighthouse PWA score 100%

### 30-Day Success
- 100+ installs
- 10+ BMAC donations
- $50+ ad revenue
- < 5 critical bugs
- 90%+ positive feedback

### 90-Day Success
- 500+ installs
- 50+ BMAC donations
- $200+ ad revenue
- Feature parity across all browsers
- Stable performance with no major issues

---

## Future Enhancements (Beyond Scope)

### Phase 2 Features
- Cloud high score sync
- User accounts (optional)
- Leaderboards
- Social sharing
- Push notifications
- Achievements system
- Custom themes for supporters
- Exclusive game modes for supporters

### Advanced Monetization
- Multiple ad networks (fallback)
- Subscription model
- Merchandise store
- Tournament entry fees
- Premium themes/skins

---

**Plan Status:** Ready for Implementation  
**Next Steps:** Begin Phase 1 - Project Setup & Configuration
