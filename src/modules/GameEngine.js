/**
 * ============================================================================
 * GameEngine.js - Orb•Fall: ChromaCrush
 * ============================================================================
 * Copyright (c) 2025 G. Scott Tomlin. All Rights Reserved.
 * 
 * Core game loop and state management
 * 
 * Dependencies: All modules
 * Exports: GameEngine class
 * ============================================================================
 */

import Grid from './Grid.js';
import Piece from './Piece.js';
import Ball from './Ball.js';
import Renderer from './Renderer.js';
import { InputHandler } from './InputHandler.js';
import { ConfigManager } from './ConfigManager.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { CONSTANTS } from '../utils/Constants.js';
import { randomInt } from '../utils/Helpers.js';
import { PieceFactory } from './PieceFactory.js';
import { ScoreManager } from './ScoreManager.js';
import { FloatingTextManager } from './FloatingText.js';
import { DebugMode } from '../utils/DebugMode.js';
import LevelManager from './LevelManager.js';
import AnimationManager from './AnimationManager.js';
import ParticleSystem from './ParticleSystem.js';
import AudioManager from './AudioManager.js';
import StatisticsTracker from './StatisticsTracker.js';
import PlayerManager from './PlayerManager.js';
import AnalyticsManager from './AnalyticsManager.js';

/**
 * Game engine class managing core game state and loop
 */
class GameEngineClass {
	
	/**
	 * Constructor initializes game state
	 */
	constructor() {
		this.state = CONSTANTS.GAME_STATES.MENU;
		this.grid = null;
		this.renderer = null;
		this.currentPiece = null;
		this.nextPiece = null;
		this.isInitialized = false;
		
		// Game state tracking
		this.level = 1;
		this.difficulty = 1;
		
		// Game loop state
		this.lastUpdateTime = 0;
		this.dropTimer = 0;
		this.dropInterval = 1000; // Milliseconds between automatic piece drops (1 second default)
		this.basedropInterval = 1000; // Store base drop interval
		this.isSoftDropping = false; // Track if soft drop is active
		this.lockDelay = 500; // Milliseconds before piece locks after touching ground (0.5 second window for adjustments)
		this.lockTimer = 0;
		this.isLocking = false;
		this.animationFrameId = null;
		
		// Warning state tracking
		this.lastWarningSecond = null;
		this.lastDangerRow = null;
		
		// Debug mode state
		this.waitingForDebugPiece = false;
		
		// Floating text manager
		this.floatingTextManager = new FloatingTextManager();
		
		// Match highlight overlays for cascade feedback
		this.matchHighlights = [];
		
		// Guard to prevent concurrent cascade processing
		this.isHandlingMatches = false;
	}
	
	/**
	 * Initialize game engine and all subsystems
	 * @returns {Promise<void>}
	 */
	async initialize() {
		const hasConfig = ConfigManager.isConfigLoaded();
		
		// Load config if not loaded
		if (!hasConfig) {
			await ConfigManager.loadConfig();
		}
		else {
			// Config already loaded
		}
		
		// Initialize grid
		const gridRows = ConfigManager.get('game.gridRows', CONSTANTS.GRID_ROWS);
		const gridCols = ConfigManager.get('game.gridCols', CONSTANTS.GRID_COLS);
		this.grid = new Grid(gridRows, gridCols);
		
		// Initialize renderer
		const canvas = document.getElementById('gameCanvas');
		const hasCanvas = canvas !== null;
		
		// Create renderer if canvas exists
		if (hasCanvas) {
			this.renderer = new Renderer(canvas);
			this.renderer.initialize();
		}
		else {
			console.error('GameEngine: Canvas element not found');
		}
		
		// Initialize input handler
		InputHandler.initialize();
		
		// Set up touch controls for mobile
		this._setupTouchControls();
		
		// Initialize statistics tracker
		StatisticsTracker.initialize();
		
		// Set up event listeners (Phase 2+)
		this._setupEventListeners();
		
		this.isInitialized = true;
	}
	
	/**
	 * Set up touch controls for mobile devices
	 * @returns {void}
	 * @private
	 */
	_setupTouchControls() {
		// Set up kbd button controls
		const kbdButtons = document.querySelectorAll('kbd[data-action]');
		
		kbdButtons.forEach(button => {
			const action = button.getAttribute('data-action');
			
			// For soft drop, use mousedown/mouseup for hold behavior
			if (action === 'softDrop') {
				// Mouse events
				button.addEventListener('mousedown', (e) => {
					e.preventDefault();
					button.style.opacity = '0.6';
					InputHandler.triggerAction(action);
				});
				
				button.addEventListener('mouseup', (e) => {
					e.preventDefault();
					button.style.opacity = '1';
					InputHandler.triggerActionEnd(action);
				});
				
				button.addEventListener('mouseleave', (e) => {
					button.style.opacity = '1';
					InputHandler.triggerActionEnd(action);
				});
				
				// Touch events
				button.addEventListener('touchstart', (e) => {
					e.preventDefault();
					button.style.opacity = '0.6';
					InputHandler.triggerAction(action);
				});
				
				button.addEventListener('touchend', (e) => {
					e.preventDefault();
					button.style.opacity = '1';
					InputHandler.triggerActionEnd(action);
				});
			} else {
				// Other buttons use click behavior
				button.addEventListener('click', (e) => {
					e.preventDefault();
					InputHandler.triggerAction(action);
				});
				
				// Add touch feedback
				button.addEventListener('touchstart', (e) => {
					e.preventDefault();
					button.style.opacity = '0.6';
					InputHandler.triggerAction(action);
				});
				
				button.addEventListener('touchend', (e) => {
					e.preventDefault();
					button.style.opacity = '1';
				});
			}
			
			// Make button look interactive
			button.style.cursor = 'pointer';
			button.style.userSelect = 'none';
		});
		
		// Set up canvas touch controls
		this._setupCanvasTouchControls();
	}
	
	/**
	 * Set up canvas touch controls for tap and swipe gestures
	 * @returns {void}
	 * @private
	 */
	_setupCanvasTouchControls() {
		if (!this.renderer || !this.renderer.canvas) {
			// No canvas available (e.g., running in test environment)
			return;
		}
		
		const canvas = this.renderer.canvas;
		
		let touchStartX = 0;
		let touchStartY = 0;
		let touchStartTime = 0;
		let softDropTimer = null;
		
		canvas.addEventListener('touchstart', (e) => {
			if (this.state !== CONSTANTS.GAME_STATES.PLAYING) return;
			
			e.preventDefault();
			const touch = e.touches[0];
			touchStartX = touch.clientX;
			touchStartY = touch.clientY;
			touchStartTime = Date.now();
			
			// Start soft drop after holding for 200ms
			softDropTimer = setTimeout(() => {
				this._startSoftDrop();
			}, 200);
		});
		
		canvas.addEventListener('touchend', (e) => {
			if (this.state !== CONSTANTS.GAME_STATES.PLAYING) return;
			
			e.preventDefault();
			const touch = e.changedTouches[0];
			const touchEndX = touch.clientX;
			const touchEndY = touch.clientY;
			const touchEndTime = Date.now();
			
			// Clear soft drop timer and end soft drop if active
			if (softDropTimer) {
				clearTimeout(softDropTimer);
				softDropTimer = null;
			}
			this._endSoftDrop();
			
			const deltaX = touchEndX - touchStartX;
			const deltaY = touchEndY - touchStartY;
			const deltaTime = touchEndTime - touchStartTime;
			
			// Check if it's a swipe (fast movement) vs tap (quick touch)
			const isSwipeDown = deltaY > 50 && deltaTime < 300;
			const isSwipeUp = deltaY < -50 && deltaTime < 300;
			const isTap = Math.abs(deltaX) < 20 && Math.abs(deltaY) < 20 && deltaTime < 300;
			
			if (isSwipeDown) {
				// Swipe down - hard drop
				InputHandler.triggerAction('drop');
			} else if (isSwipeUp) {
				// Swipe up - rotate
				InputHandler.triggerAction('rotate');
			} else if (isTap) {
				// Tap - move left/right based on which side of canvas
				const rect = canvas.getBoundingClientRect();
				const canvasX = touchEndX - rect.left;
				const canvasWidth = rect.width;
				const centerX = canvasWidth / 2;
				
				if (canvasX < centerX) {
					InputHandler.triggerAction('moveLeft');
				} else {
					InputHandler.triggerAction('moveRight');
				}
			}
		});
		
		// Prevent default touch behavior on canvas
		canvas.addEventListener('touchmove', (e) => {
			e.preventDefault();
		}, { passive: false });
	}
	
	/**
	 * Set up event listeners for game events
	 * @returns {void}
	 * @private
	 */
	_setupEventListeners() {
		// Movement controls
		EventEmitter.on(CONSTANTS.EVENTS.MOVE_LEFT, () => this._moveLeft());
		EventEmitter.on(CONSTANTS.EVENTS.MOVE_RIGHT, () => this._moveRight());
		EventEmitter.on(CONSTANTS.EVENTS.ROTATE, () => this._rotatePiece());
		EventEmitter.on(CONSTANTS.EVENTS.SOFT_DROP, () => this._startSoftDrop());
		EventEmitter.on(CONSTANTS.EVENTS.SOFT_DROP_END, () => this._endSoftDrop());
		EventEmitter.on(CONSTANTS.EVENTS.HARD_DROP, () => this._hardDrop());
		
		// Pause/Resume
		EventEmitter.on(CONSTANTS.EVENTS.PAUSE, () => {
			if (this.state === CONSTANTS.GAME_STATES.PLAYING) {
				this.pause();
			}
			else if (this.state === CONSTANTS.GAME_STATES.PAUSED) {
				this.resume();
			}
		});
		
		// Restart
		EventEmitter.on(CONSTANTS.EVENTS.RESTART, () => this.restart());
		
		// Cascade complete - show bonus floating text
		EventEmitter.on(CONSTANTS.EVENTS.CASCADE_COMPLETE, (data) => {
			if (data.cascadeCount > 1) {
				// Show cascade bonus in center of grid in blue
				const centerX = this.renderer.offsetX + (this.grid.cols * this.renderer.cellSize) / 2;
				const centerY = this.renderer.offsetY + (this.grid.rows * this.renderer.cellSize) / 2;
				this.floatingTextManager.add(`${data.cascadeCount}x CASCADE!`, centerX, centerY, 2000, '#4080FF');
			}
		});
	}
	
	/**
	 * Move piece left
	 * @returns {void}
	 * @private
	 */
	_moveLeft() {
		const isPlaying = this.state === CONSTANTS.GAME_STATES.PLAYING;
		const hasPiece = this.currentPiece !== null;
		
		if (isPlaying && hasPiece) {
			const pos = this.currentPiece.getPosition();
			this.currentPiece.setPosition(pos.x - 1, pos.y);
			
			const isValid = this.grid.isValidPosition(this.currentPiece);
			
			if (!isValid) {
				// Move back if invalid
				this.currentPiece.setPosition(pos.x, pos.y);
			} else {
				// Play move sound
				AudioManager.playMove();
			}
		}
	}
	
	/**
	 * Move piece right
	 * @returns {void}
	 * @private
	 */
	_moveRight() {
		const isPlaying = this.state === CONSTANTS.GAME_STATES.PLAYING;
		const hasPiece = this.currentPiece !== null;
		
		if (isPlaying && hasPiece) {
			const pos = this.currentPiece.getPosition();
			this.currentPiece.setPosition(pos.x + 1, pos.y);
			
			const isValid = this.grid.isValidPosition(this.currentPiece);
			
			if (!isValid) {
				// Move back if invalid
				this.currentPiece.setPosition(pos.x, pos.y);
			} else {
				// Play move sound
				AudioManager.playMove();
			}
		}
	}
	
	/**
	 * Rotate piece clockwise with wall kicks
	 * @returns {void}
	 * @private
	 */
	_rotatePiece() {
		const isPlaying = this.state === CONSTANTS.GAME_STATES.PLAYING;
		const hasPiece = this.currentPiece !== null;
		
		if (isPlaying && hasPiece) {
			const pos = this.currentPiece.getPosition();
			
			// Try rotation
			this.currentPiece.rotate();
			
			// Check if valid at same position
			let isValid = this.grid.isValidPosition(this.currentPiece);
			
			// Try wall kicks if rotation fails
			if (!isValid) {
				const kickOffsets = [
					{ x: -1, y: 0 },  // Try left
					{ x: 1, y: 0 },   // Try right
					{ x: -2, y: 0 },  // Try far left
					{ x: 2, y: 0 },   // Try far right
					{ x: 0, y: -1 }   // Try up
				];
				
				for (let i = 0; i < kickOffsets.length; i++) {
					const kick = kickOffsets[i];
					this.currentPiece.setPosition(pos.x + kick.x, pos.y + kick.y);
					
					if (this.grid.isValidPosition(this.currentPiece)) {
						isValid = true;
						break;
					}
				}
			}
			
			// Revert if all kicks failed
			if (!isValid) {
				// Rotate back 3 times (equivalent to rotating counter-clockwise once)
				this.currentPiece.rotate();
				this.currentPiece.rotate();
				this.currentPiece.rotate();
				this.currentPiece.setPosition(pos.x, pos.y);
			} else {
				// Play rotate sound on successful rotation
				AudioManager.playRotate();
			}
		}
	}
	
	/**
	 * Hard drop piece to bottom
	 * @returns {void}
	 * @private
	 */
	_hardDrop() {
		const isPlaying = this.state === CONSTANTS.GAME_STATES.PLAYING;
		const hasPiece = this.currentPiece !== null;
		
		if (isPlaying && hasPiece) {
			const ghostY = this._getGhostPieceY();
			
			// Play drop sound when player manually drops
			AudioManager.playDrop();
			
			// Move to final position
			this.currentPiece.setPosition(this.currentPiece.getPosition().x, ghostY);
			
			// Lock immediately
			this._lockPiece();
		}
	}
	
	/**
	 * Start soft drop (2.5x speed)
	 * @returns {void}
	 * @private
	 */
	_startSoftDrop() {
		const isPlaying = this.state === CONSTANTS.GAME_STATES.PLAYING;
		const hasPiece = this.currentPiece !== null;
		
		if (isPlaying && hasPiece && !this.isSoftDropping) {
			this.isSoftDropping = true;
			this.dropInterval = this.basedropInterval / 2.5; // 2.5x speed
		}
	}
	
	/**
	 * End soft drop (return to normal speed)
	 * @returns {void}
	 * @private
	 */
	_endSoftDrop() {
		if (this.isSoftDropping) {
			this.isSoftDropping = false;
			this.dropInterval = this.basedropInterval; // Return to normal speed
		}
	}
	
	/**
	 * Calculate the Y position where the piece would land
	 * @returns {Number} Y position of ghost piece
	 * @private
	 */
	_getGhostPieceY() {
		if (!this.currentPiece) {
			return 0;
		}
		
		const pos = this.currentPiece.getPosition();
		let ghostY = pos.y;
		
		// Find lowest valid position
		for (let testY = pos.y + 1; testY < this.grid.rows; testY++) {
			this.currentPiece.setPosition(pos.x, testY);
			
			if (this.grid.isValidPosition(this.currentPiece)) {
				ghostY = testY;
			}
			else {
				// Can't go further
				break;
			}
		}
		
		// Restore original position
		this.currentPiece.setPosition(pos.x, pos.y);
		
		return ghostY;
	}
	
	/**
	 * Request next piece from PieceFactory (handles debug mode)
	 * @private
	 */
	_requestNextPiece() {
		if (DebugMode.isEnabled()) {
			this.waitingForDebugPiece = true;
			PieceFactory.generatePiece(this.level, this.difficulty, (piece) => {
				// If currentPiece is null (waiting for this piece), spawn it now
				if (!this.currentPiece) {
					this.currentPiece = piece;
					this.waitingForDebugPiece = false;
					
					// Position at top center
					const startX = Math.floor(this.grid.cols / 2) - Math.floor(this.currentPiece.getWidth() / 2);
					this.currentPiece.setPosition(startX, 0);
					
				// Check if new piece collides (game over)
				const isValid = this.grid.isValidPosition(this.currentPiece);
				if (!isValid) {
					this._levelComplete('breach');
					return;
				}					// Don't request next piece yet - wait until this piece locks
					// The next piece will be requested in _lockPiece() after cascade completes
				} else {
					// This is the preview piece
					this.nextPiece = piece;
					this.waitingForDebugPiece = false;
				}
			});
		} else {
			this.nextPiece = PieceFactory.generatePiece(this.level, this.difficulty);
		}
	}
	
	/**
	 * Start a new game
	 * @param {Number} difficulty - Difficulty level (1-5)
	 * @param {Number} level - Starting level number
	 * @param {String} mode - Game mode (CLASSIC, ZEN, GAUNTLET, RISING_TIDE)
	 * @returns {void}
	 */
	start(difficulty, level, mode = 'CLASSIC') {
		const isInitialized = this.isInitialized;
		
		// Check if initialized
		if (!isInitialized) {
			console.error('GameEngine: Not initialized. Call initialize() first.');
			return;
		}
		else {
			// Ready to start
		}
		
		// Store game state
		this.level = level || 1;
		this.difficulty = difficulty || 1;
		this.gameMode = mode || 'CLASSIC';
		this.modeConfig = CONSTANTS.GAME_MODE_CONFIG[this.gameMode];
		
		// Set game mode in PieceFactory for mode-specific spawn rates
		PieceFactory.setGameMode(this.gameMode);
		
		// Initialize mode-specific timers
		if (this.gameMode === 'RISING_TIDE' || this.gameMode === 'GAUNTLET') {
			this.risingTideTimer = 0;
			this.risingTideInterval = this.modeConfig.risingInterval;
		}
		
		// Record game start in player stats
		PlayerManager.updateStats({ gameStarted: true });
		
		// Initialize LevelManager (handle timed vs untimed modes)
		LevelManager.setLevel(this.level);
		if (this.modeConfig.timed) {
			LevelManager.startTimer();
		} else {
			// For untimed modes, hide or disable timer
			LevelManager.stopTimer();
		}
		
		// Update available colors display
		this._updateAvailableColorsDisplay();
		
		// Clear grid
		this.grid.clear();
		
		// Pre-fill rows if in GAUNTLET mode
		if (this.gameMode === 'GAUNTLET') {
			this._preFillRows(this.modeConfig.preFillRows);
		}
		
		// Reset statistics with current level
		StatisticsTracker.reset(this.level);
		
		// Reset PieceFactory
		PieceFactory.reset();
		
		// Initialize ScoreManager
		ScoreManager.initialize(this.difficulty, this.level);
		
		// Set drop speed based on difficulty
		this.dropInterval = Math.max(200, 1000 - (difficulty * 150));
		this.basedropInterval = this.dropInterval;
		
		// Generate pieces (in debug mode, this will be async via callback)
		if (DebugMode.isEnabled()) {
			// In debug mode, request current piece (it will be spawned via callback)
			this._requestNextPiece();
		} else {
			// Normal mode: generate synchronously
			this.currentPiece = PieceFactory.generatePiece(this.level, this.difficulty);
			this._requestNextPiece();
			
			// Position current piece at top center
			const startX = Math.floor(this.grid.cols / 2) - Math.floor(this.currentPiece.getWidth() / 2);
			this.currentPiece.setPosition(startX, 0);
		}
		
		// Reset timers
		this.dropTimer = 0;
		this.lockTimer = 0;
		this.isLocking = false;
		this.lastUpdateTime = performance.now();
		
		// Update HUD displays
		const modeDisplay = document.getElementById('modeDisplay');
		if (modeDisplay) {
			// Format mode name nicely
			const modeNames = {
				'CLASSIC': 'Classic',
				'ZEN': 'Zen',
				'GAUNTLET': 'Gauntlet',
				'RISING_TIDE': 'Rising Tide'
			};
			modeDisplay.textContent = modeNames[this.gameMode] || this.gameMode;
		}
		
		const difficultyDisplay = document.getElementById('difficultyDisplay');
		if (difficultyDisplay) {
			difficultyDisplay.textContent = this.difficulty;
		}
		
		const levelDisplay = document.getElementById('levelDisplay');
		if (levelDisplay) {
			levelDisplay.textContent = this.level;
		}
		
		// Show/hide timer based on mode
		const timerElement = document.querySelector('.hud-item.timer');
		if (timerElement) {
			if (this.gameMode === 'ZEN') {
				timerElement.style.display = 'none';
			} else {
				timerElement.style.display = '';
			}
		}
		
		// Update state
		this.state = CONSTANTS.GAME_STATES.PLAYING;
		
		// Initial render
		this.render();
		
		// Start game loop
		this._gameLoop();
	}
	
	/**
	 * Render current game state
	 * @returns {void}
	 */
	render() {
		const hasRenderer = this.renderer !== null;
		
		// Render if renderer exists
		if (hasRenderer) {
			this.renderer.clear();
			this.renderer.renderGrid(this.grid);
			
			const hasPiece = this.currentPiece !== null;
			
			// Render ghost piece (shadow showing where piece will land)
			if (hasPiece) {
				const pos = this.currentPiece.getPosition();
				const ghostY = this._getGhostPieceY();
				
				// Only render ghost if it's below current position
				if (ghostY > pos.y) {
					this.renderer.renderGhostPiece(this.currentPiece, pos.x, ghostY);
				}
			}
			
			// Render current piece
			if (hasPiece) {
				const pos = this.currentPiece.getPosition();
				this.renderer.renderPiece(this.currentPiece, pos.x, pos.y);
			}
			else {
				// No piece to render
			}
			
			// Render match highlights (non-blocking overlay)
			this._pruneMatchHighlights();
			this.renderer.renderMatchHighlights(this.matchHighlights);
			
			// Render next piece preview (skip if debug mode is waiting for selection)
			const hasNextPiece = this.nextPiece !== null;
			const previewCanvas = document.getElementById('previewCanvas');
			const hasPreviewCanvas = previewCanvas !== null;
			const isDebugWaiting = DebugMode.isEnabled() && this.waitingForDebugPiece;
			
			// Render preview if available and not in debug selection mode
			if (hasNextPiece && hasPreviewCanvas && !isDebugWaiting) {
				this.renderer.renderNextPiece(this.nextPiece, previewCanvas);
			}
			else {
				// No preview to render
			}
			
			// Update and render floating texts
			this.floatingTextManager.update();
			this.floatingTextManager.render(this.renderer.ctx);
			
			// Render animations
			this.renderer.renderAnimations();
			
			// Render particles
			ParticleSystem.render(this.renderer.ctx);
			
			// Update HUD elements
			this._updateHUD();
		}
		else {
			// No renderer available
		}
	}
	
	/**
	 * Update HUD display elements
	 * @private
	 */
	_updateHUD() {
		// Update timer display
		const timerDisplay = document.getElementById('timerDisplay');
		if (timerDisplay) {
			const timeRemaining = LevelManager.getRemainingTime();
			timerDisplay.textContent = LevelManager.getTimerDisplay();
			
			// Play warning beep in last 5 seconds
			if (timeRemaining <= 5 && timeRemaining > 0) {
				const currentSecond = Math.floor(timeRemaining);
				if (!this.lastWarningSecond || this.lastWarningSecond !== currentSecond) {
					this.lastWarningSecond = currentSecond;
					AudioManager.playTimeWarning();
				}
			}
		}
		
		// Update score display
		const scoreDisplay = document.getElementById('scoreDisplay');
		if (scoreDisplay) {
			scoreDisplay.textContent = ScoreManager.getScore();
		}
		
		// Update level display
		const levelDisplay = document.getElementById('levelDisplay');
		if (levelDisplay) {
			levelDisplay.textContent = this.level;
		}
		
		// Update special interval indicator
		const specialIndicator = document.getElementById('specialIndicator');
		const specialIndicatorIcon = document.getElementById('specialIndicatorIcon');
		const specialIndicatorText = document.getElementById('specialIndicatorText');
		if (specialIndicator && specialIndicatorIcon && specialIndicatorText) {
			const intervalStatus = PieceFactory.getSpecialIntervalStatus?.();
			const canShow = intervalStatus && intervalStatus.enabled && intervalStatus.piecesUntilNext !== null;
			if (canShow) {
				const inRevealWindow = intervalStatus.piecesUntilNext > 0 && intervalStatus.piecesUntilNext <= intervalStatus.revealWindow;
				if (inRevealWindow && intervalStatus.nextSpecialType) {
					const meta = this._getSpecialIndicatorMeta(intervalStatus.nextSpecialType);
					specialIndicatorIcon.className = `special-indicator-icon ${meta.className}`;
					specialIndicatorIcon.textContent = '';
					if (intervalStatus.nextSpecialColor) {
						specialIndicatorIcon.style.backgroundColor = intervalStatus.nextSpecialColor;
						specialIndicatorIcon.style.boxShadow = `0 0 8px ${intervalStatus.nextSpecialColor}`;
					} else {
						specialIndicatorIcon.style.backgroundColor = '';
						specialIndicatorIcon.style.boxShadow = '';
					}
					specialIndicatorText.textContent = `Next: ${meta.label} in ${intervalStatus.piecesUntilNext}`;
				} else {
					specialIndicatorIcon.className = 'special-indicator-icon pending';
					specialIndicatorIcon.textContent = '?';
					specialIndicatorIcon.style.backgroundColor = '';
					specialIndicatorIcon.style.boxShadow = '';
					specialIndicatorText.textContent = `Special in ${intervalStatus.piecesUntilNext}`;
				}
				specialIndicator.style.display = '';
			} else {
				specialIndicator.style.display = 'none';
			}
		}
	}
	
	/**
	 * Get label and CSS class for a special indicator
	 * @param {String} specialType - Ball type constant
	 * @returns {{label: String, className: String}} Indicator metadata
	 * @private
	 */
	_getSpecialIndicatorMeta(specialType) {
		const metaMap = {
			[CONSTANTS.BALL_TYPES.EXPLODING]: { label: 'Exploding', className: 'exploding' },
			[CONSTANTS.BALL_TYPES.PAINTER_HORIZONTAL]: { label: 'Painter H', className: 'painter-h' },
			[CONSTANTS.BALL_TYPES.PAINTER_VERTICAL]: { label: 'Painter V', className: 'painter-v' },
			[CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NE]: { label: 'Painter DNE', className: 'painter-dne' },
			[CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NW]: { label: 'Painter DNW', className: 'painter-dnw' }
		};
		return metaMap[specialType] || { label: 'Special', className: 'pending' };
	}
	
	/**
	 * Update game state
	 * @param {Number} deltaTime - Time elapsed since last update in milliseconds
	 * @returns {void}
	 */
	update(deltaTime) {
		const isPlaying = this.state === CONSTANTS.GAME_STATES.PLAYING;
		
		// Only update if playing
		if (!isPlaying) {
			return;
		}
		else {
			// Game is active, update state
		}
		
		// Update level timer (only for timed modes)
		if (this.modeConfig && this.modeConfig.timed) {
			const deltaSeconds = deltaTime / 1000;
			const timeUp = LevelManager.updateTimer(deltaSeconds);
			if (timeUp) {
				this._levelComplete();
				return;
			}
		}
		
		// Update Rising Tide/Gauntlet timer if enabled for this mode
		if (this.modeConfig && this.modeConfig.risingBlocks) {
			this.risingTideTimer += deltaTime;
			if (this.risingTideTimer >= this.risingTideInterval) {
				this.risingTideTimer = 0;
				this._addRisingTideRow();
			}
		}
		
		const hasPiece = this.currentPiece !== null;
		
		// Pause if waiting for debug piece selection AND we don't have a current piece
		// (Only block when waiting for the CURRENT piece, not the preview piece)
		if (this.waitingForDebugPiece && !hasPiece) {
			return;
		}
		
		// Can't update without a piece
		if (!hasPiece) {
			return;
		}
		else {
			// Piece exists, continue
		}
		
		// Update drop timer
		this.dropTimer += deltaTime;
		
		// Check if it's time to drop
		const shouldDrop = this.dropTimer >= this.dropInterval;
		
		if (shouldDrop) {
			this.dropTimer = 0;
			this._dropPiece();
		}
		else {
			// Not time to drop yet
		}
		
		// Update lock timer if piece is at bottom
		if (this.isLocking) {
			this.lockTimer += deltaTime;
			
			const shouldLock = this.lockTimer >= this.lockDelay;
			
			if (shouldLock) {
				this._lockPiece();
			}
			else {
				// Still waiting to lock
			}
		}
		else {
			// Piece not at bottom
		}
	}
	
	/**
	 * Drop current piece one row
	 * @returns {void}
	 * @private
	 */
	_dropPiece() {
		const pos = this.currentPiece.getPosition();
		const newY = pos.y + 1;
		
		// Try to move piece down
		this.currentPiece.setPosition(pos.x, newY);
		
		const isValid = this.grid.isValidPosition(this.currentPiece);
		
		if (isValid) {
			// Piece moved successfully
			this.isLocking = false;
			this.lockTimer = 0;
		}
		else {
			// Hit bottom or collision, move back and start locking
			this.currentPiece.setPosition(pos.x, pos.y);
			this.isLocking = true;
		}
	}
	
	/**
	 * Lock current piece to grid and spawn next piece
	 * @returns {void}
	 * @private
	 */
	async _lockPiece() {
		// Play lock sound
		AudioManager.playLock();
		
		// Place piece on grid
		this.grid.placePiece(this.currentPiece);
		
		// Check for matches and handle cascades
		await this._handleMatching();
		
		// Spawn next piece (handle debug mode)
		this.currentPiece = this.nextPiece;
		
		// Request next piece (may be async in debug mode)
		// Don't request if already waiting for one
		if (!this.waitingForDebugPiece) {
			this._requestNextPiece();
		}
		
		// If currentPiece is null (debug mode waiting), skip positioning until piece is ready
		if (!this.currentPiece) {
			this.isLocking = false;
			this.lockTimer = 0;
			return;
		}
		
		// Position at top center
		const startX = Math.floor(this.grid.cols / 2) - Math.floor(this.currentPiece.getWidth() / 2);
		this.currentPiece.setPosition(startX, 0);
		
		// Reset lock state
		this.isLocking = false;
		this.lockTimer = 0;
		
	// Check if new piece collides (game over)
	const isValid = this.grid.isValidPosition(this.currentPiece);
	
	if (!isValid) {
		// In ZEN mode, grid breach is success (play until grid fills)
		// In other modes, it's failure
		const reason = this.gameMode === 'ZEN' ? 'timeout' : 'breach';
		this._levelComplete(reason);
	}
	else {
		// Check for dangerous stack height (75% up the board = row 6 or less)
		const highestBall = this.grid.getHighestBallRow();
		const dangerThreshold = Math.floor(this.grid.rows * 0.25); // Top 25% of board
		
		if (highestBall !== -1 && highestBall <= dangerThreshold) {
			// Stack is dangerously high - play alarm
			if (!this.lastDangerRow || this.lastDangerRow !== highestBall) {
				this.lastDangerRow = highestBall;
				AudioManager.playStackDanger();
			}
		} else {
			this.lastDangerRow = null; // Reset when safe
		}
	}
}	/**
	 * Handle matching and cascading
	 * @returns {Promise<void>}
	 * @private
	 */
	async _handleMatching() {
		// Prevent concurrent cascade processing
		if (this.isHandlingMatches) {
			return;
		}
		
		this.isHandlingMatches = true;
		
		// Track scoring events for celebration
		let totalScoringEvents = 0;
		
		let cascadeCount = 0;
		const matchDelay = ConfigManager.get('animations.matchDetectionDelay', 0);
		const clearDelay = ConfigManager.get('animations.clearAnimationDuration', 300);
		const cascadeDelay = ConfigManager.get('animations.cascadeCheckDelay', 0);
		
		// Import DebugMode dynamically
		const DebugModeModule = await import('../utils/DebugMode.js');
		const DebugMode = DebugModeModule.default;
		
		// Reset step counter at start of cascade
		if (DebugMode.enabled && DebugMode.stepMode) {
			DebugMode.resetStepCounter();
		}
		
		// Cascade loop
		while (true) {
			// Wait for match detection delay
			if (matchDelay > 0) {
				await this._delay(matchDelay);
			}
			
			// Find matches
			const matches = this.grid.findMatches();
			
			if (matches.length === 0) {
				break; // No more matches
			}
			
	cascadeCount++;
		this._queueMatchHighlights(matches, cascadeCount);
	
	
	// DEBUG: Wait for user to advance step
	if (DebugMode.enabled && DebugMode.stepMode) {
		await DebugMode.waitForStep();
	}
	
	// Build set of positions already in matches to avoid double-counting explosions
	const matchedPositions = new Set();
	matches.forEach(match => {
		match.positions.forEach(pos => {
			matchedPositions.add(`${pos.row},${pos.col}`);
		});
	});	// Process special balls FIRST (priority order)
	// 1. Process explosions
	const explodedPositions = this.grid.processExplosions(matches);	
	// Count exploded balls NOT already in matches
	let explodedNotInMatches = 0;
	if (explodedPositions.length > 0) {
		explodedPositions.forEach(pos => {
			const posKey = `${pos.row},${pos.col}`;
			if (pos.ball && !matchedPositions.has(posKey)) {
				explodedNotInMatches++;
			}
		});
	}
	
	// Emit BALLS_CLEARED event ONLY for exploded balls not in original matches
	if (explodedNotInMatches > 0) {
		// Build ball data array from exploded positions for statistics
		const ballData = explodedPositions
			.filter(pos => pos.ball && !matchedPositions.has(`${pos.row},${pos.col}`))
			.map(pos => ({
				type: pos.ball.type,
				color: pos.ball.color
			}));
		
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { 
			count: explodedNotInMatches,
			balls: ballData
		});
	}
	
	// Count explosions as scoring events (only new ones)
	if (explodedNotInMatches > 0) {
		totalScoringEvents += explodedNotInMatches;
	}
		
		// Play explosion sound if any balls exploded
		if (explodedPositions.length > 0) {
			AudioManager.playExplosion();
		}
		
		// Create explosion particles, animations, and floating text
		if (explodedPositions.length > 0) {
			// Calculate center of all exploded positions
			let totalRow = 0;
			let totalCol = 0;
			for (const pos of explodedPositions) {
				totalRow += pos.row;
				totalCol += pos.col;
				
				const screenX = pos.col * this.renderer.cellSize + this.renderer.offsetX;
				const screenY = pos.row * this.renderer.cellSize + this.renderer.offsetY;
				
				// Create explosion particles (golden/orange burst)
				ParticleSystem.createExplosion(screenX, screenY, '#FFD700', 30);
				
				// Trigger explosion animation
				AnimationManager.animateExplosion(pos.row, pos.col, 3, null);
			}
			
		// Show floating text with count of exploded balls at center
		const centerRow = totalRow / explodedPositions.length;
		const centerCol = totalCol / explodedPositions.length;
		const centerX = centerCol * this.renderer.cellSize + this.renderer.offsetX;
		const centerY = centerRow * this.renderer.cellSize + this.renderer.offsetY;
		this.floatingTextManager.add(`${explodedPositions.length}`, centerX, centerY, 1500, '#FFD700');
	}
	
	// 2. Process painters (paint lines before clearing)
	const paintedPositions = this.grid.processPainters(matches);
	
	console.log(`🎨 processPainters returned ${paintedPositions.length} painted positions`);
	
	// Track positions of painters that triggered (they should always be cleared)
	const painterPositions = new Set();
	for (const match of matches) {
		for (const pos of match.positions) {
			const ball = this.grid.getBallAt(pos.row, pos.col);
			if (ball && ball.isPainter()) {
				painterPositions.add(`${pos.row},${pos.col}`);
				console.log(`🎯 Original painter tracked: (${pos.row},${pos.col}) type=${ball.getType()} direction=${ball.getPainterDirection()}`);
			}
		}
	}
	
	// 3. Chain reaction loop - keep processing special balls until no more trigger
	let matchesToClear = matches;
	let newExplosions = [];
	let allChainPaintings = [];
	
	// Track which painters have already been processed to avoid infinite loops
	const processedPainters = new Set();
	for (const match of matches) {
		for (const pos of match.positions) {
			const ball = this.grid.getBallAt(pos.row, pos.col);
			if (ball && ball.isPainter()) {
				processedPainters.add(`${pos.row},${pos.col}`);
			}
		}
	}
	
	if (paintedPositions.length > 0) {
		console.log(`🎨 Initial painter triggered, painted ${paintedPositions.length} positions`);
		
		// Keep processing chain reactions until no new special balls trigger
		let keepProcessing = true;
		let iterationCount = 0;
		const maxIterations = 10; // Prevent infinite loops
		
		while (keepProcessing && iterationCount < maxIterations) {
			iterationCount++;
			console.log(`🔄 Chain iteration ${iterationCount}: re-finding matches...`);
			
			// Re-find matches after painting
			matchesToClear = this.grid.findMatches();
			console.log(`🔍 Found ${matchesToClear.length} matches after painting`);
			
			// Log what's in the matches
			matchesToClear.forEach((match, idx) => {
				console.log(`  Match ${idx}: ${match.direction}, ${match.positions.length} balls, color=${match.color}`);
				match.positions.forEach(pos => {
					const ball = this.grid.getBallAt(pos.row, pos.col);
					console.log(`    (${pos.row},${pos.col}): type=${ball?.getType()}`);
				});
			});
			
			// Process special balls in the new matches (but skip already-processed painters)
			const iterationExplosions = this.grid.processExplosions(matchesToClear);
			
			// For painters, only process ones we haven't seen before
			const newPainterMatches = matchesToClear.map(match => ({
				...match,
				positions: match.positions.filter(pos => {
					const ball = this.grid.getBallAt(pos.row, pos.col);
					const posKey = `${pos.row},${pos.col}`;
					// Keep position if it's not a painter, OR if it's a painter we haven't processed yet
					return !ball || !ball.isPainter() || !processedPainters.has(posKey);
				})
			})).filter(match => match.positions.length >= 3); // Keep matches with 3+ positions
			
			const iterationPaintings = this.grid.processPainters(newPainterMatches);
			
			console.log(`💥 Iteration ${iterationCount}: ${iterationExplosions.length} explosions, ${iterationPaintings.length} paintings`);
			
			// Track new painters that triggered
			if (iterationPaintings.length > 0) {
				console.log(`🎨 New painters triggered in iteration ${iterationCount}`);
				for (const match of newPainterMatches) {
					for (const pos of match.positions) {
						const ball = this.grid.getBallAt(pos.row, pos.col);
						if (ball && ball.isPainter()) {
							const posKey = `${pos.row},${pos.col}`;
							painterPositions.add(posKey);
							processedPainters.add(posKey);
							console.log(`  📌 Painter at (${pos.row},${pos.col}) direction=${ball.getPainterDirection()}`);
						}
					}
				}
				allChainPaintings.push(...iterationPaintings);
			}
			
			// If explosions triggered, handle their effects
			if (iterationExplosions.length > 0) {
				newExplosions.push(...iterationExplosions);
				
				AudioManager.playExplosion();
				
				// Build ball data for explosions
				const explosionBallData = iterationExplosions
					.filter(pos => pos.ball)
					.map(pos => ({
						type: pos.ball.type,
						color: pos.ball.color
					}));
				
				// Emit BALLS_CLEARED for exploded balls
				EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, {
					count: iterationExplosions.length,
					balls: explosionBallData
				});
				
				for (const pos of iterationExplosions) {
					const screenX = pos.col * this.renderer.cellSize + this.renderer.offsetX;
					const screenY = pos.row * this.renderer.cellSize + this.renderer.offsetY;
					ParticleSystem.createExplosion(screenX, screenY, '#FFD700', 30);
					AnimationManager.animateExplosion(pos.row, pos.col, 3, null);
				}
				
				// Show floating text for explosions
				let totalRow = 0;
				let totalCol = 0;
				for (const pos of iterationExplosions) {
					totalRow += pos.row;
					totalCol += pos.col;
				}
				const centerRow = totalRow / iterationExplosions.length;
				const centerCol = totalCol / iterationExplosions.length;
				const centerX = centerCol * this.renderer.cellSize + this.renderer.offsetX;
				const centerY = centerRow * this.renderer.cellSize + this.renderer.offsetY;
				this.floatingTextManager.add(`${iterationExplosions.length}`, centerX, centerY, 1500, '#FFD700');
			}
			
			// Continue if new special balls triggered
			keepProcessing = iterationExplosions.length > 0 || iterationPaintings.length > 0;
		}
		
		// Final match detection after all chain reactions
		matchesToClear = this.grid.findMatches();
	}
	
	// 4. Build set of ALL exploded positions (original + new from painted balls)
	const explodedPositionSet = new Set();
	const allExplosions = [...explodedPositions, ...newExplosions];
	if (allExplosions.length > 0) {
		allExplosions.forEach(pos => {
			explodedPositionSet.add(`${pos.row},${pos.col}`);
		});
	}
	// 5. Filter out exploded positions from matches (balls already removed)
	if (explodedPositionSet.size > 0) {
		matchesToClear = matchesToClear.filter(match => {
			// Keep match if it has at least one position that wasn't exploded
			return match.positions.some(pos => {
				const key = `${pos.row},${pos.col}`;
				return !explodedPositionSet.has(key);
			});
		}).map(match => {
			// Remove exploded positions from the match
			return {
				...match,
				positions: match.positions.filter(pos => {
					const key = `${pos.row},${pos.col}`;
					return !explodedPositionSet.has(key);
				})
			};
		});
	}
	
	// 6. Clear matched balls (only non-exploded ones) and track positions
	let clearedPositions = [];
	if (matchesToClear.length > 0) {
		clearedPositions = await this._clearMatches(matchesToClear, clearDelay);
	}
	
	// Also clear painter positions that triggered (even if no longer in matches after explosion)
	const paintersToClear = [];
	for (const posStr of painterPositions) {
		if (!explodedPositionSet.has(posStr)) {
			const [row, col] = posStr.split(',').map(Number);
			const ball = this.grid.getBallAt(row, col);
			if (ball) {
				const ballData = { type: ball.type, color: ball.color };
				this.grid.removeBallAt(row, col);
				paintersToClear.push({ row, col, ball: ballData });
			}
		}
	}
	
	// Emit event for painter clears if any
	if (paintersToClear.length > 0) {
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, {
			count: paintersToClear.length,
			balls: paintersToClear.map(p => p.ball)
		});
	}

	// Combine all exploded, cleared, and painter positions for gravity
	const allRemovedPositions = [
		...allExplosions.map(p => ({ row: p.row, col: p.col })),
		...clearedPositions,
		...paintersToClear.map(p => ({ row: p.row, col: p.col }))
	];

	// Count matches as scoring events (use actual cleared matches count)
	totalScoringEvents += matchesToClear.length;
	
	// Apply gravity only to affected columns (performance optimization)
	await this._applyGravity(allRemovedPositions);
	
	// Emit CASCADE event to advance to next cascade level for scoring
	EventEmitter.emit(CONSTANTS.EVENTS.CASCADE, { level: cascadeCount });
			
			// Wait before checking for next cascade
			if (cascadeDelay > 0) {
				await this._delay(cascadeDelay);
			}
		}
		
	// Emit cascade event for scoring (only if we had any cascades)
	if (cascadeCount > 0) {
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount });
		// Play cascade sound with escalating pitch
		AudioManager.playCascade(cascadeCount);
	} else {
		// No cascades means no matches - reset cascade data in ScoreManager
		this.scoreManager?.resetCascadeData?.();
	}
	
	// Play celebration if we had 5+ scoring events
	if (totalScoringEvents >= 5) {
		AudioManager.playCelebration();
	}
	
	// Reset step counter after cascade completes
		if (DebugMode.enabled && DebugMode.stepMode) {
			DebugMode.resetStepCounter();
		}
		
		// Release the guard
		this.isHandlingMatches = false;
	}
	
	/**
	 * Store match highlights for brief cascade feedback
	 * @param {Array<Object>} matches - Array of match objects
	 * @param {Number} cascadeLevel - Current cascade level
	 * @returns {void}
	 * @private
	 */
	_queueMatchHighlights(matches, cascadeLevel) {
		const duration = ConfigManager.get('animations.matchHighlightDuration', 200);
		const now = performance.now();
		
		matches.forEach(match => {
			this.matchHighlights.push({
				positions: match.positions,
				color: match.color,
				cascadeLevel: cascadeLevel,
				createdAt: now,
				duration: duration
			});
		});
	}
	
	/**
	 * Remove expired match highlights
	 * @returns {void}
	 * @private
	 */
	_pruneMatchHighlights() {
		if (this.matchHighlights.length === 0) {
			return;
		}
		
		const now = performance.now();
		this.matchHighlights = this.matchHighlights.filter(highlight => {
			return now - highlight.createdAt <= highlight.duration;
		});
	}
	
	/**
	 * Clear matched balls from grid
	 * @param {Array<Object>} matches - Array of match objects
	 * @param {Number} duration - Animation duration in ms
	 * @returns {Promise<Array<{row: Number, col: Number}>>} Array of cleared positions
	 * @private
	 */
	async _clearMatches(matches, duration) {
		// Play clear sound (pitch based on number of balls)
		const totalBalls = matches.reduce((sum, match) => sum + match.positions.length, 0);
		AudioManager.playClear(totalBalls);
		
		// Collect all positions to clear grouped by match
		const matchGroups = [];
		
		for (const match of matches) {
			const positions = [];
			for (const pos of match.positions) {
				positions.push({ row: pos.row, col: pos.col });
			}
			matchGroups.push({ positions, color: match.color });
		}
		
		// Calculate points per ball (base points only, cascade bonus added later)
		const basePoints = ConfigManager.get('scoring.basePointsPerBall', 1);
		const difficultyMultiplier = ConfigManager.get(`scoring.difficultyMultipliers.difficulty${this.difficulty}`, 1.0);
		
		// Collect all positions to clear
		const positionsToClear = new Set();
		
		for (const match of matches) {
			for (const pos of match.positions) {
				positionsToClear.add(`${pos.row},${pos.col}`);
			}
		}
		
		// Flash animation - mark balls for flashing
		const ballsToFlash = [];
		for (const posStr of positionsToClear) {
			const [row, col] = posStr.split(',').map(Number);
			const ball = this.grid.getBallAt(row, col);
			if (ball) {
				ballsToFlash.push({ row, col, ball });
			}
		}
		
		// Flash 3 times
		const flashCount = 3;
		const flashDuration = Math.floor(duration / (flashCount * 2));
		
		for (let i = 0; i < flashCount; i++) {
			// Make balls white
			for (const item of ballsToFlash) {
				const originalColor = item.ball.getColor();
				item.ball.color = '#FFFFFF';
				item.originalColor = originalColor;
			}
			this.render();
			await this._delay(flashDuration);
			
			// Restore original colors
			for (const item of ballsToFlash) {
				if (item.originalColor) {
					item.ball.color = item.originalColor;
				}
			}
			this.render();
			await this._delay(flashDuration);
		}
		
		// Add floating text for each match group
		for (const group of matchGroups) {
			// Create particle burst for each ball
			for (const pos of group.positions) {
				const x = pos.col * this.renderer.cellSize + this.renderer.offsetX;
				const y = pos.row * this.renderer.cellSize + this.renderer.offsetY;
				ParticleSystem.createBurst(x, y, [group.color, '#ffffff', '#00ff88']);
			}
		}
		
	// Show single floating text with total ball count at center of all cleared positions
	if (positionsToClear.size > 0) {
		let totalRow = 0, totalCol = 0;
		for (const posStr of positionsToClear) {
			const [row, col] = posStr.split(',').map(Number);
			totalRow += row;
			totalCol += col;
		}
		const centerX = (totalCol / positionsToClear.size) * this.renderer.cellSize + this.renderer.offsetX;
		const centerY = (totalRow / positionsToClear.size) * this.renderer.cellSize + this.renderer.offsetY;
		this.floatingTextManager.add(`${positionsToClear.size}`, centerX, centerY, 1500);
	}
	
	// Animate clearing
	const positions = Array.from(positionsToClear).map(posStr => {
		const [row, col] = posStr.split(',').map(Number);
		return { row, col };
	});
	AnimationManager.animateClearBalls(positions, null);
	
	// Capture ball data BEFORE removing from grid for statistics
	const ballData = [];
	for (const posStr of positionsToClear) {
		const [row, col] = posStr.split(',').map(Number);
		const ball = this.grid.getBallAt(row, col);
		if (ball) {
			ballData.push({ type: ball.type, color: ball.color });
		}
	}
	
	// Remove balls from grid
	const clearedPositions = [];
	for (const posStr of positionsToClear) {
		const [row, col] = posStr.split(',').map(Number);
		this.grid.removeBallAt(row, col);
		clearedPositions.push({ row, col });
	}

	this.render();
		
		// Emit clear event with ball data for statistics
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { 
			count: positionsToClear.size,
			balls: ballData // Ball type/color data for statistics
		});
		
		return clearedPositions;
	}	/**
	 * Apply gravity to make balls fall
	 * @param {Array<{row: Number, col: Number}>} removedPositions - Positions of removed balls
	 * @returns {Promise<void>}
	 * @private
	 */
	async _applyGravity(removedPositions = []) {
		const dropSpeed = ConfigManager.get('animations.dropAnimationSpeed', 50);
		let ballsMoved = true;
		
		console.log('[_applyGravity] Starting gravity');
		
		// Keep dropping until no balls can fall
		while (ballsMoved) {
			ballsMoved = false;
			
			// Step 1: Find all balls connected to the bottom (anchored balls)
			const anchored = new Set();
			
			// Start flood fill from bottom row
			const queue = [];
			for (let col = 0; col < this.grid.cols; col++) {
				if (this.grid.getBallAt(this.grid.rows - 1, col) !== null) {
					queue.push({ row: this.grid.rows - 1, col });
					anchored.add(`${this.grid.rows - 1},${col}`);
				}
			}
			
			// Flood fill to find all connected balls (including diagonals)
			while (queue.length > 0) {
				const { row, col } = queue.shift();
				
				// Check all 8 directions
				const directions = [
					[-1, 0], [1, 0], [0, -1], [0, 1],     // orthogonal
					[-1, -1], [-1, 1], [1, -1], [1, 1]    // diagonal
				];
				
				for (const [dr, dc] of directions) {
					const newRow = row + dr;
					const newCol = col + dc;
					const key = `${newRow},${newCol}`;
					
					if (newRow >= 0 && newRow < this.grid.rows && 
					    newCol >= 0 && newCol < this.grid.cols) {
						if (this.grid.getBallAt(newRow, newCol) !== null && !anchored.has(key)) {
							anchored.add(key);
							queue.push({ row: newRow, col: newCol });
						}
					}
				}
			}
			
			// Step 2: Drop all unanchored balls one row down
			// Scan from bottom to top to avoid moving same ball twice
			for (let row = this.grid.rows - 2; row >= 0; row--) {
				for (let col = 0; col < this.grid.cols; col++) {
					const key = `${row},${col}`;
					const ball = this.grid.getBallAt(row, col);
					
					// If there's a ball and it's not anchored and space below is empty
					if (ball && !anchored.has(key) && this.grid.getBallAt(row + 1, col) === null) {
						// Move ball down
						this.grid.setBallAt(row + 1, col, ball);
						this.grid.removeBallAt(row, col);
						ballsMoved = true;
					}
				}
			}
			
			// Render and wait
			if (ballsMoved) {
				this.render();
				await this._delay(dropSpeed);
			}
		}
		
		console.log('[_applyGravity] Gravity complete');
	}
	
	/**
	 * Helper to create a delay
	 * @param {Number} ms - Milliseconds to wait
	 * @returns {Promise<void>}
	 * @private
	 */
	_delay(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
	
	/**
	 * Main game loop
	 * @returns {void}
	 * @private
	 */
	_gameLoop() {
		const currentTime = performance.now();
		const deltaTime = currentTime - this.lastUpdateTime;
		this.lastUpdateTime = currentTime;
		
		// Update animations and particles
		AnimationManager.update(currentTime);
		ParticleSystem.update(deltaTime);
		
		// Update game state
		this.update(deltaTime);
		
		// Render
		this.render();
		
		// Continue loop if playing or level complete (for particles)
		const isPlaying = this.state === CONSTANTS.GAME_STATES.PLAYING;
		const isLevelComplete = this.state === CONSTANTS.GAME_STATES.LEVEL_COMPLETE;
		
		if (isPlaying || isLevelComplete) {
			this.animationFrameId = requestAnimationFrame(() => this._gameLoop());
		}
		else {
			// Game stopped
		}
	}
	
	/**
	 * Pause the game
	 * @returns {void}
	 */
	pause() {
		const isPlaying = this.state === CONSTANTS.GAME_STATES.PLAYING;
		
		if (isPlaying) {
			this.state = CONSTANTS.GAME_STATES.PAUSED;
			
			// Pause level timer
			LevelManager.stopTimer();
			
			// Cancel animation frame
			if (this.animationFrameId) {
				cancelAnimationFrame(this.animationFrameId);
				this.animationFrameId = null;
			}
			
			// Show pause overlay
			const pauseScreen = document.getElementById('pauseScreen');
			if (pauseScreen) {
				pauseScreen.classList.remove('hidden');
			}
		}
	}
	
	/**
	 * Resume the game
	 * @returns {void}
	 */
	resume() {
		const isPaused = this.state === CONSTANTS.GAME_STATES.PAUSED;
		
		if (isPaused) {
			this.state = CONSTANTS.GAME_STATES.PLAYING;
			
			// Resume level timer
			LevelManager.startTimer();
			
			// Hide pause overlay
			const pauseScreen = document.getElementById('pauseScreen');
			if (pauseScreen) {
				pauseScreen.classList.add('hidden');
			}
			
			// Reset timing
			this.lastUpdateTime = performance.now();
			
			// Restart game loop
			this._gameLoop();
		}
	}
	
	/**
	 * Restart the game
	 * @returns {void}
	 */
	restart() {
		// Cancel current game loop
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
		
		// Restart with same difficulty, level, and mode
		this.start(this.difficulty || 1, this.level || 1, this.gameMode || 'CLASSIC');
	}
	
	/**
	 * Pre-fill rows with random non-matching orbs (GAUNTLET mode)
	 * @param {Number} numRows - Number of rows to pre-fill from bottom
	 * @private
	 */
	_preFillRows(numRows) {
		const rows = Math.min(numRows, this.grid.rows);
		const availableColors = PieceFactory.getAvailableColors(this.level);
		
		for (let row = this.grid.rows - 1; row >= this.grid.rows - rows; row--) {
			for (let col = 0; col < this.grid.cols; col++) {
				// Generate ball - might be special or normal
				const specialBall = PieceFactory.generateSpecialBall(this.difficulty);
				let ball;
				
				if (specialBall) {
					// Use the special ball generated
					ball = specialBall;
				} else {
					// Generate normal ball with random color
					const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];
					ball = new Ball(CONSTANTS.BALL_TYPES.NORMAL, randomColor);
				}
				
				this.grid.setBall(row, col, ball);
			}
		}
		
		// Ensure no matches were created - if so, randomize those cells again
		let matches = this.grid.findMatches();
		let attempts = 0;
		const maxAttempts = 100; // Prevent infinite loop
		
		while (matches.length > 0 && attempts < maxAttempts) {
			attempts++;
			// Break matches by changing one ball in each match
			matches.forEach(match => {
				if (match.positions.length > 0) {
					const pos = match.positions[0];
					const newColor = availableColors[Math.floor(Math.random() * availableColors.length)];
					const ball = new Ball(CONSTANTS.BALL_TYPES.NORMAL, newColor);
					this.grid.setBall(pos.row, pos.col, ball);
				}
			});
			matches = this.grid.findMatches();
		}
		
		if (attempts >= maxAttempts) {
			console.warn('_preFillRows: Could not eliminate all matches after', maxAttempts, 'attempts');
		}
	}
	
	/**
	 * Add a row of orbs at the bottom
	 * Shifts all existing content up by one row
	 * RISING_TIDE: Adds blocking orbs
	 * GAUNTLET: Adds random colored orbs (same as pre-fill logic)
	 * @private
	 */
	_addRisingTideRow() {
		console.log('Rising Tide: Adding row for mode:', this.gameMode);
		// Shift all balls up by one row
		for (let row = 0; row < this.grid.rows - 1; row++) {
			for (let col = 0; col < this.grid.cols; col++) {
				const ballBelow = this.grid.getBall(row + 1, col);
				this.grid.setBall(row, col, ballBelow);
			}
		}
		
		// Add orbs to bottom row
		const bottomRow = this.grid.rows - 1;
		
		if (this.gameMode === 'GAUNTLET') {
			// GAUNTLET: Add random orbs with types based on level/difficulty
			const availableColors = PieceFactory.getAvailableColors(this.level);
			for (let col = 0; col < this.grid.cols; col++) {
				// Generate ball - might be special or normal
				const specialBall = PieceFactory.generateSpecialBall(this.difficulty);
				let ball;
				
				if (specialBall) {
					// Use the special ball generated
					ball = specialBall;
				} else {
					// Generate normal ball with random color
					const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];
					ball = new Ball(CONSTANTS.BALL_TYPES.NORMAL, randomColor);
				}
				
				this.grid.setBall(bottomRow, col, ball);
			}
			
			// Break any matches created in the new bottom row
			let matches = this.grid.findMatches();
			let attempts = 0;
			const maxAttempts = 100; // Prevent infinite loop
			
			while (matches.length > 0 && attempts < maxAttempts) {
				attempts++;
				matches.forEach(match => {
					// Only fix matches in the bottom row
					match.positions.forEach(pos => {
						if (pos.row === bottomRow) {
							const newColor = availableColors[Math.floor(Math.random() * availableColors.length)];
							const ball = new Ball(CONSTANTS.BALL_TYPES.NORMAL, newColor);
							this.grid.setBall(pos.row, pos.col, ball);
						}
					});
				});
				matches = this.grid.findMatches();
			}
			
			if (attempts >= maxAttempts) {
				console.warn('_addRisingTideRow: Could not eliminate all matches after', maxAttempts, 'attempts');
			}
		} else {
			// RISING_TIDE: Add blocking orbs
			for (let col = 0; col < this.grid.cols; col++) {
				const blockingBall = new Ball(CONSTANTS.BALL_TYPES.BLOCKING, '#888888');
				this.grid.setBall(bottomRow, col, blockingBall);
			}
		}
		
		// Render the updated grid
		this.render();
		
		// Check if top row has any balls - game over if so
		for (let col = 0; col < this.grid.cols; col++) {
			if (this.grid.getBall(0, col) !== null) {
				// In ZEN mode, this is success; in other modes, failure
				const reason = this.gameMode === 'ZEN' ? 'timeout' : 'breach';
				this._levelComplete(reason);
				return;
			}
		}
	}
	
	/**
	 * Handle level completion
	 * @param {String} reason - Reason for completion ('timeout' or 'breach')
	 * @private
	 */
	_levelComplete(reason = 'timeout') {
		this.state = CONSTANTS.GAME_STATES.LEVEL_COMPLETE;
		
		// Stop level timer
		const timeSurvived = LevelManager.levelTimer;
		LevelManager.stopTimer();
		
	// Complete level in LevelManager (unlocks next level if timeout)
	if (reason === 'timeout') {
		LevelManager.completeLevel();
		
		// Get current stats to check for high score
		const currentScore = ScoreManager.getScore();
		const bestScore = 0; // Hardcoded for now (TODO: implement persistence)
		const isNewHighScore = currentScore > bestScore;
		
		// Play fanfare for new high score, otherwise normal level complete sound
		if (isNewHighScore) {
			AudioManager.playHighScoreFanfare();
		} else {
			AudioManager.playLevelComplete();
		}
		
		// Celebrate with confetti particles!
		if (this.renderer && this.renderer.canvas) {
			if (isNewHighScore) {
				// EPIC high score celebration - render above overlay
				// Get screen-space position for particles
				const canvas = this.renderer.canvas;
				const rect = canvas.getBoundingClientRect();
				const centerX = rect.left + rect.width / 2;
				const centerY = rect.top + rect.height / 2;
				
				// More bursts, longer duration, rendered on overlay
				for (let i = 0; i < 12; i++) {
					setTimeout(() => {
						// Create bigger bursts with random positions for variety
						const offsetX = (Math.random() - 0.5) * 100;
						const offsetY = (Math.random() - 0.5) * 50;
						ParticleSystem.createConfetti(centerX + offsetX, centerY + offsetY, 60, true);
					}, i * 150);
				}
			} else {
				// Normal level complete - standard confetti on game canvas
				const centerX = this.renderer.canvas.width / 2;
				const centerY = this.renderer.canvas.height / 2;
				
				for (let i = 0; i < 5; i++) {
					setTimeout(() => {
						ParticleSystem.createConfetti(centerX, centerY, 40);
					}, i * 100);
				}
			}
		}
	} else {
		// Play game over sound for breach
		AudioManager.playGameOver();
	}		
		// Show level complete overlay
		const overlay = document.getElementById('levelCompleteOverlay');
		if (overlay) {
			overlay.classList.remove('hidden');
			
			// Update title and reason
			const title = document.getElementById('levelCompleteTitle');
			const reasonText = document.getElementById('levelCompleteReason');
			
			if (reason === 'timeout') {
				if (title) title.textContent = 'Level Complete!';
				if (reasonText) {
					// Different message for ZEN mode
					if (this.gameMode === 'ZEN') {
						reasonText.textContent = '🧘 Grid Filled - Zen Achieved!';
					} else {
						reasonText.textContent = '⏱️ Time Survived!';
					}
				}
			} else {
				if (title) title.textContent = 'Level Over';
				if (reasonText) reasonText.textContent = '⚠️ Grid Breached!';
			}
			
			// Get current stats
			const currentScore = ScoreManager.getScore();
			
			// Get best stats from player profile for this mode+difficulty+level
			const levelBestScore = PlayerManager.getLevelBestScore(this.difficulty, this.level, this.gameMode);
			const overallBestScore = PlayerManager.getHighScore(); // Best score across ALL levels
			
			// Update stat displays
			const thisScoreEl = document.getElementById('completeThisScore');
			const bestScoreEl = document.getElementById('completeBestScore');
			const highScoreMsg = document.getElementById('levelCompleteHighScoreMessage');
			
			if (thisScoreEl) thisScoreEl.textContent = currentScore.toLocaleString();
			if (bestScoreEl) bestScoreEl.textContent = levelBestScore > 0 ? levelBestScore.toLocaleString() : '-';
			
		// Update player stats with difficulty, level, and mode
		PlayerManager.updateStats({
			score: currentScore,
			time: timeSurvived,
			difficulty: this.difficulty,
			mode: this.gameMode,
			gameStarted: false,
			levelCompleted: reason === 'timeout' ? this.level : undefined
		});		// Track analytics
		const ballStats = StatisticsTracker.getStats();
		const totalBalls = StatisticsTracker.getTotalMatches();
		if (reason === 'timeout') {
			AnalyticsManager.trackLevelComplete(
				this.difficulty,
				this.level,
				currentScore,
				timeSurvived,
				this.gameMode,
				{
					balls_cleared: totalBalls,
					special_balls_used: (ballStats[CONSTANTS.BALL_TYPES.BOMB]?.total || 0) + (ballStats[CONSTANTS.BALL_TYPES.PAINTER]?.total || 0),
					is_new_best: levelBestScore === 0 || currentScore > levelBestScore
				}
			);
			AnalyticsManager.updatePlayerProfile(PlayerManager.getCurrentPlayerData().stats);
		} else {
			AnalyticsManager.trackLevelFailed(
				this.difficulty,
				this.level,
				currentScore,
				timeSurvived,
				reason,
				this.gameMode,
				{
					balls_cleared: totalBalls
				}
			);
		}			// Show high score message if new best for this level
			if (highScoreMsg) {
				if (levelBestScore === 0 || currentScore > levelBestScore) {
					highScoreMsg.textContent = '🎉 New Level Best Score!';
					highScoreMsg.style.display = 'block';
				} else if (currentScore > overallBestScore) {
					highScoreMsg.textContent = '🎉 New Personal Best!';
					highScoreMsg.style.display = 'block';
				} else {
				highScoreMsg.style.display = 'none';
			}
		}
		
		// Render match statistics to the overlay
		StatisticsTracker.renderToElement('levelCompleteStatsBoard');			// Show/hide next level button
			const nextLevelBtn = document.getElementById('nextLevelButton');
			if (nextLevelBtn) {
				// Only show next level button if completed successfully (timeout) and not last level
				if (reason === 'timeout' && this.level < LevelManager.getMaxLevel()) {
					nextLevelBtn.classList.remove('hidden');
				} else {
					nextLevelBtn.classList.add('hidden');
				}
			}
		}
		
		// Emit event for ad system and other listeners
		if (reason === 'timeout') {
			EventEmitter.emit(CONSTANTS.EVENTS.LEVEL_COMPLETE, { level: this.level, difficulty: this.difficulty });
		} else {
			EventEmitter.emit(CONSTANTS.EVENTS.GAME_OVER, { level: this.level, difficulty: this.difficulty, reason });
		}
	}
	
	/**
	 * Update available colors display
	 * @private
	 */
	_updateAvailableColorsDisplay() {
		const container = document.getElementById('availableColors');
		if (!container) return;
		
		// Get available colors for current level
		const colors = PieceFactory.getAvailableColors(this.level);
		
		// Clear existing
		container.innerHTML = '';
		
		// Add color balls
		colors.forEach(color => {
			const ball = document.createElement('div');
			ball.className = 'color-ball';
			ball.style.backgroundColor = color;
			container.appendChild(ball);
		});
	}
	
}

// Create singleton instance
const GameEngine = new GameEngineClass();

export default GameEngine;
export { GameEngine };
