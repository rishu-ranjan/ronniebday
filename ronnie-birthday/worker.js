// Cloudflare Worker for Ronnie's birthday invite.
// - Static files (index.html, admin.html, og.png, ronnie.jpg) are served from ./public
// - /api/rsvp is handled here and stored in Workers KV
// Needs: KV binding RSVPS (in wrangler.jsonc) and secret ADMIN_KEY (dashboard → Settings → Variables and Secrets)

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

async function hash(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].slice(0, 12).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Spaces or line breaks around the saved secret or the typed passphrase are ignored
const adminKey = env => String(env.ADMIN_KEY || "").trim();
const isAdmin = (request, env) => {
  const sent = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/, "").trim();
  return Boolean(adminKey(env)) && sent === adminKey(env);
};

// Guest submits or updates an RSVP
async function saveRsvp(request, env) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }

  if (body.website) return json({ ok: true }); // honeypot: silently ignore bots

  const name = clean(body.name, 80);
  if (!name) return json({ error: "Please add your name." }, 400);
  const attending = ["yes", "maybe", "no"].includes(body.attending) ? body.attending : "yes";
  const num = v => Math.max(0, Math.min(20, parseInt(v, 10) || 0));

  const record = {
    name,
    attending,
    adults: attending === "no" ? 0 : num(body.adults),
    kids: attending === "no" ? 0 : num(body.kids),
    contact: clean(body.contact, 80),
    note: clean(body.note, 300),
    updated: new Date().toISOString(),
  };

  // Same phone/email (or same name if none) updates the earlier reply instead of duplicating it
  const identity = (record.contact || record.name).toLowerCase().replace(/[^a-z0-9@.]/g, "");
  const key = "rsvp:" + (await hash(identity));

  const existing = await env.RSVPS.get(key, "json");
  record.created = existing?.created || record.updated;

  // Whole record kept as metadata too, so the dashboard loads everything in one list call
  await env.RSVPS.put(key, JSON.stringify(record), { metadata: record });
  return json({ ok: true, updated: Boolean(existing) });
}

// Host dashboard reads all RSVPs
async function listRsvps(env) {
  const rows = [];
  let cursor;
  do {
    const page = await env.RSVPS.list({ prefix: "rsvp:", cursor });
    for (const k of page.keys) {
      rows.push({ id: k.name, ...(k.metadata || (await env.RSVPS.get(k.name, "json")) || {}) });
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  rows.sort((a, b) => (b.updated || "").localeCompare(a.updated || ""));
  return json({ rows });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/rsvp") {
      if (!env.RSVPS) return json({ error: "RSVP storage is not set up yet." }, 500);

      if (request.method === "POST") return saveRsvp(request, env);

      if (!adminKey(env))
        return json({ error: "No passphrase is set on this Worker (ronniebday). Add the ADMIN_KEY secret in Cloudflare.", worker: "ronniebday" }, 500);

      if (!isAdmin(request, env)) return json({ error: "Wrong passphrase.", worker: "ronniebday" }, 401);
      if (request.method === "GET") return listRsvps(env);
      if (request.method === "DELETE") {
        const id = url.searchParams.get("id") || "";
        if (!id.startsWith("rsvp:")) return json({ error: "Missing id." }, 400);
        await env.RSVPS.delete(id);
        return json({ ok: true });
      }
      return json({ error: "Method not allowed." }, 405);
    }

    // Everything else: the static site
    return env.ASSETS.fetch(request);
  },
};
