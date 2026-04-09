# Deploying Orb•Fall: ChromaCrush

Production URL: `https://gusto4tech.com/orbfall/`
Host: S3 bucket + CloudFront distribution (gusto4tech.com root)

---

## Step 1 — Build

```powershell
node build.js
```

Output goes to `dist/orbfall/`. The build script:
- stamps the version into `service-worker.js` and `config.json`
- rewrites SW asset paths to relative form (`./index.html` etc.)
- patches `manifest.json` scope and start_url to `/orbfall/`

---

## Step 2 — Upload to S3

### ⚠️ Critical: upload to the `orbfall/` prefix, NOT the bucket root

```bash
aws s3 sync dist/orbfall/ s3://gusto4tech-prod-orbfall-static/ --delete
```

> The CloudFront distribution's origin path maps the bucket root to `/orbfall/`,
> so files sync to `s3://gusto4tech-prod-orbfall-static/` (bucket root) and are
> served at `gusto4tech.com/orbfall/`.

Why this matters: S3 static website hosting uses `index.html` as the error
document. If game files are at the bucket root instead of under `orbfall/`,
any request to `/orbfall/anything` that doesn't find its key returns the root
`index.html` — making every game URL silently serve the wrong page.

### After uploading, verify the key prefix is correct:

```bash
aws s3 ls s3://YOUR_BUCKET/orbfall/
# Should show: index.html, guide.html, service-worker.js, src/, etc.
# Should NOT show these at the bucket root
```

---

## Step 3 — Invalidate CloudFront cache

After every upload, invalidate so stale files aren't served:

```bash
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/orbfall/*"
```

Invalidating only `/orbfall/*` is intentional — it avoids unnecessary cost
on the root gusto4tech.com site.

---

## CloudFront Distribution Settings

These must stay correct or routing breaks again:

| Setting | Value |
|---|---|
| Origin domain | `YOUR_BUCKET.s3.amazonaws.com` |
| Origin path | *(empty — bucket root)* |
| Default root object | `index.html` (root site only, NOT game) |
| Error responses | 403 → `/index.html`, 200 (root fallback only) |

### Behaviors

| Path pattern | Origin path prefix | Notes |
|---|---|---|
| `/orbfall/*` | *(none — full S3 path included)* | Serves game files directly |
| `Default (*)` | *(none)* | Root gusto4tech.com site |

> If both behaviors share the same error response rule (`403 → /index.html`),
> that rule must point to `/orbfall/index.html` only for the `/orbfall/*`
> behavior — otherwise a missing root path falls back to the game.

---

## Files Deployed

```
dist/orbfall/
  index.html          ← game shell
  guide.html
  privacy.html
  early-access.html
  config.json
  manifest.json
  service-worker.js   ← SW paths rewritten to relative form by build.js
  ads.txt
  src/
    main.js
    modules/
    styles/
    utils/
    config/
    img/
```

---

## Checklist Before Each Deploy

- [ ] `node build.js` ran cleanly (no warnings)
- [ ] `dist/orbfall/index.html` exists
- [ ] S3 sync target is `s3://YOUR_BUCKET/orbfall/` (trailing slash)
- [ ] CloudFront invalidation for `/orbfall/*` issued
- [ ] Tested `https://gusto4tech.com/orbfall/` in a private/incognito window
- [ ] Tested direct navigation to `https://gusto4tech.com/orbfall/guide.html`
