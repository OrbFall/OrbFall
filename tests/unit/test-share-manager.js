/**
 * Unit tests for ShareManager
 * @module test-share-manager
 */

import ShareManager from '../../src/modules/ShareManager.js';

const testSuite = {
	name: 'ShareManager Tests',
	tests: []
};

// ── setResult / getResult ──

testSuite.tests.push({
	name: 'setResult - stores result and getResult retrieves it',
	async run() {
		const data = { score: 500, level: 3, difficulty: 2, mode: 'CLASSIC' };
		ShareManager.setResult(data);
		const stored = ShareManager.getResult();
		if (stored !== data) throw new Error('Should return the same object');
		ShareManager.setResult(null);
	}
});

// ── buildShareText ──

testSuite.tests.push({
	name: 'buildShareText - returns empty string for null',
	async run() {
		const text = ShareManager.buildShareText(null);
		if (text !== '') throw new Error('Expected empty string');
	}
});

testSuite.tests.push({
	name: 'buildShareText - includes score, level, mode, difficulty',
	async run() {
		const text = ShareManager.buildShareText({
			score: 1234, level: 5, difficulty: 3, mode: 'CLASSIC'
		});
		if (!text.includes('1,234')) throw new Error('Should include formatted score');
		if (!text.includes('Level 5')) throw new Error('Should include level');
		if (!text.includes('Classic')) throw new Error('Should include mode name');
		if (!text.includes('Hard')) throw new Error('Should include difficulty name');
		if (!text.includes('Can you beat it?')) throw new Error('Should include CTA');
	}
});

testSuite.tests.push({
	name: 'buildShareText - includes stars for PUZZLE mode',
	async run() {
		const text = ShareManager.buildShareText({
			score: 800, level: 1, difficulty: 1, mode: 'PUZZLE', stars: 3
		});
		if (!text.includes('Puzzle')) throw new Error('Should include Puzzle mode');
		// 3 star emojis (⭐)
		const starCount = (text.match(/\u2B50/g) || []).length;
		if (starCount !== 3) throw new Error(`Expected 3 stars, got ${starCount}`);
	}
});

testSuite.tests.push({
	name: 'buildShareText - no stars shown for 0 stars',
	async run() {
		const text = ShareManager.buildShareText({
			score: 10, level: 1, difficulty: 1, mode: 'PUZZLE', stars: 0
		});
		const starCount = (text.match(/\u2B50/g) || []).length;
		if (starCount !== 0) throw new Error('Should not include stars when 0');
	}
});

testSuite.tests.push({
	name: 'buildShareText - handles all modes',
	async run() {
		const modes = ['CLASSIC', 'ZEN', 'GAUNTLET', 'RISING_TIDE', 'MISSION', 'PUZZLE'];
		const expected = ['Classic', 'Zen', 'Gauntlet', 'Rising Tide', 'Mission', 'Puzzle'];
		for (let i = 0; i < modes.length; i++) {
			const text = ShareManager.buildShareText({
				score: 100, level: 1, difficulty: 1, mode: modes[i]
			});
			if (!text.includes(expected[i])) {
				throw new Error(`Mode ${modes[i]} should map to "${expected[i]}", got: ${text}`);
			}
		}
	}
});

testSuite.tests.push({
	name: 'buildShareText - handles all difficulties',
	async run() {
		const names = ['Easy', 'Medium', 'Hard', 'Expert', 'Master'];
		for (let d = 1; d <= 5; d++) {
			const text = ShareManager.buildShareText({
				score: 100, level: 1, difficulty: d, mode: 'CLASSIC'
			});
			if (!text.includes(names[d - 1])) {
				throw new Error(`Difficulty ${d} should map to "${names[d - 1]}"`);
			}
		}
	}
});

// ── canNativeShare ──

testSuite.tests.push({
	name: 'canNativeShare - returns boolean',
	async run() {
		const result = ShareManager.canNativeShare();
		if (typeof result !== 'boolean') throw new Error('Should return a boolean');
	}
});

// ── share (clipboard fallback) ──

testSuite.tests.push({
	name: 'share - returns "failed" when no result set',
	async run() {
		ShareManager.setResult(null);
		const result = await ShareManager.share();
		if (result !== 'failed') throw new Error(`Expected "failed", got "${result}"`);
	}
});

testSuite.tests.push({
	name: 'share - attempts clipboard copy with valid result',
	async run() {
		ShareManager.setResult({
			score: 500, level: 1, difficulty: 1, mode: 'ZEN'
		});
		// In the test runner (browser), this should at least not throw
		const result = await ShareManager.share();
		// Depending on browser permissions, result might be 'copied', 'shared', or 'failed'
		if (!['copied', 'shared', 'failed'].includes(result)) {
			throw new Error(`Unexpected result: ${result}`);
		}
		ShareManager.setResult(null);
	}
});

export default testSuite;
