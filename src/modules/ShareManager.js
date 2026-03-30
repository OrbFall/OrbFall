/**
 * ShareManager.js
 *
 * Handles sharing game results via Web Share API (mobile/desktop)
 * with copy-to-clipboard fallback.
 *
 * Dependencies: None
 * Exports: ShareManager singleton
 */

class ShareManagerClass {
	constructor() {
		/** @type {Object|null} Last result stored for sharing */
		this._lastResult = null;
	}

	/**
	 * Store a game result for sharing.
	 * @param {{ score: Number, level: Number, difficulty: Number, mode: String, stars?: Number }} result
	 */
	setResult(result) {
		this._lastResult = result;
	}

	/** @returns {Object|null} */
	getResult() {
		return this._lastResult;
	}

	/**
	 * Build the share text from a result object.
	 * @param {Object} result
	 * @returns {String}
	 */
	buildShareText(result) {
		if (!result) return '';

		const diffNames = { 1: 'Easy', 2: 'Medium', 3: 'Hard', 4: 'Expert', 5: 'Master' };
		const modeNames = {
			CLASSIC: 'Classic', ZEN: 'Zen', GAUNTLET: 'Gauntlet',
			RISING_TIDE: 'Rising Tide', MISSION: 'Mission', PUZZLE: 'Puzzle'
		};

		const mode = modeNames[result.mode] || result.mode;
		const diff = diffNames[result.difficulty] || `D${result.difficulty}`;
		const score = result.score.toLocaleString();

		let text = `I scored ${score} on Orb\u2022Fall Level ${result.level} (${mode}, ${diff})!`;

		if (result.mode === 'PUZZLE' && typeof result.stars === 'number') {
			const starStr = '\u2B50'.repeat(result.stars);
			if (result.stars > 0) text += ` ${starStr}`;
		}

		text += ' Can you beat it?';
		return text;
	}

	/**
	 * Whether the native Web Share API is available.
	 * @returns {Boolean}
	 */
	canNativeShare() {
		return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
	}

	/**
	 * Share the last stored result.
	 * Uses Web Share API if available, otherwise copies to clipboard.
	 * @returns {Promise<'shared'|'copied'|'failed'>}
	 */
	async share() {
		const text = this.buildShareText(this._lastResult);
		if (!text) return 'failed';

		if (this.canNativeShare()) {
			try {
				await navigator.share({ text });
				return 'shared';
			} catch (_err) {
				// User cancelled or API error — fall through to clipboard
			}
		}

		return this._copyToClipboard(text);
	}

	/**
	 * Copy text to clipboard.
	 * @param {String} text
	 * @returns {Promise<'copied'|'failed'>}
	 * @private
	 */
	async _copyToClipboard(text) {
		try {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(text);
				return 'copied';
			}
			// Fallback: textarea trick
			const ta = document.createElement('textarea');
			ta.value = text;
			ta.style.position = 'fixed';
			ta.style.opacity = '0';
			document.body.appendChild(ta);
			ta.select();
			document.execCommand('copy');
			document.body.removeChild(ta);
			return 'copied';
		} catch (_err) {
			return 'failed';
		}
	}
}

const ShareManager = new ShareManagerClass();
export default ShareManager;
export { ShareManager };
