/**
 * Test Suite Runner
 * Runs all unit tests and collects results
 * @module test-suite
 */

import { testHelpers } from './test-helpers.js';
import { testDOMHelpers } from './test-dom-helpers.js';
import { testEventEmitter } from './test-event-emitter.js';
import { testBall } from './test-ball.js';
import { testPiece } from './test-piece.js';
import { testGrid } from './test-grid.js';
import testPieceFactory from './test-piece-factory.js';
import testScoreManager from './test-score-manager.js';
import testConfigManager from './test-config-manager.js';
import testInputHandler from './test-input-handler.js';
import testFloatingText from './test-floating-text.js';
import testGameEngine from './test-game-engine.js';
import testSpecialBalls from './test-special-balls.js';
import { runLevelManagerTests } from './test-level-manager.js';
import { runAnimationManagerTests } from './test-animation-manager.js';
import { runParticleSystemTests } from './test-particle-system.js';
import { runPlayerManagerTests } from './test-player-manager.js';
import { runAudioManagerTests } from './test-audio-manager.js';
import { runStatisticsTrackerTests } from './test-statistics-tracker.js';
import { runGameModeTests } from './test-game-modes.js';
import { runSpecialBallInteractionTests } from './test-special-ball-interactions.js';
import { runGravityOptimizationTests } from './test-gravity-optimization.js';
import testMobileInteractions from './test-mobile-interactions.js';
import { runConstantsTests } from './test-constants.js';
import testAdManager from './test-ad-manager.js';
import testMonetizationManager from './test-monetization-manager.js';
import testGoalManager from './test-goal-manager.js';
import testHintManager from './test-hint-manager.js';
import testMissionManager from './test-mission-manager.js';
import testPuzzleManager from './test-puzzle-manager.js';
import testShareManager from './test-share-manager.js';
import ConfigManager from '../../src/modules/ConfigManager.js';

/**
 * Run all test suites
 * @returns {Object} Test results
 */
export async function runAllTests() {
	// Load config before running tests (required for Piece class)
	await ConfigManager.loadConfig();
	
	const suites = [
		{ name: 'Constants', tests: runConstantsTests() },
		{ name: 'Helpers', tests: testHelpers() },
		{ name: 'DOMHelpers', tests: testDOMHelpers() },
		{ name: 'EventEmitter', tests: testEventEmitter() },
		{ name: 'Ball', tests: testBall() },
		{ name: 'Piece', tests: testPiece() },
		{ name: 'Grid', tests: testGrid() }
	];
	
	// Run async test suites
	const asyncResults = await runAsyncTestSuite(testPieceFactory);
	suites.push({ name: testPieceFactory.name, tests: asyncResults });
	
	const scoreManagerResults = await runAsyncTestSuite(testScoreManager);
	suites.push({ name: testScoreManager.name, tests: scoreManagerResults });
	
	const configManagerResults = await runAsyncTestSuite(testConfigManager);
	suites.push({ name: testConfigManager.name, tests: configManagerResults });
	
	const inputHandlerResults = await runAsyncTestSuite(testInputHandler);
	suites.push({ name: testInputHandler.name, tests: inputHandlerResults });
	
	const floatingTextResults = await runAsyncTestSuite(testFloatingText);
	suites.push({ name: testFloatingText.name, tests: floatingTextResults });
	
	const gameEngineResults = await runAsyncTestSuite(testGameEngine);
	suites.push({ name: testGameEngine.name, tests: gameEngineResults });
	
	const specialBallsResults = await runAsyncTestSuite(testSpecialBalls);
	suites.push({ name: testSpecialBalls.name, tests: specialBallsResults });
	
	// Run LevelManager tests
	const levelManagerResults = runLevelManagerTests();
	suites.push({ name: 'LevelManager', tests: levelManagerResults });
	
	// Run AnimationManager tests
	const animationManagerResults = runAnimationManagerTests();
	suites.push({ name: 'AnimationManager', tests: animationManagerResults });
	
	// Run ParticleSystem tests
	const particleSystemResults = runParticleSystemTests();
	suites.push({ name: 'ParticleSystem', tests: particleSystemResults });
	
	// Run PlayerManager tests
	const playerManagerResults = runPlayerManagerTests();
	suites.push({ name: 'PlayerManager', tests: playerManagerResults });
	
	// Run AudioManager tests
	const audioManagerResults = runAudioManagerTests();
	suites.push({ name: 'AudioManager', tests: audioManagerResults });
	
	// Run StatisticsTracker tests
	const statisticsTrackerResults = runStatisticsTrackerTests();
	suites.push({ name: 'StatisticsTracker', tests: statisticsTrackerResults });
	
	// Run GameMode tests
	const gameModeResults = runGameModeTests();
	suites.push({ name: 'GameModes', tests: gameModeResults });
	
	// Run Special Ball Interaction tests
	const specialBallInteractionResults = runSpecialBallInteractionTests();
	suites.push({ name: 'SpecialBallInteractions', tests: specialBallInteractionResults });
	
	// Run Gravity Optimization tests
	const gravityOptimizationResults = runGravityOptimizationTests();
	suites.push({ name: 'GravityOptimization', tests: gravityOptimizationResults });
	
	// Run Mobile Interactions tests
	const mobileInteractionsResults = await runAsyncTestSuite(testMobileInteractions);
	suites.push({ name: testMobileInteractions.name, tests: mobileInteractionsResults });

	// Run AdManager tests
	const adManagerResults = await runAsyncTestSuite(testAdManager);
	suites.push({ name: testAdManager.name, tests: adManagerResults });

	// Run MonetizationManager tests
	const monetizationManagerResults = await runAsyncTestSuite(testMonetizationManager);
	suites.push({ name: testMonetizationManager.name, tests: monetizationManagerResults });

	// Run GoalManager tests
	const goalManagerResults = await runAsyncTestSuite(testGoalManager);
	suites.push({ name: testGoalManager.name, tests: goalManagerResults });

	// Run HintManager tests
	const hintManagerResults = await runAsyncTestSuite(testHintManager);
	suites.push({ name: testHintManager.name, tests: hintManagerResults });

	// Run MissionManager tests
	const missionManagerResults = await runAsyncTestSuite(testMissionManager);
	suites.push({ name: testMissionManager.name, tests: missionManagerResults });

	// Run PuzzleManager tests
	const puzzleManagerResults = await runAsyncTestSuite(testPuzzleManager);
	suites.push({ name: testPuzzleManager.name, tests: puzzleManagerResults });

	// Run ShareManager tests
	const shareManagerResults = await runAsyncTestSuite(testShareManager);
	suites.push({ name: testShareManager.name, tests: shareManagerResults });

	let totalPassed = 0;
	let totalFailed = 0;

	suites.forEach(suite => {
		suite.tests.forEach(test => {
			if (test.pass) {
				totalPassed++;
			}
			else {
				totalFailed++;
			}
		});
	});

	return {
		suites,
		total: totalPassed + totalFailed,
		passed: totalPassed,
		failed: totalFailed,
		allPassed: totalFailed === 0
	};
}

/**
 * Run an async test suite
 * @param {Object} suite - Test suite with name and tests array
 * @returns {Array} Test results
 */
async function runAsyncTestSuite(suite) {
	const results = [];
	
	for (const test of suite.tests) {
		try {
			await test.run();
			results.push({ name: test.name, pass: true });
		} catch (error) {
			results.push({ name: test.name, pass: false, error: error.message });
		}
	}
	
	return results;
}
