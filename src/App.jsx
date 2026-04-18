import React, { useState, useEffect, useRef, useReducer, useContext, useMemo, createContext } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, CartesianGrid, Legend, RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts';
import {
  Home, Search, Zap, Play, BarChart3, Settings, ChevronRight, ChevronLeft,
  Circle, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Eye, EyeOff,
  Sparkles, Activity, Target, Layers, ArrowUpRight, ArrowDownRight, Clock,
  Plus, X, Check, AlertTriangle, Info, Radio, Terminal, FileText, Link2,
  MessageSquare, Database, Globe, Shield, Rocket, ArrowRight, Loader2
} from 'lucide-react';

// =============================================================================
// DESIGN TOKENS
// =============================================================================
const t = {
  bg: '#0A0A0B',
  bgElev: '#131316',
  bgCard: '#18181C',
  bgHover: '#1F1F24',
  border: '#26262C',
  borderStrong: '#34343C',
  textPrimary: '#F5F5F7',
  textSecondary: '#A1A1AA',
  textTertiary: '#6B6B73',
  accent: '#7C5CFF',
  accentDim: '#4F3FB5',
  accentBg: 'rgba(124, 92, 255, 0.12)',
  success: '#4ADE80',
  successBg: 'rgba(74, 222, 128, 0.1)',
  danger: '#F87171',
  dangerBg: 'rgba(248, 113, 113, 0.1)',
  warning: '#FBBF24',
  warningBg: 'rgba(251, 191, 36, 0.1)',
  info: '#60A5FA',
  infoBg: 'rgba(96, 165, 250, 0.1)',
};

// =============================================================================
// DEMO STATE + HOOKS
// =============================================================================
const initialDemoState = {
  onboarded: false,
  profile: null,         // set during Onboarding analyze step; everything downstream reads this
  autopilot: false,      // true → skip Action Plan, agent self-approves (Rankad-style)
  approvedActions: null, // null until ActionPlan has been visited; then Set<string>
  agentLaunched: false,
  agentComplete: false,
  dashboardScanned: false, // becomes true after first Dashboard visit finishes its scan skeleton
  editorOpen: false,     // Demo editor drawer (Ctrl+Shift+E)
};

function demoReducer(state, action) {
  switch (action.type) {
    case 'SET_PROFILE':
      return { ...state, profile: action.profile };
    case 'PATCH_PROFILE':
      // Merge partial updates into profile (used by DemoEditor); preserve pieces not edited.
      return { ...state, profile: { ...state.profile, ...action.patch } };
    case 'SET_AUTOPILOT':
      return { ...state, autopilot: !!action.value };
    case 'COMPLETE_ONBOARDING':
      return { ...state, onboarded: true };
    case 'SET_APPROVED':
      return { ...state, approvedActions: new Set(action.ids) };
    case 'LAUNCH_AGENT':
      return { ...state, agentLaunched: true };
    case 'COMPLETE_AGENT':
      return { ...state, agentComplete: true };
    case 'MARK_DASHBOARD_SCANNED':
      return { ...state, dashboardScanned: true };
    case 'OPEN_EDITOR':
      return { ...state, editorOpen: true };
    case 'CLOSE_EDITOR':
      return { ...state, editorOpen: false };
    case 'RESET':
      return { ...initialDemoState };
    default:
      return state;
  }
}

// Persistence: profile + autopilot survive page reloads so a presenter can close
// the editor, refresh, and keep the customized demo config.
const DEMO_STORAGE_KEY = 'presense.demoConfig.v1';

function loadPersistedDemo() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function savePersistedDemo(payload) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(payload));
  } catch { /* quota/full/ignore */ }
}

function clearPersistedDemo() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(DEMO_STORAGE_KEY);
  } catch { /* ignore */ }
}

const DemoContext = createContext(null);
const useDemo = () => useContext(DemoContext);

// Animated counter that eases from `from` to `to` over `duration` ms.
function useCountUp(target, duration = 900, enabled = true) {
  const [value, setValue] = useState(enabled ? target : 0);
  const startRef = useRef(null);
  const fromRef = useRef(enabled ? target : 0);
  useEffect(() => {
    if (!enabled) { setValue(0); return; }
    fromRef.current = value;
    startRef.current = null;
    let raf;
    const tick = (ts) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const next = fromRef.current + (target - fromRef.current) * eased;
      setValue(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, enabled]);
  return value;
}

// =============================================================================
// MOCK DATA — realistic SaaS B2B scenario (Flowspace — a project tool)
// =============================================================================
const BRAND = {
  name: 'Flowspace',
  domain: 'flowspace.io',
  tagline: 'Async project tracking for remote teams',
  industry: 'B2B SaaS · Project Management',
  stage: 'Series A',
};

const AI_MODELS = [
  { id: 'chatgpt', name: 'ChatGPT', vendor: 'OpenAI', color: '#10A37F', weight: 0.42 },
  { id: 'perplexity', name: 'Perplexity', vendor: 'Perplexity AI', color: '#20B8CD', weight: 0.23 },
  { id: 'gemini', name: 'Gemini', vendor: 'Google', color: '#4285F4', weight: 0.20 },
  { id: 'claude', name: 'Claude', vendor: 'Anthropic', color: '#D97757', weight: 0.15 },
];

const PROMPTS = [
  { id: 'p1', text: 'Best project management tool for remote teams', volume: 18400, intent: 'high', mentioned: [], priority: 1 },
  { id: 'p2', text: 'Async collaboration software for startups', volume: 9200, intent: 'high', mentioned: ['claude'], priority: 2 },
  { id: 'p3', text: 'Alternatives to traditional Kanban tools', volume: 4800, intent: 'medium', mentioned: [], priority: 2 },
  { id: 'p4', text: 'Project tracking for distributed engineering teams', volume: 6100, intent: 'high', mentioned: [], priority: 1 },
  { id: 'p5', text: 'Workflow automation for small product teams', volume: 3400, intent: 'medium', mentioned: ['perplexity'], priority: 3 },
  { id: 'p6', text: 'Team productivity software with AI features', volume: 11200, intent: 'high', mentioned: [], priority: 1 },
  { id: 'p7', text: 'Best tools for OKR tracking', volume: 5600, intent: 'medium', mentioned: ['chatgpt'], priority: 3 },
  { id: 'p8', text: 'Notion alternatives for project management', volume: 7800, intent: 'high', mentioned: [], priority: 2 },
];

const PERSONAS = [
  { id: 'per1', name: 'Remote-first Founder', stage: 'Awareness', coverage: 18 },
  { id: 'per2', name: 'Engineering Manager', stage: 'Consideration', coverage: 34 },
  { id: 'per3', name: 'Product Lead', stage: 'Decision', coverage: 12 },
];

const SIGNALS = [
  {
    id: 's1',
    name: 'Community mentions (Reddit, HN, Dev.to)',
    category: 'Social Proof',
    weight: 'High',
    weightNum: 92,
    status: 'critical',
    yourValue: '7 mentions (90 days)',
    benchmark: 'Top performers: 800-1400',
    explanation: 'LLMs heavily weight organic mentions in technical communities. Your brand is nearly invisible in Reddit threads like r/remotework and r/startups, which are primary training-data sources for product recommendations.',
    models_affected: ['chatgpt', 'perplexity', 'claude'],
  },
  {
    id: 's2',
    name: 'Third-party review density ("remote" keyword)',
    category: 'Social Proof',
    weight: 'High',
    weightNum: 88,
    status: 'critical',
    yourValue: '0 matches on G2 / Capterra',
    benchmark: 'Top performers: 150+',
    explanation: 'Review platforms are high-trust sources. When users ask about "remote teams", models surface products whose reviews explicitly mention that use-case. Your reviews don\'t contain the keyword.',
    models_affected: ['chatgpt', 'gemini', 'perplexity'],
  },
  {
    id: 's3',
    name: 'Structured data on product pages',
    category: 'Technical',
    weight: 'Medium',
    weightNum: 64,
    status: 'warning',
    yourValue: 'Partial — 3 of 14 pages',
    benchmark: 'Full coverage expected',
    explanation: 'Missing SoftwareApplication and FAQPage schema on core pages. This reduces how confidently LLMs can parse your product\'s features, pricing, and category.',
    models_affected: ['gemini', 'perplexity'],
  },
  {
    id: 's4',
    name: 'Entity consistency across surfaces',
    category: 'Technical',
    weight: 'Medium',
    weightNum: 58,
    status: 'warning',
    yourValue: '4 conflicting descriptions',
    benchmark: 'Single source of truth',
    explanation: 'Your brand is described differently on LinkedIn, Crunchbase, your homepage, and press releases. This confuses entity resolution — models fail to consolidate trust signals into a single recognized entity.',
    models_affected: ['chatgpt', 'gemini', 'claude', 'perplexity'],
  },
  {
    id: 's5',
    name: 'Comparison & alternative content',
    category: 'Editorial',
    weight: 'Medium',
    weightNum: 55,
    status: 'warning',
    yourValue: '0 published',
    benchmark: '4-8 targeted pages',
    explanation: 'High-intent queries ("X vs Y", "alternatives to Z") drive AI citations. You have no comparison content indexed. Models default to legacy brands for these prompts.',
    models_affected: ['perplexity', 'chatgpt'],
  },
  {
    id: 's6',
    name: 'Crawlability for AI user-agents',
    category: 'Technical',
    weight: 'Baseline',
    weightNum: 40,
    status: 'ok',
    yourValue: 'robots.txt allows all',
    benchmark: 'Baseline met',
    explanation: 'Your site is accessible to GPTBot, PerplexityBot, ClaudeBot, and Google-Extended. This is a prerequisite — already in good shape.',
    models_affected: [],
  },
  {
    id: 's7',
    name: 'Citation-ready content depth',
    category: 'Editorial',
    weight: 'Medium',
    weightNum: 52,
    status: 'warning',
    yourValue: 'Thin on long-form',
    benchmark: '15+ pillar articles',
    explanation: 'LLMs prefer citing authoritative long-form content over marketing pages. Your blog has short posts (avg 600 words). Pillar content (1800+ words) with clear headings is more citation-friendly.',
    models_affected: ['claude', 'perplexity'],
  },
];

const ACTIONS = [
  {
    id: 'a1',
    title: 'Seed authentic community conversations',
    description: 'Identify 12 live Reddit/HN threads asking for recommendations in your category, and place contextual mentions through verified accounts.',
    category: 'Social Proof',
    impact: 28,
    duration: '2-3 weeks',
    effort: 'Automated + human review',
    addresses: ['s1'],
    status: 'queued',
    technical_details: 'Uses NLP to scan r/remotework, r/startups, r/productivity, r/sideproject, HN Ask threads. Filters by thread age <48h, min comments >5, no existing strong answer. Drafts are human-approved before posting.',
  },
  {
    id: 'a2',
    title: 'Deploy full schema markup across product pages',
    description: 'Generate and validate SoftwareApplication, FAQPage, and Review schema for all 14 product pages.',
    category: 'Technical',
    impact: 12,
    duration: '1 day',
    effort: 'Fully automated',
    addresses: ['s3'],
    status: 'queued',
    technical_details: 'Auto-generates JSON-LD from your existing page content + brand facts. Validates against schema.org and Google Rich Results test. Submits via Search Console API for expedited re-crawl.',
  },
  {
    id: 'a3',
    title: 'Unify brand description across 9 surfaces',
    description: 'Sync a single, optimized brand description to LinkedIn, Crunchbase, G2, Capterra, Product Hunt, your homepage, press kit, footer, and meta tags.',
    category: 'Technical',
    impact: 8,
    duration: '3 days',
    effort: 'Semi-automated',
    addresses: ['s4'],
    status: 'queued',
    technical_details: 'Ingests your current descriptions, runs entity-matching LLM pass to extract core attributes, drafts canonical version. You approve once; we push to every surface via API or notify you for manual surfaces.',
  },
  {
    id: 'a4',
    title: 'Publish 4 comparison & alternatives pages',
    description: 'Generate long-form, citation-ready comparison pages targeting high-intent buyer journey queries.',
    category: 'Editorial',
    impact: 15,
    duration: '1 week',
    effort: 'AI-drafted, human-edited',
    addresses: ['s5', 's7'],
    status: 'queued',
    technical_details: 'Uses your product data + competitive intelligence to draft 1800+ word pages with structured headings, feature tables, and FAQ schema. Flags claims that need review. You approve, we publish.',
  },
  {
    id: 'a5',
    title: 'Inject "remote team" signal into review flow',
    description: 'Update your review request email template and in-app prompts to naturally surface remote-team use cases from existing customers.',
    category: 'Social Proof',
    impact: 9,
    duration: '2 weeks (compounding)',
    effort: 'One-time setup',
    addresses: ['s2'],
    status: 'queued',
    technical_details: 'A/B tests review prompts with subtle framing ("How does Flowspace help your remote team?"). Doesn\'t manipulate — just invites customers who already benefit to mention it. Expected lift: +40% "remote" keyword density in new reviews.',
  },
];

const VISIBILITY_TIMELINE = [
  { day: 'Day 0', you: 0, category_avg: 22 },
  { day: 'Day 7', you: 3, category_avg: 22 },
  { day: 'Day 14', you: 8, category_avg: 22 },
  { day: 'Day 21', you: 14, category_avg: 22 },
  { day: 'Day 30', you: 19, category_avg: 23 },
  { day: 'Day 45', you: 24, category_avg: 23 },
  { day: 'Day 60', you: 28, category_avg: 23 },
];

const MODEL_BREAKDOWN = [
  { model: 'ChatGPT', before: 0, after: 32 },
  { model: 'Perplexity', before: 0, after: 41 },
  { model: 'Gemini', before: 0, after: 18 },
  { model: 'Claude', before: 8, after: 36 },
];

// =============================================================================
// INDUSTRY PROFILES — domain → tailored personas, prompts, brand copy
// Onboarding resolves the typed domain into one of these; everything downstream
// reads from state.profile so Dashboard/PromptScanner/etc. adapt automatically.
// =============================================================================
const PROFILE_FLOWSPACE = {
  key: 'flowspace.io',
  brand: BRAND,
  shockLine: 'Industry classified as B2B SaaS · Project Management. You’re in the bottom decile.',
  personas: [
    { id: 'per1', name: 'Remote-first Founder',    desc: 'Startups <50 employees, fully distributed' },
    { id: 'per2', name: 'Engineering Manager',     desc: 'Mid-market, async-heavy engineering orgs' },
    { id: 'per3', name: 'Product Lead',            desc: 'PMs at SaaS companies, cross-functional' },
    { id: 'per4', name: 'Operations Director',     desc: 'Scale-ups coordinating multiple teams' },
  ],
  prompts: PROMPTS,
};

const PROFILE_PAYPAL = {
  key: 'paypal.com',
  brand: {
    name: 'PayPal', domain: 'paypal.com',
    industry: 'Fintech · Payments',
    tagline: 'Send, receive, and manage money online',
    stage: 'Public (NASDAQ: PYPL)',
  },
  shockLine: 'Industry classified as Fintech · Payments. AI answers default to newer, developer-focused competitors.',
  personas: [
    { id: 'per1', name: 'E-commerce Merchant',     desc: 'Online stores processing $10k–$1M monthly' },
    { id: 'per2', name: 'Freelancer / Solopreneur', desc: 'Cross-border invoicing and payouts' },
    { id: 'per3', name: 'Finance Ops at SMB',      desc: 'Reconciling multi-currency AR/AP' },
    { id: 'per4', name: 'International Sender',    desc: 'Personal remittances abroad' },
  ],
  prompts: [
    { id: 'p1', text: 'Best payment processor for online stores',            volume: 22100, intent: 'high',   mentioned: [],             priority: 1 },
    { id: 'p2', text: 'PayPal alternatives with lower fees',                  volume: 18400, intent: 'high',   mentioned: ['perplexity'], priority: 1 },
    { id: 'p3', text: 'Cheapest international money transfer',                volume: 14200, intent: 'high',   mentioned: [],             priority: 2 },
    { id: 'p4', text: 'How to accept payments from overseas customers',       volume:  9600, intent: 'high',   mentioned: ['chatgpt'],    priority: 1 },
    { id: 'p5', text: 'Payment methods with buyer protection',                volume:  7400, intent: 'medium', mentioned: ['claude'],     priority: 2 },
    { id: 'p6', text: 'Payment gateway with best fraud protection',           volume:  5800, intent: 'medium', mentioned: [],             priority: 3 },
    { id: 'p7', text: 'Fastest way to get paid as a contractor',              volume:  4900, intent: 'medium', mentioned: [],             priority: 3 },
    { id: 'p8', text: 'Most trusted online payment methods 2026',             volume: 11300, intent: 'high',   mentioned: [],             priority: 1 },
  ],
};

const PROFILE_ORDINARY = {
  key: 'theordinary.com',
  brand: {
    name: 'The Ordinary', domain: 'theordinary.com',
    industry: 'Beauty · Skincare',
    tagline: 'Clinical skincare at honest prices',
    stage: 'Private · subsidiary of DECIEM',
  },
  shockLine: 'Industry classified as Beauty · Skincare. User-generated content is dominating AI citations in this category.',
  personas: [
    { id: 'per1', name: 'Skincare Beginner',        desc: 'Starting a routine, budget-conscious, reads Reddit' },
    { id: 'per2', name: 'Ingredient Researcher',    desc: 'Reads labels, follows dermatology accounts' },
    { id: 'per3', name: 'Anti-aging Seeker',        desc: '30+, targeting fine lines, firmness, brightness' },
    { id: 'per4', name: 'Sensitive-skin Shopper',   desc: 'Avoiding fragrance, allergens, harsh actives' },
  ],
  prompts: [
    { id: 'p1', text: 'Best affordable skincare brands',                      volume: 33400, intent: 'high',   mentioned: ['perplexity'], priority: 1 },
    { id: 'p2', text: 'Which retinol should a beginner start with',           volume: 18100, intent: 'high',   mentioned: [],             priority: 1 },
    { id: 'p3', text: 'Niacinamide vs hyaluronic acid order',                 volume: 14800, intent: 'medium', mentioned: [],             priority: 2 },
    { id: 'p4', text: 'Simple skincare routine for oily skin',                volume: 22600, intent: 'high',   mentioned: [],             priority: 1 },
    { id: 'p5', text: 'Safe skincare actives during pregnancy',               volume:  6800, intent: 'medium', mentioned: ['claude'],     priority: 2 },
    { id: 'p6', text: 'Dermatologist-recommended affordable serums',          volume:  9400, intent: 'high',   mentioned: ['chatgpt'],    priority: 1 },
    { id: 'p7', text: 'Best vitamin C serum under $20',                       volume:  7200, intent: 'medium', mentioned: [],             priority: 3 },
    { id: 'p8', text: 'How to layer skincare actives correctly',              volume:  4800, intent: 'medium', mentioned: [],             priority: 3 },
  ],
};

const PROFILE_NOTION = {
  key: 'notion.so',
  brand: {
    name: 'Notion', domain: 'notion.so',
    industry: 'Productivity SaaS · Knowledge Management',
    tagline: 'The connected workspace for wikis, docs, and projects',
    stage: 'Private · Series C+',
  },
  shockLine: 'Industry classified as Productivity SaaS. AI-native competitors are closing the gap fast.',
  personas: [
    { id: 'per1', name: 'Startup Founder',          desc: 'Building company wiki + OKRs from scratch' },
    { id: 'per2', name: 'Knowledge Manager',        desc: 'Mid-size org consolidating scattered docs' },
    { id: 'per3', name: 'Student / Personal User',  desc: 'Note-taking, study plans, PKM systems' },
    { id: 'per4', name: 'Agency Project Manager',   desc: 'Client-facing boards and deliverables' },
  ],
  prompts: [
    { id: 'p1', text: 'Best wiki software for startups',                      volume: 11200, intent: 'high',   mentioned: [],             priority: 1 },
    { id: 'p2', text: 'Notion alternatives for personal knowledge management', volume:  9800, intent: 'high',   mentioned: ['perplexity'], priority: 1 },
    { id: 'p3', text: 'AI-powered note-taking apps',                          volume: 18400, intent: 'high',   mentioned: [],             priority: 1 },
    { id: 'p4', text: 'Best tool for company docs and SOPs',                  volume:  6100, intent: 'medium', mentioned: [],             priority: 2 },
    { id: 'p5', text: 'Collaborative writing tools for remote teams',         volume:  5400, intent: 'medium', mentioned: ['chatgpt'],    priority: 2 },
    { id: 'p6', text: 'Second brain apps for researchers',                    volume:  4200, intent: 'medium', mentioned: [],             priority: 3 },
    { id: 'p7', text: 'Project management for marketing agencies',            volume:  7600, intent: 'high',   mentioned: [],             priority: 2 },
    { id: 'p8', text: 'Building a personal dashboard for productivity',       volume:  3900, intent: 'medium', mentioned: ['claude'],     priority: 3 },
  ],
};

const INDUSTRY_PROFILES = {
  'flowspace.io':    PROFILE_FLOWSPACE,
  'paypal.com':      PROFILE_PAYPAL,
  'theordinary.com': PROFILE_ORDINARY,
  'notion.so':       PROFILE_NOTION,
};

function resolveProfile(rawDomain) {
  // Normalize: drop protocol, www, path, query, hash. So `https://theordinary.com/en-ba?x=1`
  // all collapse down to `theordinary.com` before we look anything up.
  const d = (rawDomain || '').toLowerCase().trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0]
    .split('#')[0]
    .replace(/\/$/, '');

  // Exact match — best case
  if (INDUSTRY_PROFILES[d]) return INDUSTRY_PROFILES[d];

  // Heuristic category match — keeps the demo smart on unseen domains.
  // Keywords are intentionally broad so obvious brands land in the right bucket
  // even without an entry in INDUSTRY_PROFILES.
  if (/(pay|bank|card|wire|fintech|credit|checkout|venmo|cashapp|stripe)/.test(d)) return PROFILE_PAYPAL;
  if (/(skin|beauty|cosmetic|serum|makeup|derma|ordinary|lotion|glow|spf|sephora)/.test(d)) return PROFILE_ORDINARY;
  if (/(notion|doc|wiki|note|productivity|workspace|task|kanban|agile|project|flow|linear|asana|clickup|monday)/.test(d)) return PROFILE_FLOWSPACE;
  if (/(research|brain|obsidian|roam|logseq|evernote)/.test(d)) return PROFILE_NOTION;

  // Generic fallback — reuses Flowspace personas/prompts but rebrands to the typed domain.
  const root = d.split('.')[0] || 'Your brand';
  const name = root.charAt(0).toUpperCase() + root.slice(1);
  return {
    key: d || 'generic',
    brand: {
      name, domain: d,
      industry: 'B2B SaaS (inferred)',
      tagline: 'Modern business software',
      stage: 'Growth',
    },
    shockLine: `Industry could not be precisely classified. Applying generic B2B SaaS baseline for ${name}.`,
    personas: PROFILE_FLOWSPACE.personas,
    prompts: PROFILE_FLOWSPACE.prompts,
  };
}

// =============================================================================
// REUSABLE COMPONENTS
// =============================================================================
const Card = ({ children, style, padding = 20, hoverable = false, onClick }) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => hoverable && setHover(true)}
      onMouseLeave={() => hoverable && setHover(false)}
      style={{
        background: hover ? t.bgHover : t.bgCard,
        border: `1px solid ${hover ? t.borderStrong : t.border}`,
        borderRadius: 12,
        padding,
        transition: 'all 0.15s ease',
        cursor: hoverable ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Button = ({ children, onClick, variant = 'secondary', size = 'md', icon: Icon, disabled, style }) => {
  const [hover, setHover] = useState(false);
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 12, iconSize: 13 },
    md: { padding: '9px 16px', fontSize: 13, iconSize: 15 },
    lg: { padding: '12px 20px', fontSize: 14, iconSize: 16 },
  };
  const variants = {
    primary: {
      bg: hover ? '#6B4DF0' : t.accent,
      color: '#FFFFFF',
      border: t.accent,
    },
    secondary: {
      bg: hover ? t.bgHover : t.bgCard,
      color: t.textPrimary,
      border: hover ? t.borderStrong : t.border,
    },
    ghost: {
      bg: hover ? t.bgHover : 'transparent',
      color: t.textSecondary,
      border: 'transparent',
    },
    danger: {
      bg: hover ? 'rgba(248, 113, 113, 0.2)' : t.dangerBg,
      color: t.danger,
      border: 'rgba(248, 113, 113, 0.3)',
    },
  };
  const s = sizes[size];
  const v = variants[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 500,
        background: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s ease',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {Icon && <Icon size={s.iconSize} />}
      {children}
    </button>
  );
};

const Badge = ({ children, variant = 'default', icon: Icon, size = 'md' }) => {
  const variants = {
    default: { bg: 'rgba(255,255,255,0.06)', color: t.textSecondary },
    success: { bg: t.successBg, color: t.success },
    danger: { bg: t.dangerBg, color: t.danger },
    warning: { bg: t.warningBg, color: t.warning },
    info: { bg: t.infoBg, color: t.info },
    accent: { bg: t.accentBg, color: t.accent },
  };
  const v = variants[variant];
  const padding = size === 'sm' ? '2px 8px' : '4px 10px';
  const fontSize = size === 'sm' ? 10 : 11;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding, fontSize, fontWeight: 500,
      background: v.bg, color: v.color,
      borderRadius: 6, letterSpacing: 0.2,
    }}>
      {Icon && <Icon size={11} />}
      {children}
    </span>
  );
};

const StatCard = ({ label, value, change, changeLabel, icon: Icon, trend }) => (
  <Card padding={18}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: t.textSecondary, fontWeight: 500 }}>{label}</div>
      {Icon && (
        <div style={{ padding: 6, background: t.accentBg, borderRadius: 6 }}>
          <Icon size={14} color={t.accent} />
        </div>
      )}
    </div>
    <div style={{ fontSize: 28, fontWeight: 600, color: t.textPrimary, lineHeight: 1, marginBottom: 6 }}>
      {value}
    </div>
    {change !== undefined && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
        {trend === 'up' ? (
          <ArrowUpRight size={12} color={t.success} />
        ) : trend === 'down' ? (
          <ArrowDownRight size={12} color={t.danger} />
        ) : null}
        <span style={{ color: trend === 'up' ? t.success : trend === 'down' ? t.danger : t.textSecondary }}>
          {change}
        </span>
        <span style={{ color: t.textTertiary }}>{changeLabel}</span>
      </div>
    )}
  </Card>
);

// =============================================================================
// SIDEBAR NAV
// =============================================================================
const Sidebar = ({ current, onNav, brandConnected }) => {
  const { state } = useDemo();
  const brand = (state && state.profile && state.profile.brand) || BRAND;
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'prompts', label: 'Prompt scanner', icon: Search },
    { id: 'why', label: 'Why engine', icon: Sparkles, badge: 'NEW' },
    { id: 'plan', label: 'Action plan', icon: Target },
    { id: 'agent', label: 'Agent console', icon: Terminal },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'market', label: 'Market position', icon: Layers },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
  return (
    <div style={{
      width: 220, background: t.bgElev, borderRight: `1px solid ${t.border}`,
      padding: '20px 12px', display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', marginBottom: 28 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: `linear-gradient(135deg, ${t.accent} 0%, #B99FFF 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Radio size={15} color="#FFFFFF" />
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: t.textPrimary, letterSpacing: -0.2 }}>
          Presense
        </div>
      </div>

      {brandConnected && (
        <div style={{
          padding: '10px 12px', marginBottom: 16,
          background: t.bgCard, borderRadius: 8, border: `1px solid ${t.border}`,
        }}>
          <div style={{ fontSize: 10, color: t.textTertiary, marginBottom: 2, fontWeight: 500, letterSpacing: 0.3 }}>
            CONNECTED BRAND
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary }}>
            {brand.name}
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary }}>
            {brand.domain}
          </div>
        </div>
      )}

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(item => {
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', background: active ? t.accentBg : 'transparent',
                color: active ? t.textPrimary : t.textSecondary,
                border: 'none', borderRadius: 7, cursor: 'pointer',
                fontSize: 13, fontWeight: 500, textAlign: 'left',
                fontFamily: 'inherit', transition: 'all 0.15s ease',
                justifyContent: 'space-between',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = t.bgHover; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <item.icon size={15} />
                {item.label}
              </span>
              {item.badge && <Badge variant="accent" size="sm">{item.badge}</Badge>}
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', padding: '12px', fontSize: 11, color: t.textTertiary, borderTop: `1px solid ${t.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Circle size={8} fill={t.success} color={t.success} />
          <span>All systems nominal</span>
        </div>
        <div>v2.4.1 · Last scan 2m ago</div>
      </div>
    </div>
  );
};

// =============================================================================
// ONBOARDING
// =============================================================================
const Onboarding = ({ onComplete }) => {
  const { state, dispatch } = useDemo();
  const [step, setStep] = useState(0);
  const [domain, setDomain] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [selectedPersonas, setSelectedPersonas] = useState(new Set());
  const [selectedPrompts, setSelectedPrompts] = useState(new Set());
  const [selectedMode, setSelectedMode] = useState(null); // 'review' | 'autopilot'

  // Pull personas/prompts from the freshly-resolved profile — falls back to Flowspace
  // before the user has analyzed (step 0 only).
  const profile = state.profile || PROFILE_FLOWSPACE;
  const suggestedPersonas = profile.personas;
  const suggestedPrompts  = profile.prompts.slice(0, 6);

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      const resolved = resolveProfile(domain);
      dispatch({ type: 'SET_PROFILE', profile: resolved });
      // Preselect the three highest-volume prompts so step 3 has a natural default.
      const topIds = [...resolved.prompts]
        .sort((a, b) => b.volume - a.volume).slice(0, 3).map(p => p.id);
      setSelectedPrompts(new Set(topIds));
      setAnalyzing(false);
      setAnalyzed(true);
    }, 2400);
  };

  const togglePersona = (id) => {
    const next = new Set(selectedPersonas);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedPersonas(next);
  };

  const togglePrompt = (id) => {
    const next = new Set(selectedPrompts);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedPrompts(next);
  };

  const finish = () => {
    dispatch({ type: 'SET_AUTOPILOT', value: selectedMode === 'autopilot' });
    onComplete && onComplete();
  };

  return (
    <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, justifyContent: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: `linear-gradient(135deg, ${t.accent} 0%, #B99FFF 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Radio size={19} color="#FFFFFF" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: t.textPrimary, letterSpacing: -0.3 }}>
            Presense
          </div>
        </div>

        {/* progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= step ? t.accent : t.border,
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        <Card padding={32}>
          {step === 0 && (
            <>
              <div style={{ fontSize: 13, color: t.accent, fontWeight: 500, marginBottom: 8 }}>STEP 1 OF 4</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: t.textPrimary, marginBottom: 6, letterSpacing: -0.3 }}>
                Connect your brand
              </div>
              <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 24 }}>
                We'll scan your current AI visibility in under 30 seconds. No signup, no credit card.
              </div>

              <label style={{ display: 'block', fontSize: 12, color: t.textSecondary, marginBottom: 6, fontWeight: 500 }}>
                Your domain
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="flowspace.io"
                  disabled={analyzing || analyzed}
                  style={{
                    flex: 1, padding: '10px 14px', fontSize: 14,
                    background: t.bgElev, border: `1px solid ${t.border}`,
                    borderRadius: 8, color: t.textPrimary, outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                {!analyzed && (
                  <Button variant="primary" onClick={handleAnalyze} disabled={!domain || analyzing}>
                    {analyzing ? <><Loader2 size={14} className="spin" /> Scanning</> : <>Analyze <ArrowRight size={14} /></>}
                  </Button>
                )}
              </div>

              {analyzing && (
                <div style={{ padding: 16, background: t.bgElev, borderRadius: 8, border: `1px solid ${t.border}` }}>
                  <AnalysisStream />
                </div>
              )}

              {analyzed && <OnboardingShockResult onContinue={() => setStep(1)} />}
            </>
          )}

          {step === 1 && (
            <>
              <div style={{ fontSize: 13, color: t.accent, fontWeight: 500, marginBottom: 8 }}>STEP 2 OF 4</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: t.textPrimary, marginBottom: 6, letterSpacing: -0.3 }}>
                Who buys {profile.brand.name}?
              </div>
              <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 24 }}>
                We inferred these personas from your category ({profile.brand.industry}). Confirm which matter most.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                {suggestedPersonas.map(p => {
                  const selected = selectedPersonas.has(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => togglePersona(p.id)}
                      style={{
                        padding: 14, borderRadius: 8, cursor: 'pointer',
                        background: selected ? t.accentBg : t.bgElev,
                        border: `1px solid ${selected ? t.accent : t.border}`,
                        display: 'flex', alignItems: 'center', gap: 12,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 5,
                        background: selected ? t.accent : 'transparent',
                        border: `1.5px solid ${selected ? t.accent : t.borderStrong}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {selected && <Check size={12} color="#FFF" />}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: t.textSecondary }}>{p.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" onClick={() => setStep(0)} icon={ChevronLeft}>Back</Button>
                <Button
                  variant="primary"
                  onClick={() => setStep(2)}
                  disabled={selectedPersonas.size === 0}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Continue — {selectedPersonas.size} selected <ChevronRight size={14} />
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ fontSize: 13, color: t.accent, fontWeight: 500, marginBottom: 8 }}>STEP 3 OF 4</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: t.textPrimary, marginBottom: 6, letterSpacing: -0.3 }}>
                Confirm the queries we’ll track
              </div>
              <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 24 }}>
                These are the real prompts buyers ask AI about {profile.brand.industry.split('·')[0].trim()}. We'll measure your visibility on each.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24, maxHeight: 320, overflowY: 'auto' }}>
                {suggestedPrompts.map(p => {
                  const selected = selectedPrompts.has(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => togglePrompt(p.id)}
                      style={{
                        padding: '10px 14px', borderRadius: 7, cursor: 'pointer',
                        background: selected ? t.accentBg : t.bgElev,
                        border: `1px solid ${selected ? t.accent : t.border}`,
                        display: 'flex', alignItems: 'center', gap: 12,
                      }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: 4,
                        background: selected ? t.accent : 'transparent',
                        border: `1.5px solid ${selected ? t.accent : t.borderStrong}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {selected && <Check size={10} color="#FFF" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: t.textPrimary }}>{p.text}</div>
                      </div>
                      <div style={{ fontSize: 11, color: t.textTertiary }}>
                        {(p.volume / 1000).toFixed(1)}k/mo
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" onClick={() => setStep(1)} icon={ChevronLeft}>Back</Button>
                <Button
                  variant="primary"
                  onClick={() => setStep(3)}
                  disabled={selectedPrompts.size === 0}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Continue — {selectedPrompts.size} selected <ChevronRight size={14} />
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div style={{ fontSize: 13, color: t.accent, fontWeight: 500, marginBottom: 8 }}>STEP 4 OF 4</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: t.textPrimary, marginBottom: 6, letterSpacing: -0.3 }}>
                How should Presense run?
              </div>
              <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 24 }}>
                You can switch modes later in Settings. Most teams start with hands-on and graduate to autopilot once they trust the agent.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {[
                  {
                    id: 'review',
                    title: 'Hands-on · review every action',
                    desc: 'You see the exact plan, approve per-action, then watch execution in real time. Best for first-time users and regulated industries.',
                    icon: Shield,
                    badge: 'RECOMMENDED',
                  },
                  {
                    id: 'autopilot',
                    title: 'Autopilot · one-click execution',
                    desc: 'Agent auto-approves every safe action the moment scanning completes. You get a summary when it’s done. Best for teams who trust the signals and want speed.',
                    icon: Rocket,
                    badge: 'FASTEST',
                  },
                ].map(opt => {
                  const selected = selectedMode === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedMode(opt.id)}
                      style={{
                        padding: 16, borderRadius: 8, cursor: 'pointer',
                        background: selected ? t.accentBg : t.bgElev,
                        border: `1px solid ${selected ? t.accent : t.border}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: 5,
                          background: selected ? t.accent : 'transparent',
                          border: `1.5px solid ${selected ? t.accent : t.borderStrong}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, marginTop: 2,
                        }}>
                          {selected && <Check size={12} color="#FFF" />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <opt.icon size={14} color={selected ? t.accent : t.textSecondary} />
                            <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary }}>{opt.title}</div>
                            <Badge variant={opt.id === 'autopilot' ? 'warning' : 'info'} size="sm">{opt.badge}</Badge>
                          </div>
                          <div style={{ fontSize: 12, color: t.textSecondary, lineHeight: 1.6 }}>{opt.desc}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="ghost" onClick={() => setStep(2)} icon={ChevronLeft}>Back</Button>
                <Button
                  variant="primary"
                  onClick={finish}
                  disabled={!selectedMode}
                  style={{ flex: 1, justifyContent: 'center' }}
                  icon={Rocket}
                >
                  Launch Presense
                </Button>
              </div>
            </>
          )}
        </Card>

        <div style={{ textAlign: 'center', fontSize: 11, color: t.textTertiary, marginTop: 20 }}>
          Your data is never used to train models · SOC 2 Type II · GDPR compliant
        </div>
      </div>
    </div>
  );
};

const OnboardingShockResult = ({ onContinue }) => {
  const { state } = useDemo();
  const profile = state.profile || PROFILE_FLOWSPACE;
  // Count DOWN from 100 to 0 to land the emotional hit.
  const [sov, setSov] = useState(100);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const duration = 900;
    const tick = (ts) => {
      const p = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setSov(Math.round(100 * (1 - eased)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="presense-fade-in">
      <div style={{ padding: 18, background: t.dangerBg, borderRadius: 8, border: `1px solid rgba(248, 113, 113, 0.2)`, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <AlertCircle size={16} color={t.danger} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, marginBottom: 10 }}>
              Scan complete — {profile.brand.name} is critically underperforming
            </div>
            <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 600, color: t.danger, lineHeight: 1, letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>
                  {sov}%
                </div>
                <div style={{ fontSize: 10, color: t.textTertiary, marginTop: 4, letterSpacing: 0.3 }}>SHARE OF VOICE</div>
              </div>
              <div style={{ width: 1, background: 'rgba(248, 113, 113, 0.2)' }} />
              <div>
                <div style={{ fontSize: 28, fontWeight: 600, color: t.textPrimary, lineHeight: 1, letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>
                  1<span style={{ color: t.textTertiary, fontSize: 18 }}>/4</span>
                </div>
                <div style={{ fontSize: 10, color: t.textTertiary, marginTop: 4, letterSpacing: 0.3 }}>MODELS MENTION YOU</div>
              </div>
              <div style={{ width: 1, background: 'rgba(248, 113, 113, 0.2)' }} />
              <div>
                <div style={{ fontSize: 28, fontWeight: 600, color: t.warning, lineHeight: 1, letterSpacing: -1, fontVariantNumeric: 'tabular-nums' }}>
                  7
                </div>
                <div style={{ fontSize: 10, color: t.textTertiary, marginTop: 4, letterSpacing: 0.3 }}>WEAK SIGNALS</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: t.textSecondary, lineHeight: 1.5 }}>
              {profile.shockLine}
            </div>
          </div>
        </div>
      </div>
      <Button variant="primary" size="lg" onClick={onContinue} style={{ width: '100%', justifyContent: 'center' }}>
        Continue to persona setup <ChevronRight size={16} />
      </Button>
    </div>
  );
};

const AnalysisStream = () => {
  const steps = [
    'Fetching robots.txt and crawling policy',
    'Querying ChatGPT, Perplexity, Gemini, Claude',
    'Extracting brand entities from 4 surfaces',
    'Analyzing 847 signals across 6 categories',
    'Benchmarking against category baseline',
  ];
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (done >= steps.length) return;
    const timer = setTimeout(() => setDone(d => d + 1), 430);
    return () => clearTimeout(timer);
  }, [done]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: i < done ? t.textPrimary : t.textTertiary }}>
          {i < done ? <CheckCircle2 size={13} color={t.success} /> : i === done ? <Loader2 size={13} className="spin" color={t.accent} /> : <Circle size={13} />}
          {s}
        </div>
      ))}
    </div>
  );
};

// =============================================================================
// DASHBOARD HOME
// =============================================================================
const MODEL_SCORES = {
  before: { claude: 28, perplexity: 8, chatgpt: 6, gemini: 4 },
  after:  { claude: 36, perplexity: 41, chatgpt: 32, gemini: 18 },
};

const SIGNAL_HEALTH = {
  before: [
    { label: 'Social proof', score: 8, status: 'critical' },
    { label: 'Technical SEO', score: 62, status: 'warning' },
    { label: 'Editorial depth', score: 34, status: 'warning' },
    { label: 'Entity resolution', score: 41, status: 'warning' },
    { label: 'Crawlability', score: 94, status: 'ok' },
  ],
  after: [
    { label: 'Social proof', score: 72, status: 'ok' },
    { label: 'Technical SEO', score: 96, status: 'ok' },
    { label: 'Editorial depth', score: 78, status: 'ok' },
    { label: 'Entity resolution', score: 92, status: 'ok' },
    { label: 'Crawlability', score: 96, status: 'ok' },
  ],
};

const DashboardScanSkeleton = () => {
  const rows = [
    'Querying ChatGPT…',
    'Querying Perplexity…',
    'Querying Gemini…',
    'Querying Claude…',
    'Extracting mentions & citations',
  ];
  const [done, setDone] = useState(0);
  useEffect(() => {
    if (done >= rows.length) return;
    const timer = setTimeout(() => setDone(d => d + 1), 280);
    return () => clearTimeout(timer);
  }, [done]);
  return (
    <div style={{ padding: 28, maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 4 }}>Overview</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: t.textPrimary, letterSpacing: -0.3, marginBottom: 24 }}>
        Refreshing live scan…
      </div>
      <Card padding={24}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: i < done ? t.textPrimary : t.textTertiary }}>
              {i < done
                ? <CheckCircle2 size={14} color={t.success} />
                : i === done ? <Loader2 size={14} className="spin" color={t.accent} /> : <Circle size={14} />}
              {r}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const Dashboard = ({ onNav }) => {
  const { state, dispatch } = useDemo();
  const isAfter = state.agentComplete;
  const profile = state.profile || PROFILE_FLOWSPACE;
  const prompts = profile.prompts;

  // First-visit skeleton
  useEffect(() => {
    if (state.dashboardScanned) return;
    const timer = setTimeout(() => dispatch({ type: 'MARK_DASHBOARD_SCANNED' }), 1500);
    return () => clearTimeout(timer);
  }, [state.dashboardScanned, dispatch]);

  const scoreTarget = isAfter ? 58 : 12;
  const sovTarget = isAfter ? 23 : 3.2;
  const mentionsTarget = isAfter ? 14 : 2;
  const signalsTarget = isAfter ? 1 : 5;
  const categoryAvg = 42;

  const score = useCountUp(scoreTarget, 900, state.dashboardScanned);
  const sov = useCountUp(sovTarget, 900, state.dashboardScanned);
  const mentions = useCountUp(mentionsTarget, 900, state.dashboardScanned);
  const signals = useCountUp(signalsTarget, 900, state.dashboardScanned);

  if (!state.dashboardScanned) return <DashboardScanSkeleton />;

  const scoreRounded = Math.round(score);
  const modelScores = isAfter ? MODEL_SCORES.after : MODEL_SCORES.before;
  const signalHealth = isAfter ? SIGNAL_HEALTH.after : SIGNAL_HEALTH.before;

  return (
    <div style={{ padding: 28, maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 4 }}>Overview</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: t.textPrimary, letterSpacing: -0.3 }}>
            Your AI presence, at a glance
          </div>
        </div>
        <Badge variant="success" icon={Circle} size="md">Live · Last scan 2m ago</Badge>
      </div>

      {/* hero score card */}
      <Card padding={24} style={{ marginBottom: 20, background: `linear-gradient(135deg, ${t.bgCard} 0%, ${t.bgElev} 100%)` }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div style={{ fontSize: 12, color: t.textSecondary, fontWeight: 500, marginBottom: 8 }}>PRESENCE SCORE</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 56, fontWeight: 600, color: t.textPrimary, lineHeight: 1, letterSpacing: -2 }}>
                {scoreRounded}
              </div>
              <div style={{ fontSize: 18, color: t.textTertiary, fontWeight: 500 }}>/ 100</div>
            </div>
            {isAfter ? (
              <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 14 }}>
                You're now <span style={{ color: t.success, fontWeight: 500 }}>{scoreRounded - categoryAvg} points above</span> category average.
                The agent's work is compounding.
              </div>
            ) : (
              <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 14 }}>
                You're <span style={{ color: t.danger, fontWeight: 500 }}>{categoryAvg - scoreRounded} points below</span> category average.
                This is where most Series A SaaS brands are when they start.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="primary" icon={Sparkles} onClick={() => onNav('why')}>
                See why
              </Button>
              {state.autopilot && !state.agentLaunched && (
                <Button
                  variant="secondary"
                  icon={Rocket}
                  onClick={() => {
                    const actions = (state.profile && state.profile.actions) || ACTIONS;
                    dispatch({ type: 'SET_APPROVED', ids: actions.map(a => a.id) });
                    dispatch({ type: 'LAUNCH_AGENT' });
                    onNav('agent');
                  }}
                  style={{ borderColor: t.accent, color: t.accent }}
                >
                  Launch autopilot
                </Button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 11, color: t.textTertiary, marginBottom: 8, fontWeight: 500, letterSpacing: 0.3 }}>
              SCORE BREAKDOWN BY MODEL
            </div>
            {AI_MODELS.map(m => {
              const s = modelScores[m.id];
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 9, height: 9, borderRadius: 2, background: m.color }} />
                  <div style={{ fontSize: 12, color: t.textSecondary, minWidth: 80 }}>{m.name}</div>
                  <div style={{ flex: 1, height: 5, background: t.bgElev, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${s}%`, height: '100%', background: m.color, borderRadius: 3, transition: 'width 0.8s ease' }} />
                  </div>
                  <div style={{ fontSize: 11, color: t.textPrimary, fontWeight: 500, minWidth: 28, textAlign: 'right' }}>
                    {s}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Prompts tracked" value="8" icon={Search} />
        <StatCard
          label="AI mentions today"
          value={Math.round(mentions)}
          change={isAfter ? 'across all 4 models' : '1 in Claude'}
          changeLabel={isAfter ? '' : 'only'}
          icon={MessageSquare}
          trend={isAfter ? 'up' : undefined}
        />
        <StatCard
          label="Share of voice"
          value={`${sov.toFixed(1)}%`}
          change={isAfter ? '+19.8 pts' : '0%'}
          changeLabel={isAfter ? 'vs. 60 days ago' : '→ target 25%'}
          icon={Activity}
          trend={isAfter ? 'up' : undefined}
        />
        <StatCard
          label="Signals to fix"
          value={Math.round(signals)}
          change={isAfter ? 'all resolved' : 'high priority'}
          changeLabel=""
          icon={AlertTriangle}
          trend={isAfter ? 'up' : 'down'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
        {/* recent activity */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary }}>Recent scans</div>
            <Button variant="ghost" size="sm" onClick={() => onNav('prompts')}>View all <ChevronRight size={12} /></Button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {prompts.slice(0, 4).map(p => {
              const mentionedModels = isAfter
                ? AI_MODELS.filter((_, i) => i < Math.max(2, p.mentioned.length + 2)).map(m => m.id)
                : p.mentioned;
              return (
                <div key={p.id} style={{ padding: '10px 12px', background: t.bgElev, borderRadius: 7, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: mentionedModels.length > 0 ? t.success : t.danger,
                  }} />
                  <div style={{ flex: 1, fontSize: 12, color: t.textPrimary }}>{p.text}</div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {AI_MODELS.map(m => (
                      <div key={m.id} title={m.name} style={{
                        width: 18, height: 18, borderRadius: 4,
                        background: mentionedModels.includes(m.id) ? m.color : t.border,
                        opacity: mentionedModels.includes(m.id) ? 1 : 0.3,
                        transition: 'all 0.4s ease',
                      }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: t.textTertiary, minWidth: 50, textAlign: 'right' }}>
                    {mentionedModels.length}/4 models
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* signal summary */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, marginBottom: 16 }}>Signal health</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {signalHealth.map(s => (
              <div key={s.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: t.textSecondary }}>{s.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color:
                    s.status === 'critical' ? t.danger : s.status === 'warning' ? t.warning : t.success }}>
                    {s.score}
                  </span>
                </div>
                <div style={{ height: 4, background: t.bgElev, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${s.score}%`, height: '100%',
                    background: s.status === 'critical' ? t.danger : s.status === 'warning' ? t.warning : t.success,
                    borderRadius: 2,
                    transition: 'width 0.8s ease, background 0.4s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

// =============================================================================
// PROMPT SCANNER
// =============================================================================
const PromptScanner = ({ onNav }) => {
  const { state } = useDemo();
  const profile = state.profile || PROFILE_FLOWSPACE;
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [extraPrompts, setExtraPrompts] = useState([]);

  const allPrompts = [...profile.prompts, ...extraPrompts];
  const filtered = allPrompts.filter(p => {
    if (filter === 'missing') return p.mentioned.length === 0;
    if (filter === 'partial') return p.mentioned.length > 0 && p.mentioned.length < 4;
    return true;
  });

  const addPrompt = (text) => {
    setExtraPrompts(prev => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        text,
        volume: Math.round(1000 + Math.random() * 8000),
        intent: 'medium',
        mentioned: [],
        priority: 2,
      },
    ]);
    setAddOpen(false);
  };

  return (
    <div style={{ padding: 28, maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 4 }}>Prompt scanner</div>
        <div style={{ fontSize: 24, fontWeight: 600, color: t.textPrimary, letterSpacing: -0.3, marginBottom: 4 }}>
          How AI answers your buyers
        </div>
        <div style={{ fontSize: 13, color: t.textSecondary }}>
          Live results from 4 models · Updated every 6 hours
        </div>
      </div>

      {/* filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Button variant={filter === 'all' ? 'primary' : 'secondary'} size="sm" onClick={() => setFilter('all')}>
          All ({allPrompts.length})
        </Button>
        <Button variant={filter === 'missing' ? 'primary' : 'secondary'} size="sm" onClick={() => setFilter('missing')}>
          Missing ({allPrompts.filter(p => p.mentioned.length === 0).length})
        </Button>
        <Button variant={filter === 'partial' ? 'primary' : 'secondary'} size="sm" onClick={() => setFilter('partial')}>
          Partial ({allPrompts.filter(p => p.mentioned.length > 0).length})
        </Button>
        <Button variant="ghost" size="sm" icon={Plus} style={{ marginLeft: 'auto' }} onClick={() => setAddOpen(true)}>
          Add prompt
        </Button>
      </div>

      <Card padding={0}>
        <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 120px 80px 32px', padding: '12px 20px', borderBottom: `1px solid ${t.border}`, fontSize: 11, color: t.textTertiary, fontWeight: 500, letterSpacing: 0.3, alignItems: 'center' }}>
          <div>#</div>
          <div>PROMPT</div>
          <div>VOLUME</div>
          <div>COVERAGE</div>
          <div>PRIORITY</div>
          <div></div>
        </div>
        {filtered.map((p, i) => (
          <div
            key={p.id}
            onClick={() => setSelected(p)}
            style={{
              display: 'grid', gridTemplateColumns: '40px 1fr 80px 120px 80px 32px',
              padding: '14px 20px', borderBottom: i < filtered.length - 1 ? `1px solid ${t.border}` : 'none',
              alignItems: 'center', cursor: 'pointer',
              background: selected?.id === p.id ? t.bgHover : 'transparent',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (selected?.id !== p.id) e.currentTarget.style.background = t.bgHover; }}
            onMouseLeave={e => { if (selected?.id !== p.id) e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ fontSize: 11, color: t.textTertiary }}>{i + 1}</div>
            <div style={{ fontSize: 13, color: t.textPrimary }}>{p.text}</div>
            <div style={{ fontSize: 12, color: t.textSecondary }}>{(p.volume / 1000).toFixed(1)}k/mo</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', gap: 2 }}>
                {AI_MODELS.map(m => (
                  <div key={m.id} title={m.name} style={{
                    width: 14, height: 14, borderRadius: 3,
                    background: p.mentioned.includes(m.id) ? m.color : t.border,
                    opacity: p.mentioned.includes(m.id) ? 1 : 0.3,
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 11, color: p.mentioned.length > 0 ? t.success : t.danger, fontWeight: 500 }}>
                {p.mentioned.length}/4
              </span>
            </div>
            <div>
              <Badge variant={p.priority === 1 ? 'danger' : p.priority === 2 ? 'warning' : 'default'} size="sm">
                P{p.priority}
              </Badge>
            </div>
            <ChevronRight size={14} color={t.textTertiary} />
          </div>
        ))}
      </Card>

      {selected && <PromptDetailDrawer prompt={selected} onClose={() => setSelected(null)} onNav={onNav} />}
      {addOpen && <AddPromptModal onClose={() => setAddOpen(false)} onAdd={addPrompt} />}
    </div>
  );
};

const AddPromptModal = ({ onClose, onAdd }) => {
  const [text, setText] = useState('');
  const [scanning, setScanning] = useState(false);
  const submit = () => {
    if (!text.trim()) return;
    setScanning(true);
    setTimeout(() => onAdd(text.trim()), 900);
  };
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 520, background: t.bgElev,
        border: `1px solid ${t.border}`, borderRadius: 12, padding: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: t.accent, fontWeight: 500, letterSpacing: 0.3, marginBottom: 4 }}>ADD PROMPT</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: t.textPrimary, letterSpacing: -0.2 }}>Track a new buying query</div>
          </div>
          <Button variant="ghost" size="sm" icon={X} onClick={onClose} />
        </div>
        <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 14, lineHeight: 1.5 }}>
          We'll immediately ping all 4 models and start tracking coverage every 6 hours.
        </div>
        <input
          type="text"
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="e.g. Tools for async standups in remote teams"
          disabled={scanning}
          style={{
            width: '100%', padding: '11px 14px', fontSize: 13,
            background: t.bgCard, border: `1px solid ${t.border}`,
            borderRadius: 8, color: t.textPrimary, outline: 'none',
            fontFamily: 'inherit', marginBottom: 16,
          }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose} disabled={scanning}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!text.trim() || scanning} icon={scanning ? undefined : Plus}>
            {scanning && <Loader2 size={14} className="spin" style={{ marginRight: 2 }} />}
            {scanning ? 'Scanning models…' : 'Add and scan'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const PromptDetailDrawer = ({ prompt, onClose, onNav }) => {
  const { state } = useDemo();
  const brandName = (state.profile && state.profile.brand && state.profile.brand.name) || BRAND.name;
  const answers = {
    chatgpt: prompt.mentioned.includes('chatgpt')
      ? `For this query, ${brandName} is a credible option — commonly mentioned alongside established category leaders. Trade-offs depend on your specific use case.`
      : `For this query, AI defaults to the most-cited category leaders. Recommendations focus on features, reputation, and ecosystem depth — ${brandName} is not surfaced.`,
    perplexity: prompt.mentioned.includes('perplexity')
      ? `${brandName} appears in Perplexity’s answer, usually cited via review sites and community threads. It’s positioned as a solid choice for this question.`
      : `Perplexity pulls from review aggregators and community forums. For this query, the top citations are incumbents — ${brandName} isn’t reaching the citation threshold.`,
    gemini: prompt.mentioned.includes('gemini')
      ? `${brandName} is surfaced by Gemini for this query, particularly when users ask for concrete product comparisons.`
      : `Gemini prioritizes answers with strong structured data and knowledge-graph presence. ${brandName}’s entity footprint is too thin here.`,
    claude: prompt.mentioned.includes('claude')
      ? `Claude describes ${brandName} with context and nuance — a sign that editorial content about you has reached training data.`
      : `Claude tends to hedge with broad category language. For ${brandName} to land here we need more authoritative long-form content and third-party analyses.`,
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 520,
      background: t.bgElev, borderLeft: `1px solid ${t.border}`,
      padding: 24, overflowY: 'auto', zIndex: 50,
      boxShadow: '-8px 0 24px rgba(0,0,0,0.3)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, color: t.textTertiary, marginBottom: 4, letterSpacing: 0.3, fontWeight: 500 }}>PROMPT</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: t.textPrimary, lineHeight: 1.4 }}>
            "{prompt.text}"
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} icon={X} />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${t.border}` }}>
        <div>
          <div style={{ fontSize: 10, color: t.textTertiary, marginBottom: 2 }}>VOLUME</div>
          <div style={{ fontSize: 13, color: t.textPrimary, fontWeight: 500 }}>{(prompt.volume / 1000).toFixed(1)}k/mo</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: t.textTertiary, marginBottom: 2 }}>INTENT</div>
          <div style={{ fontSize: 13, color: t.textPrimary, fontWeight: 500, textTransform: 'capitalize' }}>{prompt.intent}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: t.textTertiary, marginBottom: 2 }}>COVERAGE</div>
          <div style={{ fontSize: 13, color: t.textPrimary, fontWeight: 500 }}>{prompt.mentioned.length}/4 models</div>
        </div>
      </div>

      <div style={{ fontSize: 12, color: t.textSecondary, fontWeight: 500, marginBottom: 12, letterSpacing: 0.3 }}>
        LIVE ANSWERS
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {AI_MODELS.map(m => {
          const mentioned = prompt.mentioned.includes(m.id);
          return (
            <div key={m.id} style={{
              padding: 14, borderRadius: 8,
              background: mentioned ? 'rgba(74, 222, 128, 0.05)' : t.bgCard,
              border: `1px solid ${mentioned ? 'rgba(74, 222, 128, 0.2)' : t.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: m.color }} />
                  <div style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary }}>{m.name}</div>
                  <div style={{ fontSize: 10, color: t.textTertiary }}>· {m.vendor}</div>
                </div>
                <Badge variant={mentioned ? 'success' : 'danger'} size="sm">
                  {mentioned ? 'Mentioned' : 'Not mentioned'}
                </Badge>
              </div>
              <div style={{ fontSize: 12, color: t.textSecondary, lineHeight: 1.6, fontStyle: 'italic' }}>
                "{answers[m.id]}"
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, padding: 14, background: t.accentBg, borderRadius: 8, border: `1px solid ${t.accent}30` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Sparkles size={15} color={t.accent} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: t.textPrimary, marginBottom: 4 }}>
              Why you're missing here
            </div>
            <div style={{ fontSize: 12, color: t.textSecondary, lineHeight: 1.5, marginBottom: 8 }}>
              Community mentions and third-party reviews drive 60% of the answer for this prompt type. Presense has flagged 3 actions that directly address this.
            </div>
            <Button size="sm" variant="primary" onClick={() => { onClose && onClose(); onNav && onNav('plan'); }}>
              View action plan <ArrowRight size={12} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// WHY ENGINE — core differentiator
// =============================================================================
const WhyEngine = ({ onNav }) => {
  const { state, dispatch } = useDemo();
  const signals = (state.profile && state.profile.signals) || SIGNALS;
  const actions = (state.profile && state.profile.actions) || ACTIONS;
  const [selectedId, setSelectedId] = useState(signals[0].id);
  const selected = signals.find(s => s.id === selectedId) || signals[0];
  const setSelected = (s) => setSelectedId(s.id);

  const triggerAutopilot = () => {
    dispatch({ type: 'SET_APPROVED', ids: actions.map(a => a.id) });
    dispatch({ type: 'LAUNCH_AGENT' });
    onNav('agent');
  };

  return (
    <div style={{ padding: 28, maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Badge variant="accent" icon={Sparkles}>DIFFERENTIATOR</Badge>
        <div style={{ fontSize: 24, fontWeight: 600, color: t.textPrimary, letterSpacing: -0.3, marginTop: 8, marginBottom: 4 }}>
          Why AI doesn't pick you — signal by signal
        </div>
        <div style={{ fontSize: 13, color: t.textSecondary, maxWidth: 640 }}>
          Every AI recommendation is the result of weighted signals. We reverse-engineer which signals matter for your category and show exactly where you fall short.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 16 }}>
        {/* signal list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 11, color: t.textTertiary, fontWeight: 500, letterSpacing: 0.3, padding: '0 4px', marginBottom: 4 }}>
            SIGNALS, BY IMPACT
          </div>
          {signals.map(s => {
            const active = selected.id === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setSelected(s)}
                style={{
                  padding: 14, borderRadius: 8, cursor: 'pointer',
                  background: active ? t.bgHover : t.bgCard,
                  border: `1px solid ${active ? t.borderStrong : t.border}`,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = t.bgHover; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = t.bgCard; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusDot status={s.status} />
                    <div style={{ fontSize: 10, color: t.textTertiary, fontWeight: 500, letterSpacing: 0.3 }}>
                      {s.category.toUpperCase()}
                    </div>
                  </div>
                  <Badge variant={s.weight === 'High' ? 'danger' : s.weight === 'Medium' ? 'warning' : 'default'} size="sm">
                    {s.weight}
                  </Badge>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary, marginBottom: 6, lineHeight: 1.4 }}>
                  {s.name}
                </div>
                <div style={{ height: 3, background: t.bgElev, borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${s.weightNum}%`, height: '100%',
                    background: s.status === 'critical' ? t.danger : s.status === 'warning' ? t.warning : t.success,
                    borderRadius: 2,
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* detail panel */}
        <div>
          <Card padding={24}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <StatusDot status={selected.status} />
              <div style={{ fontSize: 11, color: t.textTertiary, letterSpacing: 0.3, fontWeight: 500 }}>
                {selected.category.toUpperCase()}
              </div>
              <Badge variant={selected.weight === 'High' ? 'danger' : 'warning'} size="sm">
                {selected.weight} weight
              </Badge>
            </div>
            <div style={{ fontSize: 20, fontWeight: 600, color: t.textPrimary, marginBottom: 6, letterSpacing: -0.2 }}>
              {selected.name}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '20px 0' }}>
              <div style={{ padding: 14, background: t.bgElev, borderRadius: 8, border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 10, color: t.textTertiary, fontWeight: 500, letterSpacing: 0.3, marginBottom: 4 }}>YOUR VALUE</div>
                <div style={{ fontSize: 14, color: selected.status === 'critical' ? t.danger : selected.status === 'warning' ? t.warning : t.success, fontWeight: 500 }}>
                  {selected.yourValue}
                </div>
              </div>
              <div style={{ padding: 14, background: t.bgElev, borderRadius: 8, border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 10, color: t.textTertiary, fontWeight: 500, letterSpacing: 0.3, marginBottom: 4 }}>BENCHMARK</div>
                <div style={{ fontSize: 14, color: t.textPrimary, fontWeight: 500 }}>
                  {selected.benchmark}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: t.textSecondary, fontWeight: 500, marginBottom: 8, letterSpacing: 0.3 }}>EXPLANATION</div>
            <div style={{ fontSize: 13, color: t.textPrimary, lineHeight: 1.7, marginBottom: 20 }}>
              {selected.explanation}
            </div>

            {selected.models_affected.length > 0 && (
              <>
                <div style={{ fontSize: 12, color: t.textSecondary, fontWeight: 500, marginBottom: 8, letterSpacing: 0.3 }}>AFFECTS THESE MODELS</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
                  {selected.models_affected.map(mid => {
                    const m = AI_MODELS.find(x => x.id === mid);
                    return (
                      <div key={mid} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '4px 10px', background: t.bgElev,
                        borderRadius: 6, border: `1px solid ${t.border}`,
                      }}>
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: m.color }} />
                        <span style={{ fontSize: 11, color: t.textPrimary, fontWeight: 500 }}>{m.name}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {selected.status !== 'ok' && (
              <div style={{ padding: 16, background: t.accentBg, borderRadius: 8, border: `1px solid ${t.accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Target size={18} color={t.accent} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: t.textPrimary, marginBottom: 2 }}>
                      Presense has planned actions to fix this
                    </div>
                    <div style={{ fontSize: 11, color: t.textSecondary }}>
                      Estimated combined lift: +{Math.round(selected.weightNum * 0.3)}% visibility
                    </div>
                  </div>
                </div>
                {state.autopilot ? (
                  <Button variant="primary" size="sm" icon={Rocket} onClick={triggerAutopilot}>
                    Run autopilot
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => onNav('plan')}>
                    View plan <ArrowRight size={12} />
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

const StatusDot = ({ status }) => {
  const colors = { critical: t.danger, warning: t.warning, ok: t.success };
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: colors[status], flexShrink: 0,
      boxShadow: `0 0 0 2px ${colors[status]}20`,
    }} />
  );
};

// =============================================================================
// ACTION PLAN
// =============================================================================
const ActionPlan = ({ onLaunch }) => {
  const { state, dispatch } = useDemo();
  const actions = (state.profile && state.profile.actions) || ACTIONS;
  const approved = state.approvedActions ?? new Set(actions.map(a => a.id));
  const [expanded, setExpanded] = useState(null);

  // Persist default approval to global state on first mount so AgentConsole sees it.
  useEffect(() => {
    if (state.approvedActions === null) {
      dispatch({ type: 'SET_APPROVED', ids: actions.map(a => a.id) });
    }
  }, [state.approvedActions, dispatch, actions]);

  const toggle = (id) => {
    const next = new Set(approved);
    if (next.has(id)) next.delete(id); else next.add(id);
    dispatch({ type: 'SET_APPROVED', ids: [...next] });
  };

  const handleLaunch = () => {
    dispatch({ type: 'LAUNCH_AGENT' });
    onLaunch && onLaunch();
  };

  const totalImpact = actions.filter(a => approved.has(a.id)).reduce((sum, a) => sum + a.impact, 0);

  return (
    <div style={{ padding: 28, maxWidth: 1280, margin: '0 auto', paddingBottom: 120 }}>
      <div style={{ marginBottom: 24 }}>
        <Badge variant={state.autopilot ? 'warning' : 'info'} icon={state.autopilot ? Rocket : Shield}>
          {state.autopilot ? 'AUTOPILOT MODE' : 'TRANSPARENT BY DESIGN'}
        </Badge>
        <div style={{ fontSize: 24, fontWeight: 600, color: t.textPrimary, letterSpacing: -0.3, marginTop: 8, marginBottom: 4 }}>
          {state.autopilot ? 'The plan the agent will auto-execute' : 'Review the plan before we execute'}
        </div>
        <div style={{ fontSize: 13, color: t.textSecondary, maxWidth: 640 }}>
          {state.autopilot
            ? 'You chose autopilot — all safe actions will run without further approval. You can still uncheck anything you want to skip, or switch back to hands-on mode in Settings.'
            : 'Every action is predicted, reviewable, and skippable. No black-box autopilot. You approve once — we execute continuously.'}
        </div>
      </div>

      {state.autopilot && (
        <Card padding={16} style={{ marginBottom: 16, borderColor: `${t.accent}50`, background: t.accentBg }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Rocket size={18} color={t.accent} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary }}>
                  Autopilot is ready to run — no further approval needed
                </div>
                <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>
                  Prefer to approve each step? Turn off autopilot in Settings → Agent preferences.
                </div>
              </div>
            </div>
            <Button variant="primary" icon={Rocket} onClick={handleLaunch}>
              Start now
            </Button>
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {actions.map((a, i) => {
          const isApproved = approved.has(a.id);
          const isExpanded = expanded === a.id;
          return (
            <Card key={a.id} padding={0}>
              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div
                    onClick={() => toggle(a.id)}
                    style={{
                      width: 20, height: 20, borderRadius: 5,
                      background: isApproved ? t.accent : 'transparent',
                      border: `1.5px solid ${isApproved ? t.accent : t.borderStrong}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: 1, cursor: 'pointer',
                    }}
                  >
                    {isApproved && <Check size={13} color="#FFF" />}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <div style={{ fontSize: 10, color: t.textTertiary, fontWeight: 500, letterSpacing: 0.3 }}>
                            {String(i + 1).padStart(2, '0')} · {a.category.toUpperCase()}
                          </div>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 500, color: t.textPrimary, marginBottom: 4 }}>
                          {a.title}
                        </div>
                        <div style={{ fontSize: 12, color: t.textSecondary, lineHeight: 1.6 }}>
                          {a.description}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 600, color: t.success, lineHeight: 1 }}>
                          +{a.impact}%
                        </div>
                        <div style={{ fontSize: 10, color: t.textTertiary, marginTop: 2 }}>
                          visibility lift
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 16, marginTop: 14, alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Clock size={12} color={t.textTertiary} />
                        <span style={{ fontSize: 11, color: t.textSecondary }}>{a.duration}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Zap size={12} color={t.textTertiary} />
                        <span style={{ fontSize: 11, color: t.textSecondary }}>{a.effort}</span>
                      </div>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : a.id)}
                        style={{
                          marginLeft: 'auto', background: 'transparent',
                          border: 'none', color: t.accent, cursor: 'pointer',
                          fontSize: 11, fontWeight: 500, padding: 0,
                          fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        {isExpanded ? 'Hide' : 'Show'} technical details
                        <ChevronRight size={12} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{
                    marginTop: 16, marginLeft: 36, padding: 14,
                    background: t.bgElev, borderRadius: 7, border: `1px solid ${t.border}`,
                    fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, monospace)',
                    fontSize: 11, color: t.textSecondary, lineHeight: 1.7,
                  }}>
                    <div style={{ fontSize: 10, color: t.textTertiary, marginBottom: 6, fontFamily: 'inherit', letterSpacing: 0.3, fontWeight: 500 }}>
                      TECHNICAL IMPLEMENTATION
                    </div>
                    {a.technical_details}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* sticky footer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 220, right: 0,
        padding: '16px 28px', background: t.bgElev,
        borderTop: `1px solid ${t.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: t.textTertiary, fontWeight: 500, letterSpacing: 0.3 }}>APPROVED</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: t.textPrimary }}>{approved.size} of {actions.length}</div>
          </div>
          <div style={{ width: 1, height: 36, background: t.border }} />
          <div>
            <div style={{ fontSize: 11, color: t.textTertiary, fontWeight: 500, letterSpacing: 0.3 }}>PROJECTED LIFT (60 DAYS)</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: t.success }}>+{totalImpact}% visibility</div>
          </div>
        </div>
        <Button variant="primary" size="lg" icon={Rocket} onClick={handleLaunch} disabled={approved.size === 0}>
          Launch agent
        </Button>
      </div>
    </div>
  );
};

// =============================================================================
// AGENT CONSOLE
// =============================================================================
const AgentConsole = ({ onComplete }) => {
  const { state, dispatch } = useDemo();
  const actions = (state.profile && state.profile.actions) || ACTIONS;
  const approved = useMemo(
    () => state.approvedActions ?? new Set(actions.map(a => a.id)),
    [state.approvedActions, actions]
  );
  const [logs, setLogs] = useState([]);
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState(false);
  const logRef = useRef(null);

  const allSteps = [
    { action: 'a1', msg: 'Initializing agent runtime...', type: 'info', delay: 300 },
    { action: 'a1', msg: 'Loading authentication tokens for Reddit API', type: 'sys', delay: 500 },
    { action: 'a1', msg: 'Scanning r/remotework — 847 threads analyzed', type: 'sys', delay: 800 },
    { action: 'a1', msg: 'Identified 12 high-relevance threads (freshness <48h, engagement >12 replies)', type: 'success', delay: 600 },
    { action: 'a1', msg: 'Drafted contextual responses for 12 threads — awaiting human review', type: 'pending', delay: 400 },
    { action: 'a2', msg: 'Generating SoftwareApplication JSON-LD for 14 product pages', type: 'info', delay: 500 },
    { action: 'a2', msg: 'Validating schema against schema.org v15.0', type: 'sys', delay: 600 },
    { action: 'a2', msg: 'Schema validation passed — 14/14 pages', type: 'success', delay: 400 },
    { action: 'a2', msg: 'Deploying FAQPage schema to pricing & features pages', type: 'sys', delay: 500 },
    { action: 'a2', msg: 'Submitting to Search Console API for expedited re-crawl', type: 'sys', delay: 600 },
    { action: 'a2', msg: 'Schema deployment complete — full coverage', type: 'success', delay: 400 },
    { action: 'a3', msg: 'Fetching brand descriptions from 9 surfaces (LinkedIn, Crunchbase, G2, ...)', type: 'info', delay: 500 },
    { action: 'a3', msg: 'Entity extraction: 4 conflicting versions detected', type: 'warn', delay: 500 },
    { action: 'a3', msg: 'Generated canonical description — awaiting your approval', type: 'pending', delay: 400 },
    { action: 'a4', msg: 'Analyzing competitive landscape for comparison pages', type: 'info', delay: 500 },
    { action: 'a4', msg: 'Drafting 4 pages @ 1800+ words with structured headings and FAQ schema', type: 'sys', delay: 900 },
    { action: 'a4', msg: 'Draft complete — 4 pages ready for editorial review', type: 'pending', delay: 400 },
    { action: 'a5', msg: 'Updating review request template with use-case framing', type: 'info', delay: 500 },
    { action: 'a5', msg: 'A/B test initialized — 50/50 split across current review flow', type: 'success', delay: 500 },
    { action: null, msg: 'All automated tasks complete. Items pending human review are flagged inline.', type: 'done', delay: 400 },
  ];

  // Only run steps for approved actions. Global summary step (action: null) always runs.
  const steps = useMemo(
    () => allSteps.filter(s => s.action === null || approved.has(s.action)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [approved]
  );

  const pendingReviewCount = useMemo(
    () => steps.filter(s => s.type === 'pending').length,
    [steps]
  );

  useEffect(() => {
    if (current >= steps.length) {
      if (!done) {
        setDone(true);
        dispatch({ type: 'COMPLETE_AGENT' });
      }
      return;
    }
    const step = steps[current];
    const timer = setTimeout(() => {
      setLogs(prev => [...prev, { ...step, time: new Date().toLocaleTimeString('en-US', { hour12: false }) }]);
      setCurrent(c => c + 1);
    }, step.delay);
    return () => clearTimeout(timer);
  }, [current, steps, done, dispatch]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const progress = Math.round((current / steps.length) * 100);

  const statusColors = {
    info: t.info, sys: t.textSecondary, success: t.success,
    warn: t.warning, pending: t.accent, done: t.success, error: t.danger,
  };
  const statusSymbols = {
    info: '→', sys: '·', success: '✓', warn: '!', pending: '◐', done: '★', error: '✗',
  };

  return (
    <div style={{ padding: 28, maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          {done ? <Badge variant="success" icon={CheckCircle2}>EXECUTION COMPLETE</Badge>
                : <Badge variant="info" icon={Activity}>AGENT ACTIVE</Badge>}
          {state.autopilot && <Badge variant="warning" icon={Rocket}>AUTOPILOT</Badge>}
        </div>
        <div style={{ fontSize: 24, fontWeight: 600, color: t.textPrimary, letterSpacing: -0.3, marginBottom: 4 }}>
          Agent console
        </div>
        <div style={{ fontSize: 13, color: t.textSecondary }}>
          {state.autopilot
            ? 'Autopilot mode · agent is executing without step-by-step approval, but every action is still logged below.'
            : 'Every action logged in real time. No black box — you see exactly what\'s happening.'}
        </div>
      </div>

      {/* progress */}
      <Card padding={18} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <div style={{ fontSize: 10, color: t.textTertiary, fontWeight: 500, letterSpacing: 0.3 }}>ACTIONS</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: t.textPrimary }}>{approved.size} running</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: t.textTertiary, fontWeight: 500, letterSpacing: 0.3 }}>STEPS COMPLETED</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: t.textPrimary }}>{current} / {steps.length}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: t.textTertiary, fontWeight: 500, letterSpacing: 0.3 }}>PENDING REVIEW</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: t.accent }}>{pendingReviewCount}</div>
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: t.textPrimary }}>{progress}%</div>
        </div>
        <div style={{ height: 5, background: t.bgElev, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            width: `${progress}%`, height: '100%', borderRadius: 3,
            background: done ? t.success : t.accent,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </Card>

      {/* terminal log */}
      <Card padding={0}>
        <div style={{
          padding: '12px 18px', borderBottom: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Terminal size={14} color={t.textSecondary} />
          <span style={{ fontSize: 12, fontWeight: 500, color: t.textPrimary }}>Execution log</span>
          <span style={{ fontSize: 11, color: t.textTertiary, marginLeft: 'auto' }}>
            Real-time · {logs.length} events
          </span>
        </div>
        <div ref={logRef} style={{
          height: 440, overflowY: 'auto', padding: '14px 18px',
          background: '#08080A',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          fontSize: 12, lineHeight: 1.8,
        }}>
          {logs.map((log, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 2 }}>
              <span style={{ color: t.textTertiary, flexShrink: 0 }}>{log.time}</span>
              {log.action && <span style={{ color: t.textTertiary, flexShrink: 0 }}>[{log.action}]</span>}
              <span style={{ color: statusColors[log.type], flexShrink: 0, width: 12 }}>
                {statusSymbols[log.type]}
              </span>
              <span style={{ color: log.type === 'success' ? t.success : log.type === 'warn' ? t.warning : log.type === 'pending' ? t.accent : t.textPrimary }}>
                {log.msg}
              </span>
            </div>
          ))}
          {!done && (
            <div style={{ display: 'flex', gap: 12, color: t.textTertiary, alignItems: 'center' }}>
              <Loader2 size={12} className="spin" color={t.accent} />
              <span style={{ color: t.accent }}>Executing...</span>
            </div>
          )}
        </div>
      </Card>

      {done && (
        <div style={{ marginTop: 16, padding: 20, background: t.successBg, borderRadius: 10, border: `1px solid ${t.success}30`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CheckCircle2 size={22} color={t.success} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary }}>
                Agent has completed the automated work
              </div>
              <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>
                Visibility compounding now. First measurable lift expected in 7-10 days.
              </div>
            </div>
          </div>
          <Button variant="primary" icon={BarChart3} onClick={onComplete}>
            See projected impact
          </Button>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// ANALYTICS
// =============================================================================
const Analytics = ({ onNav }) => {
  const { state } = useDemo();
  const active = state.agentComplete;

  return (
    <div style={{ padding: 28, maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 4 }}>Analytics</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: t.textPrimary, letterSpacing: -0.3, marginBottom: 4 }}>
            Your compounding presence
          </div>
          <div style={{ fontSize: 13, color: t.textSecondary }}>
            {active
              ? '60-day measured impact from agent execution'
              : '60-day projection — launch the agent to activate'}
          </div>
        </div>
        {active
          ? <Badge variant="success" icon={CheckCircle2}>ACTIVE · Agent executed</Badge>
          : <Badge variant="info" icon={Clock}>PROJECTED · Not yet launched</Badge>}
      </div>

      {!active && (
        <div style={{
          padding: 16, marginBottom: 20,
          background: t.accentBg, borderRadius: 10, border: `1px solid ${t.accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Sparkles size={18} color={t.accent} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary }}>
                The numbers below are projections, not measurements.
              </div>
              <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>
                Review the action plan and launch the agent to start compounding in real time.
              </div>
            </div>
          </div>
          <Button variant="primary" size="sm" icon={Rocket} onClick={() => onNav && onNav('plan')}>
            Review plan
          </Button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20, opacity: active ? 1 : 0.7 }}>
        <StatCard label={active ? 'Presence score' : 'Presence score (projected)'} value="58" change="+46 pts" changeLabel="vs Day 0" trend="up" icon={Activity} />
        <StatCard label={active ? 'Share of voice' : 'Share of voice (projected)'} value="23%" change="+23 pts" changeLabel="in category" trend="up" icon={TrendingUp} />
        <StatCard label={active ? 'Citations (30d)' : 'Citations (projected)'} value="184" change="+1,740%" changeLabel="" trend="up" icon={Link2} />
        <StatCard label={active ? 'ARR impact' : 'ARR impact (projected)'} value="$412k" change="conservative" changeLabel="60-day est." trend="up" icon={Rocket} />
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, marginBottom: 4 }}>Presence score over time</div>
        <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 16 }}>
          {active
            ? 'Your trajectory vs category average. The compounding effect kicks in around Day 21.'
            : 'Projected trajectory if the full plan is executed.'}
        </div>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={VISIBILITY_TIMELINE} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="youGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={t.accent} stopOpacity={active ? 0.4 : 0.18} />
                  <stop offset="100%" stopColor={t.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
              <XAxis dataKey="day" stroke={t.textTertiary} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis stroke={t.textTertiary} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: t.bgElev, border: `1px solid ${t.border}`,
                  borderRadius: 8, fontSize: 12,
                }}
                labelStyle={{ color: t.textPrimary }}
              />
              <Area
                type="monotone"
                dataKey="you"
                stroke={t.accent}
                strokeWidth={2.5}
                strokeDasharray={active ? undefined : '5 5'}
                fill="url(#youGradient)"
                name={active ? 'Your presence' : 'Projected presence'}
              />
              <Line type="monotone" dataKey="category_avg" stroke={t.textTertiary} strokeWidth={1.5} strokeDasharray="4 4" name="Category avg" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, marginBottom: 4 }}>Model-by-model lift</div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 16 }}>
            Presence score before vs after agent execution
          </div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MODEL_BREAKDOWN} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
                <XAxis dataKey="model" stroke={t.textTertiary} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke={t.textTertiary} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: t.bgElev, border: `1px solid ${t.border}`,
                    borderRadius: 8, fontSize: 12,
                  }}
                  cursor={{ fill: t.bgHover }}
                />
                <Bar dataKey="before" fill={t.border} radius={[4, 4, 0, 0]} name="Before" />
                <Bar dataKey="after" fill={t.accent} radius={[4, 4, 0, 0]} name="After" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, marginBottom: 4 }}>Category share of voice</div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 16 }}>
            Your position relative to the category (anonymized)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0' }}>
            <PositionBar label="Your brand" value={23} color={t.accent} highlight />
            <PositionBar label="Category median" value={12} color={t.textTertiary} />
            <PositionBar label="Top quartile threshold" value={34} color={t.border} />
            <PositionBar label="Leader position" value={41} color={t.border} />
          </div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginTop: 16, padding: 12, background: t.bgElev, borderRadius: 7 }}>
            You've moved from the bottom decile to just below the top quartile — in 60 days.
          </div>
        </Card>
      </div>
    </div>
  );
};

const PositionBar = ({ label, value, color, highlight }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: highlight ? t.textPrimary : t.textSecondary, fontWeight: highlight ? 500 : 400 }}>
        {label}
      </span>
      <span style={{ fontSize: 12, color: highlight ? t.accent : t.textPrimary, fontWeight: 500 }}>
        {value}%
      </span>
    </div>
    <div style={{ height: 6, background: t.bgElev, borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${(value / 50) * 100}%`, height: '100%', background: color, borderRadius: 3 }} />
    </div>
  </div>
);

// =============================================================================
// MARKET POSITION
// =============================================================================
const MarketPosition = () => {
  const { state } = useDemo();
  const active = state.agentComplete;

  const yourPercentile = active ? 78 : 8; // percentile in the category (0-100)
  const band =
    yourPercentile >= 75 ? { label: 'Top 25%', color: t.success } :
    yourPercentile >= 50 ? { label: 'Above median', color: t.info } :
    yourPercentile >= 25 ? { label: 'Below median', color: t.warning } :
                            { label: 'Bottom 25%', color: t.danger };

  const personaCoverage = active
    ? [
        { name: 'Remote-first Founder',      awareness: 82, consideration: 71, decision: 64 },
        { name: 'Engineering Manager',       awareness: 88, consideration: 80, decision: 72 },
        { name: 'Product Lead',              awareness: 68, consideration: 60, decision: 55 },
      ]
    : [
        { name: 'Remote-first Founder',      awareness: 22, consideration: 14, decision: 6 },
        { name: 'Engineering Manager',       awareness: 41, consideration: 30, decision: 18 },
        { name: 'Product Lead',              awareness: 18, consideration: 12, decision: 8 },
      ];

  const signalBench = [
    { name: 'Social proof',          you: active ? 72 : 8,  category: 54 },
    { name: 'Technical SEO',         you: active ? 96 : 62, category: 70 },
    { name: 'Editorial depth',       you: active ? 78 : 34, category: 60 },
    { name: 'Entity resolution',     you: active ? 92 : 41, category: 66 },
    { name: 'Comparison content',    you: active ? 68 : 12, category: 48 },
  ];

  const cellColor = (v) => {
    if (v >= 75) return 'rgba(74, 222, 128, 0.25)';
    if (v >= 50) return 'rgba(96, 165, 250, 0.22)';
    if (v >= 25) return 'rgba(251, 191, 36, 0.22)';
    return 'rgba(248, 113, 113, 0.22)';
  };

  return (
    <div style={{ padding: 28, maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 4 }}>Market position</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: t.textPrimary, letterSpacing: -0.3, marginBottom: 4 }}>
            Where you stand in your category
          </div>
          <div style={{ fontSize: 13, color: t.textSecondary }}>
            Aggregated, anonymized category data — no individual brands are named.
          </div>
        </div>
        <Badge variant={active ? 'success' : 'warning'} icon={Layers} size="md">
          {band.label}
        </Badge>
      </div>

      {/* percentile bar */}
      <Card padding={24} style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, marginBottom: 4 }}>Category percentile</div>
        <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 20 }}>
          Your Presence score vs. every tracked brand in B2B SaaS · Project Management.
        </div>
        <div style={{ position: 'relative', height: 56 }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ flex: 1, background: 'rgba(248, 113, 113, 0.18)' }} />
            <div style={{ flex: 1, background: 'rgba(251, 191, 36, 0.18)' }} />
            <div style={{ flex: 1, background: 'rgba(96, 165, 250, 0.18)' }} />
            <div style={{ flex: 1, background: 'rgba(74, 222, 128, 0.2)' }} />
          </div>
          {/* quartile markers */}
          {[25, 50, 75].map(p => (
            <div key={p} style={{
              position: 'absolute', left: `${p}%`, top: 0, bottom: 0,
              width: 1, background: t.border,
            }} />
          ))}
          {/* your position */}
          <div style={{
            position: 'absolute', left: `calc(${yourPercentile}% - 10px)`, top: -6,
            transition: 'left 0.8s ease',
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: t.accent, border: `3px solid ${t.bg}`,
              boxShadow: `0 0 0 3px ${t.accent}40`,
            }} />
          </div>
          <div style={{
            position: 'absolute', left: `${yourPercentile}%`, bottom: -24,
            transform: 'translateX(-50%)', fontSize: 11, color: t.accent, fontWeight: 600,
            transition: 'left 0.8s ease', whiteSpace: 'nowrap',
          }}>
            You · p{yourPercentile}
          </div>
          <div style={{ position: 'absolute', top: 64, left: 0, fontSize: 10, color: t.textTertiary, letterSpacing: 0.3 }}>BOTTOM 25%</div>
          <div style={{ position: 'absolute', top: 64, left: '25%', transform: 'translateX(-50%)', fontSize: 10, color: t.textTertiary, letterSpacing: 0.3 }}>p25</div>
          <div style={{ position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: t.textTertiary, letterSpacing: 0.3 }}>MEDIAN</div>
          <div style={{ position: 'absolute', top: 64, left: '75%', transform: 'translateX(-50%)', fontSize: 10, color: t.textTertiary, letterSpacing: 0.3 }}>p75</div>
          <div style={{ position: 'absolute', top: 64, right: 0, fontSize: 10, color: t.textTertiary, letterSpacing: 0.3 }}>TOP 25%</div>
        </div>
        <div style={{
          marginTop: 56, padding: 14, background: t.bgElev, borderRadius: 8,
          fontSize: 12, color: t.textSecondary, lineHeight: 1.6,
        }}>
          {active
            ? <>You moved from the <strong style={{ color: t.textPrimary }}>bottom decile</strong> to the <strong style={{ color: t.success }}>top quartile</strong> in 60 days. Compounding still accelerating.</>
            : <>You're currently in the <strong style={{ color: t.danger }}>bottom decile</strong> of your category. Launch the agent to start the climb.</>}
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* persona coverage heatmap */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, marginBottom: 4 }}>Persona × buyer journey coverage</div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 16 }}>
            Share of AI answers mentioning you, by persona and stage.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 6, fontSize: 11 }}>
            <div />
            <div style={{ color: t.textTertiary, fontWeight: 500, letterSpacing: 0.3, textAlign: 'center' }}>AWARENESS</div>
            <div style={{ color: t.textTertiary, fontWeight: 500, letterSpacing: 0.3, textAlign: 'center' }}>CONSIDER</div>
            <div style={{ color: t.textTertiary, fontWeight: 500, letterSpacing: 0.3, textAlign: 'center' }}>DECISION</div>
            {personaCoverage.map(row => (
              <React.Fragment key={row.name}>
                <div style={{ color: t.textPrimary, fontSize: 12, display: 'flex', alignItems: 'center' }}>{row.name}</div>
                {['awareness', 'consideration', 'decision'].map(stage => (
                  <div key={stage} style={{
                    padding: '12px 0', textAlign: 'center', borderRadius: 7,
                    background: cellColor(row[stage]),
                    color: t.textPrimary, fontWeight: 500, fontSize: 13,
                    transition: 'background 0.4s ease',
                  }}>
                    {row[stage]}%
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </Card>

        {/* signal benchmarks */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, marginBottom: 4 }}>Signal strength vs. category</div>
          <div style={{ fontSize: 11, color: t.textSecondary, marginBottom: 16 }}>
            You (purple) compared with the anonymized category median (grey).
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {signalBench.map(s => (
              <div key={s.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: t.textPrimary }}>{s.name}</span>
                  <span style={{ fontSize: 11, color: s.you >= s.category ? t.success : t.danger, fontWeight: 500 }}>
                    {s.you >= s.category ? `+${s.you - s.category}` : `${s.you - s.category}`} vs median
                  </span>
                </div>
                <div style={{ position: 'relative', height: 10, background: t.bgElev, borderRadius: 5 }}>
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: `${s.you}%`, background: t.accent, borderRadius: 5,
                    transition: 'width 0.8s ease',
                  }} />
                  <div style={{
                    position: 'absolute', left: `${s.category}%`, top: -2, bottom: -2,
                    width: 2, background: t.textPrimary, opacity: 0.5,
                  }} title={`Category median · ${s.category}`} />
                </div>
              </div>
            ))}
          </div>
          <div style={{
            marginTop: 14, padding: 10, background: t.bgElev, borderRadius: 7,
            fontSize: 11, color: t.textSecondary, lineHeight: 1.5,
          }}>
            Grey line = category median across tracked brands in your segment.
          </div>
        </Card>
      </div>
    </div>
  );
};

// =============================================================================
// SETTINGS
// =============================================================================
const SettingsView = () => {
  const { state, dispatch } = useDemo();
  const brand = (state.profile && state.profile.brand) || BRAND;
  return (
  <div style={{ padding: 28, maxWidth: 1280, margin: '0 auto' }}>
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 4 }}>Settings</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: t.textPrimary, letterSpacing: -0.3 }}>
        Workspace settings
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <Card>
        <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, marginBottom: 14 }}>Brand profile</div>
        <SettingRow label="Name" value={brand.name} />
        <SettingRow label="Domain" value={brand.domain} />
        <SettingRow label="Industry" value={brand.industry} />
        <SettingRow label="Tagline" value={brand.tagline} />
        <SettingRow label="Stage" value={brand.stage} />
      </Card>

      <Card>
        <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, marginBottom: 14 }}>Tracked models</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {AI_MODELS.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: m.color }} />
                <div>
                  <div style={{ fontSize: 13, color: t.textPrimary, fontWeight: 500 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: t.textTertiary }}>{m.vendor}</div>
                </div>
              </div>
              <Toggle on={true} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, marginBottom: 14 }}>Agent preferences</div>
        <ControlledToggleRow
          label="Autopilot mode"
          desc="Auto-approve and execute every safe action without review. Rankad-style workflow."
          on={state.autopilot}
          onChange={(v) => dispatch({ type: 'SET_AUTOPILOT', value: v })}
        />
        <ToggleRow label="Human review before publishing" desc="Require approval for external content" on={!state.autopilot} />
        <ToggleRow label="Auto-apply technical fixes" desc="Schema, meta tags, robots.txt" on={true} />
        <ToggleRow label="Weekly summary email" desc="Presence score + wins/losses" on={true} />
        <ToggleRow label="Slack alerts on critical signal drops" desc="Immediate notification" on={false} />
      </Card>

      <Card>
        <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, marginBottom: 14 }}>Integrations</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { name: 'Google Search Console', status: 'connected' },
            { name: 'Webflow CMS', status: 'connected' },
            { name: 'LinkedIn Page Admin', status: 'connected' },
            { name: 'Segment', status: 'disconnected' },
            { name: 'HubSpot', status: 'disconnected' },
          ].map(i => (
            <div key={i.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, color: t.textPrimary }}>{i.name}</div>
              <Badge variant={i.status === 'connected' ? 'success' : 'default'} size="sm">
                {i.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ gridColumn: '1 / -1', borderColor: 'rgba(248, 113, 113, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: t.textPrimary, marginBottom: 4 }}>Demo controls</div>
            <div style={{ fontSize: 12, color: t.textSecondary, lineHeight: 1.5 }}>
              Reset the workspace to its pre-scan state — useful between back-to-back presentations. All local progress is cleared.
            </div>
          </div>
          <Button variant="danger" icon={X} onClick={() => dispatch({ type: 'RESET' })}>
            Reset demo state
          </Button>
        </div>
      </Card>
    </div>
  </div>
  );
};

const SettingRow = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${t.border}` }}>
    <span style={{ fontSize: 12, color: t.textSecondary }}>{label}</span>
    <span style={{ fontSize: 12, color: t.textPrimary, fontWeight: 500 }}>{value}</span>
  </div>
);

const Toggle = ({ on: defaultOn }) => {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => setOn(!on)}
      style={{
        width: 34, height: 20, borderRadius: 12,
        background: on ? t.accent : t.border,
        border: 'none', cursor: 'pointer', padding: 0,
        position: 'relative', transition: 'background 0.2s',
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: '50%', background: '#FFF',
        position: 'absolute', top: 3, left: on ? 17 : 3,
        transition: 'left 0.2s',
      }} />
    </button>
  );
};

const ToggleRow = ({ label, desc, on }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${t.border}` }}>
    <div>
      <div style={{ fontSize: 13, color: t.textPrimary, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 11, color: t.textSecondary }}>{desc}</div>
    </div>
    <Toggle on={on} />
  </div>
);

// Controlled variants for state that must round-trip (e.g. autopilot in SettingsView).
const ControlledToggle = ({ on, onChange }) => (
  <button
    onClick={() => onChange && onChange(!on)}
    style={{
      width: 34, height: 20, borderRadius: 12,
      background: on ? t.accent : t.border,
      border: 'none', cursor: 'pointer', padding: 0,
      position: 'relative', transition: 'background 0.2s',
    }}
  >
    <div style={{
      width: 14, height: 14, borderRadius: '50%', background: '#FFF',
      position: 'absolute', top: 3, left: on ? 17 : 3,
      transition: 'left 0.2s',
    }} />
  </button>
);

const ControlledToggleRow = ({ label, desc, on, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${t.border}` }}>
    <div>
      <div style={{ fontSize: 13, color: t.textPrimary, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 11, color: t.textSecondary }}>{desc}</div>
    </div>
    <ControlledToggle on={on} onChange={onChange} />
  </div>
);

// =============================================================================
// APP SHELL
// =============================================================================
// =============================================================================
// DEMO EDITOR — hidden behind Ctrl+Shift+E. Lets a presenter tailor the
// shock content (brand, personas, prompts, signals, actions) before a meeting
// without touching code. Autosaves to localStorage.
// =============================================================================
const DemoEditor = () => {
  const { state, dispatch } = useDemo();
  const fileInputRef = useRef(null);

  // Seed: current profile, or the Flowspace default if nothing loaded yet.
  const base = state.profile || PROFILE_FLOWSPACE;
  const seedSignals = (base.signals || SIGNALS).map(s => ({ ...s }));
  const seedActions = (base.actions || ACTIONS).map(a => ({ ...a }));

  const [brand, setBrand]     = useState(base.brand);
  const [shockLine, setShock] = useState(base.shockLine);
  const [personas, setPers]   = useState(base.personas.map(p => ({ ...p })));
  const [prompts, setPrompts] = useState(base.prompts.map(p => ({ ...p })));
  const [signals, setSignals] = useState(seedSignals);
  const [actions, setActions] = useState(seedActions);
  const [section, setSection] = useState('brand');

  const apply = () => {
    const fullProfile = {
      ...base,
      brand, shockLine, personas, prompts, signals, actions,
    };
    dispatch({ type: 'SET_PROFILE', profile: fullProfile });
    dispatch({ type: 'CLOSE_EDITOR' });
  };

  const exportJson = () => {
    const payload = {
      profile: { ...base, brand, shockLine, personas, prompts, signals, actions },
      autopilot: state.autopilot,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presense-${(brand.domain || 'demo').replace(/[^\w.-]/g, '_')}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importJson = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.profile) {
          setBrand(data.profile.brand || brand);
          setShock(data.profile.shockLine || shockLine);
          setPers(data.profile.personas || personas);
          setPrompts(data.profile.prompts || prompts);
          setSignals(data.profile.signals || signals);
          setActions(data.profile.actions || actions);
        }
        if (typeof data.autopilot === 'boolean') {
          dispatch({ type: 'SET_AUTOPILOT', value: data.autopilot });
        }
      } catch (e) {
        alert('Invalid JSON file: ' + e.message);
      }
    };
    reader.readAsText(file);
  };

  const sections = [
    { id: 'brand',    label: 'Brand & shock' },
    { id: 'personas', label: `Personas (${personas.length})` },
    { id: 'prompts',  label: `Prompts (${prompts.length})` },
    { id: 'signals',  label: `Signals (${signals.length})` },
    { id: 'actions',  label: `Actions (${actions.length})` },
  ];

  const input = (value, onChange, placeholder) => (
    <input
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '8px 10px', fontSize: 12,
        background: t.bgCard, border: `1px solid ${t.border}`,
        borderRadius: 6, color: t.textPrimary, outline: 'none',
        fontFamily: 'inherit',
      }}
    />
  );
  const textarea = (value, onChange, rows = 3, placeholder) => (
    <textarea
      rows={rows}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '8px 10px', fontSize: 12,
        background: t.bgCard, border: `1px solid ${t.border}`,
        borderRadius: 6, color: t.textPrimary, outline: 'none',
        fontFamily: 'inherit', resize: 'vertical',
      }}
    />
  );
  const label = (text) => (
    <div style={{ fontSize: 10, color: t.textTertiary, fontWeight: 500, letterSpacing: 0.3, marginBottom: 4, marginTop: 10 }}>
      {text.toUpperCase()}
    </div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 70,
      display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end',
    }} onClick={() => dispatch({ type: 'CLOSE_EDITOR' })}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 720, background: t.bgElev,
        borderLeft: `1px solid ${t.border}`,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* header */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 11, color: t.accent, fontWeight: 500, letterSpacing: 0.3 }}>DEMO EDITOR</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.textPrimary, letterSpacing: -0.2 }}>
              Tailor the demo for this meeting
            </div>
          </div>
          <Button variant="ghost" size="sm" icon={X} onClick={() => dispatch({ type: 'CLOSE_EDITOR' })} />
        </div>

        {/* toolbar */}
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button size="sm" icon={Database} onClick={exportJson}>Export JSON</Button>
          <Button size="sm" icon={FileText} onClick={() => fileInputRef.current && fileInputRef.current.click()}>Import JSON</Button>
          <input
            ref={fileInputRef} type="file" accept="application/json" style={{ display: 'none' }}
            onChange={e => e.target.files && e.target.files[0] && importJson(e.target.files[0])}
          />
          <div style={{ marginLeft: 'auto', fontSize: 11, color: t.textTertiary }}>
            Ctrl+Shift+E to toggle · changes auto-save
          </div>
        </div>

        {/* section tabs */}
        <div style={{ padding: '10px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', gap: 6, overflowX: 'auto' }}>
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              style={{
                padding: '6px 12px', fontSize: 12, fontWeight: 500,
                background: section === s.id ? t.accentBg : 'transparent',
                color: section === s.id ? t.accent : t.textSecondary,
                border: 'none', borderRadius: 6, cursor: 'pointer',
                fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >{s.label}</button>
          ))}
        </div>

        {/* body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {section === 'brand' && (
            <>
              {label('Brand name')}
              {input(brand.name, v => setBrand({ ...brand, name: v }), 'PayPal')}
              {label('Domain')}
              {input(brand.domain, v => setBrand({ ...brand, domain: v }), 'paypal.com')}
              {label('Industry')}
              {input(brand.industry, v => setBrand({ ...brand, industry: v }), 'Fintech · Payments')}
              {label('Tagline')}
              {input(brand.tagline, v => setBrand({ ...brand, tagline: v }), 'One-line positioning')}
              {label('Stage')}
              {input(brand.stage, v => setBrand({ ...brand, stage: v }), 'Series B / Public / etc.')}
              {label('Shock line (appears after scan completes)')}
              {textarea(shockLine, setShock, 3, 'Industry classified as ... You\'re in the bottom decile.')}
            </>
          )}

          {section === 'personas' && personas.map((p, i) => (
            <div key={p.id} style={{ padding: 14, marginBottom: 10, background: t.bgCard, borderRadius: 8, border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 11, color: t.textTertiary, fontWeight: 500, letterSpacing: 0.3, marginBottom: 6 }}>PERSONA {i + 1}</div>
              {input(p.name, v => setPers(personas.map((x, j) => j === i ? { ...x, name: v } : x)), 'Persona name')}
              <div style={{ height: 6 }} />
              {input(p.desc, v => setPers(personas.map((x, j) => j === i ? { ...x, desc: v } : x)), 'Short description')}
            </div>
          ))}

          {section === 'prompts' && prompts.map((p, i) => (
            <div key={p.id} style={{ padding: 14, marginBottom: 10, background: t.bgCard, borderRadius: 8, border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 11, color: t.textTertiary, fontWeight: 500, letterSpacing: 0.3, marginBottom: 6 }}>PROMPT {i + 1}</div>
              {input(p.text, v => setPrompts(prompts.map((x, j) => j === i ? { ...x, text: v } : x)), 'The buying prompt text')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: t.textTertiary, marginBottom: 2 }}>VOLUME/MO</div>
                  {input(String(p.volume ?? ''), v => setPrompts(prompts.map((x, j) => j === i ? { ...x, volume: parseInt(v) || 0 } : x)), '12000')}
                </div>
                <div>
                  <div style={{ fontSize: 10, color: t.textTertiary, marginBottom: 2 }}>PRIORITY (1-3)</div>
                  {input(String(p.priority ?? ''), v => setPrompts(prompts.map((x, j) => j === i ? { ...x, priority: parseInt(v) || 1 } : x)), '1')}
                </div>
                <div>
                  <div style={{ fontSize: 10, color: t.textTertiary, marginBottom: 2 }}>MODELS MENTIONING (csv)</div>
                  {input((p.mentioned || []).join(','), v => setPrompts(prompts.map((x, j) => j === i ? { ...x, mentioned: v.split(',').map(s => s.trim()).filter(Boolean) } : x)), 'chatgpt,claude')}
                </div>
              </div>
            </div>
          ))}

          {section === 'signals' && signals.map((s, i) => (
            <div key={s.id} style={{ padding: 14, marginBottom: 10, background: t.bgCard, borderRadius: 8, border: `1px solid ${t.border}` }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <StatusDot status={s.status} />
                <div style={{ fontSize: 11, color: t.textTertiary, fontWeight: 500, letterSpacing: 0.3 }}>{s.category.toUpperCase()} · {s.weight}</div>
              </div>
              {label('Name')}
              {input(s.name, v => setSignals(signals.map((x, j) => j === i ? { ...x, name: v } : x)))}
              {label('Your value (what\'s wrong today)')}
              {input(s.yourValue, v => setSignals(signals.map((x, j) => j === i ? { ...x, yourValue: v } : x)))}
              {label('Benchmark')}
              {input(s.benchmark, v => setSignals(signals.map((x, j) => j === i ? { ...x, benchmark: v } : x)))}
              {label('Explanation (why this matters)')}
              {textarea(s.explanation, v => setSignals(signals.map((x, j) => j === i ? { ...x, explanation: v } : x)), 4)}
            </div>
          ))}

          {section === 'actions' && actions.map((a, i) => (
            <div key={a.id} style={{ padding: 14, marginBottom: 10, background: t.bgCard, borderRadius: 8, border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 11, color: t.textTertiary, fontWeight: 500, letterSpacing: 0.3, marginBottom: 6 }}>{a.category.toUpperCase()} · ACTION {i + 1}</div>
              {label('Title')}
              {input(a.title, v => setActions(actions.map((x, j) => j === i ? { ...x, title: v } : x)))}
              {label('Description (shown in plan)')}
              {textarea(a.description, v => setActions(actions.map((x, j) => j === i ? { ...x, description: v } : x)), 3)}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: t.textTertiary, marginBottom: 2 }}>IMPACT %</div>
                  {input(String(a.impact ?? ''), v => setActions(actions.map((x, j) => j === i ? { ...x, impact: parseInt(v) || 0 } : x)))}
                </div>
                <div>
                  <div style={{ fontSize: 10, color: t.textTertiary, marginBottom: 2 }}>DURATION</div>
                  {input(a.duration, v => setActions(actions.map((x, j) => j === i ? { ...x, duration: v } : x)))}
                </div>
                <div>
                  <div style={{ fontSize: 10, color: t.textTertiary, marginBottom: 2 }}>EFFORT</div>
                  {input(a.effort, v => setActions(actions.map((x, j) => j === i ? { ...x, effort: v } : x)))}
                </div>
              </div>
              {label('Technical details (shown when expanded)')}
              {textarea(a.technical_details, v => setActions(actions.map((x, j) => j === i ? { ...x, technical_details: v } : x)), 4)}
            </div>
          ))}
        </div>

        {/* footer */}
        <div style={{
          padding: '14px 20px', borderTop: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <div style={{ fontSize: 11, color: t.textTertiary }}>
            Apply overrides the active profile. Reset demo state clears everything.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={() => dispatch({ type: 'CLOSE_EDITOR' })}>Cancel</Button>
            <Button variant="primary" icon={Check} onClick={apply}>Apply to demo</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const GLOBAL_STYLE = `
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes presenseFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
  .presense-fade-in { animation: presenseFadeIn 0.4s ease; }
  * { box-sizing: border-box; }
  body { margin: 0; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: ${t.borderStrong}; }
`;

function useHydratedDemo() {
  // Hydrate from localStorage BEFORE the reducer's first render so editor config survives reloads.
  const [state, dispatch] = useReducer(demoReducer, initialDemoState, (init) => {
    const saved = loadPersistedDemo();
    if (!saved) return init;
    return {
      ...init,
      profile: saved.profile || null,
      autopilot: !!saved.autopilot,
    };
  });
  return [state, dispatch];
}

export default function App() {
  const [state, dispatch] = useHydratedDemo();
  const [view, setView] = useState('dashboard');

  // Reset navigation when demo is reset.
  useEffect(() => {
    if (!state.onboarded) setView('dashboard');
  }, [state.onboarded]);

  // Persist profile + autopilot to localStorage on every change. On RESET, clear it.
  useEffect(() => {
    if (!state.profile && !state.autopilot) {
      clearPersistedDemo();
    } else {
      savePersistedDemo({ profile: state.profile, autopilot: state.autopilot });
    }
  }, [state.profile, state.autopilot]);

  // Ctrl+Shift+E toggles the demo editor. Captured globally — works from any view
  // including onboarding.
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        dispatch({ type: state.editorOpen ? 'CLOSE_EDITOR' : 'OPEN_EDITOR' });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.editorOpen, dispatch]);

  return (
    <DemoContext.Provider value={{ state, dispatch }}>
      <style>{GLOBAL_STYLE}</style>
      {!state.onboarded ? (
        <Onboarding onComplete={() => dispatch({ type: 'COMPLETE_ONBOARDING' })} />
      ) : (
        <div style={{
          display: 'flex', minHeight: '100vh', background: t.bg,
          color: t.textPrimary,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif',
          fontSize: 13, lineHeight: 1.5,
        }}>
          <Sidebar current={view} onNav={setView} brandConnected={true} />
          <div style={{ flex: 1, overflowX: 'hidden' }}>
            {view === 'dashboard' && <Dashboard onNav={setView} />}
            {view === 'prompts' && <PromptScanner onNav={setView} />}
            {view === 'why' && <WhyEngine onNav={setView} />}
            {view === 'plan' && <ActionPlan onLaunch={() => setView('agent')} />}
            {view === 'agent' && <AgentConsole onComplete={() => setView('analytics')} />}
            {view === 'analytics' && <Analytics onNav={setView} />}
            {view === 'market' && <MarketPosition />}
            {view === 'settings' && <SettingsView />}
          </div>
        </div>
      )}
      {state.editorOpen && <DemoEditor />}
    </DemoContext.Provider>
  );
}
