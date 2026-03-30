# Functional Specification: Ball Drop Puzzle Game

## 1. Game Overview

A Tetris-inspired puzzle game where colored ball pieces fall from the top and stack at the bottom. Players match 3+ balls of the same color to clear them and score points. The game features special balls (exploding, painting, blocking) and progressive difficulty across 5 difficulty levels with unlimited numbered levels within each.

**Platform:** Static HTML/JavaScript  
**Target Browsers:** Chromium-based browsers only  
**Technology:** Vanilla JavaScript with FOSS libraries as needed

---

## 2. Game Board & Grid

### 2.1 Grid Specifications
- **Dimensions:** 15 columns × 22 rows
- **Cell Type:** Each cell can contain a ball or be empty
- **Rendering:** Programmatic graphics (SVG/Canvas), encapsulated for future replacement

### 2.2 Visual Layout
```
┌───────────────────────────────────────────────────────────────┐
│  Difficulty: 3  Level: 12        ⏱ 8.3s        Score: 1,234  │ ← HUD Bar
│                                                   Best: 5,678  │
├─────────────┬─────────────────────────────────┬───────────────┤
│             │                                 │               │
│  Orb Types  │    [Game Board 15×22]          │  Next Piece   │
│  Legend     │                                 │   Preview     │
│             │                                 │               │
│  • Normal   │                                 │  [4×4 grid]   │
│  ⭐ Explode │                                 │               │
│  ✕ Block    │                                 │               │
│  ─ Paint H  │                                 │  Upcoming:    │
│  │ Paint V  │                                 │  [4×4 grid]   │
│  ╱ Paint NE │                                 │               │
│  ╲ Paint NW │                                 │               │
│             │                                 │               │
│  Colors:    │                                 │               │
│  🔴🔵🟢🟡   │                                 │               │
│             │                                 │               │
└─────────────┴─────────────────────────────────┴───────────────┘
```

---

## 3. Game Pieces

### 3.1 Standard Pieces (8 Shapes - Tetris-style)
All pieces are composed of 4-6 colored balls arranged in these configurations:

1. **I-Piece:** 4 balls in a straight line
2. **O-Piece:** 6 balls in a 2×3 rectangle
3. **T-Piece:** 4 balls in T-shape
4. **L-Piece:** 5 balls in L-shape (3 vertical + 2 horizontal base)
5. **J-Piece:** 5 balls in reverse L-shape (3 vertical + 2 horizontal base)
6. **S-Piece:** 5 balls in S-shape (2-2-1 stagger)
7. **Z-Piece:** 5 balls in Z-shape (2-2-1 stagger)
8. **Single Ball:** 1 ball

**Note:** Variable ball counts (4-6) ensure each piece shape is visually distinct even when the same color.

### 3.2 Ball Colors
- **Starting Colors (Levels 1-2):** 3 colors (Red, Green, Blue)
- **Level 3:** 4 colors (add Yellow)
- **Level 7:** 5 colors (add Magenta)
- **Level 11:** 6 colors (add Cyan)
- **Level 15:** 7 colors (add Orange)
- **Level 19+:** 8 colors (add Purple)

**Color Palette:** RGB primaries + CMY secondaries (configurable via config.json)

### 3.3 Special Ball Types

#### 3.3.1 Exploding Balls (Implemented)
- **Appearance:** Distinct visual marker (e.g., star/burst pattern)
- **Spawn Rate:** 5% per ball in piece (configurable)
- **Behavior:** When 3+ match, clears a 7×7 area centered on match
- **Explosion Pattern:**
  - All matches: 7×7 grid-aligned square centered on the matched exploding balls
  - Multiple exploding balls: Separate 7×7 explosions per position
- **Clears:** All ball types including blocking balls within the 7×7 radius
- **Scoring:** All exploded balls counted and tracked via `BALLS_CLEARED` event
- **Visual Feedback:** Gold floating text shows count of balls destroyed

#### 3.3.2 Painting Balls (Implemented)
- **Types:** 4 variants
  - Horizontal Painter (↔)
  - Vertical Painter (↕)
  - Diagonal NE Painter (↗↙) - Paints NE-SW diagonal
  - Diagonal NW Painter (↖↘) - Paints NW-SE diagonal
- **Spawn Rate:** 5% per ball in piece (configurable, independent from exploding)
- **Behavior:** When 3+ match in their designated direction, entire line changes to the painting ball's color
- **Line Definition:**
  - Horizontal: Entire row
  - Vertical: Entire column
  - Diagonal NE: Entire NE-SW diagonal line through the match (↗↙)
  - Diagonal NW: Entire NW-SE diagonal line through the match (↖↘)
- **Match Re-Finding:** After painting, grid immediately re-checks for new matches
  - Newly painted balls can create immediate matches
  - Triggers additional cascades if matches found

#### 3.3.3 Blocking Balls (Implemented)
- **Appearance:** Distinct visual (gray/black with X pattern)
- **Spawn Method:** Drop individually from center-top of board (column 7-8)
- **Player Control:** None - they fall automatically at piece drop speed
- **Spawn Rate:** 
  - Base: 0.5% chance per piece dropped (configurable)
  - Increases with difficulty and level progression
  - Not before piece 50 on difficulty 1
  - Earlier on higher difficulties (configurable thresholds)
- **Removal:** Only by being caught in explosion radius (7×7 area)
- **Cannot:** Be matched, painted, or affected by normal clears
- **Behavior:** Falls like normal ball, stacks at bottom, persists until exploded
- **Flood Failsafe (Implemented):** If blocking ball count on the grid reaches a configurable cap (default: 20), GameEngine forces the next interval special to be an exploding ball. Configured via `blockerFailsafe.enabled` and `blockerFailsafe.maxBlockers`.

---

## 4. Game Mechanics

### 4.1 Piece Movement
- **Auto-Drop:** Pieces fall at configurable speed (increases per level)
- **Ghost Piece:** Semi-transparent outline shows where piece will land when hard dropped
- **Player Controls:**
  - **Left Arrow:** Move piece left
  - **Right Arrow:** Move piece right
  - **Up Arrow:** Rotate piece clockwise 90°
  - **Down Arrow:** Hard drop (instant fall to bottom)
  - **P Key:** Pause game
  - **R Key:** Restart game

### 4.2 Collision & Stacking
- Pieces stop when they collide with:
  - Bottom of grid
  - Another ball already in the grid
- **Lock Delay:** 500ms (configurable) before piece locks into position
  - Allows player to make final adjustments
  - Timer resets if piece moves or rotates while grounded

### 4.3 Matching & Clearing

#### 4.3.1 Match Detection
- **Minimum:** 3 balls of same color
- **Directions:** Horizontal, Vertical, All 4 Diagonals (↗ ↘ ↙ ↖)
- **Timing:** Check after each piece locks AND after each cascade drop

#### 4.3.2 Cascade System
1. Piece locks → Check for matches
2. Matches clear → Balls above drop down
3. After drop completes → Check for new matches
4. Repeat until no matches found

#### 4.3.3 Special Ball Interactions
**Priority Order:**
1. Exploding balls trigger first (if matched)
2. Painting balls apply color changes
3. Standard color matches clear
4. Cascade check repeats

**Blocking Ball Rules:**
- Not affected by painting
- Not affected by standard color matches
- Only removed by explosions or reaching bottom

### 4.4 Animation Timing (Implemented)
- **Configurable delays** between:
  - Piece lock → Match detection: `matchDetectionDelay` (default: 0ms)
  - Match clear animation: `clearAnimationDuration` (default: 100ms)
  - Ball drop speed: `dropAnimationSpeed` (default: 20ms per row)
  - Drop complete → Next match check: `cascadeCheckDelay` (default: 0ms)

**Clear Animation Sequence:**
1. Flash matched balls white 3 times (alternating original color/white)
2. Each flash: `clearAnimationDuration / 6` duration
3. Display floating point text showing score earned
4. Remove balls and update grid
5. Begin gravity animation

### 4.5 Feedback & RNG Controls (Required)

#### 4.5.1 Cascade Cause-and-Effect Feedback
- When a match is detected, visually trace the matched path for 150-250ms using thin highlight lines or arrows.
- On cascade chains, briefly highlight the origin cells for each cascade level to reduce outcome opacity.
- These hints must not block input or delay gameplay; they are purely visual overlays.

#### 4.5.2 Special Interval & Next-Special Indicator
- Support a deterministic special interval system: guarantee a special ball every N pieces (configurable).
- Show a "next special" indicator in the HUD that:
  - Always shows a countdown: "Special in N" pieces.
  - Reveals the special type within the reveal window (default 2 pieces).
  - Displays an icon that matches the upcoming special type.
  - Uses the exact color that will appear in the upcoming special.
- The interval length must scale with difficulty and/or level (longer intervals at higher difficulty).
- When interval mode is enabled, random special spawns are disabled (interval-only behavior).
- Blocking balls continue to use their own spawn rules and are unaffected by the interval.
- If interval system is disabled, fall back to standard random spawn rates.

#### 4.5.3 Bag System for Piece Shapes (Optional for Specials)
- Use a piece bag that contains one of each active shape; shuffle, then deal until empty before refilling.
- Bag size must match the active shape set (include Single Ball only if enabled).
- Bag logic applies to shapes only; color selection remains independent.
- The bag must prevent immediate repeats beyond what the shuffle allows (no external repeats until the bag refills).
- Debug mode can bypass bag order for testing.
- Optional specials bag:
  - Use a smaller bag or weighted pool for special ball types to avoid long droughts/clusters.
  - If enabled, special bag is independent of the shape bag.
  - Special bag applies only to random special spawns (it does not affect interval specials).
  - Special bag is ignored when interval-only mode is enabled because random specials are disabled.
- Configuration should allow:
  - Enable/disable shape bag.
  - Define active shapes list.
  - Enable/disable special bag and set weights (if used).

#### 4.5.4 Special Spawn Smoothing (Pity Timer) (Implemented)
- Tracks `piecesSinceLastExplosive` counter in `PieceFactory`.
- If no exploding ball appears within a configurable threshold, forces an exploding ball in the next piece.
- Thresholds are configurable per difficulty in `config.json` under `pityTimer.thresholds`:
  - Difficulty 1: 15 pieces, Difficulty 2: 17, Difficulty 3: 19, Difficulty 4: 22, Difficulty 5: 25
- Only fires if `EXPLODING` ball type is unlocked at the current level (level 9+).
- Counter resets whenever any piece containing an explosive ball is generated.
- Can be enabled/disabled via `pityTimer.enabled` config key.
- Works alongside (not instead of) the special interval system.

#### 4.5.5 Blocker Flood Failsafe (Implemented)
- After each piece locks, `GameEngine._checkBlockerFailsafe()` counts blocking balls on the grid via `Grid.countBlockingBalls()`.
- If the count meets or exceeds a configurable cap (default: 20), sets `PieceFactory.forceExplosiveNext = true`.
- The next call to `_pickIntervalSpecialType()` will return `EXPLODING` (if unlocked), clearing the flag.
- Prevents unrecoverable board states in Rising Tide and high-difficulty games.
- Configurable via `blockerFailsafe.enabled` and `blockerFailsafe.maxBlockers` in `config.json`.

---

## 5. Scoring System

### 5.1 Base Scoring (Implemented)
- **Base Points:** 1 point per ball cleared (configurable)
- **Cascade Bonus Formula (Progressive Multipliers):**
  - Single cascade (no chain): Base points only (balls × 1)
  - 2nd cascade in chain: Progressive scoring begins
    - Level 1 balls: `count × basePoints × 1`
    - Level 2 balls: `count × basePoints × 2`
  - 3rd cascade in chain:
    - Level 1 balls: `count × basePoints × 1`
    - Level 2 balls: `count × basePoints × 2`
    - Level 3 balls: `count × basePoints × 3`
  - Formula: Each cascade level N gets balls cleared × basePoints × N
  - Example: 2x cascade with 3 balls (L1) + 5 balls (L2) = (3×1) + (5×2) = 13 points
  - Example: 3x cascade with 3 balls (L1) + 5 balls (L2) + 6 balls (L3) = (3×1) + (5×2) + (6×3) = 31 points

### 5.2 Visual Score Feedback (Implemented)
- **Floating Text System:** Color-coded feedback for different clear types
  - **Match Clears (White #FFFFFF):** Shows ball count (not points)
    - Appears at center of matched balls
    - Text: Number of balls cleared (e.g., "5")
    - Used for normal color matches
  - **Explosion Clears (Gold #FFD700):** Shows exploded ball count
    - Appears at center of all explosion positions
    - Text: Number of balls destroyed (e.g., "12")
    - Triggered when exploding balls detonate
  - **Cascade Bonuses (Blue #4080FF):** Shows cascade multiplier
    - Appears at center of game grid
    - Text: Cascade level (e.g., "2x CASCADE!", "3x CASCADE!")
    - Only shown for 2+ cascades
  - **Animation:** All text floats upward 50 pixels over 1 second, fading linearly with rgba opacity

### 5.3 Difficulty Multiplier (Implemented)
- **Difficulty 1:** 1.0x points
- **Difficulty 2:** 1.5x points
- **Difficulty 3:** 2.0x points
- **Difficulty 4:** 2.5x points
- **Difficulty 5:** 3.0x points

**Score Calculation:** `(ballCount × basePoints + cascadeBonuses + streakBonus) × difficultyMultiplier`

### 5.4 Consecutive Match Streak (Implemented)
- **Match Streak Counter:** `ScoreManager.matchStreak` increments each time a piece lock produces any match (cascade), resets to 0 when a piece locks with no matches (`ScoreManager.onNoMatch()`).
- **Streak Bonus:** Applied when streak ≥ 2: `min(streak, streakCap) × streakBonus × difficultyMultiplier`
  - Default values: `streakBonus = 2`, `streakCap = 10`
  - Example: Streak 5 at difficulty 1 → `min(5,10) × 2 × 1.0 = 10` bonus points
- **HUD Display:** Green "Streak: Nx" indicator appears in `.hud-right` when streak ≥ 2, hidden otherwise.
- **Floating Text:** Green "Nx STREAK!" floating text shown on screen when streak ≥ 3.
- **Event Data:** `SCORE_UPDATE` events include `matchStreak` field for UI synchronization.
- **Reset Conditions:** Streak resets on: `ScoreManager.initialize()`, `ScoreManager.reset()`, or no-match piece lock.
- **Configurable:** `scoring.streakBonus` and `scoring.streakCap` in `config.json`.

### 5.5 Per-Level Goals (Implemented)
- **GoalManager:** Singleton module that selects optional bonus goals per level
  - Picks N goals (configurable, default 2) from a pool of goal types
  - **Goal Types:**
    - `clearBalls` — Clear N orbs total (scales with level/difficulty)
    - `cascade` — Achieve an N-x cascade (tracks best cascade, not cumulative)
    - `useSpecials` — Clear N special (non-normal) orbs
  - Goals are optional — completing them awards bonus points but is not required
  - Listens to `BALLS_CLEARED` and `CASCADE_COMPLETE` events for progress
  - Emits `GOAL_UPDATE` events with progress, completion, and `justCompleted` flags
- **HUD Display:** Goal progress bar shown below HUD during gameplay
- **Floating Text:** Gold "⭐ GOAL COMPLETE!" shown when a goal is completed
- **Bonus:** Configurable points per completed goal (default 25), added to score at level end
- **Scaling:** Targets use formula `base + (level-1) × perLevel + (difficulty-1) × perDifficulty`, with optional max cap
- **Config:** `goals.enabled`, `goals.bonusPoints`, `goals.goalsPerLevel`, `goals.types.*` in `config.json`

### 5.6 Rich Post-Run Recap (Implemented)
- **StatisticsTracker enhancements:** Tracks `largestCascade` and `longestStreak` via event listeners (`CASCADE_COMPLETE`, `SCORE_UPDATE`), reset per level
  - `getRecapData(timeSurvived)` returns all recap stats: `totalBalls`, `specialsUsed`, `largestCascade`, `longestStreak`, `timeSurvived`
  - Specials count derived from existing stats (non-NORMAL, non-BLOCKING types)
- **Recap overlay:** Six stat tiles shown in a 3-column grid between score and match statistics:
  - ⏱️ Time, 🔮 Balls Cleared, 💥 Best Cascade, 🔥 Best Streak, ✨ Specials Used, ⭐ Goals (shown only when goals are active)
- **Goal bonus visibility:** Goals tile shows `completed/total (+bonus)` when bonus is earned
- **Sequential animation:** Each stat tile fades in with upward slide at 150ms intervals
- **Existing displays preserved:** Score, best score, high score message, and match stats grid remain unchanged

### 5.7 Mid-Run Hints (Implemented)
- **HintManager:** Singleton module providing contextual tips during gameplay
  - **Trigger conditions** (either fires a hint):
    - Consecutive no-match piece placements ≥ `hints.noMatchThreshold` (default 3)
    - Board fill ≥ `hints.boardFillPercent` (default 70%)
  - Hints drawn from configurable `hints.pool` (10 contextual tips)
  - Each hint shown at most once per level; capped at `hints.maxPerLevel` (default 3)
  - `onMatch()` resets the no-match counter
  - Emits `HINT_SHOWN` event when a hint is displayed
- **Difficulty gating:** Default ON for D1-D2, OFF for D3+; per `hints.difficultyDefault` config map
- **Settings toggle:** "💡 Show Hints" checkbox in Settings overlay; persisted per-player via `PlayerManager.updateSettings({ hintsEnabled })`
- **Display:** Hints shown as orange floating text with 💡 prefix, 3-second duration (configurable)
- **Grid utility:** `Grid.getOccupiedCount()` added for board fill calculation
- **Config:** `hints.enabled`, `hints.noMatchThreshold`, `hints.boardFillPercent`, `hints.maxPerLevel`, `hints.displayDuration`, `hints.difficultyDefault`, `hints.pool` in `config.json`

### 5.8 Mission Mode (Implemented)
- **MissionManager:** Singleton module managing a sequential micro-goal chain
  - `initialize(difficulty)` builds goal chain from `mission.goalChain` config
  - Goals revealed one at a time; completing one advances to the next
  - **Goal Types:** `clearBalls`, `cascade`, `useSpecials`, `streak`
  - Listens to `BALLS_CLEARED`, `CASCADE_COMPLETE`, `SCORE_UPDATE` events
  - Only the current goal receives event progress (no parallel advancement)
  - `calculateScore(remainingTime)` = `goalsCompleted × pointsPerGoal + floor(remainingTime × timeBonusMultiplier)`
  - Emits `MISSION_GOAL_UPDATE` event with current goal, progress, and chain status
- **MISSION game mode:** Added to `CONSTANTS.GAME_MODES` and `GAME_MODE_CONFIG` (timed, no rising blocks)
- **Menu UI:** "Mission" button added to mode selector
- **HUD:** Mission objective banner (`#missionBanner`) shows current goal label and progress
- **GameEngine integration:** Initializes MissionManager instead of GoalManager when in MISSION mode; mission score calculated at level end with time bonus; floating text for goal completions and chain complete
- **Scoring:** Base points per goal (default 50) + time bonus (remainingTime × 2), replacing GoalManager bonus in MISSION mode
- **Config:** `mission.pointsPerGoal`, `mission.timeBonusMultiplier`, `mission.goalChain[]` with 8 escalating micro-goals
- **Bug fix:** ScoreManager now receives `gameMode` parameter from GameEngine.start() (was defaulting to CLASSIC)

### 5.9 Score Display (Implemented)
- **Score Manager:** Singleton module tracking score via event system
  - Listens for `BALLS_CLEARED` events to accumulate ball counts per cascade level
  - Tracks `ballsPerLevel` array to support progressive cascade scoring
  - Listens for `CASCADE_COMPLETE` events (from GameEngine) to calculate and apply final score
  - Emits `SCORE_UPDATE` events for UI synchronization
  - Detailed console logging for debugging: `🎯 SCORE CALC: 8 balls, 2x cascade, L1(3×1=3) + L2(5×2=10), TOTAL=13`
- **Real-time UI Update:** Score display updates immediately after each cascade completes
- **Current Level Score:** Displayed in HUD
- **High Score:** localStorage persistence via PlayerManager

---

## 6. Level & Difficulty System

### 6.1 Difficulty Settings (1-5)
Each difficulty affects:
- **Drop Speed:** Faster on higher difficulties
- **Blocking Ball Frequency:** More frequent on higher difficulties
- **Blocking Ball Start:** Earlier piece counts on higher difficulties
- **Score Multiplier:** Higher on higher difficulties
- **Color Unlock Speed:** Same across all difficulties

### 6.2 Level Progression

#### 6.2.1 Game Modes (Implemented)
Four distinct game modes offer different play styles:

**CLASSIC Mode**
- Standard timed gameplay (90 seconds per level)
- No special mechanics
- Traditional progression system
- Recommended for new players

**ZEN Mode**
- No time limit - play at your own pace
- Grid fill (breach) ends the level successfully instead of game over
- Timer display hidden from HUD
- Focus on strategy and perfect clears
- Ideal for relaxed, thoughtful gameplay
- **Save & Resume:** Game state auto-saves on pause and tab switch; "Continue Zen Game" button appears on menu when a save exists (per-player, `localStorage`). Save cleared on level complete, game over, or deliberate restart.

**GAUNTLET Mode**
- Timed gameplay with pre-filled challenge
- Bottom 5 rows pre-filled with random orbs (including special balls)
- Random colored orbs rise from bottom every 5 seconds
- Rising orbs include special balls (exploding, painting)
- High difficulty with constant pressure
- Tests clearing speed and management skills

**RISING_TIDE Mode**
- Timed gameplay with rising threat
- Blocking orbs rise from bottom every 5 seconds
- Blocking orbs can only be removed by explosions
- Steady accumulation of obstacles
- Requires strategic use of exploding balls
- Progressive difficulty as blocking orbs accumulate

**MISSION Mode**
- Timed gameplay with sequential micro-goals
- Goals revealed one at a time from a configurable chain of 8
- Goal types: clearBalls, cascade, useSpecials, streak
- Completing a goal immediately reveals the next
- Score = goalsCompleted × pointsPerGoal + remainingTime × timeBonusMultiplier
- Tests adaptability across different play styles

**Mode-Specific Progression:**
- Each mode tracks progression independently
- Completing Classic-1-5 does NOT unlock Zen-1-6
- Best scores stored separately per mode
- Level unlocking managed per mode
- High scores: `"MODE-difficulty-level"` format (e.g., `"ZEN-2-3"`)

#### 6.2.2 Level Duration
- **Time Limit:** 90 seconds (configurable)
- **Completion:** Survive full duration without game over

#### 6.2.3 Level Advancement
- **Success:** Timer reaches 0 (timed modes) or grid filled (ZEN mode), board clears, advance to next level
- **Failure:** Any column reaches top row = Game Over (except in ZEN mode where it's success)
- **Infinite Levels:** No final level, continues indefinitely

#### 6.2.4 Level Unlocking
- Players start at each mode's Difficulty 1, Level 1
- Completing a level unlocks it for replay within that mode
- Can select any unlocked (mode, difficulty, level) combination from menu
- Each combination tracks independent high score
- Mode selector on main screen with hover descriptions

### 6.3 Progressive Difficulty Within Levels
As level numbers increase (within same difficulty):
- Drop speed increases (configurable increment)
- Blocking ball spawn rate increases
- More colors unlock at specific levels (3, 7, 11, 15, 19)

### 6.4 Feature Unlock Schedule
The following progression reduces early cognitive load and introduces counters before threats.
All thresholds are configurable via `specialBalls.featureUnlocks` in `config.json`.

| Level Range | Newly Available Special Types | Notes |
|-------------|-------------------------------|-------|
| 1–2 | *(none)* | Normal balls only; learn colors and piece movement |
| 3–4 | `PAINTER_HORIZONTAL` | Introduces painting mechanic — horizontal rows |
| 5–6 | `PAINTER_VERTICAL` | Adds column painting |
| 7–8 | `PAINTER_DIAGONAL_NE`, `PAINTER_DIAGONAL_NW` | Completes the painter family |
| 9+ | `EXPLODING` | Bomb introduced as a counter to blocking balls |
| 11+ | Blocking balls (separate spawn rules, see §3.3.3) | Rate scales with difficulty |

**Implementation:** `PieceFactory._getUnlockedSpecialTypes(level)` reads `specialBalls.featureUnlocks`
and returns all types whose configured minimum level ≤ current level.  This filter is applied in all
three spawn paths:
- **Interval system** (`_pickIntervalSpecialType`) — forced guarantees only pick unlocked types
- **Random spawn** (`generateSpecialBall`) — eligible type list is filtered before probability roll
- **Special bag** (`_getSpecialBagPool`) — bag is built only from unlocked types; bag is discarded on level change

When no types are unlocked (levels 1–2) the interval counter still ticks, but no forced special is
injected and random spawns return `null`.

**Default `config.json` values:**
```json
"specialBalls": {
  "featureUnlocks": {
    "PAINTER_HORIZONTAL":  3,
    "PAINTER_VERTICAL":    5,
    "PAINTER_DIAGONAL_NE": 7,
    "PAINTER_DIAGONAL_NW": 7,
    "EXPLODING":           9
  }
}
```

**Color Cap Guidance:** Keep a max of 3–4 colors through roughly Level 12, then ramp to 5–6 once specials are understood. Reserve 7–8 colors for higher difficulties.

---

## 7. User Interface

### 7.1 Main Game Screen
```
┌───────────────────────────────────────────────────────────────────────┐
│  MODE: Classic    Difficulty: 3    Level: 12      ⏱ TIME: 8.3s       │
│                                          Score: 1,234   Best: 45,678  │
├────────────────┬──────────────────────────────────┬────────────────────┤
│                │                                  │                    │
│  ORB TYPES     │                                  │   NEXT PIECE       │
│                │                                  │                    │
│  🔴 Normal     │                                  │   ┌─┬─┬─┬─┐       │
│    Standard    │      [15 cols × 22 rows]         │   │🔴│🔴│  │  │       │
│                │                                  │   ├─┼─┼─┼─┤       │
│  ⭐ Exploding  │       GAME BOARD                 │   │🔴│🔴│  │  │       │
│    Destroys    │                                  │   ├─┼─┼─┼─┤       │
│    nearby      │                                  │   │  │  │  │  │       │
│                │                                  │   ├─┼─┼─┼─┤       │
│  ✕ Blocking    │                                  │   │  │  │  │  │       │
│    Cleared by  │                                  │   └─┴─┴─┴─┘       │
│    explosions  │                                  │                    │
│                │                                  │   UPCOMING         │
│  ─ Painter H   │                                  │                    │
│    Paints row  │                                  │   ┌─┬─┬─┬─┐       │
│                │                                  │   │🔵│🔵│🔵│  │       │
│  │ Painter V   │                                  │   ├─┼─┼─┼─┤       │
│    Paints col  │                                  │   │  │  │  │  │       │
│                │                                  │   ├─┼─┼─┼─┤       │
│  ╱ Painter NE  │                                  │   │  │  │  │  │       │
│    NE-SW diag  │                                  │   ├─┼─┼─┼─┤       │
│                │                                  │   │  │  │  │  │       │
│  ╲ Painter NW  │                                  │   └─┴─┴─┴─┘       │
│    NW-SE diag  │                                  │                    │
│                │                                  │                    │
│  AVAILABLE     │                                  │   [Controls]       │
│  COLORS        │                                  │                    │
│  🔴 🔵 🟢 🟡    │                                  │   ← → ↓ SPACE     │
│                │                                  │   Z X Q R P        │
│                │                                  │                    │
└────────────────┴──────────────────────────────────┴────────────────────┘
```

### 7.2 Menu / Level Selection Screen
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                  🎮 ORB•FALL: CHROMACRUSH                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                          PLAYER                             │
│                                                             │
│          [Player Name ▼]  [➕]  [🗑️]                       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                      SELECT GAME MODE                       │
│                                                             │
│    [ Classic ] [  Zen  ] [ Gauntlet ] [ Rising Tide ]      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                    SELECT DIFFICULTY                        │
│                                                             │
│    [  Easy  ] [ Medium ] [  Hard  ] [ Expert ] [ Master ]  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                      SELECT LEVEL                           │
│                                                             │
│   ┌─┬─┬─┬─┬─┬─┬─┬─┬─┬─┐                                   │
│   │1│2│3│4│5│6│7│8│9│10│  Row 1                            │
│   ├─┼─┼─┼─┼─┼─┼─┼─┼─┼─┤                                   │
│   │11│12│13│14│15│16│17│18│19│20│  Row 2                  │
│   └─┴─┴─┴─┴─┴─┴─┴─┴─┴─┘                                   │
│                                                             │
│   🔒 = Locked    ⭐ = Best Score Displayed                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              [    START GAME    ]                           │
│              [     SETTINGS     ]                           │
│              [  HOW TO PLAY  ]                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Pause Screen
```
┌─────────────────────────────────────────────┐
│                                             │
│             ⏸️  PAUSED                       │
│                                             │
│         Current Score: 1,234                │
│         Best Score: 5,678                   │
│                                             │
│         Time Elapsed: 45.2s                 │
│                                             │
│                                             │
│         [   ▶️  RESUME   ]                   │
│         [   🔄 RESTART   ]                   │
│         [  💾 SAVE & EXIT ] (Zen only)       │
│         [   🏠 MENU      ]                   │
│                                             │
│                                             │
└─────────────────────────────────────────────┘
```

### 7.4 Game Over Screen
```
┌─────────────────────────────────────────────┐
│                                             │
│              GAME OVER                      │
│                                             │
│         Final Score:  1,234                 │
│         Best Score:   5,678                 │
│                                             │
│         ⭐ NEW HIGH SCORE! ⭐                │
│            (if achieved)                    │
│                                             │
│         Time: 125.4s                        │
│         Level Reached: 12                   │
│                                             │
│         [   🔄 RETRY     ]                   │
│         [   🏠 MENU      ]                   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 8. Audio & Visual Effects

### 8.1 Sound Effects (Implemented - Programmatic Web Audio API)
- **AudioManager:** Singleton managing all game audio with Web Audio API
  - **Sound Effects:**
    - Piece rotation (subtle beep)
    - Piece movement left/right (click)
    - Piece hard drop (thud)
    - Piece lock/land (clunk)
    - Match clear (escalating pitch per cascade level)
    - Explosion (bass boom)
    - Painting activation (whoosh)
    - Level complete (victory chime)
    - Game over (descending tone)
  - **Background Music:**
    - Procedurally generated ambient music loop
    - Tempo increases with difficulty level
  - **Volume Controls:**
    - Independent SFX and music volume sliders (0-100%)
    - Master mute toggle
    - Optimization: Skips audio processing entirely when volume is 0
  - **Audio Categories:**
    - SFX (one-shot sounds)
    - Music (looping background)
    - Both controlled independently

### 8.2 Visual Effects
- **Match Animation:** Balls flash/pulse before clearing
- **Explosion Animation:** Radial burst effect
- **Painting Animation:** Wave/ripple along painted line
- **Cascade Feedback:** Visual indicator for combo count
- **Blocking Ball:** Falling animation with distinct trail
### 9.1 LocalStorage Schema
```json
{
  "ballMatcher_players": {
    "Guest": {
      "name": "Guest",
      "stats": {
        "gamesPlayed": 42,
        "highScore": 5678,
        "totalScore": 123456,
        "longestTime": 450,
        "levelsCompleted": 15
      },
      "levelProgress": {
        "completedLevels": [
          "CLASSIC-1-1", "CLASSIC-1-2", "CLASSIC-1-3",
          "ZEN-1-1", "ZEN-2-1",
          "GAUNTLET-1-1",
          "RISING_TIDE-1-1"
        ],
        "levelScores": {
          "CLASSIC-1-1": 1234,
          "CLASSIC-1-2": 2345,
          "ZEN-1-1": 3456,
          "GAUNTLET-1-1": 890
        },
        "unlockedLevelsByMode": {
          "CLASSIC": {
            "1": [1, 2, 3, 4],
            "2": [1, 2]
          },
          "ZEN": {
            "1": [1, 2],
            "2": [1]
          },
          "GAUNTLET": {
            "1": [1, 2]
          },
          "RISING_TIDE": {
            "1": [1]
          }
        },
        "highestLevel": 4
      },
      "settings": {
        "soundEnabled": true,
        "musicVolume": 70,
        "sfxVolume": 85
      }
    }
  },
  "ballMatcher_currentPlayer": "Guest"
}
```

**Key Format:** `"MODE-difficulty-level"` (e.g., `"CLASSIC-1-5"`, `"ZEN-2-3"`)

**Legacy Migration:** Automatically converts old `"difficulty-level"` format to `"CLASSIC-difficulty-level"` on first loadsettings": {
    "soundEnabled": true,
    "volume": 0.7
  }
}
```

---

## 10. Configuration File (config.json)

All game parameters should be configurable via JSON:

### 10.1 Core Settings
- Grid dimensions (rows, columns)
- Time per level
- Starting drop speed
- Drop speed increment per level
- Game mode configurations:
  - `timed` (boolean) - Whether mode has time limit
  - `preFillRows` (number) - Rows to pre-fill at start (GAUNTLET: 5)
  - `risingBlocks` (boolean) - Whether orbs rise periodically
  - `risingInterval` (milliseconds) - Time between rising events (default: 5000)

### 10.2 Colors
- Ball color palette (hex codes for 8 colors)
- Background colors
- UI theme colors

### 10.3 Probabilities
- Special ball spawn rates (exploding, horizontal painter, vertical painter, diagonal painter)
- Blocking ball spawn rates per difficulty/level
- Pity timer thresholds per difficulty (`pityTimer.thresholds`)
- Blocker failsafe cap (`blockerFailsafe.maxBlockers`)

### 10.4 Scoring
- Base points per ball
- Point doubling thresholds
- Row clear bonus
- Cascade bonus (initial and multiplier)
- Difficulty multipliers
- Streak bonus points per streak level (`scoring.streakBonus`)
- Streak cap (`scoring.streakCap`)

### 10.5 Animation Timings
- Match detection delay
- Clear animation duration
- Drop animation speed
- Cascade delay between checks

### 10.6 Difficulty Curves
- Drop speed per difficulty level
- Blocking ball frequency per difficulty
- Blocking ball start piece per difficulty

### 10.7 Level Color Unlocks
- Levels at which each color unlocks

---

## 11. Edge Cases & Rules

### 11.1 Simultaneous Matches
- All matches detected simultaneously
- Special balls trigger in priority order (exploding → painting → standard)

### 11.2 Overlapping Explosions
- Multiple explosion zones combine (union of affected cells)

### 11.3 Painting + Matching
- Painted balls immediately re-checked for matches
- Can trigger additional cascades

### 11.4 Blocking Balls at Bottom
- When blocking ball reaches bottom, it stays there
- Does not clear even if surrounded by matches
- Only explosions can remove them

### 11.5 Game Over Condition
- Checked when new piece spawns
- If spawn position occupied → Game Over
- If any column reaches row 0 during piece lock → Game Over

### 11.6 Level Timer
- Countdown starts when level begins
- Pauses when game is paused
- Reaching 0:00 = Level Complete (if still alive)

---

## 12. Accessibility & Polish

### 12.1 Keyboard Controls
- All game functions accessible via keyboard
- No mouse required

### 12.2 Visual Clarity
- High contrast between ball colors
- Clear visual distinction for special balls
- Grid lines visible but subtle

### 12.3 Responsive Feedback
- Immediate visual response to all controls
- Audio feedback for all player actions

### 12.4 Performance
- Target: 60 FPS
- Efficient rendering (only redraw changed cells)

---

## 13. Future Enhancements (Out of Scope for V1)

- Mobile touch controls
- Multiplayer mode
- Power-up system
- Achievement system
- Daily challenges
- Leaderboards (online)
- Custom color themes
- Accessibility modes (colorblind-friendly palettes)

---

## 14. Implementation Status

### 14.1 Completed Features (Phases 1-9)
✅ **Core Foundation (Phase 1-2)**
- Project structure with modular architecture
- ConfigManager with config.json loading (156 configurable parameters)
- Constants and EventEmitter utilities
- Ball class with type system (NORMAL, BLOCKING, EXPLODING, HORIZONTAL_PAINTER, VERTICAL_PAINTER, DIAGONAL_NE_PAINTER, DIAGONAL_NW_PAINTER)
- Piece class with 8 shapes and rotation
- Grid class with comprehensive match detection
- Renderer with Canvas API
- InputHandler with keyboard controls
- GameEngine with game loop

✅ **Core Gameplay (Phase 2-3)**
- Piece dropping with gravity
- Collision detection
- Piece rotation (clockwise 90°)
- Horizontal movement (left/right)
- Hard drop (instant fall)
- Piece locking with configurable delay (default 500ms)
- PieceFactory with level-based color unlocking (3→8 colors at levels 1, 3, 7, 11, 15, 19)
- Next piece preview
- Ghost piece (drop location preview)
- Pause functionality

✅ **Matching & Scoring System (Phase 3-4)**
- Match detection (horizontal, vertical, diagonal in all 4 directions)
- Clear animation (3-flash white effect with configurable timing)
- Gravity/cascade system (automatic multi-cascade loops)
- Cascade counting tracked by GameEngine
- ScoreManager with event-driven architecture
- Progressive cascade scoring (Level 1: ×1, Level 2: ×2, Level 3: ×3, etc.)
- Difficulty multipliers (1.0x, 1.5x, 2.0x, 2.5x, 3.0x)
- Consecutive match streak system with configurable bonus/cap
- Color-coded floating text system:
  - White: Normal match ball counts
  - Gold: Explosion ball counts
  - Blue: Cascade multipliers (2x, 3x, etc.)
  - Green: Match streak milestones (3x STREAK!, etc.)
- Real-time score display updates

✅ **Special Ball Effects (Phase 5)**
- Exploding balls: 7×7 area clear on match (configurable spawn rate: 5%)
- Horizontal/Vertical/Diagonal NE/Diagonal NW painters: Full line painting (configurable spawn rate: 5%)
- Blocking balls: Spawn system with difficulty/level scaling, explosion-only removal
- Blocker flood failsafe: Forces explosive spawn when blocking ball count exceeds configurable cap
- Explosion pity timer: Forces explosive ball after configurable drought threshold per difficulty
- Painter re-matching: Painted balls immediately re-checked for new matches
- Explosion scoring: All cleared balls counted and displayed

✅ **Level & Difficulty System (Phase 6)**
- LevelManager module with 5 difficulty levels
- Level timer (configurable, default 90 seconds)
- Difficulty selection (1-5) with independent progression
- Level progression and unlocking system
- Drop speed scaling (configurable per difficulty)
- Blocking ball frequency scaling (configurable thresholds)
- Color unlocking at levels 1, 3, 7, 11, 15, 19
- Level survival condition (timer reaches 0 without game over)

✅ **Audio System (Phase 7)**
- AudioManager singleton with Web Audio API
- Programmatic sound effects:
  - Piece rotation, movement, drop, lock
  - Match clear (escalating pitch per cascade)
  - Explosion, painting activation
  - Level complete, game over
- Procedurally generated background music
- Independent SFX and music volume controls (0-100%)
- Master mute toggle
- Volume=0 optimization (skips audio processing entirely)

✅ **UI Screens & Menus (Phase 8)**
- Main menu with difficulty/level selection
- HUD with score, level, difficulty, timer display
- Pause overlay (Resume/Restart/Save & Exit/Menu options)
- Auto-pause on tab switch (`visibilitychange`) and before page unload
- Game over screen with score display
- Level complete screen with progression
- Settings panel (audio controls, visual options)
- High score tracking and display per difficulty/level

✅ **Data Persistence (Phase 9)**
- PlayerManager with localStorage integration
- Mode-specific high score tracking: `"MODE-difficulty-level"` format
- Independent level unlock tracking per mode
- Player profile system with guest/named players
- Settings persistence (audio volumes, visual preferences)
- StatisticsTracker for match/clear/cascade analytics
- Legacy data migration (auto-converts old format to CLASSIC mode)
- **Zen Game Save/Resume:** Auto-saves grid, pieces, score, streak, and factory state on pause/tab switch; per-player `localStorage` key (`orbfall_zen_<player>`); "Continue Zen Game" button on main menu; cleared on level end, game over, or restart

✅ **Game Modes System (Phase 9.5)**
- Four distinct game modes with unique mechanics:
  - **CLASSIC:** Standard timed gameplay (90s per level)
  - **ZEN:** Untimed, grid breach = success, strategic play
  - **GAUNTLET:** 5 pre-filled rows + rising random orbs every 5s
  - **RISING_TIDE:** Rising blocking orbs every 5s, requires explosions
- Mode selector UI with hover descriptions
- Mode-specific progression tracking (independent unlocks/scores)
- Mode configuration system (timed, preFillRows, risingBlocks, risingInterval)
- Pre-fill mechanics with special ball generation
- Rising mechanics (random orbs for GAUNTLET, blocking for RISING_TIDE)
- HUD displays current game mode
- Analytics tracking includes game_mode parameter
- Timer hidden in ZEN mode
- Grid breach handling per mode (success in ZEN, failure in others)

✅ **Quality Assurance (Continuous)**
- 370+ unit tests across 18 test modules
- Comprehensive test coverage:
  - **Core Utilities:** Helpers (15 tests), EventEmitter (18 tests)
  - **Game Entities:** Ball (31 tests), Piece (36 tests), Grid (88 tests)
  - **Factories & Managers:** PieceFactory (26 tests), ScoreManager (35 tests), ConfigManager (12 tests), FloatingText (11 tests), GoalManager (10 tests), MissionManager (16 tests)
  - **Game Engine:** GameEngine (22 tests including Zen save/load)
---

**Document Version:** 2.7  
**Last Updated:** March 2026  
**Status:** Living Document - Updated through Phase 10 Gameplay + Mission Mode

### 14.2 Pending Features (Phase 10 - Documentation & Deployment)
⏳ **Documentation**
- Module documentation (inline JSDoc comments)
- User guide / gameplay instructions
- Deployment guide

⏳ **Deployment Optimization**
- Asset optimization
- Code minification/bundling (if needed)
- Hosting setup
- Final QA pass

---

## 15. Monetization Strategy

**Architecture Note:** Monetization is 100% client-side; no backend is required for basic operation (optional validation endpoint for token checks).

### 15.1 Advertising Integration

#### 15.1.1 Ad Placement
**Display Advertising:**
- **Provider:** Google AdSense (or alternative FOSS-friendly ad network)
- **Ad Units:**
  - **Banner Ad:** 728×90 leaderboard at top of page (desktop)
  - **Mobile Banner:** 320×50 banner at bottom (mobile)
  - **Interstitial:** Full-screen ad shown:
    - Every 3rd game over (configurable)
    - Every 5th level completion (configurable)
    - Never during active gameplay
  - **Sidebar Ad:** 300×250 medium rectangle in right sidebar (desktop only)

#### 15.1.2 Ad Display Rules
- **Frequency Caps:**
  - Maximum 1 interstitial per 5 minutes
  - No ads during active gameplay (only during menu/game-over states)
- **User Experience:**
  - Clear "Skip Ad" timer (5 seconds for interstitials)
  - Non-intrusive placement that doesn't block game controls
  - Responsive layout adjusts when ads load

#### 15.1.3 Ad-Free State
- **Trigger:** LemonSqueezy license key purchase and activation
- **Duration:** Perpetual (no expiry) unless the license key has an explicit expiry date set in LemonSqueezy
- **Storage:** `monetization_license` (JSON) and `monetization_ad_free_until` (`"license"`) in localStorage
- **Verification:** Validated against the LemonSqueezy API on activation; re-validated every 7 days on page load
- **Visual Indicator:** "Ad-Free Mode" badge in HUD when active

### 15.2 LemonSqueezy License Integration

#### 15.2.1 Purchase Button Placement
- **Primary Button:** Floating "✨ Go Ad-Free" button in top-right corner
  - Visible only when ad-free is not active
  - Links directly to LemonSqueezy store checkout page in a new tab
- **Secondary Placement:**
  - Settings menu: "Activate License Key" option to enter a purchased key
  - Settings menu: "Remove ads" link to the store

#### 15.2.2 License Key Activation Flow
1. User purchases ad-free license on the LemonSqueezy store
2. LemonSqueezy emails a license key (UUID format) to the buyer
3. User opens Settings → "Activate License Key"
4. Enters key into the activation dialog
5. Game calls `POST https://api.lemonsqueezy.com/v1/licenses/activate` with:
   - `license_key`: the entered key
   - `instance_name`: `"OrbFall-ChromaCrush"`
6. On success:
   - License data (key, instance ID, expiry, customer name) stored in localStorage
   - `monetization_ad_free_until` set to `"license"`
   - All ads removed immediately
   - "Go Ad-Free" button removed
   - Confirmation message shown
7. On failure: error message shown (invalid key, already activated on max instances, etc.)

**Periodic Re-validation:**
- On page load, if a stored license exists and last validation was 7+ days ago,
  the game calls `POST https://api.lemonsqueezy.com/v1/licenses/validate`
- If the API returns `valid: false`, ad-free state is cleared
- Network errors during re-validation do not revoke ad-free access (fail-open)

#### 15.2.3 Thank You Experience
- **Confirmation Message:** "Thank you for your support! Ads have been permanently disabled."
- **Supporter Badge:** "Ad-Free" visual indicator in the HUD
- **Special Features (Optional Future Enhancement):**
  - Custom color themes for supporters
  - Exclusive game modes
  - Priority feature requests

### 15.3 Monetization Configuration
All monetization settings configurable via `config.json`:
```json
{
  "monetization": {
    "ads": {
      "enabled": true,
      "provider": "adsense",
      "adSenseId": "ca-pub-9808238396490185",
      "slotIds": {
        "banner": "XXXXXXXXXX",
        "interstitial": "XXXXXXXXXX",
        "sidebar": "XXXXXXXXXX"
      },
      "displayRules": {
        "interstitialFrequency": 3,
        "levelAdFrequency": 5,
        "interstitialMinInterval": 300000,
        "skipDelay": 5000
      }
    },
    "lemonsqueezy": {
      "enabled": true,
      "storeUrl": "https://gusto4tech.lemonsqueezy.com/buy/your-product-id",
      "storeId": 0,
      "productId": 0,
      "buttonText": "✨ Go Ad-Free"
    }
  }
}
```

---

## 16. Progressive Web App (PWA) Features

### 16.1 PWA Core Requirements

#### 16.1.1 Web App Manifest
**File:** `manifest.json` in root directory

**Required Fields:**
- **name:** "Orb•Fall: ChromaCrush"
- **short_name:** "Orb•Fall"
- **description:** "Match colored orbs in this Tetris-inspired puzzle game with special power orbs."
- **start_url:** "/"
- **display:** "standalone" (full-screen app experience)
- **background_color:** "#0f0f1e" (matches game background)
- **theme_color:** "#4080FF" (primary blue)
- **orientation:** "any"
- **icons:** Two key sizes, each supplied as separate `any` and `maskable` files:
  - `icon-192.png` / `icon-192-maskable.png` — 192×192 PNG
  - `icon-512.png` / `icon-512-maskable.png` — 512×512 PNG
  - `Logotrans.png` — 1024×1024 PNG (`purpose: any`)
  - `any` files: full-bleed logo on dark background
  - `maskable` files: logo at 80% scale within the Android safe zone on dark background
  - PNG format with opaque dark background (no transparency on maskable)

**AdSense Verification:**
- `<meta name="google-adsense-account" content="ca-pub-9808238396490185">` is required in `<head>`

**ads.txt:**
- `ads.txt` must be deployed at the root of the domain (e.g. `https://yourdomain.com/ads.txt`)
- Content: `google.com, pub-9808238396490185, DIRECT, f08c47fec0942fa0`

#### 16.1.2 Service Worker
**File:** `service-worker.js` in root directory

**Caching Strategy:**
- **App Shell Pattern:** Cache HTML, CSS, JS, and core assets
- **Cache-First for all same-origin GET requests** (static and config alike):
  - CSS files, JavaScript modules, images/icons
  - `config.json`, `manifest.json`, `ads.txt`
  - Uncached assets are fetched from the network and stored for future use
- **Pass-through (no caching) for cross-origin requests:**
  - Ad scripts (always fresh from Google)
  - Analytics, weather API, LemonSqueezy API
- **Offline Fallback:**
  - Show cached game if network unavailable
  - Display "Offline Mode" indicator in HUD
  - Ads silently disabled when offline

**Cache Versioning:**
- Cache name format: `orbfall-vMAJOR.MINOR.PATCH` (e.g. `orbfall-v1.0.4`)
- Increment the version on any deployment to force a full cache refresh
- On activate, all caches whose name does not match the current version are deleted

**Service Worker Lifecycle:**
```javascript
// Install: Cache core assets
self.addEventListener('install', event => {
  // Cache app shell
});

// Activate: Clean up old caches
self.addEventListener('activate', event => {
  // Delete old cache versions
});

// Fetch: Serve from cache or network
self.addEventListener('fetch', event => {
  // Cache-first strategy
});
```

#### 16.1.3 HTTPS Requirement
- PWAs require HTTPS (except localhost for development)
- Deploy to HTTPS-enabled hosting (GitHub Pages, Netlify, Vercel, etc.)

### 16.2 Install Prompts

#### 16.2.1 Browser Install Prompt
- **Trigger:** Captured via `beforeinstallprompt` event; `preventDefault()` is called to suppress the browser mini-infobar so the game can control the UX
- **Toast:** A bottom-centre install toast (`#pwaInstallToast`) is shown when the prompt is available, with "Install" and dismiss (✕) buttons
- **Fallback:** If Chrome has not offered the native prompt (engagement heuristic not yet met, or prompt was recently dismissed), tapping the install button shows a manual step-by-step toast:
  1. Tap ⋮ (Chrome menu) → "Add to Home screen" → "Add"
  - Auto-dismisses after 12 seconds

#### 16.2.2 Custom Install Button
- **Location:** Settings menu
- **Text:** "📲 Install App" (button ID: `installAppButton`)
- **Behavior:**
  - If the native `beforeinstallprompt` is held: triggers the native prompt directly
  - If not available: shows the manual install instructions fallback toast (see 16.2.1)
  - If app is already installed: button row is hidden (`#pwaInstallSetting` `display:none`)
- **Visibility:** Always visible in Settings unless the app is already installed

### 16.3 PWA Enhancements

#### 16.3.1 Offline Gameplay
- **Full Functionality:** Game works entirely offline once cached
- **Limitations When Offline:**
  - Ads disabled (no network)
  - BMAC donations require online connection
  - High scores sync when back online (future enhancement)

#### 16.3.2 Splash Screen
- **Icon:** App icon centered
- **Background:** `background_color` from manifest
- **Display:** Automatic on app launch

#### 16.3.3 App Badge/Notifications (Future Enhancement)
- Daily play streak reminders
- New high score achievements
- Ad-free period expiration warnings (3 days before)

### 16.4 PWA Testing
- **Lighthouse:** 100% PWA score
- **Chrome DevTools:** Application tab verification
- **Install Test:** Successful installation on:
  - Chrome Desktop
  - Chrome Android
  - Edge Desktop
  - Samsung Internet
- **Offline Test:** Full functionality without network

---

**Document Version:** 3.1  
**Last Updated:** March 2026  
**Status:** Living Document - Updated with Monetization, PWA, AdSense & As-Built Corrections
