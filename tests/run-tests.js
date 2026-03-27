/**
 * tests/run-tests.js
 *
 * Headless test runner for Orb•Fall: ChromaCrush.
 *
 * Prerequisites:
 *   npm install          (installs playwright)
 *   python -m http.server 8765   (in a separate terminal, from the repo root)
 *
 * Usage:
 *   node tests/run-tests.js              # run tests (server must already be up)
 *   npm test                             # same via npm script
 *
 * The script starts its own HTTP server if port 8765 is not already in use,
 * runs all tests in headless Chromium by scraping the test-runner.html DOM,
 * prints a structured report, and exits with code 0 (all pass) or 1 (any fail).
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const ROOT = path.resolve(__dirname, '..');
const TEST_URL = `http://localhost:${PORT}/tests/test-runner.html`;

// ─── Minimal static file server ──────────────────────────────────────────────

function serveFile(req, res) {
	const safePath = path.normalize(req.url.split('?')[0]);
	const filePath = path.join(ROOT, safePath);

	// Prevent path traversal outside repo root
	if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
		res.writeHead(403);
		res.end('Forbidden');
		return;
	}

	fs.readFile(filePath, (err, data) => {
		if (err) {
			res.writeHead(404);
			res.end('Not found');
			return;
		}
		const ext = path.extname(filePath).toLowerCase();
		const mime = {
			'.html': 'text/html',
			'.js':   'application/javascript',
			'.json': 'application/json',
			'.css':  'text/css',
			'.png':  'image/png',
			'.ico':  'image/x-icon',
		}[ext] || 'application/octet-stream';
		res.writeHead(200, { 'Content-Type': mime });
		res.end(data);
	});
}

async function isPortInUse(port) {
	return new Promise(resolve => {
		const tester = http.createServer();
		tester.once('error', () => resolve(true));
		tester.once('listening', () => { tester.close(); resolve(false); });
		tester.listen(port, '127.0.0.1');
	});
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async () => {
	const alreadyServed = await isPortInUse(PORT);
	let server = null;

	if (!alreadyServed) {
		server = http.createServer(serveFile);
		await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));
		console.log(`[server] Listening on http://localhost:${PORT}`);
	} else {
		console.log(`[server] Using existing server on port ${PORT}`);
	}

	const browser = await chromium.launch({ headless: true });
	const page    = await browser.newPage();

	page.on('pageerror', err =>
		process.stderr.write(`[pageerror] ${err.message}\n`));

	await page.goto(TEST_URL, { waitUntil: 'networkidle' });

	// Wait until the summary section is populated (all tests finished)
	await page.waitForFunction(() => {
		const s = document.getElementById('summary');
		return s && s.textContent.trim().length > 0;
	}, { timeout: 60000 });

	const results = await page.evaluate(() => {
		const suites = [];
		document.querySelectorAll('.test-suite').forEach(suiteEl => {
			const name  = suiteEl.querySelector('.test-suite-header')?.textContent?.trim() ?? 'Unknown';
			const tests = [];
			suiteEl.querySelectorAll('.test-case').forEach(tc => {
				tests.push({
					name: tc.querySelector('.test-name')?.textContent?.trim() ?? '',
					pass: tc.classList.contains('pass')
				});
			});
			const errors = [];
			suiteEl.querySelectorAll('.test-error').forEach(e => errors.push(e.textContent.trim()));
			suites.push({ name, tests, errors });
		});
		return { suites };
	});

	await browser.close();
	if (server) server.close();

	// ─── Report ──────────────────────────────────────────────────────────────

	let totalPass = 0, totalFail = 0;
	const failures = [];

	console.log('\n========== TEST RESULTS ==========');
	results.suites.forEach(suite => {
		const p = suite.tests.filter(t =>  t.pass).length;
		const f = suite.tests.filter(t => !t.pass).length;
		totalPass += p;
		totalFail += f;

		const icon = f === 0 ? '✓' : '✗';
		console.log(`${icon} ${suite.name.padEnd(50)} ${p}/${suite.tests.length}`);

		if (f > 0) {
			suite.tests.filter(t => !t.pass).forEach(t =>
				failures.push({ suite: suite.name, name: t.name }));
			suite.errors.forEach(e =>
				failures.push({ suite: suite.name, name: '  (error)', detail: e }));
		}
	});

	console.log('\n----------------------------------');
	console.log(`TOTAL: ${totalPass + totalFail}  PASSED: ${totalPass}  FAILED: ${totalFail}`);

	if (failures.length > 0) {
		console.log('\n=== FAILURES ===');
		failures.forEach(f => {
			console.log(`  [${f.suite}] ${f.name}`);
			if (f.detail) console.log(`    ${f.detail}`);
		});
		process.exit(1);
	} else {
		console.log('\nAll tests passed!');
		process.exit(0);
	}
})();
