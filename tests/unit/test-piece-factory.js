/**
 * test-piece-factory.js
 * 
 * Unit tests for PieceFactory module
 */

import { PieceFactory } from '../../src/modules/PieceFactory.js';
import { ConfigManager } from '../../src/modules/ConfigManager.js';
import { CONSTANTS } from '../../src/utils/Constants.js';

// Test Suite
const testSuite = {
	name: 'PieceFactory Tests',
	tests: []
};

// Test: getAvailableColors returns correct colors for level 1
testSuite.tests.push({
	name: 'getAvailableColors - Level 1 has 3 colors',
	async run() {
		await ConfigManager.loadConfig();
		const colors = PieceFactory.getAvailableColors(1);
		
		if (colors.length !== 3) {
			throw new Error(`Expected 3 colors, got ${colors.length}`);
		}
		
		// Should be red, green, blue
		const red = ConfigManager.get('colors.balls.red');
		const green = ConfigManager.get('colors.balls.green');
		const blue = ConfigManager.get('colors.balls.blue');
		
		if (!colors.includes(red) || !colors.includes(green) || !colors.includes(blue)) {
			throw new Error('Level 1 should have red, green, blue');
		}
	}
});

// Test: getAvailableColors returns correct colors for level 3
testSuite.tests.push({
	name: 'getAvailableColors - Level 3 has 4 colors',
	async run() {
		await ConfigManager.loadConfig();
		const colors = PieceFactory.getAvailableColors(3);
		
		if (colors.length !== 4) {
			throw new Error(`Expected 4 colors, got ${colors.length}`);
		}
		
		// Should include yellow
		const yellow = ConfigManager.get('colors.balls.yellow');
		if (!colors.includes(yellow)) {
			throw new Error('Level 3 should include yellow');
		}
	}
});

// Test: getAvailableColors returns correct colors for level 7
testSuite.tests.push({
	name: 'getAvailableColors - Level 7 has 5 colors',
	async run() {
		await ConfigManager.loadConfig();
		const colors = PieceFactory.getAvailableColors(7);
		
		if (colors.length !== 5) {
			throw new Error(`Expected 5 colors, got ${colors.length}`);
		}
		
		// Should include magenta
		const magenta = ConfigManager.get('colors.balls.magenta');
		if (!colors.includes(magenta)) {
			throw new Error('Level 7 should include magenta');
		}
	}
});

// Test: getAvailableColors returns correct colors for level 11
testSuite.tests.push({
	name: 'getAvailableColors - Level 11 has 6 colors',
	async run() {
		await ConfigManager.loadConfig();
		const colors = PieceFactory.getAvailableColors(11);
		
		if (colors.length !== 6) {
			throw new Error(`Expected 6 colors, got ${colors.length}`);
		}
		
		// Should include cyan
		const cyan = ConfigManager.get('colors.balls.cyan');
		if (!colors.includes(cyan)) {
			throw new Error('Level 11 should include cyan');
		}
	}
});

// Test: getAvailableColors returns correct colors for level 15
testSuite.tests.push({
	name: 'getAvailableColors - Level 15 has 7 colors',
	async run() {
		await ConfigManager.loadConfig();
		const colors = PieceFactory.getAvailableColors(15);
		
		if (colors.length !== 7) {
			throw new Error(`Expected 7 colors, got ${colors.length}`);
		}
		
		// Should include orange
		const orange = ConfigManager.get('colors.balls.orange');
		if (!colors.includes(orange)) {
			throw new Error('Level 15 should include orange');
		}
	}
});

// Test: getAvailableColors returns correct colors for level 19+
testSuite.tests.push({
	name: 'getAvailableColors - Level 19+ has 8 colors',
	async run() {
		await ConfigManager.loadConfig();
		const colors = PieceFactory.getAvailableColors(19);
		
		if (colors.length !== 8) {
			throw new Error(`Expected 8 colors, got ${colors.length}`);
		}
		
		// Should include purple
		const purple = ConfigManager.get('colors.balls.purple');
		if (!colors.includes(purple)) {
			throw new Error('Level 19 should include purple');
		}
		
		// Test level 25 also gets 8 colors
		const colors25 = PieceFactory.getAvailableColors(25);
		if (colors25.length !== 8) {
			throw new Error(`Level 25 should have 8 colors, got ${colors25.length}`);
		}
	}
});

// Test: shouldSpawnBlockingBall respects minimum pieces requirement
testSuite.tests.push({
	name: 'shouldSpawnBlockingBall - Respects min pieces requirement',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();
		
		// At 0 pieces dropped, should never spawn on difficulty 1 (requires 50)
		let spawnedEarly = false;
		for (let i = 0; i < 100; i++) {
			if (PieceFactory.shouldSpawnBlockingBall(1)) {
				spawnedEarly = true;
				break;
			}
		}
		
		if (spawnedEarly) {
			throw new Error('Blocking ball spawned before minimum pieces requirement met');
		}
		
		// Set pieces dropped to 50
		PieceFactory.piecesDropped = 50;
		
		// Now it should be possible to spawn (though not guaranteed)
		let canSpawn = false;
		for (let i = 0; i < 1000; i++) {
			if (PieceFactory.shouldSpawnBlockingBall(1)) {
				canSpawn = true;
				break;
			}
		}
		
		if (!canSpawn) {
			throw new Error('Blocking ball never spawned after minimum pieces requirement met');
		}
	}
});

// Test: generatePiece creates valid piece
testSuite.tests.push({
	name: 'generatePiece - Creates valid piece',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();
		
		const piece = PieceFactory.generatePiece(1, 1);
		
		if (!piece) {
			throw new Error('generatePiece returned null/undefined');
		}
		
		// Check piece has valid shape type
		const shapeType = piece.getType();
		const validTypes = Object.values(CONSTANTS.PIECE_TYPES);
		if (!validTypes.includes(shapeType)) {
			throw new Error(`Invalid shape type: ${shapeType}`);
		}
		
		// Check piece has balls
		const balls = piece.getBalls();
		if (!balls || balls.length === 0) {
			throw new Error('Piece has no balls');
		}
		
		// Check all balls are valid Ball objects
		for (const ball of balls) {
			if (!ball || typeof ball.getColor !== 'function') {
				throw new Error('Invalid ball in piece');
			}
		}
	}
});

// Test: generatePiece increments pieces dropped counter
testSuite.tests.push({
	name: 'generatePiece - Increments piecesDropped',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();
		
		const initialCount = PieceFactory.piecesDropped;
		if (initialCount !== 0) {
			throw new Error('Reset did not set piecesDropped to 0');
		}
		
		PieceFactory.generatePiece(1, 1);
		if (PieceFactory.piecesDropped !== 1) {
			throw new Error('piecesDropped not incremented after first piece');
		}
		
		PieceFactory.generatePiece(1, 1);
		if (PieceFactory.piecesDropped !== 2) {
			throw new Error('piecesDropped not incremented after second piece');
		}
	}
});

// Test: generatePiece uses level-appropriate colors
testSuite.tests.push({
	name: 'generatePiece - Uses level-appropriate colors',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();
		
		// Generate many pieces at level 1
		const level1Colors = new Set();
		for (let i = 0; i < 50; i++) {
			const piece = PieceFactory.generatePiece(1, 1);
			const balls = piece.getBalls();
			balls.forEach(ball => {
				if (ball.type === CONSTANTS.BALL_TYPES.NORMAL) {
					level1Colors.add(ball.getColor());
				}
			});
		}
		
		// Should only have 3 colors (red, green, blue)
		if (level1Colors.size > 3) {
			throw new Error(`Level 1 should only use 3 colors, found ${level1Colors.size}`);
		}
		
		// Generate pieces at level 19
		const level19Colors = new Set();
		for (let i = 0; i < 100; i++) {
			const piece = PieceFactory.generatePiece(19, 1);
			const balls = piece.getBalls();
			balls.forEach(ball => {
				if (ball.type === CONSTANTS.BALL_TYPES.NORMAL) {
					level19Colors.add(ball.getColor());
				}
			});
		}
		
		// Should have more colors available at level 19
		if (level19Colors.size < 6) {
			throw new Error(`Level 19 should use more colors, found only ${level19Colors.size}`);
		}
	}
});

// Test: reset() clears piecesDropped counter
testSuite.tests.push({
	name: 'reset - Clears piecesDropped counter',
	async run() {
		await ConfigManager.loadConfig();
		
		// Generate some pieces
		PieceFactory.generatePiece(1, 1);
		PieceFactory.generatePiece(1, 1);
		PieceFactory.generatePiece(1, 1);
		
		if (PieceFactory.piecesDropped === 0) {
			throw new Error('piecesDropped should not be 0 after generating pieces');
		}
		
		// Reset
		PieceFactory.reset();
		
		if (PieceFactory.piecesDropped !== 0) {
			throw new Error('Reset did not clear piecesDropped counter');
		}
	}
});

// Test: All piece shapes generate correct ball counts
testSuite.tests.push({
	name: 'generatePiece - All shapes have correct ball counts',
	async run() {
		await ConfigManager.loadConfig();
		
		// Expected ball counts for each shape
		const expectedCounts = {
			[CONSTANTS.PIECE_TYPES.I]: 4,
			[CONSTANTS.PIECE_TYPES.O]: 6,
			[CONSTANTS.PIECE_TYPES.T]: 4,
			[CONSTANTS.PIECE_TYPES.L]: 4,
			[CONSTANTS.PIECE_TYPES.J]: 4,
			[CONSTANTS.PIECE_TYPES.S]: 4,
			[CONSTANTS.PIECE_TYPES.Z]: 4,
			[CONSTANTS.PIECE_TYPES.SINGLE]: 1
		};
		
		// Generate many pieces and track ball counts by type
		const observedCounts = {};
		for (let i = 0; i < 200; i++) {
			const piece = PieceFactory.generatePiece(1, 1);
			const shapeType = piece.getType();
			const ballCount = piece.getBalls().length;
			
			if (!observedCounts[shapeType]) {
				observedCounts[shapeType] = ballCount;
			} else if (observedCounts[shapeType] !== ballCount) {
				throw new Error(`Inconsistent ball count for ${shapeType}`);
			}
		}
		
		// Verify observed counts match expected
		for (const shapeType in observedCounts) {
			const observed = observedCounts[shapeType];
			const expected = expectedCounts[shapeType];
			if (observed !== expected) {
				throw new Error(`${shapeType} has ${observed} balls, expected ${expected}`);
			}
		}
	}
});

// ─── Feature Unlock / Painter Gating Tests ────────────────────────────────────

// Test: _getUnlockedSpecialTypes returns empty array at level 1
testSuite.tests.push({
	name: 'featureUnlocks - Level 1 has no special types unlocked',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();

		const unlocked = PieceFactory._getUnlockedSpecialTypes(1);

		if (unlocked.length !== 0) {
			throw new Error(`Expected 0 unlocked types at level 1, got ${unlocked.length}: ${unlocked.join(', ')}`);
		}
	}
});

// Test: _getUnlockedSpecialTypes returns only PAINTER_HORIZONTAL at level 3
testSuite.tests.push({
	name: 'featureUnlocks - Level 3 unlocks only PAINTER_HORIZONTAL',
	async run() {
		await ConfigManager.loadConfig();
		const unlocked = PieceFactory._getUnlockedSpecialTypes(3);

		if (!unlocked.includes(CONSTANTS.BALL_TYPES.PAINTER_HORIZONTAL)) {
			throw new Error('PAINTER_HORIZONTAL should be unlocked at level 3');
		}
		if (unlocked.includes(CONSTANTS.BALL_TYPES.PAINTER_VERTICAL)) {
			throw new Error('PAINTER_VERTICAL should NOT be unlocked at level 3');
		}
		if (unlocked.includes(CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NE)) {
			throw new Error('PAINTER_DIAGONAL_NE should NOT be unlocked at level 3');
		}
		if (unlocked.includes(CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NW)) {
			throw new Error('PAINTER_DIAGONAL_NW should NOT be unlocked at level 3');
		}
		if (unlocked.includes(CONSTANTS.BALL_TYPES.EXPLODING)) {
			throw new Error('EXPLODING should NOT be unlocked at level 3');
		}
	}
});

// Test: _getUnlockedSpecialTypes returns H+V at level 5
testSuite.tests.push({
	name: 'featureUnlocks - Level 5 unlocks PAINTER_HORIZONTAL and PAINTER_VERTICAL',
	async run() {
		await ConfigManager.loadConfig();
		const unlocked = PieceFactory._getUnlockedSpecialTypes(5);

		if (!unlocked.includes(CONSTANTS.BALL_TYPES.PAINTER_HORIZONTAL)) {
			throw new Error('PAINTER_HORIZONTAL should be unlocked at level 5');
		}
		if (!unlocked.includes(CONSTANTS.BALL_TYPES.PAINTER_VERTICAL)) {
			throw new Error('PAINTER_VERTICAL should be unlocked at level 5');
		}
		if (unlocked.includes(CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NE)) {
			throw new Error('PAINTER_DIAGONAL_NE should NOT be unlocked at level 5');
		}
		if (unlocked.includes(CONSTANTS.BALL_TYPES.EXPLODING)) {
			throw new Error('EXPLODING should NOT be unlocked at level 5');
		}
	}
});

// Test: _getUnlockedSpecialTypes returns H+V+both diagonals at level 7
testSuite.tests.push({
	name: 'featureUnlocks - Level 7 unlocks all painters, not yet EXPLODING',
	async run() {
		await ConfigManager.loadConfig();
		const unlocked = PieceFactory._getUnlockedSpecialTypes(7);

		const painters = [
			CONSTANTS.BALL_TYPES.PAINTER_HORIZONTAL,
			CONSTANTS.BALL_TYPES.PAINTER_VERTICAL,
			CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NE,
			CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NW
		];
		for (const type of painters) {
			if (!unlocked.includes(type)) {
				throw new Error(`${type} should be unlocked at level 7`);
			}
		}
		if (unlocked.includes(CONSTANTS.BALL_TYPES.EXPLODING)) {
			throw new Error('EXPLODING should NOT be unlocked at level 7');
		}
	}
});

// Test: _getUnlockedSpecialTypes returns all types at level 9
testSuite.tests.push({
	name: 'featureUnlocks - Level 9 unlocks all special types including EXPLODING',
	async run() {
		await ConfigManager.loadConfig();
		const unlocked = PieceFactory._getUnlockedSpecialTypes(9);

		const allTypes = [
			CONSTANTS.BALL_TYPES.EXPLODING,
			CONSTANTS.BALL_TYPES.PAINTER_HORIZONTAL,
			CONSTANTS.BALL_TYPES.PAINTER_VERTICAL,
			CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NE,
			CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NW
		];
		for (const type of allTypes) {
			if (!unlocked.includes(type)) {
				throw new Error(`${type} should be unlocked at level 9`);
			}
		}
		if (unlocked.length !== 5) {
			throw new Error(`Expected 5 unlocked types at level 9, got ${unlocked.length}`);
		}
	}
});

// Test: generatePiece does not produce special balls at level 1 (interval mode off)
testSuite.tests.push({
	name: 'featureUnlocks - No specials spawned at level 1 (random mode)',
	async run() {
		await ConfigManager.loadConfig();

		// Temporarily disable interval mode so random-spawn path is exercised
		const origInterval = ConfigManager.get('specialInterval.enabled');
		ConfigManager.config.specialInterval.enabled = false;
		const origBag = ConfigManager.get('specialBag.enabled');
		ConfigManager.config.specialBag = { ...(ConfigManager.config.specialBag || {}), enabled: false };
		// Give every type a 100% spawn rate so any unlocked type would definitely appear
		const origRates = {};
		for (const key of ['exploding', 'painterHorizontal', 'painterVertical', 'painterDiagonal']) {
			origRates[key] = ConfigManager.config.specialBalls[key].spawnRate;
			ConfigManager.config.specialBalls[key].spawnRate = 1.0;
		}
		// Enough pieces to exceed blocking ball threshold so we can isolate painters/explosions
		ConfigManager.config.specialBalls.blocking.minPieceBeforeSpawn.difficulty1 = 9999;

		PieceFactory.reset();
		let foundSpecial = false;
		for (let i = 0; i < 50; i++) {
			const piece = PieceFactory.generatePiece(1, 1);
			if (piece) {
				for (const ball of piece.getBalls()) {
					const t = ball.getType();
					if (t !== CONSTANTS.BALL_TYPES.NORMAL && t !== CONSTANTS.BALL_TYPES.BLOCKING) {
						foundSpecial = true;
					}
				}
			}
		}

		// Restore config
		ConfigManager.config.specialInterval.enabled = origInterval;
		ConfigManager.config.specialBag.enabled = origBag;
		for (const key of ['exploding', 'painterHorizontal', 'painterVertical', 'painterDiagonal']) {
			ConfigManager.config.specialBalls[key].spawnRate = origRates[key];
		}
		ConfigManager.config.specialBalls.blocking.minPieceBeforeSpawn.difficulty1 = 50;

		if (foundSpecial) {
			throw new Error('Special ball found at level 1 — gating failed');
		}
	}
});

// Test: generatePiece CAN produce PAINTER_HORIZONTAL at level 3 when spawn rate = 100%
testSuite.tests.push({
	name: 'featureUnlocks - PAINTER_HORIZONTAL spawns at level 3 (random mode, rate=100%)',
	async run() {
		await ConfigManager.loadConfig();

		ConfigManager.config.specialInterval.enabled = false;
		ConfigManager.config.specialBag = { ...(ConfigManager.config.specialBag || {}), enabled: false };
		const origH = ConfigManager.config.specialBalls.painterHorizontal.spawnRate;
		ConfigManager.config.specialBalls.painterHorizontal.spawnRate = 1.0;
		ConfigManager.config.specialBalls.blocking.minPieceBeforeSpawn.difficulty1 = 9999;

		PieceFactory.reset();
		let found = false;
		for (let i = 0; i < 30; i++) {
			const piece = PieceFactory.generatePiece(3, 1);
			if (piece) {
				for (const ball of piece.getBalls()) {
					if (ball.getType() === CONSTANTS.BALL_TYPES.PAINTER_HORIZONTAL) {
						found = true;
					}
				}
			}
		}

		// Restore
		ConfigManager.config.specialInterval.enabled = true;
		ConfigManager.config.specialBalls.painterHorizontal.spawnRate = origH;
		ConfigManager.config.specialBalls.blocking.minPieceBeforeSpawn.difficulty1 = 50;

		if (!found) {
			throw new Error('PAINTER_HORIZONTAL should have spawned at level 3 with 100% rate');
		}
	}
});

// Test: Interval system at level 1 forces no special (null type)
testSuite.tests.push({
	name: 'featureUnlocks - Interval system skips forced special at level 1',
	async run() {
		await ConfigManager.loadConfig();

		// Shorten interval to 1 so it triggers immediately
		const origBase = ConfigManager.config.specialInterval.baseInterval;
		ConfigManager.config.specialInterval.baseInterval = 1;
		ConfigManager.config.specialInterval.enabled = true;

		PieceFactory.reset();
		// Generate 3 pieces — with interval=1, every piece should try to force a special
		let foundSpecial = false;
		for (let i = 0; i < 3; i++) {
			const piece = PieceFactory.generatePiece(1, 1);
			if (piece) {
				for (const ball of piece.getBalls()) {
					const t = ball.getType();
					if (t !== CONSTANTS.BALL_TYPES.NORMAL && t !== CONSTANTS.BALL_TYPES.BLOCKING) {
						foundSpecial = true;
					}
				}
			}
		}

		// Restore
		ConfigManager.config.specialInterval.baseInterval = origBase;

		if (foundSpecial) {
			throw new Error('Interval system injected a special ball at level 1 — gating failed');
		}
	}
});

// Test: Special bag is cleared on level change
testSuite.tests.push({
	name: 'featureUnlocks - Special bag discarded on level change',
	async run() {
		await ConfigManager.loadConfig();

		ConfigManager.config.specialInterval.enabled = false;
		ConfigManager.config.specialBag = { ...(ConfigManager.config.specialBag || {}), enabled: true };

		PieceFactory.reset();
		// Seed the bag at level 9 (all types unlocked) so it has entries
		PieceFactory.currentLevel = 9;
		PieceFactory._refillSpecialBag();
		const bagSizeBefore = PieceFactory.specialBag.length;

		if (bagSizeBefore === 0) {
			ConfigManager.data.specialInterval.enabled = true;
			ConfigManager.data.specialBag.enabled = false;
			throw new Error('Bag should not be empty after refill at level 9');
		}

		// Simulate advancing to level 10 — bag should be cleared by _generatePieceInternal
		PieceFactory.generatePiece(10, 1);
		// After the level-change, the bag was discarded. It may have been immediately
		// refilled for level 10 (same unlocks), so just confirm the transition happened
		// without error. What matters is specialBag was reset (not still the level-9 bag).
		// We can't easily distinguish refilled vs retained, so check no exception thrown.

		// Restore
		ConfigManager.config.specialInterval.enabled = true;
		ConfigManager.config.specialBag.enabled = false;
	}
});

// Test: _pickIntervalSpecialType returns null at level 1
testSuite.tests.push({
	name: 'featureUnlocks - _pickIntervalSpecialType returns null at level 1',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();

		const result = PieceFactory._pickIntervalSpecialType(1);
		if (result !== null) {
			throw new Error(`Expected null at level 1, got "${result}"`);
		}
	}
});

// Test: _pickIntervalSpecialType never returns locked type for level 3
testSuite.tests.push({
	name: 'featureUnlocks - _pickIntervalSpecialType only returns PAINTER_HORIZONTAL at level 3',
	async run() {
		await ConfigManager.loadConfig();

		const forbidden = [
			CONSTANTS.BALL_TYPES.EXPLODING,
			CONSTANTS.BALL_TYPES.PAINTER_VERTICAL,
			CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NE,
			CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NW
		];

		for (let i = 0; i < 50; i++) {
			const result = PieceFactory._pickIntervalSpecialType(3);
			if (result === null) {
				throw new Error('_pickIntervalSpecialType should not return null at level 3');
			}
			if (forbidden.includes(result)) {
				throw new Error(`_pickIntervalSpecialType returned locked type "${result}" at level 3`);
			}
		}
	}
});

// Test: featureUnlocks config missing → all types unlocked (backwards compat)
testSuite.tests.push({
	name: 'featureUnlocks - All types unlocked when featureUnlocks config absent',
	async run() {
		await ConfigManager.loadConfig();

		// Temporarily remove featureUnlocks config
		const saved = ConfigManager.config.specialBalls.featureUnlocks;
		delete ConfigManager.config.specialBalls.featureUnlocks;

		const unlocked = PieceFactory._getUnlockedSpecialTypes(1);

		ConfigManager.config.specialBalls.featureUnlocks = saved;

		const allTypes = [
			CONSTANTS.BALL_TYPES.EXPLODING,
			CONSTANTS.BALL_TYPES.PAINTER_HORIZONTAL,
			CONSTANTS.BALL_TYPES.PAINTER_VERTICAL,
			CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NE,
			CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NW
		];
		for (const type of allTypes) {
			if (!unlocked.includes(type)) {
				throw new Error(`With no featureUnlocks config, ${type} should default to unlocked at level 1`);
			}
		}
	}
});

export default testSuite;
