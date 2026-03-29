/**
 * ScoreManager.js
 * 
 * Description: Score calculation and tracking
 * 
 * Dependencies: ConfigManager, EventEmitter, Constants
 * 
 * Exports: ScoreManager singleton
 */

import { ConfigManager } from './ConfigManager.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { CONSTANTS } from '../utils/Constants.js';
import PlayerManager from './PlayerManager.js';
import StatisticsTracker from './StatisticsTracker.js';

/**
 * ScoreManager class for tracking and calculating scores
 */
class ScoreManagerClass {
	
	constructor() {
		this.score = 0;
		this.difficulty = 1;
		this.level = 1;
		this.mode = 'CLASSIC';
		this.currentCascadeData = null;
		this.matchStreak = 0;
		this.isInitialized = false;
		
		// Bind methods for event listener removal
		this._boundOnBallsCleared = (data) => this._onBallsCleared(data);
		this._boundOnCascadeLevelComplete = () => this._onCascadeLevelComplete();
		this._boundOnCascadeComplete = (data) => this._onCascadeComplete(data);
	}
	
	/**
	 * Initialize score manager and set up event listeners
	 * @param {Number} difficulty - Game difficulty level (1-5)
	 * @param {Number} level - Game level
	 * @param {String} mode - Game mode (CLASSIC, ZEN, GAUNTLET, RISING_TIDE)
	 * @returns {void}
	 */
	initialize(difficulty, level, mode = 'CLASSIC') {
		this.difficulty = difficulty || 1;
		this.level = level || 1;
		this.mode = mode || 'CLASSIC';
		this.score = 0;
		this.currentCascadeData = null;
		this.matchStreak = 0;
		
		// Remove old listeners if already initialized
		if (this.isInitialized) {
			EventEmitter.off(CONSTANTS.EVENTS.BALLS_CLEARED, this._boundOnBallsCleared);
			EventEmitter.off(CONSTANTS.EVENTS.CASCADE, this._boundOnCascadeLevelComplete);
			EventEmitter.off(CONSTANTS.EVENTS.CASCADE_COMPLETE, this._boundOnCascadeComplete);
		}
		
		// Listen for scoring events
		EventEmitter.on(CONSTANTS.EVENTS.BALLS_CLEARED, this._boundOnBallsCleared);
		EventEmitter.on(CONSTANTS.EVENTS.CASCADE, this._boundOnCascadeLevelComplete);
		EventEmitter.on(CONSTANTS.EVENTS.CASCADE_COMPLETE, this._boundOnCascadeComplete);
		
		this.isInitialized = true;
		
		// Emit initial score update with best score
		const bestScore = PlayerManager.getLevelBestScore(this.difficulty, this.level, this.mode) || 0;
		EventEmitter.emit(CONSTANTS.EVENTS.SCORE_UPDATE, { 
			score: 0,
			bestScore: bestScore,
			points: 0
		});
	}
	
	/**
	 * Handle balls cleared event
	 * @param {Object} data - Event data with count and matches
	 * @private
	 */
	_onBallsCleared(data) {
		// Record statistics for cleared balls
		if (data.balls && Array.isArray(data.balls)) {
			data.balls.forEach(ball => {
				if (ball.type && ball.color) {
					StatisticsTracker.recordMatch(ball.type, ball.color);
				}
			});
		}
		
		// Store data for cascade scoring
		if (!this.currentCascadeData) {
			this.currentCascadeData = {
				ballsPerLevel: [], // Track balls cleared at each cascade level
				currentLevel: 0 // Track which cascade level we're on
			};
		}
		
		// Each BALLS_CLEARED event represents a new cascade level
		const level = this.currentCascadeData.ballsPerLevel.length;
		this.currentCascadeData.ballsPerLevel.push(data.count);
		
		console.log(`⚽ BALLS_CLEARED: ${data.count} balls at level ${level + 1}, ballsPerLevel=`, this.currentCascadeData.ballsPerLevel);
	}
	
	/**
	 * Signal that current cascade level is complete and advance to next level
	 * Called when a cascade iteration finishes (after gravity completes)
	 */
	_onCascadeLevelComplete() {
		if (this.currentCascadeData) {
			this.currentCascadeData.currentLevel++;
			console.log(`📊 Cascade level ${this.currentCascadeData.currentLevel - 1} complete, advancing to level ${this.currentCascadeData.currentLevel}`);
		}
	}
	
	/**
	 * Handle cascade complete event
	 * @param {Object} data - Event data with cascadeCount
	 * @private
	 */
	_onCascadeComplete(data) {
		console.log(`🏁 CASCADE_COMPLETE received, cascadeCount=${data.cascadeCount}, currentCascadeData=`, this.currentCascadeData);
		
		// Initialize if somehow missing (safety check)
		if (!this.currentCascadeData) {
			console.warn('⚠️ CASCADE_COMPLETE but no currentCascadeData! Initializing with empty data.');
			this.currentCascadeData = {
				ballsPerLevel: [],
				currentLevel: 0
			};
		}
		
		// Use cascade count from GameEngine (actual cascade iterations)
		const cascadeCount = data.cascadeCount;
		
		console.log(`📊 BallsPerLevel:`, this.currentCascadeData.ballsPerLevel);
		
		// Calculate score using progressive multipliers per level
		const points = this._calculateCascadeScore(
			this.currentCascadeData.ballsPerLevel,
			cascadeCount
		);
		
		this.score += points;
		
		// Increment match streak and add streak bonus
		this.matchStreak++;
		const streakBonus = ConfigManager.get('scoring.streakBonus', 0);
		const streakCap = ConfigManager.get('scoring.streakCap', 10);
		let streakPoints = 0;
		if (streakBonus > 0 && this.matchStreak > 1) {
			streakPoints = Math.min(this.matchStreak, streakCap) * streakBonus;
			const diffMultiplier = ConfigManager.get(`scoring.difficultyMultipliers.difficulty${this.difficulty}`, 1.0);
			streakPoints = Math.floor(streakPoints * diffMultiplier);
			this.score += streakPoints;
		}
		
		// Get best score for current mode/difficulty/level
		const bestScore = PlayerManager.getLevelBestScore(this.difficulty, this.level, this.mode) || 0;
		
		// Emit score update event
		EventEmitter.emit(CONSTANTS.EVENTS.SCORE_UPDATE, { 
			score: this.score,
			bestScore: bestScore,
			points: points + streakPoints,
			cascadeCount: cascadeCount,
			matchStreak: this.matchStreak
		});
		
		// Reset cascade data
		this.currentCascadeData = null;
	}
	
	/**
	 * Calculate score for a cascade sequence using progressive multipliers
	 * Formula: Each cascade level N: balls × basePoints × N, PLUS cascade bonus
	 * Cascade bonus: 3 × (cascadeCount - 1) for cascades of 2+ levels
	 * Example: 2x cascade with L1(3 balls) + L2(5 balls) = (3×1) + (5×2) + cascadeBonus(3) = 3 + 10 + 3 = 16 points
	 * @param {Array<Number>} ballsPerLevel - Number of balls cleared at each cascade level [L1, L2, L3, ...]
	 * @param {Number} cascadeCount - Total number of cascade levels in sequence
	 * @returns {Number} Points earned after applying difficulty multiplier
	 * @private
	 */
	_calculateCascadeScore(ballsPerLevel, cascadeCount) {
		const basePoints = ConfigManager.get('scoring.basePointsPerBall', 1); // Default: 1 point per ball
		const difficultyMultiplier = ConfigManager.get(`scoring.difficultyMultipliers.difficulty${this.difficulty}`, 1.0); // 1.0x - 3.0x
		const cascadeBaseBonus = ConfigManager.get('scoring.cascadeBaseBonus', 3); // Base cascade bonus (default: 3)
		
		let score = 0;
		let breakdown = []; // For debug logging: ["L1(3×1=3)", "L2(5×2=10)"]
		
		// Progressive cascade scoring: each level gets increasing multiplier
		// Level 1: ×1, Level 2: ×2, Level 3: ×3, etc.
		for (let level = 0; level < ballsPerLevel.length; level++) {
			const balls = ballsPerLevel[level] || 0;
			const multiplier = (level + 1); // Cascade level number: 1x, 2x, 3x, 4x, etc.
			const levelScore = balls * basePoints * multiplier;
			score += levelScore;
			breakdown.push(`L${level + 1}(${balls}×${multiplier}=${levelScore})`);
		}
		
		// Add cascade bonus for 2+ cascades: 3 × (cascadeCount - 1)
		let cascadeBonusTotal = 0;
		if (cascadeCount >= 2) {
			cascadeBonusTotal = cascadeBaseBonus * (cascadeCount - 1);
			score += cascadeBonusTotal;
			breakdown.push(`CascadeBonus(${cascadeBaseBonus}×${cascadeCount - 1}=${cascadeBonusTotal})`);
		}
		
		// Apply difficulty multiplier to final total
		score = Math.floor(score * difficultyMultiplier);
		
		const totalBalls = ballsPerLevel.reduce((sum, b) => sum + b, 0);
		console.log(`🎯 SCORE CALC: ${totalBalls} balls, ${cascadeCount}x cascade, ${breakdown.join(' + ')}, difficulty=${difficultyMultiplier}x, TOTAL=${score}`);
		
		return score;
	}
	
	/**
	 * Get current score
	 * @returns {Number} Current score
	 */
	getScore() {
		return this.score;
	}
	
	/**
	 * Add points directly (for special events)
	 * @param {Number} points - Points to add
	 * @returns {void}
	 */
	addPoints(points) {
		this.score += points;
		EventEmitter.emit(CONSTANTS.EVENTS.SCORE_UPDATE, { 
			score: this.score,
			points: points
		});
	}
	
	/**
	 * Reset match streak when piece locks with no matches
	 * @returns {void}
	 */
	onNoMatch() {
		if (this.matchStreak > 0) {
			this.matchStreak = 0;
			EventEmitter.emit(CONSTANTS.EVENTS.SCORE_UPDATE, {
				score: this.score,
				matchStreak: 0
			});
		}
	}
	
	/**
	 * Reset score to zero
	 * @returns {void}
	 */
	reset() {
		this.score = 0;
		this.currentCascadeData = null;
		this.matchStreak = 0;
		EventEmitter.emit(CONSTANTS.EVENTS.SCORE_UPDATE, { 
			score: 0,
			bestScore: 0,
			points: 0
		});
	}
}

// Export singleton instance
const ScoreManager = new ScoreManagerClass();
export default ScoreManager;
export { ScoreManager };
