export type Region = "EU" | "US" | "Oceania" | "KR" | "TW";
export type Faction = "Alliance" | "Horde";
export type Ruleset = "Normal" | "PvP" | "Roleplaying" | "Hardcore";
export type WowVersion = "Retail" | "Vanilla" | "Classic" | "Private";

export interface Guild {
  id: string;
  slug: string;
  name: string;
  old_realm: string;
  wow_version: WowVersion;
  region: Region;
  old_faction: Faction | "Unknown";
  years: string;
  story: string;
  created_at: string;
  plan_count: number;
  memory_count: number;
}

export interface GuildPage {
  guilds: Guild[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Plan {
  id: string;
  guild_id: string;
  name: string;
  ruleset: Ruleset;
  faction: Faction;
  language: string;
  region: Region;
  contact_url: string;
  note: string;
  username: string;
  created_at: string;
}

export interface PlanComment {
  id: string;
  plan_id: string;
  username: string;
  message: string;
  attending: number;
  created_at: string;
}

export interface Memory {
  id: string;
  guild_id: string;
  character_name: string;
  message: string;
  contact_url: string;
  created_at: string;
}

export interface GuildDetail {
  guild: Guild;
  plans: Plan[];
  plan_comments: PlanComment[];
  memories: Memory[];
}
