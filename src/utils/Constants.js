/**
 * Constants.js
 * 
 * Description: Game constants and enumerations for the Ball Drop Puzzle Game
 * 
 * Dependencies: None
 * 
 * Exports: CONSTANTS object containing all game constants
 */

/**
 * Game constants
 */
const CONSTANTS = {
	
	/**
	 * Grid dimensions
	 */
	GRID_ROWS: 25,
	GRID_COLS: 15,
	
	/**
	 * Ball types enumeration
	 */
	BALL_TYPES: {
		NORMAL: 'NORMAL',
		EXPLODING: 'EXPLODING',
		PAINTER_HORIZONTAL: 'PAINTER_HORIZONTAL',
		PAINTER_VERTICAL: 'PAINTER_VERTICAL',
		PAINTER_DIAGONAL_NE: 'PAINTER_DIAGONAL_NE',
		PAINTER_DIAGONAL_NW: 'PAINTER_DIAGONAL_NW',
		BLOCKING: 'BLOCKING'
	},
	
	/**
	 * Painter ball types (subset for easy checking)
	 */
	PAINTER_TYPES: ['PAINTER_HORIZONTAL', 'PAINTER_VERTICAL', 'PAINTER_DIAGONAL_NE', 'PAINTER_DIAGONAL_NW'],
	
	/**
	 * Direction enumeration
	 */
	DIRECTIONS: {
		UP: 'UP',
		DOWN: 'DOWN',
		LEFT: 'LEFT',
		RIGHT: 'RIGHT',
		NONE: 'NONE'
	},
	
	/**
	 * Match direction enumeration
	 */
	MATCH_DIRECTIONS: {
		HORIZONTAL: 'HORIZONTAL',
		VERTICAL: 'VERTICAL',
		DIAGONAL_NE: 'DIAGONAL_NE',
		DIAGONAL_SE: 'DIAGONAL_SE',
		DIAGONAL_SW: 'DIAGONAL_SW',
		DIAGONAL_NW: 'DIAGONAL_NW'
	},
	
	/**
	 * Game state enumeration
	 */
	GAME_STATES: {
		MENU: 'MENU',
		PLAYING: 'PLAYING',
		PAUSED: 'PAUSED',
		GAME_OVER: 'GAME_OVER',
		LEVEL_COMPLETE: 'LEVEL_COMPLETE'
	},
	
	/**
	 * Game mode enumeration
	 */
	GAME_MODES: {
		CLASSIC: 'CLASSIC',      // Original timed mode
		ZEN: 'ZEN',              // Untimed, play until grid fills
		GAUNTLET: 'GAUNTLET',    // Pre-filled rows at start
		RISING_TIDE: 'RISING_TIDE' // Blocking rows rise from bottom
	},
	
	/**
	 * Game mode configurations
	 */
	GAME_MODE_CONFIG: {
		CLASSIC: {
			name: 'Classic',
			description: 'Clear orbs before time runs out',
			timed: true,
			preFillRows: 0,
			risingBlocks: false
		},
		ZEN: {
			name: 'Zen',
			description: 'Untimed play - focus on combos and high scores',
			timed: false,
			preFillRows: 0,
			risingBlocks: false
		},
		GAUNTLET: {
			name: 'Gauntlet',
			description: 'Start with pre-filled rows for extra challenge',
			timed: true,
			preFillRows: 5, // Number of rows to pre-fill (configurable per difficulty)
			risingBlocks: true,
			risingInterval: 5000 // milliseconds
		},
		RISING_TIDE: {
			name: 'Rising Tide',
			description: 'Blocking orbs rise from the bottom every 9 seconds',
			timed: true,
			preFillRows: 0,
			risingBlocks: true,
			risingInterval: 9000 // milliseconds
		}
	},
	
	/**
	 * Piece shape types
	 */
	PIECE_TYPES: {
		I: 'I',
		O: 'O',
		T: 'T',
		L: 'L',
		J: 'J',
		S: 'S',
		Z: 'Z',
		SINGLE: 'SINGLE'
	},
	
	/**
	 * Event names for EventEmitter
	 */
	EVENTS: {
		GAME_START: 'gameStartEvent',
		GAME_PAUSE: 'gamePauseEvent',
		GAME_RESUME: 'gameResumeEvent',
		GAME_OVER: 'gameOverEvent',
		LEVEL_COMPLETE: 'levelCompleteEvent',
		PIECE_SPAWN: 'pieceSpawnEvent',
		PIECE_LOCK: 'pieceLockEvent',
		MATCH_FOUND: 'matchFoundEvent',
		CASCADE: 'cascadeEvent',
		CASCADE_COMPLETE: 'cascadeCompleteEvent',
		BALLS_CLEARED: 'ballsClearedEvent',
		SCORE_UPDATE: 'scoreUpdateEvent',
		MOVE_LEFT: 'moveLeftEvent',
		MOVE_RIGHT: 'moveRightEvent',
		ROTATE: 'rotateEvent',
		SOFT_DROP: 'softDropEvent',
		SOFT_DROP_END: 'softDropEndEvent',
		HARD_DROP: 'hardDropEvent',
		PAUSE: 'pauseEvent',
		RESTART: 'restartEvent',
		AD_INTERSTITIAL_REQUESTED: 'adInterstitialRequestedEvent',
		AD_FREE_ACTIVATED: 'adFreeActivatedEvent',
		PWA_INSTALLED: 'pwaInstalledEvent',
		PWA_ONLINE: 'pwaOnlineEvent',
		PWA_OFFLINE: 'pwaOfflineEvent',
		PWA_UPDATE_AVAILABLE: 'pwaUpdateAvailableEvent',
		PWA_BEFORE_RELOAD: 'pwaBeforeReloadEvent',
		GOAL_UPDATE: 'goalUpdateEvent',
		HINT_SHOWN: 'hintShownEvent'
	},
	
	/**
	 * Minimum match length for clearing
	 */
	MIN_MATCH_LENGTH: 3,
	
	/**
	 * Maximum cascade depth (emergency break)
	 */
	MAX_CASCADE_DEPTH: 10,
	
	/**
	 * Explosion radius in cells
	 */
	EXPLOSION_RADIUS: 3,
	
	/**
	 * Difficulty levels
	 */
	DIFFICULTY_LEVELS: {
		EASY: 1,
		MEDIUM: 2,
		HARD: 3,
		EXPERT: 4,
		MASTER: 5
	},
	
	/**
	 * LocalStorage keys
	 */
	STORAGE_KEYS: {
		HIGH_SCORES: 'ballDropGame_highScores',
		UNLOCKED_LEVELS: 'ballDropGame_unlockedLevels',
		SETTINGS: 'ballDropGame_settings',
		ZEN_SAVE_PREFIX: 'orbfall_zen_'
	}
	
};

// Export both CONSTANTS object and individual common constants for convenience
export { CONSTANTS };
export const BALL_TYPES = CONSTANTS.BALL_TYPES;
export const GAME_STATES = CONSTANTS.GAME_STATES;
export const EVENTS = CONSTANTS.EVENTS;
