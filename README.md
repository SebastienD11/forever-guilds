# Forever Guilds

A community archive for people who played together in vanilla World of Warcraft to find one another ahead of World of Warcraft: Forever. Visitors can add an old guild, post a public guildmate note, and share a proposed Forever reunion with a region, ruleset, faction, and language.

The UI uses copy-paste [Warcraft CN](https://www.warcraftcn.com/docs) Button, Card, Input, Badge, Textarea, and Dropdown Menu components plus their local frame assets. Their license is in `src/components/ui/warcraftcn/LICENSE.md`.

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

The D1 binding and database ID are recorded in `wrangler.jsonc`. A custom domain can be added later without changing the app's API paths.

## Data and trust

Guild names are unique by old realm, region, and WoW version (Retail, Vanilla, or Classic). Existing listings are treated as Vanilla when applying the second migration. Additional Forever plans and guildmate notes attach to the existing record. Plans are player submitted and explicitly marked unverified. The app stores only the public fields entered in the forms. External contact links are optional and limited to HTTP(S).

Submissions appear immediately. Before opening the site to a large public audience, add moderation or stronger abuse controls. The current honeypot and input limits are basic safeguards, not a spam defense.

Forever has no published named realm list. The app records a **planned** ruleset and never assumes guilds can span rulesets. Blizzard describes Normal, PvP, and Roleplaying at launch, with Hardcore later. See [Blizzard's recap](https://worldofwarcraft.blizzard.com/en-us/news/24303313) and the [realmless guide](https://lfcarry.com/guides/wow-forever-realmless).
