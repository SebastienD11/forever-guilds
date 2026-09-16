export type Region = "EU" | "US" | "KR" | "TW";
export type Faction = "Alliance" | "Horde";
export type Ruleset = "Normal" | "PvP" | "Roleplaying" | "Hardcore";
export type WowVersion = "Retail" | "Vanilla" | "Classic";

export interface Guild {
  id: string;
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
  memories: Memory[];
}
