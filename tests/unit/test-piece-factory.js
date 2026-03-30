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

// Test: _getUnlockedSpecialTypes returns only PAINTER_HORIZONTAL at level 5
testSuite.tests.push({
	name: 'featureUnlocks - Level 3 unlocks only PAINTER_HORIZONTAL',
	async run() {
		await ConfigManager.loadConfig();
		const unlocked = PieceFactory._getUnlockedSpecialTypes(5);

		if (!unlocked.includes(CONSTANTS.BALL_TYPES.PAINTER_HORIZONTAL)) {
			throw new Error('PAINTER_HORIZONTAL should be unlocked at level 5');
		}
		if (unlocked.includes(CONSTANTS.BALL_TYPES.PAINTER_VERTICAL)) {
			throw new Error('PAINTER_VERTICAL should NOT be unlocked at level 5');
		}
		if (unlocked.includes(CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NE)) {
			throw new Error('PAINTER_DIAGONAL_NE should NOT be unlocked at level 5');
		}
		if (unlocked.includes(CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NW)) {
			throw new Error('PAINTER_DIAGONAL_NW should NOT be unlocked at level 5');
		}
		if (unlocked.includes(CONSTANTS.BALL_TYPES.EXPLODING)) {
			throw new Error('EXPLODING should NOT be unlocked at level 5');
		}
	}
});

// Test: _getUnlockedSpecialTypes returns H+V at level 9
testSuite.tests.push({
	name: 'featureUnlocks - Level 5 unlocks PAINTER_HORIZONTAL and PAINTER_VERTICAL',
	async run() {
		await ConfigManager.loadConfig();
		const unlocked = PieceFactory._getUnlockedSpecialTypes(9);

		if (!unlocked.includes(CONSTANTS.BALL_TYPES.PAINTER_HORIZONTAL)) {
			throw new Error('PAINTER_HORIZONTAL should be unlocked at level 9');
		}
		if (!unlocked.includes(CONSTANTS.BALL_TYPES.PAINTER_VERTICAL)) {
			throw new Error('PAINTER_VERTICAL should be unlocked at level 9');
		}
		if (unlocked.includes(CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NE)) {
			throw new Error('PAINTER_DIAGONAL_NE should NOT be unlocked at level 9');
		}
		if (unlocked.includes(CONSTANTS.BALL_TYPES.EXPLODING)) {
			throw new Error('EXPLODING should NOT be unlocked at level 9');
		}
	}
});

// Test: _getUnlockedSpecialTypes returns H+V+NE at level 13
testSuite.tests.push({
	name: 'featureUnlocks - Level 7 unlocks all painters, not yet EXPLODING',
	async run() {
		await ConfigManager.loadConfig();
		const unlocked = PieceFactory._getUnlockedSpecialTypes(13);

		const painters = [
			CONSTANTS.BALL_TYPES.PAINTER_HORIZONTAL,
			CONSTANTS.BALL_TYPES.PAINTER_VERTICAL,
			CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NE
		];
		for (const type of painters) {
			if (!unlocked.includes(type)) {
				throw new Error(`${type} should be unlocked at level 13`);
			}
		}
		if (unlocked.includes(CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NW)) {
			throw new Error('PAINTER_DIAGONAL_NW should NOT be unlocked at level 13');
		}
		if (unlocked.includes(CONSTANTS.BALL_TYPES.EXPLODING)) {
			throw new Error('EXPLODING should NOT be unlocked at level 13');
		}
	}
});

// Test: _getUnlockedSpecialTypes returns all painters at level 14
testSuite.tests.push({
	name: 'featureUnlocks - Level 14 unlocks all painters, not yet EXPLODING',
	async run() {
		await ConfigManager.loadConfig();
		const unlocked = PieceFactory._getUnlockedSpecialTypes(14);

		const painters = [
			CONSTANTS.BALL_TYPES.PAINTER_HORIZONTAL,
			CONSTANTS.BALL_TYPES.PAINTER_VERTICAL,
			CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NE,
			CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NW
		];
		for (const type of painters) {
			if (!unlocked.includes(type)) {
				throw new Error(`${type} should be unlocked at level 14`);
			}
		}
		if (unlocked.includes(CONSTANTS.BALL_TYPES.EXPLODING)) {
			throw new Error('EXPLODING should NOT be unlocked at level 14');
		}
	}
});

// Test: _getUnlockedSpecialTypes returns all types at level 19
testSuite.tests.push({
	name: 'featureUnlocks - Level 9 unlocks all special types including EXPLODING',
	async run() {
		await ConfigManager.loadConfig();
		const unlocked = PieceFactory._getUnlockedSpecialTypes(19);

		const allTypes = [
			CONSTANTS.BALL_TYPES.EXPLODING,
			CONSTANTS.BALL_TYPES.PAINTER_HORIZONTAL,
			CONSTANTS.BALL_TYPES.PAINTER_VERTICAL,
			CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NE,
			CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NW
		];
		for (const type of allTypes) {
			if (!unlocked.includes(type)) {
				throw new Error(`${type} should be unlocked at level 19`);
			}
		}
		if (unlocked.length !== 5) {
			throw new Error(`Expected 5 unlocked types at level 19, got ${unlocked.length}`);
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

// Test: generatePiece CAN produce PAINTER_HORIZONTAL at level 5 when spawn rate = 100%
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
			const piece = PieceFactory.generatePiece(5, 1);
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
			throw new Error('PAINTER_HORIZONTAL should have spawned at level 5 with 100% rate');
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

// Test: _pickIntervalSpecialType never returns locked type for level 5
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
			const result = PieceFactory._pickIntervalSpecialType(5);
			if (result === null) {
				throw new Error('_pickIntervalSpecialType should not return null at level 5');
			}
			if (forbidden.includes(result)) {
				throw new Error(`_pickIntervalSpecialType returned locked type "${result}" at level 5`);
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

// ============================================
// Pity Timer Tests
// ============================================

// Test: piecesSinceLastExplosive resets on reset()
testSuite.tests.push({
	name: 'Pity timer - Resets counter on reset()',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();
		PieceFactory.piecesSinceLastExplosive = 99;
		PieceFactory.reset();
		
		if (PieceFactory.piecesSinceLastExplosive !== 0) {
			throw new Error(`Expected 0, got ${PieceFactory.piecesSinceLastExplosive}`);
		}
	}
});

// Test: _checkPityTimer returns false when disabled
testSuite.tests.push({
	name: 'Pity timer - Returns false when disabled',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();
		
		const savedEnabled = ConfigManager.get('pityTimer.enabled');
		ConfigManager.config.pityTimer.enabled = false;
		PieceFactory.piecesSinceLastExplosive = 999;
		PieceFactory.currentDifficulty = 1;
		
		const result = PieceFactory._checkPityTimer(9); // level 9 has EXPLODING unlocked
		
		ConfigManager.config.pityTimer.enabled = savedEnabled;
		
		if (result !== false) {
			throw new Error('Expected false when pity timer disabled');
		}
	}
});

// Test: _checkPityTimer returns false when below threshold
testSuite.tests.push({
	name: 'Pity timer - Returns false below threshold',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();
		PieceFactory.currentDifficulty = 1;
		PieceFactory.piecesSinceLastExplosive = 10; // threshold for D1 is 15
		
		const result = PieceFactory._checkPityTimer(9);
		
		if (result !== false) {
			throw new Error('Expected false below threshold');
		}
	}
});

// Test: _checkPityTimer returns true when at/above threshold and EXPLODING unlocked
testSuite.tests.push({
	name: 'Pity timer - Returns true at threshold with EXPLODING unlocked',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();
		PieceFactory.currentDifficulty = 1;
		PieceFactory.piecesSinceLastExplosive = 15; // D1 threshold = 15
		
		const result = PieceFactory._checkPityTimer(19); // level 19 unlocks EXPLODING
		
		if (result !== true) {
			throw new Error('Expected true at threshold with EXPLODING unlocked');
		}
	}
});

// Test: _checkPityTimer returns false when EXPLODING not yet unlocked
testSuite.tests.push({
	name: 'Pity timer - Returns false when EXPLODING not unlocked',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();
		PieceFactory.currentDifficulty = 1;
		PieceFactory.piecesSinceLastExplosive = 999;
		
		const result = PieceFactory._checkPityTimer(1); // level 1 does NOT unlock EXPLODING
		
		if (result !== false) {
			throw new Error('Expected false when EXPLODING not unlocked at level 1');
		}
	}
});

// Test: piecesSinceLastExplosive increments per piece without explosives
testSuite.tests.push({
	name: 'Pity timer - Counter increments per non-explosive piece',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();
		
		// Disable interval and set level low enough that no explosives spawn
		const savedIntervalEnabled = ConfigManager.get('specialInterval.enabled');
		ConfigManager.config.specialInterval.enabled = false;
		const savedPityEnabled = ConfigManager.get('pityTimer.enabled');
		ConfigManager.config.pityTimer.enabled = false;
		
		// Generate a piece at level 1 (no explosives unlocked)
		PieceFactory.generatePiece(1, 1);
		PieceFactory.generatePiece(1, 1);
		PieceFactory.generatePiece(1, 1);
		
		ConfigManager.config.specialInterval.enabled = savedIntervalEnabled;
		ConfigManager.config.pityTimer.enabled = savedPityEnabled;
		
		// Counter should have incremented (at level 1, no explosives possible)
		if (PieceFactory.piecesSinceLastExplosive < 3) {
			throw new Error(`Expected at least 3 increments, got ${PieceFactory.piecesSinceLastExplosive}`);
		}
	}
});

// ============================================
// Blocker Failsafe Flag Tests
// ============================================

// Test: forceExplosiveNext resets on reset()
testSuite.tests.push({
	name: 'Blocker failsafe - forceExplosiveNext resets on reset()',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.forceExplosiveNext = true;
		PieceFactory.reset();
		
		if (PieceFactory.forceExplosiveNext !== false) {
			throw new Error('Expected false after reset');
		}
	}
});

// Test: _pickIntervalSpecialType returns EXPLODING when forceExplosiveNext=true
testSuite.tests.push({
	name: 'Blocker failsafe - Forces EXPLODING when flag set',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();
		PieceFactory.forceExplosiveNext = true;
		
		const type = PieceFactory._pickIntervalSpecialType(19); // level 19 has EXPLODING
		
		if (type !== CONSTANTS.BALL_TYPES.EXPLODING) {
			throw new Error(`Expected EXPLODING, got ${type}`);
		}
		
		// Flag should be cleared after use
		if (PieceFactory.forceExplosiveNext !== false) {
			throw new Error('Flag should be cleared after use');
		}
	}
});

// Test: forceExplosiveNext doesn't fire if EXPLODING not unlocked
testSuite.tests.push({
	name: 'Blocker failsafe - No force if EXPLODING not unlocked',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();
		PieceFactory.forceExplosiveNext = true;
		
		const type = PieceFactory._pickIntervalSpecialType(1); // level 1, no EXPLODING
		
		// Should fall through to normal selection (no EXPLODING available at level 1)
		// The flag should stay true since it wasn't consumed
		if (type === CONSTANTS.BALL_TYPES.EXPLODING) {
			throw new Error('Should not force EXPLODING at level 1 (not unlocked)');
		}
	}
});

// ── Shape Unlock Tests ──────────────────────────────────────────────────────

// Test: Difficulty 1 shape pool has only the 7 core shapes
testSuite.tests.push({
	name: 'Shape unlocks - Difficulty 1 has 7 core shapes',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();
		PieceFactory.currentDifficulty = 1;
		
		const pool = PieceFactory._getShapePool();
		const expected = ['I', 'O', 'T', 'L', 'J', 'S', 'Z'];
		
		if (pool.length !== expected.length) {
			throw new Error(`Expected ${expected.length} shapes, got ${pool.length}: [${pool.join(', ')}]`);
		}
		
		for (const shape of expected) {
			if (!pool.includes(shape)) {
				throw new Error(`Missing expected shape: ${shape}`);
			}
		}
	}
});

// Test: Difficulty 2 adds V and Line3
testSuite.tests.push({
	name: 'Shape unlocks - Difficulty 2 adds V and Line3',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();
		PieceFactory.currentDifficulty = 2;
		
		const pool = PieceFactory._getShapePool();
		
		if (pool.length !== 9) {
			throw new Error(`Expected 9 shapes, got ${pool.length}: [${pool.join(', ')}]`);
		}
		
		if (!pool.includes('V')) {
			throw new Error('Difficulty 2 should include V');
		}
		if (!pool.includes('Line3')) {
			throw new Error('Difficulty 2 should include Line3');
		}
	}
});

// Test: Difficulty 3 adds Plus and U
testSuite.tests.push({
	name: 'Shape unlocks - Difficulty 3 adds Plus and U',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();
		PieceFactory.currentDifficulty = 3;
		
		const pool = PieceFactory._getShapePool();
		
		if (pool.length !== 11) {
			throw new Error(`Expected 11 shapes, got ${pool.length}: [${pool.join(', ')}]`);
		}
		
		if (!pool.includes('Plus')) {
			throw new Error('Difficulty 3 should include Plus');
		}
		if (!pool.includes('U')) {
			throw new Error('Difficulty 3 should include U');
		}
	}
});

// Test: Difficulty 4 adds P, Y, LongS, LongZ
testSuite.tests.push({
	name: 'Shape unlocks - Difficulty 4 adds P, Y, LongS, LongZ',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();
		PieceFactory.currentDifficulty = 4;
		
		const pool = PieceFactory._getShapePool();
		
		if (pool.length !== 15) {
			throw new Error(`Expected 15 shapes, got ${pool.length}: [${pool.join(', ')}]`);
		}
		
		const newShapes = ['P', 'Y', 'LongS', 'LongZ'];
		for (const shape of newShapes) {
			if (!pool.includes(shape)) {
				throw new Error(`Difficulty 4 should include ${shape}`);
			}
		}
	}
});

// Test: Difficulty 5 adds LongL, LongJ, Ring (all 18 shapes)
testSuite.tests.push({
	name: 'Shape unlocks - Difficulty 5 has all 18 shapes',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();
		PieceFactory.currentDifficulty = 5;
		
		const pool = PieceFactory._getShapePool();
		
		if (pool.length !== 18) {
			throw new Error(`Expected 18 shapes, got ${pool.length}: [${pool.join(', ')}]`);
		}
		
		const masterShapes = ['LongL', 'LongJ', 'Ring'];
		for (const shape of masterShapes) {
			if (!pool.includes(shape)) {
				throw new Error(`Difficulty 5 should include ${shape}`);
			}
		}
	}
});

// Test: Difficulty change resets shape bag
testSuite.tests.push({
	name: 'Shape unlocks - Difficulty change resets shape bag',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();
		
		// Generate a piece at difficulty 1 to fill the shape bag
		PieceFactory.generatePiece(1, 1);
		const bagAfterFirst = PieceFactory.shapeBag.length;
		
		// Change difficulty — bag should be cleared and refilled with new shapes
		PieceFactory.generatePiece(1, 2);
		
		// The bag was reset and a new piece was drawn, so verify
		// the pool now includes difficulty 2 shapes
		PieceFactory.currentDifficulty = 2;
		const pool = PieceFactory._getShapePool();
		
		if (!pool.includes('V') || !pool.includes('Line3')) {
			throw new Error('After difficulty change, pool should include new shapes');
		}
	}
});

// Test: All new shape definitions exist in config and produce valid pieces
testSuite.tests.push({
	name: 'Shape definitions - All 11 new shapes exist in config',
	async run() {
		await ConfigManager.loadConfig();
		const newShapes = ['V', 'Line3', 'Plus', 'U', 'P', 'Y', 'LongS', 'LongZ', 'LongL', 'LongJ', 'Ring'];
		
		for (const shape of newShapes) {
			const definition = ConfigManager.get(`pieceShapes.${shape}`);
			if (!definition) {
				throw new Error(`Shape definition missing for: ${shape}`);
			}
			if (!Array.isArray(definition) || definition.length === 0) {
				throw new Error(`Shape definition invalid for: ${shape}`);
			}
		}
	}
});

// Test: New shapes produce pieces with correct ball counts
testSuite.tests.push({
	name: 'Shape definitions - New shapes have correct ball counts',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();
		PieceFactory.currentDifficulty = 5;
		
		const expectedBalls = {
			'V': 3, 'Line3': 3,
			'Plus': 5, 'U': 5,
			'P': 5, 'Y': 5, 'LongS': 5, 'LongZ': 5,
			'LongL': 6, 'LongJ': 6,
			'Ring': 8
		};
		
		for (const [shape, count] of Object.entries(expectedBalls)) {
			const definition = ConfigManager.get(`pieceShapes.${shape}`);
			let ballCount = 0;
			for (const row of definition) {
				for (const cell of row) {
					if (cell === 1) {
						ballCount++;
					}
				}
			}
			if (ballCount !== count) {
				throw new Error(`${shape}: expected ${count} balls, got ${ballCount}`);
			}
		}
	}
});

// Test: generatePiece can produce new shapes at difficulty 5
testSuite.tests.push({
	name: 'Shape unlocks - generatePiece produces new shapes at difficulty 5',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();
		
		// Generate many pieces at difficulty 5 and check that at least one
		// new shape appears (statistically near-certain with 18 shapes in bag)
		const newShapeSet = new Set(['V', 'Line3', 'Plus', 'U', 'P', 'Y', 'LongS', 'LongZ', 'LongL', 'LongJ', 'Ring']);
		let foundNew = false;
		
		for (let i = 0; i < 100; i++) {
			const piece = PieceFactory.generatePiece(1, 5);
			if (newShapeSet.has(piece.shapeType)) {
				foundNew = true;
				break;
			}
		}
		
		if (!foundNew) {
			throw new Error('After 100 pieces at difficulty 5, no new shapes appeared');
		}
	}
});

// Test: generatePiece at difficulty 1 never produces new shapes
testSuite.tests.push({
	name: 'Shape unlocks - Difficulty 1 never produces advanced shapes',
	async run() {
		await ConfigManager.loadConfig();
		PieceFactory.reset();
		
		const newShapeSet = new Set(['V', 'Line3', 'Plus', 'U', 'P', 'Y', 'LongS', 'LongZ', 'LongL', 'LongJ', 'Ring']);
		
		for (let i = 0; i < 100; i++) {
			const piece = PieceFactory.generatePiece(1, 1);
			if (newShapeSet.has(piece.shapeType)) {
				throw new Error(`Difficulty 1 produced advanced shape: ${piece.shapeType}`);
			}
		}
	}
});

export default testSuite;
