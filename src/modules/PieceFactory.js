/**
 * PieceFactory.js
 * 
 * Description: Factory for generating random pieces with level-appropriate colors and special balls
 * 
 * Dependencies: Ball, Piece, Constants, ConfigManager, Helpers
 * 
 * Exports: PieceFactory singleton
 */

import Ball from './Ball.js';
import Piece from './Piece.js';
import { CONSTANTS } from '../utils/Constants.js';
import { ConfigManager } from './ConfigManager.js';
import { randomInt, randomFloat } from '../utils/Helpers.js';
import { DebugMode } from '../utils/DebugMode.js';

/**
 * PieceFactory class for generating random pieces
 */
class PieceFactoryClass {
	
	constructor() {
		// Track pieces dropped for blocking ball spawn logic
		this.piecesDropped = 0;
		// Track current level for color selection
		this.currentLevel = 1;
		// Track current difficulty
		this.currentDifficulty = 1;
		// Track current game mode
		this.gameMode = 'CLASSIC';
		// Special interval tracking
		this.specialPiecesUntilNext = null;
		this.nextIntervalSpecialType = null;
		this.nextIntervalSpecialColor = null;
		// Shape bag tracking
		this.shapeBag = [];
		// Special bag tracking
		this.specialBag = [];
	}
	
	/**
	 * Reset factory state
	 */
	reset() {
		this.piecesDropped = 0;
		this.currentLevel = 1;
		this.currentDifficulty = 1;
		this.specialPiecesUntilNext = null;
		this.nextIntervalSpecialType = null;
		this.nextIntervalSpecialColor = null;
		this.shapeBag = [];
		this.specialBag = [];
	}
	
	/**
	 * Get available colors for the current level
	 * @param {Number} level - Current game level
	 * @returns {Array<String>} Array of color hex codes
	 */
	getAvailableColors(level) {
		// Determine which color unlock tier applies
		let colorKey = 'level1';
		
		if (level >= 19) colorKey = 'level19';
		else if (level >= 15) colorKey = 'level15';
		else if (level >= 11) colorKey = 'level11';
		else if (level >= 7) colorKey = 'level7';
		else if (level >= 3) colorKey = 'level3';
		
		// Get color names from config
		const colorNames = ConfigManager.get(`colorUnlocks.${colorKey}`, ['red', 'green', 'blue']);
		
		// Map to hex codes
		const colors = colorNames.map(name => {
			return ConfigManager.get(`colors.balls.${name}`, '#FFFFFF');
		});
		
		return colors;
	}
	
	/**
	 * Get the special ball types that are unlocked at a given level.
	 * Reads the `specialBalls.featureUnlocks` map from config; if absent, all types
	 * are considered unlocked (backwards-compatible default).
	 * @param {Number} level - Current game level
	 * @returns {Array<String>} Array of BALL_TYPES constants available at this level
	 * @private
	 */
	_getUnlockedSpecialTypes(level) {
		const unlocks = ConfigManager.get('specialBalls.featureUnlocks', null);
		const allTypes = [
			CONSTANTS.BALL_TYPES.EXPLODING,
			CONSTANTS.BALL_TYPES.PAINTER_HORIZONTAL,
			CONSTANTS.BALL_TYPES.PAINTER_VERTICAL,
			CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NE,
			CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NW
		];

		if (!unlocks) {
			return allTypes;
		}

		return allTypes.filter(type => {
			const minLevel = unlocks[type];
			return minLevel === undefined || level >= minLevel;
		});
	}

	/**
	 * Check if a special ball should spawn
	 * @param {String} specialType - Type of special ball (exploding, painterHorizontal, etc.)
	 * @returns {Boolean} True if special ball should spawn
	 */
	shouldSpawnSpecialBall(specialType) {
		const intervalEnabled = ConfigManager.get('specialInterval.enabled', false);
		if (intervalEnabled) {
			return false;
		}
		
		let spawnRate = ConfigManager.get(`specialBalls.${specialType}.spawnRate`, 0);
		
		// Increase exploding ball spawn rate in Rising Tide mode
		if (this.gameMode === 'RISING_TIDE' && specialType === 'exploding') {
			spawnRate = spawnRate * 3; // Triple the exploding ball spawn rate
		}
		
		return randomFloat(0, 1) < spawnRate;
	}
	
	/**
	 * Check if a blocking ball should spawn
	 * @param {Number} difficulty - Current difficulty level (1-5)
	 * @returns {Boolean} True if blocking ball should spawn
	 */
	shouldSpawnBlockingBall(difficulty) {
		// Get base spawn rate and increment
		const baseRate = ConfigManager.get('specialBalls.blocking.baseSpawnRate', 0.005);
		const increment = ConfigManager.get('specialBalls.blocking.spawnRateIncrement', 0.001);
		
		// Calculate effective spawn rate
		const spawnRate = baseRate + (increment * (difficulty - 1));
		
		// Check minimum pieces requirement
		const minPieces = ConfigManager.get(`specialBalls.blocking.minPieceBeforeSpawn.difficulty${difficulty}`, 50);
		
		if (this.piecesDropped < minPieces) {
			return false;
		}
		
		return randomFloat(0, 1) < spawnRate;
	}
	
	/**
	 * Generate a random special ball
	 * @param {Number} difficulty - Current difficulty level (1-5)
	 * @returns {Ball} A special ball or null if none should spawn
	 */
	generateSpecialBall(difficulty) {
		const level = this.currentLevel || 1;
		// Get available colors for random selection
		const availableColors = this.getAvailableColors(level);
		const intervalEnabled = ConfigManager.get('specialInterval.enabled', false);
		const specialBagEnabled = ConfigManager.get('specialBag.enabled', false);

		// Check blocking ball first (difficulty-dependent, not level-gated)
		if (this.shouldSpawnBlockingBall(difficulty)) {
			const color = ConfigManager.get('colors.special.blocking', '#808080');
			return new Ball(CONSTANTS.BALL_TYPES.BLOCKING, color);
		}

		// Early exit if no special types are unlocked at the current level
		const unlockedTypes = this._getUnlockedSpecialTypes(level);
		if (unlockedTypes.length === 0) {
			return null;
		}

		// Use special bag if enabled and interval mode is off
		if (specialBagEnabled && !intervalEnabled) {
			const shouldSpawn = this._shouldSpawnAnySpecialBall();
			if (!shouldSpawn) {
				return null;
			}
			const specialType = this._drawFromSpecialBag();
			if (!specialType) return null; // bag empty (no types unlocked at this level)
			const color = availableColors[randomInt(0, availableColors.length - 1)];
			return new Ball(specialType, color);
		}

		// Check other special types — filtered by level unlocks
		const specialTypes = [
			{ type: CONSTANTS.BALL_TYPES.EXPLODING, config: 'exploding' },
			{ type: CONSTANTS.BALL_TYPES.PAINTER_HORIZONTAL, config: 'painterHorizontal' },
			{ type: CONSTANTS.BALL_TYPES.PAINTER_VERTICAL, config: 'painterVertical' },
			{ type: CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NE, config: 'painterDiagonal' },
			{ type: CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NW, config: 'painterDiagonal' }
		].filter(s => unlockedTypes.includes(s.type));

		// Shuffle to randomize priority
		for (let i = specialTypes.length - 1; i > 0; i--) {
			const j = randomInt(0, i);
			[specialTypes[i], specialTypes[j]] = [specialTypes[j], specialTypes[i]];
		}
		
		// Check each type
		for (const special of specialTypes) {
			if (this.shouldSpawnSpecialBall(special.config)) {
				// Use random color from available colors
				const color = availableColors[randomInt(0, availableColors.length - 1)];
				return new Ball(special.type, color);
			}
		}
		
		return null;
	}
	
	/**
	 * Decide if any special should spawn when using the special bag
	 * @returns {Boolean} True if a special should spawn
	 * @private
	 */
	_shouldSpawnAnySpecialBall() {
		const explicitRate = ConfigManager.get('specialBag.overallSpawnRate', null);
		if (typeof explicitRate === 'number') {
			return randomFloat(0, 1) < explicitRate;
		}
		
		const rates = [
			this._getSpecialSpawnRate('exploding'),
			this._getSpecialSpawnRate('painterHorizontal'),
			this._getSpecialSpawnRate('painterVertical'),
			this._getSpecialSpawnRate('painterDiagonal'),
			this._getSpecialSpawnRate('painterDiagonal')
		];
		const noneProbability = rates.reduce((acc, rate) => acc * (1 - rate), 1);
		const combinedRate = 1 - noneProbability;
		return randomFloat(0, 1) < combinedRate;
	}
	
	/**
	 * Get spawn rate for a special type key
	 * @param {String} specialType - Config key for special type
	 * @returns {Number} Spawn rate (0-1)
	 * @private
	 */
	_getSpecialSpawnRate(specialType) {
		let spawnRate = ConfigManager.get(`specialBalls.${specialType}.spawnRate`, 0);
		if (this.gameMode === 'RISING_TIDE' && specialType === 'exploding') {
			spawnRate = spawnRate * 3;
		}
		return spawnRate;
	}
	
	/**
	 * Draw the next special type from the bag, refilling when empty.
	 * Returns null if the bag is still empty after refill (e.g. no types unlocked).
	 * @returns {String|null} Ball type constant, or null
	 * @private
	 */
	_drawFromSpecialBag() {
		if (this.specialBag.length === 0) {
			this._refillSpecialBag();
		}
		return this.specialBag.pop() ?? null;
	}
	
	/**
	 * Refill the special bag with a weighted pool
	 * @returns {void}
	 * @private
	 */
	_refillSpecialBag() {
		const pool = this._getSpecialBagPool();
		for (let i = pool.length - 1; i > 0; i--) {
			const j = randomInt(0, i);
			[pool[i], pool[j]] = [pool[j], pool[i]];
		}
		this.specialBag = pool;
	}
	
	/**
	 * Build weighted special bag pool, filtered by level-based feature unlocks.
	 * @returns {Array<String>} Ball type constants
	 * @private
	 */
	_getSpecialBagPool() {
		const weights = ConfigManager.get('specialBag.weights', {});
		const unlockedTypes = this._getUnlockedSpecialTypes(this.currentLevel || 1);
		const entries = [
			{ key: 'exploding', type: CONSTANTS.BALL_TYPES.EXPLODING },
			{ key: 'painterHorizontal', type: CONSTANTS.BALL_TYPES.PAINTER_HORIZONTAL },
			{ key: 'painterVertical', type: CONSTANTS.BALL_TYPES.PAINTER_VERTICAL },
			{ key: 'painterDiagonalNE', type: CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NE },
			{ key: 'painterDiagonalNW', type: CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NW }
		];
		const pool = [];
		for (const entry of entries) {
			if (!unlockedTypes.includes(entry.type)) continue;
			const weight = Math.max(0, Math.floor(weights[entry.key] ?? 1));
			for (let i = 0; i < weight; i++) {
				pool.push(entry.type);
			}
		}
		// pool may be empty if nothing is unlocked yet — caller must handle null draw
		return pool;
	}
	
	/**
	 * Set the current game mode
	 * @param {String} mode - Game mode (CLASSIC, ZEN, GAUNTLET, RISING_TIDE)
	 */
	setGameMode(mode) {
		this.gameMode = mode || 'CLASSIC';
	}
	
	/**
	 * Generate a random piece for the current game state
	 * @param {Number} level - Current game level
	 * @param {Number} difficulty - Current difficulty level (1-5)
	 * @param {Function} callback - Optional callback for async piece generation (debug mode)
	 * @returns {Piece|null} A new random piece, or null if waiting for debug selection
	 */
	generatePiece(level, difficulty, callback = null) {
		// In debug mode, show palette and wait for selection
		if (DebugMode.isEnabled() && callback) {
			DebugMode.requestPiece((shape, ballConfigs) => {
				console.log('🔧 Debug: PieceFactory received selection', { shape, ballConfigs });
				// User made selection, generate piece with overrides
				const piece = this._generatePieceInternal(level, difficulty, shape, ballConfigs);
				console.log('🔧 Debug: PieceFactory calling callback with piece', piece);
				callback(piece);
			});
			return null; // Will callback with piece later
		}
		
		// Normal synchronous generation
		return this._generatePieceInternal(level, difficulty, null, null);
	}
	
	/**
	 * Internal piece generation logic
	 * @private
	 */
	_generatePieceInternal(level, difficulty, debugShape = null, debugBallConfigs = null) {
		// Store current level for color selection.
		// If the level changed, discard the special bag so it is rebuilt with
		// any newly-unlocked types at the start of the new level.
		const prevLevel = this.currentLevel;
		this.currentLevel = level;
		this.currentDifficulty = difficulty;
		if (prevLevel !== level) {
			this.specialBag = [];
		}
		
		// Increment pieces dropped counter
		this.piecesDropped++;
		
		const intervalResult = this._tickSpecialInterval(level, difficulty);
		const forceIntervalSpecial = intervalResult.forceSpecial;
		const forcedSpecialType = intervalResult.forcedType;
		const forcedSpecialColor = intervalResult.forcedColor;
		
		// Choose piece shape (allow debug override)
		let shapeType;
		if (debugShape || (DebugMode.isEnabled() && DebugMode.getShape())) {
			shapeType = debugShape || DebugMode.getShape();
			console.log('🔧 Debug: Forcing shape:', shapeType);
		} else {
			const bagEnabled = ConfigManager.get('pieceBag.enabled', false);
			if (bagEnabled) {
				shapeType = this._drawFromShapeBag();
			} else {
				// Only select from standard Tetris pieces, exclude SINGLE
				const pieceTypes = [
					CONSTANTS.PIECE_TYPES.I,
					CONSTANTS.PIECE_TYPES.O,
					CONSTANTS.PIECE_TYPES.T,
					CONSTANTS.PIECE_TYPES.L,
					CONSTANTS.PIECE_TYPES.J,
					CONSTANTS.PIECE_TYPES.S,
					CONSTANTS.PIECE_TYPES.Z
				];
				const randomIndex = randomInt(0, pieceTypes.length - 1);
				shapeType = pieceTypes[randomIndex];
			}
		}
		
		// Get shape definition
		const shapeDefinition = ConfigManager.get(`pieceShapes.${shapeType}`);
		const hasShape = shapeDefinition !== null;
		
		// Count balls needed
		let ballCount = 0;
		
		if (hasShape) {
			for (let row = 0; row < shapeDefinition.length; row++) {
				for (let col = 0; col < shapeDefinition[row].length; col++) {
					if (shapeDefinition[row][col] === 1) {
						ballCount++;
					}
				}
			}
		} else {
			ballCount = 1;
		}
		
		// Get available colors for this level
		const availableColors = this.getAvailableColors(level);
		
		// Generate balls
		const balls = [];
		let specialBallCount = 0;
		const maxSpecialBalls = ConfigManager.get('game.maxSpecialBallsPerPiece', 2);
		
		for (let i = 0; i < ballCount; i++) {
			let ballType = CONSTANTS.BALL_TYPES.NORMAL;
			let ballColor;
			
			// Check if we have per-ball debug configs
			if (debugBallConfigs && debugBallConfigs.length > i) {
				// Use the specific config for this ball
				const config = debugBallConfigs[i];
				ballType = config.type;
				
				// Resolve color name to hex
				if (config.color.startsWith('#')) {
					ballColor = config.color;
				} else {
					ballColor = ConfigManager.get(`colors.balls.${config.color.toLowerCase()}`);
					if (!ballColor) {
						ballColor = this._getColorForBallType(ballType, availableColors);
					}
				}
				
				if (i === 0) console.log('🔧 Debug: Using ball configs per ball');
			} else if (DebugMode.isEnabled() && (DebugMode.getType() || DebugMode.getColors())) {
				// Legacy query string debug mode (applies same type/color to all balls)
				const typeToUse = DebugMode.getType();
				if (typeToUse !== null && typeToUse !== undefined) {
					ballType = typeToUse;
					if (i === 0) console.log('🔧 Debug: Forcing ball type:', typeToUse);
				} else {
					// Check if this ball should be special (only if under limit)
					if (specialBallCount < maxSpecialBalls) {
						const specialBall = this.generateSpecialBall(difficulty);
						if (specialBall) {
							ballType = specialBall.getType();
							specialBallCount++;
						}
					}
				}
				
				// Override color if specified
				const colorsToUse = DebugMode.getColors();
				if (colorsToUse && colorsToUse.length > 0) {
					const colorIndex = i % colorsToUse.length;
					const colorValue = colorsToUse[colorIndex];
					
					// Resolve color name to hex
					if (colorValue.startsWith('#')) {
						ballColor = colorValue;
					} else {
						ballColor = ConfigManager.get(`colors.balls.${colorValue.toLowerCase()}`);
						if (!ballColor) {
							ballColor = this._getColorForBallType(ballType, availableColors);
						}
					}
					if (i === 0) console.log('🔧 Debug: Forcing ball color:', ballColor);
				} else {
					// Use default color for ball type
					ballColor = this._getColorForBallType(ballType, availableColors);
				}
			} else {
				// Normal generation (no debug mode)
				// Check if this ball should be special (respect limit)
				if (specialBallCount < maxSpecialBalls) {
					const specialBall = this.generateSpecialBall(difficulty);
					
					if (specialBall) {
						ballType = specialBall.getType();
						ballColor = specialBall.getColor();
						specialBallCount++;
					} else {
						// Generate normal ball with random color
						ballColor = availableColors[randomInt(0, availableColors.length - 1)];
					}
				} else {
					// Already at limit, must be normal ball
					ballColor = availableColors[randomInt(0, availableColors.length - 1)];
				}
			}
			
			balls.push(new Ball(ballType, ballColor));
		}
		
		// Apply forced interval special if configured and not in debug override
		if (forceIntervalSpecial && !debugBallConfigs && !(DebugMode.isEnabled() && (DebugMode.getType() || DebugMode.getColors()))) {
			this._applyForcedSpecial(balls, forcedSpecialType, forcedSpecialColor, availableColors, maxSpecialBalls);
			this._resetIntervalAfterForce(level, difficulty);
		} else if (forceIntervalSpecial) {
			this._resetIntervalAfterForce(level, difficulty);
		}
		
		return new Piece(shapeType, balls);
	}
	
	/**
	 * Draw the next shape from the bag, refilling when empty
	 * @returns {String} Shape type
	 * @private
	 */
	_drawFromShapeBag() {
		if (this.shapeBag.length === 0) {
			this._refillShapeBag();
		}
		return this.shapeBag.pop();
	}
	
	/**
	 * Refill the shape bag with a shuffled pool
	 * @returns {void}
	 * @private
	 */
	_refillShapeBag() {
		const pool = this._getShapePool();
		for (let i = pool.length - 1; i > 0; i--) {
			const j = randomInt(0, i);
			[pool[i], pool[j]] = [pool[j], pool[i]];
		}
		this.shapeBag = pool;
	}
	
	/**
	 * Get the active shape pool for the bag
	 * @returns {Array<String>} Shape types
	 * @private
	 */
	_getShapePool() {
		const includeSingle = ConfigManager.get('pieceBag.includeSingle', false);
		const configured = ConfigManager.get('pieceBag.shapes', null);
		const defaultShapes = [
			CONSTANTS.PIECE_TYPES.I,
			CONSTANTS.PIECE_TYPES.O,
			CONSTANTS.PIECE_TYPES.T,
			CONSTANTS.PIECE_TYPES.L,
			CONSTANTS.PIECE_TYPES.J,
			CONSTANTS.PIECE_TYPES.S,
			CONSTANTS.PIECE_TYPES.Z
		];
		let shapes = Array.isArray(configured) && configured.length > 0
			? configured
			: defaultShapes;
		if (includeSingle && !shapes.includes(CONSTANTS.PIECE_TYPES.SINGLE)) {
			shapes = [...shapes, CONSTANTS.PIECE_TYPES.SINGLE];
		}
		return shapes;
	}
	
	/**
	 * Tick the special interval counter and decide if a forced special is needed
	 * @param {Number} level - Current level
	 * @param {Number} difficulty - Current difficulty
	 * @returns {{forceSpecial: Boolean, forcedType: String|null, revealWindow: Number, piecesUntilNext: Number|null}}
	 * @private
	 */
	_tickSpecialInterval(level, difficulty) {
		const enabled = ConfigManager.get('specialInterval.enabled', false);
		if (!enabled) {
			return { forceSpecial: false, forcedType: null, forcedColor: null, revealWindow: 0, piecesUntilNext: null };
		}
		
		const revealWindow = ConfigManager.get('specialInterval.revealWindow', 2);
		if (!this.specialPiecesUntilNext || this.specialPiecesUntilNext <= 0) {
			this.specialPiecesUntilNext = this._getIntervalLength(level, difficulty);
			this.nextIntervalSpecialType = null;
			this.nextIntervalSpecialColor = null;
		}
		
		this.specialPiecesUntilNext -= 1;
		
		const shouldReveal = this.specialPiecesUntilNext > 0 && this.specialPiecesUntilNext <= revealWindow;
		if (shouldReveal && !this.nextIntervalSpecialType) {
			this.nextIntervalSpecialType = this._pickIntervalSpecialType(level);
			if (this.nextIntervalSpecialType) {
				this.nextIntervalSpecialColor = this._pickIntervalSpecialColor(level, this.nextIntervalSpecialType);
			}
		}

		const forceSpecial = this.specialPiecesUntilNext <= 0;
		let forcedType = null;
		let forcedColor = null;
		if (forceSpecial) {
			forcedType = this.nextIntervalSpecialType || this._pickIntervalSpecialType(level);
			if (forcedType) {
				forcedColor = this.nextIntervalSpecialColor || this._pickIntervalSpecialColor(level, forcedType);
			}
		}
		
		return {
			forceSpecial: forceSpecial,
			forcedType: forcedType,
			forcedColor: forcedColor,
			revealWindow: revealWindow,
			piecesUntilNext: this.specialPiecesUntilNext
		};
	}
	
	/**
	 * Reset interval counters after a forced special is used
	 * @param {Number} level - Current level
	 * @param {Number} difficulty - Current difficulty
	 * @returns {void}
	 * @private
	 */
	_resetIntervalAfterForce(level, difficulty) {
		this.specialPiecesUntilNext = this._getIntervalLength(level, difficulty);
		this.nextIntervalSpecialType = null;
		this.nextIntervalSpecialColor = null;
	}
	
	/**
	 * Get interval length based on level and difficulty
	 * @param {Number} level - Current level
	 * @param {Number} difficulty - Current difficulty
	 * @returns {Number} Interval length in pieces
	 * @private
	 */
	_getIntervalLength(level, difficulty) {
		const base = ConfigManager.get('specialInterval.baseInterval', 8);
		const difficultyIncrement = ConfigManager.get('specialInterval.difficultyIncrement', 1);
		const levelIncrement = ConfigManager.get('specialInterval.levelIncrement', 0);
		const length = base + (Math.max(0, difficulty - 1) * difficultyIncrement) + (Math.max(0, level - 1) * levelIncrement);
		return Math.max(1, Math.round(length));
	}
	
	/**
	 * Choose a special type for interval-based spawning, respecting level-based
	 * feature unlock gates.  Returns null if no types are unlocked yet.
	 * @param {Number} level - Current game level
	 * @returns {String|null} Ball type constant, or null
	 * @private
	 */
	_pickIntervalSpecialType(level) {
		const configured = ConfigManager.get('specialInterval.allowedTypes', []);
		const fallback = [
			CONSTANTS.BALL_TYPES.EXPLODING,
			CONSTANTS.BALL_TYPES.PAINTER_HORIZONTAL,
			CONSTANTS.BALL_TYPES.PAINTER_VERTICAL,
			CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NE,
			CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NW
		];

		const mapped = configured
			.map(type => CONSTANTS.BALL_TYPES[type])
			.filter(type => type);
		const candidates = mapped.length > 0 ? mapped : fallback;

		// Apply level-based feature unlock gates
		const unlocked = this._getUnlockedSpecialTypes(level);
		const pool = candidates.filter(type => unlocked.includes(type));

		if (pool.length === 0) {
			return null; // nothing unlocked at this level yet
		}
		return pool[randomInt(0, pool.length - 1)];
	}
	
	/**
	 * Pick a color for interval-based specials based on level colors
	 * @param {Number} level - Current level
	 * @param {String} specialType - Ball type constant
	 * @returns {String} Hex color code
	 * @private
	 */
	_pickIntervalSpecialColor(level, specialType) {
		if (specialType === CONSTANTS.BALL_TYPES.BLOCKING) {
			return ConfigManager.get('colors.special.blocking', '#808080');
		}
		const availableColors = this.getAvailableColors(level);
		return availableColors[randomInt(0, availableColors.length - 1)];
	}
	
	/**
	 * Force a special ball into the piece if under the max special cap
	 * @param {Array<Ball>} balls - Balls in the piece
	 * @param {String|null} forcedType - Ball type to inject
	 * @param {Array<String>} availableColors - Available normal colors
	 * @param {Number} maxSpecialBalls - Max specials per piece
	 * @returns {void}
	 * @private
	 */
	_applyForcedSpecial(balls, forcedType, forcedColor, availableColors, maxSpecialBalls) {
		if (!forcedType) {
			return;
		}
		
		const currentSpecials = balls.filter(ball => ball.isSpecial()).length;
		if (currentSpecials >= maxSpecialBalls) {
			return;
		}
		
		const normalIndices = [];
		for (let i = 0; i < balls.length; i++) {
			if (!balls[i].isSpecial()) {
				normalIndices.push(i);
			}
		}
		
		if (normalIndices.length === 0) {
			return;
		}
		
		const targetIndex = normalIndices[randomInt(0, normalIndices.length - 1)];
		const color = forcedColor || this._getIntervalSpecialColor(forcedType, availableColors);
		balls[targetIndex] = new Ball(forcedType, color);
	}
	
	/**
	 * Get color for interval-based specials, respecting level colors
	 * @param {String} ballType - Type of ball
	 * @param {Array<String>} availableColors - Available normal colors
	 * @returns {String} Hex color code
	 * @private
	 */
	_getIntervalSpecialColor(ballType, availableColors) {
		if (ballType === CONSTANTS.BALL_TYPES.BLOCKING) {
			return ConfigManager.get('colors.special.blocking', '#808080');
		}
		return availableColors[randomInt(0, availableColors.length - 1)];
	}
	
	/**
	 * Get special interval status for HUD display
	 * @returns {{enabled: Boolean, piecesUntilNext: Number|null, revealWindow: Number, nextSpecialType: String|null}}
	 */
	getSpecialIntervalStatus() {
		const enabled = ConfigManager.get('specialInterval.enabled', false);
		if (!enabled) {
			return { enabled: false, piecesUntilNext: null, revealWindow: 0, nextSpecialType: null };
		}
		
		const revealWindow = ConfigManager.get('specialInterval.revealWindow', 2);
		return {
			enabled: true,
			piecesUntilNext: this.specialPiecesUntilNext,
			revealWindow: revealWindow,
			nextSpecialType: this.nextIntervalSpecialType,
			nextSpecialColor: this.nextIntervalSpecialColor
		};
	}
	
	/**
	 * Get appropriate color for a ball type
	 * @param {String} ballType - Type of ball
	 * @param {Array<String>} availableColors - Available normal colors
	 * @returns {String} Hex color code
	 * @private
	 */
	_getColorForBallType(ballType, availableColors) {
		switch (ballType) {
			case CONSTANTS.BALL_TYPES.EXPLODING:
				return ConfigManager.get('colors.special.exploding', '#FFD700');
			case CONSTANTS.BALL_TYPES.BLOCKING:
				return ConfigManager.get('colors.special.blocking', '#808080');
			case CONSTANTS.BALL_TYPES.PAINTER_HORIZONTAL:
				return ConfigManager.get('colors.special.painterH', '#FF00FF');
			case CONSTANTS.BALL_TYPES.PAINTER_VERTICAL:
				return ConfigManager.get('colors.special.painterV', '#00FFFF');
			case CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NE:
				return ConfigManager.get('colors.special.painterD', '#FFFF00');
			case CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NW:
				return ConfigManager.get('colors.special.painterD', '#FFFF00');
			default:
				return availableColors[randomInt(0, availableColors.length - 1)];
		}
	}
	
}

// Export singleton instance
const PieceFactory = new PieceFactoryClass();
export default PieceFactory;
export { PieceFactory };
