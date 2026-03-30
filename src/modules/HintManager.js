/**
 * HintManager.js
 *
 * Shows contextual mid-run tips when the player is struggling.
 * Triggers: consecutive no-match piece placements or high board fill.
 * Each hint shown at most once per level; capped per level.
 *
 * Dependencies: ConfigManager, EventEmitter, Constants
 * Exports: HintManager singleton
 */

import { ConfigManager } from './ConfigManager.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { CONSTANTS } from '../utils/Constants.js';

class HintManagerClass {
	constructor() {
		this.enabled = true;
		this.noMatchRun = 0;
		this.shownThisLevel = [];
		this.hintsRemaining = 0;
		this.pool = [];
	}

	/**
	 * Initialise for a new level
	 * @param {Number} difficulty - Current difficulty (1-5)
	 */
	initialize(difficulty) {
		const globalEnabled = ConfigManager.get('hints.enabled', true);
		const diffDefault = ConfigManager.get(`hints.difficultyDefault.${difficulty}`, difficulty <= 2);
		this.enabled = globalEnabled && diffDefault;

		this.noMatchRun = 0;
		this.shownThisLevel = [];
		this.hintsRemaining = ConfigManager.get('hints.maxPerLevel', 3);
		this.pool = ConfigManager.get('hints.pool', []);
	}

	/**
	 * Override the enabled flag (used by settings toggle)
	 * @param {Boolean} value
	 */
	setEnabled(value) {
		this.enabled = value;
	}

	/**
	 * Call after each piece landing where no matches occurred.
	 * @param {Object} grid - Grid instance for fill-percentage check
	 * @returns {String|null} Hint text if one should be displayed, else null
	 */
	onNoMatch(grid) {
		if (!this.enabled || this.hintsRemaining <= 0) return null;

		this.noMatchRun++;

		const threshold = ConfigManager.get('hints.noMatchThreshold', 3);
		if (this.noMatchRun >= threshold) {
			return this._pickHint();
		}

		// Also check board fill
		if (grid) {
			const fillPct = ConfigManager.get('hints.boardFillPercent', 70);
			const occupied = grid.getOccupiedCount();
			const total = grid.rows * grid.cols;
			if ((occupied / total) * 100 >= fillPct) {
				return this._pickHint();
			}
		}

		return null;
	}

	/**
	 * Call when a match IS found — resets the no-match counter.
	 */
	onMatch() {
		this.noMatchRun = 0;
	}

	/**
	 * Pick a hint that hasn't been shown this level yet.
	 * @returns {String|null}
	 * @private
	 */
	_pickHint() {
		const available = this.pool.filter(h => !this.shownThisLevel.includes(h));
		if (available.length === 0) return null;

		const hint = available[Math.floor(Math.random() * available.length)];
		this.shownThisLevel.push(hint);
		this.hintsRemaining--;
		this.noMatchRun = 0;

		EventEmitter.emit(CONSTANTS.EVENTS.HINT_SHOWN, { hint });
		return hint;
	}
}

const HintManager = new HintManagerClass();
export default HintManager;
