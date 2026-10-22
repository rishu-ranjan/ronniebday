# Ronnie's Invite — Cloudflare **Worker** version

Your current Worker: https://ronniebday.rishu19ranjan.workers.dev/

```
ronnie-birthday/
├── wrangler.jsonc        ← Worker settings (paste your KV ID here)
├── worker.js             ← handles RSVPs at /api/rsvp
└── public/
    ├── index.html        ← the invite
    ├── admin.html        ← your RSVP dashboard
    ├── og.png            ← WhatsApp preview card
    └── ronnie.jpg        ← ADD your photo here (square, under 500 KB)
```

## Step 1 — Replace the repo contents
In your existing GitHub repo, delete the old files (including the `functions/` folder) and copy in everything from this folder. Keep the structure exactly as above.

## Step 2 — Create the RSVP storage (KV)
1. Cloudflare Dashboard → **Storage & Databases** → **KV** → **Create namespace** → name: `ronnie-rsvps`.
2. Copy its **Namespace ID** (a 32-character code shown in the list).
3. Open `wrangler.jsonc` and replace `PASTE_YOUR_KV_NAMESPACE_ID_HERE` with it.
4. Check that `"name": "ronniebday"` matches your Worker's name in the dashboard.

## Step 3 — Set your dashboard passphrase
Dashboard → **Workers & Pages** → **ronniebday** → **Settings** → **Variables and Secrets** → **Add**
- Type: **Secret** (must be Secret, or the next deploy wipes it)
- Name: `ADMIN_KEY`
- Value: a passphrase only you and your wife know

## Step 4 — Deploy
```bash
git add -A
git commit -m "Worker version with RSVP backend"
git push
```
Cloudflare rebuilds automatically (watch **Deployments**; takes ~1 min).

## Step 5 — Test
1. Open the invite → send a test RSVP → you should see "Yay! See you on the 28th".
2. Open `/admin.html` → enter passphrase → test entry appears. Remove it with ✕ (tap twice).

## Step 6 — Custom domain (optional)
**ronniebday** → **Settings** → **Domains & Routes** → **Add** → **Custom domain** → `ronnie.rishuranjan.com`.
If you skip this, edit the `og:image` and `og:url` lines at the top of `public/index.html` to use the workers.dev address instead, so the WhatsApp preview image loads.

## Where RSVPs are stored
In **Cloudflare Workers KV**, namespace `ronnie-rsvps`, inside your own Cloudflare account. One entry per family.

Two ways to see them:
1. **Dashboard page (easiest):** `/admin.html` → passphrase → totals, every reply, notes, **Download CSV**.
2. **Raw data:** Cloudflare Dashboard → **Storage & Databases** → **KV** → `ronnie-rsvps` → **KV Pairs**. Each key looks like `rsvp:3fa9…`; click it to see the JSON (name, attending, adults, kids, contact, note, timestamps).

## Troubleshooting
| Symptom | Fix |
|---|---|
| RSVP shows "did not go through" | KV ID missing in `wrangler.jsonc`, or deploy failed — check **Deployments** log |
| Dashboard says "Wrong passphrase" | `ADMIN_KEY` secret not set, or typo |
| Dashboard says "storage is not set up" | KV binding name must be exactly `RSVPS` |
| Build error about `functions/` | Old Pages folder still in repo — delete it |
