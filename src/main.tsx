import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLeft, ArrowRight, BookOpen, ChevronDown, Compass, Crown, ExternalLink, Flag, Globe2, Heart, MessageCircle, Plus, Search, Shield, Swords, Users, X } from "lucide-react";
import { Button } from "@/components/ui/warcraftcn/button";
import { Card, CardContent } from "@/components/ui/warcraftcn/card";
import { Input } from "@/components/ui/warcraftcn/input";
import { Badge } from "@/components/ui/warcraftcn/badge";
import { Textarea } from "@/components/ui/warcraftcn/textarea";
import type { Guild, GuildDetail, Memory, Plan } from "@/lib/types";
import "./styles.css";

type Modal = "guild" | "plan" | "memory" | null;
type Filters = { region: string; faction: string; ruleset: string };
const initialFilters: Filters = { region: "", faction: "", ruleset: "" };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || "Request failed."), { existingId: data.existingId });
  return data as T;
}
const post = <T,>(path: string, value: object) => request<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) });
const formatDate = (date: string) => new Date(`${date.replace(" ", "T")}Z`).toLocaleDateString(undefined, { month: "short", year: "numeric" });

function Field({ label, hint, children, required }: { label: string; hint?: string; children: React.ReactNode; required?: boolean }) {
  return <label className="field"><span className="field-label">{label}{required && <b aria-hidden="true"> *</b>}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function Select({ value, onChange, options, placeholder, required = false, ariaLabel }: { value: string; onChange: (value: string) => void; options: string[]; placeholder: string; required?: boolean; ariaLabel?: string }) {
  return <span className="select-wrap"><select aria-label={ariaLabel} required={required} value={value} onChange={e => onChange(e.target.value)}><option value="">{placeholder}</option>{options.map(option => <option key={option} value={option}>{option}</option>)}</select><ChevronDown size={15} /></span>;
}

function GuildCard({ guild, onOpen }: { guild: Guild; onOpen: () => void }) {
  return <button className="guild-card-button" onClick={onOpen} aria-label={`View ${guild.name} from ${guild.old_realm}`}>
    <Card className="guild-card" data-size="sm"><CardContent className="guild-card-content">
      <div className="guild-card-top"><span className={`crest ${guild.old_faction.toLowerCase()}`}>{guild.old_faction === "Alliance" ? <Crown size={23} /> : guild.old_faction === "Horde" ? <Swords size={23} /> : <Shield size={23} />}</span><span className="card-arrow"><ArrowRight size={18} /></span></div>
      <div className="guild-heading"><span className="eyebrow">{guild.wow_version.toUpperCase()} GUILD</span><h3>{guild.name}</h3></div>
      <div className="guild-meta"><span><Globe2 size={14} /> {guild.old_realm} · {guild.region}</span><span><Flag size={14} /> {guild.old_faction}</span></div>
      <div className="guild-card-bottom"><span>{guild.plan_count ? `${guild.plan_count} Forever ${guild.plan_count === 1 ? "plan" : "plans"}` : "No Forever plan yet"}</span><span>{guild.memory_count} {guild.memory_count === 1 ? "member" : "members"} found</span></div>
    </CardContent></Card>
  </button>;
}

function GuildForm({ onDone, onClose }: { onDone: (id: string) => void; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", old_realm: "", region: "", old_faction: "", wow_version: "", years: "", story: "", website: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { const result = await post<{ id: string }>("/api/guilds", form); onDone(result.id); }
    catch (err) { const e = err as Error & { existingId?: string }; if (e.existingId) onDone(e.existingId); else setError(e.message); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="modal-form">
    <div className="modal-intro"><span className="eyebrow gold">ADD TO THE ARCHIVE</span><h2>Remember your guild.</h2><p>Start with its original home. You can add a Forever reunion plan once the guild is listed.</p></div>
    <div className="form-grid">
      <Field label="Old guild name" required><Input required minLength={2} maxLength={80} placeholder="e.g. Guardians of the Dawn" value={form.name} onChange={e => set("name", e.target.value)} /></Field>
      <Field label="Original realm" required><Input required minLength={2} maxLength={80} placeholder="e.g. Argent Dawn" value={form.old_realm} onChange={e => set("old_realm", e.target.value)} /></Field>
      <Field label="Region back then" required><Select required placeholder="Select region" value={form.region} onChange={value => set("region", value)} options={["EU", "US", "KR", "TW"]} /></Field>
      <Field label="Faction back then" required><Select required placeholder="Select faction" value={form.old_faction} onChange={value => set("old_faction", value)} options={["Alliance", "Horde", "Unknown"]} /></Field>
      <Field label="WoW version" required><Select required placeholder="Select version" value={form.wow_version} onChange={value => set("wow_version", value)} options={["Retail", "Vanilla", "Classic"]} /></Field>
      <Field label="When did you play?" hint="Optional — a year or range is fine."><Input maxLength={60} placeholder="e.g. 2005–2007" value={form.years} onChange={e => set("years", e.target.value)} /></Field>
    </div>
    <Field label="A memory of the guild" hint="Optional. What might help an old guildmate recognize it?"><Textarea maxLength={700} placeholder="Late night Molten Core runs, a guild motto, familiar faces..." value={form.story} onChange={e => set("story", e.target.value)} /></Field>
    <input className="honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={e => set("website", e.target.value)} />
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><button type="button" className="text-button" onClick={onClose}>Cancel</button><Button type="submit" disabled={busy}>{busy ? "Saving..." : "Add guild to archive"} <ArrowRight size={15} /></Button></div>
  </form>;
}

function PlanForm({ guildId, guildName, onDone, onClose }: { guildId: string; guildName: string; onDone: () => void; onClose: () => void }) {
  const [form, setForm] = useState({ name: guildName, region: "", ruleset: "", faction: "", language: "", contact_url: "", note: "", website: "" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  async function submit(e: React.FormEvent) { e.preventDefault(); setBusy(true); setError(""); try { await post(`/api/guilds/${guildId}/plans`, form); onDone(); } catch (err) { setError((err as Error).message); } finally { setBusy(false); } }
  return <form onSubmit={submit} className="modal-form"><div className="modal-intro"><span className="eyebrow gold">A NEW CHAPTER</span><h2>Share a reunion plan.</h2><p>Tell old guildmates where you intend to gather in Forever. This is a community plan, not an in-game verification.</p></div>
    <div className="form-grid"><Field label="Forever guild name" required><Input required minLength={2} maxLength={80} value={form.name} onChange={e => set("name", e.target.value)} /></Field><Field label="Region" required><Select required placeholder="Select region" value={form.region} onChange={value => set("region", value)} options={["EU", "US", "KR", "TW"]} /></Field><Field label="Ruleset" required hint="Hardcore is planned for after launch."><Select required placeholder="Select ruleset" value={form.ruleset} onChange={value => set("ruleset", value)} options={["Normal", "PvP", "Roleplaying", "Hardcore"]} /></Field><Field label="Faction" required><Select required placeholder="Select faction" value={form.faction} onChange={value => set("faction", value)} options={["Alliance", "Horde"]} /></Field><Field label="Guild language" required><Input required minLength={2} maxLength={50} placeholder="e.g. English, Français" value={form.language} onChange={e => set("language", e.target.value)} /></Field><Field label="Public contact link" hint="Optional. Discord invite or guild website."><Input type="url" maxLength={300} placeholder="https://..." value={form.contact_url} onChange={e => set("contact_url", e.target.value)} /></Field></div>
    <Field label="A note for returning members"><Textarea maxLength={500} placeholder="Who should get in touch? What are you planning?" value={form.note} onChange={e => set("note", e.target.value)} /></Field><input className="honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={e => set("website", e.target.value)} />
    {error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="text-button" onClick={onClose}>Cancel</button><Button type="submit" disabled={busy}>{busy ? "Saving..." : "Post reunion plan"} <ArrowRight size={15} /></Button></div>
  </form>;
}

function MemoryForm({ guildId, onDone, onClose }: { guildId: string; onDone: () => void; onClose: () => void }) {
  const [form, setForm] = useState({ character_name: "", message: "", contact_url: "", website: "" });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  async function submit(e: React.FormEvent) { e.preventDefault(); setBusy(true); setError(""); try { await post(`/api/guilds/${guildId}/memories`, form); onDone(); } catch (err) { setError((err as Error).message); } finally { setBusy(false); } }
  return <form onSubmit={submit} className="modal-form"><div className="modal-intro"><span className="eyebrow gold">I WAS THERE</span><h2>Leave a campfire note.</h2><p>Let old guildmates know the character name they would remember. Everything here is public.</p></div>
    <Field label="Your old character name" required><Input required minLength={2} maxLength={80} placeholder="The name they knew you by" value={form.character_name} onChange={e => set("character_name", e.target.value)} /></Field><Field label="Message"><Textarea maxLength={400} placeholder="A memory, a hello, or who you're looking for..." value={form.message} onChange={e => set("message", e.target.value)} /></Field><Field label="Public contact link" hint="Optional. Share only a link you're comfortable making public."><Input type="url" maxLength={300} placeholder="https://..." value={form.contact_url} onChange={e => set("contact_url", e.target.value)} /></Field><input className="honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={e => set("website", e.target.value)} />
    {error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="text-button" onClick={onClose}>Cancel</button><Button type="submit" disabled={busy}>{busy ? "Saving..." : "Leave a note"} <ArrowRight size={15} /></Button></div>
  </form>;
}

function Detail({ detail, onBack, onPlan, onMemory }: { detail: GuildDetail; onBack: () => void; onPlan: () => void; onMemory: () => void }) {
  const { guild, plans, memories } = detail;
  return <div className="detail-page"><button className="back-link" onClick={onBack}><ArrowLeft size={17} /> Back to the archive</button><div className="detail-hero"><span className={`detail-crest crest ${guild.old_faction.toLowerCase()}`}>{guild.old_faction === "Alliance" ? <Crown size={38} /> : guild.old_faction === "Horde" ? <Swords size={38} /> : <Shield size={38} />}</span><div><span className="eyebrow gold">FROM THE OLD WORLD</span><h1>{guild.name}</h1><p>{guild.wow_version} · {guild.old_realm} · {guild.region} · {guild.old_faction}{guild.years && ` · ${guild.years}`}</p></div></div>
    {guild.story && <div className="story-panel"><BookOpen size={18} /><p>{guild.story}</p></div>}
    <div className="detail-grid"><section className="detail-section"><div className="section-head"><div><span className="eyebrow">THE NEXT CHAPTER</span><h2>Forever plans <span>{plans.length}</span></h2></div><button className="small-action" onClick={onPlan}><Plus size={16} /> Add a plan</button></div><p className="section-helper">Player-submitted intentions. Guild creation and cross-ruleset support have not been confirmed.</p>
      {plans.length ? <div className="entry-list">{plans.map((plan: Plan) => <article className="entry plan-entry" key={plan.id}><div className="entry-head"><h3>{plan.name}</h3><Badge size="sm" faction={plan.faction.toLowerCase() as "alliance" | "horde"}>{plan.faction}</Badge></div><div className="tag-row"><span>{plan.region}</span><span>{plan.ruleset}{plan.ruleset === "Hardcore" ? " · later" : ""}</span><span>{plan.language}</span></div>{plan.note && <p>{plan.note}</p>}<div className="entry-foot"><span>Shared {formatDate(plan.created_at)} · Unverified</span>{plan.contact_url && <a href={plan.contact_url} target="_blank" rel="noopener noreferrer nofollow ugc">Contact <ExternalLink size={14} /></a>}</div></article>)}</div> : <div className="empty-sub"><Compass size={28} /><h3>No path marked yet</h3><p>If your guild is coming back, share where people can find you.</p><button onClick={onPlan}>Add a Forever plan <ArrowRight size={15} /></button></div>}
    </section><section className="detail-section"><div className="section-head"><div><span className="eyebrow">FAMILIAR NAMES</span><h2>Old guildmates <span>{memories.length}</span></h2></div><button className="small-action" onClick={onMemory}><Plus size={16} /> I was there</button></div><p className="section-helper">A place to leave a public hello for people you used to play with.</p>
      {memories.length ? <div className="entry-list">{memories.map((memory: Memory) => <article className="entry memory-entry" key={memory.id}><div className="entry-head"><h3>{memory.character_name}</h3><span className="entry-date">{formatDate(memory.created_at)}</span></div>{memory.message && <p>{memory.message}</p>}{memory.contact_url && <a href={memory.contact_url} target="_blank" rel="noopener noreferrer nofollow ugc">Get in touch <ExternalLink size={14} /></a>}</article>)}</div> : <div className="empty-sub"><MessageCircle size={28} /><h3>The campfire is quiet</h3><p>Be the first to let your old guildmates know you're here.</p><button onClick={onMemory}>Leave a note <ArrowRight size={15} /></button></div>}
    </section></div></div>;
}

function App() {
  const [guilds, setGuilds] = useState<Guild[]>([]); const [detail, setDetail] = useState<GuildDetail | null>(null);
  const [query, setQuery] = useState(""); const [filters, setFilters] = useState(initialFilters);
  const [modal, setModal] = useState<Modal>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const filter = (key: keyof Filters, value: string) => setFilters(current => ({ ...current, [key]: value }));
  async function loadGuilds() { setLoading(true); setError(""); try { const params = new URLSearchParams({ q: query, ...filters }); const data = await request<{ guilds: Guild[] }>(`/api/guilds?${params}`); setGuilds(data.guilds); } catch (err) { setError((err as Error).message); } finally { setLoading(false); } }
  async function openGuild(id: string) { setError(""); try { setDetail(await request<GuildDetail>(`/api/guilds/${id}`)); if (new URLSearchParams(location.search).get("guild") !== id) history.pushState({}, "", `/?guild=${id}`); window.scrollTo({ top: 0, behavior: "smooth" }); } catch (err) { setError((err as Error).message); } }
  function closeDetail() { setDetail(null); if (location.search) history.pushState({}, "", "/"); loadGuilds(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function submitted() { setModal(null); if (detail) await openGuild(detail.guild.id); else await loadGuilds(); }
  useEffect(() => { const timer = setTimeout(() => { loadGuilds(); }, 250); return () => clearTimeout(timer); }, [query, filters]);
  useEffect(() => { async function syncFromUrl() { const id = new URLSearchParams(location.search).get("guild"); if (id) { try { setDetail(await request<GuildDetail>(`/api/guilds/${id}`)); } catch { setDetail(null); } } else setDetail(null); } syncFromUrl(); addEventListener("popstate", syncFromUrl); return () => removeEventListener("popstate", syncFromUrl); }, []);
  useEffect(() => { function key(e: KeyboardEvent) { if (e.key === "Escape") setModal(null); } window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, []);
  useEffect(() => { document.body.style.overflow = modal ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [modal]);
  return <div className="site-shell"><header className="site-header"><div className="header-inner"><a className="brand" href="/" onClick={e => { e.preventDefault(); closeDetail(); }}><span className="brand-mark"><Shield size={22} /><span>✦</span></span><span><strong>FOREVER</strong><em>GUILDS</em></span></a><nav className="nav"><button className="nav-add" onClick={() => setModal("guild")}><Plus size={15} /> Add your guild</button></nav></div></header>
  <main>{detail ? <Detail detail={detail} onBack={closeDetail} onPlan={() => setModal("plan")} onMemory={() => setModal("memory")} /> : <><section className="hero"><div className="hero-glow" /><div className="hero-inner"><div className="hero-copy"><h1>Some bonds are<br /><i>forever.</i></h1><p>Remember the guild that made Azeroth feel like home? Find your old comrades, share a memory, and see where your paths might meet again in World of Warcraft: Forever.</p><div className="hero-actions"><Button onClick={() => document.getElementById("archive")?.scrollIntoView({ behavior: "smooth" })}>Find your guild <ArrowRight size={17} /></Button><button onClick={() => setModal("guild")} className="hero-secondary"><Plus size={17} /> Add an old guild</button></div></div><div className="hero-art" aria-hidden="true"><div className="outer-ring"><div className="inner-ring"><div className="world"><div className="mountain mountain-back" /><div className="mountain mountain-front" /><div className="portal"><div className="portal-core" /></div></div></div></div><span className="rune rune-one">✦</span><span className="rune rune-two">✧</span><span className="rune rune-three">✦</span></div></div></section>
  <div className="divider"><span>✦</span></div><section className="archive-section" id="archive"><div className="content-width"><div className="archive-heading"><div><span className="eyebrow gold">THE GUILD ARCHIVE</span><h2>Find your people <span>again.</span></h2><p>Search by old guild or realm. Every listing is written by players, for players.</p></div><div className="archive-count"><strong>{guilds.length}</strong><span>{guilds.length === 1 ? "guild shown" : "guilds shown"}</span></div></div><div className="search-panel"><div className="search-box"><Search size={19} /><Input aria-label="Search guild or old realm" placeholder="Search an old guild or realm..." value={query} onChange={e => setQuery(e.target.value)} /></div><div className="filters"><Select placeholder="All regions" value={filters.region} onChange={value => filter("region", value)} options={["EU", "US", "KR", "TW"]} /><Select placeholder="Both factions" value={filters.faction} onChange={value => filter("faction", value)} options={["Alliance", "Horde"]} /><Select placeholder="Any Forever ruleset" value={filters.ruleset} onChange={value => filter("ruleset", value)} options={["Normal", "PvP", "Roleplaying", "Hardcore"]} /></div></div>
  {error ? <div className="archive-empty"><Shield size={34} /><h3>Could not load the archive</h3><p>{error}</p><button onClick={loadGuilds}>Try again <ArrowRight size={15} /></button></div> : loading ? <div className="loading-state">Opening the archive...</div> : guilds.length ? <div className="guild-grid">{guilds.map(guild => <GuildCard key={guild.id} guild={guild} onOpen={() => openGuild(guild.id)} />)}</div> : <div className="archive-empty"><div className="empty-emblem"><Users size={37} /></div><span className="eyebrow">AN UNWRITTEN CHAPTER</span><h3>{query || filters.region || filters.faction || filters.ruleset ? "No guilds match that trail." : "The archive begins with you."}</h3><p>{query || filters.region || filters.faction || filters.ruleset ? "Try another name, realm, or filter — or add the guild you remember." : "No guilds have been added yet. Put your old banner on the map so your friends can find their way back."}</p><Button onClick={() => setModal("guild")}>Add your guild <ArrowRight size={16} /></Button></div>}</div></section>
  <section className="how-section" id="how-it-works"><div className="content-width"><div className="how-head"><span className="eyebrow gold">THE JOURNEY BACK</span><h2>From then to <i>Forever</i></h2></div><div className="steps"><div><span className="step-icon"><BookOpen /></span><span className="step-number">01 / REMEMBER</span><h3>Find the old banner</h3><p>Search the guild name and original realm you knew in WoW.</p></div><div><span className="step-icon"><Heart /></span><span className="step-number">02 / RECONNECT</span><h3>Leave a familiar name</h3><p>Post the character name your guildmates would remember and a public hello.</p></div><div><span className="step-icon"><Compass /></span><span className="step-number">03 / REGROUP</span><h3>Mark a new path</h3><p>Share a Forever plan with a region, ruleset, faction, and guild language.</p></div></div><div className="rules-note"><Shield size={20} /><p><strong>About Forever's rulesets.</strong> Forever has no named realms. Players choose Normal, PvP, or Roleplaying at launch; Hardcore is planned for later. How guilds work across rulesets has not been announced, so listings here are community plans.</p><a href="https://worldofwarcraft.blizzard.com/en-us/news/24303313" target="_blank" rel="noopener noreferrer">Blizzard's recap <ExternalLink size={14} /></a></div></div></section></> }</main>
  <footer><div className="content-width footer-inner"><div className="footer-brand"><Shield size={22} /><span>FOREVER GUILDS</span></div><p>A community project for finding old friends. Not affiliated with Blizzard Entertainment.</p><span className="footer-credit">Built with Warcraft CN from <a href="https://www.orcdev.com/" target="_blank" rel="noopener noreferrer">OrcDev <ExternalLink size={12} /></a></span></div></footer>
  {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(null); }}><div className="modal" role="dialog" aria-modal="true" aria-label={modal === "guild" ? "Add guild" : modal === "plan" ? "Add Forever plan" : "Leave a note"}><button className="modal-close" aria-label="Close" onClick={() => setModal(null)}><X size={20} /></button>{modal === "guild" ? <GuildForm onClose={() => setModal(null)} onDone={async id => { setModal(null); await openGuild(id); }} /> : detail && modal === "plan" ? <PlanForm guildId={detail.guild.id} guildName={detail.guild.name} onClose={() => setModal(null)} onDone={submitted} /> : detail && <MemoryForm guildId={detail.guild.id} onClose={() => setModal(null)} onDone={submitted} />}</div></div>}
  </div>;
}

createRoot(document.getElementById("root")!).render(<App />);
