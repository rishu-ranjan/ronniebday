# Ronnie's 1st Birthday Invite — deploy guide

Live address (suggested): **https://ronnie.rishuranjan.com**
Host dashboard: **https://ronnie.rishuranjan.com/admin.html**

```
ronnie-birthday/
├── index.html            ← the invite guests see
├── admin.html            ← your RSVP dashboard (passphrase protected)
├── og.png                ← preview card shown in WhatsApp / iMessage
├── ronnie.jpg            ← ADD THIS: your favourite photo of Ronnie (square works best)
└── functions/api/rsvp.js ← stores RSVPs in Cloudflare KV
```

## Step 1 — Add Ronnie's photo
Save a photo as `ronnie.jpg` in this folder (square crop, ~800×800, under 500 KB).
If it's missing, the page shows a big "R" instead, so nothing breaks.

## Step 2 — Push to a new GitHub repo
```bash
cd ronnie-birthday
git init
git add .
git commit -m "Ronnie's first birthday invite"
git branch -M main
git remote add origin https://github.com/rishu-ranjan/ronnie-birthday.git
git push -u origin main
```
(Create the empty repo `ronnie-birthday` on GitHub first. Mark it **Private** if you like; Cloudflare can still deploy it.)

## Step 3 — Create the Cloudflare **Pages** project
1. Cloudflare Dashboard → **Workers & Pages** → **Create** → choose the **Pages** tab → **Connect to Git**.
   ⚠️ Make sure it's **Pages**, not a Worker (that's what served "Hello World" last time).
2. Pick the `ronnie-birthday` repo.
3. Build settings: Framework preset **None**, Build command **empty** (or `echo "Deploying"` if it insists), Build output directory **`/`**.
4. **Save and Deploy**. You'll get a `ronnie-birthday.pages.dev` link.

## Step 4 — Create the RSVP storage (KV)
1. Dashboard → **Storage & Databases** → **KV** → **Create namespace** → name it `ronnie-rsvps`.
2. Back in the Pages project → **Settings** → **Bindings** → **Add** → **KV namespace**
   - Variable name: **`RSVPS`** (exactly this)
   - Namespace: `ronnie-rsvps`
3. Same Settings page → **Variables and Secrets** → **Add**
   - Type: **Secret**, Name: **`ADMIN_KEY`**, Value: a passphrase only you and your wife know.
4. Do both for **Production** (and Preview if you want to test on preview URLs).
5. **Deployments** → latest deployment → **Retry deployment** so the bindings take effect.

## Step 5 — Put it on your domain
1. Pages project → **Custom domains** → **Set up a custom domain** → `ronnie.rishuranjan.com` → **Activate**.
2. Since rishuranjan.com is already on Cloudflare, the DNS record is created for you; it's usually live in a few minutes.

## Step 6 — Test before sharing
1. Open the invite, send a test RSVP.
2. Open `/admin.html`, enter your passphrase → the test shows up. Remove it with ✕ (tap twice).
3. Paste the link into a WhatsApp chat with yourself to check the preview card.
   If an old preview is cached, add `?v=2` to the end of the link.

## Changing things later
- Edit text directly in `index.html`, then `git commit` + `git push` — Cloudflare redeploys automatically.
- Calendar invite assumes the party ends at **3:30 PM** — search for `20261128T203000Z` in `index.html` (two places) to change it.
- Want a different address (e.g. `rishuranjan.com/ronnie`)? Update the `og:image` and `og:url` lines at the top of `index.html` to match.

## How RSVPs work
- Guests reply with name, yes / maybe / no, adults, kids, optional phone/email, and a note.
- If someone replies again with the same phone/email (or the same name), it **updates** their earlier reply instead of creating a duplicate.
- The dashboard shows expected headcount (adults + kids who said yes), maybes, declines, every note, and a **Download CSV** button for the restaurant headcount.
- The page is marked `noindex` so it won't appear in Google; only people with the link will find it.
