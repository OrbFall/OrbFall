/**
 * ============================================================================
 * service-worker.js - Orb•Fall: ChromaCrush
 * ============================================================================
 * Copyright (c) 2025 G. Scott Tomlin. All Rights Reserved.
 *
 * Caches all static game assets for offline play.
 * Strategy: Cache-first for same-origin GET requests.
 * External requests (analytics, weather, ads) always go to the network.
 *
 * Update the CACHE_VERSION string to bust the cache on new deployments.
 * ============================================================================
 */

const CACHE_VERSION = 'orbfall-v1.0.52';
const CACHE_NAME = CACHE_VERSION;

/**
 * All static game assets to pre-cache on install.
 * Every file listed here will be fetched and cached before the SW activates.
 */
const CORE_ASSETS = [
	'/',
	'/index.html',
	'/guide.html',
	'/privacy.html',
	'/config.json',
	'/manifest.json',
	'/ads.txt',

	// Styles
	'/src/styles/main.css',
	'/src/styles/shared-components.css',
	'/src/styles/shared-variables.css',
	'/src/styles/static-pages.css',

	// Main entry
	'/src/main.js',

	// Modules
	'/src/modules/AdManager.js',
	'/src/modules/AnalyticsManager.js',
	'/src/modules/AnimationManager.js',
	'/src/modules/AudioManager.js',
	'/src/modules/Ball.js',
	'/src/modules/ConfigManager.js',
	'/src/modules/FloatingText.js',
	'/src/modules/GameEngine.js',
	'/src/modules/Grid.js',
	'/src/modules/HintManager.js',
	'/src/modules/InputHandler.js',
	'/src/modules/LevelManager.js',
	'/src/modules/MissionManager.js',
	'/src/modules/MonetizationManager.js',
	'/src/modules/ParticleSystem.js',
	'/src/modules/Piece.js',
	'/src/modules/PieceFactory.js',
	'/src/modules/PlayerManager.js',
	'/src/modules/PuzzleManager.js',
	'/src/modules/PWAManager.js',
	'/src/modules/Renderer.js',
	'/src/modules/ScoreManager.js',
	'/src/modules/ShareManager.js',
	'/src/modules/GoalManager.js',
	'/src/modules/StatisticsTracker.js',
	'/src/modules/WeatherBackground.js',

	// Utils
	'/src/utils/Constants.js',
	'/src/utils/DebugMode.js',
	'/src/utils/DOMHelpers.js',
	'/src/utils/EventEmitter.js',
	'/src/utils/Helpers.js',

	// Config
	'/src/config/analytics.config.js',

	// Images
	'/src/img/icon-192.png',
	'/src/img/icon-192-maskable.png',
	'/src/img/icon-512.png',
	'/src/img/icon-512-maskable.png',
	'/src/img/Logotrans.png',
	'/src/img/GSTTrans.png',
	'/src/img/GSTTransSm.png',
	'/src/img/logo1.png'
];

/**
 * Install: pre-cache all core assets.
 * Individual failures are warned but do not abort the install so a single
 * missing optional asset cannot prevent offline play.
 */
self.addEventListener('install', (event) => {
	console.log('[ServiceWorker] Installing:', CACHE_NAME);

	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			const cacheAll = CORE_ASSETS.map((asset) => {
				return cache.add(asset).catch((err) => {
					console.warn('[ServiceWorker] Failed to cache asset:', asset, err);
				});
			});

			return Promise.all(cacheAll);
		}).then(() => {
			// Take control immediately without waiting for old tabs to close.
			return self.skipWaiting();
		})
	);
});

/**
 * Activate: delete any caches from previous versions.
 */
self.addEventListener('activate', (event) => {
	console.log('[ServiceWorker] Activating:', CACHE_NAME);

	event.waitUntil(
		caches.keys().then((cacheNames) => {
			const deletions = cacheNames.map((name) => {
				if (name !== CACHE_NAME) {
					console.log('[ServiceWorker] Deleting old cache:', name);
					return caches.delete(name);
				}
			});

			return Promise.all(deletions);
		}).then(() => {
			// Claim all open clients immediately
			return self.clients.claim();
		})
	);
});

/**
 * Fetch: cache-first strategy for same-origin GET requests only.
 * All cross-origin requests (weather API, analytics, ads, LemonSqueezy)
 * are passed through unmodified — we never intercept them.
 */
self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Only handle same-origin GET requests
	const isSameOrigin = url.origin === self.location.origin;
	const isGetRequest = request.method === 'GET';

	if (!isSameOrigin || !isGetRequest) {
		return;
	}

	event.respondWith(
		caches.match(request).then((cachedResponse) => {
			// Return cached version immediately
			if (cachedResponse) {
				return cachedResponse;
			}

			// Not in cache — fetch from network and cache for next time
			return fetch(request).then((networkResponse) => {
				// Only cache successful, non-opaque responses
				if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
					return networkResponse;
				}

				// Clone before consuming — a Response body can only be read once
				const responseToCache = networkResponse.clone();
				caches.open(CACHE_NAME).then((cache) => {
					cache.put(request, responseToCache);
				});

				return networkResponse;
			}).catch(() => {
				// Network failed and no cache hit — return index.html for navigation requests
				// so the app shell still loads
				if (request.destination === 'document') {
					return caches.match('/index.html');
				}
			});
		})
	);
});
