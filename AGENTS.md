# Agent Configuration

This file configures AI agent behavior for the Family Workout App.

## MCP Server Usage

Always use the following MCP servers proactively without being explicitly asked:

### OpenAI Developer Docs (`openaiDeveloperDocs`)
Use for any OpenAI API, Vercel AI SDK, prompt engineering, or AI-related work.
- Chat Completions API
- Function calling / tool use
- Streaming patterns
- Model capabilities

### Neon Database (`user-Neon`)
Use for any database operations, schema questions, or query optimization.
- `run_sql` - Execute queries
- `describe_table_schema` - Inspect tables
- `explain_sql_statement` - Optimize queries
- `create_branch` - Safe testing environments

### Context7 (`plugin-context7-context7`)
Use for up-to-date documentation on any library in the project:
- Next.js, React, NextAuth
- Drizzle ORM
- Tailwind CSS, Radix UI, Framer Motion
- Vitest, Playwright
- Zod, date-fns, and more

**Usage pattern:**
1. `resolve-library-id` to find the library
2. `query-docs` to search for specific topics

### Greptile (`plugin-greptile-greptile`)
Use for automated code review and codebase search.
- `trigger_code_review` - Get AI-powered review
- `search_greptile_comments` - Find past feedback

### Playwright (`plugin-playwright-playwright`)
Use for E2E testing and browser automation.
- Full browser control for testing
- Screenshot and snapshot capture
- Network request monitoring

### Browser (`cursor-ide-browser`)
Use for visual verification and UI testing.
- Navigate and interact with pages
- Test responsive layouts
- Verify user flows

## Custom Subagents

This project has specialized subagents in `.cursor/agents/`:

| Agent | Domain | Key MCPs |
|-------|--------|----------|
| `fitness-expert` | Exercise science, workouts | Neon, Context7 |
| `drizzle-database` | Database, migrations | Neon, Context7 |
| `ai-prompt-engineer` | OpenAI, prompts | OpenAI Docs, Context7 |
| `nextjs-expert` | Next.js, React | Context7, Browser |
| `test-architect` | Testing | Playwright, Context7 |
| `ui-components` | UI, styling | Context7, Browser |
| `data-seeder` | Seed scripts | Neon, Context7 |
| `semantic-layer` | AI context YAML | Neon, OpenAI Docs |
| `ux-designer` | User experience | Browser, Playwright |
| `security-reviewer` | Security | Neon, Greptile |
| `api-designer` | REST APIs | Neon, Context7 |
| `code-reviewer` | Code quality | Greptile, Context7 |

## Best Practices

1. **Check docs before implementing** - Use Context7 to verify API patterns
2. **Inspect schema before database changes** - Use Neon MCP to see current state
3. **Test in browser** - Use Browser/Playwright MCP to verify UI changes
4. **Review code** - Use Greptile for automated review on PRs

## Project Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4, Radix UI, Framer Motion
- **Backend**: Next.js API Routes, Drizzle ORM
- **Database**: Neon (Serverless Postgres)
- **AI**: Vercel AI SDK, OpenAI
- **Auth**: NextAuth v5
- **Testing**: Vitest, Playwright
