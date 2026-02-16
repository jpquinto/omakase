# Omakase Personal Life Navigation Hub -- Product Strategy

> "Omakase" (お任せ) -- "I'll leave it to you." Trust in the craftsperson.

**Date:** February 14, 2026
**Status:** Strategic Vision / Brainstorm
**Author:** Product Strategy Session

---

## Table of Contents

1. [Vision and Positioning](#1-vision-and-positioning)
2. [Competitive Landscape](#2-competitive-landscape)
3. [Core Integrations Catalog](#3-core-integrations-catalog)
4. [Killer Features by Integration](#4-killer-features-by-integration)
5. [AI Agent Evolution](#5-ai-agent-evolution)
6. [Unified Dashboard Concepts](#6-unified-dashboard-concepts)
7. [Monetization and Growth](#7-monetization-and-growth)
8. [Technical Architecture](#8-technical-architecture)
9. [Prioritized Roadmap](#9-prioritized-roadmap)
10. [Appendix: Design Language Extensions](#appendix-design-language-extensions)

---

## 1. Vision and Positioning

### The Core Idea

Omakase evolves from an autonomous development platform into a **personal life navigation system** -- a single, beautiful, AI-powered interface that connects every domain of your life and uses intelligent agents to reduce friction, surface insights, and act on your behalf.

The name becomes the philosophy: you trust Omakase with the details of your day so you can focus on what matters. It is not another dashboard. It is not another productivity app. It is a **zen command center** -- a calm, intelligent surface that absorbs the chaos of modern digital life and returns clarity.

### What "Life Navigation" Means

A navigator does not merely display information. A navigator:

- **Understands context** -- It knows that the meeting in 20 minutes is with a client you have been negotiating with, that the relevant Notion doc was updated yesterday, and that you slept poorly last night.
- **Anticipates needs** -- It prepares your briefing before you ask, queues your focus playlist before you sit down to deep work, and reminds you to leave early because traffic is heavy.
- **Acts with permission** -- It drafts the follow-up email, reschedules the low-priority meeting when your calendar overflows, and orders groceries when your meal plan calls for ingredients you are missing.
- **Learns your rhythms** -- Over weeks and months, it learns when you are most productive, what music helps you focus, how you prefer to structure mornings, and which commitments drain you.

### The Positioning Statement

> **For people who live across dozens of apps and services**, Omakase is a **personal life navigation hub** that unifies your digital world into a single, AI-powered command center. Unlike Notion (which is a blank canvas you must build yourself), Raycast (which is a launcher, not a living dashboard), or Arc (which organizes browsing but not your life), Omakase **actively navigates your day** by connecting your calendar, tasks, code, music, health, and finances through a team of AI agents that understand your context and act on your behalf -- all within a calm, Japanese-inspired interface designed for sustained focus rather than information overload.

### Design Philosophy: Zen Command Center

The existing Liquid Glass aesthetic is perfectly suited for this evolution. Where most productivity tools feel like air traffic control towers -- dense, urgent, overwhelming -- Omakase should feel like a **Japanese tea room with a view of the city**. Calm interior, vast awareness.

Key principles:

- **Negative space is data** -- What is absent from the screen is as important as what is present. An empty morning block communicates rest. A clear inbox communicates completion.
- **Depth through layers** -- Glass surfaces create hierarchy without borders. Information exists at different depths of focus: foreground (what needs attention now), midground (context), background (ambient awareness).
- **Intentional motion** -- Every animation communicates state change. A card breathing means it is live-updating. A gentle slide means something new arrived. Nothing moves for decoration.
- **One screen, infinite depth** -- The home view should feel complete at a glance, but every element is a portal to deeper context. Click into time and you are in your calendar. Click into a task and you see its full graph of dependencies across services.

---

## 2. Competitive Landscape

### Direct Competitors

| Product | What It Does Well | Where It Falls Short | Omakase Advantage |
|---------|-------------------|---------------------|-------------------|
| **Notion** | Flexible workspace, databases, docs | Blank canvas requires heavy setup; no ambient intelligence; no real-time external data | Pre-built intelligence, live integrations, agent-powered automation |
| **Raycast** | Lightning-fast launcher, extensions | Ephemeral (dismiss and it is gone); no persistent dashboard; Mac-only | Persistent living dashboard; web-based; ambient awareness |
| **Arc Browser** | Beautiful tab management, spaces | Browser-scoped; does not integrate with non-web services | Service-level integration beyond browsing |
| **Motion** | AI calendar scheduling | Narrow focus (calendar/tasks only); no broader life integration | Full life coverage: code, health, finance, media |
| **Morgen** | Calendar aggregation, task scheduling | Limited to time management domain | Broader context: agents understand why you are scheduling |
| **Amie** | Beautiful calendar + Todoist/Spotify | Light integrations; no AI agent layer; no deep analysis | Deep agent reasoning across all connected services |
| **ClickUp** | Everything-app for project management | Overwhelming complexity; corporate-feeling; no personal-life orientation | Personal-first design; calm aesthetic; individual not team |
| **Apple Intelligence** | OS-level integration on Apple devices | Walled garden; limited third-party; no web dashboard | Platform-agnostic; deep third-party integrations |

### Indirect Competitors

| Product | Overlap | Differentiation |
|---------|---------|----------------|
| **Zapier / Make** | Automation between services | Omakase has a UI and intelligence layer; Zapier is headless plumbing |
| **IFTTT** | Simple automations | Too simplistic; no contextual reasoning |
| **Sunsama** | Daily planning ritual | Narrow scope; no agent intelligence |
| **Reclaim.ai** | Smart calendar scheduling | Calendar-only; no broader life integration |
| **Lindy.ai** | AI agent platform | Agent-focused but no unified dashboard or design system |

### White Space Opportunity

No product today occupies the intersection of:
1. Beautiful, persistent, living dashboard (not a launcher or blank canvas)
2. Deep multi-service integration (beyond calendar + tasks)
3. AI agents that reason across services (not just automate between them)
4. Personal-life orientation (not team/corporate productivity)
5. Calm, intentional design aesthetic

This intersection is Omakase's territory.

---

## 3. Core Integrations Catalog

Organized by life domain, with integration complexity and strategic priority noted.

### Productivity and Time

| # | Integration | API Type | OAuth | Complexity | Priority |
|---|-------------|----------|-------|------------|----------|
| 1 | **Google Calendar** | REST + Webhooks | Yes | Medium | P0 |
| 2 | **Notion** | REST + Webhooks | Yes | Medium | P0 |
| 3 | **Todoist** | REST + Webhooks | Yes | Low | P1 |
| 4 | **Apple Reminders** | CloudKit (limited) | No (local) | High | P2 |
| 5 | **Obsidian** | Local vault (file system) | No | Medium | P2 |

### Communication

| # | Integration | API Type | OAuth | Complexity | Priority |
|---|-------------|----------|-------|------------|----------|
| 6 | **Gmail** | REST + Push | Yes (Google) | Medium | P1 |
| 7 | **Slack** | REST + Events API | Yes | Medium | P1 |
| 8 | **iMessage** | Local (macOS only) | No | Very High | P3 |
| 9 | **Discord** | REST + Gateway | Yes | Medium | P2 |

### Development (Existing + Extensions)

| # | Integration | API Type | OAuth | Complexity | Priority |
|---|-------------|----------|-------|------------|----------|
| 10 | **GitHub** | REST + Webhooks | Yes | Already built | P0 (done) |
| 11 | **Linear** | GraphQL + Webhooks | Yes | Already built | P0 (done) |
| 12 | **Vercel** | REST | Yes | Low | P2 |
| 13 | **AWS (CloudWatch)** | SDK | IAM | Medium | P2 |

### Health and Wellness

| # | Integration | API Type | OAuth | Complexity | Priority |
|---|-------------|----------|-------|------------|----------|
| 14 | **Apple Health** | HealthKit (via proxy) | No (device) | High | P2 |
| 15 | **Oura Ring** | REST | Yes | Low | P1 |
| 16 | **Whoop** | REST | Yes | Low | P2 |
| 17 | **Strava** | REST + Webhooks | Yes | Low | P2 |

### Finance

| # | Integration | API Type | OAuth | Complexity | Priority |
|---|-------------|----------|-------|------------|----------|
| 18 | **Plaid** (bank aggregation) | REST | Token | High | P2 |
| 19 | **Stripe** (revenue) | REST + Webhooks | API key | Medium | P2 |
| 20 | **Coinbase** (crypto) | REST | Yes | Medium | P3 |

### Media and Entertainment

| # | Integration | API Type | OAuth | Complexity | Priority |
|---|-------------|----------|-------|------------|----------|
| 21 | **Spotify** | REST + Web Playback SDK | Yes | Medium | P0 |
| 22 | **YouTube** | REST | Yes (Google) | Medium | P2 |
| 23 | **Pocket / Readwise** | REST | Yes | Low | P1 |
| 24 | **Letterboxd** | Scraping (no official API) | No | High | P3 |

### Smart Home and IoT

| # | Integration | API Type | OAuth | Complexity | Priority |
|---|-------------|----------|-------|------------|----------|
| 25 | **Home Assistant** | REST + WebSocket | API key | Medium | P2 |
| 26 | **Philips Hue** | REST (local + cloud) | Yes | Low | P2 |

### Travel and Transportation

| # | Integration | API Type | OAuth | Complexity | Priority |
|---|-------------|----------|-------|------------|----------|
| 27 | **Flighty** (flights) | No public API | Manual/scrape | High | P3 |
| 28 | **Google Maps** | REST | API key | Low | P1 |
| 29 | **TripIt** | REST | Yes | Medium | P3 |

### Learning and Knowledge

| # | Integration | API Type | OAuth | Complexity | Priority |
|---|-------------|----------|-------|------------|----------|
| 30 | **Readwise** | REST | API key | Low | P1 |
| 31 | **Kindle** (via Readwise) | Via Readwise | Via Readwise | Low | P1 |
| 32 | **Anki** | Local / AnkiConnect | No | Medium | P3 |

### Weather and Environment

| # | Integration | API Type | OAuth | Complexity | Priority |
|---|-------------|----------|-------|------------|----------|
| 33 | **OpenWeather** | REST | API key | Very Low | P0 |
| 34 | **AirNow** (air quality) | REST | API key | Very Low | P1 |

---

## 4. Killer Features by Integration

For each major integration, these are not just "display the data" features -- they are intelligent, agent-powered capabilities that create genuine value through cross-service reasoning.

### Google Calendar

**Feature 1: Intelligent Day Architecture**
The AI analyzes your calendar patterns over weeks and builds a model of your ideal day structure -- when you do deep work, when you take meetings, when you need recovery time. When a new meeting invite arrives, it does not just show you a conflict; it tells you "this meeting would break your 3-hour deep work block on Thursday; here are 4 alternative times that preserve your focus pattern and work for all attendees." It can auto-respond with your preferred alternatives.

**Feature 2: Meeting Preparation Briefings**
Fifteen minutes before every meeting, Omakase assembles a briefing card: who you are meeting with (pulled from your contacts and recent communication), the relevant Notion docs or Linear issues, your last interaction with these people, and three suggested talking points based on context. For recurring meetings, it tracks what was discussed previously and flags any follow-ups that are still open.

**Feature 3: Time Audit Visualization**
A weekly "time garden" visualization -- a living organic chart (fitting the Japanese aesthetic) that shows where your time went. Categories bloom like flowers in proportion to hours spent. Deep work is a serene blue lotus. Meetings are cherry blossoms. Context switches are shown as fallen petals. Over time, you can see your garden change shape as your habits evolve. The agent provides weekly observations: "You spent 40% more time in meetings this week than your baseline. Your deep work blocks were interrupted 6 times. Shall I protect next week's focus time?"

### Notion

**Feature 1: Cross-Platform Task Unification**
Omakase maintains a unified task graph that spans Notion databases, Linear issues, Google Calendar action items, Gmail follow-ups, and Slack reminders. You see a single prioritized view of everything you need to do, regardless of where it originated. The agent identifies duplicates ("this Notion task and this Linear issue appear to describe the same work"), resolves conflicts ("Notion says this is low priority but Linear has it marked urgent -- which takes precedence?"), and tracks completion across systems.

**Feature 2: Knowledge Ripple Detection**
When a Notion document you care about is updated, the agent does not just notify you. It analyzes the change, explains its significance, and identifies ripple effects: "The product spec for v2.1 was updated -- the scope increased by 3 features. This may affect the Linear sprint you are planning. Two of your calendar meetings this week are now discussing outdated requirements. Shall I add a note to those meeting agendas?"

**Feature 3: Ambient Knowledge Surface**
A "reading table" widget that surfaces relevant Notion pages based on what you are currently doing. Working on a Linear issue? The related design doc, previous retrospective notes, and relevant API documentation float into view without being summoned. This is not search -- it is contextual awareness.

### Spotify

**Feature 1: Context-Aware Soundscaping**
Omakase knows what you are doing right now: deep coding session (from GitHub/Linear activity), taking a break (calendar gap), commuting (location), exercising (health data), winding down (time of day + sleep schedule). It automatically queues appropriate music. But it goes deeper than genre matching -- it learns your specific preferences over time. "You tend to listen to ambient electronic during morning code sessions but switch to lo-fi hip-hop after lunch. On days when you slept less than 7 hours, you prefer quieter tracks in the first hour." The transitions are smooth and never jarring.

**Feature 2: Focus Session Soundtrack**
When you initiate a focus session (tied to a specific task), Spotify becomes part of the ritual. The agent builds a playlist calibrated to the expected duration -- a gentle build-up in the first 15 minutes, a sustained plateau during peak focus, and a gradual wind-down as the session nears its end. If the session runs long, it seamlessly extends. If you finish early, it transitions to something celebratory. The focus music becomes a Pavlovian trigger for deep work.

**Feature 3: Listening Diary**
An aesthetic, scroll-based timeline that maps your listening history against your activities. "Wednesday 2pm: you were reviewing PRs and listening to Ryuichi Sakamoto. Your code review that session had a 94% accept rate -- your highest all week." Over months, this becomes a beautiful artifact of your life, a musical autobiography interleaved with what you were doing and how you were feeling.

### Gmail

**Feature 1: Intelligent Triage Agent**
Every morning, the agent pre-processes your inbox. Not just sorting -- understanding. It categorizes by urgency and context, drafts suggested replies for routine emails, flags anything that requires a decision, and identifies emails that are blocking tasks in other systems. "You have 3 emails requiring decisions, 7 that can be handled with one-line replies (drafts ready), and 12 that are informational. One email from Sarah contains a deliverable that is overdue in your Notion project tracker."

**Feature 2: Follow-Up Memory**
The agent tracks conversations that need follow-up. It understands the difference between "I'll get back to you" (you owe a response) and "let me know" (you are waiting). It surfaces these at the right time, with the full conversation context, so nothing falls through the cracks. "You told Alex you would send the proposal by Friday. It is Thursday afternoon and you have not drafted it yet. The relevant Notion doc is here."

### Oura Ring / Health Data

**Feature 1: Performance-Aware Scheduling**
The agent ingests your sleep, readiness, and recovery data and correlates it with your productivity patterns. On days when your readiness score is low, it suggests a lighter schedule: "Your HRV was 15% below baseline last night. Consider moving the architecture review to tomorrow and using this afternoon for lighter administrative tasks. I have identified 3 meetings that could be rescheduled without impact." This is not fitness tracking -- it is using biological signals to optimize cognitive output.

**Feature 2: Lifestyle Correlation Engine**
Over months, the agent identifies non-obvious correlations in your data. "When you have more than 3 evening meetings in a week, your sleep quality drops by 20% the following week. When you exercise before 10am, your deep work sessions in the afternoon are 35% longer. When you skip lunch (detected via calendar gaps and no food-related transactions), your code review rejection rate increases." These insights are surfaced gently, as observations rather than prescriptions.

**Feature 3: Morning Readiness Briefing**
Each morning, before the daily briefing, a gentle readiness assessment: your sleep score, how it compares to your baseline, your current energy trajectory based on patterns, and a suggestion for the day's structure. This sets the tone -- it says "today is a sprint day" or "today is a recovery day" before you even look at your calendar.

### Plaid / Finance

**Feature 1: Spending Awareness Without Anxiety**
Rather than the anxiety-inducing dashboards of traditional finance apps, Omakase presents financial data as a calm, ambient signal. A gentle breathing indicator that changes color based on your spending velocity relative to your budget. Green and slow: you are well within your means. Amber and moderate: approaching your typical spending pace. You never see a jarring red number unless you ask for detail. The agent provides weekly financial haiku -- yes, actual haiku format -- summarizing your spending. "Spring wind carries / three subscriptions renewed / garden needs tending."

**Feature 2: Subscription Sentinel**
The agent monitors recurring charges and alerts you to changes, services you have not used in 90 days, price increases, and free trial expirations approaching. "You have 23 active subscriptions totaling $487/month. 4 services have not been used in the past quarter. Shall I draft cancellation requests?"

### GitHub (Enhanced)

**Feature 1: Code Reputation Timeline**
Beyond the existing PR creation pipeline, visualize your development identity over time. A beautiful contribution river that shows not just commits but the quality and impact of your work: PRs that sparked significant discussion, code reviews that caught critical bugs, repositories where you are becoming a domain expert. The agent provides weekly developer reflections: "This week you focused primarily on infrastructure. Your review turnaround time improved by 2 hours. Three PRs you authored were merged without revision -- your cleanest week in two months."

**Feature 2: Dependency Weather Report**
The agent monitors your project dependencies and provides a "weather forecast" for your codebase: sunny (all green, no security advisories), partly cloudy (minor version updates available), stormy (critical security patches needed, breaking changes incoming). "A storm is approaching your main project: React 20 drops next week with 3 breaking changes that affect your codebase. The migration guide suggests 4 hours of work. Shall I create Linear issues?"

### Readwise / Reading

**Feature 1: Spaced Retrieval Surface**
Your reading highlights from Kindle, articles, and PDFs are not just stored -- they are actively resurfaced using spaced repetition principles. Each day, the dashboard shows 3-5 highlights from your reading history, selected based on relevance to your current work and optimal retrieval spacing. "You highlighted this passage about distributed systems 3 weeks ago. You are currently working on a microservices architecture ticket. Here is the context."

**Feature 2: Reading Velocity and Depth Tracking**
A serene visualization of your reading life: books in progress shown as growing bonsai trees, articles as flowing water. The agent identifies reading patterns: "You read technical content fastest on Tuesday mornings. You tend to abandon books around the 40% mark -- consider shorter reads. Your highlight density is highest in books about design patterns."

### Slack

**Feature 1: Conversation Intelligence**
The agent summarizes channels you care about, identifies messages that need your response, and provides context for conversations you missed. "While you were in your focus block, 3 conversations in #engineering mentioned topics related to your current Linear issue. Here is the relevant context. Two messages in #general are waiting for your input."

**Feature 2: Communication Load Balancer**
Track your communication patterns across Slack, email, and meetings. The agent identifies when you are over-communicating (spending more time talking about work than doing work) and suggests batching strategies. "You context-switched between Slack and your IDE 47 times yesterday. Consider checking Slack only at the top of each hour."

### Weather (OpenWeather)

**Feature 1: Contextual Weather Integration**
Weather is not a separate widget -- it is woven into everything. Calendar events show weather conditions ("your outdoor lunch meeting will be 72F and sunny"). Morning briefings incorporate weather into clothing and commute suggestions. The agent adjusts music recommendations based on weather (rainy days get different soundscapes). Focus session suggestions account for natural light conditions.

---

## 5. AI Agent Evolution

### Existing Agent Transformation

The current four agents -- Miso, Nori, Koji, and Toro -- retain their personalities and core competencies but expand their domains.

#### Miso (Architect) -- Evolves into the Life Architect
- **Color:** Gold (#fbbf24)
- **Original role:** Plans implementation approach for code features
- **Evolved role:** The strategic planner across all life domains. Miso analyzes patterns, identifies conflicts, and designs optimal structures for your time, energy, and attention.
- **New capabilities:**
  - Weekly life architecture reviews ("Your week has 3 structural problems: back-to-back meetings on Tuesday leave no transition time, your Thursday deep work block conflicts with a new recurring standup, and you have no recovery time after your Wednesday evening commitment")
  - Long-term goal decomposition ("Your goal to learn Japanese has not had scheduled time in 6 weeks. Here is a restructured plan that fits 3 sessions into your typical week pattern")
  - Cross-domain dependency mapping ("Your code review backlog is growing because your Thursday focus time keeps getting consumed by meetings. The root cause is that you accepted a recurring meeting 3 weeks ago")

#### Nori (Coder) -- Evolves into the Action Engine
- **Color:** Indigo (#818cf8)
- **Original role:** Implements code features at high speed
- **Evolved role:** The execution agent. Nori does not just write code -- she takes action across any connected service. She is the one who actually does things: sends emails, creates calendar events, updates Notion pages, adjusts Spotify playlists, creates shopping lists.
- **New capabilities:**
  - Multi-service task execution ("I have drafted the reply to Sarah's email, updated the project timeline in Notion, and moved the follow-up meeting to Thursday. Review and confirm?")
  - Rapid automation creation ("I noticed you do the same 5-step process every Monday morning. I have created an automation that handles steps 1, 2, and 4 automatically. Steps 3 and 5 need your judgment")
  - Smart action batching ("You have 7 pending micro-tasks across 4 services. I can execute all of them in one batch if you approve")

#### Koji (Reviewer) -- Evolves into the Quality Guardian
- **Color:** Beni red (#f87171)
- **Original role:** Reviews code for quality and correctness
- **Evolved role:** The quality-of-life reviewer. Koji monitors the health of your entire system -- not just code quality, but life quality. She reviews your commitments, your spending, your time allocation, and your energy patterns.
- **New capabilities:**
  - Commitment review ("You have accepted 4 new recurring obligations this month. Your available deep work time has decreased by 30%. Recommend declining or deferring 2 of these")
  - Decision quality tracking ("Three of your last 5 impulse purchases were returned or unused. Consider adding a 48-hour cooling period for purchases over $100")
  - Weekly life review facilitation (Koji guides you through a structured reflection: what went well, what drained you, what to adjust)

#### Toro (Tester) -- Evolves into the Chaos Anticipator
- **Color:** Jade (#6ee7b7)
- **Original role:** Tests code implementations for correctness
- **Evolved role:** The stress-tester for your plans and systems. Toro proactively identifies what could go wrong and builds resilience into your life infrastructure.
- **New capabilities:**
  - Schedule stress testing ("What happens if your 2pm meeting runs 30 minutes long? Your entire afternoon collapses. I have identified 2 buffer strategies")
  - Financial scenario modeling ("If your largest client pauses their contract, you have 4.2 months of runway at current spending. Here are 3 expense categories to optimize first")
  - Dependency failure analysis ("Your morning routine depends on 3 apps. If Notion is down, your daily planning breaks. Here is an offline fallback procedure")

### New Agent Personalities

#### Suki (Curator) -- The Knowledge and Taste Agent
- **Color:** Sakura pink (#f472b6) -- the primary brand color
- **Domain:** Reading, learning, media consumption, personal growth
- **Personality:** A quiet, deeply thoughtful librarian-type who speaks in considered paragraphs rather than short bursts. She uses the reading lamp emoji and has an encyclopedic memory. She says things like "this reminds me of something you read in March" and "your taste is evolving -- you have been gravitating toward more minimalist design lately." She treats your intellectual life as a garden she is tending.
- **Capabilities:**
  - Curates daily reading recommendations based on current projects and interests
  - Maintains your "knowledge graph" -- connections between things you have learned
  - Suggests books, articles, podcasts, and courses aligned with your goals
  - Tracks intellectual interests over time and identifies emerging passions

#### Kawa (Flow) -- The Wellness and Rhythm Agent
- **Color:** A new calming blue-teal (#38bdf8, the existing oma-info color)
- **Domain:** Health, sleep, energy, exercise, nutrition, mental state
- **Personality:** Warm, gentle, never judgmental. She speaks like a thoughtful yoga instructor -- calm, encouraging, body-aware. She uses water imagery ("your energy is flowing smoothly today" or "there is a dam building -- you need to release some tension"). She never guilt-trips about missed workouts or poor sleep. She reframes everything as information rather than failure.
- **Capabilities:**
  - Correlates health data with productivity and mood patterns
  - Suggests schedule adjustments based on energy levels
  - Guides breathing exercises and micro-breaks during intense work sessions
  - Tracks long-term health trends and celebrates sustained improvements

#### Kin (Finance) -- The Money Steward
- **Color:** A warm amber-brown, distinct from the existing gold (#d97706, the existing oma-gold-dim)
- **Domain:** Spending, budgets, subscriptions, investments, financial goals
- **Personality:** A calm, trustworthy accountant with a dry wit. He speaks in precise, reassuring language. He never panics about spending -- he contextualizes it. He uses the balance scale imagery and has a habit of finding the silver lining in financial data. "You overspent on dining this month, but your grocery spending was down proportionally -- your total food budget is actually on track." He treats money as a tool for living well, not a score to optimize.
- **Capabilities:**
  - Daily spending awareness without anxiety
  - Subscription management and optimization
  - Financial goal tracking with visual progress
  - Tax-relevant transaction flagging

### Agent Interaction Model

Agents do not work in isolation. They form a **council** that convenes for complex decisions:

- **Morning Council:** Each agent provides their domain briefing. Miso synthesizes it into a coherent daily plan. Disagreements are surfaced transparently ("Kawa suggests a lighter day based on your sleep score, but Miso notes you have a deadline. Here is a compromise schedule").

- **Decision Support:** When you face a decision that spans domains, the relevant agents weigh in from their perspectives. "Should I accept this conference invitation?" triggers Miso (schedule impact), Kin (travel cost), Kawa (energy impact of travel), and Suki (learning value of the conference).

- **Agent Memory:** All agents share a common memory layer but maintain their own perspective. Nori remembers that you prefer to batch email responses. Koji remembers that you regret decisions made after 9pm. Kawa remembers that your back acts up after long flights. These memories are surfaced when relevant, creating a sense of continuous care.

---

## 6. Unified Dashboard Concepts

### The Home View: "Engawa" (Veranda)

Named after the Japanese architectural element -- the covered outdoor corridor between interior and garden -- the home view is the transitional space between your inner focus and the outer world of commitments.

#### Layout Structure

```
+----------------------------------------------------------+
|  [Time/Date]              [Weather]        [Readiness: 82]|
|                                                           |
|  Good morning.                                            |
|  You have a focused day ahead.                            |
|                                                           |
|  +------------------+  +-------------------------------+  |
|  |                  |  |                               |  |
|  |   TIME RIVER     |  |     ACTIVE CONTEXT            |  |
|  |                  |  |                               |  |
|  |  8:00  Deep work |  |  Currently: Deep work session |  |
|  |  ~~~~~~~~~~~~~~~  |  |  Task: API rate limiter       |  |
|  |  10:00 Standup   |  |  Music: Ambient Focus Mix     |  |
|  |  ~~~~~~~~~~~~~~~  |  |  Energy: High (declining)     |  |
|  |  10:30 Open      |  |  Next: Standup in 47min       |  |
|  |  ~~~~~~~~~~~~~~~  |  |                               |  |
|  |  12:00 Lunch     |  +-------------------------------+  |
|  |  ~~~~~~~~~~~~~~~  |                                    |
|  |  13:00 Reviews   |  +-------------------------------+  |
|  |  ~~~~~~~~~~~~~~~  |  |                               |  |
|  |  15:00 Open      |  |     AGENT WHISPERS             |  |
|  |                  |  |                               |  |
|  +------------------+  |  Miso: Your afternoon has a    |  |
|                         |  30-min gap that could fit the |  |
|  +------------------+  |  proposal review.              |  |
|  |                  |  |                               |  |
|  |  SPOTIFY         |  |  Koji: 3 PRs need your review |  |
|  |  Now Playing     |  |  before the Friday cutoff.     |  |
|  |  [Album Art]     |  |                               |  |
|  |                  |  |  Kawa: Great sleep last night. |  |
|  +------------------+  |  Good day for challenging work.|  |
|                         |                               |  |
|                         +-------------------------------+  |
+----------------------------------------------------------+
```

#### Key Dashboard Elements

**1. The Time River**
A vertical flowing timeline that represents your day. Unlike a traditional calendar grid, the river flows continuously, with events appearing as stones in the stream. The current moment is always visible, and the river gently animates to show time passing. Gaps between events are visible as calm water -- representing your available time. The width of the river narrows when you are in a dense period and widens when you have space.

**2. Active Context Card**
The largest, most prominent element. Shows what you are (or should be) doing right now, with all relevant context pulled from connected services. During a focus session: the task, the relevant branch, the current playlist, your energy level. During a meeting: the attendees, the agenda, relevant docs. During a break: a gentle suggestion for how to use the time.

**3. Agent Whispers**
A quiet sidebar where agents surface observations and suggestions. These are not notifications -- they are ambient intelligence. They appear gently, they do not demand attention, and they scroll away after a time if unacknowledged. Each whisper is color-coded to its agent. Critical observations pin themselves until dismissed.

**4. Ambient Indicators**
Subtle, always-visible signals woven into the background:
- **Weather gradient** -- the background tint shifts subtly with outdoor conditions
- **Energy arc** -- a thin arc at the top of the screen that shows your predicted energy curve for the day, with the current position highlighted
- **Inbox pressure** -- a barely-visible pulse in the corner that increases frequency as unread communications accumulate
- **Sprint progress** -- for development contexts, a thin progress bar showing current sprint completion

### Weekly Command View: "Karesansui" (Rock Garden)

The weekly view is a bird's-eye perspective, named after the Japanese dry landscape gardens that represent vast landscapes in miniature.

```
+----------------------------------------------------------+
|  Week of February 16, 2026                                |
|                                                           |
|  [Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]              |
|                                                           |
|  +----+----+----+----+----+----+----+                    |
|  | 70%| 85%| 60%| 90%| 45%|    |    |  <- capacity fill |
|  |    |    |    |    |    |    |    |                    |
|  | 3  | 1  | 4  | 2  | 5  | 0  | 0  |  <- meetings     |
|  | 4h | 6h | 2h | 5h | 1h | -- | -- |  <- deep work    |
|  +----+----+----+----+----+----+----+                    |
|                                                           |
|  WEEK THEMES                        AGENT COUNCIL NOTES   |
|  [Development Sprint] [Client Week] [Miso: Thursday is   |
|  [Health: 3 workouts planned]        your best day for    |
|  [Finance: Rent + 2 subscriptions]   the architecture     |
|  [Learning: 0 sessions planned]      review. Protect it.] |
|                                                           |
|  OPEN COMMITMENTS (across all services)                   |
|  [ ] Proposal draft (Notion) -- due Wed                   |
|  [ ] Code review x3 (GitHub) -- before Fri                |
|  [ ] Reply to Sarah (Gmail) -- overdue                    |
|  [ ] Schedule dentist (no service) -- this week           |
+----------------------------------------------------------+
```

### Cross-Service Search: "Tanken" (Exploration)

A unified search that spans all connected services. When you search for "Project Alpha," you see:
- The Notion workspace page
- Related Linear issues
- Calendar events mentioning it
- Email threads about it
- Slack conversations referencing it
- GitHub repositories and PRs
- Even Spotify playlists you listened to while working on it

Results are grouped by relevance and recency, with the agent providing synthesis: "Project Alpha has 3 open blockers in Linear, a meeting scheduled for Thursday, and an email from the client asking for a status update that is 2 days old."

### Notification Intelligence: "Shizuka" (Quietude)

Omakase does not forward notifications. It absorbs them, processes them, and presents them intelligently:

- **Immediate:** Only truly urgent items interrupt you (configurable). A DM from your boss mentioning "urgent." A calendar reminder for a meeting starting now. A deployment failure.
- **Batched:** Everything else is collected and presented at natural transition points -- when a focus session ends, when you return from a meeting, when you pick up your phone after a break.
- **Summarized:** At the end of each day, a digest of everything that happened across all services. Not a list of raw notifications, but a narrative: "Your day in review: You completed 3 of 5 planned tasks. Two PRs were merged. You received 34 emails and responded to 12. Tomorrow's first meeting is at 9am."
- **Silenced with awareness:** During focus time, notifications are held but the agent tracks anything that might be time-sensitive. If something cannot wait, it breaks through with a gentle explanation of why.

---

## 7. Monetization and Growth

### Path from Personal Tool to Product

#### Phase 1: Personal Utility (Months 1-6)
Build it for yourself. Use it daily. Feel the friction points. This is the "eat your own cooking" phase. No monetization, no users. Just a tool that makes your life measurably better.

**Success metric:** You open Omakase before any other app every morning.

#### Phase 2: Curated Early Access (Months 6-12)
Invite 20-50 people who fit the ideal user profile: technical, multi-app, values aesthetics, and is willing to connect services. These are not beta testers -- they are co-creators. Their feedback shapes the product.

**Success metric:** 80%+ daily active rate among early access users.

#### Phase 3: Public Launch (Months 12-18)
Launch with a waitlist and a strong visual identity. The Liquid Glass aesthetic is a differentiator -- lean into it. Launch content should emphasize the calm, the beauty, and the intelligence. Not "connect 30 apps" but "finally, peace of mind."

### Pricing Strategy

#### Free Tier: "Ichigo" (Strawberry -- a single taste)
- Up to 3 integrations
- Basic daily briefing
- No agent intelligence (manual dashboard only)
- Single user

#### Pro Tier: "Omakase" -- $19/month
- Unlimited integrations
- Full AI agent suite (all 7 agents)
- Agent council and cross-service reasoning
- Morning and evening briefings
- Focus sessions with Spotify integration
- Weekly reviews and life architecture
- Priority API rate limits

#### Premium Tier: "Kaiseki" (Multi-course) -- $39/month
- Everything in Pro
- Financial intelligence (Plaid integration)
- Health correlation engine
- Custom agent personalities
- API access for personal automations
- Priority support

### Growth Levers

**1. Aesthetic Virality**
The Liquid Glass design system is genuinely beautiful. Screenshots and screen recordings of Omakase should make people want it immediately. Invest in a public style system page, a design blog, and shareable "life dashboard" snapshots (with privacy controls).

**2. Template Gallery**
Pre-built dashboard configurations for different lifestyles: "The Developer," "The Creative," "The Executive," "The Student," "The Freelancer." Each comes with recommended integrations, agent configurations, and dashboard layouts. Users can customize from these starting points.

**3. Agent Personality Marketplace**
Allow users to create and share custom agent personalities. "The Stoic Coach" (an agent that frames everything through Stoic philosophy). "The Marie Kondo" (an agent focused on decluttering your commitments). "The Warren Buffett" (a financial agent that emphasizes long-term thinking). This creates community and content.

**4. Weekly Life Snapshot**
An automatically generated, beautifully designed weekly summary that users can share (opt-in, privacy-controlled). Think Spotify Wrapped, but for your entire life, every week. "This week: 23 hours of deep work, 4 books started, 12 meals cooked, 8,400 steps/day average, 3 PRs merged." The visual design makes sharing irresistible.

**5. Integration Partners**
As the platform grows, approach service providers (Notion, Linear, Spotify) about featured integration status. These partnerships provide distribution and credibility.

### Market Sizing

| Segment | TAM | SAM | SOM (Year 1) |
|---------|-----|-----|---------------|
| Knowledge workers using 5+ SaaS tools | ~200M globally | ~30M (English-speaking, tech-forward) | 10,000 users |
| Developers with personal productivity interest | ~30M | ~5M | 5,000 users |
| Quantified self / life optimization community | ~10M | ~3M | 3,000 users |

**Year 1 revenue target:** 5,000 Pro subscribers = $95,000 MRR = $1.14M ARR

---

## 8. Technical Architecture

### Integration Platform Architecture

```
+------------------------------------------------------------------+
|                        OMAKASE FRONTEND                           |
|                    (Next.js 15 / React 19)                        |
|                                                                    |
|   +------------------+  +------------------+  +----------------+  |
|   | Dashboard Views  |  | Agent Chat UI    |  | Settings/Auth  |  |
|   +------------------+  +------------------+  +----------------+  |
+------------------------------------------------------------------+
          |                        |                      |
          v                        v                      v
+------------------------------------------------------------------+
|                     OMAKASE ORCHESTRATOR                           |
|                    (Elysia / Bun on ECS)                          |
|                                                                    |
|   +------------------+  +------------------+  +----------------+  |
|   | Integration      |  | Agent Engine     |  | Event          |  |
|   | Gateway          |  | (Pipeline +      |  | Processor      |  |
|   | (OAuth + Sync)   |  |  Reasoning)      |  | (Webhooks)     |  |
|   +------------------+  +------------------+  +----------------+  |
|            |                     |                      |          |
|   +------------------+  +------------------+  +----------------+  |
|   | Token Vault      |  | Context Builder  |  | Notification   |  |
|   | (Secrets Mgr)    |  | (Cross-service)  |  | Intelligence   |  |
|   +------------------+  +------------------+  +----------------+  |
+------------------------------------------------------------------+
          |                        |                      |
          v                        v                      v
+------------------------------------------------------------------+
|                       DATA LAYER                                  |
|                                                                    |
|   +------------------+  +------------------+  +----------------+  |
|   | DynamoDB         |  | ElastiCache      |  | S3             |  |
|   | (Core data +     |  | (Real-time       |  | (Snapshots +   |  |
|   |  integration     |  |  state +         |  |  exports +     |  |
|   |  state)          |  |  caching)        |  |  media cache)  |  |
|   +------------------+  +------------------+  +----------------+  |
+------------------------------------------------------------------+
          |
          v
+------------------------------------------------------------------+
|                   EXTERNAL SERVICES                               |
|                                                                    |
|  [Google] [Notion] [Spotify] [GitHub] [Linear] [Oura] [Plaid]   |
|  [Slack]  [Gmail]  [Weather] [Maps]   [Readwise] [Hue] [...]    |
+------------------------------------------------------------------+
```

### Integration Gateway Design

Each integration follows a common pattern:

```typescript
// packages/integrations/src/types.ts

interface IntegrationProvider {
  /** Unique identifier */
  id: string;
  /** Display name for UI */
  name: string;
  /** Integration category */
  category: IntegrationCategory;
  /** OAuth configuration (if applicable) */
  oauth?: OAuthConfig;
  /** Webhook configuration (if applicable) */
  webhook?: WebhookConfig;
  /** Polling configuration (if no webhooks) */
  polling?: PollingConfig;
  /** Data sync handler */
  sync: SyncHandler;
  /** Event normalizer -- converts service-specific events to Omakase events */
  normalize: EventNormalizer;
}

interface OAuthConfig {
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  refreshable: boolean;
}

interface SyncHandler {
  /** Full sync -- pull all relevant data */
  fullSync: (tokens: TokenSet) => Promise<SyncResult>;
  /** Incremental sync -- pull changes since last sync */
  incrementalSync: (tokens: TokenSet, since: Date) => Promise<SyncResult>;
  /** Process incoming webhook event */
  handleWebhook?: (payload: unknown) => Promise<SyncResult>;
}

type IntegrationCategory =
  | "productivity"
  | "communication"
  | "development"
  | "health"
  | "finance"
  | "media"
  | "smart_home"
  | "travel"
  | "learning"
  | "environment";
```

### OAuth Token Management

All OAuth tokens are stored in AWS Secrets Manager (extending the existing pattern). The orchestrator manages token refresh cycles:

```typescript
// packages/integrations/src/token-vault.ts

interface TokenVault {
  /** Store tokens for a user+service combination */
  storeTokens(userId: string, serviceId: string, tokens: TokenSet): Promise<void>;
  /** Retrieve tokens, auto-refreshing if expired */
  getTokens(userId: string, serviceId: string): Promise<TokenSet>;
  /** Revoke tokens and clean up */
  revokeTokens(userId: string, serviceId: string): Promise<void>;
  /** List all connected services for a user */
  listConnections(userId: string): Promise<ServiceConnection[]>;
}
```

### Event Normalization

All external events are normalized into a common format for cross-service reasoning:

```typescript
// packages/integrations/src/events.ts

interface OmakaseEvent {
  id: string;
  /** Source service */
  source: string;
  /** Normalized event type */
  type: EventType;
  /** When this event occurred */
  timestamp: Date;
  /** Human-readable summary */
  summary: string;
  /** Structured data (service-specific, but typed) */
  data: Record<string, unknown>;
  /** Related entities in other services */
  relations: EventRelation[];
  /** Relevance score (computed by agent engine) */
  relevance?: number;
}

type EventType =
  | "calendar.event_created"
  | "calendar.event_updated"
  | "calendar.event_deleted"
  | "task.created"
  | "task.completed"
  | "task.updated"
  | "message.received"
  | "message.sent"
  | "code.pr_opened"
  | "code.pr_merged"
  | "code.commit"
  | "health.sleep_logged"
  | "health.workout_logged"
  | "finance.transaction"
  | "media.track_played"
  | "media.article_read"
  | "environment.weather_changed";
```

### Context Builder

The cross-service reasoning engine that agents use to understand what is happening:

```typescript
// packages/integrations/src/context.ts

interface ContextBuilder {
  /** Build context for the current moment */
  buildCurrentContext(userId: string): Promise<LifeContext>;
  /** Build context for a specific time range */
  buildTimeContext(userId: string, start: Date, end: Date): Promise<LifeContext>;
  /** Build context around a specific entity */
  buildEntityContext(userId: string, entityRef: EntityRef): Promise<LifeContext>;
}

interface LifeContext {
  /** Current time and environment */
  temporal: {
    time: Date;
    dayOfWeek: string;
    timeOfDay: "morning" | "afternoon" | "evening" | "night";
    weather?: WeatherData;
  };
  /** Current and upcoming calendar events */
  calendar: {
    current?: CalendarEvent;
    next?: CalendarEvent;
    todayRemaining: CalendarEvent[];
  };
  /** Active tasks across all services */
  tasks: {
    inProgress: UnifiedTask[];
    dueToday: UnifiedTask[];
    overdue: UnifiedTask[];
  };
  /** Health and energy state */
  wellness: {
    sleepScore?: number;
    readinessScore?: number;
    energyPrediction?: EnergyLevel;
    lastExercise?: Date;
  };
  /** Communication state */
  communication: {
    unreadCount: number;
    urgentMessages: UnifiedMessage[];
    pendingFollowUps: FollowUp[];
  };
  /** Currently playing media */
  media: {
    nowPlaying?: SpotifyTrack;
    recentListening: ListeningSession[];
  };
  /** Financial signals */
  finance: {
    dailySpendingVelocity?: "low" | "normal" | "high";
    upcomingBills: Bill[];
  };
}
```

### Real-Time Architecture

For services that support it, use WebSocket connections and webhooks for real-time updates. For others, intelligent polling with backoff:

```typescript
// Sync strategy per integration
const SYNC_STRATEGIES = {
  "google-calendar": { primary: "webhook", fallback: "poll", interval: 60_000 },
  "notion":          { primary: "webhook", fallback: "poll", interval: 120_000 },
  "spotify":         { primary: "poll",    interval: 10_000 }, // No webhooks for playback
  "github":          { primary: "webhook", fallback: "poll", interval: 300_000 },
  "linear":          { primary: "webhook", fallback: "poll", interval: 30_000 },
  "gmail":           { primary: "push",    fallback: "poll", interval: 60_000 },
  "slack":           { primary: "events",  fallback: "poll", interval: 30_000 },
  "oura":            { primary: "poll",    interval: 3_600_000 }, // Hourly
  "openweather":     { primary: "poll",    interval: 1_800_000 }, // 30 min
  "plaid":           { primary: "webhook", fallback: "poll", interval: 86_400_000 }, // Daily
};
```

### DynamoDB Table Extensions

New tables needed for the integration platform:

| Table | Partition Key | Sort Key | Purpose |
|-------|--------------|----------|---------|
| `integrations` | `userId` | `serviceId` | Connection state, last sync time, config |
| `events` | `userId` | `timestamp#eventId` | Normalized event stream |
| `context_cache` | `userId` | `contextType#timestamp` | Cached context computations |
| `agent_memories` | Already exists | Already exists | Extend with life-domain memories |
| `briefings` | `userId` | `date#type` | Generated briefings (morning/evening/weekly) |
| `preferences` | `userId` | `domain#key` | User preferences learned over time |

---

## 9. Prioritized Roadmap

### Phase 1: Foundation and Quick Wins (Months 1-3)

**Theme: "First Light" -- The dashboard comes alive**

**Goal:** Transform the existing project dashboard into a personal home view with 3-4 high-impact integrations that demonstrate the vision.

| Week | Deliverable | Details |
|------|-------------|---------|
| 1-2 | Integration gateway scaffold | OAuth flow framework, token vault, event normalization layer |
| 2-3 | Google Calendar integration | OAuth connect, event sync, display in Time River view |
| 3-4 | Home view ("Engawa") | Replace project-centric home with life-centric dashboard |
| 4-5 | Weather integration | OpenWeather API, ambient background weather, calendar weather |
| 5-6 | Spotify integration | OAuth connect, now-playing widget, basic playback controls |
| 7-8 | Notion integration | OAuth connect, task sync, recent docs surface |
| 9-10 | Morning briefing v1 | Agent-generated daily briefing from all connected sources |
| 11-12 | Cross-service search v1 | Unified search across Calendar, Notion, Linear, GitHub |

**Key technical milestones:**
- Integration provider interface finalized
- OAuth flow working for Google, Spotify, Notion
- Event normalization pipeline operational
- Time River component built
- Agent briefing pipeline (extend existing agent pipeline)

**Success criteria:**
- You open Omakase every morning as your first app
- Calendar, Spotify, and Notion feel natively integrated
- Morning briefing provides genuine value at least 4 out of 5 days

### Phase 2: Core Experience (Months 4-6)

**Theme: "Wa" (Harmony) -- Services start talking to each other**

**Goal:** Cross-service intelligence. The integrations stop being silos and start being a unified understanding of your life.

| Week | Deliverable | Details |
|------|-------------|---------|
| 13-14 | Gmail integration | OAuth, inbox triage, follow-up tracking |
| 14-15 | Slack integration | OAuth, channel summaries, message batching |
| 16-17 | Context Builder v1 | Cross-service context assembly for agent reasoning |
| 18-19 | Agent Whispers UI | Sidebar with contextual agent observations |
| 20-21 | Readwise integration | API key, highlight sync, spaced retrieval |
| 22-23 | Unified task view | Tasks from Notion + Linear + Gmail + Calendar in one view |
| 24 | Weekly Command View | "Karesansui" weekly overview with capacity planning |

**Key technical milestones:**
- Context Builder assembling multi-service context
- Agent reasoning pipeline consuming context
- Real-time event processing for webhooks
- Notification intelligence system (batch, summarize, prioritize)

**Success criteria:**
- Agents make cross-service observations that surprise you with their relevance
- You stop checking Gmail and Slack directly for routine items
- Weekly review provides insights you would not have discovered manually

### Phase 3: AI-Powered Magic (Months 7-10)

**Theme: "Satori" (Enlightenment) -- The agents become truly intelligent**

**Goal:** Deep agent intelligence, health integration, proactive life management.

| Week | Deliverable | Details |
|------|-------------|---------|
| 25-27 | Miso evolution: Life Architect | Weekly life architecture reviews, goal tracking |
| 28-29 | Oura Ring integration | Health data sync, readiness-aware scheduling |
| 30-31 | Kawa agent: Wellness | Energy correlation, performance-aware suggestions |
| 32-33 | Focus sessions v2 | Spotify-integrated, timer-based, with context switching |
| 34-35 | Suki agent: Curator | Knowledge graph, reading recommendations |
| 36-37 | Nori evolution: Action Engine | Multi-service task execution, automation creation |
| 38-40 | Decision support council | Multi-agent deliberation for complex decisions |

**Key technical milestones:**
- Agent personality system extended for new agents
- Health data correlation engine
- Multi-agent conversation pipeline
- Automation execution framework (agents taking actions across services)

**Success criteria:**
- Health-aware scheduling measurably improves your energy management
- Agent council provides decision support you actively seek out
- Automation saves at least 2 hours per week of routine tasks

### Phase 4: Polish, Community, and Growth (Months 11-14)

**Theme: "Matsuri" (Festival) -- Share the experience**

**Goal:** Product-market fit, public launch, community building.

| Week | Deliverable | Details |
|------|-------------|---------|
| 41-43 | Financial integration (Plaid) | Bank account sync, spending awareness, Kin agent |
| 44-45 | Smart home integration | Home Assistant / Hue for ambient environment |
| 46-47 | Weekly Life Snapshot | Shareable, beautifully designed weekly summary |
| 48-49 | Template gallery | Pre-built configurations for different lifestyles |
| 50-51 | Agent personality marketplace | Custom agent creation and sharing |
| 52-54 | Public launch | Waitlist conversion, marketing, onboarding flow |
| 55-56 | Mobile companion | PWA or React Native app for on-the-go access |

**Key technical milestones:**
- Plaid integration with PCI-compliant token handling
- Shareable snapshot generation (image export with privacy controls)
- Template system (dashboard layout + integration config + agent config)
- Onboarding wizard for new users
- Mobile-responsive dashboard or dedicated app

**Success criteria:**
- 1,000+ waitlist signups before public launch
- 50%+ day-1 retention for new users
- Net Promoter Score above 50 among early access users
- At least 3 integration partners expressing interest

---

## Appendix: Design Language Extensions

### New Color Tokens for Life Domains

The existing palette needs subtle extensions for new domains while maintaining harmony:

| Domain | Token | Color | Rationale |
|--------|-------|-------|-----------|
| Calendar/Time | `oma-time` | `#38bdf8` (sky blue) | Time feels like sky -- expansive, always present |
| Health | `oma-health` | `#2dd4bf` (teal) | Between jade and blue -- calming, organic |
| Finance | `oma-finance` | `#a3a3a3` (neutral silver) | Money should feel neutral, not exciting |
| Reading | `oma-reading` | `#c084fc` (soft purple) | Intellectual, contemplative |
| Music | `oma-music` | `#f472b6` (sakura) | Shares primary brand color -- music is emotion |
| Weather | `oma-weather` | Dynamic | Changes with conditions -- unique among tokens |
| Email | `oma-email` | `#fbbf24` (gold) | Urgent, warm, attention-seeking |

### New Component Patterns

**Glass River (Time River component)**
A vertical scrolling timeline with glass-surface event cards floating in a translucent stream. The stream has a subtle animated gradient that moves downward, creating the illusion of flowing time.

**Breathing Indicator**
A circular element that pulses with `animate-oma-breathe` at a rate determined by data -- faster for higher urgency, slower for calm states. Used for inbox pressure, spending velocity, and energy levels.

**Agent Whisper Card**
A compact glass card with a colored left border matching the agent's color. Contains a small agent avatar, a one-to-two sentence observation, and optional action buttons. Appears with `animate-oma-fade-up` and auto-dismisses after 30 seconds if not interacted with.

**Ambient Background Mesh**
Extend the existing gradient blob background to respond to live data. Weather affects the color temperature. Time of day shifts the overall brightness. Music genre subtly influences the animation speed of the blobs.

### Typography Extensions

For the briefing and narrative content that agents generate, introduce a **reading mode** typographic style:

- Body text at `text-lg` with `leading-relaxed` for comfortable reading
- Agent quotes in `font-serif italic` to distinguish agent voice from UI text
- Data callouts in `font-mono text-sm` for precision
- Section dividers using the existing wave pattern `oma-wave-pattern`

---

## Final Thoughts

The transformation from autonomous development platform to personal life navigation hub is not as large a leap as it seems. The core infrastructure -- agent pipelines, real-time data sync, beautiful dashboard, OAuth integration patterns -- already exists. The philosophical foundation -- "I'll leave it to you" -- is even more powerful when applied to life navigation than to code generation.

The key insight is that Omakase should not try to replace any single app. Gmail will always be better at email. Spotify will always be better at music. Notion will always be better at documents. Omakase's role is to be the **connective tissue** -- the intelligence layer that understands how all these services relate to each other and to you. It is the conductor, not the orchestra.

The calm, Japanese-inspired aesthetic is not just a style choice -- it is a product strategy. In a world of overwhelming dashboards, aggressive notifications, and attention-stealing interfaces, Omakase offers something radical: **peace of mind with full awareness**. You know everything you need to know, you see nothing you do not need to see, and you trust that someone -- something -- is watching the rest.

Omakase. I'll leave it to you.
