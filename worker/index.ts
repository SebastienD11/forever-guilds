import type { Guild, GuildDetail, Memory, Plan } from "../src/lib/types";

const publicCache =
  "public, max-age=30, s-maxage=60, stale-while-revalidate=300";
const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};
const json = (body: unknown, status = 200, cacheControl = "no-store") =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": cacheControl, ...securityHeaders },
  });
const error = (message: string, status = 400) =>
  json({ error: message }, status);
const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const oneOf = <T extends string>(
  value: unknown,
  options: readonly T[],
): value is T => typeof value === "string" && options.includes(value as T);
const regions = ["EU", "US", "KR", "TW"] as const;
const factions = ["Alliance", "Horde"] as const;
const rulesets = ["Normal", "PvP", "Roleplaying", "Hardcore"] as const;
const wowVersions = ["Retail", "Vanilla", "Classic", "Private"] as const;
type TurnstileAction = "add_guild" | "add_plan" | "add_memory";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "guild";

async function uniqueSlug(db: D1Database, name: string): Promise<string> {
  const base = slugify(name);
  const existing = await db
    .prepare("SELECT slug FROM guilds WHERE slug = ? OR slug LIKE ?")
    .bind(base, `${base}-%`)
    .all<{ slug: string }>();
  const taken = new Set(existing.results.map((row) => row.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );

async function protectSubmission(
  request: Request,
  env: Env,
  data: Record<string, unknown>,
  action: TurnstileAction,
): Promise<Response | null> {
  if (env.SUBMISSIONS_ENABLED !== "true") {
    return error("Submissions are temporarily paused.", 503);
  }
  const clientIp = request.headers.get("CF-Connecting-IP") || "local";
  const rateLimit = await env.SUBMISSION_RATE_LIMITER.limit({ key: clientIp });
  if (!rateLimit.success) {
    return Response.json(
      { error: "Too many submissions. Try again in a minute." },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": "60",
          ...securityHeaders,
        },
      },
    );
  }

  const token = data["cf-turnstile-response"];
  const expectedHostnames = new Set(
    env.TURNSTILE_HOSTNAMES.split(",")
      .map((hostname) => hostname.trim())
      .filter(Boolean),
  );
  if (
    typeof token !== "string" ||
    !token ||
    token.length > 2048 ||
    !env.TURNSTILE_SECRET ||
    expectedHostnames.size === 0
  ) {
    return error("Security verification failed. Refresh and try again.", 403);
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(10_000),
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET,
          response: token,
          remoteip: clientIp,
        }),
      },
    );
    if (!response.ok)
      return error("Security verification failed. Refresh and try again.", 403);
    const result = await response.json<{
      success?: boolean;
      action?: string;
      hostname?: string;
    }>();
    if (
      !result.success ||
      result.action !== action ||
      !result.hostname ||
      !expectedHostnames.has(result.hostname)
    ) {
      return error("Security verification failed. Refresh and try again.", 403);
    }
  } catch {
    return error("Security verification failed. Refresh and try again.", 403);
  }
  return null;
}

async function bodyOf(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    throw new Error("Send JSON data.");
  if (Number(request.headers.get("content-length") || 0) > 8192)
    throw new Error("Submission is too long.");
  const raw = await request.text();
  if (raw.length > 8192) throw new Error("Submission is too long.");
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Invalid submission.");
  return parsed as Record<string, unknown>;
}

function contactUrl(value: unknown): string | null {
  const text = clean(value, 300);
  if (!text) return "";
  try {
    const url = new URL(text);
    return (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username &&
      !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

const guildSelect = `SELECT g.*, (SELECT COUNT(*) FROM plans p WHERE p.guild_id=g.id) AS plan_count,
  (SELECT COUNT(*) FROM memories m WHERE m.guild_id=g.id) AS memory_count FROM guilds g`;

async function guildDetail(
  db: D1Database,
  identifier: string,
): Promise<GuildDetail | null> {
  const guild = await db
    .prepare(`${guildSelect} WHERE g.id=? OR g.slug=?`)
    .bind(identifier, identifier)
    .first<Guild>();
  if (!guild) return null;
  const [plans, memories] = await Promise.all([
    db
      .prepare(
        "SELECT * FROM plans WHERE guild_id=? ORDER BY created_at DESC LIMIT 50",
      )
      .bind(guild.id)
      .all<Plan>(),
    db
      .prepare(
        "SELECT * FROM memories WHERE guild_id=? ORDER BY created_at DESC LIMIT 100",
      )
      .bind(guild.id)
      .all<Memory>(),
  ]);
  return { guild, plans: plans.results, memories: memories.results };
}

async function notFoundPage(
  request: Request,
  env: Env,
): Promise<Response> {
  return env.ASSETS.fetch(
    new Request(new URL("/__not-found__", request.url), request),
  );
}

async function guildPage(
  request: Request,
  env: Env,
  identifier: string,
): Promise<Response> {
  const detail = await guildDetail(env.DB, identifier);
  if (!detail) return notFoundPage(request, env);

  const origin = env.SITE_ORIGIN.replace(/\/$/, "");
  const canonical = `${origin}/guild/${detail.guild.slug}`;
  const title = `${detail.guild.name} on ${detail.guild.old_realm} | Forever Guilds`;
  const description = `Reconnect with members of ${detail.guild.name} from ${detail.guild.old_realm} on Forever Guilds.`;
  const assetResponse = await env.ASSETS.fetch(
    new Request(new URL("/", request.url), request),
  );
  let html = await assetResponse.text();
  const crawlerContent = `<main><h1>${escapeHtml(detail.guild.name)}</h1><p>${escapeHtml(`${detail.guild.wow_version} · ${detail.guild.old_realm} · ${detail.guild.region} · ${detail.guild.old_faction}`)}</p>${detail.guild.story ? `<p>${escapeHtml(detail.guild.story)}</p>` : ""}<p><a href="${escapeHtml(origin)}">Browse the Forever Guilds archive</a></p></main>`;
  html = html
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta[^>]+name="description"[^>]*>/,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    )
    .replace(
      /<link[^>]+rel="canonical"[^>]*>/,
      `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    )
    .replace(
      /<meta[^>]+property="og:type"[^>]*>/,
      '<meta property="og:type" content="article" />',
    )
    .replace(
      /<meta[^>]+property="og:title"[^>]*>/,
      `<meta property="og:title" content="${escapeHtml(title)}" />`,
    )
    .replace(
      /<meta[^>]+property="og:description"[^>]*>/,
      `<meta property="og:description" content="${escapeHtml(description)}" />`,
    )
    .replace(
      /<meta[^>]+property="og:url"[^>]*>/,
      `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    )
    .replace("<!-- route-seo -->", "")
    .replace('<div id="root"></div>', `<div id="root">${crawlerContent}</div>`);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "public, max-age=60, s-maxage=300",
      ...securityHeaders,
    },
  });
}

async function sitemap(env: Env): Promise<Response> {
  const origin = env.SITE_ORIGIN.replace(/\/$/, "");
  const guilds = await env.DB.prepare(
    "SELECT slug, created_at FROM guilds ORDER BY created_at DESC LIMIT 10000",
  ).all<{ slug: string; created_at: string }>();
  const urls = [
    `<url><loc>${escapeHtml(origin)}/</loc></url>`,
    ...guilds.results.map(
      (guild) =>
        `<url><loc>${escapeHtml(`${origin}/guild/${guild.slug}`)}</loc><lastmod>${escapeHtml(guild.created_at.replace(" ", "T"))}Z</lastmod></url>`,
    ),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`,
    {
      headers: {
        "Content-Type": "application/xml; charset=UTF-8",
        "Cache-Control": "public, max-age=300, s-maxage=3600",
        ...securityHeaders,
      },
    },
  );
}

async function api(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "api") return error("Not found.", 404);

  if (request.method === "GET" && parts.length === 2 && parts[1] === "guilds") {
    const pageSize = 12;
    const pageParam = Number(url.searchParams.get("page") || 1);
    const requestedPage =
      Number.isSafeInteger(pageParam) && pageParam > 0 ? pageParam : 1;
    const q = clean(url.searchParams.get("q"), 80);
    const region = url.searchParams.get("region");
    const faction = url.searchParams.get("faction");
    const ruleset = url.searchParams.get("ruleset");
    const filters: string[] = [];
    const bindings: string[] = [];
    if (q) {
      filters.push(
        "(g.name LIKE ? ESCAPE '\\' OR g.old_realm LIKE ? ESCAPE '\\')",
      );
      const term = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
      bindings.push(term, term);
    }
    if (region && oneOf(region, regions)) {
      filters.push("g.region=?");
      bindings.push(region);
    }
    if (faction && oneOf(faction, factions)) {
      filters.push("g.old_faction=?");
      bindings.push(faction);
    }
    if (ruleset && oneOf(ruleset, rulesets)) {
      filters.push(
        "EXISTS (SELECT 1 FROM plans p WHERE p.guild_id=g.id AND p.ruleset=?)",
      );
      bindings.push(ruleset);
    }
    const where = filters.length ? ` WHERE ${filters.join(" AND ")}` : "";
    const count = await env.DB.prepare(
      `SELECT COUNT(*) AS total FROM guilds g${where}`,
    )
      .bind(...bindings)
      .first<{ total: number }>();
    const total = count?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const results = await env.DB.prepare(
      `${guildSelect}${where} ORDER BY g.created_at DESC, g.id DESC LIMIT ? OFFSET ?`,
    )
      .bind(...bindings, pageSize, (page - 1) * pageSize)
      .all<Guild>();
    return json(
      { guilds: results.results, total, page, pageSize, totalPages },
      200,
      publicCache,
    );
  }

  if (
    request.method === "POST" &&
    parts.length === 2 &&
    parts[1] === "guilds"
  ) {
    const data = await bodyOf(request);
    if (data.website) return error("Invalid submission."); // Honeypot.
    const blocked = await protectSubmission(request, env, data, "add_guild");
    if (blocked) return blocked;
    const name = clean(data.name, 80),
      oldRealm = clean(data.old_realm, 80);
    const years = clean(data.years, 60),
      story = clean(data.story, 700);
    if (
      name.length < 2 ||
      oldRealm.length < 2 ||
      !oneOf(data.region, regions) ||
      !oneOf(data.old_faction, [...factions, "Unknown"] as const) ||
      !oneOf(data.wow_version, wowVersions)
    )
      return error(
        "Add a guild name, old realm, region, faction, and WoW version.",
      );
    const id = crypto.randomUUID();
    const slug = await uniqueSlug(env.DB, name);
    try {
      await env.DB.prepare(
        "INSERT INTO guilds (id,slug,name,old_realm,region,old_faction,wow_version,years,story) VALUES (?,?,?,?,?,?,?,?,?)",
      )
        .bind(
          id,
          slug,
          name,
          oldRealm,
          data.region,
          data.old_faction,
          data.wow_version,
          years,
          story,
        )
        .run();
    } catch (e) {
      if (String(e).includes("UNIQUE")) {
        const existing = await env.DB.prepare(
          "SELECT id, slug FROM guilds WHERE lower(name)=lower(?) AND lower(old_realm)=lower(?) AND region=? AND wow_version=?",
        )
          .bind(name, oldRealm, data.region, data.wow_version)
          .first<{ id: string; slug: string }>();
        return json(
          {
            error:
              "This guild is already listed. Open its page to add your reunion plan or note.",
            existingId: existing?.id,
            slug: existing?.slug,
          },
          409,
        );
      }
      throw e;
    }
    return json({ id, slug }, 201);
  }

  const id = parts[2];
  if (parts[1] !== "guilds" || !id) return error("Not found.", 404);
  if (request.method === "GET" && parts.length === 3) {
    const detail = await guildDetail(env.DB, id);
    return detail
      ? json(detail, 200, publicCache)
      : error("Guild not found.", 404);
  }

  if (
    request.method === "POST" &&
    parts.length === 4 &&
    (parts[3] === "plans" || parts[3] === "memories") &&
    /^[0-9a-f-]{36}$/i.test(id)
  ) {
    const exists = await env.DB.prepare("SELECT id FROM guilds WHERE id=?")
      .bind(id)
      .first();
    if (!exists) return error("Guild not found.", 404);
    const data = await bodyOf(request);
    if (data.website) return error("Invalid submission.");
    const action = parts[3] === "plans" ? "add_plan" : "add_memory";
    const blocked = await protectSubmission(request, env, data, action);
    if (blocked) return blocked;
    const link = contactUrl(data.contact_url);
    if (link === null) return error("Use an http or https contact link.");
    const entryId = crypto.randomUUID();
    if (parts[3] === "plans") {
      const name = clean(data.name, 80),
        language = clean(data.language, 50),
        note = clean(data.note, 500);
      if (
        name.length < 2 ||
        language.length < 2 ||
        !oneOf(data.region, regions) ||
        !oneOf(data.faction, factions) ||
        !oneOf(data.ruleset, rulesets)
      )
        return error(
          "Add the Forever guild name, region, ruleset, faction, and language.",
        );
      await env.DB.prepare(
        "INSERT INTO plans (id,guild_id,name,ruleset,faction,language,region,contact_url,note) VALUES (?,?,?,?,?,?,?,?,?)",
      )
        .bind(
          entryId,
          id,
          name,
          data.ruleset,
          data.faction,
          language,
          data.region,
          link,
          note,
        )
        .run();
    } else {
      const characterName = clean(data.character_name, 80),
        message = clean(data.message, 400);
      if (characterName.length < 2)
        return error("Add the character name you used.");
      await env.DB.prepare(
        "INSERT INTO memories (id,guild_id,character_name,message,contact_url) VALUES (?,?,?,?,?)",
      )
        .bind(entryId, id, characterName, message, link)
        .run();
    }
    return json({ id: entryId }, 201);
  }
  return error("Not found.", 404);
}

export default {
  async fetch(request, env): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/sitemap.xml")
        return await sitemap(env);
      const guildMatch = url.pathname.match(/^\/guild\/([^/]+)$/);
      if (request.method === "GET" && guildMatch)
        return await guildPage(request, env, decodeURIComponent(guildMatch[1]));
      if (url.pathname.startsWith("/api/")) return await api(request, env);
      return env.ASSETS.fetch(request);
    } catch (e) {
      if (e instanceof SyntaxError) return error("Invalid JSON.");
      if (
        e instanceof Error &&
        [
          "Send JSON data.",
          "Submission is too long.",
          "Invalid submission.",
        ].includes(e.message)
      )
        return error(e.message);
      console.error(
        JSON.stringify({
          event: "api_error",
          path: new URL(request.url).pathname,
          message: String(e),
        }),
      );
      return error("Something went wrong. Please try again.", 500);
    }
  },
} satisfies ExportedHandler<Env>;
