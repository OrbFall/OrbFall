/**
 * AudioManager.js
 * 
 * Description: Manages game audio using Web Audio API for procedural sound generation
 * 
 * Dependencies: EventEmitter, Constants
 * 
 * Exports: AudioManager singleton
 */

import EventEmitter from '../utils/EventEmitter.js';
import { CONSTANTS } from '../utils/Constants.js';

/**
 * AudioManager class for handling all game audio
 */
class AudioManagerClass {
	constructor() {
		this.audioContext = null;
		this.masterVolume = 0.7;
		this.sfxVolume = 0.8;
		this.musicVolume = 0;
		this.isMuted = false;
		this.isInitialized = false;
		
		// Music state
		this.musicPlaying = false;
		this.musicNodes = [];
		this.musicLoopId = null;
		
		// Load settings from localStorage
		this.loadSettings();
	}

	/**
	 * Initialize Web Audio API context
	 * Must be called after user interaction (browser requirement)
	 */
	initialize() {
		if (this.isInitialized) return;
		
		try {
			// Create AudioContext (cross-browser compatible)
			const AudioContext = window.AudioContext || window.webkitAudioContext;
			this.audioContext = new AudioContext();
			this.isInitialized = true;
		} catch (error) {
			console.error('AudioManager: Failed to initialize Web Audio API', error);
		}
	}

	/**
	 * Resume audio context (required after user interaction in some browsers)
	 */
	async resume() {
		if (this.audioContext) {
			if (this.audioContext.state === 'suspended') {
				await this.audioContext.resume();
				console.log('AudioManager: resumed, new state =', this.audioContext.state);
			}
		}
	}

	/**
	 * Play piece move sound
	 */
	playMove() {
		if (!this.canPlaySound()) return;
		
		const now = this.audioContext.currentTime;
		const oscillator = this.audioContext.createOscillator();
		const gainNode = this.audioContext.createGain();
		
		oscillator.connect(gainNode);
		gainNode.connect(this.audioContext.destination);
		
		oscillator.frequency.setValueAtTime(200, now);
		oscillator.type = 'sine';
		
		gainNode.gain.setValueAtTime(0.1 * this.getEffectiveVolume(), now);
		gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
		
		oscillator.start(now);
		oscillator.stop(now + 0.05);
	}

	/**
	 * Play piece rotation sound
	 */
	playRotate() {
		if (!this.canPlaySound()) return;
		
		const now = this.audioContext.currentTime;
		const oscillator = this.audioContext.createOscillator();
		const gainNode = this.audioContext.createGain();
		
		oscillator.connect(gainNode);
		gainNode.connect(this.audioContext.destination);
		
		oscillator.frequency.setValueAtTime(300, now);
		oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.08);
		oscillator.type = 'square';
		
		gainNode.gain.setValueAtTime(0.15 * this.getEffectiveVolume(), now);
		gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
		
		oscillator.start(now);
		oscillator.stop(now + 0.08);
	}

	/**
	 * Play piece drop sound - descending swoop
	 */
	playDrop() {
		if (!this.canPlaySound()) return;
		
		const now = this.audioContext.currentTime;
		const oscillator = this.audioContext.createOscillator();
		const gainNode = this.audioContext.createGain();
		
		oscillator.connect(gainNode);
		gainNode.connect(this.audioContext.destination);
		
		// Descending swoop: 600Hz (D5) down to 150Hz (D3) over 200ms
		oscillator.frequency.setValueAtTime(600, now); // Starting pitch: D5
		oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.2); // Ending pitch: D3, 0.2s = 200ms duration
		oscillator.type = 'triangle'; // Triangle wave for smooth, mellow tone
		
		gainNode.gain.setValueAtTime(0.12 * this.getEffectiveVolume(), now);
		gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
		
		oscillator.start(now);
		oscillator.stop(now + 0.2);
	}

	/**
	 * Play piece lock sound - satisfying thud/stack
	 */
	playLock() {
		if (!this.canPlaySound()) return;
		
		const now = this.audioContext.currentTime;
		
		// Layer 1: Deep bass thud (80Hz = E2 down to 40Hz = E1)
		const bass = this.audioContext.createOscillator();
		const bassGain = this.audioContext.createGain();
		bass.connect(bassGain);
		bassGain.connect(this.audioContext.destination);
		bass.frequency.setValueAtTime(80, now); // 80Hz = E2 note
		bass.frequency.exponentialRampToValueAtTime(40, now + 0.1); // Drop to 40Hz = E1, 0.1s = 100ms
		bass.type = 'sine'; // Pure sine wave for deep bass
		bassGain.gain.setValueAtTime(0.3 * this.getEffectiveVolume(), now); // 30% volume
		bassGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15); // Fade out over 150ms
		
		// Layer 2: Mid-range click (200Hz = G3) for satisfying "thunk" sound
		const click = this.audioContext.createOscillator();
		const clickGain = this.audioContext.createGain();
		click.connect(clickGain);
		clickGain.connect(this.audioContext.destination);
		click.frequency.setValueAtTime(200, now); // 200Hz = G3 note
		click.type = 'square'; // Square wave for sharp, percussive attack
		clickGain.gain.setValueAtTime(0.15 * this.getEffectiveVolume(), now); // 15% volume
		clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05); // Quick 50ms fade
		
		bass.start(now);
		bass.stop(now + 0.15); // 150ms bass duration
		click.start(now);
		click.stop(now + 0.05); // 50ms click duration (quick attack)
	}

	/**
	 * Play ball clear/match sound - crushing/crumbling effect
	 * @param {Number} count - Number of balls cleared
	 */
	playClear(count = 3) {
		if (!this.canPlaySound()) return;
		
		const now = this.audioContext.currentTime;
		const duration = 0.2 + (count * 0.02); // Longer for more balls
		
		// Layer 1: Crumbling noise
		const bufferSize = this.audioContext.sampleRate * duration;
		const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize); // Fade out
		}
		
		const noise = this.audioContext.createBufferSource();
		noise.buffer = buffer;
		
		const noiseFilter = this.audioContext.createBiquadFilter();
		noiseFilter.type = 'highpass';
		noiseFilter.frequency.setValueAtTime(800, now);
		
		const noiseGain = this.audioContext.createGain();
		noiseGain.gain.setValueAtTime(0.15 * this.getEffectiveVolume(), now);
		noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
		
		noise.connect(noiseFilter);
		noiseFilter.connect(noiseGain);
		noiseGain.connect(this.audioContext.destination);
		
		// Layer 2: Descending crunch tone
		const crunch = this.audioContext.createOscillator();
		const crunchGain = this.audioContext.createGain();
		crunch.connect(crunchGain);
		crunchGain.connect(this.audioContext.destination);
		
		const baseFreq = 600 + (count * 30);
		crunch.frequency.setValueAtTime(baseFreq, now);
		crunch.frequency.exponentialRampToValueAtTime(baseFreq * 0.3, now + duration);
		crunch.type = 'sawtooth';
		
		crunchGain.gain.setValueAtTime(0.2 * this.getEffectiveVolume(), now);
		crunchGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
		
		noise.start(now);
		noise.stop(now + duration);
		crunch.start(now);
		crunch.stop(now + duration);
	}

	/**
	 * Play explosion sound - powerful boom with shockwave
	 */
	playExplosion() {
		if (!this.canPlaySound()) return;
		
		const now = this.audioContext.currentTime;
		const duration = 0.5;
		
		// Layer 1: Very deep bass boom (lower frequency for deeper sound)
		const boom = this.audioContext.createOscillator();
		const boomGain = this.audioContext.createGain();
		boom.connect(boomGain);
		boomGain.connect(this.audioContext.destination);
		boom.frequency.setValueAtTime(80, now); // Lower from 120 to 80 Hz
		boom.frequency.exponentialRampToValueAtTime(20, now + duration); // Lower from 30 to 20 Hz
		boom.type = 'sine';
		boomGain.gain.setValueAtTime(0.5 * this.getEffectiveVolume(), now); // Increased volume
		boomGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
		
		// Layer 2: Harsh noise burst
		const bufferSize = this.audioContext.sampleRate * duration;
		const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
		const data = buffer.getChannelData(0);
		for (let i = 0; i < bufferSize; i++) {
			const decay = 1 - (i / bufferSize);
			data[i] = (Math.random() * 2 - 1) * decay;
		}
		
		const noise = this.audioContext.createBufferSource();
		noise.buffer = buffer;
		
		const filter = this.audioContext.createBiquadFilter();
		filter.type = 'bandpass';
		filter.frequency.setValueAtTime(2000, now);
		filter.frequency.exponentialRampToValueAtTime(200, now + duration);
		filter.Q.setValueAtTime(2, now);
		
		const noiseGain = this.audioContext.createGain();
		noiseGain.gain.setValueAtTime(0.35 * this.getEffectiveVolume(), now);
		noiseGain.gain.exponentialRampToValueAtTime(0.01, now + duration);
		
		noise.connect(filter);
		filter.connect(noiseGain);
		noiseGain.connect(this.audioContext.destination);
		
		// Layer 3: Sharp attack click
		const click = this.audioContext.createOscillator();
		const clickGain = this.audioContext.createGain();
		click.connect(clickGain);
		clickGain.connect(this.audioContext.destination);
		click.frequency.setValueAtTime(800, now);
		click.type = 'square';
		clickGain.gain.setValueAtTime(0.25 * this.getEffectiveVolume(), now);
		clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
		
		boom.start(now);
		boom.stop(now + duration);
		noise.start(now);
		noise.stop(now + duration);
		click.start(now);
		click.stop(now + 0.05);
	}

	/**
	 * Play cascade/combo sound
	 * @param {Number} level - Cascade level (1, 2, 3...)
	 */
	playCascade(level = 1) {
		if (!this.canPlaySound()) return;
		
		const now = this.audioContext.currentTime;
		const oscillator = this.audioContext.createOscillator();
		const gainNode = this.audioContext.createGain();
		
		oscillator.connect(gainNode);
		gainNode.connect(this.audioContext.destination);
		
		// Escalating pitch for higher cascades
		const baseFreq = 500 + (level * 100);
		oscillator.frequency.setValueAtTime(baseFreq, now);
		oscillator.frequency.exponentialRampToValueAtTime(baseFreq * 2, now + 0.2);
		oscillator.type = 'sawtooth';
		
		gainNode.gain.setValueAtTime(0.2 * this.getEffectiveVolume(), now);
		gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
		
		oscillator.start(now);
		oscillator.stop(now + 0.2);
	}

	/**
	 * Play level complete sound
	 */
	playLevelComplete() {
		if (!this.canPlaySound()) return;
		
		const now = this.audioContext.currentTime;
		
		// Ascending chord
		[523.25, 659.25, 783.99].forEach((freq, i) => {
			const oscillator = this.audioContext.createOscillator();
			const gainNode = this.audioContext.createGain();
			
			oscillator.connect(gainNode);
			gainNode.connect(this.audioContext.destination);
			
			oscillator.frequency.setValueAtTime(freq, now + i * 0.1);
			oscillator.type = 'sine';
			
			gainNode.gain.setValueAtTime(0.2 * this.getEffectiveVolume(), now + i * 0.1);
			gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.5);
			
			oscillator.start(now + i * 0.1);
			oscillator.stop(now + i * 0.1 + 0.5);
		});
	}

	/**
	 * Play game over sound
	 */
	playGameOver() {
		if (!this.canPlaySound()) return;
		
		const now = this.audioContext.currentTime;
		
		// Descending tone
		const oscillator = this.audioContext.createOscillator();
		const gainNode = this.audioContext.createGain();
		
		oscillator.connect(gainNode);
		gainNode.connect(this.audioContext.destination);
		
		oscillator.frequency.setValueAtTime(400, now);
		oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.5);
		oscillator.type = 'sawtooth';
		
		gainNode.gain.setValueAtTime(0.3 * this.getEffectiveVolume(), now);
		gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
		
		oscillator.start(now);
		oscillator.stop(now + 0.5);
	}

	/**
	 * Play celebration sound for big combos (5+ scoring events)
	 */
	playCelebration() {
		if (!this.canPlaySound()) return;
		
		const now = this.audioContext.currentTime;
		
		// Triumphant ascending arpeggio (major chord)
		const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
		notes.forEach((freq, i) => {
			const oscillator = this.audioContext.createOscillator();
			const gainNode = this.audioContext.createGain();
			
			oscillator.connect(gainNode);
			gainNode.connect(this.audioContext.destination);
			
			oscillator.frequency.setValueAtTime(freq, now + i * 0.08);
			oscillator.type = 'sine';
			
			gainNode.gain.setValueAtTime(0, now + i * 0.08);
			gainNode.gain.linearRampToValueAtTime(0.25 * this.getEffectiveVolume(), now + i * 0.08 + 0.02);
			gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.4);
			
			oscillator.start(now + i * 0.08);
			oscillator.stop(now + i * 0.08 + 0.4);
		});
		
		// Add sparkle layer
		for (let i = 0; i < 8; i++) {
			const time = now + (i * 0.05);
			const sparkle = this.audioContext.createOscillator();
			const sparkleGain = this.audioContext.createGain();
			
			sparkle.type = 'sine';
			sparkle.frequency.setValueAtTime(2000 + (i * 200), time);
			sparkle.connect(sparkleGain);
			sparkleGain.connect(this.audioContext.destination);
			
			sparkleGain.gain.setValueAtTime(0, time);
			sparkleGain.gain.linearRampToValueAtTime(0.1 * this.getEffectiveVolume(), time + 0.01);
			sparkleGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
			
			sparkle.start(time);
			sparkle.stop(time + 0.15);
		}
	}

	/**
	 * Play high score fanfare - epic celebration for new record
	 */
	playHighScoreFanfare() {
		if (!this.canPlaySound()) return;
		
		const now = this.audioContext.currentTime;
		
		// Triumphant fanfare chord progression
		const chordProgression = [
			[523.25, 659.25, 783.99],  // C Major
			[587.33, 739.99, 880.00],  // D Major
			[659.25, 830.61, 987.77],  // E Major
			[783.99, 987.77, 1174.66]  // G Major
		];
		
		// Play chord progression
		chordProgression.forEach((chord, chordIndex) => {
			const chordTime = now + (chordIndex * 0.3);
			
			chord.forEach(freq => {
				const oscillator = this.audioContext.createOscillator();
				const gainNode = this.audioContext.createGain();
				
				oscillator.connect(gainNode);
				gainNode.connect(this.audioContext.destination);
				
				oscillator.frequency.setValueAtTime(freq, chordTime);
				oscillator.type = 'sine';
				
				gainNode.gain.setValueAtTime(0, chordTime);
				gainNode.gain.linearRampToValueAtTime(0.15 * this.getEffectiveVolume(), chordTime + 0.05);
				gainNode.gain.setValueAtTime(0.15 * this.getEffectiveVolume(), chordTime + 0.25);
				gainNode.gain.exponentialRampToValueAtTime(0.01, chordTime + 0.5);
				
				oscillator.start(chordTime);
				oscillator.stop(chordTime + 0.5);
			});
		});
		
		// Add trumpet-like melody on top
		const melody = [523.25, 659.25, 783.99, 1046.50, 1174.66, 1318.51, 1568.00];
		melody.forEach((freq, i) => {
			const time = now + 0.4 + (i * 0.1);
			const trumpet = this.audioContext.createOscillator();
			const trumpetGain = this.audioContext.createGain();
			
			trumpet.type = 'sawtooth';
			trumpet.frequency.setValueAtTime(freq, time);
			trumpet.connect(trumpetGain);
			trumpetGain.connect(this.audioContext.destination);
			
			trumpetGain.gain.setValueAtTime(0, time);
			trumpetGain.gain.linearRampToValueAtTime(0.2 * this.getEffectiveVolume(), time + 0.02);
			trumpetGain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
			
			trumpet.start(time);
			trumpet.stop(time + 0.3);
		});
		
		// Add celebratory sparkles throughout
		for (let i = 0; i < 20; i++) {
			const time = now + 0.5 + (i * 0.08);
			const sparkle = this.audioContext.createOscillator();
			const sparkleGain = this.audioContext.createGain();
			
			sparkle.type = 'sine';
			sparkle.frequency.setValueAtTime(1500 + (Math.random() * 1000), time);
			sparkle.connect(sparkleGain);
			sparkleGain.connect(this.audioContext.destination);
			
			sparkleGain.gain.setValueAtTime(0, time);
			sparkleGain.gain.linearRampToValueAtTime(0.08 * this.getEffectiveVolume(), time + 0.01);
			sparkleGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
			
			sparkle.start(time);
			sparkle.stop(time + 0.2);
		}
		
		// Final cymbal crash
		const crashTime = now + 1.5;
		const bufferSize = this.audioContext.sampleRate * 1.5;
		const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
		const data = buffer.getChannelData(0);
		for (let j = 0; j < bufferSize; j++) {
			data[j] = (Math.random() * 2 - 1) * (1 - j / bufferSize);
		}
		
		const crash = this.audioContext.createBufferSource();
		crash.buffer = buffer;
		
		const crashFilter = this.audioContext.createBiquadFilter();
		crashFilter.type = 'highpass';
		crashFilter.frequency.setValueAtTime(4000, crashTime);
		
		const crashGain = this.audioContext.createGain();
		crashGain.gain.setValueAtTime(0.25 * this.getEffectiveVolume(), crashTime);
		crashGain.gain.exponentialRampToValueAtTime(0.001, crashTime + 1.5);
		
		crash.connect(crashFilter);
		crashFilter.connect(crashGain);
		crashGain.connect(this.audioContext.destination);
		
		crash.start(crashTime);
	}

	/**
	 * Play time warning alarm - soft beep for last 5 seconds
	 */
	playTimeWarning() {
		if (!this.canPlaySound()) return;
		
		const now = this.audioContext.currentTime;
		const oscillator = this.audioContext.createOscillator();
		const gainNode = this.audioContext.createGain();
		
		oscillator.connect(gainNode);
		gainNode.connect(this.audioContext.destination);
		
		// Soft beep at 880 Hz (A5)
		oscillator.frequency.setValueAtTime(880, now);
		oscillator.type = 'sine';
		
		gainNode.gain.setValueAtTime(0, now);
		gainNode.gain.linearRampToValueAtTime(0.15 * this.getEffectiveVolume(), now + 0.02);
		gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
		
		oscillator.start(now);
		oscillator.stop(now + 0.15);
	}

	/**
	 * Play stack danger alarm - dramatic warning for high stacks
	 */
	playStackDanger() {
		if (!this.canPlaySound()) return;
		
		const now = this.audioContext.currentTime;
		
		// Alternating two-tone alarm (like a siren)
		[800, 600, 800].forEach((freq, i) => {
			const time = now + (i * 0.1);
			const oscillator = this.audioContext.createOscillator();
			const gainNode = this.audioContext.createGain();
			
			oscillator.connect(gainNode);
			gainNode.connect(this.audioContext.destination);
			
			oscillator.frequency.setValueAtTime(freq, time);
			oscillator.type = 'square';
			
			gainNode.gain.setValueAtTime(0, time);
			gainNode.gain.linearRampToValueAtTime(0.25 * this.getEffectiveVolume(), time + 0.01);
			gainNode.gain.linearRampToValueAtTime(0, time + 0.1);
			
			oscillator.start(time);
			oscillator.stop(time + 0.1);
		});
	}

	/**
	 * Play UI click sound
	 */
	playClick() {
		if (!this.canPlaySound()) return;
		
		const now = this.audioContext.currentTime;
		const oscillator = this.audioContext.createOscillator();
		const gainNode = this.audioContext.createGain();
		
		oscillator.connect(gainNode);
		gainNode.connect(this.audioContext.destination);
		
		oscillator.frequency.setValueAtTime(800, now);
		oscillator.type = 'sine';
		
		gainNode.gain.setValueAtTime(0.1 * this.getEffectiveVolume(), now);
		gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
		
		oscillator.start(now);
		oscillator.stop(now + 0.05);
	}

	/**
	 * Start background music - upbeat game loop
	 */
	async startMusic() {
		console.log('AudioManager: startMusic called', {
			isInitialized: this.isInitialized,
			isMuted: this.isMuted,
			hasAudioContext: !!this.audioContext,
			contextState: this.audioContext?.state,
			musicPlaying: this.musicPlaying,
			musicVolume: this.musicVolume,
			canPlayMusic: this.canPlayMusic()
		});
		
		// Try to resume context if suspended
		if (this.audioContext && this.audioContext.state === 'suspended') {
			try {
				await this.audioContext.resume();
			} catch (error) {
				console.warn('AudioManager: Could not resume audio context', error);
			}
		}
		
		if (!this.canPlayMusic()) {
			console.log('AudioManager: Cannot play music - reasons:', {
				isInitialized: this.isInitialized,
				isMuted: this.isMuted,
				hasAudioContext: !!this.audioContext,
				musicVolume: this.musicVolume
			});
			return;
		}
		
		if (this.musicPlaying) {
			console.log('AudioManager: Music already playing');
			return;
		}
		
		// Ensure context is running
		await this.resume();
		
		this.musicPlaying = true;
		this._playMusicLoop();
	}

	/**
	 * Stop background music
	 */
	stopMusic() {
		this.musicPlaying = false;
		
		// Stop all music nodes
		this.musicNodes.forEach(node => {
			try {
				if (node.stop) node.stop();
				if (node.disconnect) node.disconnect();
			} catch (e) {
				// Node already stopped
			}
		});
		this.musicNodes = [];
		
		if (this.musicLoopId) {
			clearTimeout(this.musicLoopId);
			this.musicLoopId = null;
		}
	}

	/**
	 * Play the music loop (called recursively)
	 * @private
	 */
	_playMusicLoop() {
		
		if (!this.musicPlaying || !this.canPlayMusic()) return;
		
		const now = this.audioContext.currentTime;
		const tempo = 150; // BPM - even faster for rock energy
		const beatDuration = 60 / tempo;
		const measureDuration = beatDuration * 4;
		
		// Track loop count for variation
		if (!this.musicLoopCount) this.musicLoopCount = 0;
		const loopIndex = this.musicLoopCount % 8; // 8 different variations for more variety
		
		// Rock-oriented scale (minor pentatonic + blues notes)
		const scale = [261.63, 293.66, 311.13, 329.63, 349.23, 392.00, 440.00, 466.16, 523.25]; // C D Eb E F G A Bb C
		
		// More rock progressions: C5 - Bb5 - F5 - C5 - G5 - F5 - C5 - G5
		const powerChords = [
			[261.63, 392.00], // C5 (C G)
			[233.08, 349.23], // Bb5 (Bb F)
			[174.61, 261.63], // F5 (F C)
			[261.63, 392.00], // C5 (C G)
			[196.00, 293.66], // G5 (G D)
			[174.61, 261.63], // F5 (F C)
			[261.63, 392.00], // C5 (C G)
			[196.00, 293.66]  // G5 (G D)
		];
		
		const masterGain = this.audioContext.createGain();
		masterGain.gain.setValueAtTime(this.masterVolume * this.musicVolume, now);
		masterGain.connect(this.audioContext.destination);
		this.musicNodes.push(masterGain);
		
		// Driving bass line - eighth note gallop rhythm
		for (let measure = 0; measure < 2; measure++) {
			const chord = powerChords[(loopIndex + measure) % 8];
			const bassRoot = chord[0] * 0.5; // Root note
			
			// Galloping rhythm: long-short-short pattern
			const rhythmPattern = [
				{ beat: 0, duration: 0.5, volume: 0.35 },    // Strong
				{ beat: 0.5, duration: 0.25, volume: 0.25 }, // Quick
				{ beat: 0.75, duration: 0.25, volume: 0.25 }, // Quick
				{ beat: 1, duration: 0.5, volume: 0.35 },
				{ beat: 1.5, duration: 0.25, volume: 0.25 },
				{ beat: 1.75, duration: 0.25, volume: 0.25 },
				{ beat: 2, duration: 0.5, volume: 0.35 },
				{ beat: 2.5, duration: 0.25, volume: 0.25 },
				{ beat: 2.75, duration: 0.25, volume: 0.25 },
				{ beat: 3, duration: 0.5, volume: 0.35 },
				{ beat: 3.5, duration: 0.25, volume: 0.25 },
				{ beat: 3.75, duration: 0.25, volume: 0.25 }
			];
			
			rhythmPattern.forEach(({ beat, duration, volume: noteVolume }) => {
				const time = now + (measure * measureDuration) + (beat * beatDuration);
				const bass = this.audioContext.createOscillator();
				const bassGain = this.audioContext.createGain();
				
				bass.type = 'triangle';
				bass.frequency.setValueAtTime(bassRoot, time);
				bass.connect(bassGain);
				bassGain.connect(masterGain);
				
				bassGain.gain.setValueAtTime(0, time);
				bassGain.gain.linearRampToValueAtTime(noteVolume, time + 0.01);
				bassGain.gain.exponentialRampToValueAtTime(0.01, time + (duration * beatDuration * 0.8));
				
				bass.start(time);
				bass.stop(time + (duration * beatDuration));
				this.musicNodes.push(bass);
			});
		}
		
		// Power chord rhythm guitar - distorted sawtooth
		for (let measure = 0; measure < 2; measure++) {
			const chord = powerChords[(loopIndex + measure) % 8];
			
			// Palm-muted chugging on eighth notes
			for (let i = 0; i < 8; i++) {
				const time = now + (measure * measureDuration) + (i * beatDuration * 0.5);
				
				// Play both notes of the power chord
				chord.forEach((freq, idx) => {
					const guitar = this.audioContext.createOscillator();
					const distortion = this.audioContext.createWaveShaper();
					const guitarFilter = this.audioContext.createBiquadFilter();
					const guitarGain = this.audioContext.createGain();
					
					// Distortion curve for grit (reduced)
					const curve = new Float32Array(256);
					for (let j = 0; j < 256; j++) {
						const x = (j - 128) / 128;
						curve[j] = Math.tanh(x * 1.3) * 0.7; // Lighter clipping
					}
					distortion.curve = curve;
					
					guitar.type = 'sawtooth';
					guitar.frequency.setValueAtTime(freq, time);
					guitarFilter.type = 'lowpass';
					guitarFilter.frequency.setValueAtTime(2000, time);
					
					guitar.connect(distortion);
					distortion.connect(guitarFilter);
					guitarFilter.connect(guitarGain);
					guitarGain.connect(masterGain);
					
					// Tight, punchy envelope (palm-muted)
					const vol = (i % 2 === 0) ? 0.12 : 0.08; // Accent on downbeats
					guitarGain.gain.setValueAtTime(0, time);
					guitarGain.gain.linearRampToValueAtTime(vol, time + 0.005);
					guitarGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
					
					guitar.start(time);
					guitar.stop(time + 0.1);
					this.musicNodes.push(guitar);
				});
			}
		}
		
		// Lead melody - varied patterns with more rock attitude
		const melodyPatterns = [
			[0, 2, 3, 5, 8, 5, 3, 2, 0, 2, 3, 2, 0, 3, 5, 3], // Blues-rock lick 1
			[5, 3, 2, 0, 2, 3, 5, 6, 5, 3, 2, 3, 5, 8, 5, 3], // Ascending power
			[8, 5, 6, 5, 3, 2, 0, 2, 3, 5, 3, 2, 0, 2, 3, 5], // Descending riff
			[0, 3, 0, 5, 0, 3, 0, 6, 5, 3, 2, 0, 2, 3, 5, 3], // Rhythmic pattern
			[3, 5, 6, 8, 6, 5, 3, 5, 2, 3, 5, 3, 2, 0, 2, 3], // Fast run
			[5, 8, 5, 3, 5, 6, 5, 3, 2, 5, 3, 2, 0, 3, 5, 8], // Mixed intervals
			[0, 2, 3, 2, 0, 3, 5, 6, 5, 3, 2, 3, 5, 3, 2, 0], // Wave pattern
			[8, 6, 5, 3, 2, 3, 5, 6, 8, 5, 3, 5, 2, 0, 2, 3]  // Wide range
		];
		const melodyPattern = melodyPatterns[loopIndex % 8];
		
		for (let i = 0; i < 16; i++) {
			const time = now + (i * beatDuration * 0.5); // Eighth notes
			const noteIndex = melodyPattern[i];
			const freq = scale[noteIndex] * 2; // One octave up for lead
			
			const melody = this.audioContext.createOscillator();
			const melodyFilter = this.audioContext.createBiquadFilter();
			const melodyGain = this.audioContext.createGain();
			
			// Lead tone with some edge
			melody.type = 'triangle';
			melody.frequency.setValueAtTime(freq, time);
			
			// Resonant filter for character
			melodyFilter.type = 'bandpass';
			melodyFilter.frequency.setValueAtTime(freq * 2, time);
			melodyFilter.Q.setValueAtTime(3, time);
			
			melody.connect(melodyFilter);
			melodyFilter.connect(melodyGain);
			melodyGain.connect(masterGain);
			
			// Accent on downbeats and add vibrato on sustained notes
			const volume = (i % 4 === 0) ? 0.2 : 0.14;
			melodyGain.gain.setValueAtTime(0, time);
			melodyGain.gain.linearRampToValueAtTime(volume, time + 0.01);
			
			// Add slight vibrato on longer notes
			if (i % 4 === 3) {
				const vibrato = this.audioContext.createOscillator();
				const vibratoGain = this.audioContext.createGain();
				vibrato.frequency.setValueAtTime(5, time); // 5Hz vibrato
				vibratoGain.gain.setValueAtTime(3, time); // Subtle pitch variation
				vibrato.connect(vibratoGain);
				vibratoGain.connect(melody.frequency);
				vibrato.start(time);
				vibrato.stop(time + (beatDuration * 0.5));
				this.musicNodes.push(vibrato);
			}
			
			melodyGain.gain.exponentialRampToValueAtTime(0.01, time + (beatDuration * 0.45));
			
			melody.start(time);
			melody.stop(time + (beatDuration * 0.5));
			this.musicNodes.push(melody);
		}
		
		// Synth pad layer - removed for more rock sound, replaced with octave doubling
		for (let measure = 0; measure < 2; measure++) {
			const chord = powerChords[(loopIndex + measure) % 8];
			
			// Sustained power chord on whole notes
			const time = now + (measure * measureDuration);
			
			chord.forEach((freq, idx) => {
				const pad = this.audioContext.createOscillator();
				const padGain = this.audioContext.createGain();
				
				// Lower octave for thickness
				pad.type = 'sawtooth';
				pad.frequency.setValueAtTime(freq * 0.5, time);
				pad.connect(padGain);
				padGain.connect(masterGain);
				
				padGain.gain.setValueAtTime(0, time);
				padGain.gain.linearRampToValueAtTime(0.08, time + 0.2);
				padGain.gain.setValueAtTime(0.08, time + measureDuration - 0.2);
				padGain.gain.linearRampToValueAtTime(0, time + measureDuration);
				
				pad.start(time);
				pad.stop(time + measureDuration);
				this.musicNodes.push(pad);
			});
		}
		
		// Snare hits on beats 2 and 4 (rock backbeat)
		for (let measure = 0; measure < 2; measure++) {
			[1, 3].forEach(beat => {
				const time = now + (measure * measureDuration) + (beat * beatDuration);
				
				// Snare is noise with quick decay
				const bufferSize = this.audioContext.sampleRate * 0.1;
				const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
				const data = buffer.getChannelData(0);
				for (let j = 0; j < bufferSize; j++) {
					data[j] = (Math.random() * 2 - 1) * (1 - j / bufferSize);
				}
				
				const snare = this.audioContext.createBufferSource();
				snare.buffer = buffer;
				
				const snareFilter = this.audioContext.createBiquadFilter();
				snareFilter.type = 'highpass';
				snareFilter.frequency.setValueAtTime(1500, time);
				
				const snareGain = this.audioContext.createGain();
				snareGain.gain.setValueAtTime(0.3, time);
				snareGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
				
				snare.connect(snareFilter);
				snareFilter.connect(snareGain);
				snareGain.connect(masterGain);
				
				snare.start(time);
				this.musicNodes.push(snare);
			});
		}
		
		// Hi-hat rhythm - eighth notes for energy
		for (let i = 0; i < 16; i++) {
			const time = now + (i * beatDuration * 0.25); // Sixteenth notes
			
			// Create short noise burst for hi-hat
			const bufferSize = this.audioContext.sampleRate * 0.05;
			const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
			const data = buffer.getChannelData(0);
			for (let j = 0; j < bufferSize; j++) {
				data[j] = Math.random() * 2 - 1;
			}
			
			const hihat = this.audioContext.createBufferSource();
			hihat.buffer = buffer;
			
			const hihatFilter = this.audioContext.createBiquadFilter();
			hihatFilter.type = 'highpass';
			hihatFilter.frequency.setValueAtTime(8000, time);
			
			const hihatGain = this.audioContext.createGain();
			// More dynamic rhythm - accent every 4th note
			const volume = (i % 4 === 0) ? 0.08 : ((i % 2 === 0) ? 0.05 : 0.03);
			hihatGain.gain.setValueAtTime(volume, time);
			hihatGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
			
			hihat.connect(hihatFilter);
			hihatFilter.connect(hihatGain);
			hihatGain.connect(masterGain);
			
			hihat.start(time);
			this.musicNodes.push(hihat);
		}
		
		// Kick drum - driving rock pattern (four-on-the-floor with variations)
		for (let measure = 0; measure < 2; measure++) {
			// Different kick patterns for variation
			const kickPatterns = [
				[0, 1, 2, 3],           // Four on floor
				[0, 0.5, 2, 2.5, 3],    // Double kicks
				[0, 2, 3, 3.5],         // Syncopated
				[0, 1, 2, 2.75, 3.5]    // Complex rhythm
			];
			const pattern = kickPatterns[Math.floor(loopIndex / 2) % 4];
			
			pattern.forEach(beat => {
				const time = now + (measure * measureDuration) + (beat * beatDuration);
				
				const kick = this.audioContext.createOscillator();
				const kickGain = this.audioContext.createGain();
				
				kick.type = 'sine';
				kick.frequency.setValueAtTime(120, time);
				kick.frequency.exponentialRampToValueAtTime(35, time + 0.12);
				kick.connect(kickGain);
				kickGain.connect(masterGain);
				
				// Punchier kick
				kickGain.gain.setValueAtTime(0.5, time);
				kickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);
				
				kick.start(time);
				kick.stop(time + 0.18);
				this.musicNodes.push(kick);
			});
		}
		
		// Crash cymbal on measure 1 for emphasis
		if (loopIndex % 2 === 0) {
			const time = now;
			const bufferSize = this.audioContext.sampleRate * 0.8;
			const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
			const data = buffer.getChannelData(0);
			for (let j = 0; j < bufferSize; j++) {
				data[j] = (Math.random() * 2 - 1) * (1 - j / bufferSize);
			}
			
			const crash = this.audioContext.createBufferSource();
			crash.buffer = buffer;
			
			const crashFilter = this.audioContext.createBiquadFilter();
			crashFilter.type = 'highpass';
			crashFilter.frequency.setValueAtTime(3000, time);
			
			const crashGain = this.audioContext.createGain();
			crashGain.gain.setValueAtTime(0.15, time);
			crashGain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
			
			crash.connect(crashFilter);
			crashFilter.connect(crashGain);
			crashGain.connect(masterGain);
			
			crash.start(time);
			this.musicNodes.push(crash);
		}
		
		// Increment loop counter for variation
		this.musicLoopCount++;
		
		// Schedule next loop (2 measures = 8 beats)
		const loopDuration = measureDuration * 2;
		this.musicLoopId = setTimeout(() => {
			// Clean up old nodes
			this.musicNodes = this.musicNodes.filter(node => {
				try {
					// Keep nodes that are still scheduled
					return true;
				} catch (e) {
					return false;
				}
			});
			this._playMusicLoop();
		}, loopDuration * 1000);
	}

	/**
	 * Set master volume (0-1)
	 * @param {Number} volume
	 */
	setMasterVolume(volume) {
		this.masterVolume = Math.max(0, Math.min(1, volume));
		this.saveSettings();
	}

	/**
	 * Set SFX volume (0-1)
	 * @param {Number} volume
	 */
	setSFXVolume(volume) {
		this.sfxVolume = Math.max(0, Math.min(1, volume));
		this.saveSettings();
	}

	/**
	 * Set music volume (0-1)
	 * @param {Number} volume
	 */
	setMusicVolume(volume) {
		this.musicVolume = Math.max(0, Math.min(1, volume));
		this.saveSettings();
	}

	/**
	 * Toggle mute
	 */
	toggleMute() {
		this.isMuted = !this.isMuted;
		this.saveSettings();
		return this.isMuted;
	}

	/**
	 * Set mute state
	 * @param {Boolean} muted
	 */
	setMute(muted) {
		this.isMuted = muted;
		this.saveSettings();
	}

	/**
	 * Get effective volume for sound effects
	 * @returns {Number}
	 */
	getEffectiveVolume() {
		return this.masterVolume * this.sfxVolume;
	}

	/**
	 * Check if sound effects can be played
	 * @returns {Boolean}
	 */
	canPlaySound() {
		return this.isInitialized && !this.isMuted && this.audioContext && this.sfxVolume > 0;
	}
	
	/**
	 * Check if music can be played
	 * @returns {Boolean}
	 */
	canPlayMusic() {
		return this.isInitialized && !this.isMuted && this.audioContext && this.musicVolume > 0;
	}

	/**
	 * Save audio settings to localStorage
	 */
	saveSettings() {
		try {
			const settings = {
				masterVolume: this.masterVolume,
				sfxVolume: this.sfxVolume,
				musicVolume: this.musicVolume,
				isMuted: this.isMuted
			};
			localStorage.setItem('audioSettings', JSON.stringify(settings));
		} catch (error) {
			console.warn('AudioManager: Failed to save settings', error);
		}
	}

	/**
	 * Load audio settings from localStorage
	 */
	loadSettings() {
		try {
			const saved = localStorage.getItem('audioSettings');
			if (saved) {
				const settings = JSON.parse(saved);
				this.masterVolume = settings.masterVolume ?? 0.7;
				this.sfxVolume = settings.sfxVolume ?? 0.8;
				this.musicVolume = settings.musicVolume ?? 0;
				this.isMuted = settings.isMuted ?? false;
			}
		} catch (error) {
			console.warn('AudioManager: Failed to load settings', error);
		}
	}

	/**
	 * Get current settings
	 * @returns {Object}
	 */
	getSettings() {
		return {
			masterVolume: this.masterVolume,
			sfxVolume: this.sfxVolume,
			musicVolume: this.musicVolume,
			isMuted: this.isMuted
		};
	}
}

// Export singleton instance
const AudioManager = new AudioManagerClass();
export default AudioManager;
