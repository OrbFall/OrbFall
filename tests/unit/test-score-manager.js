/**
 * test-score-manager.js
 * 
 * Unit tests for ScoreManager module
 */

import { ScoreManager } from '../../src/modules/ScoreManager.js';
import { ConfigManager } from '../../src/modules/ConfigManager.js';
import { EventEmitter } from '../../src/utils/EventEmitter.js';
import { CONSTANTS } from '../../src/utils/Constants.js';

// Test Suite
const testSuite = {
	name: 'ScoreManager Tests',
	tests: []
};

// Test: Initialize sets difficulty and resets score
testSuite.tests.push({
	name: 'initialize - Sets difficulty and resets score',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(3);
		
		if (ScoreManager.difficulty !== 3) {
			throw new Error(`Expected difficulty 3, got ${ScoreManager.difficulty}`);
		}
		
		if (ScoreManager.getScore() !== 0) {
			throw new Error(`Expected score 0, got ${ScoreManager.getScore()}`);
		}
	}
});

// Test: Reset clears score
testSuite.tests.push({
	name: 'reset - Clears score to zero',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(1);
		ScoreManager.addPoints(100);
		
		if (ScoreManager.getScore() === 0) {
			throw new Error('Score should not be 0 before reset');
		}
		
		ScoreManager.reset();
		
		if (ScoreManager.getScore() !== 0) {
			throw new Error(`Expected score 0 after reset, got ${ScoreManager.getScore()}`);
		}
	}
});

// Test: addPoints increases score
testSuite.tests.push({
	name: 'addPoints - Increases score correctly',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(1);
		ScoreManager.addPoints(50);
		
		if (ScoreManager.getScore() !== 50) {
			throw new Error(`Expected score 50, got ${ScoreManager.getScore()}`);
		}
		
		ScoreManager.addPoints(25);
		
		if (ScoreManager.getScore() !== 75) {
			throw new Error(`Expected score 75, got ${ScoreManager.getScore()}`);
		}
	}
});

// Test: Single cascade scoring (no bonus)
testSuite.tests.push({
	name: 'Cascade scoring - Single cascade (no bonus)',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(1); // Difficulty 1 (1.0x multiplier)
		
		// Simulate clearing 6 balls in one cascade
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 6, matches: 2 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		const score = ScoreManager.getScore();
		const expectedScore = 6 * 1; // 6 balls × 1 point, no cascade bonus
		
		if (score !== expectedScore) {
			throw new Error(`Expected score ${expectedScore}, got ${score}`);
		}
	}
});

// Test: Double cascade scoring (with bonus)
testSuite.tests.push({
	name: 'Cascade scoring - Double cascade (with bonus)',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(1); // Difficulty 1 (1.0x multiplier)
		
		// Simulate 2 cascades
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 3, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 3, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 2 });
		
		const score = ScoreManager.getScore();
		// L1: 3 balls × 1 point × 1x = 3
		// L2: 3 balls × 1 point × 2x = 6
		// Cascade bonus (2-level): 3
		// Total = 12
		const expectedScore = 12;
		
		if (score !== expectedScore) {
			throw new Error(`Expected score ${expectedScore}, got ${score}`);
		}
	}
});

// Test: Triple cascade scoring (exponential bonus)
testSuite.tests.push({
	name: 'Cascade scoring - Triple cascade (exponential bonus)',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(1); // Difficulty 1 (1.0x multiplier)
		
		// Simulate 3 cascades
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 3, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 3, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 3, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 3 });
		
		const score = ScoreManager.getScore();
		// L1: 3 balls × 1 point × 1x = 3
		// L2: 3 balls × 1 point × 2x = 6
		// L3: 3 balls × 1 point × 3x = 9
		// Cascade bonus (3-level): 3 × (3-1) = 6
		// Total = 24
		const expectedScore = 24;
		
		if (score !== expectedScore) {
			throw new Error(`Expected score ${expectedScore}, got ${score}`);
		}
	}
});

// Test: Difficulty multiplier - Easy (1.0x)
testSuite.tests.push({
	name: 'Difficulty multiplier - Easy (1.0x)',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(1); // Easy
		
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 10, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		const score = ScoreManager.getScore();
		const expectedScore = 10; // 10 × 1.0
		
		if (score !== expectedScore) {
			throw new Error(`Expected score ${expectedScore}, got ${score}`);
		}
	}
});

// Test: Difficulty multiplier - Medium (1.5x)
testSuite.tests.push({
	name: 'Difficulty multiplier - Medium (1.5x)',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(2); // Medium
		
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 10, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		const score = ScoreManager.getScore();
		const expectedScore = 15; // 10 × 1.5
		
		if (score !== expectedScore) {
			throw new Error(`Expected score ${expectedScore}, got ${score}`);
		}
	}
});

// Test: Difficulty multiplier - Hard (2.0x)
testSuite.tests.push({
	name: 'Difficulty multiplier - Hard (2.0x)',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(3); // Hard
		
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 10, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		const score = ScoreManager.getScore();
		const expectedScore = 20; // 10 × 2.0
		
		if (score !== expectedScore) {
			throw new Error(`Expected score ${expectedScore}, got ${score}`);
		}
	}
});

// Test: Difficulty multiplier - Expert (2.5x)
testSuite.tests.push({
	name: 'Difficulty multiplier - Expert (2.5x)',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(4); // Expert
		
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 10, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		const score = ScoreManager.getScore();
		const expectedScore = 25; // 10 × 2.5
		
		if (score !== expectedScore) {
			throw new Error(`Expected score ${expectedScore}, got ${score}`);
		}
	}
});

// Test: Difficulty multiplier - Master (3.0x)
testSuite.tests.push({
	name: 'Difficulty multiplier - Master (3.0x)',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(5); // Master
		
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 10, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		const score = ScoreManager.getScore();
		const expectedScore = 30; // 10 × 3.0
		
		if (score !== expectedScore) {
			throw new Error(`Expected score ${expectedScore}, got ${score}`);
		}
	}
});

// Test: Multiple separate cascades accumulate score
testSuite.tests.push({
	name: 'Multiple cascades - Score accumulates',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(1);
		
		// First cascade
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 3, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		const scoreAfterFirst = ScoreManager.getScore();
		
		// Second cascade
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 4, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		const finalScore = ScoreManager.getScore();
		// 3 + 4 base, plus streak bonus: min(2,10)*2*1.0 = 4
		const expectedFinal = 11; // 3 + 4 + 4
		
		if (finalScore !== expectedFinal) {
			throw new Error(`Expected final score ${expectedFinal}, got ${finalScore}`);
		}
	}
});

// Test: Cascade data resets between separate cascades
testSuite.tests.push({
	name: 'Cascade data - Resets between cascades',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(1);
		
		// First cascade with 2 levels
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 3, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 3, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 2 });
		
		// Second cascade should start fresh (no bonus from first)
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 5, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		const finalScore = ScoreManager.getScore();
		// First cascade: L1(3×1) + L2(3×2) + bonus(3) = 12
		// Second cascade: L1(5×1) = 5 + streak bonus(min(2,10)*2=4)
		// Total = 21
		const expectedScore = 21;
		
		if (finalScore !== expectedScore) {
			throw new Error(`Expected score ${expectedScore}, got ${finalScore}`);
		}
	}
});

// Test: Cascade data resets between separate cascades
testSuite.tests.push({
	name: 'Cascade data - Resets between cascades',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(1);
		
		// First cascade with 2 levels
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 3, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 3, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 2 });
		
		// Second cascade should start fresh (no bonus from first)
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 5, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		const finalScore = ScoreManager.getScore();
		// First cascade: L1(3×1) + L2(3×2) + bonus(3) = 12
		// Second cascade: L1(5×1) = 5 + streak bonus(min(2,10)*2=4)
		// Total = 21
		const expectedScore = 21;
		
		if (finalScore !== expectedScore) {
			throw new Error(`Expected score ${expectedScore}, got ${finalScore}`);
		}
	}
});

// Test: getScore returns current score
testSuite.tests.push({
	name: 'getScore - Returns current score value',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(1);
		
		if (ScoreManager.getScore() !== 0) {
			throw new Error('Initial score should be 0');
		}
		
		ScoreManager.addPoints(100);
		
		if (ScoreManager.getScore() !== 100) {
			throw new Error(`Expected score 100, got ${ScoreManager.getScore()}`);
		}
	}
});

// Test: addPoints emits SCORE_UPDATE event
testSuite.tests.push({
	name: 'addPoints - Emits SCORE_UPDATE event',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(1);
		
		let eventReceived = false;
		let receivedScore = null;
		let receivedPoints = null;
		
		const handler = (data) => {
			eventReceived = true;
			receivedScore = data.score;
			receivedPoints = data.points;
		};
		
		EventEmitter.on(CONSTANTS.EVENTS.SCORE_UPDATE, handler);
		ScoreManager.addPoints(50);
		EventEmitter.off(CONSTANTS.EVENTS.SCORE_UPDATE, handler);
		
		if (!eventReceived) {
			throw new Error('SCORE_UPDATE event not emitted');
		}
		
		if (receivedScore !== 50 || receivedPoints !== 50) {
			throw new Error(`Expected score 50 and points 50, got ${receivedScore} and ${receivedPoints}`);
		}
	}
});

// Test: Zero balls cleared doesn't crash
testSuite.tests.push({
	name: 'Edge case - Zero balls cleared',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(1);
		
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 0, matches: 0 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		if (ScoreManager.getScore() !== 0) {
			throw new Error(`Expected score 0, got ${ScoreManager.getScore()}`);
		}
	}
});

// Test: Negative points (shouldn't happen but validate)
testSuite.tests.push({
	name: 'Edge case - Negative points handled',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(1);
		ScoreManager.addPoints(100);
		ScoreManager.addPoints(-50);
		
		if (ScoreManager.getScore() !== 50) {
			throw new Error(`Expected score 50, got ${ScoreManager.getScore()}`);
		}
	}
});

// Test: Large cascade count
testSuite.tests.push({
	name: 'Edge case - Large cascade count (10 levels)',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(1);
		
		// Emit 10 BALLS_CLEARED events
		for (let i = 0; i < 10; i++) {
			EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 3, matches: 1 });
		}
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 10 });
		
		const score = ScoreManager.getScore();
		
		// Should calculate without errors
		if (score <= 0) {
			throw new Error(`Expected positive score for 10-cascade, got ${score}`);
		}
	}
});

// Test: Large number of balls cleared
testSuite.tests.push({
	name: 'Edge case - Large ball count (1000 balls)',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(1);
		
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 1000, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		if (ScoreManager.getScore() !== 1000) {
			throw new Error(`Expected score 1000, got ${ScoreManager.getScore()}`);
		}
	}
});

// Test: Multiple initialize calls don't duplicate listeners
testSuite.tests.push({
	name: 'initialize - Multiple calls remove old listeners',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(1);
		ScoreManager.initialize(1); // Call again
		ScoreManager.initialize(1); // And again
		
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 10, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		// Score should only be counted once (10 points)
		if (ScoreManager.getScore() !== 10) {
			throw new Error(`Expected score 10 (counted once), got ${ScoreManager.getScore()}`);
		}
	}
});

// Test: Difficulty changes affect scoring
testSuite.tests.push({
	name: 'Difficulty change - Affects subsequent scoring',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(1); // 1.0x
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 10, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		const scoreAtDiff1 = ScoreManager.getScore();
		
		ScoreManager.initialize(3); // 2.0x
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 10, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		const scoreAtDiff3 = ScoreManager.getScore();
		
		// At difficulty 3, same ball count should give more points
		if (scoreAtDiff3 <= scoreAtDiff1) {
			throw new Error(`Higher difficulty should give higher score: diff1=${scoreAtDiff1}, diff3=${scoreAtDiff3}`);
		}
	}
});

// Test: CASCADE_COMPLETE without BALLS_CLEARED doesn't crash
testSuite.tests.push({
	name: 'Edge case - CASCADE_COMPLETE without BALLS_CLEARED',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(1);
		
		// Emit cascade complete without any balls cleared
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		// Should not crash, score stays 0
		if (ScoreManager.getScore() !== 0) {
			throw new Error(`Expected score 0, got ${ScoreManager.getScore()}`);
		}
	}
});

// Test: Reset emits SCORE_UPDATE event
testSuite.tests.push({
	name: 'reset - Emits SCORE_UPDATE event',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(1);
		ScoreManager.addPoints(100);
		
		let eventReceived = false;
		let receivedScore = null;
		
		const handler = (data) => {
			eventReceived = true;
			receivedScore = data.score;
		};
		
		EventEmitter.on(CONSTANTS.EVENTS.SCORE_UPDATE, handler);
		ScoreManager.reset();
		EventEmitter.off(CONSTANTS.EVENTS.SCORE_UPDATE, handler);
		
		if (!eventReceived) {
			throw new Error('SCORE_UPDATE event not emitted on reset');
		}
		
		if (receivedScore !== 0) {
			throw new Error(`Expected score 0 in event, got ${receivedScore}`);
		}
	}
});

// Test: Score accumulation with different cascade sizes
testSuite.tests.push({
	name: 'Mixed cascades - Different sizes accumulate correctly',
	async run() {
		await ConfigManager.loadConfig();
		
		ScoreManager.initialize(1);
		
		// Single cascade with 5 balls
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 5, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		const scoreAfter1 = ScoreManager.getScore(); // Level 0: 5 × 1 = 5
		
		// Second cascade with 2 BALLS_CLEARED events creates 2 levels
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 2, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 2, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 2 });
		
		const scoreAfter2 = ScoreManager.getScore(); // 5 + (L1: 2×1 + L2: 2×2 + bonus: 3) = 5 + 9 = 14, plus streak bonus min(2,10)*2 = 4 → 18
		
		if (scoreAfter1 !== 5) {
			throw new Error(`Expected 5 after first cascade, got ${scoreAfter1}`);
		}
		
		if (scoreAfter2 !== 18) {
			throw new Error(`Expected 18 total, got ${scoreAfter2}`);
		}
	}
});

// ============================================
// Match Streak Tests
// ============================================

// Test: Streak starts at 0 after initialize
testSuite.tests.push({
	name: 'Streak - Starts at 0 after initialize',
	async run() {
		await ConfigManager.loadConfig();
		ScoreManager.initialize(1);
		
		if (ScoreManager.matchStreak !== 0) {
			throw new Error(`Expected streak 0, got ${ScoreManager.matchStreak}`);
		}
	}
});

// Test: Streak increments on cascade complete
testSuite.tests.push({
	name: 'Streak - Increments on each cascade complete',
	async run() {
		await ConfigManager.loadConfig();
		ScoreManager.initialize(1);
		
		// First cascade
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 3, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		if (ScoreManager.matchStreak !== 1) {
			throw new Error(`Expected streak 1 after first cascade, got ${ScoreManager.matchStreak}`);
		}
		
		// Second cascade
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 3, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		if (ScoreManager.matchStreak !== 2) {
			throw new Error(`Expected streak 2 after second cascade, got ${ScoreManager.matchStreak}`);
		}
	}
});

// Test: Streak resets on onNoMatch
testSuite.tests.push({
	name: 'Streak - Resets to 0 on onNoMatch',
	async run() {
		await ConfigManager.loadConfig();
		ScoreManager.initialize(1);
		
		// Build up streak
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 3, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 3, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		if (ScoreManager.matchStreak !== 2) {
			throw new Error(`Expected streak 2, got ${ScoreManager.matchStreak}`);
		}
		
		ScoreManager.onNoMatch();
		
		if (ScoreManager.matchStreak !== 0) {
			throw new Error(`Expected streak 0 after onNoMatch, got ${ScoreManager.matchStreak}`);
		}
	}
});

// Test: Streak bonus not applied at streak=1
testSuite.tests.push({
	name: 'Streak - No bonus at streak 1',
	async run() {
		await ConfigManager.loadConfig();
		ScoreManager.initialize(1);
		
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 5, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		// 5 balls × 1pt × 1.0 diff = 5, streak=1 no bonus
		if (ScoreManager.getScore() !== 5) {
			throw new Error(`Expected 5 (no streak bonus), got ${ScoreManager.getScore()}`);
		}
	}
});

// Test: Streak bonus applied at streak=2+
testSuite.tests.push({
	name: 'Streak - Bonus applied at streak 2+',
	async run() {
		await ConfigManager.loadConfig();
		ScoreManager.initialize(1);
		
		// First cascade: 5 points, streak=1
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 5, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		// Second cascade: 5 points + streak bonus min(2,10)*2 = 4
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 5, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		// Total: 5 + 5 + 4 = 14
		if (ScoreManager.getScore() !== 14) {
			throw new Error(`Expected 14 (5+5+4 streak), got ${ScoreManager.getScore()}`);
		}
	}
});

// Test: Streak bonus is capped
testSuite.tests.push({
	name: 'Streak - Bonus capped at streakCap',
	async run() {
		await ConfigManager.loadConfig();
		ScoreManager.initialize(1);
		
		// Build streak to 12 (beyond cap of 10)
		let expectedScore = 0;
		for (let i = 1; i <= 12; i++) {
			EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 1, matches: 1 });
			EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
			expectedScore += 1; // base 1 point each
			if (i > 1) {
				expectedScore += Math.floor(Math.min(i, 10) * 2 * 1.0); // streak bonus
			}
		}
		
		if (ScoreManager.getScore() !== expectedScore) {
			throw new Error(`Expected ${expectedScore}, got ${ScoreManager.getScore()}`);
		}
		
		// Verify streak=11 and =12 both use cap=10 → bonus = 20 each
		// Streak 11: min(11,10)*2 = 20, Streak 12: min(12,10)*2 = 20
		// These should be equal caps
		if (ScoreManager.matchStreak !== 12) {
			throw new Error(`Expected streak 12, got ${ScoreManager.matchStreak}`);
		}
	}
});

// Test: Streak resets on reset()
testSuite.tests.push({
	name: 'Streak - Resets on reset()',
	async run() {
		await ConfigManager.loadConfig();
		ScoreManager.initialize(1);
		
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 3, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		ScoreManager.reset();
		
		if (ScoreManager.matchStreak !== 0) {
			throw new Error(`Expected streak 0 after reset, got ${ScoreManager.matchStreak}`);
		}
	}
});

// Test: Streak emits matchStreak in SCORE_UPDATE
testSuite.tests.push({
	name: 'Streak - Emits matchStreak in SCORE_UPDATE event',
	async run() {
		await ConfigManager.loadConfig();
		ScoreManager.initialize(1);
		
		let receivedStreak = null;
		const handler = (data) => {
			if (data.matchStreak !== undefined) {
				receivedStreak = data.matchStreak;
			}
		};
		
		EventEmitter.on(CONSTANTS.EVENTS.SCORE_UPDATE, handler);
		
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 3, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		EventEmitter.off(CONSTANTS.EVENTS.SCORE_UPDATE, handler);
		
		if (receivedStreak !== 1) {
			throw new Error(`Expected matchStreak 1 in event, got ${receivedStreak}`);
		}
	}
});

// Test: onNoMatch emits matchStreak=0 in SCORE_UPDATE
testSuite.tests.push({
	name: 'Streak - onNoMatch emits matchStreak 0',
	async run() {
		await ConfigManager.loadConfig();
		ScoreManager.initialize(1);
		
		// Build streak
		EventEmitter.emit(CONSTANTS.EVENTS.BALLS_CLEARED, { count: 3, matches: 1 });
		EventEmitter.emit(CONSTANTS.EVENTS.CASCADE_COMPLETE, { cascadeCount: 1 });
		
		let receivedStreak = null;
		const handler = (data) => {
			if (data.matchStreak !== undefined) {
				receivedStreak = data.matchStreak;
			}
		};
		
		EventEmitter.on(CONSTANTS.EVENTS.SCORE_UPDATE, handler);
		ScoreManager.onNoMatch();
		EventEmitter.off(CONSTANTS.EVENTS.SCORE_UPDATE, handler);
		
		if (receivedStreak !== 0) {
			throw new Error(`Expected matchStreak 0 from onNoMatch, got ${receivedStreak}`);
		}
	}
});

export default testSuite;
