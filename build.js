#!/usr/bin/env node
/**
 * build.js — Orb•Fall: ChromaCrush
 *
 * Copies all static game assets into dist/orbfall/, ready to be uploaded
 * to the /orbfall sub-path of gusto4tech.com.
 *
 * Usage:
 *   node build.js           -- full build (cleans then copies)
 *   node build.js --no-clean -- skip cleaning dist/ first
 *
 * Output: dist/orbfall/  (mirrors the production URL path)
 */

import { cpSync, mkdirSync, readdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { minify as jsMinify } from 'terser';
import CleanCSS from 'clean-css';
import { minify as htmlMinify } from 'html-minifier-terser';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const OUT  = join(ROOT, 'dist', 'orbfall');

const noClean = process.argv.includes('--no-clean');

// ── Generate build version (orbfall-v1.0.YYMMDDHHMM) ─────────────────────────

function buildVersion() {
	const now = new Date();
	const YY  = String(now.getUTCFullYear()).slice(-2);
	const MM  = String(now.getUTCMonth() + 1).padStart(2, '0');
	const DD  = String(now.getUTCDate()).padStart(2, '0');
	const HH  = String(now.getUTCHours()).padStart(2, '0');
	const min = String(now.getUTCMinutes()).padStart(2, '0');
	return `orbfall-v${YY}.${MM}${DD}.${HH}${min}`;
}

const VERSION = buildVersion();

// ── Stamp source files ────────────────────────────────────────────────────────
//
// Update CACHE_VERSION in source service-worker.js and buildVersion in source
// config.json so the repo always reflects the last-built version.

console.log(`\n[0/6] Stamping version ${VERSION} into source files…`);

const srcSwPath  = join(ROOT, 'service-worker.js');
const srcSwText  = readFileSync(srcSwPath, 'utf8');
const stampedSw  = srcSwText.replace(/CACHE_VERSION\s*=\s*'orbfall-[^']*'/, `CACHE_VERSION = '${VERSION}'`);
if (stampedSw === srcSwText) {
	console.warn('  ⚠ CACHE_VERSION not found in source service-worker.js — check manually');
} else {
	writeFileSync(srcSwPath, stampedSw, 'utf8');
	ok(`service-worker.js CACHE_VERSION = '${VERSION}'`);
}

const srcCfgPath = join(ROOT, 'config.json');
const srcCfg     = JSON.parse(readFileSync(srcCfgPath, 'utf8'));
srcCfg.buildVersion = VERSION;
writeFileSync(srcCfgPath, JSON.stringify(srcCfg, null, '\t'), 'utf8');
ok(`config.json buildVersion = '${VERSION}'`);

// Stage the two stamped source files so the version is included in the commit
try {
	execSync('git add service-worker.js config.json', { cwd: ROOT, stdio: 'pipe' });
	ok('git add service-worker.js config.json');
} catch (_e) {
	warn('git add failed — stamp will not be staged automatically');
}

// Tag the current HEAD so this version can be retrieved with: git checkout <VERSION>
try {
	execSync(`git tag ${VERSION}`, { cwd: ROOT, stdio: 'pipe' });
	ok(`git tag ${VERSION}`);
} catch (_e) {
	// Tag may already exist (e.g. re-running build without committing) — not fatal
	warn(`git tag ${VERSION} skipped (tag may already exist)`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(msg)  { console.log(`  ${msg}`); }
function ok(msg)   { console.log(`  ✓ ${msg}`); }
function warn(msg) { console.warn(`  ⚠ ${msg}`); }

function copy(src, destRel) {
	const dest = join(OUT, destRel);
	try {
		cpSync(join(ROOT, src), dest, { recursive: true });
		ok(`${src}`);
	} catch (e) {
		warn(`Skipped (not found): ${src}`);
	}
}

// ── Clean ─────────────────────────────────────────────────────────────────────

if (!noClean) {
	console.log('\n[1/6] Cleaning dist/orbfall/…');
	if (existsSync(join(ROOT, 'dist'))) {
		rmSync(join(ROOT, 'dist'), { recursive: true, force: true });
	}
	ok('dist/ removed');
}

mkdirSync(OUT, { recursive: true });

// ── Copy static files ─────────────────────────────────────────────────────────

console.log('\n[2/6] Copying static assets…');

// Root HTML + config
copy('index.html',       'index.html');
copy('guide.html',       'guide.html');
copy('privacy.html',     'privacy.html');
copy('early-access.html','early-access.html');
copy('config.json',      'config.json');
copy('manifest.json',    'manifest.json');
copy('ads.txt',          'ads.txt');
copy('service-worker.js','service-worker.js');

// Source tree (JS modules, CSS, images, config sub-dir)
copy('src', 'src');

// ── Patch service-worker.js paths ────────────────────────────────────────────
//
// service-worker.js uses root-relative paths (/index.html, /src/…) which work
// when the app is served from /.  At gusto4tech.com/orbfall the SW scope is
// /orbfall/ so paths must be relative to that sub-path.
//
// We rewrite every '/index.html' → './index.html' etc. in the output copy only
// (the source file is left unchanged).

console.log('\n[3/6] Patching service-worker.js paths for /orbfall sub-path…');

const swPath = join(OUT, 'service-worker.js');
let sw = readFileSync(swPath, 'utf8');

// Rewrite the CORE_ASSETS array: '/' -> './', '/src/...' -> './src/...' etc.
// Only rewrite string literals that start with '/' inside the CORE_ASSETS array.
// Strategy: replace every quoted path that starts with a forward slash.
const patchedSw = sw.replace(/'(\/([\w.\-/]+))'/g, (match, path) => {
	if (path === '/') return "'.'"  ;          // root '/' -> '.'
	return `'.${path}'`;                       // '/foo' -> './foo'
});

if (patchedSw === sw) {
	warn('service-worker.js: no paths patched — check manually');
} else {
	writeFileSync(swPath, patchedSw, 'utf8');
	ok('service-worker.js paths rewritten to relative form');
}

// ── manifest.json: patch start_url and scope ─────────────────────────────────

console.log('\n[4/6] Patching manifest.json for /orbfall sub-path…');

const manifestPath = join(OUT, 'manifest.json');
let manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

manifest.start_url = '/orbfall/';
manifest.scope     = '/orbfall/';

// Patch icon src paths: /src/img/... -> /orbfall/src/img/...
if (Array.isArray(manifest.icons)) {
	manifest.icons = manifest.icons.map(icon => ({
		...icon,
		src: icon.src?.replace(/^\//, '/orbfall/')
	}));
}

if (Array.isArray(manifest.shortcuts)) {
	manifest.shortcuts = manifest.shortcuts.map(s => ({
		...s,
		url: s.url?.replace(/^\//, '/orbfall/')
	}));
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, '\t'), 'utf8');
ok('manifest.json start_url and scope set to /orbfall/');

// ── Minify ───────────────────────────────────────────────────────────────────

console.log('\n[5/6] Minifying JS, CSS, and HTML…');

// Recursively collect all files with a given extension under dir
function walkFiles(dir, ext) {
	const results = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...walkFiles(full, ext));
		} else if (entry.name.endsWith(ext)) {
			results.push(full);
		}
	}
	return results;
}

// ── JS ──
let jsCount = 0, jsSaved = 0;
for (const file of walkFiles(OUT, '.js')) {
	const src = readFileSync(file, 'utf8');
	try {
		const result = await jsMinify(src, {
			module: true,
			compress: true,
			mangle: { toplevel: false },
		});
		if (result.code) {
			jsSaved += src.length - result.code.length;
			writeFileSync(file, result.code, 'utf8');
			jsCount++;
		}
	} catch (e) {
		warn(`JS minify failed: ${file.replace(OUT, '')}: ${e.message}`);
	}
}
ok(`${jsCount} JS files  — saved ${(jsSaved / 1024).toFixed(1)} KB`);

// ── CSS ──
let cssCount = 0, cssSaved = 0;
const cssMinifier = new CleanCSS({ level: 2 });
for (const file of walkFiles(OUT, '.css')) {
	const src = readFileSync(file, 'utf8');
	const result = cssMinifier.minify(src);
	if (result.errors.length === 0) {
		cssSaved += src.length - result.styles.length;
		writeFileSync(file, result.styles, 'utf8');
		cssCount++;
	} else {
		warn(`CSS minify failed: ${file.replace(OUT, '')}: ${result.errors.join(', ')}`);
	}
}
ok(`${cssCount} CSS files — saved ${(cssSaved / 1024).toFixed(1)} KB`);

// ── HTML ──
let htmlCount = 0, htmlSaved = 0;
const htmlMinifyOpts = {
	collapseWhitespace: true,
	removeComments: true,
	removeRedundantAttributes: true,
	minifyCSS: true,
	minifyJS: true,
};
for (const file of walkFiles(OUT, '.html')) {
	const src = readFileSync(file, 'utf8');
	try {
		const minified = await htmlMinify(src, htmlMinifyOpts);
		htmlSaved += src.length - minified.length;
		writeFileSync(file, minified, 'utf8');
		htmlCount++;
	} catch (e) {
		warn(`HTML minify failed: ${file.replace(OUT, '')}: ${e.message}`);
	}
}
ok(`${htmlCount} HTML files — saved ${(htmlSaved / 1024).toFixed(1)} KB`);

console.log('\n[6/6] Done.');

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n✅  Build complete → dist/orbfall/`);
console.log(`\n   ── S3 upload ──`);
console.log(`   aws s3 sync dist/orbfall/ s3://gusto4tech-prod-orbfall-static/ --delete`);
console.log(`\n   CloudFront origin maps bucket root → gusto4tech.com/orbfall/\n`);
