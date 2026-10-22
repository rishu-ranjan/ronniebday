// Cloudflare Pages Function: /api/rsvp
// Bindings required (Pages project > Settings):
//   KV namespace binding  RSVPS      -> your KV namespace
//   Environment variable  ADMIN_KEY  -> a secret passphrase for the host dashboard

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

// Guest submits or updates an RSVP
export async function onRequestPost({ request, env }) {
  if (!env.RSVPS) return json({ error: "RSVP storage is not set up yet." }, 500);

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
  if (existing?.created) record.created = existing.created; else record.created = record.updated;

  // Whole record kept as metadata too, so the dashboard loads everything in one list call
  await env.RSVPS.put(key, JSON.stringify(record), { metadata: record });
  return json({ ok: true, updated: Boolean(existing) });
}

// Host dashboard reads all RSVPs (needs ADMIN_KEY)
export async function onRequestGet({ request, env }) {
  const auth = request.headers.get("Authorization") || "";
  if (!env.ADMIN_KEY || auth !== "Bearer " + env.ADMIN_KEY) return json({ error: "Wrong passphrase." }, 401);
  if (!env.RSVPS) return json({ error: "RSVP storage is not set up yet." }, 500);

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

// Host removes a test or duplicate entry
export async function onRequestDelete({ request, env }) {
  const auth = request.headers.get("Authorization") || "";
  if (!env.ADMIN_KEY || auth !== "Bearer " + env.ADMIN_KEY) return json({ error: "Wrong passphrase." }, 401);
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id.startsWith("rsvp:")) return json({ error: "Missing id." }, 400);
  await env.RSVPS.delete(id);
  return json({ ok: true });
}
