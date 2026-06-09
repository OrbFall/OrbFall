/**
 * Unit Tests for PlayerManager
 */

import PlayerManager from '../../src/modules/PlayerManager.js';
import { assert, assertEquals, assertNotNull, assertArrayContains } from '../utils/assert.js';

export function runPlayerManagerTests() {
	const results = [];
	
	// Helper function to run a test
	function test(name, fn) {
		try {
			fn();
			results.push({ name, pass: true, error: null });
		} catch (error) {
			console.error(`✗ ${name}`);
			console.error(`  Error: ${error.message}`);
			results.push({ name, pass: false, error: error.message });
		}
	}
	
	// Save original localStorage to restore after tests
	const originalLocalStorage = {};
	beforeTests();
	
	function beforeTests() {
		// Clear localStorage for clean test environment
		localStorage.clear();
		// Force PlayerManager to reload with clean state
		PlayerManager.loadPlayers();
	}
	
	function afterTests() {
		// Clean up
		localStorage.clear();
	}
	
	// Test: PlayerManager initializes with Guest player
	test('PlayerManager initializes with Guest player', () => {
		// Reset to clean state
		localStorage.clear();
		PlayerManager.loadPlayers();
		
		const players = PlayerManager.getPlayerNames();
		assertArrayContains(players, 'Guest', 'Should have Guest player');
		assertEquals(PlayerManager.getCurrentPlayerName(), 'Guest', 'Current player should be Guest');
	});
	
	// Test: Add new player
	test('addPlayer() creates a new player', () => {
		const result = PlayerManager.addPlayer('Alice');
		assert(result, 'Should successfully add player');
		
		const players = PlayerManager.getPlayerNames();
		assertArrayContains(players, 'Alice', 'Should have Alice in player list');
	});
	
	// Test: Cannot add duplicate player
	test('addPlayer() prevents duplicate player names', () => {
		PlayerManager.addPlayer('Bob');
		const result = PlayerManager.addPlayer('Bob');
		assert(!result, 'Should not add duplicate player');
	});
	
	// Test: Cannot add player with empty name
	test('addPlayer() rejects empty player names', () => {
		const result = PlayerManager.addPlayer('');
		assert(!result, 'Should reject empty name');
		
		const result2 = PlayerManager.addPlayer('   ');
		assert(!result2, 'Should reject whitespace-only name');
	});
	
	// Test: Switch player
	test('switchPlayer() changes current player', () => {
		PlayerManager.addPlayer('Charlie');
		PlayerManager.switchPlayer('Charlie');
		assertEquals(PlayerManager.getCurrentPlayerName(), 'Charlie', 'Current player should be Charlie');
	});
	
	// Test: Get current player data
	test('getCurrentPlayerData() returns player data', () => {
		const data = PlayerManager.getCurrentPlayerData();
		assertNotNull(data, 'Should return player data');
		assertNotNull(data.levelProgress, 'Should have levelProgress');
		assertNotNull(data.stats, 'Should have stats');
	});
	
	// Test: Delete player
	test('deletePlayer() removes a player', () => {
		PlayerManager.addPlayer('David');
		const result = PlayerManager.deletePlayer('David');
		assert(result, 'Should successfully delete player');
		
		const players = PlayerManager.getPlayerNames();
		assert(!players.includes('David'), 'David should not be in player list');
	});
	
	// Test: Cannot delete Guest player
	test('deletePlayer() prevents deleting Guest player', () => {
		const result = PlayerManager.deletePlayer('Guest');
		assert(!result, 'Should not delete Guest player');
		
		const players = PlayerManager.getPlayerNames();
		assertArrayContains(players, 'Guest', 'Guest should still exist');
	});
	
	// Test: Update player stats
	test('updateStats() updates player statistics', () => {
		PlayerManager.switchPlayer('Guest');
		const initialData = PlayerManager.getCurrentPlayerData();
		const initialGamesPlayed = initialData.stats.gamesPlayed;
		
		PlayerManager.updateStats({
			gameStarted: true,
			gameCompleted: true,
			score: 1000,
			level: 1,
			difficulty: 1
		});
		
		const updatedData = PlayerManager.getCurrentPlayerData();
		assert(updatedData.stats.gamesPlayed > initialGamesPlayed, 'Games played should increase');
	});
	
	// Test: Level completion unlocks next level
	test('updateStats() unlocks next level on completion', () => {
		PlayerManager.switchPlayer('Guest');
		
		// Complete level 1, difficulty 1
		PlayerManager.updateStats({
			gameCompleted: true,
			score: 500,
			level: 1,
			difficulty: 1
		});
		
		const data = PlayerManager.getCurrentPlayerData();
		const unlockedLevels = data.levelProgress.unlockedLevelsByDifficulty["1"];
		assert(unlockedLevels.includes(2), 'Level 2 should be unlocked');
	});
	
	// Test: Completing level 30 does not unlock level 31
	test('updateStats() does not unlock level 31 after completing level 30', () => {
		PlayerManager.switchPlayer('Guest');

		PlayerManager.updateStats({
			gameCompleted: true,
			score: 500,
			level: 30,
			difficulty: 1
		});

		const data = PlayerManager.getCurrentPlayerData();
		const unlockedLevels = data.levelProgress.unlockedLevelsByDifficulty["1"];
		assert(!unlockedLevels.includes(31), 'Level 31 must never be unlocked (MAX_LEVELS = 30)');
	});

	// Test: Level completion is tracked per difficulty
	test('updateStats() tracks completions per difficulty', () => {
		PlayerManager.addPlayer('TestPlayer1');
		PlayerManager.switchPlayer('TestPlayer1');
		
		// Complete level 1 on Easy (difficulty 1)
		PlayerManager.updateStats({
			gameCompleted: true,
			score: 500,
			level: 1,
			difficulty: 1
		});
		
		// Complete level 1 on Hard (difficulty 3)
		PlayerManager.updateStats({
			gameCompleted: true,
			score: 800,
			level: 1,
			difficulty: 3
		});
		
		assert(PlayerManager.isLevelCompleted(1, 1), 'Level 1 Easy should be completed');
		assert(PlayerManager.isLevelCompleted(3, 1), 'Level 1 Hard should be completed');
		assert(!PlayerManager.isLevelCompleted(2, 1), 'Level 1 Medium should not be completed');
	});
	
	// Test: Best score is tracked per difficulty and level
	test('getLevelBestScore() returns best score for difficulty-level', () => {
		PlayerManager.addPlayer('TestPlayer2');
		PlayerManager.switchPlayer('TestPlayer2');
		
		// Score 500 on Easy Level 1
		PlayerManager.updateStats({
			gameCompleted: true,
			score: 500,
			level: 1,
			difficulty: 1
		});
		
		// Score 800 on Easy Level 1 (should replace)
		PlayerManager.updateStats({
			gameCompleted: true,
			score: 800,
			level: 1,
			difficulty: 1
		});
		
		// Score 600 on Hard Level 1 (different difficulty)
		PlayerManager.updateStats({
			gameCompleted: true,
			score: 600,
			level: 1,
			difficulty: 3
		});
		
		assertEquals(PlayerManager.getLevelBestScore(1, 1), 800, 'Easy Level 1 best score should be 800');
		assertEquals(PlayerManager.getLevelBestScore(3, 1), 600, 'Hard Level 1 best score should be 600');
	});
	
	// Test: Unlocked levels are tracked per difficulty
	test('Unlocked levels tracked per difficulty in player data', () => {
		PlayerManager.addPlayer('TestPlayer3');
		PlayerManager.switchPlayer('TestPlayer3');
		
		// Complete levels 1-3 on Easy
		for (let i = 1; i <= 3; i++) {
			PlayerManager.updateStats({
				gameCompleted: true,
				score: 500,
				level: i,
				difficulty: 1
			});
		}
		
		// Complete only level 1 on Hard
		PlayerManager.updateStats({
			gameCompleted: true,
			score: 600,
			level: 1,
			difficulty: 3
		});
		
		const data = PlayerManager.getCurrentPlayerData();
		const easyUnlocked = data.levelProgress.unlockedLevelsByDifficulty["1"];
		const hardUnlocked = data.levelProgress.unlockedLevelsByDifficulty["3"];
		
		assert(easyUnlocked.includes(4), 'Easy should have level 4 unlocked');
		assert(easyUnlocked.length >= 4, 'Easy should have at least 4 levels unlocked');
		assert(hardUnlocked.includes(2), 'Hard should have level 2 unlocked');
		assert(hardUnlocked.length === 2, 'Hard should have exactly 2 levels unlocked');
	});
	
	// Test: Settings are saved and loaded per player
	test('updateSettings() and getSettings() work per player', () => {
		PlayerManager.addPlayer('TestPlayer4');
		PlayerManager.switchPlayer('TestPlayer4');
		
		PlayerManager.updateSettings({
			isMuted: true,
			masterVolume: 0.5,
			sfxVolume: 0.6,
			musicVolume: 0.7
		});
		
		const settings = PlayerManager.getSettings();
		assertEquals(settings.isMuted, true, 'isMuted should be true');
		assertEquals(settings.masterVolume, 0.5, 'masterVolume should be 0.5');
		
		// Switch to another player and verify different settings
		PlayerManager.switchPlayer('Guest');
		const guestSettings = PlayerManager.getSettings();
		assertEquals(guestSettings.isMuted, false, 'Guest isMuted should be false (default)');
	});
	
	// Test: Data persistence across reload
	test('Players persist to localStorage', () => {
		PlayerManager.addPlayer('PersistTest');
		
		// Simulate reload by getting data from localStorage
		const savedData = localStorage.getItem('ballMatcher_players');
		assertNotNull(savedData, 'Player data should be saved');
		
		const parsedData = JSON.parse(savedData);
		assertNotNull(parsedData['PersistTest'], 'PersistTest should be in saved data');
	});
	
	// Test: Migration from old data format
	test('migratePlayerData() converts old array-based unlocked levels', () => {
		// Create a player with old format data
		const oldFormatPlayer = {
			name: 'OldFormatPlayer',
			levelProgress: {
				unlockedLevels: [1, 2, 3, 4, 5], // Old array format
				completedLevels: [1, 2, 3], // Old number format
				levelScores: { 1: 500, 2: 600, 3: 700 }
			},
			statistics: {
				gamesPlayed: 10,
				gamesCompleted: 5,
				totalScore: 5000
			}
		};
		
		// Save in old format
		const players = JSON.parse(localStorage.getItem('ballMatcher_players') || '{}');
		players['OldFormatPlayer'] = oldFormatPlayer;
		localStorage.setItem('ballMatcher_players', JSON.stringify(players));
		
		// Create new PlayerManager instance (triggers migration)
		const freshManager = new (PlayerManager.constructor)();
		freshManager.loadPlayers();
		
		// Verify migration
		const migratedPlayer = freshManager.players['OldFormatPlayer'];
		assertNotNull(migratedPlayer.levelProgress.unlockedLevelsByDifficulty, 'Should have unlockedLevelsByDifficulty');
		assert(!Array.isArray(migratedPlayer.levelProgress.unlockedLevels), 'Should not have old unlockedLevels array');
	});
	
	// Test: Gap filling in unlocked levels
	test('updateStats() fills gaps in unlocked levels', () => {
		PlayerManager.addPlayer('GapTest');
		PlayerManager.switchPlayer('GapTest');
		
		// Complete level 5 (should unlock 1-6 with no gaps)
		PlayerManager.updateStats({
			gameCompleted: true,
			score: 1000,
			level: 5,
			difficulty: 1
		});
		
		const data = PlayerManager.getCurrentPlayerData();
		const unlockedLevels = data.levelProgress.unlockedLevelsByDifficulty["1"];
		assert(unlockedLevels.includes(1), 'Should include level 1');
		assert(unlockedLevels.includes(2), 'Should include level 2');
		assert(unlockedLevels.includes(3), 'Should include level 3');
		assert(unlockedLevels.includes(4), 'Should include level 4');
		assert(unlockedLevels.includes(5), 'Should include level 5');
		assert(unlockedLevels.includes(6), 'Should include level 6');
	});

	// ── resetPlayerData tests ──

	test('resetPlayerData() resets stats but keeps settings', () => {
		PlayerManager.addPlayer('ResetTest');
		PlayerManager.switchPlayer('ResetTest');
		
		// Set custom settings
		PlayerManager.updateSettings({ isMuted: true, masterVolume: 0.3 });
		
		// Add some stats
		PlayerManager.updateStats({ score: 500, gameStarted: true });
		
		// Reset
		const result = PlayerManager.resetPlayerData();
		assert(result === true, 'resetPlayerData should return true');
		
		const data = PlayerManager.getCurrentPlayerData();
		assertEquals(data.stats.totalScore, 0, 'Total score should be 0');
		assertEquals(data.stats.gamesPlayed, 0, 'Games played should be 0');
		assertEquals(data.stats.highScore, 0, 'High score should be 0');
		
		// Settings should be preserved
		assertEquals(data.settings.isMuted, true, 'Muted setting should be preserved');
		assertEquals(data.settings.masterVolume, 0.3, 'Volume setting should be preserved');
	});

	// ── getHighScore / getLongestTime tests ──

	test('getHighScore() returns high score for current player', () => {
		PlayerManager.addPlayer('HighScoreTest');
		PlayerManager.switchPlayer('HighScoreTest');
		PlayerManager.updateStats({ score: 100 });
		PlayerManager.updateStats({ score: 500 });
		PlayerManager.updateStats({ score: 250 });
		
		assertEquals(PlayerManager.getHighScore(), 500, 'High score should be 500');
	});

	test('getLongestTime() returns longest time for current player', () => {
		PlayerManager.addPlayer('LongestTimeTest');
		PlayerManager.switchPlayer('LongestTimeTest');
		PlayerManager.updateStats({ time: 30 });
		PlayerManager.updateStats({ time: 120 });
		PlayerManager.updateStats({ time: 60 });
		
		assertEquals(PlayerManager.getLongestTime(), 120, 'Longest time should be 120');
	});

	// ── isLevelCompleted with mode parameter ──

	test('isLevelCompleted() checks mode-specific completion', () => {
		PlayerManager.addPlayer('ModeCompleteTest');
		PlayerManager.switchPlayer('ModeCompleteTest');
		
		PlayerManager.updateStats({
			levelCompleted: 1,
			difficulty: 1,
			mode: 'CLASSIC',
			score: 100
		});
		
		assert(PlayerManager.isLevelCompleted(1, 1, 'CLASSIC'), 'CLASSIC-1-1 should be completed');
		assert(!PlayerManager.isLevelCompleted(1, 1, 'ZEN'), 'ZEN-1-1 should not be completed');
	});

	// ── getLevelBestScore with mode parameter ──

	test('getLevelBestScore() returns mode-specific best score', () => {
		PlayerManager.addPlayer('ModeBestScoreTest');
		PlayerManager.switchPlayer('ModeBestScoreTest');
		
		PlayerManager.updateStats({
			levelCompleted: 1,
			difficulty: 1,
			mode: 'CLASSIC',
			score: 200
		});
		
		PlayerManager.updateStats({
			levelCompleted: 1,
			difficulty: 1,
			mode: 'ZEN',
			score: 500
		});
		
		assertEquals(PlayerManager.getLevelBestScore(1, 1, 'CLASSIC'), 200, 'CLASSIC best should be 200');
		assertEquals(PlayerManager.getLevelBestScore(1, 1, 'ZEN'), 500, 'ZEN best should be 500');
	});

	// ── deletePlayer of non-existent player ──

	test('deletePlayer() returns false for non-existent player', () => {
		const result = PlayerManager.deletePlayer('NonExistent_XYZ');
		assert(result === false, 'Should return false for non-existent player');
	});

	// ── createNewPlayerData structure ──

	test('createNewPlayerData() returns all required fields', () => {
		const data = PlayerManager.createNewPlayerData('TestPlayer');
		assertEquals(data.name, 'TestPlayer', 'Name should match');
		assert(typeof data.createdAt === 'string', 'createdAt should be string');
		assert(typeof data.lastPlayed === 'string', 'lastPlayed should be string');
		assertEquals(data.stats.gamesPlayed, 0, 'gamesPlayed should be 0');
		assertEquals(data.stats.totalScore, 0, 'totalScore should be 0');
		assertEquals(data.stats.highScore, 0, 'highScore should be 0');
		assertEquals(data.stats.longestTime, 0, 'longestTime should be 0');
		assertEquals(data.stats.levelsCompleted, 0, 'levelsCompleted should be 0');
		assert(data.levelProgress !== undefined, 'levelProgress should exist');
		assert(data.levelProgress.unlockedLevelsByMode !== undefined, 'unlockedLevelsByMode should exist');
		assert(Array.isArray(data.levelProgress.completedLevels), 'completedLevels should be array');
		assertEquals(data.levelProgress.completedLevels.length, 0, 'completedLevels should be empty');
		assert(data.settings !== undefined, 'settings should exist');
		assertEquals(data.settings.isMuted, false, 'isMuted default should be false');
	});

	// ── addPlayer validation ──

	test('addPlayer() rejects empty string', () => {
		const result = PlayerManager.addPlayer('');
		assert(result === false, 'Should reject empty name');
	});

	test('addPlayer() rejects whitespace-only string', () => {
		const result = PlayerManager.addPlayer('   ');
		assert(result === false, 'Should reject whitespace-only name');
	});

	test('addPlayer() rejects duplicate name', () => {
		PlayerManager.addPlayer('DuplicateTest');
		const result = PlayerManager.addPlayer('DuplicateTest');
		assert(result === false, 'Should reject duplicate name');
	});

	// ── getPlayerNames ──

	test('getPlayerNames() returns array of all players', () => {
		const names = PlayerManager.getPlayerNames();
		assert(Array.isArray(names), 'Should return array');
		assert(names.includes('Guest'), 'Should include Guest');
	});

	// ── getCurrentPlayerName ──

	test('getCurrentPlayerName() returns current player', () => {
		const name = PlayerManager.getCurrentPlayerName();
		assert(typeof name === 'string', 'Should return string');
		assert(name.length > 0, 'Should not be empty');
	});
	
	// Clean up after tests
	afterTests();
	
	// Summary
	const passed = results.filter(r => r.pass).length;
	const failed = results.filter(r => !r.pass).length;
	
	return results;
}
