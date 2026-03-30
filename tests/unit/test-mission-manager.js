/**
 * Unit tests for MissionManager
 * @module test-mission-manager
 */

import MissionManager from '../../src/modules/MissionManager.js';
import { ConfigManager } from '../../src/modules/ConfigManager.js';
import { EventEmitter } from '../../src/utils/EventEmitter.js';
import { CONSTANTS } from '../../src/utils/Constants.js';

// Use a high level so all goal types (including useSpecials) are available
const HIGH_LEVEL = 10;

const testSuite = {
	name: 'MissionManager Tests',
	tests: []
};

// ── Initialization ──

testSuite.tests.push({
	name: 'initialize - builds chain from config',
	async run() {
		await ConfigManager.loadConfig();
		MissionManager.initialize(1, HIGH_LEVEL);
		const total = MissionManager.getTotalGoals();
		if (total === 0) throw new Error('Chain should not be empty');
		if (!MissionManager.active) throw new Error('Should be active after init');
		if (MissionManager.getGoalsCompleted() !== 0) throw new Error('goalsCompleted should start at 0');
		MissionManager.reset();
	}
});

testSuite.tests.push({
	name: 'initialize - resets state on re-init',
	async run() {
		await ConfigManager.loadConfig();
		MissionManager.initialize(1, HIGH_LEVEL);
		// Simulate some progress
		MissionManager.goalsCompleted = 3;
		MissionManager.currentIndex = 3;
		MissionManager.initialize(1, HIGH_LEVEL);
		if (MissionManager.getGoalsCompleted() !== 0) throw new Error('Should reset goalsCompleted');
		if (MissionManager.currentIndex !== 0) throw new Error('Should reset currentIndex');
		MissionManager.reset();
	}
});

// ── getCurrentGoal ──

testSuite.tests.push({
	name: 'getCurrentGoal - returns first goal initially',
	async run() {
		await ConfigManager.loadConfig();
		MissionManager.initialize(1, HIGH_LEVEL);
		const goal = MissionManager.getCurrentGoal();
		if (!goal) throw new Error('Should have a current goal');
		if (goal.id !== 0) throw new Error('First goal should have id 0');
		if (typeof goal.label !== 'string') throw new Error('Goal should have a label');
		if (typeof goal.target !== 'number') throw new Error('Goal should have numeric target');
		MissionManager.reset();
	}
});

testSuite.tests.push({
	name: 'getCurrentGoal - returns null when chain complete',
	async run() {
		await ConfigManager.loadConfig();
		MissionManager.initialize(1, HIGH_LEVEL);
		// Fast-forward to end
		MissionManager.currentIndex = MissionManager.chain.length;
		const goal = MissionManager.getCurrentGoal();
		if (goal !== null) throw new Error('Should return null when chain exhausted');
		MissionManager.reset();
	}
});

// ── isChainComplete ──

testSuite.tests.push({
	name: 'isChainComplete - false at start, true when done',
	async run() {
		await ConfigManager.loadConfig();
		MissionManager.initialize(1, HIGH_LEVEL);
		if (MissionManager.isChainComplete()) throw new Error('Should not be complete at start');
		MissionManager.currentIndex = MissionManager.chain.length;
		if (!MissionManager.isChainComplete()) throw new Error('Should be complete when index >= length');
		MissionManager.reset();
	}
});

// ── clearBalls goal progression ──

testSuite.tests.push({
	name: 'onBallsCleared - advances clearBalls goal',
	async run() {
		await ConfigManager.loadConfig();
		MissionManager.initialize(1, HIGH_LEVEL);
		// Find first clearBalls goal
		const idx = MissionManager.chain.findIndex(g => g.type === 'clearBalls');
		if (idx === -1) throw new Error('Config should have at least one clearBalls goal');
		MissionManager.currentIndex = idx;
		const goal = MissionManager.getCurrentGoal();
		const before = goal.progress;
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 5, balls: [] });
		if (goal.progress !== before + 5) throw new Error(`Progress should increase by 5, got ${goal.progress}`);
		MissionManager.reset();
	}
});

// ── cascade goal progression ──

testSuite.tests.push({
	name: 'onCascadeComplete - advances cascade goal',
	async run() {
		await ConfigManager.loadConfig();
		MissionManager.initialize(1, HIGH_LEVEL);
		const idx = MissionManager.chain.findIndex(g => g.type === 'cascade');
		if (idx === -1) throw new Error('Config should have at least one cascade goal');
		MissionManager.currentIndex = idx;
		const goal = MissionManager.getCurrentGoal();
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 3 });
		if (goal.progress !== 3) throw new Error(`Cascade progress should be 3, got ${goal.progress}`);
		// Smaller cascade should not decrease
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		if (goal.progress !== 3) throw new Error('Cascade progress should not decrease');
		MissionManager.reset();
	}
});

// ── streak goal progression ──

testSuite.tests.push({
	name: 'onScoreUpdate - advances streak goal',
	async run() {
		await ConfigManager.loadConfig();
		MissionManager.initialize(1, HIGH_LEVEL);
		const idx = MissionManager.chain.findIndex(g => g.type === 'streak');
		if (idx === -1) throw new Error('Config should have at least one streak goal');
		MissionManager.currentIndex = idx;
		const goal = MissionManager.getCurrentGoal();
		EventEmitter.emit(CONSTANTS.EVENTS.SCORE_UPDATE, { matchStreak: 4, score: 100 });
		if (goal.progress !== 4) throw new Error(`Streak progress should be 4, got ${goal.progress}`);
		MissionManager.reset();
	}
});

// ── Goal completion advances chain ──

testSuite.tests.push({
	name: 'completing a goal advances to the next one',
	async run() {
		await ConfigManager.loadConfig();
		MissionManager.initialize(1, HIGH_LEVEL);
		const firstGoal = MissionManager.getCurrentGoal();
		// Force completion
		firstGoal.progress = firstGoal.target;
		MissionManager._checkCurrent();
		if (MissionManager.getGoalsCompleted() !== 1) throw new Error('Should have 1 goal completed');
		const second = MissionManager.getCurrentGoal();
		if (!second || second.id === firstGoal.id) throw new Error('Should advance to next goal');
		MissionManager.reset();
	}
});

// ── calculateScore ──

testSuite.tests.push({
	name: 'calculateScore - includes goals and time bonus',
	async run() {
		await ConfigManager.loadConfig();
		MissionManager.initialize(1, HIGH_LEVEL);
		const pointsPerGoal = ConfigManager.get('mission.pointsPerGoal', 50);
		const timeMult = ConfigManager.get('mission.timeBonusMultiplier', 2);
		MissionManager.goalsCompleted = 3;
		const score = MissionManager.calculateScore(30);
		const expected = (3 * pointsPerGoal) + Math.floor(30 * timeMult);
		if (score !== expected) throw new Error(`Expected ${expected}, got ${score}`);
		MissionManager.reset();
	}
});

// ── MISSION_GOAL_UPDATE event ──

testSuite.tests.push({
	name: 'emits MISSION_GOAL_UPDATE on initialize',
	async run() {
		await ConfigManager.loadConfig();
		let emitted = null;
		const handler = (data) => { emitted = data; };
		EventEmitter.on(CONSTANTS.EVENTS.MISSION_GOAL_UPDATE, handler);
		try {
			MissionManager.initialize(1, HIGH_LEVEL);
			if (!emitted) throw new Error('Should emit MISSION_GOAL_UPDATE');
			if (!emitted.current) throw new Error('Should include current goal');
			if (emitted.totalGoals === 0) throw new Error('Should have totalGoals > 0');
		} finally {
			EventEmitter.off(CONSTANTS.EVENTS.MISSION_GOAL_UPDATE, handler);
			MissionManager.reset();
		}
	}
});

// ── reset cleans up ──

testSuite.tests.push({
	name: 'reset - clears state and deactivates',
	async run() {
		await ConfigManager.loadConfig();
		MissionManager.initialize(1, HIGH_LEVEL);
		MissionManager.reset();
		if (MissionManager.active) throw new Error('Should not be active after reset');
		if (MissionManager.chain.length !== 0) throw new Error('Chain should be empty after reset');
		if (MissionManager.getGoalsCompleted() !== 0) throw new Error('goalsCompleted should be 0');
	}
});

// ── Difficulty scaling ──

testSuite.tests.push({
	name: 'targets scale with difficulty',
	async run() {
		await ConfigManager.loadConfig();
		MissionManager.initialize(1, HIGH_LEVEL);
		const easyTarget = MissionManager.chain[0].target;
		MissionManager.reset();
		MissionManager.initialize(5, HIGH_LEVEL);
		const hardTarget = MissionManager.chain[0].target;
		MissionManager.reset();
		if (hardTarget < easyTarget) throw new Error(`D5 target (${hardTarget}) should be >= D1 target (${easyTarget})`);
	}
});

// ── Only current goal gets progress ──

testSuite.tests.push({
	name: 'only the current goal receives event progress',
	async run() {
		await ConfigManager.loadConfig();
		MissionManager.initialize(1, HIGH_LEVEL);
		// Ensure at least 2 goals
		if (MissionManager.chain.length < 2) throw new Error('Need at least 2 goals for this test');
		const second = MissionManager.chain[1];
		const beforeProgress = second.progress;
		// Fire event matching second goal type
		if (second.type === 'clearBalls') {
			EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 100, balls: [] });
		}
		if (second.progress !== beforeProgress) throw new Error('Second goal should not advance while first is current');
		MissionManager.reset();
	}
});

// ── Level-aware goal filtering ──

testSuite.tests.push({
	name: 'initialize - filters useSpecials goals at level 1',
	async run() {
		await ConfigManager.loadConfig();
		MissionManager.initialize(1, 1);
		const hasUseSpecials = MissionManager.chain.some(g => g.type === 'useSpecials');
		if (hasUseSpecials) throw new Error('useSpecials should be filtered out at level 1 (no specials unlocked)');
		MissionManager.reset();
	}
});

testSuite.tests.push({
	name: 'initialize - keeps useSpecials goals at high level',
	async run() {
		await ConfigManager.loadConfig();
		MissionManager.initialize(1, HIGH_LEVEL);
		const hasUseSpecials = MissionManager.chain.some(g => g.type === 'useSpecials');
		if (!hasUseSpecials) throw new Error('useSpecials should be present at level 10 (specials unlocked)');
		MissionManager.reset();
	}
});

export default testSuite;
