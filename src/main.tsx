import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  Compass,
  Crown,
  ExternalLink,
  Flag,
  Globe2,
  Heart,
  MessageCircle,
  Plus,
  Search,
  Shield,
  Swords,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/warcraftcn/button";
import { Card, CardContent } from "@/components/ui/warcraftcn/card";
import { Input } from "@/components/ui/warcraftcn/input";
import { Badge } from "@/components/ui/warcraftcn/badge";
import { Textarea } from "@/components/ui/warcraftcn/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/warcraftcn/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/warcraftcn/pagination";
import { Cursor } from "@/components/ui/warcraftcn/cursor";
import heroArt from "@/assets/hero-alliance.webp";
import type { Guild, GuildDetail, GuildPage, Memory, Plan } from "@/lib/types";
import "./styles.css";

type Modal = "guild" | "plan" | "memory" | null;
type Filters = { region: string; faction: string; ruleset: string };
const initialFilters: Filters = { region: "", faction: "", ruleset: "" };
const turnstileSiteKey = "0x4AAAAAAE5B2mt2uydvstqG";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, string | ((token?: string) => void)>,
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    plausible?: {
      (event: string, options?: unknown): void;
      q?: unknown[][];
      o?: unknown;
      init?: (options?: Record<string, unknown>) => void;
    };
  }
}

const stub: NonNullable<Window["plausible"]> = ((event: string, options?: unknown) => {
    (stub.q = stub.q || []).push([event, options]);
  }) as NonNullable<Window["plausible"]>;
const plausible = window.plausible ?? stub;
plausible.q = plausible.q || [];
plausible.init =
  plausible.init ||
  ((options?: Record<string, unknown>) => {
    plausible.o = options || {};
  });
plausible.init();
window.plausible = plausible;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(data.error || "Request failed."), {
      existingId: data.existingId,
    });
  return data as T;
}
const post = <T,>(path: string, value: object) =>
  request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
const formatDate = (date: string) =>
  new Date(`${date.replace(" ", "T")}Z`).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

function Turnstile({
  action,
  resetKey,
  onToken,
}: {
  action: "add_guild" | "add_plan" | "add_memory";
  resetKey: number;
  onToken: (token: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    const render = () => {
      if (!container.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(container.current, {
        sitekey: turnstileSiteKey,
        action,
        theme: "dark",
        size: "flexible",
        appearance: "interaction-only",
        callback: (token) => onToken(token ?? ""),
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    };

    let script = document.querySelector<HTMLScriptElement>(
      'script[data-turnstile="true"]',
    );
    if (!script) {
      script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.turnstile = "true";
      document.head.append(script);
    }
    script.addEventListener("load", render);
    render();

    return () => {
      script?.removeEventListener("load", render);
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
      }
      widgetId.current = null;
    };
  }, [action, onToken]);

  useEffect(() => {
    if (widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current);
    }
  }, [resetKey]);

  return <div className="turnstile" ref={container} />;
}

function NotebookLogo() {
  return (
    <svg className="brand-notebook" viewBox="0 0 48 44" aria-hidden="true">
      <defs>
        <linearGradient id="nb-page" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f3e7cb" />
          <stop offset="1" stopColor="#d6c29a" />
        </linearGradient>
        <linearGradient id="nb-handle" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4a3a22" />
          <stop offset="1" stopColor="#8f6b36" />
        </linearGradient>
        <linearGradient id="nb-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dce8f0" stopOpacity="0.55" />
          <stop offset="1" stopColor="#8aa4b5" stopOpacity="0.28" />
        </linearGradient>
        <clipPath id="nb-lens">
          <circle cx="24" cy="19" r="14" />
        </clipPath>
      </defs>
      <g>
        <rect
          x="30"
          y="27"
          width="18"
          height="5"
          rx="2.5"
          transform="rotate(40 30 27)"
          fill="url(#nb-handle)"
          stroke="#6d542f"
          strokeWidth="0.8"
        />
        <circle
          cx="24"
          cy="19"
          r="14"
          fill="#191206"
          stroke="#d3b06a"
          strokeWidth="2.4"
        />
        <g clipPath="url(#nb-lens)">
          <path
            d="M24 8 L10 10 L8 28 L22 32 Z"
            fill="url(#nb-page)"
            stroke="#b99b66"
            strokeWidth="0.8"
          />
          <path
            d="M24 8 L38 10 L40 28 L26 32 Z"
            fill="url(#nb-page)"
            stroke="#b99b66"
            strokeWidth="0.8"
          />
          <line
            x1="24"
            y1="8"
            x2="24"
            y2="32"
            stroke="#8a6b3a"
            strokeWidth="0.9"
            opacity="0.55"
          />
          <line
            x1="12.5"
            y1="15"
            x2="21"
            y2="16"
            stroke="#b08a52"
            strokeWidth="1"
            opacity="0.75"
          />
          <line
            x1="12.5"
            y1="19.5"
            x2="21"
            y2="20.5"
            stroke="#b08a52"
            strokeWidth="1"
            opacity="0.75"
          />
          <line
            x1="12.5"
            y1="24"
            x2="21"
            y2="25"
            stroke="#b08a52"
            strokeWidth="1"
            opacity="0.75"
          />
          <line
            x1="27"
            y1="15"
            x2="35.5"
            y2="16"
            stroke="#b08a52"
            strokeWidth="1"
            opacity="0.75"
          />
          <line
            x1="27"
            y1="19.5"
            x2="35.5"
            y2="20.5"
            stroke="#b08a52"
            strokeWidth="1"
            opacity="0.75"
          />
          <text x="31" y="29" fontSize="6.5" fill="#8f6b36" textAnchor="middle">
            ✦
          </text>
        </g>
        <circle
          cx="24"
          cy="19"
          r="14"
          fill="url(#nb-glass)"
          pointerEvents="none"
        />
        <path
          d="M17 8.5 A12 12 0 0 1 24 5"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.45"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

function Field({
  label,
  hint,
  children,
  required,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {required && <b aria-hidden="true"> *</b>}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
  required = false,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  required?: boolean;
  ariaLabel?: string;
}) {
  return (
    <div className="select-wrap">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="select-trigger"
            aria-label={
              value
                ? `${ariaLabel ?? placeholder}: ${value}`
                : (ariaLabel ?? placeholder)
            }
            aria-required={required || undefined}
            data-empty={!value}
          >
            <span>{value || placeholder}</span>
            <ChevronDown size={15} aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="select-menu"
          align="start"
          style={{ minWidth: "var(--radix-dropdown-menu-trigger-width)" }}
        >
          <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
            {!required && (
              <DropdownMenuRadioItem value="">
                {placeholder}
              </DropdownMenuRadioItem>
            )}
            {options.map((option) => (
              <DropdownMenuRadioItem key={option} value={option}>
                {option}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function GuildCard({ guild, onOpen }: { guild: Guild; onOpen: () => void }) {
  return (
    <a
      href={`/guild/${guild.slug}`}
      className="guild-card-button"
      onClick={(event) => {
        event.preventDefault();
        onOpen();
      }}
      aria-label={`View ${guild.name} from ${guild.old_realm}`}
    >
      <Card className="guild-card" data-size="sm">
        <CardContent className="guild-card-content">
          <div className="guild-card-top">
            <span className={`crest ${guild.old_faction.toLowerCase()}`}>
              {guild.old_faction === "Alliance" ? (
                <Crown size={23} />
              ) : guild.old_faction === "Horde" ? (
                <Swords size={23} />
              ) : (
                <Shield size={23} />
              )}
            </span>
            <span className="card-arrow">
              <ArrowRight size={18} />
            </span>
          </div>
          <div className="guild-heading">
            <span className="eyebrow">
              {guild.wow_version.toUpperCase()} GUILD
            </span>
            <h3>{guild.name}</h3>
          </div>
          <div className="guild-meta">
            <span>
              <Globe2 size={14} /> {guild.old_realm} · {guild.region}
            </span>
            <span>
              <Flag size={14} /> {guild.old_faction}
            </span>
          </div>
          <div className="guild-card-bottom">
            <span>
              {guild.plan_count
                ? `${guild.plan_count} Forever ${guild.plan_count === 1 ? "plan" : "plans"}`
                : "No Forever plan yet"}
            </span>
            <span>
              {guild.memory_count}{" "}
              {guild.memory_count === 1 ? "member" : "members"} found
            </span>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

function GuildForm({
  onDone,
  onClose,
}: {
  onDone: (guild: { id: string; slug: string }) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    old_realm: "",
    region: "",
    old_faction: "",
    wow_version: "",
    years: "",
    story: "",
    website: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.region || !form.old_faction || !form.wow_version) {
      setError(
        "Choose the region, faction, and WoW version for your old guild.",
      );
      e.currentTarget
        .querySelector<HTMLButtonElement>('.select-trigger[data-empty="true"]')
        ?.focus();
      return;
    }
    if (!turnstileToken) {
      setError("Complete the security check before submitting.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await post<{ id: string; slug: string }>("/api/guilds", {
        ...form,
        "cf-turnstile-response": turnstileToken,
      });
      onDone(result);
    } catch (err) {
      const e = err as Error & { existingId?: string; slug?: string };
      if (e.existingId && e.slug) onDone({ id: e.existingId, slug: e.slug });
      else setError(e.message);
    } finally {
      setBusy(false);
      setTurnstileToken("");
      setTurnstileReset((value) => value + 1);
    }
  }
  return (
    <form onSubmit={submit} className="modal-form">
      <div className="modal-intro">
        <span className="eyebrow gold">ADD TO THE ARCHIVE</span>
        <h2>Remember your guild.</h2>
        <p>
          Start with its original home. You can add a Forever reunion plan once
          the guild is listed.
        </p>
      </div>
      <div className="form-grid">
        <Field label="Old guild name" required>
          <Input
            required
            minLength={2}
            maxLength={80}
            placeholder="e.g. Guardians of the Dawn"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <Field label="Original realm" required>
          <Input
            required
            minLength={2}
            maxLength={80}
            placeholder="e.g. Argent Dawn"
            value={form.old_realm}
            onChange={(e) => set("old_realm", e.target.value)}
          />
        </Field>
        <Field label="Region back then" required>
          <Select
            required
            placeholder="Select region"
            value={form.region}
            onChange={(value) => set("region", value)}
            options={["EU", "US", "KR", "TW"]}
          />
        </Field>
        <Field label="Faction back then" required>
          <Select
            required
            placeholder="Select faction"
            value={form.old_faction}
            onChange={(value) => set("old_faction", value)}
            options={["Alliance", "Horde", "Unknown"]}
          />
        </Field>
        <Field label="WoW version" required>
          <Select
            required
            placeholder="Select version"
            value={form.wow_version}
            onChange={(value) => set("wow_version", value)}
            options={["Retail", "Vanilla", "Classic", "Private"]}
          />
        </Field>
        <Field
          label="When did you play?"
          hint="Optional — a year or range is fine."
        >
          <Input
            maxLength={60}
            placeholder="e.g. 2005–2007"
            value={form.years}
            onChange={(e) => set("years", e.target.value)}
          />
        </Field>
      </div>
      <Field
        label="A memory of the guild"
        hint="Optional. What might help an old guildmate recognize it?"
      >
        <Textarea
          maxLength={700}
          placeholder="Late night Molten Core runs, a guild motto, familiar faces..."
          value={form.story}
          onChange={(e) => set("story", e.target.value)}
        />
      </Field>
      <input
        className="honeypot"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={form.website}
        onChange={(e) => set("website", e.target.value)}
      />
      <Turnstile
        action="add_guild"
        resetKey={turnstileReset}
        onToken={setTurnstileToken}
      />
      <p className="public-notice">
        Submissions are public. See our <a href="/privacy">privacy policy</a>.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="text-button" onClick={onClose}>
          Cancel
        </button>
        <Button type="submit" disabled={busy || !turnstileToken}>
          {busy ? "Saving..." : "Add guild to archive"} <ArrowRight size={15} />
        </Button>
      </div>
    </form>
  );
}

function PlanForm({
  guildId,
  guildName,
  onDone,
  onClose,
}: {
  guildId: string;
  guildName: string;
  onDone: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: guildName,
    region: "",
    ruleset: "",
    faction: "",
    language: "",
    contact_url: "",
    note: "",
    website: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.region || !form.ruleset || !form.faction) {
      setError("Choose a region, ruleset, and faction for the Forever plan.");
      e.currentTarget
        .querySelector<HTMLButtonElement>('.select-trigger[data-empty="true"]')
        ?.focus();
      return;
    }
    if (!turnstileToken) {
      setError("Complete the security check before submitting.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post(`/api/guilds/${guildId}/plans`, {
        ...form,
        "cf-turnstile-response": turnstileToken,
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      setTurnstileToken("");
      setTurnstileReset((value) => value + 1);
    }
  }
  return (
    <form onSubmit={submit} className="modal-form">
      <div className="modal-intro">
        <span className="eyebrow gold">A NEW CHAPTER</span>
        <h2>Share a reunion plan.</h2>
        <p>Tell old guildmates where you intend to gather in Forever.</p>
      </div>
      <div className="form-grid">
        <Field label="Forever guild name" required>
          <Input
            required
            minLength={2}
            maxLength={80}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <Field label="Region" required>
          <Select
            required
            placeholder="Select region"
            value={form.region}
            onChange={(value) => set("region", value)}
            options={["EU", "US", "KR", "TW"]}
          />
        </Field>
        <Field
          label="Ruleset"
          required
          hint="Hardcore is planned for after launch."
        >
          <Select
            required
            placeholder="Select ruleset"
            value={form.ruleset}
            onChange={(value) => set("ruleset", value)}
            options={["Normal", "PvP", "Roleplaying", "Hardcore"]}
          />
        </Field>
        <Field label="Faction" required>
          <Select
            required
            placeholder="Select faction"
            value={form.faction}
            onChange={(value) => set("faction", value)}
            options={["Alliance", "Horde"]}
          />
        </Field>
        <Field label="Guild language" required>
          <Input
            required
            minLength={2}
            maxLength={50}
            placeholder="e.g. English, Français"
            value={form.language}
            onChange={(e) => set("language", e.target.value)}
          />
        </Field>
        <Field
          label="Public contact link"
          hint="Optional. Discord invite or guild website."
        >
          <Input
            type="url"
            maxLength={300}
            placeholder="https://..."
            value={form.contact_url}
            onChange={(e) => set("contact_url", e.target.value)}
          />
        </Field>
      </div>
      <Field label="A note for returning members">
        <Textarea
          maxLength={500}
          placeholder="Who should get in touch? What are you planning?"
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
        />
      </Field>
      <input
        className="honeypot"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={form.website}
        onChange={(e) => set("website", e.target.value)}
      />
      <Turnstile
        action="add_plan"
        resetKey={turnstileReset}
        onToken={setTurnstileToken}
      />
      <p className="public-notice">
        Submissions are public. See our <a href="/privacy">privacy policy</a>.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="text-button" onClick={onClose}>
          Cancel
        </button>
        <Button type="submit" disabled={busy || !turnstileToken}>
          {busy ? "Saving..." : "Post reunion plan"} <ArrowRight size={15} />
        </Button>
      </div>
    </form>
  );
}

function MemoryForm({
  guildId,
  onDone,
  onClose,
}: {
  guildId: string;
  onDone: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    character_name: "",
    message: "",
    contact_url: "",
    website: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!turnstileToken) {
      setError("Complete the security check before submitting.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await post(`/api/guilds/${guildId}/memories`, {
        ...form,
        "cf-turnstile-response": turnstileToken,
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      setTurnstileToken("");
      setTurnstileReset((value) => value + 1);
    }
  }
  return (
    <form onSubmit={submit} className="modal-form">
      <div className="modal-intro">
        <span className="eyebrow gold">I WAS THERE</span>
        <h2>Leave a campfire note.</h2>
        <p>
          Let old guildmates know the character name they would remember.
          Everything here is public.
        </p>
      </div>
      <Field label="Your old character name" required>
        <Input
          required
          minLength={2}
          maxLength={80}
          placeholder="The name they knew you by"
          value={form.character_name}
          onChange={(e) => set("character_name", e.target.value)}
        />
      </Field>
      <Field label="Message">
        <Textarea
          maxLength={400}
          placeholder="A memory, a hello, or who you're looking for..."
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
        />
      </Field>
      <Field
        label="Public contact link"
        hint="Optional. Share only a link you're comfortable making public."
      >
        <Input
          type="url"
          maxLength={300}
          placeholder="https://..."
          value={form.contact_url}
          onChange={(e) => set("contact_url", e.target.value)}
        />
      </Field>
      <input
        className="honeypot"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={form.website}
        onChange={(e) => set("website", e.target.value)}
      />
      <Turnstile
        action="add_memory"
        resetKey={turnstileReset}
        onToken={setTurnstileToken}
      />
      <p className="public-notice">
        Submissions are public. See our <a href="/privacy">privacy policy</a>.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="text-button" onClick={onClose}>
          Cancel
        </button>
        <Button type="submit" disabled={busy || !turnstileToken}>
          {busy ? "Saving..." : "Leave a note"} <ArrowRight size={15} />
        </Button>
      </div>
    </form>
  );
}

function Detail({
  detail,
  onBack,
  onPlan,
  onMemory,
}: {
  detail: GuildDetail;
  onBack: () => void;
  onPlan: () => void;
  onMemory: () => void;
}) {
  const { guild, plans, memories } = detail;
  return (
    <div className="detail-page">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={17} /> Back to the archive
      </button>
      <div className="detail-hero">
        <span
          className={`detail-crest crest ${guild.old_faction.toLowerCase()}`}
        >
          {guild.old_faction === "Alliance" ? (
            <Crown size={38} />
          ) : guild.old_faction === "Horde" ? (
            <Swords size={38} />
          ) : (
            <Shield size={38} />
          )}
        </span>
        <div>
          <span className="eyebrow gold">FROM THE OLD WORLD</span>
          <h1>{guild.name}</h1>
          <p>
            {guild.wow_version} · {guild.old_realm} · {guild.region} ·{" "}
            {guild.old_faction}
            {guild.years && ` · ${guild.years}`}
          </p>
        </div>
      </div>
      {guild.story && (
        <div className="story-panel">
          <BookOpen size={18} />
          <p>{guild.story}</p>
        </div>
      )}
      <div className="detail-grid">
        <section className="detail-section">
          <div className="section-head">
            <div>
              <span className="eyebrow">THE NEXT CHAPTER</span>
              <h2>
                Forever plans <span>{plans.length}</span>
              </h2>
            </div>
            <Button
              variant="frame"
              className="secondary-button"
              onClick={onPlan}
            >
              <Plus size={16} /> Add a plan
            </Button>
          </div>
          <p className="section-helper">
            Player-submitted intentions. Guild creation and cross-ruleset
            support have not been confirmed.
          </p>
          {plans.length ? (
            <div className="entry-list">
              {plans.map((plan: Plan) => (
                <article className="entry plan-entry" key={plan.id}>
                  <div className="entry-head">
                    <h3>{plan.name}</h3>
                    <Badge
                      size="sm"
                      faction={
                        plan.faction.toLowerCase() as "alliance" | "horde"
                      }
                    >
                      {plan.faction}
                    </Badge>
                  </div>
                  <div className="tag-row">
                    <span>{plan.region}</span>
                    <span>
                      {plan.ruleset}
                      {plan.ruleset === "Hardcore" ? " · later" : ""}
                    </span>
                    <span>{plan.language}</span>
                  </div>
                  {plan.note && <p>{plan.note}</p>}
                  <div className="entry-foot">
                    <span>
                      Shared {formatDate(plan.created_at)} · Unverified
                    </span>
                    {plan.contact_url && (
                      <a
                        href={plan.contact_url}
                        target="_blank"
                        rel="noopener noreferrer nofollow ugc"
                      >
                        Contact <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-sub">
              <Compass size={28} />
              <h3>No path marked yet</h3>
              <p>
                If your guild is coming back, share where people can find you.
              </p>
              <button onClick={onPlan}>
                Add a Forever plan <ArrowRight size={15} />
              </button>
            </div>
          )}
        </section>
        <section className="detail-section">
          <div className="section-head">
            <div>
              <span className="eyebrow">FAMILIAR NAMES</span>
              <h2>
                Old guildmates <span>{memories.length}</span>
              </h2>
            </div>
            <Button
              variant="frame"
              className="secondary-button"
              onClick={onMemory}
            >
              <Plus size={16} /> I was there
            </Button>
          </div>
          <p className="section-helper">
            A place to leave a public hello for people you used to play with.
          </p>
          {memories.length ? (
            <div className="entry-list">
              {memories.map((memory: Memory) => (
                <article className="entry memory-entry" key={memory.id}>
                  <div className="entry-head">
                    <h3>{memory.character_name}</h3>
                    <span className="entry-date">
                      {formatDate(memory.created_at)}
                    </span>
                  </div>
                  {memory.message && <p>{memory.message}</p>}
                  {memory.contact_url && (
                    <a
                      href={memory.contact_url}
                      target="_blank"
                      rel="noopener noreferrer nofollow ugc"
                    >
                      Get in touch <ExternalLink size={14} />
                    </a>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-sub">
              <MessageCircle size={28} />
              <h3>The campfire is quiet</h3>
              <p>Be the first to let your old guildmates know you're here.</p>
              <button onClick={onMemory}>
                Leave a note <ArrowRight size={15} />
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ArchivePagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);
  const items: React.ReactNode[] = [];
  const navigate = (
    event: React.MouseEvent<HTMLAnchorElement>,
    target: number,
  ) => {
    event.preventDefault();
    if (target >= 1 && target <= totalPages && target !== page)
      onChange(target);
  };
  pages.forEach((value, index) => {
    const previous = pages[index - 1];
    if (previous && value - previous === 2) {
      const missing = previous + 1;
      items.push(
        <PaginationItem key={missing}>
          <PaginationLink
            href="#archive"
            onClick={(event) => navigate(event, missing)}
            aria-label={`Go to page ${missing}`}
          >
            {missing}
          </PaginationLink>
        </PaginationItem>,
      );
    } else if (previous && value - previous > 2) {
      items.push(
        <PaginationItem key={`ellipsis-${value}`}>
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }
    items.push(
      <PaginationItem key={value}>
        <PaginationLink
          href="#archive"
          isActive={value === page}
          onClick={(event) => navigate(event, value)}
          aria-label={`Go to page ${value}`}
        >
          {value}
        </PaginationLink>
      </PaginationItem>,
    );
  });
  return (
    <Pagination className="archive-pagination" aria-label="Guild archive pages">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#archive"
            disabled={page === 1}
            onClick={(event) => navigate(event, page - 1)}
          />
        </PaginationItem>
        {items}
        <PaginationItem>
          <PaginationNext
            href="#archive"
            disabled={page === totalPages}
            onClick={(event) => navigate(event, page + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

function App() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [detail, setDetail] = useState<GuildDetail | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const guildRequest = useRef(0);
  const [modal, setModal] = useState<Modal>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const filter = (key: keyof Filters, value: string) => {
    guildRequest.current++;
    setLoading(true);
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const search = (value: string) => {
    guildRequest.current++;
    setLoading(true);
    setPage(1);
    setQuery(value);
  };
  const goToPage = (value: number) => {
    guildRequest.current++;
    setLoading(true);
    setPage(value);
    document.getElementById("archive")?.scrollIntoView({ behavior: "smooth" });
  };
  async function loadGuilds() {
    const requestId = ++guildRequest.current;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        q: query,
        ...filters,
        page: String(page),
      });
      const data = await request<GuildPage>(`/api/guilds?${params}`);
      if (requestId !== guildRequest.current) return;
      setGuilds(data.guilds);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setPageSize(data.pageSize);
      if (data.page !== page) setPage(data.page);
    } catch (err) {
      if (requestId === guildRequest.current) setError((err as Error).message);
    } finally {
      if (requestId === guildRequest.current) setLoading(false);
    }
  }
  async function openGuild(guild: { id: string; slug: string }) {
    setError("");
    try {
      setDetail(await request<GuildDetail>(`/api/guilds/${guild.id}`));
      if (location.pathname !== `/guild/${guild.slug}`)
        history.pushState({}, "", `/guild/${guild.slug}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError((err as Error).message);
    }
  }
  function closeDetail() {
    setDetail(null);
    if (location.pathname !== "/" || location.search)
      history.pushState({}, "", "/");
    loadGuilds();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function submitted() {
    setModal(null);
    if (detail) await openGuild(detail.guild);
    else await loadGuilds();
  }
  useEffect(() => {
    const timer = setTimeout(() => {
      loadGuilds();
    }, 250);
    return () => clearTimeout(timer);
  }, [query, filters, page]);
  useEffect(() => {
    async function syncFromUrl() {
      const pathSlug = location.pathname.match(/^\/guild\/([^/]+)$/)?.[1];
      const identifier =
        pathSlug ?? new URLSearchParams(location.search).get("guild");
      if (identifier) {
        try {
          setDetail(await request<GuildDetail>(`/api/guilds/${identifier}`));
        } catch {
          setDetail(null);
        }
      } else setDetail(null);
    }
    syncFromUrl();
    addEventListener("popstate", syncFromUrl);
    return () => removeEventListener("popstate", syncFromUrl);
  }, []);
  useEffect(() => {
    const description = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (detail) {
      document.title = `${detail.guild.name} on ${detail.guild.old_realm} | Forever Guilds`;
      description?.setAttribute(
        "content",
        `Reconnect with members of ${detail.guild.name} from ${detail.guild.old_realm} on Forever Guilds.`,
      );
    } else {
      document.title = "Forever Guilds | Find Your Old World of Warcraft Guild";
      description?.setAttribute(
        "content",
        "Find old World of Warcraft guildmates, share memories, and make reunion plans for WoW Forever.",
      );
    }
  }, [detail]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (
        e.key === "Escape" &&
        !(
          e.target instanceof Element &&
          e.target.closest('[data-slot="dropdown-menu-content"]')
        )
      )
        setModal(null);
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    document.body.style.overflow = modal ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modal]);
  return (
    <Cursor faction="human" className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <a
            className="brand"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              closeDetail();
            }}
          >
            <span className="brand-mark">
              <NotebookLogo />
            </span>
            <span>
              <strong>FOREVER</strong>
              <em>GUILDS</em>
            </span>
          </a>
          <nav className="nav">
            <span>
              <Button
                className="header-primary"
                onClick={() => setModal("guild")}
              >
                <Plus size={14} /> Add your guild
              </Button>
            </span>
          </nav>
        </div>
      </header>
      <main>
        {detail ? (
          <Detail
            detail={detail}
            onBack={closeDetail}
            onPlan={() => setModal("plan")}
            onMemory={() => setModal("memory")}
          />
        ) : (
          <>
            <section className="hero">
              <div className="hero-glow" />
              <div className="hero-inner">
                <div className="hero-copy">
                  <h1>
                    <span>Some bonds are</span>
                    <br />
                    <i>forever.</i>
                  </h1>
                  <p>
                    Remember the guild that made Azeroth feel like home? Find
                    your old comrades, share a memory, and see where your paths
                    might meet again in World of Warcraft: Forever.
                  </p>
                  <div className="hero-actions">
                    <Button
                      onClick={() =>
                        document
                          .getElementById("archive")
                          ?.scrollIntoView({ behavior: "smooth" })
                      }
                    >
                      Find your guild <ArrowRight size={17} />
                    </Button>
                    <Button
                      variant="frame"
                      className="secondary-button"
                      onClick={() => setModal("guild")}
                    >
                      <Plus size={17} /> Add an old guild
                    </Button>
                  </div>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="outer-ring">
                    <div className="inner-ring">
                      <div className="world">
                        <img
                          src={heroArt}
                          alt="Alliance heroes of World of Warcraft: Forever"
                          width={1000}
                          height={686}
                        />
                      </div>
                    </div>
                  </div>
                  <span className="rune rune-one">✦</span>
                  <span className="rune rune-two">✧</span>
                  <span className="rune rune-three">✦</span>
                </div>
              </div>
            </section>
            <div className="divider">
              <span>✦</span>
            </div>
            <section className="archive-section" id="archive">
              <div className="content-width">
                <div className="archive-heading">
                  <div>
                    <span className="eyebrow gold">THE GUILD ARCHIVE</span>
                    <h2>
                      Find your people <span>again.</span>
                    </h2>
                    <p>
                      Search by old guild or realm. Every listing is written by
                      players, for players.
                    </p>
                  </div>
                  <div className="archive-count">
                    <strong>{total}</strong>
                    <span>{total === 1 ? "guild found" : "guilds found"}</span>
                  </div>
                </div>
                <div className="search-panel">
                  <div className="search-box">
                    <Search size={19} />
                    <Input
                      aria-label="Search guild or old realm"
                      placeholder="Search an old guild or realm..."
                      value={query}
                      onChange={(e) => search(e.target.value)}
                    />
                  </div>
                  <div className="filters">
                    <Select
                      placeholder="All regions"
                      value={filters.region}
                      onChange={(value) => filter("region", value)}
                      options={["EU", "US", "KR", "TW"]}
                    />
                    <Select
                      placeholder="Both factions"
                      value={filters.faction}
                      onChange={(value) => filter("faction", value)}
                      options={["Alliance", "Horde"]}
                    />
                    <Select
                      placeholder="Any Forever ruleset"
                      value={filters.ruleset}
                      onChange={(value) => filter("ruleset", value)}
                      options={["Normal", "PvP", "Roleplaying", "Hardcore"]}
                    />
                  </div>
                </div>
                {error ? (
                  <div className="archive-empty">
                    <Shield size={34} />
                    <h3>Could not load the archive</h3>
                    <p>{error}</p>
                    <button onClick={loadGuilds}>
                      Try again <ArrowRight size={15} />
                    </button>
                  </div>
                ) : loading ? (
                  <div className="loading-state">Opening the archive...</div>
                ) : guilds.length ? (
                  <>
                    <div className="guild-grid">
                      {guilds.map((guild) => (
                        <GuildCard
                          key={guild.id}
                          guild={guild}
                          onOpen={() => openGuild(guild)}
                        />
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <div className="archive-pagination-area">
                        <p>
                          Showing {(page - 1) * pageSize + 1}–
                          {Math.min(page * pageSize, total)} of {total} guilds
                        </p>
                        <ArchivePagination
                          page={page}
                          totalPages={totalPages}
                          onChange={goToPage}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="archive-empty">
                    <div className="empty-emblem">
                      <Users size={37} />
                    </div>
                    <span className="eyebrow">AN UNWRITTEN CHAPTER</span>
                    <h3>
                      {query ||
                      filters.region ||
                      filters.faction ||
                      filters.ruleset
                        ? "No guilds match that trail."
                        : "The archive begins with you."}
                    </h3>
                    <p>
                      {query ||
                      filters.region ||
                      filters.faction ||
                      filters.ruleset
                        ? "Try another name, realm, or filter — or add the guild you remember."
                        : "No guilds have been added yet. Put your old banner on the map so your friends can find their way back."}
                    </p>
                    <Button onClick={() => setModal("guild")}>
                      Add your guild <ArrowRight size={16} />
                    </Button>
                  </div>
                )}
              </div>
            </section>
            <section className="how-section" id="how-it-works">
              <div className="content-width">
                <div className="how-head">
                  <span className="eyebrow gold">THE JOURNEY BACK</span>
                  <h2>
                    From then to <i>Forever</i>
                  </h2>
                </div>
                <div className="steps">
                  <div>
                    <span className="step-icon">
                      <BookOpen />
                    </span>
                    <span className="step-number">01 / REMEMBER</span>
                    <h3>Find the old banner</h3>
                    <p>
                      Search the guild name and original realm you knew in WoW.
                    </p>
                  </div>
                  <div>
                    <span className="step-icon">
                      <Heart />
                    </span>
                    <span className="step-number">02 / RECONNECT</span>
                    <h3>Leave a familiar name</h3>
                    <p>
                      Post the character name your guildmates would remember and
                      a public hello.
                    </p>
                  </div>
                  <div>
                    <span className="step-icon">
                      <Compass />
                    </span>
                    <span className="step-number">03 / REGROUP</span>
                    <h3>Mark a new path</h3>
                    <p>
                      Share a Forever plan with a region, ruleset, faction, and
                      guild language.
                    </p>
                  </div>
                </div>
                <div className="rules-note">
                  <Shield size={20} />
                  <p>
                    <strong>About Forever's rulesets.</strong> Forever has no
                    named realms. Players choose Normal, PvP, or Roleplaying at
                    launch; Hardcore is planned for later. How guilds work
                    across rulesets has not been announced, so listings here are
                    community plans.
                  </p>
                  <a
                    href="https://worldofwarcraft.blizzard.com/en-us/news/24303313"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Blizzard's recap <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      <footer>
        <div className="content-width footer-inner">
          <div className="footer-brand">
            <Shield size={22} />
            <span>FOREVER GUILDS</span>
          </div>
          <p>
            A community project for finding old friends. Not affiliated with
            Blizzard Entertainment.
          </p>
          <span className="footer-credit">
            Built with Warcraft CN from{" "}
            <a
              href="https://www.orcdev.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              OrcDev <ExternalLink size={12} />
            </a>
          </span>
          <span className="footer-links">
            <a href="/privacy">Privacy</a>
            <a
              href="https://github.com/SebastienD11/forever-guilds/issues/new"
              target="_blank"
              rel="noopener noreferrer"
            >
              Report content
            </a>
          </span>
        </div>
      </footer>
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <Card
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "guild"
                ? "Add guild"
                : modal === "plan"
                  ? "Add Forever plan"
                  : "Leave a note"
            }
          >
            <button
              className="modal-close"
              aria-label="Close"
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            {modal === "guild" ? (
              <GuildForm
                onClose={() => setModal(null)}
                onDone={async (guild) => {
                  setModal(null);
                  await openGuild(guild);
                }}
              />
            ) : detail && modal === "plan" ? (
              <PlanForm
                guildId={detail.guild.id}
                guildName={detail.guild.name}
                onClose={() => setModal(null)}
                onDone={submitted}
              />
            ) : (
              detail && (
                <MemoryForm
                  guildId={detail.guild.id}
                  onClose={() => setModal(null)}
                  onDone={submitted}
                />
              )
            )}
          </Card>
        </div>
      )}
    </Cursor>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
