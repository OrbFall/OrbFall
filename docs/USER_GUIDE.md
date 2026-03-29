# Ball Drop Puzzle Game - User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Game Controls](#game-controls)
3. [How to Play](#how-to-play)
4. [Game Mechanics](#game-mechanics)
5. [Special Balls](#special-balls)
6. [Scoring System](#scoring-system)
7. [Difficulty & Levels](#difficulty--levels)
8. [Tips & Strategies](#tips--strategies)
9. [Settings & Options](#settings--options)

---

## Getting Started

### System Requirements
- **Browser:** Chromium-based browser (Chrome, Edge, Brave, Opera)
- **Internet:** Not required (runs entirely offline)
- **Screen:** 1024×768 minimum resolution recommended

### Installation
1. Download or clone the game repository
2. Extract files to a folder
3. Open `index.html` in your browser
4. No installation or setup required!

### First Launch
1. The game will create a default "Guest" player profile
2. Select your difficulty (1-5) from the main menu
3. Choose Level 1 to start (other levels unlock as you progress)
4. Click "Start" to begin playing

---

## Game Controls

### Keyboard Controls
| Key | Action |
|-----|--------|
| **← (Left Arrow)** | Move piece left |
| **→ (Right Arrow)** | Move piece right |
| **↑ (Up Arrow)** | Rotate piece clockwise |
| **↓ (Down Arrow)** | Hard drop (instant fall) |
| **P** | Pause/Resume game |
| **R** | Restart current level |
| **Esc** | Return to menu (from pause screen) |

### Control Tips
- **Ghost Piece:** A semi-transparent outline shows where your piece will land when you hard drop
- **Lock Delay:** You have 500ms after a piece lands to adjust position before it locks
- **Continuous Movement:** Hold left/right arrows for faster horizontal movement

---

## How to Play

### Objective
Survive for **90 seconds** without filling any column to the top of the board.

### Basic Gameplay Loop
1. **Falling Pieces:** Colored ball pieces fall from the top (like Tetris)
2. **Stacking:** Position pieces to stack balls at the bottom
3. **Matching:** Match 3+ balls of the same color to clear them
4. **Cascades:** Balls above cleared ones drop down and can create new matches
5. **Survive:** Keep the board clear until the timer reaches 0:00

### Game Over
The game ends if any column fills to the top row when a new piece spawns or locks.

### Level Complete
When the timer reaches 0:00, you complete the level and unlock the next one!

---

## Game Mechanics

### Piece Shapes
The game features **8 different piece shapes** composed of 4-6 colored balls:

1. **I-Piece:** 4 balls in a straight line (vertical or horizontal)
2. **O-Piece:** 6 balls in a 2×3 rectangle
3. **T-Piece:** 4 balls in T-shape
4. **L-Piece:** 5 balls in L-shape
5. **J-Piece:** 5 balls in reverse L-shape
6. **S-Piece:** 5 balls in S-shape
7. **Z-Piece:** 5 balls in Z-shape
8. **Single Ball:** 1 ball

### Matching Directions
Balls match when 3 or more of the same color align in any of these directions:
- **Horizontal** →
- **Vertical** ↓
- **Diagonal (4 directions)** ↗ ↘ ↙ ↖

### Cascade System
After balls clear, gravity pulls remaining balls down. This can create new matches:
1. Match found → Balls clear
2. Balls above drop down
3. New matches detected → More balls clear
4. Process repeats until no more matches
5. Each cascade level multiplies your score!

### Color Unlocking
As you progress through levels, more colors become available:
- **Levels 1-2:** 3 colors (Red, Green, Blue)
- **Level 3+:** 4 colors (add Yellow)
- **Level 7+:** 5 colors (add Magenta)
- **Level 11+:** 6 colors (add Cyan)
- **Level 15+:** 7 colors (add Orange)
- **Level 19+:** 8 colors (add Purple)

---

## Special Balls

### 💥 Exploding Balls
- **Appearance:** Star/burst pattern overlay
- **Spawn Rate:** 5% chance per ball
- **Effect:** When 3+ exploding balls match, clears a **7×7 area**
- **Power:** Destroys ALL ball types, including blocking balls!
- **Strategy:** Save exploding balls to clear blocking balls later

### 🎨 Painting Balls
- **Types:** 
  - **Horizontal Painter** (↔): Paints entire row
  - **Vertical Painter** (↕): Paints entire column
  - **Diagonal NE Painter** (↗): Paints entire NE-SW diagonal (↗↙)
  - **Diagonal NW Painter** (↖): Paints entire NW-SE diagonal (↖↘)
- **Spawn Rate:** 5% chance per ball
- **Effect:** When 3+ painters match in their direction, the entire line changes to that color
- **Bonus:** Painted balls immediately re-check for matches, creating instant cascades!
- **Strategy:** Use painters to set up massive chain reactions

### 🚫 Blocking Balls
- **Appearance:** Gray/black balls with X pattern
- **Behavior:** Falls automatically from center column
- **Cannot:** Be matched, painted, or cleared normally
- **Removal:** Only explosions can destroy blocking balls
- **Spawn Rate:** Increases with difficulty and level
  - Difficulty 1: Starts after 50 pieces
  - Difficulty 5: Starts immediately
- **Strategy:** Plan ahead to keep space for blocking balls, or use explosions to remove them

---

## Scoring System

### Base Scoring
- **1 point per ball cleared** (configurable)
- Applies to all cleared balls (matches, explosions, paintings)

### Cascade Bonuses (Progressive Multipliers)
Cascades are the key to high scores! Each cascade level gets a multiplier:
- **1st cascade:** Balls × 1 (base points)
- **2nd cascade:** Balls × 2 (double points)
- **3rd cascade:** Balls × 3 (triple points)
- **4th+ cascade:** Balls × 4, 5, 6... (keeps increasing!)

**Example:**
```
2x Cascade:
- Level 1: 3 balls × 1 = 3 points
- Level 2: 5 balls × 2 = 10 points
Total: 13 points
```

```
3x Cascade:
- Level 1: 3 balls × 1 = 3 points
- Level 2: 5 balls × 2 = 10 points
- Level 3: 6 balls × 3 = 18 points
Total: 31 points
```

### Difficulty Multipliers
Your final score is multiplied by your difficulty setting:
- **Difficulty 1 (Easy):** ×1.0
- **Difficulty 2:** ×1.5
- **Difficulty 3:** ×2.0
- **Difficulty 4:** ×2.5
- **Difficulty 5 (Master):** ×3.0

**Final Score Formula:**
```
Score = (Total cascade points + streak bonus) × Difficulty multiplier
```

### Match Streak Bonus
Land consecutive pieces that each produce at least one match to build a **Match Streak**:
- **Streak 1:** No bonus (first match)
- **Streak 2+:** Bonus = `min(streak, 10) × 2` points (before difficulty multiplier)
- **Streak Cap:** 10 (max bonus = 20 points per piece at cap)
- **Reset:** Missing a match (piece locks with no clears) resets streak to 0

The streak counter appears in the HUD when you reach 2+, and green floating text ("3x STREAK!", etc.) appears at 3+.

### Visual Feedback
The game shows different colored floating text:
- **White numbers:** Normal match ball counts
- **Gold numbers:** Explosion ball counts
- **Blue text:** Cascade bonuses ("2x CASCADE!", "3x CASCADE!", etc.)
- **Green text:** Match streak milestones ("3x STREAK!", "4x STREAK!", etc.)

---

## Difficulty & Levels

### Difficulty Levels (1-5)
Each difficulty affects:

| Difficulty | Drop Speed | Score Multiplier | Blocking Balls |
|------------|-----------|------------------|----------------|
| 1 (Easy) | Slow | ×1.0 | After 50 pieces |
| 2 | Medium | ×1.5 | After 30 pieces |
| 3 | Fast | ×2.0 | After 20 pieces |
| 4 | Very Fast | ×2.5 | After 10 pieces |
| 5 (Master) | Extreme | ×3.0 | From start |

### Level Progression
- **Unlimited Levels:** There's no final level - keep going!
- **Time per Level:** 90 seconds (configurable)
- **Speed Increase:** Each level makes pieces fall slightly faster
- **Unlocking:** Completing a level unlocks the next one
- **Replay:** You can replay any unlocked level
- **Independent Progress:** Each difficulty has its own level progression

### High Scores
- Each (difficulty, level) combination tracks its own high score
- High scores save automatically to your browser's localStorage
- Beat your personal best to see "NEW HIGH SCORE!" message
- Scores persist between sessions

---

## Tips & Strategies

### Beginner Tips
1. **Use the Ghost Piece:** The transparent outline shows where your piece will land
2. **Plan Vertical Matches:** Easier to set up than horizontal ones
3. **Don't Rush:** Use the lock delay (500ms) to fine-tune placement
4. **Clear Often:** Don't let balls stack too high
5. **Practice Difficulty 1:** Learn the mechanics before increasing difficulty

### Intermediate Strategies
1. **Set Up Cascades:** Place balls to create chain reactions
2. **Save Exploding Balls:** Use them strategically to clear blocking balls
3. **Painter Combos:** Painting can instantly create massive cascades
4. **Manage Colors:** Keep similar colors grouped for easier matching
5. **Center Focus:** Keep the center columns clear for blocking balls

### Advanced Techniques
1. **Cascade Planning:** Visualize 2-3 levels of cascades ahead
2. **Color Distribution:** Balance colors across the board
3. **Explosion Timing:** Wait for blocking balls to cluster before using explosions
4. **Painter Chains:** Paint to create matches that create more matches
5. **Speed Control:** Use hard drop strategically to control cascade timing
6. **Edge Management:** Use walls to control piece rotation and placement

### High Score Strategies
1. **Focus on Cascades:** A single 5x cascade scores more than many 1x clears
2. **Maintain Streaks:** Consecutive matches earn growing bonus points — place every piece to create at least one match
3. **Play Higher Difficulties:** The multiplier dramatically increases scores
4. **Delay Clearing:** Sometimes waiting to create bigger cascades is worth it
5. **Special Ball Synergy:** Combine painters and explosions for mega-clears
6. **Survive Longer:** More time = more opportunities for high-scoring cascades

---

## Settings & Options

### Audio Settings
Access from the settings panel (gear icon):
- **SFX Volume:** 0-100% (sound effects)
- **Music Volume:** 0-100% (background music)
- **Master Mute:** Toggle all audio on/off
- **Performance:** Volume at 0% skips audio processing entirely for better performance

### Sound Effects
- Piece rotation (beep)
- Piece movement (click)
- Hard drop (thud)
- Piece lock (clunk)
- Match clear (escalating pitch per cascade)
- Explosion (boom)
- Painting activation (whoosh)
- Level complete (victory chime)
- Game over (descending tone)

### Background Music
- Procedurally generated ambient tones
- Tempo increases with difficulty level
- Seamless looping

### Player Profiles
- **Guest Player:** Default profile for quick play
- **Named Players:** Create custom profiles to track individual progress
- **Multiple Profiles:** Switch between different players
- **Statistics:** Each player tracks games played, total score, cascades, explosions

### Visual Options
(Configured via `config.json` file):
- Ball colors (8 customizable colors)
- Background effects
- Animation speeds
- Particle effects

---

## Troubleshooting

### Game Won't Load
- Use a Chromium-based browser (Chrome, Edge, Brave)
- Check browser console for errors (F12)
- Ensure `config.json` file exists

### Audio Not Playing
- Click anywhere on the page first (browser security requires user interaction)
- Check volume settings in game
- Verify browser isn't muted
- Try refreshing the page

### Progress Not Saving
- Browser must allow localStorage
- Check browser privacy settings
- Private/Incognito mode won't save progress
- Clear cache and cookies can reset progress

### Performance Issues
- Lower SFX/Music volume to 0% for optimization
- Close other browser tabs
- Update graphics drivers
- Reduce browser zoom level

---

## Keyboard Reference Card

```
┌─────────────────────────────────────┐
│         GAME CONTROLS               │
├─────────────────────────────────────┤
│  ←  →    Move piece left/right     │
│   ↑      Rotate piece clockwise     │
│   ↓      Hard drop (instant fall)   │
│                                     │
│   P      Pause/Resume game          │
│   R      Restart level              │
│  Esc     Return to menu             │
└─────────────────────────────────────┘
```

---

## Quick Start Guide

**For New Players:**
1. Open `index.html`
2. Select **Difficulty 1** (Easy)
3. Choose **Level 1**
4. Click **Start**
5. Use **arrow keys** to control falling pieces
6. Match **3+ balls** of same color
7. Survive **90 seconds** to complete level!

**Goal:** Create cascades by setting up chain reactions for high scores!

---

## Support & Feedback

- **Bug Reports:** Check the repository issues page
- **Questions:** Refer to FUNCTIONAL_SPEC.md for detailed mechanics
- **Customization:** Edit `config.json` for custom game parameters

---

**Enjoy the game and aim for those high cascade combos!** 🎮

**Version:** 1.0  
**Last Updated:** December 21, 2025
