/**
 * Main entry point for the Tetris Ball Matcher game.
 * Initializes the game engine when the DOM is ready.
 * @module main
 * @version 1.0.0
 */

import GameEngine from './modules/GameEngine.js';
import { EventEmitter } from './utils/EventEmitter.js';
import { CONSTANTS } from './utils/Constants.js';
import { DebugMode } from './utils/DebugMode.js';
import LevelManager from './modules/LevelManager.js';
import AudioManager from './modules/AudioManager.js';
import ParticleSystem from './modules/ParticleSystem.js';
import WeatherBackground from './modules/WeatherBackground.js';
import PlayerManager from './modules/PlayerManager.js';
import AnalyticsManager from './modules/AnalyticsManager.js';
import AdManager from './modules/AdManager.js';
import MonetizationManager from './modules/MonetizationManager.js';
import PWAManager from './modules/PWAManager.js';
import HintManager from './modules/HintManager.js';
import PuzzleManager from './modules/PuzzleManager.js';
import ShareManager from './modules/ShareManager.js';
import { ANALYTICS_CONFIG } from './config/analytics.config.js';

/**
 * Initialize the game when the DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
	try {
		// Initialize analytics
		if (ANALYTICS_CONFIG.enabled && ANALYTICS_CONFIG.mixpanelToken) {
			AnalyticsManager.init(ANALYTICS_CONFIG.mixpanelToken, {
				debug: ANALYTICS_CONFIG.debug,
				autocapture: ANALYTICS_CONFIG.autocapture,
				recordSessionsPercent: ANALYTICS_CONFIG.recordSessionsPercent
			});
			
			// Identify current player
			const currentPlayer = PlayerManager.getCurrentPlayerData();
			AnalyticsManager.identifyPlayer(currentPlayer.name, {
				createdAt: currentPlayer.createdAt,
				gamesPlayed: currentPlayer.stats.gamesPlayed,
				highScore: currentPlayer.stats.highScore
			});
			AnalyticsManager.track('Game Loaded');
		}
		
		// Initialize the game engine
		await GameEngine.initialize();
		
		// Initialize ad manager (non-intrusive, natural breaks only)
		AdManager.initialize();
		
		// Initialize monetization (supporter button, license key activation)
		MonetizationManager.initialize();

		// Initialize PWA (service worker, install prompt, offline detection)
		PWAManager.initialize();

		// Initialize weather background
		WeatherBackground.initialize();
		
		// Initialize particle overlay canvas
		ParticleSystem.initializeOverlay();
		
		// Initialize AudioManager immediately (browser may require user interaction to play)
		AudioManager.initialize();
		
	// Load current player's settings and apply to AudioManager
	const playerSettings = PlayerManager.getSettings();
	AudioManager.setMasterVolume(playerSettings.masterVolume);
	AudioManager.setSFXVolume(playerSettings.sfxVolume);
	AudioManager.setMusicVolume(playerSettings.musicVolume);
	AudioManager.setMute(playerSettings.isMuted);		// Try to resume audio context on first user interaction
		const resumeAudio = async () => {
			await AudioManager.resume();
			document.body.removeEventListener('click', resumeAudio);
		};
		document.body.addEventListener('click', resumeAudio, { once: true });
		
		// Initialize level manager
		LevelManager.initialize();

		// Set up menu event listeners (this sets default difficulty)
		setupMenuListeners();
		
		// Set up player management
		setupPlayerManagement();
		
		// Populate level select grid (after difficulty is set)
		populateLevelGrid();
		
		// Set up score display listener
		setupScoreListener();
		
		// Set up clock and weather display
		setupClockAndWeather();

		// Show debug overlay if enabled
		if (DebugMode.isEnabled()) {
			DebugMode.showDebugInfo();
		}

		// Show the main menu
		showScreen('menuScreen');

		// Auto-pause when tab loses focus
		setupVisibilityHandlers();
	}
	catch (error) {
		console.error('Failed to initialize game:', error);
		alert('Failed to initialize game. Please refresh the page.');
	}
});

/**
 * Set up visibility change and beforeunload handlers for auto-pause
 */
function setupVisibilityHandlers() {
	// Auto-pause when tab/app loses visibility
	document.addEventListener('visibilitychange', () => {
		if (document.hidden && GameEngine.state === CONSTANTS.GAME_STATES.PLAYING) {
			GameEngine.pause();
		}
	});

	// Persist Zen state on any page unload, regardless of current game state.
	// saveZenState() is a no-op when the game mode is not ZEN, so this is safe
	// to call unconditionally. The explicit PLAYING check below still handles
	// pausing the loop so the animation frame is cancelled cleanly.
	window.addEventListener('beforeunload', () => {
		GameEngine.saveZenState();
		if (GameEngine.state === CONSTANTS.GAME_STATES.PLAYING) {
			GameEngine.pause();
		}
	});
}

/**
 * Set up event listeners for menu buttons
 */
let selectedMode = 'CLASSIC'; // Default game mode

function setupMenuListeners() {
	const startBtn = document.getElementById('startButton');
	const continueBtn = document.getElementById('continueButton');
	const settingsBtn = document.getElementById('settingsButton');
	const difficultyButtons = document.querySelectorAll('.difficulty-btn');
	const modeButtons = document.querySelectorAll('.mode-btn');

	// Mode selection
	modeButtons.forEach(btn => {
		btn.addEventListener('click', () => {
			AudioManager.playClick();
			const mode = btn.dataset.mode;
			selectMode(mode);
		});
	});

	// Difficulty selection
	difficultyButtons.forEach(btn => {
		btn.addEventListener('click', () => {
			AudioManager.playClick();
			const difficulty = parseInt(btn.dataset.difficulty);
			selectDifficulty(difficulty);
		});
	});
	
	// Select the highest unlocked difficulty by default
	const playerData = PlayerManager.getCurrentPlayerData();
	const unlockedDifficulties = playerData.levelProgress.unlockedDifficulties || [1];
	const highestDifficulty = Math.max(...unlockedDifficulties);
	selectDifficulty(highestDifficulty);

	// Start new game
	if (startBtn) {
		startBtn.addEventListener('click', async () => {
			console.log('Start button clicked');
			
			// Ensure AudioManager is initialized and resumed
			AudioManager.initialize();
			await AudioManager.resume();
			
			// Play click sound after resume
			AudioManager.playClick();
			
			// Start background music
			console.log('Starting background music...');
			await AudioManager.startMusic();
			
			showScreen('gameScreen');
		// Hide mode-specific banners (will be shown by their respective events)
		const mb = document.getElementById('missionBanner');
		const pb = document.getElementById('puzzleBanner');
		if (mb) mb.classList.add('hidden');
		if (pb) pb.classList.add('hidden');
		// Start with selected difficulty, level, and mode
		const playerName = PlayerManager.getCurrentPlayerData().name;
		AnalyticsManager.trackLevelStart(selectedDifficulty, selectedLevel, selectedMode);
		GameEngine.start(selectedDifficulty, selectedLevel, selectedMode);
		});
	}

	// Continue saved Zen game
	if (continueBtn) {
		continueBtn.addEventListener('click', async () => {
			AudioManager.initialize();
			await AudioManager.resume();
			AudioManager.playClick();
			await AudioManager.startMusic();
			
			showScreen('gameScreen');
			AnalyticsManager.track('Zen Game Resumed');
			GameEngine.loadZenState();
		});
	}

	// Settings (Phase 9 - Settings UI)
	if (settingsBtn) {
		settingsBtn.addEventListener('click', () => {
			AudioManager.playClick();
			showSettingsOverlay();
		});
	}
	
	// Set up settings overlay controls
	setupSettingsControls();
	
	// Set up game over / pause / level complete screen buttons
	setupGameScreenListeners();
	
	// Initial check for Continue button visibility
	updateContinueButton();
}

/**
 * Show or hide the "Continue Zen Game" button based on save state
 */
function updateContinueButton() {
	const continueBtn = document.getElementById('continueButton');
	if (continueBtn) {
		continueBtn.classList.toggle('hidden', !GameEngine.hasZenSave());
	}
}

/**
 * Show a specific screen and hide others
 * @param {string} screenId - The ID of the screen to show
 */
function showScreen(screenId) {
	const screens = ['menuScreen', 'gameScreen', 'gameOverScreen', 'levelCompleteScreen'];

	// Update continue button when showing menu
	if (screenId === 'menuScreen') {
		updateContinueButton();
	}

	screens.forEach(id => {
		const screen = document.getElementById(id);
		if (screen) {
			if (id === screenId) {
				screen.classList.remove('hidden');
			}
			else {
				screen.classList.add('hidden');
			}
		}
	});

	document.body.classList.toggle('home-screen', screenId === 'menuScreen');
}

/**
 * Set up event listeners for game screens (pause, game over, level complete)
 */
function setupGameScreenListeners() {
	// Pause screen buttons
	const resumeBtn = document.getElementById('resumeButton');
	const restartFromPauseBtn = document.getElementById('restartFromPauseButton');
	const saveExitBtn = document.getElementById('saveExitButton');
	const menuFromPauseBtn = document.getElementById('menuFromPauseButton');
	
	if (resumeBtn) {
		resumeBtn.addEventListener('click', () => {
			AudioManager.playClick();
			GameEngine.resume();
		});
	}
	
	if (restartFromPauseBtn) {
		restartFromPauseBtn.addEventListener('click', () => {
			AudioManager.playClick();
			const overlay = document.getElementById('pauseOverlay');
			if (overlay) overlay.classList.add('hidden');
			showScreen('gameScreen');
			GameEngine.start(selectedDifficulty, selectedLevel, selectedMode);
		});
	}
	
	if (saveExitBtn) {
		saveExitBtn.addEventListener('click', () => {
			AudioManager.playClick();
			GameEngine.saveAndExit();
			AudioManager.stopMusic();
			const overlay = document.getElementById('pauseOverlay');
			if (overlay) overlay.classList.add('hidden');
			showScreen('menuScreen');
			populateLevelGrid();
		});
	}
	
	if (menuFromPauseBtn) {
		menuFromPauseBtn.addEventListener('click', () => {
			AudioManager.playClick();
			AudioManager.stopMusic();
			const overlay = document.getElementById('pauseOverlay');
			if (overlay) overlay.classList.add('hidden');
			showScreen('menuScreen');
			populateLevelGrid(); // Refresh level grid in case new levels unlocked
		});
	}
	
	// Game over screen buttons
	const restartBtn = document.getElementById('restartButton');
	const menuFromGameOverBtn = document.getElementById('menuFromGameOverButton');
	
	if (restartBtn) {
		restartBtn.addEventListener('click', () => {
			AudioManager.playClick();
			showScreen('gameScreen');
			GameEngine.start(selectedDifficulty, selectedLevel);
		});
	}
	
	if (menuFromGameOverBtn) {
		menuFromGameOverBtn.addEventListener('click', () => {
			AudioManager.playClick();
			AudioManager.stopMusic();
			showScreen('menuScreen');
			populateLevelGrid();
		});
	}
	
	// Level complete screen buttons
	const nextLevelBtn = document.getElementById('nextLevelButton');
	const replayLevelBtn = document.getElementById('replayLevelButton');
	const menuFromCompleteBtn = document.getElementById('menuFromCompleteButton');
	const levelChangesContinueBtn = document.getElementById('levelChangesContinueButton');
	
	if (nextLevelBtn) {
		nextLevelBtn.addEventListener('click', () => {
			AudioManager.playClick();
			// Hide overlay
			const overlay = document.getElementById('levelCompleteOverlay');
			if (overlay) overlay.classList.add('hidden');
			
			// Advance to next level
			selectedLevel = Math.min(selectedLevel + 1, LevelManager.getMaxLevel());
			showScreen('gameScreen');
			GameEngine.start(selectedDifficulty, selectedLevel, selectedMode);
		});
	}
	
	if (replayLevelBtn) {
		replayLevelBtn.addEventListener('click', () => {
			AudioManager.playClick();
			// Hide overlay
			const overlay = document.getElementById('levelCompleteOverlay');
			if (overlay) overlay.classList.add('hidden');
			
			// Replay same level
			showScreen('gameScreen');
			GameEngine.start(selectedDifficulty, selectedLevel, selectedMode);
		});
	}
	
	if (menuFromCompleteBtn) {
		menuFromCompleteBtn.addEventListener('click', () => {
			AudioManager.playClick();
			AudioManager.stopMusic();
			// Hide overlay
			const overlay = document.getElementById('levelCompleteOverlay');
			if (overlay) overlay.classList.add('hidden');
			
			// Reset selected level so populateLevelGrid will select the highest unlocked
			selectedLevel = null;
			
			showScreen('menuScreen');
			populateLevelGrid(); // Refresh to show newly unlocked levels
		});
	}

	if (levelChangesContinueBtn) {
		levelChangesContinueBtn.addEventListener('click', () => {
			AudioManager.playClick();
			GameEngine.continueAfterLevelChanges();
		});
	}

	// Share button
	const shareLevelBtn = document.getElementById('shareLevelButton');
	if (shareLevelBtn) {
		shareLevelBtn.addEventListener('click', async () => {
			AudioManager.playClick();
			const result = await ShareManager.share();
			if (result === 'copied') {
				shareLevelBtn.textContent = '✅ Copied!';
				shareLevelBtn.classList.add('copied');
				setTimeout(() => {
					shareLevelBtn.textContent = '📤 Share';
					shareLevelBtn.classList.remove('copied');
				}, 2000);
			}
		});
	}
}

/**
 * Set up score display listener
 */
function setupScoreListener() {
	const currentScoreDisplay = document.getElementById('currentScoreDisplay');
	const bestScoreDisplay = document.getElementById('bestScoreDisplay');
	const streakDisplay = document.getElementById('streakDisplay');
	const streakValue = document.getElementById('streakValue');
	
	EventEmitter.on(CONSTANTS.EVENTS.SCORE_UPDATE, (data) => {
		if (currentScoreDisplay) {
			currentScoreDisplay.textContent = data.score.toLocaleString();
		}
		if (bestScoreDisplay && data.bestScore !== undefined) {
			bestScoreDisplay.textContent = data.bestScore.toLocaleString();
		}
		// Update streak display
		if (streakDisplay && streakValue && data.matchStreak !== undefined) {
			if (data.matchStreak >= 2) {
				streakDisplay.style.display = '';
				streakValue.textContent = `${data.matchStreak}x`;
			} else {
				streakDisplay.style.display = 'none';
			}
		}
	});
	
	// Goal progress display
	const goalBar = document.getElementById('goalBar');
	const goalItems = document.getElementById('goalItems');
	
	EventEmitter.on(CONSTANTS.EVENTS.GOAL_UPDATE, (data) => {
		if (!goalBar || !goalItems || !data.goals) return;
		
		if (data.goals.length === 0) {
			goalBar.classList.add('hidden');
			return;
		}
		
		goalBar.classList.remove('hidden');
		goalItems.innerHTML = '';
		
		data.goals.forEach(g => {
			const item = document.createElement('div');
			item.className = 'goal-item' + (g.completed ? ' completed' : '');
			item.innerHTML = `<span class="goal-label">${g.label}</span> <span class="goal-progress">${g.progress}/${g.target}</span>`;
			goalItems.appendChild(item);
		});
	});

	// Mission objective display
	const missionBanner = document.getElementById('missionBanner');
	const missionObjective = document.getElementById('missionObjective');
	const missionProgress = document.getElementById('missionProgress');

	EventEmitter.on(CONSTANTS.EVENTS.MISSION_GOAL_UPDATE, (data) => {
		if (!missionBanner) return;

		if (!data.current && !data.chainComplete) {
			missionBanner.classList.add('hidden');
			return;
		}

		missionBanner.classList.remove('hidden');

		if (data.chainComplete) {
			if (missionObjective) missionObjective.textContent = 'All missions complete!';
			if (missionProgress) missionProgress.textContent = `${data.goalsCompleted}/${data.totalGoals}`;
		} else if (data.current) {
			if (missionObjective) missionObjective.textContent = `${data.current.label} (+${data.current.points}pts)`;
			if (missionProgress) missionProgress.textContent = `${data.current.progress}/${data.current.target}`;
		}
	});

	// Puzzle mode: pieces remaining HUD
	const puzzleBanner = document.getElementById('puzzleBanner');
	const puzzlePiecesLeft = document.getElementById('puzzlePiecesLeft');

	EventEmitter.on(CONSTANTS.EVENTS.PUZZLE_PIECES_UPDATE, (data) => {
		if (!puzzleBanner) return;
		puzzleBanner.classList.remove('hidden');
		if (puzzlePiecesLeft) puzzlePiecesLeft.textContent = `${data.piecesRemaining} / ${data.pieceLimit}`;
	});
}

/**
 * Populate the level selection grid
 */
function populateLevelGrid() {
	const levelGrid = document.getElementById('levelGrid');
	if (!levelGrid) return;
	
	const maxLevel = LevelManager.getMaxLevel();
	// Get unlocked levels for current mode+difficulty from current player's data
	const playerData = PlayerManager.getCurrentPlayerData();
	const difficultyKey = String(selectedDifficulty);
	
	// Use mode-specific unlocked levels (with fallback to legacy format)
	let unlockedLevels = [1];
	if (playerData.levelProgress.unlockedLevelsByMode && 
	    playerData.levelProgress.unlockedLevelsByMode[selectedMode] &&
	    playerData.levelProgress.unlockedLevelsByMode[selectedMode][difficultyKey]) {
		unlockedLevels = playerData.levelProgress.unlockedLevelsByMode[selectedMode][difficultyKey];
	} else if (playerData.levelProgress.unlockedLevelsByDifficulty && 
	           playerData.levelProgress.unlockedLevelsByDifficulty[difficultyKey]) {
		// Fallback to legacy format for backward compatibility
		unlockedLevels = playerData.levelProgress.unlockedLevelsByDifficulty[difficultyKey];
	}
	
	// Clear existing buttons
	levelGrid.innerHTML = '';
	
	// Create button for each level
	for (let level = 1; level <= maxLevel; level++) {
		const btn = document.createElement('button');
		btn.className = 'level-btn';
		btn.dataset.level = level;
		
		// Check if level is unlocked
		const isUnlocked = unlockedLevels.includes(level);
		const isCompleted = isUnlocked && PlayerManager.isLevelCompleted(selectedDifficulty, level, selectedMode);
		
		// Build pill content: number + indicator
		let content = '<span class="level-number">' + level + '</span>';
		if (!isUnlocked) {
			btn.classList.add('locked');
			btn.disabled = true;
			content += '<span class="level-lock level-indicator">🔒</span>';
		} else if (selectedMode === 'PUZZLE') {
			// PUZZLE mode: show star rating
			const stars = PlayerManager.getLevelStars(
				selectedDifficulty, level,
				(score, lvl, diff) => PuzzleManager.getStars(score, lvl, diff)
			);
			if (stars > 0) {
				btn.classList.add('completed');
			}
			if (stars > 0) {
				const starStr = '<span class="level-stars level-indicator">'
					+ '<span class="star star-filled">★</span>'.repeat(stars)
					+ '</span>';
				content += starStr;
			}
		} else if (isCompleted) {
			btn.classList.add('completed');
			content += '<span class="level-check level-indicator">✓</span>';
		}
		btn.innerHTML = content;
		
		// Highlight if this is the currently selected level
		if (level === selectedLevel) {
			btn.classList.add('selected');
		}
		
		// Add click handler for unlocked levels
		if (isUnlocked) {
			btn.addEventListener('click', () => {
				AudioManager.playClick();
				selectLevel(level);
			});
		}
		
		levelGrid.appendChild(btn);
	}
	
	// If no level is selected yet, or selected level is locked, select the highest unlocked level
	if (!selectedLevel || !unlockedLevels.includes(selectedLevel)) {
		const highestLevel = Math.max(...unlockedLevels);
		selectLevel(highestLevel);
	}
}

/**
 * Select a level (updates UI and stores selection)
 * @param {Number} level - Level number to select
 */
let selectedLevel = 1;
let selectedDifficulty = 1;

function selectLevel(level) {
	// Check if level is unlocked for current player, mode, and difficulty
	const playerData = PlayerManager.getCurrentPlayerData();
	const difficultyKey = String(selectedDifficulty);
	
	// Use mode-specific unlocked levels (with fallback to legacy format)
	let unlockedLevels = [1];
	if (playerData.levelProgress.unlockedLevelsByMode && 
	    playerData.levelProgress.unlockedLevelsByMode[selectedMode] &&
	    playerData.levelProgress.unlockedLevelsByMode[selectedMode][difficultyKey]) {
		unlockedLevels = playerData.levelProgress.unlockedLevelsByMode[selectedMode][difficultyKey];
	} else if (playerData.levelProgress.unlockedLevelsByDifficulty && 
	           playerData.levelProgress.unlockedLevelsByDifficulty[difficultyKey]) {
		// Fallback to legacy format for backward compatibility
		unlockedLevels = playerData.levelProgress.unlockedLevelsByDifficulty[difficultyKey];
	}
	if (!unlockedLevels.includes(level)) return;
	
	selectedLevel = level;
	
	// Update UI - highlight selected level
	const levelButtons = document.querySelectorAll('.level-btn');
	levelButtons.forEach(btn => {
		if (parseInt(btn.dataset.level) === level) {
			btn.classList.add('selected');
		} else {
			btn.classList.remove('selected');
		}
	});
}

/**
 * Select a game mode
 * @param {String} mode - Game mode constant (CLASSIC, ZEN, GAUNTLET, RISING_TIDE)
 */
function selectMode(mode) {
	selectedMode = mode;
	
	// Update UI - highlight selected mode
	const modeButtons = document.querySelectorAll('.mode-btn');
	modeButtons.forEach(btn => {
		if (btn.dataset.mode === mode) {
			btn.classList.add('selected');
		} else {
			btn.classList.remove('selected');
		}
	});
	
	// Refresh level grid to show mode-specific unlocked levels
	populateLevelGrid();
}

/**
 * Select a difficulty (updates UI and stores selection)
 * @param {Number} difficulty - Difficulty number (1-5)
 */
function selectDifficulty(difficulty) {
	selectedDifficulty = difficulty;
	
	// Update UI - highlight selected difficulty
	const difficultyButtons = document.querySelectorAll('.difficulty-btn');
	difficultyButtons.forEach(btn => {
		if (parseInt(btn.dataset.difficulty) === difficulty) {
			btn.classList.add('selected');
		} else {
			btn.classList.remove('selected');
		}
	});
	
	// Reset selected level when changing difficulty so populateLevelGrid will select the highest
	selectedLevel = null;
	
	// Refresh level grid to update completion checkmarks for this difficulty
	populateLevelGrid();
}

/**
 * Show settings overlay
 */
function showSettingsOverlay() {
	const overlay = document.getElementById('settingsOverlay');
	if (overlay) {
		// Load current player's settings from PlayerManager
		const settings = PlayerManager.getSettings();
		
		// Update UI to reflect current settings
		const muteToggle = document.getElementById('muteToggle');
		const masterSlider = document.getElementById('masterVolumeSlider');
		const sfxSlider = document.getElementById('sfxVolumeSlider');
		const musicSlider = document.getElementById('musicVolumeSlider');
		
		if (muteToggle) muteToggle.checked = settings.isMuted;
		if (masterSlider) masterSlider.value = settings.masterVolume * 100;
		if (sfxSlider) sfxSlider.value = settings.sfxVolume * 100;
		if (musicSlider) musicSlider.value = settings.musicVolume * 100;
		
		const hintsToggle = document.getElementById('hintsToggle');
		if (hintsToggle) hintsToggle.checked = settings.hintsEnabled !== false;
		
		// Update value displays
		updateVolumeDisplay('masterVolumeValue', settings.masterVolume * 100);
		updateVolumeDisplay('sfxVolumeValue', settings.sfxVolume * 100);
		updateVolumeDisplay('musicVolumeValue', settings.musicVolume * 100);
		
		overlay.classList.remove('hidden');
	}
}

/**
 * Hide settings overlay
 */
function hideSettingsOverlay() {
	const overlay = document.getElementById('settingsOverlay');
	if (overlay) {
		overlay.classList.add('hidden');
	}
}

/**
 * Update volume display percentage
 */
function updateVolumeDisplay(elementId, value) {
	const display = document.getElementById(elementId);
	if (display) {
		display.textContent = Math.round(value) + '%';
	}
}

/**
 * Set up settings controls
 */
function setupSettingsControls() {
	// Close settings button
	const closeBtn = document.getElementById('closeSettingsButton');
	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			AudioManager.playClick();
			hideSettingsOverlay();
		});
	}
	
	// Mute toggle
	const muteToggle = document.getElementById('muteToggle');
	if (muteToggle) {
		muteToggle.addEventListener('change', (e) => {
			const isMuted = e.target.checked;
			AudioManager.toggleMute();
			AudioManager.playClick();
			// Save to current player's settings
			PlayerManager.updateSettings({ isMuted });
		});
	}
	
	// Master volume slider
	const masterSlider = document.getElementById('masterVolumeSlider');
	if (masterSlider) {
		masterSlider.addEventListener('input', (e) => {
			const value = e.target.value / 100;
			AudioManager.setMasterVolume(value);
			updateVolumeDisplay('masterVolumeValue', e.target.value);
			// Save to current player's settings
			PlayerManager.updateSettings({ masterVolume: value });
		});
	}
	
	// SFX volume slider
	const sfxSlider = document.getElementById('sfxVolumeSlider');
	if (sfxSlider) {
		sfxSlider.addEventListener('input', (e) => {
			const value = e.target.value / 100;
			AudioManager.setSFXVolume(value);
			updateVolumeDisplay('sfxVolumeValue', e.target.value);
			// Save to current player's settings
			PlayerManager.updateSettings({ sfxVolume: value });
		});
		
		// Play test sound on release
		sfxSlider.addEventListener('change', () => {
			AudioManager.playClick();
		});
	}
	
	// Music volume slider
	const musicSlider = document.getElementById('musicVolumeSlider');
	if (musicSlider) {
		musicSlider.addEventListener('input', (e) => {
			const value = e.target.value / 100;
			AudioManager.setMusicVolume(value);
			updateVolumeDisplay('musicVolumeValue', e.target.value);
			// Save to current player's settings
			PlayerManager.updateSettings({ musicVolume: value });
		});
	}
	
	// Hints toggle
	const hintsToggle = document.getElementById('hintsToggle');
	if (hintsToggle) {
		hintsToggle.addEventListener('change', (e) => {
			const hintsEnabled = e.target.checked;
			HintManager.setEnabled(hintsEnabled);
			PlayerManager.updateSettings({ hintsEnabled });
		});
	}
	
	// Reset player data button
	const resetBtn = document.getElementById('resetPlayerButton');
	if (resetBtn) {
		resetBtn.addEventListener('click', () => {
			const playerName = PlayerManager.getCurrentPlayerName();
			const confirmed = confirm(
				`Are you sure you want to reset ALL stats and progress for "${playerName}"?\n\n` +
				`This will clear:\n` +
				`• High scores\n` +
				`• Games played\n` +
				`• Level progress\n` +
				`• Unlocked levels\n\n` +
				`Your audio settings will be preserved.\n\n` +
				`This action cannot be undone!`
			);
			
			if (confirmed) {
				PlayerManager.resetPlayerData();
				AudioManager.playClick();
				
				// Refresh UI
				populateLevelGrid();
				updateHighScoreDisplay();
				
				// Show success message
				alert(`Player data has been reset for "${playerName}".`);
			}
		});
	}
	
	// Redeem support code button
	const redeemBtn = document.getElementById('redeemCodeButton');
	if (redeemBtn) {
		redeemBtn.addEventListener('click', () => {
			AudioManager.playClick();
			hideSettingsOverlay();
			MonetizationManager.showActivateDialog();
		});
	}
}

/**
 * Set up clock and weather display in HUD
 */
function setupClockAndWeather() {
	const clockDisplay = document.getElementById('clockDisplay');
	
	if (!clockDisplay) return;
	
	// Update clock every minute (no seconds)
	function updateClock() {
		const now = new Date();
		const hours = now.getHours().toString().padStart(2, '0');
		const minutes = now.getMinutes().toString().padStart(2, '0');
		clockDisplay.textContent = `${hours}:${minutes}`;
	}
	
	// Update weather display
	function updateWeather() {
		const tempDisplay = document.getElementById('tempDisplay');
		const weatherDisplay = document.getElementById('weatherDisplay');
		
		if (!tempDisplay || !weatherDisplay) return;
		
		const weather = WeatherBackground.getCurrentWeather();
		if (weather) {
			const tempF = weather.temperatureF;
			const tempC = weather.temperatureC;
			const condition = getWeatherConditionText(weather.weatherCode);
			tempDisplay.textContent = `${tempF}°F / ${tempC}°C`;
			weatherDisplay.textContent = condition;
		} else {
			tempDisplay.textContent = '--°F / --°C';
			weatherDisplay.textContent = '--';
		}
	}
	
	// Helper function to get weather condition text
	function getWeatherConditionText(weatherCode) {
		// WMO Weather interpretation codes
		if (weatherCode === 0) return 'Clear';
		if (weatherCode <= 3) return 'Cloudy';
		if (weatherCode >= 45 && weatherCode <= 48) return 'Foggy';
		if (weatherCode >= 51 && weatherCode <= 67) return 'Rainy';
		if (weatherCode >= 71 && weatherCode <= 77) return 'Snowy';
		if (weatherCode >= 80 && weatherCode <= 82) return 'Showers';
		if (weatherCode >= 85 && weatherCode <= 86) return 'Snow Showers';
		if (weatherCode >= 95) return 'Stormy';
		return 'Partly Cloudy';
	}
	
	// Helper function to get weather emoji (deprecated but kept for reference)
	function getWeatherEmoji(weatherCode, isDay) {
		// WMO Weather interpretation codes
		if (weatherCode === 0) return isDay ? '☀️' : '🌙'; // Clear
		if (weatherCode <= 3) return isDay ? '⛅' : '☁️'; // Partly cloudy
		if (weatherCode >= 45 && weatherCode <= 48) return '🌫️'; // Fog
		if (weatherCode >= 51 && weatherCode <= 67) return '🌧️'; // Rain
		if (weatherCode >= 71 && weatherCode <= 77) return '❄️'; // Snow
		if (weatherCode >= 80 && weatherCode <= 82) return '🌧️'; // Rain showers
		if (weatherCode >= 85 && weatherCode <= 86) return '🌨️'; // Snow showers
		if (weatherCode >= 95) return '⛈️'; // Thunderstorm
		return '🌤️'; // Default
	}
	
	// Set callback for when weather updates
	WeatherBackground.onWeatherUpdate = updateWeather;
	
	// Initial update
	updateClock();
	updateWeather();
	
	// Update clock every minute
	setInterval(updateClock, 60000);
	
	// Update weather every minute
	setInterval(updateWeather, 60000);
}

/**
 * Update high score display
 */
function updateHighScoreDisplay() {
	const highScoreDisplay = document.getElementById('highScoreDisplay');
	if (highScoreDisplay) {
		const highScore = PlayerManager.getHighScore();
		highScoreDisplay.textContent = highScore > 0 ? highScore.toLocaleString() : '-';
	}
}

/**
 * Set up player management UI
 */
function setupPlayerManagement() {
	const playerPillToggle = document.getElementById('playerPillToggle');
	const playerPillMenu = document.getElementById('playerPillMenu');
	const playerCurrentName = document.getElementById('playerCurrentName');
	const playerMenuList = document.getElementById('playerMenuList');
	const playerMenuAdd = document.getElementById('playerMenuAdd');
	if (!playerPillToggle || !playerPillMenu || !playerCurrentName || !playerMenuList || !playerMenuAdd) {
		return;
	}
	
	// Populate player dropdown menu
	function populatePlayerMenu() {
		const players = PlayerManager.getPlayerNames();
		const currentPlayer = PlayerManager.getCurrentPlayerName();
		playerCurrentName.textContent = currentPlayer;

		playerMenuList.innerHTML = '';
		players.forEach((name) => {
			const item = document.createElement('div');
			item.className = 'player-menu-item' + (name === currentPlayer ? ' active' : '');

			const selectButton = document.createElement('button');
			selectButton.type = 'button';
			selectButton.className = 'player-menu-switch';
			selectButton.textContent = name;
			selectButton.addEventListener('click', () => {
				switchPlayer(name);
				closePlayerMenu();
			});
			item.appendChild(selectButton);

			const canDelete = players.length > 1 && name !== 'Guest' && name !== currentPlayer;
			if (canDelete) {
				const deleteButton = document.createElement('button');
				deleteButton.type = 'button';
				deleteButton.className = 'player-menu-delete';
				deleteButton.textContent = 'x';
				deleteButton.title = `Delete ${name}`;
				deleteButton.addEventListener('click', (event) => {
					event.stopPropagation();
					promptDeletePlayer(name);
					closePlayerMenu();
				});
				item.appendChild(deleteButton);
			}

			playerMenuList.appendChild(item);
		});
		
		// Update high score display
		updateHighScoreDisplay();
	}

	function closePlayerMenu() {
		playerPillMenu.classList.add('hidden');
		playerPillToggle.setAttribute('aria-expanded', 'false');
	}

	function openPlayerMenu() {
		playerPillMenu.classList.remove('hidden');
		playerPillToggle.setAttribute('aria-expanded', 'true');
	}

	function switchPlayer(playerName) {
		if (!PlayerManager.switchPlayer(playerName)) {
			return;
		}

		console.log(`Switched to player: ${playerName}`);
		const playerData = PlayerManager.getCurrentPlayerData();
		AnalyticsManager.identifyPlayer(playerName, {
			createdAt: playerData.createdAt,
			gamesPlayed: playerData.stats.gamesPlayed,
			highScore: playerData.stats.highScore
		});

		const settings = PlayerManager.getSettings();
		AudioManager.setMasterVolume(settings.masterVolume);
		AudioManager.setSFXVolume(settings.sfxVolume);
		AudioManager.setMusicVolume(settings.musicVolume);
		AudioManager.setMute(settings.isMuted);

		updateHighScoreDisplay();
		populateLevelGrid();
		updateContinueButton();
		populatePlayerMenu();
	}
	
	playerPillToggle.addEventListener('click', () => {
		if (playerPillMenu.classList.contains('hidden')) {
			openPlayerMenu();
		} else {
			closePlayerMenu();
		}
	});
	
	document.addEventListener('click', (event) => {
		if (!playerPillMenu.classList.contains('hidden') && !event.target.closest('.player-pill-container')) {
			closePlayerMenu();
		}
	});

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') {
			closePlayerMenu();
		}
	});

	// Handle add player option
	const addPlayerOverlay = document.getElementById('addPlayerOverlay');
	const newPlayerNameInput = document.getElementById('newPlayerName');
	const addPlayerError = document.getElementById('addPlayerError');
	const confirmAddPlayerButton = document.getElementById('confirmAddPlayer');
	const cancelAddPlayerButton = document.getElementById('cancelAddPlayer');
	
	playerMenuAdd.addEventListener('click', () => {
		closePlayerMenu();
		// Show overlay
		addPlayerOverlay.classList.remove('hidden');
		newPlayerNameInput.value = '';
		addPlayerError.classList.add('hidden');
		newPlayerNameInput.focus();
	});
	
	confirmAddPlayerButton.addEventListener('click', () => {
		const playerName = newPlayerNameInput.value.trim();
		if (playerName === '') {
			addPlayerError.textContent = 'Please enter a player name.';
			addPlayerError.classList.remove('hidden');
			return;
		}
		
		if (PlayerManager.addPlayer(playerName)) {
			// Track new player creation
			AnalyticsManager.identifyPlayer(playerName, {
				createdAt: new Date().toISOString(),
				gamesPlayed: 0
			});
			AnalyticsManager.track('Player Created', { playerName });
			switchPlayer(playerName);
			// Close overlay
			addPlayerOverlay.classList.add('hidden');
		} else {
			addPlayerError.textContent = `Player "${playerName}" already exists or is invalid.`;
			addPlayerError.classList.remove('hidden');
		}
	});
	
	cancelAddPlayerButton.addEventListener('click', () => {
		addPlayerOverlay.classList.add('hidden');
	});
	
	// Allow Enter key to submit
	newPlayerNameInput.addEventListener('keypress', (e) => {
		if (e.key === 'Enter') {
			confirmAddPlayerButton.click();
		}
	});
	
	// Handle delete player button
	const deletePlayerOverlay = document.getElementById('deletePlayerOverlay');
	const deletePlayerMessage = document.getElementById('deletePlayerMessage');
	const confirmDeletePlayerButton = document.getElementById('confirmDeletePlayer');
	const cancelDeletePlayerButton = document.getElementById('cancelDeletePlayer');
	let playerToDelete = null;

	function promptDeletePlayer(playerName) {
		const players = PlayerManager.getPlayerNames();
		
		// Can't delete if only one player
		if (players.length <= 1) {
			deletePlayerMessage.textContent = 'Cannot delete the last player!';
			deletePlayerMessage.className = 'error-message';
			deletePlayerOverlay.classList.remove('hidden');
			confirmDeletePlayerButton.style.display = 'none';
			cancelDeletePlayerButton.textContent = 'OK';
			playerToDelete = null;
			return;
		}
		
		if (playerName === 'Guest') {
			deletePlayerMessage.textContent = 'Cannot delete the Guest player!';
			deletePlayerMessage.className = 'error-message';
			deletePlayerOverlay.classList.remove('hidden');
			confirmDeletePlayerButton.style.display = 'none';
			cancelDeletePlayerButton.textContent = 'OK';
			playerToDelete = null;
			return;
		}

		if (playerName === PlayerManager.getCurrentPlayerName()) {
			deletePlayerMessage.textContent = 'Switch to another player before deleting this one.';
			deletePlayerMessage.className = 'error-message';
			deletePlayerOverlay.classList.remove('hidden');
			confirmDeletePlayerButton.style.display = 'none';
			cancelDeletePlayerButton.textContent = 'OK';
			playerToDelete = null;
			return;
		}
		
		// Show confirmation
		playerToDelete = playerName;
		deletePlayerMessage.textContent = `Are you sure you want to delete player "${playerName}"? This cannot be undone.`;
		deletePlayerMessage.className = 'warning-message';
		deletePlayerOverlay.classList.remove('hidden');
		confirmDeletePlayerButton.style.display = '';
		cancelDeletePlayerButton.textContent = 'Cancel';
	}
	
	confirmDeletePlayerButton.addEventListener('click', () => {
		if (playerToDelete) {
			if (PlayerManager.deletePlayer(playerToDelete)) {
				populatePlayerMenu();
				populateLevelGrid();
			}
			playerToDelete = null;
		}
		deletePlayerOverlay.classList.add('hidden');
	});
	
	cancelDeletePlayerButton.addEventListener('click', () => {
		deletePlayerOverlay.classList.add('hidden');
		playerToDelete = null;
	});
	
	// Initial population
	populatePlayerMenu();
}
