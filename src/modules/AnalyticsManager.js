/**
 * AnalyticsManager
 * Handles analytics tracking via Google Analytics 4 (gtag.js)
 */

class AnalyticsManager {
	constructor() {
		this.enabled = false;
		this.debug = false;
		this._playerName = null;
		this._gameContext = { game_mode: null, difficulty: null, level: null };
	}

	/**
	 * Update the current game context — automatically included on all subsequent events.
	 * Call whenever mode, difficulty, or level changes.
	 */
	setGameContext(mode, difficulty, level) {
		this._gameContext = {
			game_mode: mode ?? this._gameContext.game_mode,
			difficulty: difficulty ?? this._gameContext.difficulty,
			level: level ?? this._gameContext.level,
		};
	}

	/**
	 * Capture viewport/screen dimensions as GA4 user properties and
	 * return them as a plain object for inclusion in events.
	 */
	_getViewportProps() {
		const ua = navigator.userAgent;
		const browser = /Edg\//.test(ua) ? 'Edge'
			: /Chrome\//.test(ua) ? 'Chrome'
			: /Firefox\//.test(ua) ? 'Firefox'
			: /Safari\//.test(ua) ? 'Safari'
			: 'Other';
		const device_type = /Mobi|Android/i.test(ua) ? 'mobile'
			: /Tablet|iPad/i.test(ua) ? 'tablet'
			: 'desktop';
		return {
			viewport_width: window.innerWidth,
			viewport_height: window.innerHeight,
			screen_width: window.screen?.width ?? null,
			screen_height: window.screen?.height ?? null,
			device_pixel_ratio: window.devicePixelRatio ?? null,
			is_mobile: window.innerWidth < 768,
			browser,
			device_type,
		};
	}

	/**
	 * Set viewport dimensions as GA4 user properties so they appear
	 * in audience/user-level reports, and attach a resize listener
	 * that updates them if the window is resized.
	 */
	trackViewport() {
		if (!this.enabled) return;

		const report = () => {
			const props = this._getViewportProps();
			gtag('set', 'user_properties', {
				viewport_width: props.viewport_width,
				viewport_height: props.viewport_height,
				screen_width: props.screen_width,
				screen_height: props.screen_height,
				device_pixel_ratio: props.device_pixel_ratio,
				is_mobile: props.is_mobile,
			});
			if (this.debug) console.log('AnalyticsManager: viewport', props);
		};

		report();
		// Update on resize (debounced)
		let _resizeTimer;
		window.addEventListener('resize', () => {
			clearTimeout(_resizeTimer);
			_resizeTimer = setTimeout(report, 500);
		}, { passive: true });
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

			// Disable GA4 enhanced measurement events that generate noise.
			// scroll, click, outbound clicks etc. are meaningless for a game —
			// our own custom events carry all the useful context.
			gtag('config', measurementId, {
				send_page_view: true,
				allow_google_signals: false,
				// Suppress auto-collected events we don't want
				// (user_engagement and session_start still fire automatically and
				// cannot be disabled, but scroll/click can be suppressed via
				// enhanced measurement settings in the GA4 console)
			});

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
			gtag('event', ga4Name, {
				// All game events carry these context fields so they're clearly
				// distinguishable from GA4's own auto-collected events in reports
				event_category: 'orbfall_game',
				player_name: this._playerName ?? 'unknown',
				...this._gameContext,
				...this._getViewportProps(),
				...properties
			});
			if (this.debug) {
				console.log('AnalyticsManager: Tracked event:', ga4Name, properties);
			}
		} catch (error) {
			console.error('AnalyticsManager: Failed to track event', error);
		}
	}

	/**
	 * Attach a single delegated listener that fires a button_click event for
	 * every <button> or [role="button"] click. Call once after init().
	 * Uses the element's data-analytics-label, aria-label, textContent, or id
	 * — in that priority order — as the button name.
	 */
	trackButtonClicks() {
		if (!this.enabled) return;

		document.addEventListener('click', (e) => {
			const btn = e.target.closest('button, [role="button"], .btn-primary, .btn-secondary, .btn-danger');
			if (!btn) return;

			const label =
				btn.dataset.analyticsLabel ||
				btn.getAttribute('aria-label') ||
				btn.textContent?.trim().replace(/\s+/g, ' ').substring(0, 50) ||
				btn.id ||
				'unknown';

			this.track('button_click', {
				button_label: label,
				button_id: btn.id || null,
			});
		}, { passive: true });
	}

	// === Game Events ===

	trackGameStart(playerName) {
		this.track('Game Started', { player: playerName });
	}

	trackLevelStart(difficulty, level, mode = 'CLASSIC') {
		this.setGameContext(mode, difficulty, level);
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
