/**
 * ConfigManager.js
 * 
 * Description: Manages game configuration loading and access
 * 
 * Dependencies: Helpers
 * 
 * Exports: ConfigManager singleton with loadConfig, get, and getAll methods
 */

import { getNestedProperty } from '../utils/Helpers.js';

/**
 * Configuration manager class
 */
class ConfigManagerClass {
	
	/**
	 * Constructor initializes config to null
	 */
	constructor() {
		this.config = null;
		this.isLoaded = false;
	}
	
	/**
	 * Load configuration from config.json
	 * @returns {Promise<Object>} Configuration object
	 */
	async loadConfig() {
		const hasConfig = this.config !== null;
		
		// Return cached config if already loaded
		if (hasConfig) {
			return this.config;
		}
		else {
			// Load config from file
		}
		
		try {
			// Try multiple possible paths (for tests and normal operation)
			const possiblePaths = ['./config.json', '../config.json', '../../config.json'];
			let response = null;
			let loadedPath = null;
			
			for (const path of possiblePaths) {
				try {
					response = await fetch(path);
					if (response.ok) {
						loadedPath = path;
						break;
					}
				} catch (e) {
					// Try next path
					continue;
				}
			}
			
			// Parse JSON if successful
			if (response && response.ok) {
				this.config = await response.json();
				this.isLoaded = true;
				const progressionValidation = this.validateProgressionConfig();
				if (!progressionValidation.valid) {
					progressionValidation.errors.forEach(err => {
						console.warn('ConfigManager: progression config warning:', err);
					});
				}
				return this.config;
			}
			else {
				throw new Error(`Failed to load config: Could not find config.json in any expected location`);
			}
		}
		catch (error) {
			console.error('ConfigManager: Error loading config.json', error);
			throw error;
		}
	}
	
	/**
	 * Get a configuration value by key (supports dot notation)
	 * @param {String} key - Configuration key (e.g., 'colors.balls.red')
	 * @param {*} defaultValue - Default value if key not found
	 * @returns {*} Configuration value or default
	 */
	get(key, defaultValue = null) {
		const hasConfig = this.config !== null;
		
		// Return default if config not loaded
		if (!hasConfig) {
			console.warn('ConfigManager: Config not loaded yet');
			return defaultValue;
		}
		else {
			// Config loaded, get value
		}
		
		return getNestedProperty(this.config, key, defaultValue);
	}
	
	/**
	 * Get the entire configuration object
	 * @returns {Object|null} Complete configuration or null if not loaded
	 */
	getAll() {
		return this.config;
	}
	
	/**
	 * Check if configuration is loaded
	 * @returns {Boolean} True if loaded, false otherwise
	 */
	isConfigLoaded() {
		return this.isLoaded;
	}
	
	/**
	 * Resolve difficulty modifiers for a mode+difficulty pair.
	 * Mode-specific overrides are merged on top of defaults.
	 * @param {String} mode - Game mode (e.g. 'CLASSIC', 'ZEN')
	 * @param {Number} difficulty - Difficulty level (1-5)
	 * @returns {{ lockDelay: Number, diagonalScoreMultiplier: Number, painterSpawnMultiplier: Number }}
	 */
	getModifiers(mode, difficulty) {
		const diffKey = `difficulty${difficulty}`;
		const defaults = this.get(`modifiers.defaults.${diffKey}`, {});
		const modeOverrides = this.get(`modifiers.${mode}.${diffKey}`, {});
		return {
			lockDelay: 500,
			diagonalScoreMultiplier: 1.0,
			painterSpawnMultiplier: 1.0,
			...defaults,
			...modeOverrides
		};
	}

	/**
	 * Resolve explicit progression state for a mode+difficulty+level tuple.
	 * Returns null when progression is disabled or missing.
	 * @param {String} mode
	 * @param {Number} difficulty
	 * @param {Number} level
	 * @returns {Object|null}
	 */
	getProgressionState(mode, difficulty, level) {
		const progression = this.get('progression', null);
		if (!progression || progression.enabled === false) {
			return null;
		}

		const profile = this._resolveProgressionProfile(mode, difficulty);
		if (!profile) {
			return null;
		}

		const diffKey = `difficulty${difficulty}`;
		const modifiers = this.getModifiers(mode, difficulty);
		const defaultColors = this.get('colorUnlocks.level1', ['red', 'green', 'blue']);
		const defaultPieces = this.get(`shapeUnlocks.${diffKey}`, [
			'I', 'O', 'T', 'L', 'J', 'S', 'Z'
		]);

		const state = {
			dropIntervalMs: profile.baseline?.dropIntervalMs ?? this.get('game.startingDropSpeed', 1000),
			lockDelayMs: profile.baseline?.lockDelayMs ?? modifiers.lockDelay,
			diagonalScoreMultiplier: profile.baseline?.diagonalScoreMultiplier ?? modifiers.diagonalScoreMultiplier,
			painterSpawnMultiplier: profile.baseline?.painterSpawnMultiplier ?? modifiers.painterSpawnMultiplier,
			colors: [...(profile.baseline?.colors || defaultColors)],
			pieces: [...(profile.baseline?.pieces || defaultPieces)],
			specials: [...(profile.baseline?.specials || [])],
			changesApplied: []
		};

		const levels = profile.levels || {};
		for (let i = 1; i <= Math.max(1, level); i++) {
			const change = levels[String(i)];
			if (!change) continue;
			this._applyProgressionChange(state, change, i);
		}

		state.colors = this._resolveProgressionColors(state.colors);
		state.pieces = this._uniqueList(state.pieces);
		state.specials = this._uniqueList(state.specials);
		state.level = level;
		state.mode = mode;
		state.difficulty = difficulty;
		return state;
	}

	/**
	 * Validate progression configuration shape and single-change constraints.
	 * @returns {{valid: Boolean, errors: Array<String>}}
	 */
	validateProgressionConfig() {
		const progression = this.get('progression', null);
		if (!progression || progression.enabled === false) {
			return { valid: true, errors: [] };
		}

		const errors = [];
		const enforceSingle = progression.enforceSingleMaterialChange !== false;
		const changeKeys = ['speed', 'lock', 'colorUnlock', 'pieceUnlock', 'specialUnlock', 'spawnRateChange', 'scoreBonusChange'];

		const collectProfileWarnings = (profile, profileLabel) => {
			if (!profile || !profile.levels) return;
			Object.entries(profile.levels).forEach(([level, node]) => {
				const present = changeKeys.filter(key => node && Object.prototype.hasOwnProperty.call(node, key));
				if (enforceSingle && present.length > 1) {
					errors.push(`${profileLabel} level ${level} has multiple material changes: ${present.join(', ')}`);
				}
				if (node?.primaryChange && node.primaryChange !== 'baseline') {
					const expectedKey = this._mapPrimaryChangeKey(node.primaryChange);
					if (expectedKey && !Object.prototype.hasOwnProperty.call(node, expectedKey)) {
						errors.push(`${profileLabel} level ${level} primaryChange '${node.primaryChange}' is missing payload '${expectedKey}'`);
					}
				}
			});
		};

		collectProfileWarnings(progression.defaultProfile, 'defaultProfile');
		Object.entries(progression.modeProfiles || {}).forEach(([mode, profile]) => {
			collectProfileWarnings(profile, `modeProfiles.${mode}`);
		});
		Object.entries(progression.modeDifficultyProfiles || {}).forEach(([mode, byDifficulty]) => {
			Object.entries(byDifficulty || {}).forEach(([difficultyKey, profile]) => {
				collectProfileWarnings(profile, `modeDifficultyProfiles.${mode}.${difficultyKey}`);
			});
		});

		return { valid: errors.length === 0, errors };
	}

	/**
	 * Resolve merged progression profile with fallback order:
	 * defaultProfile -> modeProfiles[mode] -> modeDifficultyProfiles[mode][difficultyX]
	 * @param {String} mode
	 * @param {Number} difficulty
	 * @returns {Object|null}
	 * @private
	 */
	_resolveProgressionProfile(mode, difficulty) {
		const progression = this.get('progression', null);
		if (!progression) return null;

		const diffKey = `difficulty${difficulty}`;
		const base = progression.defaultProfile || null;
		if (!base) return null;

		const modeProfile = progression.modeProfiles?.[mode] || null;
		const modeDifficultyProfile = progression.modeDifficultyProfiles?.[mode]?.[diffKey] || null;

		let merged = this._deepMerge({}, base);
		if (modeProfile) merged = this._deepMerge(merged, modeProfile);
		if (modeDifficultyProfile) merged = this._deepMerge(merged, modeDifficultyProfile);
		return merged;
	}

	/**
	 * Apply one progression change node to mutable state.
	 * @param {Object} state
	 * @param {Object} node
	 * @param {Number} level
	 * @returns {void}
	 * @private
	 */
	_applyProgressionChange(state, node, level) {
		if (!node) return;

		if (node.speed) {
			if (typeof node.speed.dropIntervalMs === 'number') {
				state.dropIntervalMs = node.speed.dropIntervalMs;
			}
			if (typeof node.speed.dropIntervalMultiplier === 'number') {
				state.dropIntervalMs = Math.round(state.dropIntervalMs * node.speed.dropIntervalMultiplier);
			}
		}

		if (node.lock) {
			if (typeof node.lock.lockDelayMs === 'number') {
				state.lockDelayMs = node.lock.lockDelayMs;
			}
			if (typeof node.lock.lockDelayMultiplier === 'number') {
				state.lockDelayMs = Math.round(state.lockDelayMs * node.lock.lockDelayMultiplier);
			}
		}

		if (node.colorUnlock?.add) {
			state.colors = this._uniqueList([...state.colors, ...this._asArray(node.colorUnlock.add)]);
		}

		if (node.pieceUnlock?.add) {
			state.pieces = this._uniqueList([...state.pieces, ...this._asArray(node.pieceUnlock.add)]);
		}

		if (node.specialUnlock?.add) {
			state.specials = this._uniqueList([...state.specials, ...this._asArray(node.specialUnlock.add)]);
		}

		if (node.spawnRateChange) {
			if (typeof node.spawnRateChange.painterSpawnMultiplier === 'number') {
				state.painterSpawnMultiplier = node.spawnRateChange.painterSpawnMultiplier;
			}
			if (typeof node.spawnRateChange.painterSpawnMultiplierMultiplier === 'number') {
				state.painterSpawnMultiplier = state.painterSpawnMultiplier * node.spawnRateChange.painterSpawnMultiplierMultiplier;
			}
		}

		if (node.scoreBonusChange) {
			if (typeof node.scoreBonusChange.diagonalScoreMultiplier === 'number') {
				state.diagonalScoreMultiplier = node.scoreBonusChange.diagonalScoreMultiplier;
			}
			if (typeof node.scoreBonusChange.diagonalScoreMultiplierMultiplier === 'number') {
				state.diagonalScoreMultiplier = state.diagonalScoreMultiplier * node.scoreBonusChange.diagonalScoreMultiplierMultiplier;
			}
		}

		state.changesApplied.push({ level, primaryChange: node.primaryChange || null });
	}

	/**
	 * Map primaryChange enum to payload key.
	 * @param {String} primaryChange
	 * @returns {String|null}
	 * @private
	 */
	_mapPrimaryChangeKey(primaryChange) {
		const map = {
			speed: 'speed',
			lock: 'lock',
			colorUnlock: 'colorUnlock',
			pieceUnlock: 'pieceUnlock',
			specialUnlock: 'specialUnlock',
			spawnRateChange: 'spawnRateChange',
			scoreBonusChange: 'scoreBonusChange'
		};
		return map[primaryChange] || null;
	}

	/**
	 * Resolve named colors to hex.
	 * @param {Array<String>} colors
	 * @returns {Array<String>}
	 * @private
	 */
	_resolveProgressionColors(colors) {
		const colorMap = this.get('colors.balls', {});
		return this._uniqueList(colors.map(color => {
			if (typeof color !== 'string') return color;
			if (color.startsWith('#')) return color;
			return colorMap[color] || color;
		}));
	}

	/**
	 * Deep merge helper.
	 * @param {Object} target
	 * @param {Object} source
	 * @returns {Object}
	 * @private
	 */
	_deepMerge(target, source) {
		if (!source || typeof source !== 'object') return target;
		Object.entries(source).forEach(([key, value]) => {
			if (Array.isArray(value)) {
				target[key] = [...value];
			} else if (value && typeof value === 'object') {
				target[key] = this._deepMerge(target[key] && typeof target[key] === 'object' ? target[key] : {}, value);
			} else {
				target[key] = value;
			}
		});
		return target;
	}

	/**
	 * Ensure list has unique values in insertion order.
	 * @param {Array<any>} values
	 * @returns {Array<any>}
	 * @private
	 */
	_uniqueList(values) {
		return [...new Set(values)];
	}

	/**
	 * Normalize scalar or array into array.
	 * @param {any} value
	 * @returns {Array<any>}
	 * @private
	 */
	_asArray(value) {
		return Array.isArray(value) ? value : [value];
	}
	
}

// Create singleton instance
const ConfigManager = new ConfigManagerClass();

export default ConfigManager;
export { ConfigManager };
