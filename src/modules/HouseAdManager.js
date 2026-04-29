/**
 * ============================================================================
 * HouseAdManager.js - Orb•Fall: ChromaCrush
 * ============================================================================
 * Copyright (c) 2025-2026 G. Scott Tomlin. All Rights Reserved.
 *
 * Manages house advertisements shown when:
 *  - The device is offline (navigator.onLine === false)
 *  - config monetization.ads.provider === 'house'
 *  - config monetization.houseAds.onlyHouseAds === true
 *
 * All ads are fully self-contained with inline styles and no external
 * resources, so they render correctly when the device is offline.
 * Ads rotate on each display call, starting at a random position.
 *
 * @module HouseAdManager
 * ============================================================================
 */

/**
 * @typedef {Object} HouseAd
 * @property {string} id   - Unique identifier
 * @property {string} url  - Click-through URL
 * @property {function(): string} html - Returns a self-contained HTML string
 */

/** @type {HouseAd[]} */
const HOUSE_ADS = [
	// -------------------------------------------------------------------------
	// Gusto4Tech — fractional CTO, AI-native engineering, tech leadership
	// -------------------------------------------------------------------------
	{
		id: 'gusto4tech',
		url: 'https://gusto4tech.com',
		html() {
			const tags = ['Fractional CTO', 'AI Transformation', 'Agile Engineering', 'Security &amp; Compliance', 'Remote-First Culture'];
			const tagHtml = tags.map(s =>
				`<span style="background:#f1f5f9;color:#0369a1;font-size:clamp(0.6rem,1.6vw,0.72rem);padding:0.2em 0.55em;border-radius:3px;border:1px solid #bae6fd;white-space:nowrap;">${s}</span>`
			).join('');
			return `<a href="https://gusto4tech.com"
				target="_blank" rel="noopener noreferrer"
				style="display:flex;flex-direction:column;justify-content:center;gap:clamp(0.75rem,2.5%,1.25rem);width:100%;height:100%;min-height:180px;
				       text-decoration:none;background:#ffffff;color:#0f172a;
				       padding:clamp(1.25rem,4%,2rem) clamp(1.25rem,4%,2rem);
				       box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif;">
				<div style="display:flex;align-items:center;justify-content:space-between;">
					<img src="src/img/house-ads/gusto4tech-logo-sm.png"
					     alt="Gusto4Tech"
					     style="height:clamp(36px,8vw,56px);width:auto;object-fit:contain;flex-shrink:0;">
					<span style="font-size:clamp(0.62rem,1.6vw,0.7rem);text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">gusto4tech.com</span>
				</div>
				<div style="font-size:clamp(0.95rem,2.8vw,1.15rem);font-weight:600;line-height:1.35;color:#0f172a;">
					Leadership, Systems &amp; AI-Native Practices<br>
					<span style="color:#64748b;font-weight:400;font-size:0.9em;">for modern engineering organizations</span>
				</div>
				<div style="font-size:clamp(0.78rem,2.2vw,0.88rem);color:#475569;line-height:1.6;">
					Fractional CTO and engineering leadership for startups and scale-ups.
					Strategy, AI transformation, DevSecOps, and building high-performing teams that ship.
				</div>
				<div style="display:flex;flex-wrap:wrap;gap:0.4rem;">
					${tagHtml}
				</div>
				<div style="border-top:1px solid #e2e8f0;padding-top:0.65rem;display:flex;justify-content:space-between;align-items:center;">
					<span style="font-size:clamp(0.68rem,1.8vw,0.78rem);color:#94a3b8;">hello@gusto4tech.com</span>
					<span style="font-size:clamp(0.78rem,2vw,0.88rem);font-weight:600;color:#0284c7;">Get in touch &rarr;</span>
				</div>
			</a>`;
		}
	},

	// -------------------------------------------------------------------------
	// The Comics Place — comic shop in Bellingham, WA
	// -------------------------------------------------------------------------
	{
		id: 'comics-place',
		url: 'https://www.thecomicsplace.com',
		html() {
			return `<a href="https://www.thecomicsplace.com"
				target="_blank" rel="noopener noreferrer"
				style="display:flex;flex-direction:column;justify-content:center;gap:clamp(0.75rem,2.5%,1.25rem);width:100%;height:100%;min-height:180px;
				       text-decoration:none;background:#12082a;color:#f8f7ff;
				       padding:clamp(1.25rem,4%,2rem) clamp(1.25rem,4%,2rem);
				       box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif;
				       border-left:4px solid #e63946;">
				<div style="display:flex;align-items:center;justify-content:space-between;">
					<img src="src/img/house-ads/thecomicsplace-logo.png"
					     alt="The Comics Place"
					     style="height:clamp(36px,8vw,56px);width:auto;object-fit:contain;flex-shrink:0;">
					<span style="font-size:clamp(0.68rem,1.8vw,0.78rem);font-weight:700;color:#e63946;text-transform:uppercase;letter-spacing:0.1em;">Bellingham, WA</span>
				</div>
				<div style="font-size:clamp(0.9rem,2.5vw,1.05rem);font-weight:600;color:#f8f7ff;line-height:1.3;">
					Comics &middot; Graphic Novels &middot; Board Games &middot; RPGs
				</div>
				<div style="font-size:clamp(0.78rem,2.2vw,0.88rem);color:#cbd5e1;line-height:1.6;">
					New releases every week. Pull subscriptions, key issues, back issues,
					and in-store auctions. We buy comics too.
				</div>
				<div style="background:#1e0f3a;border-radius:4px;padding:clamp(0.5rem,2%,0.75rem) 0.75rem;
				            display:flex;align-items:center;justify-content:space-between;gap:0.5rem;flex-wrap:wrap;">
					<span style="font-size:clamp(0.72rem,2vw,0.82rem);color:#ffd60a;font-weight:700;">&#10003; Free Local Delivery</span>
					<span style="font-size:clamp(0.68rem,1.8vw,0.78rem);color:#94a3b8;">shop.thecomicsplace.com</span>
				</div>
			</a>`;
		}
	},

	// -------------------------------------------------------------------------
	// Venture Mechanics — startup community, events, accelerator (Seattle/Bellevue)
	// -------------------------------------------------------------------------
	{
		id: 'venture-mechanics',
		url: 'https://venturemechanics.com',
		html() {
			const tags = ['Founder Events', 'Pitch Competitions', 'Investor Access', 'Catapult Accelerator', 'Mentorship'];
			const tagHtml = tags.map(s =>
					`<span style="background:#fff3ec;color:#c2410c;font-size:clamp(0.6rem,1.6vw,0.7rem);padding:0.2em 0.55em;border-radius:3px;border:1px solid #fed7aa;white-space:nowrap;">${s}</span>`
			).join('');
			return `<a href="https://venturemechanics.com"
				target="_blank" rel="noopener noreferrer"
				style="display:flex;flex-direction:column;justify-content:center;gap:clamp(0.75rem,2.5%,1.25rem);width:100%;height:100%;min-height:180px;
				       text-decoration:none;background:#ffffff;color:#1e3a5f;
				       padding:clamp(1.25rem,4%,2rem) clamp(1.25rem,4%,2rem);
				       box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif;">
				<div style="display:flex;align-items:center;justify-content:space-between;">
					<img src="src/img/house-ads/venturemechanics-logo.png"
					     alt="Venture Mechanics"
					     style="height:clamp(40px,9vw,64px);width:auto;object-fit:contain;flex-shrink:0;">
					<span style="background:#f97316;color:#fff;font-size:clamp(0.58rem,1.5vw,0.68rem);font-weight:700;text-transform:uppercase;letter-spacing:0.07em;padding:0.25em 0.65em;border-radius:3px;white-space:nowrap;flex-shrink:0;">Seattle &middot; Bellevue</span>
				</div>
				<div style="font-size:clamp(0.92rem,2.6vw,1.1rem);font-weight:600;color:#1e3a5f;line-height:1.35;">
					Fueling Venture-Scale Success with<br>Education, Community &amp; Capital
				</div>
				<div style="font-size:clamp(0.78rem,2.2vw,0.88rem);color:#4b5563;line-height:1.6;">
					200+ events per year for founders, investors, and mentors.
					Catapult Accelerator, pitch competitions, and Founder Workshops
					for ventures from pre-seed through Series&nbsp;A.
				</div>
				<div style="display:flex;flex-wrap:wrap;gap:0.4rem;">
					${tagHtml}
				</div>
				<div style="border-top:1px solid #e5e7eb;padding-top:0.65rem;display:flex;justify-content:space-between;align-items:center;">
					<span style="font-size:clamp(0.66rem,1.8vw,0.76rem);color:#6b7280;">venturemechanics.com</span>
					<span style="font-size:clamp(0.78rem,2vw,0.88rem);font-weight:600;color:#f97316;">Join Our Community &rarr;</span>
				</div>
			</a>`;
		}
	}
];

/** Rotation index, seeded randomly so each session starts on a different ad. */
let _rotationIndex = Math.floor(Math.random() * HOUSE_ADS.length);

class HouseAdManagerClass {

	/**
	 * Return the next house ad in round-robin rotation.
	 * @returns {HouseAd}
	 */
	getNextAd() {
		const ad = HOUSE_ADS[_rotationIndex];
		_rotationIndex = (_rotationIndex + 1) % HOUSE_ADS.length;
		return ad;
	}

	/**
	 * Create and return a DOM element containing the next house ad.
	 * The element uses flex layout to fill its container.
	 * @returns {HTMLElement}
	 */
	renderAdElement() {
		const ad = this.getNextAd();
		const wrapper = document.createElement('div');
		wrapper.style.cssText = 'display:flex;flex-direction:column;width:100%;height:100%;';
		wrapper.dataset.houseAdId = ad.id;
		wrapper.innerHTML = ad.html();
		return wrapper;
	}

	/**
	 * Return all registered house ads (used for testing/preview).
	 * @returns {HouseAd[]}
	 */
	getAllAds() {
		return HOUSE_ADS;
	}
}

const HouseAdManager = new HouseAdManagerClass();

export default HouseAdManager;
export { HouseAdManager };
