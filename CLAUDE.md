# Repcir App

## Project Identity
- **Name**: Repcir App (accountability fitness app)
- **Company**: Quiet Victory Labs
- **Role**: Main product application
- **Port**: 3000 (local dev)

## Quiet Victory Labs Ecosystem

| Project | Port | Path | Stack | Role |
|---------|------|------|-------|------|
| Repcir App | 3000 | /Users/erickittelson/code/repcir-app | Next.js 16.1.6, Drizzle, Neon, AI SDK | Main product |
| Repcir Marketing | 3001 | /Users/erickittelson/code/repcir-marketing | Next.js 16.1.6, PostHog, Resend | Marketing/landing site |
| Quiet Victory Labs | 3002 | /Users/erickittelson/code/quiet-victory-labs | Next.js 16.1.6, Resend | Company portfolio |

**Shared infrastructure**: Sentry (org: `quiet-victory-labs`), Vercel, GitHub (`erickittelson`), Resend

## Tech Stack (Pinned Versions)
- **Next.js 16.1.6** (App Router, latest 2026) - always use this version
- React 19, TypeScript 5
- Drizzle ORM 0.45+ with Neon serverless Postgres
- NextAuth v5 (beta.30)
- Vercel AI SDK v6 + @ai-sdk/openai v3
- Tailwind CSS 4 + Radix UI + Framer Motion
- Vitest 4 + Playwright 1.57
- Inngest for background jobs
- Stripe for payments
- Resend for email
- PostHog for analytics
- Sentry 10 for error tracking

## AI Implementation Rules
1. **Always consult the OpenAI developer documentation MCP server** (`mcp__openaiDeveloperDocs__*` tools) before implementing or modifying any code that uses the OpenAI API, Vercel AI SDK, or related AI features. Search the docs first to verify correct request schemas, model parameters, tool definitions, and structured output formats. Do not rely on cached knowledge — always check the latest docs.
2. **GPT-5.2 is a real model** — the app uses `gpt-5.2`, `gpt-5.2-pro`, and `gpt-5.2-chat-latest`. Never question their existence.

## Key Conventions
- `"use client"` only where interactivity is needed
- Client components in `*-client.tsx` files
- Route groups: `(dashboard)`, `(tabs)`
- API routes follow REST conventions with Zod validation
- Auth: always check session via `auth()` from `@/lib/auth`
- Database schema: `src/lib/db/schema.ts`
- Semantic layer: `semantic/` directory (YAML)
- Scripts: `scripts/` directory

## Sentry Configuration
- **Org slug**: `quiet-victory-labs` (NOT `quiet-victory-labs-zk`)
- **Region URL**: `https://us.sentry.io` (ALWAYS pass as `regionUrl` param)
- **Project slug**: `repcir` (main app) | `qvl` (QVL site) | `rep-cir` (unused)
- **MCP tool prefix**: `mcp__plugin_sentry_sentry__` (use plugin server)
- **DSN env var**: `NEXT_PUBLIC_SENTRY_DSN`
- Avoid OR/AND in MCP `naturalLanguageQuery` — Sentry doesn't support boolean operators
- If MCP returns 401/403, run `/mcp` to re-authenticate

## Key Commands
- `npm run dev` - Start dev server (port 3000)
- `npm run build` - Build (runs semantic:compile first)
- `npm run test:run` - Vitest single run
- `npm run test:e2e` - Playwright E2E tests
- `npm run test:api` - API integration tests
- `npm run db:generate` - Generate Drizzle migrations
- `npm run db:push` - Push schema to Neon
- `npm run db:studio` - Open Drizzle Studio
- `npm run semantic:compile` - Compile semantic layer

## Available MCP Servers
- **Neon** (`mcp__Neon__*`) - Database management, branching, SQL
- **Sentry** (`mcp__plugin_sentry_sentry__*`) - Error tracking, issue search, triage
- **Vercel** (`mcp__vercel__*`) - Deployments, logs, project management
- **OpenAI Docs** (`mcp__openaiDeveloperDocs__*`) - AI API documentation
- **Playwright** (`mcp__plugin_playwright_playwright__*`) - Browser automation
- **Context7** (`mcp__plugin_context7_context7__*`) - Library documentation
- **Greptile** (`mcp__plugin_greptile_greptile__*`) - Code review, PR analysis

## Agent Ecosystem
Agents in `.claude/agents/` are organized into two tiers:
- **Domain Specialists** (18): fitness-expert, nextjs-expert, drizzle-database, ui-components, api-designer, code-reviewer, test-architect, security-reviewer, ai-prompt-engineer, ux-designer, data-seeder, semantic-layer, product-manager, growth-marketing, content-strategist, brand-strategist, ios-store-expert, android-store-expert
- **Operations Agents** (8): ecosystem-architect, sentry-ops, vercel-ops, github-ops, neon-ops, posthog-ops, qa-coordinator, docs-librarian

Operations agents are ecosystem-aware and can reference all 3 projects.
