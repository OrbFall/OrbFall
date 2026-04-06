/**
 * AnalyticsManager
 * Handles analytics tracking via Google Analytics 4 (gtag.js)
 */

class AnalyticsManager {
	constructor() {
		this.enabled = false;
		this.debug = false;
		this._playerName = null;
	}

	/**
	 * Initialize GA4
	 * @param {String} measurementId - GA4 Measurement ID (G-XXXXXXXXXX)
	 * @param {Object} options
	 */
	init(measurementId, options = {}) {
		if (!measurementId || typeof gtag === 'undefined') {
			console.warn('AnalyticsManager: gtag not available or no measurement ID provided');
			return;
		}

		try {
			this.enabled = true;
			this.debug = options.debug || false;
			if (this.debug) {
				console.log('AnalyticsManager: Initialized with', measurementId);
			}
		} catch (error) {
			console.error('AnalyticsManager: Failed to initialize', error);
		}
	}

	/**
	 * Store the player name for use as a user property on subsequent events.
	 * GA4 has no "identify" concept — we set a user property instead.
	 * @param {String} playerName
	 * @param {Object} properties - ignored (Mixpanel people.set compat shim)
	 */
	identifyPlayer(playerName, properties = {}) {
		if (!this.enabled) return;

		try {
			this._playerName = playerName;
			const isGuest = playerName === 'Guest';

			// Persist a stable anonymous session identifier for guest users
			if (isGuest && !sessionStorage.getItem('guestSessionId')) {
				const random = Math.random().toString(36).substring(2, 9);
				sessionStorage.setItem('guestSessionId', `Guest_${Date.now()}_${random}`);
			}

			gtag('set', 'user_properties', {
				player_type: isGuest ? 'guest' : 'named',
				games_played: properties.gamesPlayed ?? undefined,
				high_score: properties.highScore ?? undefined
			});
		} catch (error) {
			console.error('AnalyticsManager: Failed to identify player', error);
		}
	}

	/**
	 * Track a custom GA4 event.
	 * GA4 event names must be snake_case and ≤40 chars.
	 * @param {String} eventName
	 * @param {Object} properties
	 */
	track(eventName, properties = {}) {
		if (!this.enabled) return;

		try {
			// Convert "Level Completed" → "level_completed" for GA4 convention
			const ga4Name = eventName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
			gtag('event', ga4Name, properties);
			if (this.debug) {
				console.log('AnalyticsManager: Tracked event:', ga4Name, properties);
			}
		} catch (error) {
			console.error('AnalyticsManager: Failed to track event', error);
		}
	}

	// === Game Events ===

	trackGameStart(playerName) {
		this.track('Game Started', { player: playerName });
	}

	trackLevelStart(difficulty, level, mode = 'CLASSIC') {
		this.track('Level Started', {
			difficulty,
			level,
			difficulty_level: `${difficulty}-${level}`,
			game_mode: mode
		});
	}

	trackLevelComplete(difficulty, level, score, timeElapsed, mode, stats = {}) {
		this.track('Level Completed', {
			difficulty,
			level,
			difficulty_level: `${difficulty}-${level}`,
			game_mode: mode,
			score,
			time_seconds: timeElapsed,
			...stats
		});
	}

	trackLevelFailed(difficulty, level, score, timeElapsed, reason, mode, stats = {}) {
		this.track('Level Failed', {
			difficulty,
			level,
			difficulty_level: `${difficulty}-${level}`,
			game_mode: mode,
			score,
			time_seconds: timeElapsed,
			failure_reason: reason,
			...stats
		});
	}

	trackSpecialBallUsed(ballType, difficulty, level) {
		this.track('Special Ball Used', {
			ball_type: ballType,
			difficulty,
			level,
			difficulty_level: `${difficulty}-${level}`
		});
	}

	trackCascade(cascadeLevel, difficulty, level, points) {
		this.track('Cascade', {
			cascade_level: cascadeLevel,
			difficulty,
			level,
			difficulty_level: `${difficulty}-${level}`,
			points
		});
	}

	trackMilestone(milestone, properties = {}) {
		this.track('Milestone Reached', { milestone, ...properties });
	}

	trackSettingChanged(setting, value) {
		this.track('Setting Changed', { setting, value });
	}

	trackError(errorType, message, context = {}) {
		this.track('Error Occurred', { error_type: errorType, message, ...context });
	}

	/**
	 * Update player profile stats as GA4 user properties.
	 * GA4 does not have a Mixpanel-style people.set; we use gtag user_properties instead.
	 * @param {Object} stats
	 */
	updatePlayerProfile(stats) {
		if (!this.enabled) return;

		try {
			gtag('set', 'user_properties', {
				games_played: stats.gamesPlayed,
				total_score: stats.totalScore,
				high_score: stats.highScore,
				levels_completed: stats.levelsCompleted,
				highest_level: stats.highestLevel
			});
		} catch (error) {
			console.error('AnalyticsManager: Failed to update player profile', error);
		}
	}

	/**
	 * No-op shim kept for call-site compatibility.
	 * GA4 has no server-side increment; callers can track individual events instead.
	 */
	incrementPlayerProperty(_property, _amount = 1) {
		// Not supported in GA4 — individual events carry the value
	}
}

// Create singleton instance
const analyticsManager = new AnalyticsManager();

export default analyticsManager;
