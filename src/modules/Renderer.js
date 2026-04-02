/**
 * Renderer.js
 * 
 * Description: Visual rendering of game state using Canvas API
 * 
 * Dependencies: ConfigManager, Constants
 * 
 * Exports: Renderer class
 */

import { ConfigManager } from './ConfigManager.js';
import { CONSTANTS } from '../utils/Constants.js';
import { iterateShapeCells } from '../utils/Helpers.js';
import AnimationManager from './AnimationManager.js';

/**
 * Renderer class for drawing game elements to canvas
 */
class Renderer {
	
	/**
	 * Create a new renderer
	 * @param {HTMLCanvasElement} canvasElement - Main game canvas
	 */
	constructor(canvasElement) {
		this.canvas = canvasElement;
		this.ctx = canvasElement.getContext('2d');
		this.cellSize = 0;
		this.offsetX = 0;
		this.offsetY = 0;
	}
	
	/**
	 * Initialize renderer with configuration
	 * @returns {void}
	 */
	initialize() {
		const gridRows = ConfigManager.get('game.gridRows', CONSTANTS.GRID_ROWS);
		const gridCols = ConfigManager.get('game.gridCols', CONSTANTS.GRID_COLS);
		const ballRadius = ConfigManager.get('rendering.ballRadius', 20);
		
		// Calculate cell size and canvas dimensions
		this.cellSize = ballRadius * 2;
		const canvasWidth = gridCols * this.cellSize;
		const canvasHeight = gridRows * this.cellSize;
		
		// Set canvas size
		this.canvas.width = canvasWidth;
		this.canvas.height = canvasHeight;
		
		// Center offset for balls within cells
		this.offsetX = this.cellSize / 2;
		this.offsetY = this.cellSize / 2;
	}
	
	/**
	 * Clear the entire canvas
	 * @returns {void}
	 */
	clear() {
		const bgColor = ConfigManager.get('colors.ui.background', '#0f0f1e');
		
		this.ctx.fillStyle = bgColor;
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
	}
	
	/**
	 * Render the grid with all locked balls
	 * @param {Grid} grid - Grid object to render
	 * @returns {void}
	 */
	renderGrid(grid) {
		const gridData = grid.getGrid();
		const gridLineColor = ConfigManager.get('colors.ui.gridLines', '#444444');
		const gridLineWidth = ConfigManager.get('rendering.gridLineWidth', 1);
		
		// Draw grid lines
		this.ctx.strokeStyle = gridLineColor;
		this.ctx.lineWidth = gridLineWidth;
		
		// Vertical lines
		for (let col = 0; col <= grid.cols; col++) {
			const x = col * this.cellSize;
			this.ctx.beginPath();
			this.ctx.moveTo(x, 0);
			this.ctx.lineTo(x, this.canvas.height);
			this.ctx.stroke();
		}
		
		// Horizontal lines
		for (let row = 0; row <= grid.rows; row++) {
			const y = row * this.cellSize;
			this.ctx.beginPath();
			this.ctx.moveTo(0, y);
			this.ctx.lineTo(this.canvas.width, y);
			this.ctx.stroke();
		}
		
		// Draw all balls
		for (let row = 0; row < grid.rows; row++) {
			for (let col = 0; col < grid.cols; col++) {
				const ball = gridData[row][col];
				const hasBall = ball !== null;
				
				// Draw ball if present
				if (hasBall) {
					this._drawBall(ball, col, row);
				}
				else {
					// Empty cell, skip
				}
			}
		}
	}
	
	/**
	 * Render a falling piece at specified position
	 * @param {Piece} piece - Piece to render
	 * @param {Number} x - Column position
	 * @param {Number} y - Row position
	 * @returns {void}
	 */
	renderPiece(piece, x, y) {
		const shape = piece.getShape();
		const balls = piece.getBalls();
		let ballIndex = 0;
		
		// Draw each ball in piece
		iterateShapeCells(shape, (row, col) => {
			const gridCol = x + col;
			const gridRow = y + row;
			const ball = balls[ballIndex];
			
			this._drawBall(ball, gridCol, gridRow);
			ballIndex++;
		});
	}
	
	/**
	 * Render ghost piece (outline showing where piece will land)
	 * @param {Piece} piece - Piece to render as ghost
	 * @param {Number} x - Column position
	 * @param {Number} y - Row position
	 * @returns {void}
	 */
	renderGhostPiece(piece, x, y) {
		const shape = piece.getShape();
		const ballRadius = ConfigManager.get('rendering.ballRadius', 20);
		
		// Draw each ball position as outline
		iterateShapeCells(shape, (row, col) => {
			const gridCol = x + col;
			const gridRow = y + row;
			const centerX = gridCol * this.cellSize + this.offsetX;
			const centerY = gridRow * this.cellSize + this.offsetY;
			
			// Draw semi-transparent outline for ghost piece visibility
			this.ctx.save();
			this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; // 30% opacity white outline
			this.ctx.lineWidth = 2; // 2-pixel outline
			this.ctx.beginPath();
			this.ctx.arc(centerX, centerY, ballRadius * 0.9, 0, Math.PI * 2); // 0 to 2π = full circle, 90% of normal size
			this.ctx.stroke();
			this.ctx.restore();
		});
	}
	
	/**
	 * Render next piece preview
	 * @param {Piece} piece - Piece to preview
	 * @param {HTMLCanvasElement} previewCanvas - Preview canvas element
	 * @returns {void}
	 */
	renderNextPiece(piece, previewCanvas) {
		const previewCtx = previewCanvas.getContext('2d');
		const shape = piece.getShape();
		const balls = piece.getBalls();
		
		// Use fixed cell size of 24px for preview orbs
		const previewCellSize = 24;
		const pieceWidth = shape[0].length;
		const pieceHeight = shape.length;
		
		// Clear preview canvas
		const bgColor = ConfigManager.get('colors.ui.background', '#0f0f1e');
		previewCtx.fillStyle = bgColor;
		previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
		
		// Center piece in preview without scaling
		const offsetX = (previewCanvas.width - pieceWidth * previewCellSize) / 2;
		const offsetY = (previewCanvas.height - pieceHeight * previewCellSize) / 2;
		
		let ballIndex = 0;
		
		// Draw each ball in piece
		iterateShapeCells(shape, (row, col) => {
			const x = offsetX + col * previewCellSize + previewCellSize / 2;
			const y = offsetY + row * previewCellSize + previewCellSize / 2;
			const ball = balls[ballIndex];
			const radius = previewCellSize / 2 * 0.8; // 80% of cell size for preview display
			
			this._drawBallAt(ball, x, y, radius, previewCtx);
			ballIndex++;
		});
	}
	
	/**
	 * Render next piece on the main board at the spawn position, 50% transparent
	 * @param {Piece} piece - Next piece to preview
	 * @param {Number} gridCols - Total grid columns
	 * @returns {void}
	 */
	renderNextPieceOnBoard(piece, gridCols) {
		const shape = piece.getShape();
		const balls = piece.getBalls();
		const spawnX = Math.floor(gridCols / 2) - Math.floor(piece.getWidth() / 2);
		
		this.ctx.save();
		this.ctx.globalAlpha = 0.15;
		
		let ballIndex = 0;
		iterateShapeCells(shape, (row, col) => {
			const ball = balls[ballIndex];
			this._drawBall(ball, spawnX + col, row);
			ballIndex++;
		});
		
		this.ctx.restore();
	}
	
	/**
	 * Draw a ball at grid position
	 * @param {Ball} ball - Ball to draw
	 * @param {Number} col - Column position
	 * @param {Number} row - Row position
	 * @returns {void}
	 * @private
	 */
	_drawBall(ball, col, row) {
		const x = col * this.cellSize + this.offsetX;
		const y = row * this.cellSize + this.offsetY;
		const radius = this.cellSize / 2 * 0.85; // 85% of cell size to leave small gap between balls
		
		this._drawBallAt(ball, x, y, radius, this.ctx);
	}
	
	/**
	 * Draw a ball at specific pixel coordinates
	 * @param {Ball} ball - Ball to draw
	 * @param {Number} x - X coordinate
	 * @param {Number} y - Y coordinate
	 * @param {Number} radius - Ball radius
	 * @param {CanvasRenderingContext2D} ctx - Canvas context
	 * @returns {void}
	 * @private
	 */
	_drawBallAt(ball, x, y, radius, ctx) {
		const color = ball.getColor();
		const ballType = ball.getType();
		const glowEffect = ConfigManager.get('rendering.glowEffect', true);
		const shadowBlur = ConfigManager.get('rendering.shadowBlur', 5);
		
		// Draw ball shadow/glow
		if (glowEffect) {
			ctx.shadowBlur = shadowBlur;
			ctx.shadowColor = color;
		}
		else {
			ctx.shadowBlur = 0;
		}
		
		// Draw ball circle
		ctx.fillStyle = color;
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI * 2);
		ctx.fill();
		
		// Reset shadow
		ctx.shadowBlur = 0;
		
		// Draw special ball indicators
		this._drawSpecialIndicator(ball, x, y, radius, ctx);
	}
	
	/**
	 * Draw special ball type indicators
	 * @param {Ball} ball - Ball to check
	 * @param {Number} x - X coordinate
	 * @param {Number} y - Y coordinate
	 * @param {Number} radius - Ball radius
	 * @param {CanvasRenderingContext2D} ctx - Canvas context
	 * @returns {void}
	 * @private
	 */
	_drawSpecialIndicator(ball, x, y, radius, ctx) {
		const ballType = ball.getType();
		const isExploding = ballType === CONSTANTS.BALL_TYPES.EXPLODING;
		const isPainterH = ballType === CONSTANTS.BALL_TYPES.PAINTER_HORIZONTAL;
		const isPainterV = ballType === CONSTANTS.BALL_TYPES.PAINTER_VERTICAL;
		const isPainterDNE = ballType === CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NE;
		const isPainterDNW = ballType === CONSTANTS.BALL_TYPES.PAINTER_DIAGONAL_NW;
		const isBlocking = ballType === CONSTANTS.BALL_TYPES.BLOCKING;
		
		ctx.strokeStyle = '#FFFFFF'; // White indicators for visibility on all ball colors
		ctx.lineWidth = 2; // 2-pixel lines for clear visibility
		
		// Draw exploding indicator (star burst)
		if (isExploding) {
			this._drawStar(x, y, radius * 0.6, ctx); // Star at 60% of ball radius
		}
		else if (isPainterH) {
			// Horizontal line indicator (←→)
			ctx.beginPath();
			ctx.moveTo(x - radius * 0.6, y); // 60% of radius left
			ctx.lineTo(x + radius * 0.6, y); // 60% of radius right
			ctx.stroke();
		}
		else if (isPainterV) {
			// Vertical line indicator (↑↓)
			ctx.beginPath();
			ctx.moveTo(x, y - radius * 0.6); // 60% of radius up
			ctx.lineTo(x, y + radius * 0.6); // 60% of radius down
			ctx.stroke();
		}
		else if (isPainterDNE) {
			// NE-SW diagonal line (↗↙)
			ctx.beginPath();
			ctx.moveTo(x + radius * 0.5, y - radius * 0.5); // Top-right
			ctx.lineTo(x - radius * 0.5, y + radius * 0.5); // Bottom-left
			ctx.stroke();
		}
		else if (isPainterDNW) {
			// NW-SE diagonal line (↖↘)
			ctx.beginPath();
			ctx.moveTo(x - radius * 0.5, y - radius * 0.5); // Top-left
			ctx.lineTo(x + radius * 0.5, y + radius * 0.5); // Bottom-right
			ctx.stroke();
		}
		else if (isBlocking) {
			// X mark
			ctx.beginPath();
			ctx.moveTo(x - radius * 0.5, y - radius * 0.5);
			ctx.lineTo(x + radius * 0.5, y + radius * 0.5);
			ctx.moveTo(x + radius * 0.5, y - radius * 0.5);
			ctx.lineTo(x - radius * 0.5, y + radius * 0.5);
			ctx.stroke();
		}
		else {
			// Normal ball, no indicator
		}
	}
	
	/**
	 * Draw a star shape
	 * @param {Number} x - Center X
	 * @param {Number} y - Center Y
	 * @param {Number} radius - Star radius
	 * @param {CanvasRenderingContext2D} ctx - Canvas context
	 * @returns {void}
	 * @private
	 */
	_drawStar(x, y, radius, ctx) {
		const spikes = 8;
		const step = Math.PI / spikes;
		
		ctx.beginPath();
		
		for (let i = 0; i < spikes * 2; i++) {
			const r = i % 2 === 0 ? radius : radius * 0.5;
			const angle = i * step - Math.PI / 2;
			const px = x + Math.cos(angle) * r;
			const py = y + Math.sin(angle) * r;
			
			if (i === 0) {
				ctx.moveTo(px, py);
			} else {
				ctx.lineTo(px, py);
			}
	}
	
	ctx.closePath();
	ctx.stroke();
}

	/**
	 * Render match highlight paths
	 * @param {Array<Object>} highlights - Match highlight data
	 * @returns {void}
	 */
	renderMatchHighlights(highlights) {
		if (!highlights || highlights.length === 0) {
			return;
		}
		
		const now = performance.now();
		
		for (const highlight of highlights) {
			const age = now - highlight.createdAt;
			if (age < 0 || age > highlight.duration) {
				continue;
			}
			
			const progress = age / highlight.duration;
			const alpha = 1 - progress;
			const color = highlight.color || '#FFFFFF';
			const positions = highlight.positions || [];
			if (positions.length === 0) {
				continue;
			}
			
			this.ctx.save();
			this.ctx.strokeStyle = this._toRgba(color, alpha);
			this.ctx.lineWidth = 2;
			
			this.ctx.beginPath();
			positions.forEach((pos, index) => {
				const x = pos.col * this.cellSize + this.offsetX;
				const y = pos.row * this.cellSize + this.offsetY;
				if (index === 0) {
					this.ctx.moveTo(x, y);
				} else {
					this.ctx.lineTo(x, y);
				}
			});
			this.ctx.stroke();
			
			// Highlight origin cell on cascade chains
			if (highlight.cascadeLevel > 1) {
				const origin = positions[0];
				const x = origin.col * this.cellSize + this.offsetX;
				const y = origin.row * this.cellSize + this.offsetY;
				const radius = this.cellSize * 0.45;
				this.ctx.lineWidth = 3;
				this.ctx.beginPath();
				this.ctx.arc(x, y, radius, 0, Math.PI * 2);
				this.ctx.stroke();
			}
			
			this.ctx.restore();
		}
	}
	
	/**
	 * Convert a hex color to rgba with alpha
	 * @param {String} color - Hex color (e.g., "#FF0000")
	 * @param {Number} alpha - Alpha value (0-1)
	 * @returns {String} RGBA color string
	 * @private
	 */
	_toRgba(color, alpha) {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
		if (!result) {
			return color;
		}
		const r = parseInt(result[1], 16);
		const g = parseInt(result[2], 16);
		const b = parseInt(result[3], 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}

/**
 * Render all active animations
 * @returns {void}
 */
renderAnimations() {
	const animations = AnimationManager.getActiveAnimations();
	
	for (const anim of animations) {
		switch (anim.type) {
			case 'clearBalls':
				this._renderClearAnimation(anim);
				break;
			case 'explosion':
				this._renderExplosionAnimation(anim);
				break;
			case 'pieceDrop':
				this._renderPieceDropAnimation(anim);
				break;
			case 'levelComplete':
				this._renderLevelCompleteAnimation(anim);
				break;
		}
	}
}

/**
 * Render ball clearing animation
 * @private
 */
_renderClearAnimation(anim) {
	const alpha = 1 - anim.progress;
	const scale = 1 + (anim.progress * 0.5); // Grow by 50%
	
	this.ctx.save();
	this.ctx.globalAlpha = alpha;
	
	for (const pos of anim.positions) {
		const x = pos.col * this.cellSize + this.offsetX;
		const y = pos.row * this.cellSize + this.offsetY;
		const radius = (this.cellSize / 2 - 2) * scale;
		
		// Draw expanding, fading circle
		this.ctx.beginPath();
		this.ctx.arc(x, y, radius, 0, Math.PI * 2);
		this.ctx.fillStyle = '#ffffff';
		this.ctx.fill();
		
		// Glow effect
		this.ctx.shadowBlur = 20 * anim.progress;
		this.ctx.shadowColor = '#00ff88';
	}
	
	this.ctx.restore();
}

/**
 * Render explosion animation
 * @private
 */
_renderExplosionAnimation(anim) {
	const eased = AnimationManager.easeOutCubic(anim.progress);
	const maxRadius = anim.radius * this.cellSize;
	const currentRadius = maxRadius * eased;
	const alpha = 1 - anim.progress;
	
	const x = anim.col * this.cellSize + this.offsetX;
	const y = anim.row * this.cellSize + this.offsetY;
	
	this.ctx.save();
	this.ctx.globalAlpha = alpha;
	
	// Outer ring
	this.ctx.beginPath();
	this.ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
	this.ctx.strokeStyle = '#FFD700';
	this.ctx.lineWidth = 3;
	this.ctx.stroke();
	
	// Inner glow
	const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, currentRadius);
	gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
	gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
	this.ctx.fillStyle = gradient;
	this.ctx.fill();
	
	this.ctx.restore();
}

/**
 * Render piece drop animation
 * @private
 */
_renderPieceDropAnimation(anim) {
	const eased = AnimationManager.easeOutCubic(anim.progress);
	const currentY = anim.fromY + (anim.toY - anim.fromY) * eased;
	
	// This would render the piece at the interpolated position
	// For now, we'll handle this differently in GameEngine
}

/**
 * Render level complete celebration animation
 * @private
 */
_renderLevelCompleteAnimation(anim) {
	// Draw particles or flashes across the screen
	const numParticles = 20;
	
	this.ctx.save();
	
	for (let i = 0; i < numParticles; i++) {
		const x = (this.canvas.width / numParticles) * i;
		const offset = Math.sin(anim.progress * Math.PI * 2 + i) * 50;
		const y = this.canvas.height / 2 + offset;
		const alpha = Math.sin(anim.progress * Math.PI);
		
		this.ctx.globalAlpha = alpha;
		this.ctx.fillStyle = i % 2 === 0 ? '#00ff88' : '#00ccff';
		this.ctx.beginPath();
		this.ctx.arc(x, y, 5, 0, Math.PI * 2);
		this.ctx.fill();
	}
	
	this.ctx.restore();
}

/**
 * Render animation (for backward compatibility)
 * @param {String} animationType - Type of animation
 * @param {Object} data - Animation data
 * @returns {void}
 */
renderAnimation(animationType, data) {
	// Use AnimationManager instead
	this.renderAnimations();
}

}

export default Renderer;
