# Presense — AI Visibility Platform

> Know exactly why AI doesn't recommend your brand. Fix it automatically.

---

## Problem

The way buyers make decisions has fundamentally shifted.

They no longer Google and click links. They ask AI models — and act on the answer. If your brand isn't mentioned in that answer, you lose the deal before your funnel even starts.

Most companies don't know this is happening. The ones that do have no clear way to diagnose it or fix it. Existing tools either show you a score without explaining why, or require expensive agency retainers with no transparency into what's actually being done.

---

## Solution

Presense is a self-serve AI visibility platform that does four things:

**1. Detects** — Scans your brand across the 4 major AI models (ChatGPT, Perplexity, Gemini, Claude) for the exact prompts your buyers ask. Shows you where you appear and where you don't.

**2. Diagnoses** — Identifies the specific signals each AI model uses to form recommendations, and shows exactly where your brand falls short. Not a score — a signal-by-signal breakdown with explanations.

**3. Plans** — Before running anything, Presense shows you every planned action with its projected visibility impact. You review and approve. Nothing runs without your sign-off.

**4. Executes** — An autonomous agent runs the approved actions and logs every single step in real time. Full transparency, no black box.

---

## What Makes Presense Different

Most tools in this space stop at detection — they tell you that you're invisible, hand you a score, and leave you to figure out the rest.

The tools that go further either operate as agencies (expensive, slow, opaque) or run fully automated fixes without explaining what they're doing or why.

Presense is built around a different philosophy: **explainability first, then automation**.

| | Detection tools | Agency model | **Presense** |
|---|---|---|---|
| Shows where you're invisible | ✓ | ✓ | ✓ |
| Explains *why*, signal by signal | ✗ | Sometimes | **✓ Always** |
| Shows the plan before executing | ✗ | ✗ | **✓** |
| Executes automatically | ✗ | Manual | **✓ Agent** |
| Full execution log | ✗ | ✗ | **✓** |
| Self-serve, no agency needed | ✓ | ✗ | **✓** |
| Compounding proof over time | ✗ | ✗ | **✓** |

The core insight: brands don't just need to know they're invisible. They need to know *why* — and they need to stay in control of the fix.

---

## Technical Approach

### Stack

| Layer | Technology |
|---|---|
| Framework | React 18 |
| Build tool | Vite 5 |
| Charts | Recharts |
| Icons | Lucide React |
| State | React hooks (useState, useEffect, useRef) |
| Styling | Inline styles with centralized design tokens |

### Architecture

src/
├── main.jsx        — Entry point
├── App.jsx         — App shell + all page components
├── tokens.js       — Design system: colors and visual constants
└── data.js         — Mock data: brand, prompts, signals, actions, analytics

### Key Design Decisions

**Centralized design tokens** — Every color and spacing value lives in `tokens.js`. Easy to retheme.

**Signal-first data model** — Every view traces back to the same `SIGNALS` array. The narrative stays coherent: invisible → why → fix → proof.

**Transparent agent simulation** — The Agent Console streams a realistic execution log step by step. Same structure maps to a WebSocket connection in production.

**No competitor names, anywhere** — All benchmarking uses category averages and quartile thresholds. Your brand is the only named entity.

**Human approval gates** — External content requires explicit approval before the agent acts. Technical fixes run automatically.

### Pages

| Page | What it does |
|---|---|
| Onboarding | Connect brand → confirm personas → select prompts |
| Dashboard | Presence score, model breakdown, signal health |
| Prompt Scanner | Per-prompt visibility across all 4 models with live answer drawer |
| Why Engine | Signal-by-signal diagnosis with full explanations |
| Action Plan | Review and approve actions with projected impact before execution |
| Agent Console | Real-time execution log, step by step |
| Analytics | Compounding visibility chart, model lift, market position |
| Settings | Brand profile, tracked models, agent preferences, integrations |

---

## How to Run

```bash
git clone https://github.com/gkazemikhanghah-maker/Presense_florentxlundaisociety.git
cd Presense_florentxlundaisociety

npm install
npm run dev
```

Opens at `http://localhost:5173`

---

## Demo Flow

1. **Onboarding** — type any domain, hit Analyze, watch the scan run
2. **Dashboard** — see which models mention you and which don't
3. **Prompt Scanner** — click a prompt marked "Not mentioned" to open the answer drawer
4. **Why Engine** — click a Critical signal to see the full explanation
5. **Action Plan** — review actions and projected impact, then hit Launch
6. **Agent Console** — watch the execution log stream live
7. **Analytics** — 60-day compound trajectory and per-model lift

---

## Status

Interactive product demo. Runs entirely in the browser with realistic simulated data. No backend, no API keys required.

---

