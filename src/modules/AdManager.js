/**
 * ============================================================================
 * AdManager.js - Orb•Fall: ChromaCrush
 * ============================================================================
 * Copyright (c) 2025 G. Scott Tomlin. All Rights Reserved.
 *
 * Manages non-intrusive advertisement display:
 * - Loads ad scripts dynamically
 * - Displays interstitial ads at natural breaks only
 * - Respects ad-free state via localStorage
 * - Enforces frequency caps and minimum intervals
 * - Skip button after configurable delay (max 5s per constitution)
 *
 * Constitution compliance:
 * - No ads during active gameplay
 * - Interstitials only at natural breaks (game over, level complete)
 * - Frequency caps enforced
 * - Skip option after 5 seconds maximum
 * - No audio ads without user initiation
 *
 * @module AdManager
 * ============================================================================
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { CONSTANTS } from '../utils/Constants.js';
import { ConfigManager } from './ConfigManager.js';
import { SubscriptionSet } from '../utils/SubscriptionSet.js';
import { HouseAdManager } from './HouseAdManager.js';

/**
 * @typedef {Object} AdDisplayRules
 * @property {number} interstitialFrequency - Show interstitial every N game overs
 * @property {number} levelAdFrequency - Show interstitial every N level completes
 * @property {number} interstitialMinInterval - Minimum ms between interstitials
 * @property {number} skipDelay - Delay in ms before skip button is enabled
 */

class AdManagerClass {

	constructor() {
		/** @type {boolean} */
		this.adsEnabled = false;
		/** @type {string} */
		this.adProvider = 'adsense';
		/** @type {number} */
		this.lastInterstitialTime = 0;
		/** @type {number} */
		this.gameOverCount = 0;
		/** @type {number} */
		this.levelCompleteCount = 0;
		/** @type {boolean} */
		this.scriptLoaded = false;
		/** @type {boolean} */
		this.initialized = false;
		this._subs = new SubscriptionSet();

		this._boundOnGameOver = () => this._onGameOver();
		this._boundOnLevelComplete = () => this._onLevelComplete();
		this._boundOnAdFreeActivated = () => this._onAdFreeActivated();
	}

	/**
	 * Initialize the ad manager with config settings
	 * @returns {void}
	 */
	initialize() {
		this._subs.clear();
		const adsConfig = ConfigManager.get('monetization.ads', null);

		if (!adsConfig || !adsConfig.enabled) {
			this.adsEnabled = false;
			return;
		}

		this.adsEnabled = true;
		this.adProvider = adsConfig.provider || 'adsense';

		if (this.isAdFree()) {
			this.adsEnabled = false;
			return;
		}

		// House-ads-only mode: skip AdSense script but still wire up event
		// listeners so frequency caps and cooldowns function normally.
		const houseOnly = ConfigManager.get('monetization.houseAds.onlyHouseAds', false);
		if (!houseOnly) {
			this.loadAdScript();
		}
		this._setupEventListeners();
		this.initialized = true;
	}

	/**
	 * Check if user has an active ad-free period
	 * @returns {boolean}
	 */
	isAdFree() {
		const adFreeUntil = localStorage.getItem(CONSTANTS.STORAGE_KEYS.MONETIZATION_AD_FREE);
		if (!adFreeUntil) return false;

		const expirationTime = parseInt(adFreeUntil);
		if (Date.now() < expirationTime) {
			return true;
		}

		// Expired - clean up
			localStorage.removeItem(CONSTANTS.STORAGE_KEYS.MONETIZATION_AD_FREE);
		return false;
	}

	/**
	 * Load the ad provider script dynamically
	 * @returns {void}
	 */
	loadAdScript() {
		if (this.scriptLoaded) return;

		const provider = ConfigManager.get('monetization.ads.provider', 'adcash');

		if (provider === 'adcash') {
			// aclib.js is loaded via <script> in index.html.
			// Mark as loaded so runAutoTag calls work immediately.
			this.scriptLoaded = true;
			return;
		}

		// Legacy: adSenseId-based providers
		const adSenseId = ConfigManager.get('monetization.ads.adSenseId', '');
		if (!adSenseId) return;
		this.scriptLoaded = true;
	}

	/**
	 * Set up event listeners for game events
	 * @private
	 * @returns {void}
	 */
	_setupEventListeners() {
		this._subs.replace(EventEmitter, {
			[CONSTANTS.EVENTS.GAME_OVER]: this._boundOnGameOver,
			[CONSTANTS.EVENTS.LEVEL_COMPLETE]: this._boundOnLevelComplete,
			[CONSTANTS.EVENTS.AD_FREE_ACTIVATED]: this._boundOnAdFreeActivated,
		});
	}

	/**
	 * Handle game over event - show interstitial based on frequency
	 * @private
	 * @returns {void}
	 */
	_onGameOver() {
		this.gameOverCount++;
		const frequency = ConfigManager.get('monetization.ads.displayRules.interstitialFrequency', 3);

		if (this.gameOverCount % frequency === 0) {
			this.showInterstitial();
		}
	}

	/**
	 * Handle level complete event - show interstitial based on frequency
	 * @private
	 * @returns {void}
	 */
	_onLevelComplete() {
		this.levelCompleteCount++;
		const frequency = ConfigManager.get('monetization.ads.displayRules.levelAdFrequency', 5);

		if (this.levelCompleteCount % frequency === 0) {
			this.showInterstitial();
		}
	}

	/**
	 * Handle ad-free activation - remove all ads
	 * @private
	 * @returns {void}
	 */
	_onAdFreeActivated() {
		this.adsEnabled = false;
		this._removeAllAds();
	}

	/**
	 * Returns true when running on a local development server.
	 * Used to bypass frequency caps and cooldowns for easier testing.
	 * @private
	 * @returns {boolean}
	 */
	_isDev() {
		const h = window.location.hostname;
		return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
	}

	/**
	 * Check whether an interstitial can be shown based on timing rules.
	 * @returns {boolean}
	 */
	canShowInterstitial() {
		if (!this.adsEnabled || this.isAdFree()) return false;

		const minInterval = ConfigManager.get('monetization.ads.displayRules.interstitialMinInterval', 300000);
		const elapsed = Date.now() - this.lastInterstitialTime;

		return elapsed >= minInterval;
	}

	/**
	 * Force-show an interstitial immediately, bypassing all frequency and
	 * timing guards. Useful for manual testing from the browser console:
	 *   AdManager.forceShowInterstitial()
	 * @returns {void}
	 */
	forceShowInterstitial() {
		const skipDelay = ConfigManager.get('monetization.ads.displayRules.skipDelay', 5000);
		this._createInterstitialOverlay(skipDelay);
		this.lastInterstitialTime = Date.now();
		EventEmitter.emit(CONSTANTS.EVENTS.AD_INTERSTITIAL_REQUESTED);
	}

	/**
	 * Display an interstitial ad overlay at a natural break
	 * @returns {boolean} Whether the interstitial was shown
	 */
	showInterstitial() {
		if (!this.canShowInterstitial()) return false;

		const skipDelay = ConfigManager.get('monetization.ads.displayRules.skipDelay', 5000);
		this._createInterstitialOverlay(skipDelay);
		this.lastInterstitialTime = Date.now();

		EventEmitter.emit(CONSTANTS.EVENTS.AD_INTERSTITIAL_REQUESTED);
		return true;
	}

	/**
	 * Returns true when a house ad should be shown instead of the configured
	 * ad provider. This is triggered when the device is offline, the provider
	 * is explicitly set to 'house', or the houseAdsOnly flag is enabled.
	 * @private
	 * @returns {boolean}
	 */
	_shouldUseHouseAd() {
		if (!navigator.onLine) return true;
		const provider = ConfigManager.get('monetization.ads.provider', 'adsense');
		if (provider === 'house') return true;
		if (ConfigManager.get('monetization.houseAds.onlyHouseAds', false)) return true;
		// Reserve a 20% house-ad share even when a paid provider is active.
		const houseAdShare = ConfigManager.get('monetization.houseAds.share', 0.2);
		if (houseAdShare > 0 && Math.random() < houseAdShare) return true;
		return false;
	}

	/**
	 * Create and display the interstitial overlay DOM element
	 * @param {number} skipDelay - Milliseconds before skip is enabled
	 * @private
	 * @returns {void}
	 */
	_createInterstitialOverlay(skipDelay) {
		const overlay = document.createElement('div');
		overlay.id = 'interstitial-overlay';
		overlay.className = 'interstitial-overlay';

		const useHouseAd = this._shouldUseHouseAd();

		// Ad label (transparency per constitution)
		const label = document.createElement('div');
		label.className = 'interstitial-label';
		label.textContent = 'Advertisement';
		overlay.appendChild(label);

		// Ad container
		const adContainer = document.createElement('div');
		adContainer.className = 'interstitial-ad-container';

		const provider = ConfigManager.get('monetization.ads.provider', 'adcash');
		const adcashZoneId = ConfigManager.get('monetization.ads.adcashZoneId', '');
		const showAdcash = !useHouseAd && provider === 'adcash' && adcashZoneId;

		if (useHouseAd) {
			adContainer.appendChild(HouseAdManager.renderAdElement());
		} else if (showAdcash) {
			// Adcash auto tag — container will be filled by aclib.runAutoTag
			const placeholder = document.createElement('div');
			placeholder.id = 'adcash-interstitial-zone';
			placeholder.style.cssText = 'width:100%;height:100%;min-height:180px;';
			adContainer.appendChild(placeholder);
		} else {
			// Placeholder for development/testing
			adContainer.innerHTML = '<p style="color: #888; padding: 40px;">Ad Placeholder</p>';
		}

		overlay.appendChild(adContainer);

		// Emit tracking event so AnalyticsManager can record the impression
		const adType = useHouseAd ? 'house' : 'adcash';
		const adId = useHouseAd ? (adContainer.querySelector('[data-house-ad-id]')?.dataset?.houseAdId ?? 'house') : `adcash-${adcashZoneId}`;
		EventEmitter.emit(CONSTANTS.EVENTS.AD_SHOWN, { type: adType, provider: adType, adId });
		const skipButton = document.createElement('button');
		skipButton.className = 'skip-ad-button';
		skipButton.disabled = true;
		let countdown = Math.ceil(skipDelay / 1000);
		skipButton.textContent = `Skip in ${countdown}s`;

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
			clearInterval(timer);
			if (overlay.parentNode) {
				overlay.parentNode.removeChild(overlay);
			}
			document.body.classList.remove('interstitial-active');
		});

		overlay.appendChild(skipButton);
		document.body.appendChild(overlay);
		document.body.classList.add('interstitial-active');

		// Call Adcash to fill the placeholder after it's in the DOM
		if (showAdcash) {
			try {
				aclib.runAutoTag({ zoneId: adcashZoneId });
			} catch (_e) {
				// aclib not loaded — graceful degradation
			}
		}
	}

	/**
	 * Remove all active ad elements from the DOM
	 * @private
	 * @returns {void}
	 */
	_removeAllAds() {
		const interstitial = document.getElementById('interstitial-overlay');
		if (interstitial && interstitial.parentNode) {
			interstitial.parentNode.removeChild(interstitial);
		}
		document.body.classList.remove('interstitial-active');
	}

	/**
	 * Reset ad counters (e.g., on new session)
	 * @returns {void}
	 */
	reset() {
		this.gameOverCount = 0;
		this.levelCompleteCount = 0;
		this.lastInterstitialTime = 0;
	}
}

// Singleton instance
const AdManager = new AdManagerClass();

export default AdManager;
export { AdManager };
