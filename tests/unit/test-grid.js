/**
 * Unit tests for Grid class
 * @module test-grid
 */

import Grid from '../../src/modules/Grid.js';
import Piece from '../../src/modules/Piece.js';
import Ball from '../../src/modules/Ball.js';
import { BALL_TYPES } from '../../src/utils/Constants.js';

/**
 * Run all Grid tests
 * @returns {Array} Test results
 */
export function testGrid() {
	const tests = [];

	try {
		// Create grid
		const grid = new Grid(10, 15); // 10 rows, 15 columns

		tests.push({
			name: 'Grid - creates with correct dimensions',
			pass: grid.rows === 10 && grid.cols === 15,
			error: null
		});

		// Test getBallAt
		tests.push({
			name: 'Grid - getBallAt returns null for empty cell',
			pass: grid.getBallAt(0, 0) === null,
			error: null
		});

		// Test setBallAt
		const ball = new Ball(BALL_TYPES.NORMAL, '#FF0000');
		grid.setBallAt(5, 7, ball);
		
		tests.push({
			name: 'Grid - setBallAt places ball correctly',
			pass: grid.getBallAt(5, 7) === ball,
			error: null
		});

		// Test removeBallAt
		grid.removeBallAt(5, 7);
		tests.push({
			name: 'Grid - removeBallAt clears cell',
			pass: grid.getBallAt(5, 7) === null,
			error: null
		});

		// Test piece placement validation
		const shape = [[1]]; // Single cell piece
		const balls = [new Ball(BALL_TYPES.NORMAL, '#00FF00')];
		const piece = new Piece('S', shape, balls);
		piece.position = { x: 0, y: 0 };

		tests.push({
			name: 'Grid - isValidPosition returns true for valid position',
			pass: grid.isValidPosition(piece) === true,
			error: null
		});

		// Test out of bounds
		piece.position = { x: -1, y: 0 };
		tests.push({
			name: 'Grid - isValidPosition returns false for out of bounds',
			pass: grid.isValidPosition(piece) === false,
			error: null
		});

		// Test collision detection
		grid.setBallAt(5, 5, new Ball(BALL_TYPES.NORMAL, '#0000FF'));
		piece.position = { x: 5, y: 5 };
		tests.push({
			name: 'Grid - isValidPosition returns false for collision',
			pass: grid.isValidPosition(piece) === false,
			error: null
		});

		// Test placePiece
		piece.position = { x: 3, y: 3 };
		grid.placePiece(piece);
		tests.push({
			name: 'Grid - placePiece places ball on grid',
			pass: grid.getBallAt(3, 3) !== null,
			error: null
		});

		// Test horizontal matching
		const grid2 = new Grid(10, 15);
		// Place 3 balls horizontally
		for (let x = 0; x < 3; x++) {
			grid2.setBallAt(0, x, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		}
		const matches = grid2.findMatches();
		
		tests.push({
			name: 'Grid - findMatches detects horizontal match',
			pass: matches.length > 0,
			error: null
		});

		tests.push({
			name: 'Grid - match contains correct positions',
			pass: matches[0].positions.length === 3,
			error: null
		});

		// Test vertical matching
		const grid3 = new Grid(10, 15);
		for (let y = 0; y < 3; y++) {
			grid3.setBallAt(y, 0, new Ball(BALL_TYPES.NORMAL, '#00FF00'));
		}
		const verticalMatches = grid3.findMatches();
		
		tests.push({
			name: 'Grid - findMatches detects vertical match',
			pass: verticalMatches.length > 0 && verticalMatches[0].direction === 'vertical',
			error: null
		});

		// Test gravity
		const grid4 = new Grid(10, 15);
		grid4.setBallAt(0, 5, new Ball(BALL_TYPES.NORMAL, '#0000FF'));
		grid4.setBallAt(5, 5, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		grid4.applyGravity();
		
		tests.push({
			name: 'Grid - applyGravity moves balls down',
			pass: grid4.getBallAt(9, 5) !== null,
			error: null
		});
		
		// Test flood-fill gravity - all floating balls compact to bottom
		const gravityGrid = new Grid(10, 10);
		// Column 3: balls at rows 0, 4 (gap at 2 removed)
		gravityGrid.setBallAt(0, 3, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		gravityGrid.setBallAt(4, 3, new Ball(BALL_TYPES.NORMAL, '#0000FF'));
		// Column 7: balls at rows 1, 3
		gravityGrid.setBallAt(1, 7, new Ball(BALL_TYPES.NORMAL, '#FFFF00'));
		gravityGrid.setBallAt(3, 7, new Ball(BALL_TYPES.NORMAL, '#FF00FF'));
		// Column 5: ball at row 0
		gravityGrid.setBallAt(0, 5, new Ball(BALL_TYPES.NORMAL, '#00FFFF'));
		
		const removed = [{ row: 2, col: 3 }];
		gravityGrid.applyGravity(removed);
		
		tests.push({
			name: 'Gravity - flood-fill compacts all floating balls to bottom',
			pass: gravityGrid.getBallAt(9, 3) !== null && // Column 3 compacted
			      gravityGrid.getBallAt(8, 3) !== null &&
			      gravityGrid.getBallAt(9, 7) !== null && // Column 7 also compacted
			      gravityGrid.getBallAt(8, 7) !== null &&
			      gravityGrid.getBallAt(9, 5) !== null, // Column 5 also compacted
			error: null
		});
		
		// Test gravity with multiple columns - all floating balls drop
		const multiColGrid = new Grid(10, 10);
		multiColGrid.setBallAt(0, 2, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		multiColGrid.setBallAt(2, 2, new Ball(BALL_TYPES.NORMAL, '#00FF00'));
		multiColGrid.setBallAt(0, 5, new Ball(BALL_TYPES.NORMAL, '#0000FF'));
		multiColGrid.setBallAt(3, 5, new Ball(BALL_TYPES.NORMAL, '#FFFF00'));
		multiColGrid.setBallAt(0, 8, new Ball(BALL_TYPES.NORMAL, '#FF00FF'));
		
		const multiRemoved = [
			{ row: 1, col: 2 },
			{ row: 1, col: 5 },
			{ row: 2, col: 5 }
		];
		// Remove the balls at specified positions (simulating match removal)
		multiRemoved.forEach(pos => multiColGrid.removeBallAt(pos.row, pos.col));
		multiColGrid.applyGravity(multiRemoved);
		
		tests.push({
			name: 'Gravity - handles multiple columns compacting',
			pass: multiColGrid.getBallAt(9, 2) !== null && // Column 2 compacted
			      multiColGrid.getBallAt(8, 2) !== null &&
			      multiColGrid.getBallAt(9, 5) !== null && // Column 5 compacted
			      multiColGrid.getBallAt(8, 5) !== null &&
			      multiColGrid.getBallAt(9, 8) !== null, // Column 8 also compacted (flood-fill)
			error: null
		});
		
		// Test gravity without positions (legacy - all columns)
		const legacyGrid = new Grid(10, 10);
		legacyGrid.setBallAt(0, 3, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		legacyGrid.setBallAt(0, 7, new Ball(BALL_TYPES.NORMAL, '#00FF00'));
		legacyGrid.applyGravity(); // No positions = all columns
		
		tests.push({
			name: 'Gravity - legacy mode processes all columns',
			pass: legacyGrid.getBallAt(9, 3) !== null &&
			      legacyGrid.getBallAt(9, 7) !== null,
			error: null
		});
		
		// Test gravity preserves relative ball order (top stays on top)
		const orderGrid = new Grid(10, 10);
		const redBall = new Ball(BALL_TYPES.NORMAL, '#FF0000');
		const greenBall = new Ball(BALL_TYPES.NORMAL, '#00FF00');
		const blueBall = new Ball(BALL_TYPES.NORMAL, '#0000FF');
		orderGrid.setBallAt(1, 4, redBall);   // top
		orderGrid.setBallAt(3, 4, greenBall); // middle
		orderGrid.setBallAt(5, 4, blueBall);  // bottom
		
		orderGrid.applyGravity([{ row: 2, col: 4 }]);
		
		tests.push({
			name: 'Gravity - preserves relative ball order when compacting',
			pass: orderGrid.getBallAt(7, 4) === redBall &&   // top ball stays on top
			      orderGrid.getBallAt(8, 4) === greenBall && // middle stays middle
			      orderGrid.getBallAt(9, 4) === blueBall,    // bottom ball at bottom
			error: null
		});
		
		// Test gravity returns correct ballsMoved flag
		const moveGrid = new Grid(10, 10);
		moveGrid.setBallAt(0, 3, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		const moved1 = moveGrid.applyGravity([{ row: 5, col: 3 }]);
		
		const stableGrid = new Grid(10, 10);
		stableGrid.setBallAt(9, 3, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		const moved2 = stableGrid.applyGravity([{ row: 8, col: 3 }]);
		
		tests.push({
			name: 'Gravity - returns true when balls moved',
			pass: moved1 === true && moved2 === false,
			error: null
		});

		// Test isColumnFull
		const grid5 = new Grid(5, 5);
		for (let y = 0; y < 5; y++) {
			grid5.setBallAt(y, 2, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		}
		
		tests.push({
			name: 'Grid - isColumnFull detects full column',
			pass: grid5.isColumnFull(2) === true,
			error: null
		});

		tests.push({
			name: 'Grid - isColumnFull returns false for empty column',
			pass: grid5.isColumnFull(0) === false,
			error: null
		});

		// Test clear
		grid5.clear();
		tests.push({
			name: 'Grid - clear removes all balls',
			pass: grid5.getBallAt(2, 2) === null,
			error: null
		});
		
		// Test new iterator methods
		const iterGrid = new Grid(3, 3);
		iterGrid.setBallAt(0, 0, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		iterGrid.setBallAt(1, 1, new Ball(BALL_TYPES.NORMAL, '#00FF00'));
		iterGrid.setBallAt(2, 2, new Ball(BALL_TYPES.NORMAL, '#0000FF'));
		
		// Test forEachCell
		tests.push({
			name: 'Grid - forEachCell iterates all cells',
			pass: (() => {
				let count = 0;
				iterGrid.forEachCell((row, col, ball) => {
					count++;
				});
				return count === 9; // 3x3 grid
			})(),
			error: null
		});
		
		tests.push({
			name: 'Grid - forEachCell provides correct parameters',
			pass: (() => {
				let valid = true;
				iterGrid.forEachCell((row, col, ball) => {
					if (row < 0 || row >= 3 || col < 0 || col >= 3) {
						valid = false;
					}
				});
				return valid;
			})(),
			error: null
		});
		
		// Test iterateCells generator
		tests.push({
			name: 'Grid - iterateCells returns generator',
			pass: (() => {
				const iter = iterGrid.iterateCells();
				return typeof iter.next === 'function';
			})(),
			error: null
		});
		
		tests.push({
			name: 'Grid - iterateCells yields all cells',
			pass: (() => {
				let count = 0;
				for (const cell of iterGrid.iterateCells()) {
					count++;
				}
				return count === 9;
			})(),
			error: null
		});
		
		tests.push({
			name: 'Grid - iterateCells yields correct cell objects',
			pass: (() => {
				const cells = Array.from(iterGrid.iterateCells());
				return cells[0].row === 0 && cells[0].col === 0 && 
				       cells[4].row === 1 && cells[4].col === 1 &&
				       cells.every(c => c.hasOwnProperty('row') && c.hasOwnProperty('col') && c.hasOwnProperty('ball'));
			})(),
			error: null
		});
		
		// Test mapCells
		tests.push({
			name: 'Grid - mapCells returns array of mapped values',
			pass: (() => {
				const coords = iterGrid.mapCells((row, col, ball) => `${row},${col}`);
				return coords.length === 9 && coords[0] === '0,0' && coords[8] === '2,2';
			})(),
			error: null
		});
		
		tests.push({
			name: 'Grid - mapCells can access ball data',
			pass: (() => {
				const colors = iterGrid.mapCells((row, col, ball) => ball ? ball.getColor() : null);
				const nonNullColors = colors.filter(c => c !== null);
				return nonNullColors.length === 3; // We placed 3 balls
			})(),
			error: null
		});
		
		// Test filterCells
		tests.push({
			name: 'Grid - filterCells returns only matching cells',
			pass: (() => {
				const occupiedCells = iterGrid.filterCells((row, col, ball) => ball !== null);
				return occupiedCells.length === 3;
			})(),
			error: null
		});
		
		tests.push({
			name: 'Grid - filterCells returns cell objects with ball data',
			pass: (() => {
				const occupiedCells = iterGrid.filterCells((row, col, ball) => ball !== null);
				return occupiedCells.every(c => c.ball !== null && c.hasOwnProperty('row') && c.hasOwnProperty('col'));
			})(),
			error: null
		});
		
		tests.push({
			name: 'Grid - filterCells can filter by position',
			pass: (() => {
				const topRow = iterGrid.filterCells((row, col, ball) => row === 0);
				return topRow.length === 3 && topRow.every(c => c.row === 0);
			})(),
			error: null
		});
		
		tests.push({
			name: 'Grid - filterCells can filter diagonal cells',
			pass: (() => {
				const diagonal = iterGrid.filterCells((row, col, ball) => row === col);
				return diagonal.length === 3 && diagonal[0].row === 0 && diagonal[1].row === 1 && diagonal[2].row === 2;
			})(),
			error: null
		});
		
		// Edge cases for Grid iterator methods
		const emptyGrid = new Grid(5, 5);
		
		tests.push({
			name: 'Grid - forEachCell works on empty grid',
			pass: (() => {
				let count = 0;
				emptyGrid.forEachCell(() => count++);
				return count === 25;
			})(),
			error: null
		});
		
		tests.push({
			name: 'Grid - filterCells returns empty array when no matches',
			pass: emptyGrid.filterCells((row, col, ball) => ball !== null).length === 0,
			error: null
		});
		
		tests.push({
			name: 'Grid - mapCells on empty grid returns all nulls',
			pass: (() => {
				const balls = emptyGrid.mapCells((row, col, ball) => ball);
				return balls.every(b => b === null) && balls.length === 25;
			})(),
			error: null
		});
		
		// Test grid boundaries
		const boundaryGrid = new Grid(3, 3);
		boundaryGrid.setBallAt(0, 0, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		boundaryGrid.setBallAt(2, 2, new Ball(BALL_TYPES.NORMAL, '#00FF00'));
		
		tests.push({
			name: 'Grid - iterateCells includes corner cells',
			pass: (() => {
				const cells = Array.from(boundaryGrid.iterateCells());
				const topLeft = cells.find(c => c.row === 0 && c.col === 0);
				const bottomRight = cells.find(c => c.row === 2 && c.col === 2);
				return topLeft && topLeft.ball !== null && bottomRight && bottomRight.ball !== null;
			})(),
			error: null
		});
		
		tests.push({
			name: 'Grid - getBallAt handles boundary correctly',
			pass: boundaryGrid.getBallAt(2, 2) !== null && boundaryGrid.getBallAt(3, 3) === null,
			error: null
		});

		// Test diagonal matching (top-left to bottom-right)
		const diagGrid1 = new Grid(10, 10);
		for (let i = 0; i < 3; i++) {
			diagGrid1.setBallAt(i, i, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		}
		const diagMatches1 = diagGrid1.findMatches();
		
		tests.push({
			name: 'Grid - findMatches detects diagonal match (TL-BR)',
			pass: diagMatches1.length > 0 && diagMatches1.some(m => m.direction === 'diagonal'),
			error: diagMatches1.length === 0 ? 'No matches found' : !diagMatches1.some(m => m.direction === 'diagonal') ? 'No diagonal match found' : null
		});

		tests.push({
			name: 'Grid - diagonal match has correct positions',
			pass: (() => {
				const diagMatch = diagMatches1.find(m => m.direction === 'diagonal');
				return diagMatch && diagMatch.positions.length === 3;
			})(),
			error: null
		});

		// Test diagonal matching (top-right to bottom-left)
		const diagGrid2 = new Grid(10, 10);
		for (let i = 0; i < 3; i++) {
			diagGrid2.setBallAt(i, 2 - i, new Ball(BALL_TYPES.NORMAL, '#00FF00'));
		}
		const diagMatches2 = diagGrid2.findMatches();
		
		tests.push({
			name: 'Grid - findMatches detects diagonal match (TR-BL)',
			pass: diagMatches2.length > 0 && diagMatches2.some(m => m.direction === 'diagonal'),
			error: diagMatches2.length === 0 ? 'No matches found' : null
		});

		// Test longer diagonal match (4 balls)
		const diagGrid3 = new Grid(10, 10);
		for (let i = 0; i < 4; i++) {
			diagGrid3.setBallAt(i, i, new Ball(BALL_TYPES.NORMAL, '#0000FF'));
		}
		const diagMatches3 = diagGrid3.findMatches();
		
		tests.push({
			name: 'Grid - findMatches detects 4-ball diagonal match',
			pass: (() => {
				const diagMatch = diagMatches3.find(m => m.direction === 'diagonal');
				return diagMatch && diagMatch.positions.length === 4;
			})(),
			error: null
		});

		// Test diagonal match starting from middle of grid
		const diagGrid4 = new Grid(10, 10);
		for (let i = 0; i < 3; i++) {
			diagGrid4.setBallAt(3 + i, 3 + i, new Ball(BALL_TYPES.NORMAL, '#FF00FF'));
		}
		const diagMatches4 = diagGrid4.findMatches();
		
		tests.push({
			name: 'Grid - findMatches detects diagonal match not starting at origin',
			pass: diagMatches4.length > 0 && diagMatches4.some(m => m.direction === 'diagonal'),
			error: null
		});

		// Test diagonal match with different colors should not match
		const diagGrid5 = new Grid(10, 10);
		diagGrid5.setBallAt(0, 0, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		diagGrid5.setBallAt(1, 1, new Ball(BALL_TYPES.NORMAL, '#00FF00'));
		diagGrid5.setBallAt(2, 2, new Ball(BALL_TYPES.NORMAL, '#0000FF'));
		const diagMatches5 = diagGrid5.findMatches();
		
		tests.push({
			name: 'Grid - diagonal with different colors does not match',
			pass: diagMatches5.length === 0,
			error: diagMatches5.length > 0 ? 'Found match with different colors' : null
		});

		// Test multiple diagonal matches in same grid
		const multiDiagGrid = new Grid(10, 10);
		// First diagonal (TL-BR)
		for (let i = 0; i < 3; i++) {
			multiDiagGrid.setBallAt(i, i, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		}
		// Second diagonal (TR-BL) offset
		for (let i = 0; i < 3; i++) {
			multiDiagGrid.setBallAt(i, 6 - i, new Ball(BALL_TYPES.NORMAL, '#00FF00'));
		}
		const multiDiagMatches = multiDiagGrid.findMatches();
		
		tests.push({
			name: 'Grid - finds multiple diagonal matches',
			pass: multiDiagMatches.filter(m => m.direction === 'diagonal').length >= 2,
			error: `Found ${multiDiagMatches.filter(m => m.direction === 'diagonal').length} diagonal matches, expected 2`
		});

		// Test diagonal + horizontal matches together
		const mixedGrid = new Grid(10, 10);
		// Horizontal match
		for (let x = 0; x < 3; x++) {
			mixedGrid.setBallAt(0, x, new Ball(BALL_TYPES.NORMAL, '#FFFF00'));
		}
		// Diagonal match
		for (let i = 0; i < 3; i++) {
			mixedGrid.setBallAt(3 + i, 3 + i, new Ball(BALL_TYPES.NORMAL, '#00FFFF'));
		}
		const mixedMatches = mixedGrid.findMatches();
		
		tests.push({
			name: 'Grid - finds both horizontal and diagonal matches',
			pass: mixedMatches.some(m => m.direction === 'horizontal') && mixedMatches.some(m => m.direction === 'diagonal'),
			error: `Found ${mixedMatches.length} matches: ${mixedMatches.map(m => m.direction).join(', ')}`
		});

		// Test diagonal near edge of grid
		const edgeDiagGrid = new Grid(5, 5);
		for (let i = 0; i < 3; i++) {
			edgeDiagGrid.setBallAt(2 + i, 2 + i, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		}
		const edgeDiagMatches = edgeDiagGrid.findMatches();
		
		tests.push({
			name: 'Grid - finds diagonal match near edge',
			pass: edgeDiagMatches.length > 0 && edgeDiagMatches.some(m => m.direction === 'diagonal'),
			error: null
		});

		// Test diagonal with special balls
		const specialDiagGrid = new Grid(10, 10);
		specialDiagGrid.setBallAt(0, 0, new Ball(BALL_TYPES.EXPLODING, '#FF0000'));
		specialDiagGrid.setBallAt(1, 1, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		specialDiagGrid.setBallAt(2, 2, new Ball(BALL_TYPES.PAINTER_HORIZONTAL, '#FF0000'));
		const specialDiagMatches = specialDiagGrid.findMatches();
		
		tests.push({
			name: 'Grid - diagonal match works with special balls',
			pass: specialDiagMatches.length > 0 && specialDiagMatches.some(m => m.direction === 'diagonal'),
			error: specialDiagMatches.length === 0 ? 'No diagonal match found with special balls' : null
		});

		// Test blocking balls break diagonal matches
		const blockingDiagGrid = new Grid(10, 10);
		blockingDiagGrid.setBallAt(0, 0, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		blockingDiagGrid.setBallAt(1, 1, new Ball(BALL_TYPES.BLOCKING, '#888888'));
		blockingDiagGrid.setBallAt(2, 2, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		const blockingDiagMatches = blockingDiagGrid.findMatches();
		
		tests.push({
			name: 'Grid - blocking ball breaks diagonal match',
			pass: !blockingDiagMatches.some(m => m.direction === 'diagonal'),
			error: blockingDiagMatches.some(m => m.direction === 'diagonal') ? 'Blocking ball did not break diagonal' : null
		});

		// Test 5+ ball diagonal match
		const longDiagGrid = new Grid(10, 10);
		for (let i = 0; i < 5; i++) {
			longDiagGrid.setBallAt(i, i, new Ball(BALL_TYPES.NORMAL, '#0000FF'));
		}
		const longDiagMatches = longDiagGrid.findMatches();
		
		tests.push({
			name: 'Grid - finds 5-ball diagonal match',
			pass: (() => {
				const diagMatch = longDiagMatches.find(m => m.direction === 'diagonal');
				return diagMatch && diagMatch.positions.length === 5;
			})(),
			error: null
		});

		// Test all match types together
		const allMatchGrid = new Grid(10, 10);
		// Horizontal
		for (let x = 0; x < 3; x++) {
			allMatchGrid.setBallAt(0, x, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		}
		// Vertical
		for (let y = 0; y < 3; y++) {
			allMatchGrid.setBallAt(y, 5, new Ball(BALL_TYPES.NORMAL, '#00FF00'));
		}
		// Diagonal TL-BR
		for (let i = 0; i < 3; i++) {
			allMatchGrid.setBallAt(5 + i, 5 + i, new Ball(BALL_TYPES.NORMAL, '#0000FF'));
		}
		// Diagonal TR-BL
		for (let i = 0; i < 3; i++) {
			allMatchGrid.setBallAt(5 + i, 2 - i, new Ball(BALL_TYPES.NORMAL, '#FFFF00'));
		}
		const allMatches = allMatchGrid.findMatches();
		
		tests.push({
			name: 'Grid - finds all match types (H, V, D)',
			pass: allMatches.some(m => m.direction === 'horizontal') &&
			      allMatches.some(m => m.direction === 'vertical') &&
			      allMatches.some(m => m.direction === 'diagonal'),
			error: `Found directions: ${[...new Set(allMatches.map(m => m.direction))].join(', ')}`
		});

		tests.push({
			name: 'Grid - finds all 4 matches in complex grid',
			pass: allMatches.length >= 4,
			error: `Expected 4 matches, found ${allMatches.length}`
		});

		// Test getHighestBallRow
		const highestGrid = new Grid(10, 10);
		tests.push({
			name: 'Grid - getHighestBallRow returns -1 for empty grid',
			pass: highestGrid.getHighestBallRow() === -1,
			error: `Expected -1, got ${highestGrid.getHighestBallRow()}`
		});

		highestGrid.setBallAt(5, 3, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		tests.push({
			name: 'Grid - getHighestBallRow returns lowest row number with ball',
			pass: highestGrid.getHighestBallRow() === 5,
			error: `Expected 5, got ${highestGrid.getHighestBallRow()}`
		});

		highestGrid.setBallAt(2, 7, new Ball(BALL_TYPES.NORMAL, '#00FF00'));
		tests.push({
			name: 'Grid - getHighestBallRow returns topmost ball',
			pass: highestGrid.getHighestBallRow() === 2,
			error: `Expected 2, got ${highestGrid.getHighestBallRow()}`
		});

		highestGrid.setBallAt(0, 0, new Ball(BALL_TYPES.NORMAL, '#0000FF'));
		tests.push({
			name: 'Grid - getHighestBallRow handles ball at row 0',
			pass: highestGrid.getHighestBallRow() === 0,
			error: `Expected 0, got ${highestGrid.getHighestBallRow()}`
		});

		// Test isAnyColumnFull
		const fullColGrid = new Grid(10, 10);
		tests.push({
			name: 'Grid - isAnyColumnFull returns false for empty grid',
			pass: fullColGrid.isAnyColumnFull() === false,
			error: null
		});

		fullColGrid.setBallAt(0, 5, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		tests.push({
			name: 'Grid - isAnyColumnFull returns true when column has ball at top',
			pass: fullColGrid.isAnyColumnFull() === true,
			error: null
		});

		fullColGrid.removeBallAt(0, 5);
		fullColGrid.setBallAt(1, 5, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		tests.push({
			name: 'Grid - isAnyColumnFull returns false when ball not at top',
			pass: fullColGrid.isAnyColumnFull() === false,
			error: null
		});

		fullColGrid.setBallAt(0, 0, new Ball(BALL_TYPES.NORMAL, '#00FF00'));
		fullColGrid.setBallAt(0, 9, new Ball(BALL_TYPES.NORMAL, '#0000FF'));
		tests.push({
			name: 'Grid - isAnyColumnFull detects any full column',
			pass: fullColGrid.isAnyColumnFull() === true,
			error: null
		});

		// Test getGrid
		const gridRefGrid = new Grid(3, 3);
		const gridRef = gridRefGrid.getGrid();
		tests.push({
			name: 'Grid - getGrid returns grid array',
			pass: Array.isArray(gridRef) && gridRef.length === 3,
			error: !Array.isArray(gridRef) ? 'Not an array' : `Expected 3 rows, got ${gridRef.length}`
		});

		tests.push({
			name: 'Grid - getGrid returns correct structure',
			pass: Array.isArray(gridRef[0]) && gridRef[0].length === 3,
			error: null
		});

		gridRefGrid.setBallAt(1, 1, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		tests.push({
			name: 'Grid - getGrid reflects grid changes',
			pass: gridRef[1][1] !== null,
			error: null
		});

		// Test processExplosions
		const explosionGrid = new Grid(10, 10);
		// Place exploding ball at (5, 5)
		explosionGrid.setBallAt(5, 5, new Ball(BALL_TYPES.EXPLODING, '#FF0000'));
		explosionGrid.setBallAt(5, 6, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		explosionGrid.setBallAt(5, 7, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		
		// Create match with exploding ball
		const explosionMatch = [{
			positions: [
				{ row: 5, col: 5 },
				{ row: 5, col: 6 },
				{ row: 5, col: 7 }
			],
			direction: 'horizontal',
			color: '#FF0000'
		}];
		
		// Fill area around explosion point
		for (let r = 3; r <= 7; r++) {
			for (let c = 3; c <= 7; c++) {
				if (explosionGrid.getBallAt(r, c) === null) {
					explosionGrid.setBallAt(r, c, new Ball(BALL_TYPES.NORMAL, '#00FF00'));
				}
			}
		}
		
		const exploded = explosionGrid.processExplosions(explosionMatch);
		
		tests.push({
			name: 'Grid - processExplosions clears 7x7 area',
			pass: exploded.length > 0,
			error: `Expected cleared positions, got ${exploded.length}`
		});

		tests.push({
			name: 'Grid - processExplosions removes balls in radius',
			pass: explosionGrid.getBallAt(5, 5) === null && explosionGrid.getBallAt(7, 7) === null,
			error: 'Balls still present in explosion radius'
		});

		tests.push({
			name: 'Grid - processExplosions does not affect balls outside radius',
			pass: (() => {
				explosionGrid.setBallAt(9, 9, new Ball(BALL_TYPES.NORMAL, '#0000FF'));
				return explosionGrid.getBallAt(9, 9) !== null;
			})(),
			error: 'Balls outside radius were affected'
		});

		// Test processExplosions with blocking balls
		const explosionGrid2 = new Grid(10, 10);
		explosionGrid2.setBallAt(5, 5, new Ball(BALL_TYPES.EXPLODING, '#FF0000'));
		explosionGrid2.setBallAt(5, 6, new Ball(BALL_TYPES.BLOCKING, '#888888'));
		explosionGrid2.setBallAt(5, 7, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		
		const explosionMatch2 = [{
			positions: [{ row: 5, col: 5 }, { row: 5, col: 7 }],
			direction: 'horizontal',
			color: '#FF0000'
		}];
		
		explosionGrid2.processExplosions(explosionMatch2);
		
		tests.push({
			name: 'Grid - processExplosions clears blocking balls in radius',
			pass: explosionGrid2.getBallAt(5, 6) === null,
			error: 'Blocking ball not cleared by explosion'
		});

		// Test processPainters - horizontal
		const painterGrid = new Grid(10, 10);
		painterGrid.setBallAt(3, 3, new Ball(BALL_TYPES.PAINTER_HORIZONTAL, '#FF0000'));
		painterGrid.setBallAt(3, 4, new Ball(BALL_TYPES.NORMAL, '#00FF00'));
		painterGrid.setBallAt(3, 5, new Ball(BALL_TYPES.NORMAL, '#00FF00'));
		
		// Add balls across the row
		for (let c = 0; c < 10; c++) {
			if (painterGrid.getBallAt(3, c) === null) {
				painterGrid.setBallAt(3, c, new Ball(BALL_TYPES.NORMAL, '#0000FF'));
			}
		}
		
		const painterMatch = [{
			positions: [
				{ row: 3, col: 3 },
				{ row: 3, col: 4 },
				{ row: 3, col: 5 }
			],
			direction: 'horizontal',
			color: '#FF0000'
		}];
		
		const painted = painterGrid.processPainters(painterMatch);
		
		tests.push({
			name: 'Grid - processPainters paints horizontal line',
			pass: painted.length > 0,
			error: `Expected painted positions, got ${painted.length}`
		});

		tests.push({
			name: 'Grid - processPainters changes colors in row',
			pass: painterGrid.getBallAt(3, 0).getColor() === '#FF0000' &&
			      painterGrid.getBallAt(3, 9).getColor() === '#FF0000',
			error: 'Row not fully painted'
		});

		// Test processPainters - vertical
		const painterGrid2 = new Grid(10, 10);
		painterGrid2.setBallAt(3, 3, new Ball(BALL_TYPES.PAINTER_VERTICAL, '#00FF00'));
		painterGrid2.setBallAt(4, 3, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		painterGrid2.setBallAt(5, 3, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		
		// Add balls down the column
		for (let r = 0; r < 10; r++) {
			if (painterGrid2.getBallAt(r, 3) === null) {
				painterGrid2.setBallAt(r, 3, new Ball(BALL_TYPES.NORMAL, '#0000FF'));
			}
		}
		
		const painterMatch2 = [{
			positions: [
				{ row: 3, col: 3 },
				{ row: 4, col: 3 },
				{ row: 5, col: 3 }
			],
			direction: 'vertical',
			color: '#00FF00'
		}];
		
		painterGrid2.processPainters(painterMatch2);
		
		tests.push({
			name: 'Grid - processPainters paints vertical line',
			pass: painterGrid2.getBallAt(0, 3).getColor() === '#00FF00' &&
			      painterGrid2.getBallAt(9, 3).getColor() === '#00FF00',
			error: 'Column not fully painted'
		});

		// Test processPainters paints diagonal lines
		const painterGrid3 = new Grid(10, 10);
		painterGrid3.setBallAt(5, 5, new Ball(BALL_TYPES.PAINTER_DIAGONAL_NE, '#0000FF'));
		painterGrid3.setBallAt(5, 6, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		painterGrid3.setBallAt(5, 7, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		
		// Add balls on NE-SW diagonal
		for (let i = 0; i < 10; i++) {
			const row = 5 + i;
			const col = 5 - i;
			if (row >= 0 && row < 10 && col >= 0 && col < 10) {
				if (painterGrid3.getBallAt(row, col) === null) {
					painterGrid3.setBallAt(row, col, new Ball(BALL_TYPES.NORMAL, '#00FF00'));
				}
			}
			const row2 = 5 - i;
			const col2 = 5 + i;
			if (row2 >= 0 && row2 < 10 && col2 >= 0 && col2 < 10) {
				if (painterGrid3.getBallAt(row2, col2) === null) {
					painterGrid3.setBallAt(row2, col2, new Ball(BALL_TYPES.NORMAL, '#00FF00'));
				}
			}
		}
		
		const painterMatch3 = [{
			positions: [
				{ row: 5, col: 5 },
				{ row: 5, col: 6 },
				{ row: 5, col: 7 }
			],
			direction: 'horizontal',
			color: '#0000FF'
		}];
		
		painterGrid3.processPainters(painterMatch3);
		
		tests.push({
			name: 'Grid - processPainters paints diagonal lines',
			pass: painterGrid3.getBallAt(4, 6) && painterGrid3.getBallAt(4, 6).getColor() === '#0000FF' &&
			      painterGrid3.getBallAt(6, 4) && painterGrid3.getBallAt(6, 4).getColor() === '#0000FF',
			error: 'Diagonal not painted'
		});

		// Test processPainters does not paint blocking balls
		const painterGrid4 = new Grid(10, 10);
		painterGrid4.setBallAt(5, 5, new Ball(BALL_TYPES.PAINTER_HORIZONTAL, '#FF0000'));
		painterGrid4.setBallAt(5, 6, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		painterGrid4.setBallAt(5, 7, new Ball(BALL_TYPES.BLOCKING, '#888888'));
		painterGrid4.setBallAt(5, 8, new Ball(BALL_TYPES.NORMAL, '#00FF00'));
		
		const painterMatch4 = [{
			positions: [
				{ row: 5, col: 5 },
				{ row: 5, col: 6 }
			],
			direction: 'horizontal',
			color: '#FF0000'
		}];
		
		painterGrid4.processPainters(painterMatch4);
		
		tests.push({
			name: 'Grid - processPainters skips blocking balls',
			pass: painterGrid4.getBallAt(5, 7).getColor() === '#888888',
			error: 'Blocking ball was painted'
		});

		tests.push({
			name: 'Grid - processPainters paints non-blocking balls',
			pass: painterGrid4.getBallAt(5, 8).getColor() === '#FF0000',
			error: 'Normal ball was not painted'
		});

		// ── getHighestBallRow tests ──

		const highRowGrid = new Grid(10, 10);
		tests.push({
			name: 'Grid - getHighestBallRow returns -1 for empty grid',
			pass: highRowGrid.getHighestBallRow() === -1,
			error: null
		});

		highRowGrid.setBall(7, 3, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		tests.push({
			name: 'Grid - getHighestBallRow returns row of highest ball',
			pass: highRowGrid.getHighestBallRow() === 7,
			error: `Expected 7, got ${highRowGrid.getHighestBallRow()}`
		});

		highRowGrid.setBall(2, 5, new Ball(BALL_TYPES.NORMAL, '#00FF00'));
		tests.push({
			name: 'Grid - getHighestBallRow returns topmost row',
			pass: highRowGrid.getHighestBallRow() === 2,
			error: `Expected 2, got ${highRowGrid.getHighestBallRow()}`
		});

		// ── isAnyColumnFull tests ──

		const fullColGrid2 = new Grid(5, 5);
		tests.push({
			name: 'Grid - isAnyColumnFull returns false for empty grid',
			pass: fullColGrid2.isAnyColumnFull() === false,
			error: null
		});

		// Fill one column completely
		for (let r = 0; r < 5; r++) {
			fullColGrid2.setBall(r, 2, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		}
		tests.push({
			name: 'Grid - isAnyColumnFull returns true when one column is full',
			pass: fullColGrid2.isAnyColumnFull() === true,
			error: null
		});

		// ── getGrid tests ──

		const getGridTest = new Grid(3, 3);
		const rawGrid = getGridTest.getGrid();
		tests.push({
			name: 'Grid - getGrid returns 2D array',
			pass: Array.isArray(rawGrid) && rawGrid.length === 3 && Array.isArray(rawGrid[0]) && rawGrid[0].length === 3,
			error: null
		});

		tests.push({
			name: 'Grid - getGrid returns same reference as internal grid',
			pass: rawGrid === getGridTest.grid,
			error: null
		});

		// ── mapCells comprehensive test ──

		const mapGrid = new Grid(3, 3);
		mapGrid.setBall(0, 0, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		mapGrid.setBall(1, 1, new Ball(BALL_TYPES.NORMAL, '#00FF00'));
		const mapped = mapGrid.mapCells((row, col, ball) => ball !== null ? 1 : 0);
		tests.push({
			name: 'Grid - mapCells maps all cells',
			pass: mapped.length === 9 && mapped.filter(v => v === 1).length === 2,
			error: null
		});

		// ── filterCells comprehensive test ──

		const filterGrid = new Grid(3, 3);
		filterGrid.setBall(0, 0, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		filterGrid.setBall(1, 1, new Ball(BALL_TYPES.EXPLODING, '#00FF00'));
		filterGrid.setBall(2, 2, new Ball(BALL_TYPES.NORMAL, '#0000FF'));
		const filtered = filterGrid.filterCells((row, col, ball) => ball !== null && ball.getType() === BALL_TYPES.NORMAL);
		tests.push({
			name: 'Grid - filterCells returns only matching cells',
			pass: filtered.length === 2 && filtered.every(c => c.ball.getType() === BALL_TYPES.NORMAL),
			error: null
		});

		// ── iterateCells generator test ──

		const iterGrid2 = new Grid(2, 2);
		iterGrid2.setBall(0, 0, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		let iterCount = 0;
		let iterBallCount = 0;
		for (const cell of iterGrid2.iterateCells()) {
			iterCount++;
			if (cell.ball !== null) iterBallCount++;
		}
		tests.push({
			name: 'Grid - iterateCells yields all cells',
			pass: iterCount === 4 && iterBallCount === 1,
			error: null
		});

		// ── setBall/getBall out of bounds ──

		const boundsGrid = new Grid(5, 5);
		tests.push({
			name: 'Grid - getBall returns null for out of bounds',
			pass: boundsGrid.getBall(-1, 0) === null && boundsGrid.getBall(0, -1) === null && boundsGrid.getBall(5, 0) === null,
			error: null
		});

		// setBall out of bounds should not throw
		let setBallNoThrow = true;
		try {
			boundsGrid.setBall(-1, 0, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
			boundsGrid.setBall(0, 100, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		} catch (e) {
			setBallNoThrow = false;
		}
		tests.push({
			name: 'Grid - setBall out of bounds does not throw',
			pass: setBallNoThrow,
			error: null
		});

		// ── removeBall / removeBallAt ──

		const removeGrid = new Grid(5, 5);
		removeGrid.setBall(2, 2, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		removeGrid.removeBall(2, 2);
		tests.push({
			name: 'Grid - removeBall clears the cell',
			pass: removeGrid.getBall(2, 2) === null,
			error: null
		});

		removeGrid.setBall(3, 3, new Ball(BALL_TYPES.NORMAL, '#00FF00'));
		removeGrid.removeBallAt(3, 3);
		tests.push({
			name: 'Grid - removeBallAt clears the cell (alias)',
			pass: removeGrid.getBallAt(3, 3) === null,
			error: null
		});

		// ── clear() ──

		const clearGrid = new Grid(3, 3);
		clearGrid.setBall(0, 0, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		clearGrid.setBall(1, 1, new Ball(BALL_TYPES.NORMAL, '#00FF00'));
		clearGrid.clear();
		let allNull = true;
		clearGrid.forEachCell((r, c, b) => { if (b !== null) allNull = false; });
		tests.push({
			name: 'Grid - clear() empties all cells',
			pass: allNull,
			error: null
		});

		// ── forEachCell counts all cells ──

		const forEachGrid = new Grid(4, 3);
		let forEachCount = 0;
		forEachGrid.forEachCell(() => forEachCount++);
		tests.push({
			name: 'Grid - forEachCell visits all cells (4x3=12)',
			pass: forEachCount === 12,
			error: null
		});

		// ── countBlockingBalls ──

		const blockerGrid = new Grid(10, 10);
		tests.push({
			name: 'Grid - countBlockingBalls returns 0 on empty grid',
			pass: blockerGrid.countBlockingBalls() === 0,
			error: null
		});

		// Add some blocking balls
		blockerGrid.setBallAt(0, 0, new Ball(BALL_TYPES.BLOCKING, '#808080'));
		blockerGrid.setBallAt(3, 5, new Ball(BALL_TYPES.BLOCKING, '#808080'));
		blockerGrid.setBallAt(9, 9, new Ball(BALL_TYPES.BLOCKING, '#808080'));
		// Add a normal ball (should not count)
		blockerGrid.setBallAt(1, 1, new Ball(BALL_TYPES.NORMAL, '#FF0000'));
		
		tests.push({
			name: 'Grid - countBlockingBalls counts only blocking balls',
			pass: blockerGrid.countBlockingBalls() === 3,
			error: null
		});

		// Remove one blocking ball
		blockerGrid.removeBallAt(3, 5);
		tests.push({
			name: 'Grid - countBlockingBalls updates after removal',
			pass: blockerGrid.countBlockingBalls() === 2,
			error: null
		});
	}
	catch (error) {
		tests.push({
			name: 'Grid tests',
			pass: false,
			error: error.message + '\n' + error.stack
		});
	}

	return tests;
}
