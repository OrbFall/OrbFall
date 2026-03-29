/**
 * Grid.js
 * 
 * Description: Game board state management with collision detection and matching
 * 
 * Dependencies: Ball, Constants, Helpers
 * 
 * Exports: Grid class
 */

/**
 * ============================================================================
 * Grid.js - Orb•Fall: ChromaCrush
 * ============================================================================
 * Copyright (c) 2025 G. Scott Tomlin. All Rights Reserved.
 * ============================================================================
 */

import Ball from './Ball.js';
import { CONSTANTS } from '../utils/Constants.js';
import { isInBounds } from '../utils/Helpers.js';
import { iterateShapeCells } from '../utils/Helpers.js';

/**
 * Grid class managing the game board state
 */
class Grid {
	
	/**
	 * Create a new grid
	 * @param {Number} rows - Number of rows (default: 25)
	 * @param {Number} cols - Number of columns (default: 15)
	 */
	constructor(rows = CONSTANTS.GRID_ROWS, cols = CONSTANTS.GRID_COLS) {
		this.rows = rows;
		this.cols = cols;
		
		// Initialize empty grid
		this.grid = [];
		for (let row = 0; row < rows; row++) {
			const gridRow = [];
			for (let col = 0; col < cols; col++) {
				gridRow.push(null);
			}
			this.grid.push(gridRow);
		}
	}
	
	/**
	 * Iterate over all cells in the grid
	 * @param {Function} callback - Function called for each cell: (row, col, ball) => void
	 * @returns {void}
	 */
	forEachCell(callback) {
		for (let row = 0; row < this.rows; row++) {
			for (let col = 0; col < this.cols; col++) {
				callback(row, col, this.grid[row][col]);
			}
		}
	}
	
	/**
	 * Generator that yields all cells in the grid
	 * @yields {{row: number, col: number, ball: Ball|null}}
	 */
	*iterateCells() {
		for (let row = 0; row < this.rows; row++) {
			for (let col = 0; col < this.cols; col++) {
				yield { row, col, ball: this.grid[row][col] };
			}
		}
	}
	
	/**
	 * Map over all cells and return a new array
	 * @param {Function} callback - Function called for each cell: (row, col, ball) => any
	 * @returns {Array} Array of mapped values
	 */
	mapCells(callback) {
		const results = [];
		for (let row = 0; row < this.rows; row++) {
			for (let col = 0; col < this.cols; col++) {
				results.push(callback(row, col, this.grid[row][col]));
			}
		}
		return results;
	}
	
	/**
	 * Filter cells based on a predicate
	 * @param {Function} predicate - Function that returns true for cells to include
	 * @returns {Array<{row: number, col: number, ball: Ball|null}>} Filtered cells
	 */
	filterCells(predicate) {
		const results = [];
		for (let row = 0; row < this.rows; row++) {
			for (let col = 0; col < this.cols; col++) {
				const ball = this.grid[row][col];
				if (predicate(row, col, ball)) {
					results.push({ row, col, ball });
				}
			}
		}
		return results;
	}
	
	/**
	 * Get the highest (lowest row number) row containing a ball
	 * @returns {Number} Row index of highest ball, or -1 if grid is empty
	 */
	getHighestBallRow() {
		for (let row = 0; row < this.rows; row++) {
			for (let col = 0; col < this.cols; col++) {
				if (this.grid[row][col] !== null) {
					return row;
				}
			}
		}
		return -1; // Grid is empty
	}
	
	/**
	 * Count the number of blocking balls on the grid
	 * @returns {Number} Count of blocking balls
	 */
	countBlockingBalls() {
		let count = 0;
		for (let row = 0; row < this.rows; row++) {
			for (let col = 0; col < this.cols; col++) {
				const ball = this.grid[row][col];
				if (ball && ball.getType() === CONSTANTS.BALL_TYPES.BLOCKING) {
					count++;
				}
			}
		}
		return count;
	}
	
	/**
	 * Check if piece can be placed at given position without collision
	 * @param {Piece} piece - Piece to check
	 * @param {Number} [x] - Column position (defaults to piece.position.x)
	 * @param {Number} [y] - Row position (defaults to piece.position.y)
	 * @returns {Boolean} True if position is valid, false otherwise
	 */
	isValidPosition(piece, x, y) {
		// Use piece position if x,y not provided
		if (x === undefined || y === undefined) {
			const pos = piece.getPosition();
			x = pos.x;
			y = pos.y;
		}
		
		const shape = piece.getShape();
		let isValid = true;
		
		// Check each occupied cell in piece
		iterateShapeCells(shape, (row, col) => {
			const gridRow = y + row;
			const gridCol = x + col;
			
			const isInGridBounds = isInBounds(gridRow, gridCol, this.rows, this.cols);
			
			// Position is invalid if out of bounds
			if (!isInGridBounds) {
				isValid = false;
				return;
			}
			else {
				// In bounds, check for collision
			}
			
			const cellOccupied = this.grid[gridRow][gridCol] !== null;
			
			// Position is invalid if cell is occupied
			if (cellOccupied) {
				isValid = false;
				return;
			}
			else {
				// Cell is free
			}
		});
		
		return isValid;
	}
	
	/**
	 * Place piece balls into grid at specified position
	 * @param {Piece} piece - Piece to place
	 * @param {Number} [x] - Column position (defaults to piece.position.x)
	 * @param {Number} [y] - Row position (defaults to piece.position.y)
	 * @returns {void}
	 */
	placePiece(piece, x, y) {
		// Use piece position if x,y not provided
		if (x === undefined || y === undefined) {
			const pos = piece.getPosition();
			x = pos.x;
			y = pos.y;
		}
		
		const shape = piece.getShape();
		const balls = piece.getBalls();
		let ballIndex = 0;
		
		// Place each ball from piece into grid
		iterateShapeCells(shape, (row, col) => {
			const gridRow = y + row;
			const gridCol = x + col;
			const isInGridBounds = isInBounds(gridRow, gridCol, this.rows, this.cols);
			
			// Place ball if in bounds
			if (isInGridBounds) {
				this.grid[gridRow][gridCol] = balls[ballIndex];
				ballIndex++;
			}
			else {
				console.warn('Grid: Attempted to place ball out of bounds', gridRow, gridCol);
				ballIndex++;
			}
		});
	}
	
	/**
	 * Get ball at specified grid position
	 * @param {Number} row - Row index
	 * @param {Number} col - Column index
	 * @returns {Ball|null} Ball object or null if empty
	 */
	getBall(row, col) {
		const isInGridBounds = isInBounds(row, col, this.rows, this.cols);
		
		// Return ball if in bounds
		if (isInGridBounds) {
			return this.grid[row][col];
		}
		else {
			return null;
		}
	}
	
	/**
	 * Set ball at specified grid position
	 * @param {Number} row - Row index
	 * @param {Number} col - Column index
	 * @param {Ball|null} ball - Ball to place or null to clear
	 * @returns {void}
	 */
	setBall(row, col, ball) {
		const isInGridBounds = isInBounds(row, col, this.rows, this.cols);
		
		// Set ball if in bounds
		if (isInGridBounds) {
			this.grid[row][col] = ball;
		}
		else {
			console.warn('Grid: Attempted to set ball out of bounds', row, col);
		}
	}
	
	/**
	 * Remove ball from specified grid position
	 * @param {Number} row - Row index
	 * @param {Number} col - Column index
	 * @returns {void}
	 */
	removeBall(row, col) {
		this.setBall(row, col, null);
	}
	
	/**
	 * Alias for getBall - get ball at position (row, col)
	 * @param {Number} row - Row index
	 * @param {Number} col - Column index
	 * @returns {Ball|null} Ball object or null if empty
	 */
	getBallAt(row, col) {
		return this.getBall(row, col);
	}
	
	/**
	 * Alias for setBall - set ball at position (row, col)
	 * @param {Number} row - Row index
	 * @param {Number} col - Column index
	 * @param {Ball|null} ball - Ball to place or null to clear
	 * @returns {void}
	 */
	setBallAt(row, col, ball) {
		this.setBall(row, col, ball);
	}
	
	/**
	 * Alias for removeBall - remove ball at position (row, col)
	 * @param {Number} row - Row index
	 * @param {Number} col - Column index
	 * @returns {void}
	 */
	removeBallAt(row, col) {
		this.removeBall(row, col);
	}
	
	/**
	 * Find all color matches in the grid (3+ in a row)
	 * @returns {Array<Object>} Array of match objects
	 */
	findMatches() {
		const matches = [];
		
		// Find horizontal matches
		const horizontalMatches = this._findHorizontalMatches();
		matches.push(...horizontalMatches);
		
		// Find vertical matches
		const verticalMatches = this._findVerticalMatches();
		matches.push(...verticalMatches);
		
		// Find diagonal matches (all 4 directions)
		const diagonalMatches = this._findDiagonalMatches();
		matches.push(...diagonalMatches);
		
		return matches;
	}
	
	/**
	 * Generic match finding helper
	 * @param {Function} cellIterator - Generator function that yields {row, col}
	 * @param {string} matchType - Type of match (horizontal/vertical/diagonal)
	 * @param {string} direction - Direction name
	 * @returns {Array<Object>} Array of match objects
	 * @private
	 */
	_findMatchesInLine(cellIterator, matchType, direction) {
		const matches = [];
		let currentColor = null;
		let matchPositions = [];
		
		for (const pos of cellIterator) {
			const ball = this.grid[pos.row]?.[pos.col];
			const ballColor = ball?.isMatchable() ? ball.getColor() : null;
			
			if (ballColor && ballColor === currentColor) {
				matchPositions.push(pos);
			} else {
				// Save match if it meets minimum length
				if (matchPositions.length >= CONSTANTS.MIN_MATCH_LENGTH) {
					matches.push({
						type: matchType,
						color: currentColor,
						positions: [...matchPositions],
						direction: direction
					});
				}
				
				// Start new potential match
				currentColor = ballColor;
				matchPositions = ballColor ? [pos] : [];
			}
		}
		
		// Check final match
		if (matchPositions.length >= CONSTANTS.MIN_MATCH_LENGTH) {
			matches.push({
				type: matchType,
				color: currentColor,
				positions: [...matchPositions],
				direction: direction
			});
		}
		
		return matches;
	}
	
	/**
	 * Find horizontal matches
	 * @returns {Array<Object>} Array of horizontal match objects
	 * @private
	 */
	_findHorizontalMatches() {
		const matches = [];
		
		for (let row = 0; row < this.rows; row++) {
			const cellIterator = (function*() {
				for (let col = 0; col < this.cols; col++) {
					yield { row, col };
				}
			}).call(this);
			
			matches.push(...this._findMatchesInLine(
				cellIterator,
				CONSTANTS.MATCH_DIRECTIONS.HORIZONTAL,
				'horizontal'
			));
		}
		
		return matches;
	}
	
	/**
	 * Find vertical matches
	 * @returns {Array<Object>} Array of vertical match objects
	 * @private
	 */
	_findVerticalMatches() {
		const matches = [];
		
		for (let col = 0; col < this.cols; col++) {
			const cellIterator = (function*() {
				for (let row = 0; row < this.rows; row++) {
					yield { row, col };
				}
			}).call(this);
			
			matches.push(...this._findMatchesInLine(
				cellIterator,
				CONSTANTS.MATCH_DIRECTIONS.VERTICAL,
				'vertical'
			));
		}
		
		return matches;
	}
	
	/**
	 * Find diagonal matches (all 4 directions)
	 * @returns {Array<Object>} Array of diagonal match objects
	 * @private
	 */
	_findDiagonalMatches() {
		const matches = [];
		
		// Down-right diagonals (↘)
		for (let startRow = 0; startRow < this.rows; startRow++) {
			for (let startCol = 0; startCol < this.cols; startCol++) {
				const cellIterator = (function*() {
					let row = startRow;
					let col = startCol;
					while (row < this.rows && col < this.cols) {
						yield { row, col };
						row++;
						col++;
					}
				}).call(this);
				
				matches.push(...this._findMatchesInLine(
					cellIterator,
					CONSTANTS.MATCH_DIRECTIONS.DIAGONAL,
					'diagonal'
				));
			}
		}
		
		// Down-left diagonals (↙)
		for (let startRow = 0; startRow < this.rows; startRow++) {
			for (let startCol = this.cols - 1; startCol >= 0; startCol--) {
				const cellIterator = (function*() {
					let row = startRow;
					let col = startCol;
					while (row < this.rows && col >= 0) {
						yield { row, col };
						row++;
						col--;
					}
				}).call(this);
				
				matches.push(...this._findMatchesInLine(
					cellIterator,
					CONSTANTS.MATCH_DIRECTIONS.DIAGONAL,
					'diagonal'
				));
			}
		}
		
		return matches;
	}
	
	/**
	 * Perform a single gravity pass - find anchored balls and drop floating ones by one row.
	 * @returns {Boolean} True if any balls moved this pass
	 */
	applyGravityStep() {
		let ballsMoved = false;
		
		// Step 1: Find all balls connected to the bottom (anchored balls)
		const anchored = new Set();
		
		// Start flood fill from bottom row
		const queue = [];
		for (let col = 0; col < this.cols; col++) {
			if (this.grid[this.rows - 1][col] !== null) {
				queue.push({ row: this.rows - 1, col });
				anchored.add(`${this.rows - 1},${col}`);
			}
		}
		
		// Flood fill to find all connected balls (orthogonal only)
		while (queue.length > 0) {
			const { row, col } = queue.shift();
			
			// Check 4 orthogonal directions (horizontal, vertical)
			const directions = [
				[-1, 0],  // up
				[1, 0],   // down
				[0, -1],  // left
				[0, 1]    // right
			];
			
			for (const [dr, dc] of directions) {
				const newRow = row + dr;
				const newCol = col + dc;
				const key = `${newRow},${newCol}`;
				
				if (newRow >= 0 && newRow < this.rows && newCol >= 0 && newCol < this.cols) {
					if (this.grid[newRow][newCol] !== null && !anchored.has(key)) {
						anchored.add(key);
						queue.push({ row: newRow, col: newCol });
					}
				}
			}
		}
		
		// Step 2: Drop all floating (unanchored) balls one row down
		// Scan from bottom to top to avoid moving same ball twice
		for (let row = this.rows - 2; row >= 0; row--) {
			for (let col = 0; col < this.cols; col++) {
				const key = `${row},${col}`;
				const ball = this.grid[row][col];
				
				// If there's a ball and it's not anchored and space below is empty
				if (ball !== null && !anchored.has(key) && this.grid[row + 1][col] === null) {
					// Move it down one row
					this.grid[row + 1][col] = ball;
					this.grid[row][col] = null;
					ballsMoved = true;
				}
			}
		}
		
		return ballsMoved;
	}

	/**
	 * Apply gravity - repeatedly drop floating balls until the grid is stable
	 * @param {Array<{row: Number, col: Number}>} removedPositions - Optional (unused, kept for API compat)
	 * @returns {Boolean} True if any balls moved, false if grid is stable
	 */
	applyGravity(removedPositions = null) {
		let anyMoved = false;
		let iterations = 0;
		const maxIterations = 50;
		
		while (iterations < maxIterations) {
			iterations++;
			if (!this.applyGravityStep()) break;
			anyMoved = true;
		}
		
		if (iterations >= maxIterations) {
			console.warn('applyGravity: Max iterations reached');
		}
		
		return anyMoved;
	}
	
	/**
	 * Check if specified column has reached the top row
	 * @param {Number} col - Column index
	 * @returns {Boolean} True if column is full, false otherwise
	 */
	isColumnFull(col) {
		const isInGridBounds = col >= 0 && col < this.cols;
		
		// Check top row
		if (isInGridBounds) {
			const topCell = this.grid[0][col];
			return topCell !== null;
		}
		else {
			return false;
		}
	}
	
	/**
	 * Check if any column has reached the top
	 * @returns {Boolean} True if any column is full
	 */
	isAnyColumnFull() {
		for (let col = 0; col < this.cols; col++) {
			const columnFull = this.isColumnFull(col);
			
			// Return true if any column full
			if (columnFull) {
				return true;
			}
			else {
				// Column not full, continue checking
			}
		}
		
		return false;
	}
	
	/**
	 * Clear entire grid
	 * @returns {void}
	 */
	clear() {
		for (let row = 0; row < this.rows; row++) {
			for (let col = 0; col < this.cols; col++) {
				this.grid[row][col] = null;
			}
		}
	}
	
	/**
	 * Get the raw grid array
	 * @returns {Array<Array<Ball|null>>} 2D grid array
	 */
	getGrid() {
		return this.grid;
	}
	
	/**
	 * Process exploding balls in matches and clear 7×7 areas
	 * @param {Array<Object>} matches - Array of match objects
	 * @returns {Array<Object>} Positions cleared by explosions with {row, col}
	 */
	processExplosions(matches) {
		const explodedPositions = [];
		const positionsToExplode = new Set();
		
		// Find all exploding balls in matches
		for (const match of matches) {
			for (const pos of match.positions) {
				const ball = this.getBallAt(pos.row, pos.col);
				if (ball && ball.isExploding()) {
					// Mark this position for explosion
					positionsToExplode.add(`${pos.row},${pos.col}`);
				}
			}
		}
		
		// Process each explosion
		for (const posStr of positionsToExplode) {
			const [row, col] = posStr.split(',').map(Number);
			
			// Clear 7×7 area centered on explosion
			const radius = 3; // 7×7 = 3 cells in each direction from center
			
			for (let r = row - radius; r <= row + radius; r++) {
				for (let c = col - radius; c <= col + radius; c++) {
					// Check bounds
					if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
						const ball = this.getBallAt(r, c);
						
						// Clear all balls (including blocking balls in explosion radius)
						// Special balls destroyed by explosions do NOT trigger their effects
						if (ball) {
							explodedPositions.push({ row: r, col: c, ball: ball }); // Include ball object for statistics
							this.removeBallAt(r, c);
						}
					}
				}
			}
		}
		
		return explodedPositions;
	}
	
	/**
	 * Process painting balls in matches and paint entire lines
	 * @param {Array<Object>} matches - Array of match objects
	 * @returns {Array<Object>} Positions painted with {row, col, oldColor, newColor}
	 */
	processPainters(matches) {
		const paintedPositions = [];
		const processedPainters = []; // Track which painters we process
		const allPositionsChecked = []; // Track ALL positions checked
		
		console.log(`[processPainters] Called with ${matches.length} matches`);
		matches.forEach((m, i) => {
			console.log(`  [processPainters] Match ${i}: ${m.direction}, ${m.positions.length} positions: ${m.positions.map(p => `(${p.row},${p.col})`).join(',')}`);
		});
		
		// Find all painter balls in matches (painters trigger effects when matched)
		for (const match of matches) {
			for (const pos of match.positions) {
				const ball = this.getBallAt(pos.row, pos.col);
				allPositionsChecked.push(`(${pos.row},${pos.col}):${ball ? (ball.isPainter() ? ball.getPainterDirection() : 'normal') : 'null'}`);
				
				if (ball && ball.isPainter()) {
					const painterColor = ball.getColor();
					const painterDirection = ball.getPainterDirection();
					
					processedPainters.push(`(${pos.row},${pos.col}):${painterDirection},color=${painterColor}`);
					console.log(`[processPainters] Processing ${painterDirection} painter at (${pos.row},${pos.col}), color=${painterColor}`);
					
					// Paint the appropriate line based on painter type
					if (painterDirection === 'horizontal') {
						// Paint entire row
						const debugOutput = [];
						debugOutput.push(`Painting row ${pos.row} with color ${painterColor}, cols=${this.cols}`);
						for (let c = 0; c < this.cols; c++) {
							const targetBall = this.getBallAt(pos.row, c);
							debugOutput.push(`col ${c}: ball=${targetBall ? 'YES' : 'NO'}, type=${targetBall?.getType()}`);
							if (targetBall && targetBall.getType() !== CONSTANTS.BALL_TYPES.BLOCKING) {
								const oldColor = targetBall.getColor();
								targetBall.setColor(painterColor);
								debugOutput.push(`  PAINTED (${pos.row},${c}): ${oldColor} → ${painterColor}`);
								paintedPositions.push({
									row: pos.row,
									col: c,
									oldColor,
									newColor: painterColor,
									_debug: debugOutput.join('\n') // Add debug info to first painted position
								});
							}
						}
						const paintedCount = paintedPositions.filter(p => p.row === pos.row).length;
						debugOutput.push(`Finished: painted ${paintedCount} positions in row ${pos.row}`);
						
						// Always log debug for horizontal painters
						console.log(`[H-Painter Debug]\n${debugOutput.join('\n')}`);
					}
					else if (painterDirection === 'vertical') {
						// Paint entire column
						for (let r = 0; r < this.rows; r++) {
							const targetBall = this.getBallAt(r, pos.col);
							if (targetBall && targetBall.getType() !== CONSTANTS.BALL_TYPES.BLOCKING) {
								const oldColor = targetBall.getColor();
								targetBall.setColor(painterColor);
								paintedPositions.push({
									row: r,
									col: pos.col,
									oldColor,
									newColor: painterColor
								});
							}
						}
					}
					else if (painterDirection === 'diagonal-ne') {
						// Paint NE-SW diagonal (↗↙)
						for (let offset = -Math.max(this.rows, this.cols); offset < Math.max(this.rows, this.cols); offset++) {
							const r = pos.row + offset;
							const c = pos.col - offset;
							if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
								const targetBall = this.getBallAt(r, c);
								if (targetBall && targetBall.getType() !== CONSTANTS.BALL_TYPES.BLOCKING) {
									const oldColor = targetBall.getColor();
									targetBall.setColor(painterColor);
									paintedPositions.push({
										row: r,
										col: c,
										oldColor,
										newColor: painterColor
									});
								}
							}
						}
					}
					else if (painterDirection === 'diagonal-nw') {
						// Paint NW-SE diagonal (↖↘)
						for (let offset = -Math.max(this.rows, this.cols); offset < Math.max(this.rows, this.cols); offset++) {
							const r = pos.row + offset;
							const c = pos.col + offset;
							if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
								const targetBall = this.getBallAt(r, c);
								if (targetBall && targetBall.getType() !== CONSTANTS.BALL_TYPES.BLOCKING) {
									const oldColor = targetBall.getColor();
									targetBall.setColor(painterColor);
									paintedPositions.push({
										row: r,
										col: c,
										oldColor,
										newColor: painterColor
									});
								}
							}
						}
					}
				}
			}
		}
		
		// Add processed painters info to first painted position for debugging
		if (paintedPositions.length > 0) {
			paintedPositions[0]._processedPainters = processedPainters.join(', ');
			paintedPositions[0]._allPositionsChecked = allPositionsChecked.join(', ');
		}
		
		return paintedPositions;
	}
	
}

export default Grid;
