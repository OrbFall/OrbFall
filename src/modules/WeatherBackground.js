/**
 * WeatherBackground.js
 * 
 * Description: Fetches local weather based on IP geolocation and applies dynamic backgrounds
 * 
 * Dependencies: None
 * 
 * Exports: WeatherBackground singleton
 */

class WeatherBackgroundClass {
	constructor() {
		this.currentWeather = null;
		this.backgroundElement = null;
		this.lastUpdate = null;
		this.updateInterval = 30 * 60 * 1000; // Update every 30 minutes
		this.onWeatherUpdate = null; // Callback for when weather updates
	}

	/**
	 * Initialize weather background system
	 */
	async initialize() {
		
		// Create background element
		this.createBackgroundElement();
		
		// Fetch initial weather
		await this.updateWeather();
		
		// Set up periodic updates
		setInterval(() => this.updateWeather(), this.updateInterval);
	}

	/**
	 * Create the background DOM element
	 */
	createBackgroundElement() {
		this.backgroundElement = document.getElementById('weatherBackground');
		
		if (!this.backgroundElement) {
			this.backgroundElement = document.createElement('div');
			this.backgroundElement.id = 'weatherBackground';
			this.backgroundElement.className = 'weather-background';
			
			// Create effects container
			const effectsContainer = document.createElement('div');
			effectsContainer.className = 'weather-effects';
			this.backgroundElement.appendChild(effectsContainer);
			
			// Insert as first child of app to be behind everything
			const app = document.getElementById('app');
			if (app && app.firstChild) {
				app.insertBefore(this.backgroundElement, app.firstChild);
			} else if (app) {
				app.appendChild(this.backgroundElement);
			}
		}
	}

	/**
	 * Fetch weather data and update background
	 */
	async updateWeather() {
		try {
			
			// Use ipapi.co for IP geolocation (free, no API key required)
			const geoResponse = await fetch('https://ipapi.co/json/');
			const geoData = await geoResponse.json();
			
			if (!geoData.latitude || !geoData.longitude) {
				console.warn('WeatherBackground: Could not get location, using default');
				this.applyDefaultBackground();
				return;
			}

			// Use Open-Meteo API (free, no API key required)
			// Request both Celsius and Fahrenheit
			const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${geoData.latitude}&longitude=${geoData.longitude}&current=temperature_2m,weather_code,is_day,cloud_cover&temperature_unit=celsius&daily=sunrise,sunset&timezone=auto`;
			const weatherResponse = await fetch(weatherUrl);
			const weatherData = await weatherResponse.json();

			if (weatherData.current) {
				const tempC = Math.round(weatherData.current.temperature_2m);
				const tempF = Math.round((tempC * 9/5) + 32);
				
				this.currentWeather = {
					temperatureC: tempC,
					temperatureF: tempF,
					weatherCode: weatherData.current.weather_code,
					isDay: weatherData.current.is_day === 1,
					cloudCover: weatherData.current.cloud_cover || 0,
					location: `${geoData.city}, ${geoData.region}`,
					timestamp: new Date()
				};

				this.applyWeatherBackground();
				this.lastUpdate = Date.now();
				
				// Trigger callback if set
				if (this.onWeatherUpdate) {
					this.onWeatherUpdate(this.currentWeather);
				}
			}
		} catch (error) {
			console.error('WeatherBackground: Error fetching weather', error);
			this.applyDefaultBackground();
		}
	}

	/**
	 * Apply background based on weather conditions
	 */
	applyWeatherBackground() {
		if (!this.currentWeather || !this.backgroundElement) return;

		const { weatherCode, isDay, cloudCover } = this.currentWeather;
		const condition = this.getWeatherCondition(weatherCode);
		
		// Remove all weather classes
		this.backgroundElement.className = 'weather-background';
		
		// Add time of day class
		this.backgroundElement.classList.add(isDay ? 'day' : 'night');
		
		// Add weather condition class
		this.backgroundElement.classList.add(condition);
		
		// Apply weather effects
		this.applyWeatherEffects(condition, isDay, cloudCover);
	}
	
	/**
	 * Apply animated weather effects
	 */
	applyWeatherEffects(condition, isDay, cloudCover) {
		const effectsContainer = this.backgroundElement.querySelector('.weather-effects');
		if (!effectsContainer) return;
		
		// Clear existing effects
		effectsContainer.innerHTML = '';
		
		// Apply condition-specific effects
		switch (condition) {
			case 'clear':
				if (isDay) {
					this.addSun(effectsContainer);
				} else {
					this.addMoon(effectsContainer);
					this.addStars(effectsContainer, 100);
				}
				break;
				
			case 'cloudy':
				this.addClouds(effectsContainer, Math.max(3, Math.floor(cloudCover / 20)));
				if (!isDay) {
					this.addMoon(effectsContainer);
					this.addStars(effectsContainer, 30);
				}
				break;
				
			case 'rainy':
				this.addClouds(effectsContainer, 5);
				this.addRain(effectsContainer, 150);
				break;
				
			case 'snowy':
				this.addClouds(effectsContainer, 4);
				this.addSnow(effectsContainer, 80);
				break;
				
			case 'stormy':
				this.addClouds(effectsContainer, 6);
				this.addRain(effectsContainer, 200);
				this.addLightning(effectsContainer);
				break;
				
			case 'foggy':
				this.addFog(effectsContainer);
				if (!isDay) {
					this.addMoon(effectsContainer);
					this.addStars(effectsContainer, 20);
				}
				break;
		}
	}
	
	/**
	 * Add sun element
	 */
	addSun(container) {
		const sun = document.createElement('div');
		sun.className = 'weather-sun';
		container.appendChild(sun);
	}
	
	/**
	 * Add moon element with current phase
	 */
	addMoon(container) {
		const moon = document.createElement('div');
		moon.className = 'weather-moon';
		
		// Calculate moon phase using a known reference new moon (Jan 6, 2000 18:14 UTC)
		// and the mean synodic period of 29.53058867 days.
		const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);
		const SYNODIC_DAYS = 29.53058867;
		const elapsed = (Date.now() - KNOWN_NEW_MOON) / (1000 * 60 * 60 * 24);
		const cyclePos = ((elapsed % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS;
		const phase = Math.floor((cyclePos / SYNODIC_DAYS) * 8); // 0-7 phases
		moon.setAttribute('data-phase', phase);

		// Apply phase shadow overlay using a pseudo-element trick via inline style.
		// We use a dark inset box-shadow on a ::before overlay to mask the unlit portion.
		// Phases: 0=new, 1=waxing crescent, 2=first quarter, 3=waxing gibbous,
		//         4=full,  5=waning gibbous,  6=last quarter,  7=waning crescent
		//
		// Strategy: place a dark overlay circle whose horizontal offset represents
		// how much of the moon is in shadow.  Negative X = shadow from left (waning),
		// positive X = shadow from right (waxing).
		//
		// moonRadius = 40px (half of 80px).  The shadow circle matches that size.
		// offset range: -80px (fully lit from right) to +80px (fully lit from left).
		const MOON_R = 40; // px — half of the 80px element
		const applyMoonPhase = (el, p) => {
			// Fraction of cycle: 0 = new moon, 0.5 = full moon
			const frac = cyclePos / SYNODIC_DAYS; // 0..1
			const angle = frac * 2 * Math.PI; // radians, 0 = new, π = full

			// Illumination fraction (0 = new, 1 = full)
			const illum = (1 - Math.cos(angle)) / 2;

			if (illum < 0.02) {
				// New moon — nearly invisible
				el.style.opacity = '0.08';
				el.style.boxShadow = 'none';
				return;
			}
			if (illum > 0.98) {
				// Full moon — no overlay needed, default CSS applies
				el.style.opacity = '1';
				return;
			}

			// Amount of horizontal shift for the shadow disc:
			// Waxing (frac < 0.5): shadow covers left side → positive offsetX
			// Waning (frac > 0.5): shadow covers right side → negative offsetX
			// At quarter (frac=0.25 / 0.75) shadow edge sits at centre (offset = 0).
			// At new moon (frac→0) shadow covers entire disc (offset = MOON_R).
			// At full moon (frac→0.5) shadow is gone (offset = -MOON_R).
			let offsetX;
			const halfCycle = frac < 0.5;
			if (halfCycle) {
				// Waxing: 0→0.5 maps offsetX from +MOON_R → -MOON_R
				offsetX = MOON_R - frac * 4 * MOON_R;
			} else {
				// Waning: 0.5→1 maps offsetX from -MOON_R → +MOON_R
				offsetX = -MOON_R + (frac - 0.5) * 4 * MOON_R;
			}

			// Dark overlay via an inset box-shadow with spread matching the disc.
			// We wrap the moon in a container that clips overflow so the shadow
			// doesn't bleed outside the circle.
			el.style.overflow = 'hidden';
			// Inner shadow trick: a large inset shadow shifted horizontally
			const shadowColor = 'rgba(10, 15, 40, 0.92)';
			const spread = MOON_R; // covers half the disc at quarter phase
			el.style.boxShadow = `inset ${offsetX}px 0 0 ${spread}px ${shadowColor}, 0 0 40px rgba(255,255,255,0.4), 0 0 80px rgba(255,255,255,0.2)`;
		};

		applyMoonPhase(moon, phase);
		
		container.appendChild(moon);
	}
	
	/**
	 * Add stars
	 */
	addStars(container, count) {
		for (let i = 0; i < count; i++) {
			const star = document.createElement('div');
			star.className = 'weather-star';
			star.style.left = Math.random() * 100 + '%';
			star.style.top = Math.random() * 100 + '%';
			star.style.animationDelay = Math.random() * 3 + 's';
			star.style.animationDuration = (Math.random() * 2 + 2) + 's';
			container.appendChild(star);
		}
	}
	
	/**
	 * Add clouds
	 */
	addClouds(container, count) {
		for (let i = 0; i < count; i++) {
			const cloud = document.createElement('div');
			cloud.className = 'weather-cloud';
			cloud.style.left = Math.random() * 100 + '%';
			cloud.style.top = (Math.random() * 40) + '%';
			cloud.style.animationDelay = Math.random() * 20 + 's';
			cloud.style.animationDuration = (Math.random() * 40 + 40) + 's';
			cloud.style.opacity = 0.3 + Math.random() * 0.4;
			cloud.style.transform = `scale(${0.5 + Math.random() * 0.8})`;
			container.appendChild(cloud);
		}
	}
	
	/**
	 * Add rain effect
	 */
	addRain(container, count) {
		for (let i = 0; i < count; i++) {
			const drop = document.createElement('div');
			drop.className = 'weather-rain';
			drop.style.left = Math.random() * 100 + '%';
			drop.style.animationDelay = Math.random() * 2 + 's';
			drop.style.animationDuration = (Math.random() * 0.3 + 0.5) + 's';
			container.appendChild(drop);
		}
	}
	
	/**
	 * Add snow effect
	 */
	addSnow(container, count) {
		for (let i = 0; i < count; i++) {
			const flake = document.createElement('div');
			flake.className = 'weather-snow';
			flake.style.left = Math.random() * 100 + '%';
			flake.style.animationDelay = Math.random() * 5 + 's';
			flake.style.animationDuration = (Math.random() * 3 + 3) + 's';
			flake.style.fontSize = (Math.random() * 10 + 10) + 'px';
			flake.textContent = ['❄', '❅', '❆'][Math.floor(Math.random() * 3)];
			container.appendChild(flake);
		}
	}
	
	/**
	 * Add lightning effect
	 */
	addLightning(container) {
		const lightning = document.createElement('div');
		lightning.className = 'weather-lightning';
		container.appendChild(lightning);
	}
	
	/**
	 * Add fog effect
	 */
	addFog(container) {
		for (let i = 0; i < 3; i++) {
			const fog = document.createElement('div');
			fog.className = 'weather-fog';
			fog.style.animationDelay = (i * 5) + 's';
			container.appendChild(fog);
		}
	}

	/**
	 * Convert WMO weather code to condition category
	 * @param {Number} code - WMO weather code
	 * @returns {String} - Weather condition category
	 */
	getWeatherCondition(code) {
		// WMO Weather interpretation codes
		if (code === 0) return 'clear';
		if (code <= 3) return 'cloudy';
		if (code >= 45 && code <= 48) return 'foggy';
		if (code >= 51 && code <= 67) return 'rainy';
		if (code >= 71 && code <= 77) return 'snowy';
		if (code >= 80 && code <= 82) return 'rainy';
		if (code >= 85 && code <= 86) return 'snowy';
		if (code >= 95 && code <= 99) return 'stormy';
		return 'cloudy';
	}

	/**
	 * Apply default background (clear day)
	 */
	applyDefaultBackground() {
		if (!this.backgroundElement) return;
		
		this.backgroundElement.className = 'weather-background day clear';
		console.log('WeatherBackground: Applied default background');
	}

	/**
	 * Get current weather info
	 * @returns {Object|null}
	 */
	getCurrentWeather() {
		return this.currentWeather;
	}
}

// Export singleton instance
const WeatherBackground = new WeatherBackgroundClass();
export default WeatherBackground;
