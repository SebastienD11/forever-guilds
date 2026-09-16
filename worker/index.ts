import type { Guild, GuildDetail, Memory, Plan } from "../src/lib/types";

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const error = (message: string, status = 400) => json({ error: message }, status);
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const oneOf = <T extends string>(value: unknown, options: readonly T[]): value is T => typeof value === "string" && options.includes(value as T);
const regions = ["EU", "US", "KR", "TW"] as const;
const factions = ["Alliance", "Horde"] as const;
const rulesets = ["Normal", "PvP", "Roleplaying", "Hardcore"] as const;
const wowVersions = ["Retail", "Vanilla", "Classic"] as const;

async function bodyOf(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") throw new Error("Send JSON data.");
  if (Number(request.headers.get("content-length") || 0) > 8192) throw new Error("Submission is too long.");
  const raw = await request.text();
  if (raw.length > 8192) throw new Error("Submission is too long.");
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid submission.");
  return parsed as Record<string, unknown>;
}

function contactUrl(value: unknown): string | null {
  const text = clean(value, 300);
  if (!text) return "";
  try {
    const url = new URL(text);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password ? url.toString() : null;
  } catch { return null; }
}

const guildSelect = `SELECT g.*, (SELECT COUNT(*) FROM plans p WHERE p.guild_id=g.id) AS plan_count,
  (SELECT COUNT(*) FROM memories m WHERE m.guild_id=g.id) AS memory_count FROM guilds g`;

async function guildDetail(db: D1Database, id: string): Promise<GuildDetail | null> {
  const guild = await db.prepare(`${guildSelect} WHERE g.id=?`).bind(id).first<Guild>();
  if (!guild) return null;
  const [plans, memories] = await Promise.all([
    db.prepare("SELECT * FROM plans WHERE guild_id=? ORDER BY created_at DESC LIMIT 50").bind(id).all<Plan>(),
    db.prepare("SELECT * FROM memories WHERE guild_id=? ORDER BY created_at DESC LIMIT 100").bind(id).all<Memory>(),
  ]);
  return { guild, plans: plans.results, memories: memories.results };
}

async function api(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "api") return error("Not found.", 404);

  if (request.method === "GET" && parts.length === 2 && parts[1] === "guilds") {
    const q = clean(url.searchParams.get("q"), 80);
    const region = url.searchParams.get("region");
    const faction = url.searchParams.get("faction");
    const ruleset = url.searchParams.get("ruleset");
    const filters: string[] = [];
    const bindings: string[] = [];
    if (q) { filters.push("(g.name LIKE ? ESCAPE '\\' OR g.old_realm LIKE ? ESCAPE '\\')"); const term = `%${q.replace(/[\\%_]/g, "\\$&")}%`; bindings.push(term, term); }
    if (region && oneOf(region, regions)) { filters.push("g.region=?"); bindings.push(region); }
    if (faction && oneOf(faction, factions)) { filters.push("g.old_faction=?"); bindings.push(faction); }
    if (ruleset && oneOf(ruleset, rulesets)) { filters.push("EXISTS (SELECT 1 FROM plans p WHERE p.guild_id=g.id AND p.ruleset=?)"); bindings.push(ruleset); }
    const where = filters.length ? ` WHERE ${filters.join(" AND ")}` : "";
    const results = await env.DB.prepare(`${guildSelect}${where} ORDER BY g.created_at DESC LIMIT 100`).bind(...bindings).all<Guild>();
    return json({ guilds: results.results });
  }

  if (request.method === "POST" && parts.length === 2 && parts[1] === "guilds") {
    const data = await bodyOf(request);
    if (data.website) return error("Invalid submission."); // Honeypot.
    const name = clean(data.name, 80), oldRealm = clean(data.old_realm, 80);
    const years = clean(data.years, 60), story = clean(data.story, 700);
    if (name.length < 2 || oldRealm.length < 2 || !oneOf(data.region, regions) || !oneOf(data.old_faction, [...factions, "Unknown"] as const) || !oneOf(data.wow_version, wowVersions)) return error("Add a guild name, old realm, region, faction, and WoW version.");
    const id = crypto.randomUUID();
    try {
      await env.DB.prepare("INSERT INTO guilds (id,name,old_realm,region,old_faction,wow_version,years,story) VALUES (?,?,?,?,?,?,?,?)")
        .bind(id, name, oldRealm, data.region, data.old_faction, data.wow_version, years, story).run();
    } catch (e) {
      if (String(e).includes("UNIQUE")) {
        const existing = await env.DB.prepare("SELECT id FROM guilds WHERE lower(name)=lower(?) AND lower(old_realm)=lower(?) AND region=? AND wow_version=?")
          .bind(name, oldRealm, data.region, data.wow_version).first<{ id: string }>();
        return json({ error: "This guild is already listed. Open its page to add your reunion plan or note.", existingId: existing?.id }, 409);
      }
      throw e;
    }
    return json({ id }, 201);
  }

  const id = parts[2];
  if (parts[1] !== "guilds" || !id || !/^[0-9a-f-]{36}$/i.test(id)) return error("Not found.", 404);
  if (request.method === "GET" && parts.length === 3) {
    const detail = await guildDetail(env.DB, id);
    return detail ? json(detail) : error("Guild not found.", 404);
  }

  if (request.method === "POST" && parts.length === 4 && (parts[3] === "plans" || parts[3] === "memories")) {
    const exists = await env.DB.prepare("SELECT id FROM guilds WHERE id=?").bind(id).first();
    if (!exists) return error("Guild not found.", 404);
    const data = await bodyOf(request);
    if (data.website) return error("Invalid submission.");
    const link = contactUrl(data.contact_url);
    if (link === null) return error("Use an http or https contact link.");
    const entryId = crypto.randomUUID();
    if (parts[3] === "plans") {
      const name = clean(data.name, 80), language = clean(data.language, 50), note = clean(data.note, 500);
      if (name.length < 2 || language.length < 2 || !oneOf(data.region, regions) || !oneOf(data.faction, factions) || !oneOf(data.ruleset, rulesets)) return error("Add the Forever guild name, region, ruleset, faction, and language.");
      await env.DB.prepare("INSERT INTO plans (id,guild_id,name,ruleset,faction,language,region,contact_url,note) VALUES (?,?,?,?,?,?,?,?,?)")
        .bind(entryId, id, name, data.ruleset, data.faction, language, data.region, link, note).run();
    } else {
      const characterName = clean(data.character_name, 80), message = clean(data.message, 400);
      if (characterName.length < 2) return error("Add the character name you used.");
      await env.DB.prepare("INSERT INTO memories (id,guild_id,character_name,message,contact_url) VALUES (?,?,?,?,?)")
        .bind(entryId, id, characterName, message, link).run();
    }
    return json({ id: entryId }, 201);
  }
  return error("Not found.", 404);
}

export default {
  async fetch(request, env): Promise<Response> {
    try { return await api(request, env); }
    catch (e) {
      if (e instanceof SyntaxError) return error("Invalid JSON.");
      if (e instanceof Error && ["Send JSON data.", "Submission is too long.", "Invalid submission."].includes(e.message)) return error(e.message);
      console.error(JSON.stringify({ event: "api_error", path: new URL(request.url).pathname, message: String(e) }));
      return error("Something went wrong. Please try again.", 500);
    }
  },
} satisfies ExportedHandler<Env>;
