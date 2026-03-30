/**
 * Unit tests for HintManager
 * @module test-hint-manager
 */

import HintManager from '../../src/modules/HintManager.js';
import { ConfigManager } from '../../src/modules/ConfigManager.js';
import { EventEmitter } from '../../src/utils/EventEmitter.js';
import { CONSTANTS } from '../../src/utils/Constants.js';

const testSuite = {
	name: 'HintManager Tests',
	tests: []
};

// ── Initialization ──

testSuite.tests.push({
	name: 'initialize - sets enabled true for easy difficulty',
	async run() {
		await ConfigManager.loadConfig();
		HintManager.initialize(1);
		if (!HintManager.enabled) {
			throw new Error('Should be enabled for difficulty 1');
		}
	}
});

testSuite.tests.push({
	name: 'initialize - sets enabled false for hard difficulty',
	async run() {
		await ConfigManager.loadConfig();
		HintManager.initialize(4);
		if (HintManager.enabled) {
			throw new Error('Should be disabled for difficulty 4');
		}
	}
});

testSuite.tests.push({
	name: 'initialize - resets state',
	async run() {
		await ConfigManager.loadConfig();
		HintManager.noMatchRun = 10;
		HintManager.shownThisLevel = ['a', 'b'];
		HintManager.initialize(1);
		if (HintManager.noMatchRun !== 0) {
			throw new Error('noMatchRun should reset to 0');
		}
		if (HintManager.shownThisLevel.length !== 0) {
			throw new Error('shownThisLevel should be empty');
		}
	}
});

// ── setEnabled override ──

testSuite.tests.push({
	name: 'setEnabled - overrides enabled flag',
	async run() {
		await ConfigManager.loadConfig();
		HintManager.initialize(1);
		HintManager.setEnabled(false);
		if (HintManager.enabled) {
			throw new Error('Should be disabled after setEnabled(false)');
		}
		HintManager.setEnabled(true);
		if (!HintManager.enabled) {
			throw new Error('Should be enabled after setEnabled(true)');
		}
	}
});

// ── onNoMatch threshold ──

testSuite.tests.push({
	name: 'onNoMatch - returns null before threshold reached',
	async run() {
		await ConfigManager.loadConfig();
		HintManager.initialize(1);
		const threshold = ConfigManager.get('hints.noMatchThreshold', 3);
		for (let i = 0; i < threshold - 1; i++) {
			const hint = HintManager.onNoMatch(null);
			if (hint !== null) {
				throw new Error(`Should not trigger hint at count ${i + 1} (threshold ${threshold})`);
			}
		}
	}
});

testSuite.tests.push({
	name: 'onNoMatch - returns hint at threshold',
	async run() {
		await ConfigManager.loadConfig();
		HintManager.initialize(1);
		const threshold = ConfigManager.get('hints.noMatchThreshold', 3);
		let hint = null;
		for (let i = 0; i < threshold; i++) {
			hint = HintManager.onNoMatch(null);
		}
		if (hint === null) {
			throw new Error('Should return a hint at threshold');
		}
		if (typeof hint !== 'string' || hint.length === 0) {
			throw new Error('Hint should be a non-empty string');
		}
	}
});

// ── onMatch resets counter ──

testSuite.tests.push({
	name: 'onMatch - resets noMatchRun counter',
	async run() {
		await ConfigManager.loadConfig();
		HintManager.initialize(1);
		HintManager.onNoMatch(null);
		HintManager.onNoMatch(null);
		HintManager.onMatch();
		if (HintManager.noMatchRun !== 0) {
			throw new Error('noMatchRun should be 0 after onMatch()');
		}
	}
});

// ── Max per level cap ──

testSuite.tests.push({
	name: 'onNoMatch - respects maxPerLevel cap',
	async run() {
		await ConfigManager.loadConfig();
		HintManager.initialize(1);
		const max = ConfigManager.get('hints.maxPerLevel', 3);
		const threshold = ConfigManager.get('hints.noMatchThreshold', 3);
		let hintCount = 0;
		// Trigger enough no-matches to exhaust all hints
		for (let round = 0; round < max + 2; round++) {
			for (let i = 0; i < threshold; i++) {
				const hint = HintManager.onNoMatch(null);
				if (hint !== null) hintCount++;
			}
		}
		if (hintCount > max) {
			throw new Error(`Should show at most ${max} hints per level, got ${hintCount}`);
		}
	}
});

// ── No duplicate hints ──

testSuite.tests.push({
	name: 'onNoMatch - does not repeat hints within a level',
	async run() {
		await ConfigManager.loadConfig();
		HintManager.initialize(1);
		const threshold = ConfigManager.get('hints.noMatchThreshold', 3);
		const max = ConfigManager.get('hints.maxPerLevel', 3);
		const shown = [];
		for (let round = 0; round < max; round++) {
			for (let i = 0; i < threshold; i++) {
				const hint = HintManager.onNoMatch(null);
				if (hint !== null) shown.push(hint);
			}
		}
		const unique = new Set(shown);
		if (unique.size !== shown.length) {
			throw new Error('Hints should not repeat within a level');
		}
	}
});

// ── Disabled returns null ──

testSuite.tests.push({
	name: 'onNoMatch - returns null when disabled',
	async run() {
		await ConfigManager.loadConfig();
		HintManager.initialize(1);
		HintManager.setEnabled(false);
		const threshold = ConfigManager.get('hints.noMatchThreshold', 3);
		for (let i = 0; i < threshold + 1; i++) {
			const hint = HintManager.onNoMatch(null);
			if (hint !== null) {
				throw new Error('Should not return hints when disabled');
			}
		}
	}
});

// ── HINT_SHOWN event ──

testSuite.tests.push({
	name: 'onNoMatch - emits HINT_SHOWN event',
	async run() {
		await ConfigManager.loadConfig();
		HintManager.initialize(1);
		const threshold = ConfigManager.get('hints.noMatchThreshold', 3);
		let emitted = null;
		const handler = (data) => { emitted = data; };
		EventEmitter.on(CONSTANTS.EVENTS.HINT_SHOWN, handler);
		try {
			for (let i = 0; i < threshold; i++) {
				HintManager.onNoMatch(null);
			}
			if (!emitted || !emitted.hint) {
				throw new Error('Should emit HINT_SHOWN with hint text');
			}
		} finally {
			EventEmitter.off(CONSTANTS.EVENTS.HINT_SHOWN, handler);
		}
	}
});

// ── Board fill trigger ──

testSuite.tests.push({
	name: 'onNoMatch - triggers hint on high board fill',
	async run() {
		await ConfigManager.loadConfig();
		HintManager.initialize(1);
		// Create a mock grid with high fill
		const fillPct = ConfigManager.get('hints.boardFillPercent', 70);
		const rows = 22;
		const cols = 15;
		const total = rows * cols;
		const needed = Math.ceil(total * fillPct / 100);
		const mockGrid = {
			rows,
			cols,
			getOccupiedCount() { return needed; }
		};
		// First call with high fill grid should trigger (even at noMatchRun = 1)
		const hint = HintManager.onNoMatch(mockGrid);
		if (hint === null) {
			throw new Error('Should trigger hint when board fill exceeds threshold');
		}
	}
});

export default testSuite;
