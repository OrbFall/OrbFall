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
	}

	/**
	 * Initialize the ad manager with config settings
	 * @returns {void}
	 */
	initialize() {
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

		this.loadAdScript();
		this._setupEventListeners();
		this.initialized = true;
	}

	/**
	 * Check if user has an active ad-free period
	 * @returns {boolean}
	 */
	isAdFree() {
		const adFreeUntil = localStorage.getItem('monetization_ad_free_until');
		if (!adFreeUntil) return false;

		const expirationTime = parseInt(adFreeUntil);
		if (Date.now() < expirationTime) {
			return true;
		}

		// Expired - clean up
		localStorage.removeItem('monetization_ad_free_until');
		return false;
	}

	/**
	 * Load the ad provider script dynamically
	 * @returns {void}
	 */
	loadAdScript() {
		if (this.scriptLoaded) return;

		const adSenseId = ConfigManager.get('monetization.ads.adSenseId', '');
		if (!adSenseId) {
			return;
		}

		// The AdSense script is already loaded via <script> in index.html.
		// Mark as loaded so interstitial push() calls work immediately.
		this.scriptLoaded = true;
	}

	/**
	 * Set up event listeners for game events
	 * @private
	 * @returns {void}
	 */
	_setupEventListeners() {
		EventEmitter.on(CONSTANTS.EVENTS.GAME_OVER, () => this._onGameOver());
		EventEmitter.on(CONSTANTS.EVENTS.LEVEL_COMPLETE, () => this._onLevelComplete());
		EventEmitter.on(CONSTANTS.EVENTS.AD_FREE_ACTIVATED, () => this._onAdFreeActivated());
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
	 * Check whether an interstitial can be shown based on timing rules
	 * @returns {boolean}
	 */
	canShowInterstitial() {
		if (!this.adsEnabled || this.isAdFree()) return false;

		const minInterval = ConfigManager.get('monetization.ads.displayRules.interstitialMinInterval', 300000);
		const elapsed = Date.now() - this.lastInterstitialTime;

		return elapsed >= minInterval;
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
	 * Create and display the interstitial overlay DOM element
	 * @param {number} skipDelay - Milliseconds before skip is enabled
	 * @private
	 * @returns {void}
	 */
	_createInterstitialOverlay(skipDelay) {
		const overlay = document.createElement('div');
		overlay.id = 'interstitial-overlay';
		overlay.className = 'interstitial-overlay';

		// Ad label (transparency per constitution)
		const label = document.createElement('div');
		label.className = 'interstitial-label';
		label.textContent = 'Advertisement';
		overlay.appendChild(label);

		// Ad container
		const adContainer = document.createElement('div');
		adContainer.className = 'interstitial-ad-container';

		const adSenseId = ConfigManager.get('monetization.ads.adSenseId', '');
		const slotId = ConfigManager.get('monetization.ads.slotIds.interstitial', '');

		if (adSenseId && slotId && slotId !== 'XXXXXXXXXX') {
			const ins = document.createElement('ins');
			ins.className = 'adsbygoogle';
			ins.style.display = 'block';
			ins.setAttribute('data-ad-client', adSenseId);
			ins.setAttribute('data-ad-slot', slotId);
			ins.setAttribute('data-ad-format', 'auto');
			ins.setAttribute('data-full-width-responsive', 'true');
			adContainer.appendChild(ins);

			try {
				(window.adsbygoogle = window.adsbygoogle || []).push({});
			} catch (_e) {
				// AdSense not loaded - graceful degradation
			}
		} else {
			// Placeholder for development/testing
			adContainer.innerHTML = '<p style="color: #888; padding: 40px;">Ad Placeholder</p>';
		}

		overlay.appendChild(adContainer);

		// Skip button with countdown
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
