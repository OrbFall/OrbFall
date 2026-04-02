/**
 * MissionManager.js
 *
 * Sequential micro-goal chain for MISSION game mode.
 * Reveals one goal at a time; completing it advances to the next.
 * Score = pointsPerGoal × completed + remainingTime × timeBonusMultiplier.
 *
 * Dependencies: ConfigManager, EventEmitter, Constants
 * Exports: MissionManager singleton
 */

import { ConfigManager } from './ConfigManager.js';
import { EventEmitter } from '../utils/EventEmitter.js';
import { CONSTANTS } from '../utils/Constants.js';
import { PieceFactory } from './PieceFactory.js';

class MissionManagerClass {
	constructor() {
		this.active = false;
		this.chain = [];          // Array of { type, label, target, progress, completed }
		this.currentIndex = 0;
		this.goalsCompleted = 0;
		this.difficulty = 1;

		this._boundOnBallsCleared = (data) => this._onBallsCleared(data);
		this._boundOnCascadeComplete = (data) => this._onCascadeComplete(data);
		this._boundOnScoreUpdate = (data) => this._onScoreUpdate(data);
	}

	/**
	 * Initialize for a new mission run
	 * @param {Number} difficulty - Current difficulty (1-5)
	 * @param {Number} level - Current level (used to filter impossible goals)
	 */
	initialize(difficulty, level) {
		this.difficulty = difficulty || 1;
		this.level = level || 1;
		this.currentIndex = 0;
		this.goalsCompleted = 0;
		this.active = true;

		// Remove old listeners
		EventEmitter.off(CONSTANTS.EVENTS.BALLS_CLEARED, this._boundOnBallsCleared);
		EventEmitter.off(CONSTANTS.EVENTS.CASCADE_COMPLETE, this._boundOnCascadeComplete);
		EventEmitter.off(CONSTANTS.EVENTS.SCORE_UPDATE, this._boundOnScoreUpdate);

		// Check which special types are available at this level
		const hasSpecials = PieceFactory.getUnlockedSpecialTypes
			? PieceFactory.getUnlockedSpecialTypes(this.level).length > 0
			: this.level >= 3; // fallback heuristic

		// Build chain from config, filtering out impossible goals
		const chainCfg = ConfigManager.get('mission.goalChain', []);
		const basePoints = ConfigManager.get('mission.pointsPerGoal', 50);
		let idx = 0;
		this.chain = [];
		for (const cfg of chainCfg) {
			// Skip useSpecials if no specials unlocked at this level
			if (cfg.type === 'useSpecials' && !hasSpecials) continue;

			const target = this._computeTarget(cfg);
			const points = Math.ceil(basePoints * Math.pow(1.2, this.chain.length) / 5) * 5;
			// Cascade and streak goals are binary (achieved or not): target=1, required depth/streak stored separately
			const isCascade = cfg.type === 'cascade';
			const isStreak = cfg.type === 'streak';
			this.chain.push({
				id: idx++,
				type: cfg.type,
				label: cfg.label.replace('{n}', target),
				target: (isCascade || isStreak) ? 1 : target,
				requiredDepth: isCascade ? target : undefined,
				requiredStreak: isStreak ? target : undefined,
				progress: 0,
				completed: false,
				points
			});
		}

		// Subscribe to events
		EventEmitter.on(CONSTANTS.EVENTS.BALLS_CLEARED, this._boundOnBallsCleared);
		EventEmitter.on(CONSTANTS.EVENTS.CASCADE_COMPLETE, this._boundOnCascadeComplete);
		EventEmitter.on(CONSTANTS.EVENTS.SCORE_UPDATE, this._boundOnScoreUpdate);

		this._emitUpdate();
	}

	/**
	 * Tear down listeners
	 */
	reset() {
		EventEmitter.off(CONSTANTS.EVENTS.BALLS_CLEARED, this._boundOnBallsCleared);
		EventEmitter.off(CONSTANTS.EVENTS.CASCADE_COMPLETE, this._boundOnCascadeComplete);
		EventEmitter.off(CONSTANTS.EVENTS.SCORE_UPDATE, this._boundOnScoreUpdate);
		this.active = false;
		this.chain = [];
		this.currentIndex = 0;
		this.goalsCompleted = 0;
	}

	// ── Target Computation ──

	_computeTarget(cfg) {
		const raw = cfg.base + (this.difficulty - 1) * (cfg.perDifficulty || 0);
		const rounded = Math.floor(raw);
		return cfg.max ? Math.min(rounded, cfg.max) : rounded;
	}

	// ── Current Goal ──

	getCurrentGoal() {
		if (this.currentIndex < this.chain.length) {
			return this.chain[this.currentIndex];
		}
		return null;
	}

	isChainComplete() {
		return this.currentIndex >= this.chain.length;
	}

	getGoalsCompleted() {
		return this.goalsCompleted;
	}

	getTotalGoals() {
		return this.chain.length;
	}

	/**
	 * Calculate final mission score
	 * @param {Number} remainingTime - Seconds remaining on the clock
	 * @returns {Number}
	 */
	calculateScore(remainingTime) {
		return 0; // Points awarded immediately per-mission via MISSION_GOAL_COMPLETE
	}

	// ── Event Handlers ──

	_onBallsCleared(data) {
		if (!this.active) return;
		const goal = this.getCurrentGoal();
		if (!goal || goal.completed) return;

		const balls = data.balls || [];

		if (goal.type === 'clearBalls') {
			goal.progress += data.count || balls.length;
		} else if (goal.type === 'useSpecials') {
			const specialCount = balls.filter(b => b.type !== CONSTANTS.BALL_TYPES.NORMAL).length;
			goal.progress += specialCount;
		}

		this._checkCurrent();
	}

	_onCascadeComplete(data) {
		if (!this.active) return;
		const goal = this.getCurrentGoal();
		if (!goal || goal.completed) return;

		if (goal.type === 'cascade') {
			if (data.cascadeCount >= (goal.requiredDepth ?? goal.target)) {
				goal.progress = 1;
			}
		}

		this._checkCurrent();
	}

	_onScoreUpdate(data) {
		if (!this.active) return;
		const goal = this.getCurrentGoal();
		if (!goal || goal.completed) return;

		if (goal.type === 'streak') {
			if (data.matchStreak !== undefined && data.matchStreak >= (goal.requiredStreak ?? goal.target)) {
				goal.progress = 1;
			}
		}

		this._checkCurrent();
	}

	// ── Completion ──

	_checkCurrent() {
		const goal = this.getCurrentGoal();
		if (!goal || goal.completed) return;

		if (goal.progress >= goal.target) {
			goal.completed = true;
			this.goalsCompleted++;
			EventEmitter.emit(CONSTANTS.EVENTS.MISSION_GOAL_COMPLETE, {
				goal: { id: goal.id, label: goal.label, points: goal.points },
				goalsCompleted: this.goalsCompleted,
				totalGoals: this.chain.length,
				chainComplete: this.currentIndex + 1 >= this.chain.length
			});
			this.currentIndex++;
		}

		this._emitUpdate();
	}

	_emitUpdate() {
		const current = this.getCurrentGoal();
		EventEmitter.emit(CONSTANTS.EVENTS.MISSION_GOAL_UPDATE, {
			current: current ? {
				id: current.id,
				type: current.type,
				label: current.label,
				progress: Math.min(current.progress, current.target),
				target: current.target,
				completed: current.completed,
				points: current.points
			} : null,
			goalsCompleted: this.goalsCompleted,
			totalGoals: this.chain.length,
			chainComplete: this.isChainComplete()
		});
	}
}

const MissionManager = new MissionManagerClass();
export default MissionManager;
