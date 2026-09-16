# Forever Guilds

A community archive for people who played together in vanilla World of Warcraft to find one another ahead of World of Warcraft: Forever. Visitors can add an old guild, post a public guildmate note, and share a proposed Forever reunion with a region, ruleset, faction, and language.

The UI uses copy-paste [Warcraft CN](https://www.warcraftcn.com/docs) Button, Card, Input, Badge, Textarea, Dropdown Menu, Pagination, and Cursor components plus their local frame assets. Their license is in `src/components/ui/warcraftcn/LICENSE.md`.

## Run locally

```bash
npm install
npm run db:local
npm run build
npm run worker:dev
```

Open the URL printed by Wrangler. `npm run dev` starts Vite separately; its `/api` proxy expects Wrangler at port 8787. If that port is occupied, use the Wrangler URL directly.

## Deploy

The app is deployed at [forever-guilds.seb-delrue.workers.dev](https://forever-guilds.seb-delrue.workers.dev). The production Worker is bound to the `forever-guilds` D1 database in Cloudflare's Western Europe region. The initial local guild listing and guildmate note were copied to production on September 16, 2026.

To deploy a later change:

```bash
npm run check
npm run build
npm run db:remote # when there are new migrations
npx wrangler deploy
```

Before the first protected deployment, add the Turnstile widget secret to the `forever-guilds` Worker as an encrypted secret named `TURNSTILE_SECRET`. The widget must allow `forever-guilds.seb-delrue.workers.dev`; add `localhost` and `127.0.0.1` only for local testing. Production hostname validation is configured separately in `wrangler.jsonc`.

Before applying a production migration, record a recovery bookmark:

```bash
npx wrangler d1 time-travel info forever-guilds
```

D1 Time Travel is automatic and retains recovery history for the plan's retention period. Restores overwrite the live database, so test the documented `wrangler d1 time-travel restore` process against a non-production database before it is needed.

The D1 binding and database ID are recorded in `wrangler.jsonc`. A custom domain can be added later without changing the app's API paths.

## Data and trust

Guild names are unique by old realm, region, and WoW version (Retail, Vanilla, Classic, or Private). Existing listings are treated as Vanilla when applying the second migration. Additional Forever plans and guildmate notes attach to the existing record. Plans are player submitted and explicitly marked unverified. The app stores only the public fields entered in the forms. External contact links are optional and limited to HTTP(S).

The archive API returns 12 guilds per page with a total count. Search and filters apply before pagination, and changing either returns to page one.

Submissions appear immediately after Turnstile verification and are limited per source. Reports and removal requests are accepted through the repository issue tracker linked in the footer. For urgent moderation, identify the record in D1, remove dependent plans and memories before deleting a guild, verify the public page, and retain the issue URL as the audit record. If abuse becomes sustained, set `SUBMISSIONS_ENABLED` to `false` in `wrangler.jsonc` and deploy before reviewing entries.

Forever has no published named realm list. The app records a **planned** ruleset and never assumes guilds can span rulesets. Blizzard describes Normal, PvP, and Roleplaying at launch, with Hardcore later. See [Blizzard's recap](https://worldofwarcraft.blizzard.com/en-us/news/24303313) and the [realmless guide](https://lfcarry.com/guides/wow-forever-realmless).
