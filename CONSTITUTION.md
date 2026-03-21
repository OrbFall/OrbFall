# Ball Drop Puzzle Game - Project Constitution

**Version:** 1.0  
**Ratified:** February 2026  
**Status:** Living Document

---

## Preamble

This constitution establishes the foundational principles, values, and governance framework for the Ball Drop Puzzle Game project. It serves as the guiding document for all development decisions, feature additions, and community interactions.

---

## Article I: Mission & Vision

### Section 1: Mission Statement
To create an accessible, engaging, and ethical puzzle game that brings joy to players while respecting their time, privacy, and intelligence.

### Section 2: Vision
We envision a game that:
- Provides endless entertainment through skill-based progression
- Respects player autonomy and privacy
- Operates transparently with clear, fair monetization
- Remains accessible to all, regardless of financial contribution
- Evolves based on community feedback and creativity

---

## Article II: Core Values

### Section 1: Player-First Design
**Principle:** Every decision prioritizes player experience over revenue maximization.

**Implementation:**
- Gameplay is never blocked behind paywalls
- Ads are non-intrusive and respect player time
- No predatory monetization tactics (loot boxes, pay-to-win, FOMO mechanics)
- No data collection beyond essential LocalStorage
- No tracking, analytics sold to third parties, or invasive metrics

### Section 2: Transparency
**Principle:** All systems, mechanics, and monetization are transparent and understandable.

**Implementation:**
- Open-source codebase (permissive license)
- Clear documentation of all game mechanics
- Honest communication about revenue and costs
- No hidden algorithms or mysterious mechanics
- Changelog maintained for all updates

### Section 3: Accessibility
**Principle:** The game should be playable by as many people as possible.

**Implementation:**
- Works on modern browsers without installation
- Progressive Web App for offline access
- No account required to play
- Keyboard and touch controls
- No mandatory social features
- Colorblind-friendly palette options (future)
- Configurable difficulty settings

### Section 4: Ethical Monetization
**Principle:** Revenue generation must never compromise user experience or dignity.

**Implementation:**
- Ads are clearly marked and skippable
- Donations are voluntary, appreciated, and rewarded fairly
- No manipulation through dark patterns
- Ad-free option available through fair contribution
- No selling of user data
- No aggressive remarketing or retargeting

### Section 5: Quality Over Quantity
**Principle:** Features are complete, tested, and polished before release.

**Implementation:**
- Prefer fewer excellent features over many mediocre ones
- Test thoroughly before deployment
- Maintain clean, documented codebase
- Fix bugs before adding features
- Honor the "Definition of Done"

### Section 6: Community Respect
**Principle:** Players are partners in the game's evolution, not resources to extract value from.

**Implementation:**
- Listen to feedback genuinely
- Give credit for community contributions
- No exploitation of whale behavior
- Treat support requests with respect
- Foster positive, inclusive community

---

## Article III: Technical Principles

### Section 1: Code Standards

**Mandatory:**
- Vanilla JavaScript (ES6+) for core functionality
- Modular architecture (separation of concerns)
- Comprehensive JSDoc documentation
- Unit tests for core systems
- DRY (Don't Repeat Yourself) principle
- SOLID design patterns
- Meaningful variable/function names
- Comments explaining "why" not "what"

**Preferred:**
- Functional programming where appropriate
- Event-driven architecture
- Immutable data patterns
- Performance optimization
- Lazy loading of non-critical features

### Section 2: Performance Requirements

**Baseline:**
- 60 FPS during active gameplay
- < 3 second initial load time
- < 100ms input latency
- Zero gameplay lag from ads
- Graceful degradation on slower devices

**Optimization:**
- Minimize DOM manipulation
- Use requestAnimationFrame for animations
- Efficient collision detection
- Debounce/throttle heavy operations
- Cache computed values

### Section 3: Platform Support

**Supported:**
- Chromium-based browsers (Chrome, Edge, Brave, Opera)
- Desktop and mobile viewports
- Online and offline (PWA)
- Touch and keyboard input

**Not Supported (At This Time):**
- Internet Explorer
- Safari (best-effort compatibility)
- Firefox (best-effort compatibility)
- Legacy mobile browsers

### Section 4: Data Privacy

**Allowed:**
- LocalStorage for game state
- LocalStorage for high scores
- LocalStorage for settings
- Anonymous analytics (opt-in only)

**Prohibited:**
- Cookies for tracking
- Third-party analytics without consent
- Selling user data
- Fingerprinting users
- Collecting personally identifiable information

---

## Article IV: Feature Development Process

### Section 1: Feature Proposal

**Requirements:**
1. Clear problem statement or opportunity
2. Proposed solution with alternatives considered
3. Impact assessment (UX, performance, code complexity)
4. Alignment with core values
5. Implementation estimate

**Approval Criteria:**
- Enhances player experience
- Technically feasible
- Maintainable long-term
- Doesn't compromise performance
- Aligns with constitution

### Section 2: Implementation Standards

**Definition of Done:**
- Feature implemented to specification
- Unit tests written and passing
- Integration tests passing
- Documentation updated
- Performance benchmarks met
- Code reviewed
- No critical bugs
- User-facing documentation updated

### Section 3: Release Process

**Pre-Release:**
1. Feature complete and tested
2. Changelog updated
3. Service worker version incremented
4. Cross-browser testing complete
5. Performance validated
6. Lighthouse audit passing

**Post-Release:**
1. Monitor for issues (48 hours)
2. Collect user feedback
3. Track key metrics
4. Address critical bugs within 24 hours

---

## Article V: Monetization Governance

### Section 1: Advertising Rules

**Mandatory Constraints:**
- No ads during active gameplay
- Interstitials only at natural breaks (game over, level complete)
- Frequency caps enforced
- Skip option after 5 seconds maximum
- No audio ads without user initiation
- No malware/misleading ads
- Remove immediately if user reports bad ad

**Review Requirements:**
- Quarterly review of ad performance
- Remove ad network if complaints exceed 5% of players
- Never sacrifice UX for marginal revenue gains

### Section 2: Donation Guidelines

**Buy Me a Coffee:**
- Clearly voluntary and optional
- Never guilt-trip or manipulate
- Fair ad-free periods for contributions
- Public thank-you (optional, with permission)
- Appreciation gifts proportional to contribution
- Never promise exclusive gameplay advantages

**Supporter Benefits (Allowed):**
- Ad removal for defined period
- Cosmetic customization (themes, colors)
- Special badge/icon
- Early access to features (timed exclusive, not permanent)
- Name in credits (opt-in)

**Supporter Benefits (Prohibited):**
- Gameplay advantages
- Exclusive levels that will never be free
- Priority matchmaking (if multiplayer added)
- Additional moves/lives
- Faster progression

### Section 3: Revenue Allocation

**Commitment:**
- Transparent reporting (quarterly summary)
- Reinvestment priorities:
  1. Hosting and infrastructure costs
  2. Development tools and resources
  3. Feature development
  4. Community events/prizes
  5. Charitable contributions (10% of net revenue)

---

## Article VI: Decision-Making Framework

### Section 1: Constitutional Authority

**Hierarchy:**
1. **This Constitution:** Supreme authority
2. **Functional Specification:** Technical requirements aligned with constitution
3. **Implementation Plan:** Execution details following specifications
4. **Player Feedback:** Informs but doesn't override core values

### Section 2: Amendment Process

**Minor Amendments:**
- Clarifications and non-substantive edits
- Version bump to X.Y (e.g., 1.1)
- Document in changelog

**Major Amendments:**
- Changes to core values or principles
- Require version bump to X.0 (e.g., 2.0)
- Requires community input if player base > 100 active users
- 7-day comment period before ratification
- Clearly document reasoning

### Section 3: Conflict Resolution

**When Values Conflict:**
1. Player-first design takes precedence
2. Long-term sustainability over short-term gains
3. Quality over quantity
4. Simplicity over complexity
5. Transparency over convenience

**Example Scenarios:**

**Scenario:** Ad network offers 2x revenue but requires auto-playing video.  
**Resolution:** Reject. Violates player-first design and ad rules.

**Scenario:** Popular feature request conflicts with performance requirements.  
**Resolution:** Find optimized solution or defer until technical solution found.

**Scenario:** LemonSqueezy license holder requests pay-to-win feature.  
**Resolution:** Politely decline. Offer alternative supporter benefits.

---

## Article VII: Community Guidelines

### Section 1: Code of Conduct

**Expected:**
- Respectful communication
- Constructive feedback
- Good faith engagement
- Credit for contributions
- Inclusive language

**Prohibited:**
- Harassment or abuse
- Spam or self-promotion
- Hate speech
- Exploitation of vulnerabilities for malicious purposes
- Impersonation

### Section 2: Contribution Guidelines

**Welcome Contributions:**
- Bug reports with reproduction steps
- Feature suggestions with reasoning
- Code contributions (pull requests)
- Documentation improvements
- Translation assistance (future)
- Playtesting and feedback

**Contribution Process:**
1. Check existing issues/proposals
2. Discuss major changes before implementing
3. Follow code standards
4. Include tests
5. Update documentation
6. Respect constitutional principles

---

## Article VIII: Maintenance & Sustainability

### Section 1: Long-Term Commitment

**Guaranteed (While Feasible):**
- Game remains playable offline via PWA
- No forced updates that break saved games
- LocalStorage data remains compatible across versions
- Core gameplay always free
- Ad-free mode honored for full duration

**Best Effort:**
- Regular updates and improvements
- Bug fixes within 7 days
- Security patches within 24 hours
- Response to support requests within 48 hours

### Section 2: End-of-Life Plan

**If Project Becomes Unsustainable:**
1. Announce decision 90 days in advance
2. Remove ads completely
3. Release final stable version
4. Document self-hosting instructions
5. Transfer ownership to interested maintainer (if available)
6. Archive repository with clear status

**Never:**
- Abandon abruptly without notice
- Sell player data to recoup costs
- Introduce predatory monetization in final days
- Break existing ad-free commitments

---

## Article IX: Versioning & Changelog

### Section 1: Semantic Versioning

**Format:** MAJOR.MINOR.PATCH

**Definitions:**
- **MAJOR:** Breaking changes, core gameplay revisions, new game modes
- **MINOR:** New features, significant improvements, constitution amendments
- **PATCH:** Bug fixes, minor tweaks, performance improvements

### Section 2: Changelog Requirements

**Every Release Must Document:**
- Version number and date
- Category (Added/Changed/Fixed/Removed)
- User-facing impact
- Breaking changes highlighted
- Migration instructions if needed

---

## Article X: Legal & Licensing

### Section 1: Open Source Commitment

**License:** MIT License (or similar permissive license)

**Rights Granted:**
- Use for personal/commercial purposes
- Modify and remix
- Distribute and sublicense
- Private use

**Requirements:**
- Include original copyright notice
- Include license text
- No warranty provided

### Section 2: Asset Attribution

**Requirement:**
- Credit external assets appropriately
- Use only licensed/public domain assets
- Maintain attribution file
- Respect licensing terms

---

## Article XI: Metrics & Success

### Section 1: Key Performance Indicators

**Player-Centric:**
- Average session length
- Return rate (7-day)
- Player satisfaction (feedback sentiment)
- Bug report frequency
- Install-to-active ratio (PWA)

**Technical:**
- Load time (p95)
- Frame rate (p50)
- Error rate
- Service worker hit rate
- Offline usage percentage

**Financial:**
- Monthly ad revenue
- LemonSqueezy license sales
- Hosting costs
- Revenue growth rate
- Ad-free conversion rate

### Section 2: Success Definition

**True Success Indicators:**
- Players recommend voluntarily
- Positive gameplay metrics (retention, session length)
- Sustainable revenue > hosting costs
- Community engagement and contributions
- Personal satisfaction in maintaining quality

**False Success Indicators:**
- Revenue at expense of UX
- Viral growth through dark patterns
- Exploitation metrics (whale spending)
- Vanity metrics (raw downloads without retention)

---

## Ratification & Acknowledgment

This constitution represents a commitment to building a game worthy of players' time and trust. It prioritizes long-term sustainability over short-term extraction, quality over quantity, and respect over revenue.

**Effective Date:** February 18, 2026  
**Review Cycle:** Annually or as needed  
**Next Review:** February 2027

---

## Appendix A: Quick Reference Decision Tree

### When Adding a Feature:
1. Does it improve player experience? → If no, reject
2. Is it technically feasible? → If no, defer or research
3. Does it align with constitution? → If no, reject
4. What's the maintenance cost? → If excessive, reconsider
5. Can we do it with quality? → If no, defer until we can

### When Considering Monetization:
1. Is it transparent and fair? → If no, reject
2. Can players opt out? → If no, reject
3. Does it harm free experience? → If yes, reject
4. Does it respect time/dignity? → If no, reject
5. Would I accept this as a player? → If no, reject

### When Responding to Feedback:
1. Is it aligned with mission? → Prioritize
2. Is it widely requested? → Consider seriously
3. Can we do it right? → Research and plan
4. Does it violate principles? → Politely decline with reasoning
5. Is there a better solution? → Propose alternative

---

## Appendix B: Glossary

**Dark Pattern:** Deceptive UX that tricks users into actions against their interest  
**Whale:** Player who spends disproportionately large amounts  
**FOMO:** Fear of Missing Out, artificial scarcity tactics  
**Pay-to-Win:** Monetary advantage over non-paying players  
**Predatory Monetization:** Exploitation of psychological vulnerabilities for profit  
**Graceful Degradation:** Maintaining functionality when features unavailable  
**Technical Debt:** Shortcuts taken now that cost more later  
**Living Document:** Document that evolves but maintains core principles

---

**"We build for players, not metrics. We optimize for joy, not ARPU. We succeed when players smile, not when dashboards green."**

---

_This constitution may be amended according to Article VI, Section 2. All amendments will be clearly tracked and dated._
