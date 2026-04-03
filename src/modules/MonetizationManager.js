/**
 * ============================================================================
 * MonetizationManager.js - Orb•Fall: ChromaCrush
 * ============================================================================
 * Copyright (c) 2025 G. Scott Tomlin. All Rights Reserved.
 *
 * Manages Lemonsqueezy license key integration and ad-free state:
 * - License key activation via Lemonsqueezy API
 * - License key validation (periodic re-check)
 * - Ad-free state management via localStorage
 * - Purchase link to Lemonsqueezy store
 *
 * Constitution compliance:
 * - Purchases are voluntary and optional
 * - Never guilt-trip or manipulate
 * - Fair ad-free access for supporters
 * - No gameplay advantages for supporters
 *
 * @module MonetizationManager
 * ============================================================================
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { CONSTANTS } from '../utils/Constants.js';
import { ConfigManager } from './ConfigManager.js';

/**
 * Lemonsqueezy License API base URL
 * @const {string}
 */
const LS_API_BASE = 'https://api.lemonsqueezy.com/v1/licenses';

class MonetizationManagerClass {

	constructor() {
		/** @type {boolean} */
		this.enabled = false;
		/** @type {string} */
		this.storeUrl = '';
		/** @type {number} */
		this.storeId = 0;
		/** @type {number} */
		this.productId = 0;
		/** @type {boolean} */
		this.initialized = false;
	}

	/**
	 * Initialize the monetization manager with config settings
	 * @returns {void}
	 */
	initialize() {
		const lsConfig = ConfigManager.get('monetization.lemonsqueezy', null);

		if (!lsConfig || !lsConfig.enabled) {
			this.enabled = false;
			return;
		}

		this.enabled = true;
		this.storeUrl = lsConfig.storeUrl || '';
		this.storeId = lsConfig.storeId || 0;
		this.productId = lsConfig.productId || 0;

		this._addSupportButton();
		this._checkLicenseStatus();
		this.initialized = true;
	}

	/**
	 * Add the floating "Go Ad-Free" button to the page
	 * @private
	 * @returns {void}
	 */
	_addSupportButton() {
		if (document.querySelector('.supporter-button')) return;

		// Don't show button if already ad-free
		if (this.getAdFreeStatus()) return;

		const buttonText = ConfigManager.get('monetization.lemonsqueezy.buttonText', '✨ Go Ad-Free');

		const button = document.createElement('a');
		button.href = this.storeUrl;
		button.target = '_blank';
		button.rel = 'noopener noreferrer';
		button.className = 'supporter-button';
		button.textContent = buttonText;

		// Inject into the top-bar pill row if available (renders inline with Discord pill)
		// Fall back to body so the button still appears during ad interstitials
		const topBarRow = document.getElementById('menuTopBarRow');
		if (topBarRow) {
			topBarRow.appendChild(button);
		} else {
			document.body.appendChild(button);
		}
	}

	/**
	 * Check stored license status on startup; re-validate if needed
	 * @private
	 * @returns {void}
	 */
	_checkLicenseStatus() {
		const status = this.getAdFreeStatus();
		if (!status) return;

		// Re-validate periodically (every 7 days)
		const lastValidation = parseInt(localStorage.getItem(CONSTANTS.STORAGE_KEYS.MONETIZATION_LAST_VALIDATION) || '0');
		const daysSinceValidation = (Date.now() - lastValidation) / (1000 * 60 * 60 * 24);

		if (daysSinceValidation >= 7) {
			this.validateStoredLicense();
		}
	}

	/**
	 * Show the license key activation dialog
	 * @returns {void}
	 */
	showActivateDialog() {
		if (document.querySelector('.license-modal')) return;

		const modal = document.createElement('div');
		modal.className = 'license-modal';

		const purchaseUrl = this.storeUrl || '#';

		modal.innerHTML = `
			<div class="license-modal-content">
				<h2>Activate Ad-Free Mode</h2>
				<p>Enter the license key from your purchase to remove all ads.</p>
				<p class="license-purchase-link">Don't have a key? <a href="${purchaseUrl}" target="_blank" rel="noopener noreferrer">Purchase here</a></p>
				<input type="text" id="license-key-input" class="license-key-input" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
				<div id="license-error" class="license-error"></div>
				<div id="license-loading" class="license-loading" style="display:none;">Validating...</div>
				<div class="license-modal-actions">
					<button id="license-activate-btn" class="btn-primary">Activate</button>
					<button id="license-cancel-btn" class="btn-secondary">Cancel</button>
				</div>
			</div>
		`;

		document.body.appendChild(modal);

		document.getElementById('license-activate-btn').addEventListener('click', () => {
			const key = document.getElementById('license-key-input').value.trim();
			this.activateLicense(key);
		});

		document.getElementById('license-cancel-btn').addEventListener('click', () => {
			if (modal.parentNode) {
				modal.parentNode.removeChild(modal);
			}
		});

		// Allow Enter key to submit
		document.getElementById('license-key-input').addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				const key = e.target.value.trim();
				this.activateLicense(key);
			}
		});
	}

	/**
	 * Activate a license key via the Lemonsqueezy API
	 * @param {string} licenseKey - The license key string
	 * @returns {Promise<boolean>} Whether activation succeeded
	 */
	async activateLicense(licenseKey) {
		if (!licenseKey) {
			this._showError('Please enter a license key');
			return false;
		}

		this._showLoading(true);
		this._clearError();

		try {
			const response = await fetch(`${LS_API_BASE}/activate`, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams({
					license_key: licenseKey,
					instance_name: 'OrbFall-ChromaCrush'
				})
			});

			const data = await response.json();

			if (!data.activated) {
				const errorMsg = data.error || 'Activation failed. Please check your license key.';
				this._showError(errorMsg);
				this._showLoading(false);
				return false;
			}

			// Verify this key belongs to our product
			if (this.storeId && data.meta && data.meta.store_id !== this.storeId) {
				this._showError('This license key is not valid for this product.');
				this._showLoading(false);
				return false;
			}

			if (this.productId && data.meta && data.meta.product_id !== this.productId) {
				this._showError('This license key is not valid for this product.');
				this._showLoading(false);
				return false;
			}

			// Store license data
			this._storeLicense({
				key: licenseKey,
				instanceId: data.instance.id,
				status: data.license_key.status,
				expiresAt: data.license_key.expires_at,
				customerName: data.meta.customer_name || '',
				activatedAt: new Date().toISOString()
			});

			// Emit event so AdManager removes ads
			EventEmitter.emit(CONSTANTS.EVENTS.AD_FREE_ACTIVATED, {
				licenseKey,
				expiresAt: data.license_key.expires_at
			});

			this._showLoading(false);
			this._showConfirmation(data.license_key.expires_at);
			this._closeModal();
			this._removeSupportButton();

			return true;
		} catch (error) {
			console.error('[Monetization] License activation failed:', error);
			this._showError('Network error. Please check your connection and try again.');
			this._showLoading(false);
			return false;
		}
	}

	/**
	 * Validate the stored license key with the Lemonsqueezy API
	 * @returns {Promise<boolean>} Whether the license is still valid
	 */
	async validateStoredLicense() {
		const stored = this._getStoredLicense();
		if (!stored) return false;

		try {
			const response = await fetch(`${LS_API_BASE}/validate`, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams({
					license_key: stored.key,
					instance_id: stored.instanceId
				})
			});

			const data = await response.json();

			localStorage.setItem(CONSTANTS.STORAGE_KEYS.MONETIZATION_LAST_VALIDATION, Date.now().toString());

			if (!data.valid) {
				// License no longer valid — clear ad-free state
				this._clearLicense();
				return false;
			}

			// Update stored expiry if changed
			if (data.license_key.expires_at !== stored.expiresAt) {
				stored.expiresAt = data.license_key.expires_at;
				stored.status = data.license_key.status;
localStorage.setItem(CONSTANTS.STORAGE_KEYS.MONETIZATION_LICENSE, JSON.stringify(stored));
			}

			return true;
		} catch (error) {
			// Network error — don't revoke, just skip validation
			console.warn('[Monetization] License validation network error:', error);
			return true;
		}
	}

	/**
	 * Store license data in localStorage
	 * @param {Object} licenseData
	 * @private
	 * @returns {void}
	 */
	_storeLicense(licenseData) {
		localStorage.setItem(CONSTANTS.STORAGE_KEYS.MONETIZATION_LICENSE, JSON.stringify(licenseData));
		localStorage.setItem(CONSTANTS.STORAGE_KEYS.MONETIZATION_AD_FREE, 'license');
		localStorage.setItem(CONSTANTS.STORAGE_KEYS.MONETIZATION_LAST_VALIDATION, Date.now().toString());
	}

	/**
	 * Get stored license data
	 * @private
	 * @returns {Object|null}
	 */
	_getStoredLicense() {
		const stored = localStorage.getItem(CONSTANTS.STORAGE_KEYS.MONETIZATION_LICENSE);
		if (!stored) return null;

		try {
			return JSON.parse(stored);
		} catch (_e) {
			return null;
		}
	}

	/**
	 * Clear stored license and ad-free state
	 * @private
	 * @returns {void}
	 */
	_clearLicense() {
		localStorage.removeItem(CONSTANTS.STORAGE_KEYS.MONETIZATION_LICENSE);
		localStorage.removeItem(CONSTANTS.STORAGE_KEYS.MONETIZATION_AD_FREE);
		localStorage.removeItem(CONSTANTS.STORAGE_KEYS.MONETIZATION_LAST_VALIDATION);
	}

	/**
	 * Get the current ad-free status
	 * @returns {Object|null} Status object or null
	 */
	getAdFreeStatus() {
		const adFreeFlag = localStorage.getItem(CONSTANTS.STORAGE_KEYS.MONETIZATION_AD_FREE);
		if (!adFreeFlag) return null;

		// License-based ad-free (perpetual or until expiry)
		if (adFreeFlag === 'license') {
			const stored = this._getStoredLicense();
			if (!stored) return null;

			// Check expiry if set
			if (stored.expiresAt) {
				const expiresAt = new Date(stored.expiresAt).getTime();
				if (Date.now() >= expiresAt) {
					this._clearLicense();
					return null;
				}
				return {
					active: true,
					type: 'license',
					expiresAt: expiresAt,
					daysRemaining: Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
				};
			}

			// Perpetual license (no expiry)
			return {
				active: true,
				type: 'license',
				expiresAt: null,
				daysRemaining: null
			};
		}

		// Legacy timestamp-based ad-free (backward compat with old BMAC tokens)
		const expirationTime = parseInt(adFreeFlag);
		if (!isNaN(expirationTime) && Date.now() < expirationTime) {
			return {
				active: true,
				type: 'legacy',
				expiresAt: expirationTime,
				daysRemaining: Math.ceil((expirationTime - Date.now()) / (1000 * 60 * 60 * 24))
			};
		}

		// Expired
			localStorage.removeItem(CONSTANTS.STORAGE_KEYS.MONETIZATION_AD_FREE);
		return null;
	}

	/**
	 * Show error in the license dialog
	 * @param {string} message
	 * @private
	 * @returns {void}
	 */
	_showError(message) {
		const errorDiv = document.getElementById('license-error');
		if (errorDiv) {
			errorDiv.textContent = message;
			errorDiv.style.display = 'block';
		}
	}

	/**
	 * Clear error in the license dialog
	 * @private
	 * @returns {void}
	 */
	_clearError() {
		const errorDiv = document.getElementById('license-error');
		if (errorDiv) {
			errorDiv.textContent = '';
			errorDiv.style.display = 'none';
		}
	}

	/**
	 * Show/hide loading state in the license dialog
	 * @param {boolean} show
	 * @private
	 * @returns {void}
	 */
	_showLoading(show) {
		const loadingDiv = document.getElementById('license-loading');
		const activateBtn = document.getElementById('license-activate-btn');
		if (loadingDiv) loadingDiv.style.display = show ? 'block' : 'none';
		if (activateBtn) activateBtn.disabled = show;
	}

	/**
	 * Show confirmation after successful activation
	 * @param {string|null} expiresAt - ISO date string or null for perpetual
	 * @private
	 * @returns {void}
	 */
	_showConfirmation(expiresAt) {
		const notification = document.createElement('div');
		notification.className = 'supporter-notification';

		const expiryText = expiresAt
			? `Ad-free until ${new Date(expiresAt).toLocaleDateString()}`
			: 'Ad-free forever!';

		notification.innerHTML = `
			<p>✅ License activated!</p>
			<p>${expiryText}</p>
		`;
		document.body.appendChild(notification);

		setTimeout(() => {
			notification.classList.add('supporter-notification-fade');
			setTimeout(() => {
				if (notification.parentNode) {
					notification.parentNode.removeChild(notification);
				}
			}, 500);
		}, 4000);
	}

	/**
	 * Close the license modal
	 * @private
	 * @returns {void}
	 */
	_closeModal() {
		const modal = document.querySelector('.license-modal');
		if (modal && modal.parentNode) {
			modal.parentNode.removeChild(modal);
		}
	}

	/**
	 * Remove the support button (after activation)
	 * @private
	 * @returns {void}
	 */
	_removeSupportButton() {
		const btn = document.querySelector('.supporter-button');
		if (btn && btn.parentNode) {
			btn.parentNode.removeChild(btn);
		}
	}
}

// Singleton instance
const MonetizationManager = new MonetizationManagerClass();

export default MonetizationManager;
export { MonetizationManager };
