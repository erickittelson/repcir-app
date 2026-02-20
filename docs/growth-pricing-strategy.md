# Repcir Growth & Pricing Strategy

**Date:** February 2026
**Status:** Ready for implementation
**Codebase context:** Next.js app with Stripe billing, PostHog analytics, Neon Auth, circle-based architecture, AI coaching via GPT-5.2

---

## Table of Contents

1. [Pricing Architecture (5 Tiers)](#1-pricing-architecture)
2. [Free-to-Paid Conversion Strategy](#2-free-to-paid-conversion-strategy)
3. [AI as the Upgrade Lever](#3-ai-as-the-upgrade-lever)
4. [Circle-Based Pricing & Growth](#4-circle-based-pricing--growth)
5. [Viral/Growth Loops](#5-viralgrowth-loops)
6. [Upgrade Trigger Map](#6-upgrade-trigger-map)
7. [Retention Hooks](#7-retention-hooks)
8. [PostHog Events (Full Funnel)](#8-posthog-events-full-funnel)
9. [App Store Pricing Considerations](#9-app-store-pricing-considerations)
10. [Channel Experiments](#10-channel-experiments)
11. [Implementation Roadmap](#11-implementation-roadmap)

---

## 1. Pricing Architecture

### Current State (from codebase)

The app currently has a binary Free/Pro system:
- `src/lib/stripe/index.ts` defines `PLANS` with `free` and `pro`
- `src/lib/ai/quota-check.ts` enforces Free: 5 AI workouts/mo + 100 chats/mo, Pro: unlimited
- DB schema (`subscriptions` table) stores `plan: "free" | "pro"`
- Stripe webhook handler at `src/app/api/webhooks/stripe/route.ts` handles checkout, updates, cancellation, payment failures

### New 5-Tier Structure

The key insight: Repcir's value scales along two axes simultaneously -- AI depth (individual) and social breadth (circles). Price tiers should map to natural behavioral stages, not arbitrary feature bundles.

```
Stripe Product: repcir_subscription

Tier 1: Free (Starter)
  Stripe Price: N/A (no subscription needed)
  Monthly: $0
  Limits:
    - 3 AI workout generations/month (reduced from current 5 -- see rationale below)
    - 20 AI coach messages/month (reduced from current 100)
    - 1 circle (personal/system circle only)
    - Basic workout logging
    - Community workout library (browse only, no save)
    - No workout history export
    - Ads: none (keep ad-free to avoid cheapening brand)
  Why 3 workouts instead of 5:
    3 is enough to experience the magic (roughly 1/week for 3 weeks) but creates
    urgency faster. At 5/month, users can coast for months without upgrading.
    At 3, they hit the wall in week 3-4 -- right when the habit is forming.

Tier 2: Plus
  Stripe Price IDs:
    - price_repcir_plus_monthly: $6.99/mo
    - price_repcir_plus_yearly: $59.99/yr ($5.00/mo equivalent, 28% savings)
  Trial: 7 days free
  Limits:
    - 15 AI workout generations/month
    - Unlimited AI coach messages
    - 3 circles (1 personal + 2 group)
    - Full workout history + basic analytics
    - Save community workouts to library
    - Workout calendar scheduling
  Positioning: "For the person who works out 3-4x/week and wants AI to handle programming"
  Upgrade path from Free: hit AI workout limit OR try to join a second circle

Tier 3: Pro
  Stripe Price IDs:
    - price_repcir_pro_monthly: $12.99/mo
    - price_repcir_pro_yearly: $109.99/yr ($9.17/mo equivalent, 29% savings)
  Trial: 7 days free
  Limits:
    - Unlimited AI workout generations
    - Unlimited AI coach with memory (coaching_memory table -- already built)
    - Unlimited circles
    - Advanced analytics (PR tracking, volume trends, muscle group balance)
    - AI goal milestones (uses existing circleGoals + AI)
    - Custom workout builder (workout-builder-v2.tsx already exists)
    - Workout feedback loop (workoutFeedback table -- already built)
    - Priority AI model (use reasoning model for Pro users vs. fast model for lower tiers)
  Positioning: "Your AI personal trainer that actually knows you"
  Upgrade path from Plus: hit workout gen limit, want coaching memory, need analytics

Tier 4: Circle Leader
  Stripe Price IDs:
    - price_repcir_leader_monthly: $19.99/mo
    - price_repcir_leader_yearly: $169.99/yr ($14.17/mo equivalent, 29% savings)
  Trial: 14 days free (longer trial because circle setup takes time)
  Limits:
    - Everything in Pro
    - Create unlimited circles
    - AI group workout generation (tailored to mixed fitness levels in a circle)
    - Circle analytics dashboard (member activity, completion rates)
    - Circle challenges and leaderboards
    - Custom invite links with tracking (circleInvitations table -- already built)
    - Circle post scheduling
    - Up to 50 members per circle
  Positioning: "For coaches, gym owners, and group fitness leaders"
  Upgrade path from Pro: create circle with 5+ members, want group programming

Tier 5: Team (future -- deprioritize for now)
  Stripe Price IDs:
    - price_repcir_team_monthly: $39.99/mo base + $3.99/seat
    - price_repcir_team_yearly: $349.99/yr base + $35.99/seat/yr
  Trial: 14 days free
  Limits:
    - Everything in Circle Leader
    - Unlimited members per circle
    - API access for gym integrations
    - White-label circle branding
    - Bulk member onboarding
    - Priority support + dedicated Slack channel
    - SSO (future)
  Positioning: "For gyms and training organizations"
  Note: Build this tier only after validating Circle Leader demand. The base+seat
  model works well in Stripe using metered billing or quantity-based pricing.
```

### Why These Price Points

| Tier | Price | Competitive Anchor | Rationale |
|------|-------|-------------------|-----------|
| Free | $0 | Hevy Free, Strong Free | Table stakes. Must exist to enable viral loops. |
| Plus | $6.99 | Strong ($4.99), Hevy Pro ($9.99) | Slots between pure loggers and AI apps. Low enough for impulse upgrade. |
| Pro | $12.99 | Fitbod ($12.99) | Direct competitor parity. AI coaching memory is the differentiator Fitbod lacks. |
| Leader | $19.99 | Trainerize low end ($5-25) | Undercuts Trainerize while offering AI generation they don't have. |
| Team | $39.99+ | Trainerize high end | Only build when demand is proven. |

### Monthly vs. Yearly Discount

Use 28-29% annual discount (not 40-50%). Here is why:

1. At early stage, you need monthly cash flow visibility to measure true retention
2. Annual plans mask churn -- you won't know if the product is retaining until 12 months later
3. 28% discount is enough to incentivize annual without giving away margin
4. Frame it as: "Save 2 months" not "29% off" -- loss aversion framing works better

### Free Trial Length

- Plus/Pro: 7-day trial. Users need ~3 workouts to feel the AI value. 7 days = ~3 workout sessions for a typical 3x/week user.
- Circle Leader: 14-day trial. Circle owners need time to invite members, generate group workouts, and see participation data. 14 days gives them 2 full weeks of circle activity.

### Stripe Implementation Notes

The existing `subscriptions` table schema already supports this with minor changes:
- Change `plan` column from `"free" | "pro"` to `"free" | "plus" | "pro" | "leader" | "team"`
- The `stripePriceId` column already captures which exact price the user is on
- The `status` column already handles `active`, `canceled`, `past_due`, `trialing`
- The `trialEnd` column already exists for trial tracking

Update needed in `src/lib/stripe/index.ts`:
```typescript
export const PLANS = {
  free: {
    name: "Free",
    limits: { circles: 1, aiWorkoutsPerMonth: 3, aiChatsPerMonth: 20 },
  },
  plus: {
    name: "Plus",
    priceMonthly: 6.99,
    priceYearly: 59.99,
    limits: { circles: 3, aiWorkoutsPerMonth: 15, aiChatsPerMonth: Infinity },
  },
  pro: {
    name: "Pro",
    priceMonthly: 12.99,
    priceYearly: 109.99,
    limits: { circles: Infinity, aiWorkoutsPerMonth: Infinity, aiChatsPerMonth: Infinity },
  },
  leader: {
    name: "Circle Leader",
    priceMonthly: 19.99,
    priceYearly: 169.99,
    limits: { circles: Infinity, aiWorkoutsPerMonth: Infinity, aiChatsPerMonth: Infinity, membersPerCircle: 50 },
  },
  team: {
    name: "Team",
    priceMonthly: 39.99,
    priceYearly: 349.99,
    limits: { circles: Infinity, aiWorkoutsPerMonth: Infinity, aiChatsPerMonth: Infinity, membersPerCircle: Infinity },
  },
} as const;
```

Update needed in `src/lib/ai/quota-check.ts`:
```typescript
const PLAN_LIMITS = {
  free:   { monthlyWorkoutLimit: 3,      monthlyChatLimit: 20 },
  plus:   { monthlyWorkoutLimit: 15,     monthlyChatLimit: 999999 },
  pro:    { monthlyWorkoutLimit: 999999, monthlyChatLimit: 999999 },
  leader: { monthlyWorkoutLimit: 999999, monthlyChatLimit: 999999 },
  team:   { monthlyWorkoutLimit: 999999, monthlyChatLimit: 999999 },
} as const;
```

---

## 2. Free-to-Paid Conversion Strategy

### Realistic Conversion Benchmarks

For a consumer fitness app with AI features:

| Metric | Target (Month 1-3) | Target (Month 6-12) | Mature (12mo+) |
|--------|-------------------|---------------------|-----------------|
| Free to trial | 8-12% | 15-20% | 20-25% |
| Trial to paid | 40-50% | 50-60% | 55-65% |
| Free to paid (net) | 3-6% | 8-12% | 12-16% |
| Paid tier mix (Plus:Pro:Leader) | 60:35:5 | 50:40:10 | 40:45:15 |

These benchmarks assume the AI experience is genuinely good. If users get bad workouts, none of this works. The AI quality IS the product.

### The Conversion Path (step by step)

**Week 1: Hook with AI magic**
- User signs up, completes onboarding (already conversational via `onboardingProgress` table)
- First AI workout generated immediately post-onboarding -- this is the "aha moment"
- AI coach proactively messages after first workout: "Great session. Here's what I noticed..."
- This uses 1 of 3 free workout generations

**Week 2: Build the habit**
- Second AI workout adapts based on first session data
- Introduce the coaching chat ("Ask me anything about your training")
- If user completes 2+ workouts, show progress visualization
- This uses 2 of 3 free workout generations

**Week 3: Create the wall**
- Third AI workout generated. Free workout quota now exhausted.
- Coach message: "Based on your 3 sessions, I'm seeing patterns I want to build on. Upgrade to keep your AI coach learning about you."
- Show a "preview" of what Pro coaching memory would look like:
  "I remember you mentioned your left knee. I'm adjusting exercises to protect it."
- Display upgrade prompt with clear before/after: "Free: Generic workouts. Pro: Workouts that know your body."

**Week 4: Convert or lose**
- If not converted, deliver a time-limited offer: "7-day free trial of Plus -- no credit card required for first 3 days"
- Actually require credit card on day 4 (reduces fraud, increases intent signal)
- If converted to trial, front-load the best AI experience in those 7 days

### Conversion Mechanics (technical)

The existing `checkAIQuota` function in `src/lib/ai/quota-check.ts` already returns `upgradeRequired: true` when quota is exhausted. The `createQuotaExceededResponse` function already returns a 429 with an upgrade message. The infrastructure is there -- the UX layer needs refinement.

What needs building:
1. **Upgrade modal component** -- triggered by 429 response, shows tier comparison
2. **Usage progress bar** -- visible in AI coach chat, shows "2 of 3 workouts used this month"
3. **Smart nudge system** -- server-side PostHog events trigger contextual upgrade prompts (not annoying popups)

---

## 3. AI as the Upgrade Lever

### The Addiction Loop (free tier)

The goal: make users feel the AI is unreasonably good, then show them how much better it gets with a subscription.

**Free tier AI behavior:**
- Generate workouts using the fast model (`aiModelFast` from `src/lib/ai/index.ts`)
- No coaching memory -- each conversation starts fresh
- Generic response tone ("Here's a workout for you")
- No proactive insights or pattern recognition
- Basic exercise selection (no periodization awareness)

**Plus tier AI behavior:**
- Same fast model but with session history context
- Unlimited chat means users can ask "why this exercise?" and get real answers
- 15 workouts/month = enough for 4x/week programming
- The coaching starts to feel personalized after 5+ interactions

**Pro tier AI behavior:**
- Full reasoning model (`aiModel` with reasoning options from `src/lib/ai/index.ts`)
- Full coaching memory (the `coaching_memory` table already exists with importance scoring, categories, and tags)
- Proactive insights: "I noticed your bench press has plateaued for 3 weeks. Let me adjust your program."
- Workout feedback loop integration (the `workoutFeedback` table already exists)
- Personality: the coach develops a relationship. Uses your name, references past conversations, knows your schedule

### The "Taste" Strategy

The critical insight: users must experience Pro-quality AI before they'll pay for it.

**Implementation:**
1. First 3 AI interactions for every new user use the Pro model (reasoning + memory)
2. After 3 interactions, silently downgrade to free-tier model quality
3. User notices the difference ("Why did the AI get worse?")
4. Upgrade prompt: "Your first 3 sessions used Repcir Pro AI. Upgrade to continue with your personalized coach."

This is technically simple: in `src/lib/ai/quota-check.ts`, add a `isFirstTimeBonus` check that uses the `currentWorkoutCount` field. If count < 3 and plan is free, use Pro-level model.

### Specific Upgrade Moments for AI

| Moment | What User Experiences | Upgrade Prompt |
|--------|----------------------|----------------|
| Workout 3 generated | "You've used all 3 AI workouts this month" | "Your AI coach has learned from 3 sessions. Keep the momentum with Plus." |
| Chat message 20 hit | Coach stops responding mid-conversation | "Your coach has more to say. Upgrade to Plus for unlimited coaching." |
| User asks about nutrition | Free coach: "I can't help with nutrition on your plan" | "Pro members get nutrition guidance, injury modifications, and recovery planning." |
| PR achieved | Free coach: congratulates generically | Pro preview: "You hit 225 on bench! Based on your progression, here's your path to 250." (show this as a locked card) |
| User has been active 14+ days | Coach has enough data to be genuinely useful | "I've been tracking your patterns for 2 weeks. Upgrade to unlock my full analysis." |

---

## 4. Circle-Based Pricing & Growth

### Should circle owners pay more?

Yes, but frame it as "circle owners get more" not "circle owners pay more."

The Circle Leader tier exists specifically for people who want to run groups. Regular Pro users can join unlimited circles as members. The key distinction:

| Capability | Pro Member | Circle Leader |
|-----------|-----------|---------------|
| Join circles | Unlimited | Unlimited |
| Create circles | 1 (personal only) | Unlimited |
| AI group workouts | Cannot generate | Can generate for whole circle |
| Circle analytics | See own stats | See all member stats |
| Invite management | Cannot invite | Full invite control |
| Max members/circle | N/A (not owner) | 50 |

### Should members get benefits from paid circles?

Yes -- this is the key viral mechanic. When a Circle Leader creates a circle, their plan benefits "trickle down" to members:

**Circle Leader creates a circle -> Members get:**
- AI-generated group workouts (Leader pays, members benefit)
- Circle challenges and leaderboards
- The experience of being "coached" by AI through the group
- This is what makes circles sticky -- free users get a premium experience without paying

**Why this works:**
- Circle Leader is incentivized to invite more members (their investment gets more valuable)
- Free members experience premium features through the circle (taste of upgrade)
- Members who want this experience in their personal training upgrade to Plus/Pro
- The Leader is effectively subsidizing acquisition of new users

### Circle Growth Mechanics

The `circleInvitations` table already has the infrastructure:
- `code` field for shareable invite codes
- `maxUses` for controlling invite volume
- `uses` counter for tracking viral coefficient
- `expiresAt` for urgency

**Implementation:**
1. Every circle gets a unique invite link: `repcir.com/join/ABC123`
2. When a free user joins through an invite, they get 7 days of Plus features in that circle
3. After 7 days, they keep access to circle content but lose AI features unless they upgrade
4. The Circle Leader sees "5 members joined via your invite link" in their dashboard

---

## 5. Viral/Growth Loops

### Loop 1: Post-Workout Share (Passive Viral)

```
Trigger: User completes a workout session
Mechanic: "Share your session" card appears with shareable image
Content: Beautiful card showing workout summary + PR badges
Channels: Instagram Stories, iMessage, WhatsApp
Incentive: None needed -- people naturally share fitness wins
Technical: Generate OG image server-side, deep link back to Repcir
PostHog Event: workout_shared
K-factor contribution: 0.05-0.1 (low but consistent)
```

Implementation notes:
- The `workoutSessions` table already tracks completed sessions
- Generate a shareable image using `@vercel/og` or similar
- Deep link: `repcir.com/w/{sessionId}` shows a public workout summary page
- Public page has "Try this workout" CTA that leads to signup

### Loop 2: Circle Invite (Active Viral -- highest impact)

```
Trigger: User creates a circle or generates a group workout
Mechanic: "Invite your crew" prompt with link/QR code
Content: "Join [Name]'s circle on Repcir -- your next workout is ready"
Channels: Direct message (SMS, iMessage, WhatsApp)
Incentive: Circle owner gets 1 free month of Plus for every 3 members who join
Technical: Use circleInvitations table, track attribution
PostHog Event: invite_sent, invite_accepted, invite_converted
K-factor contribution: 0.3-0.5 (high -- direct personal ask)
```

Implementation notes:
- The `circleInvitations` table and invite code system already exist
- QR code generation for in-person scenarios (gym, park, school pickup)
- SMS invite: "Hey, I set up our workout group on Repcir. Join here: [link]"
- Track: invite_sent -> invite_clicked -> signup_completed -> first_workout_completed

### Loop 3: AI Coach Referral (Product-Led)

```
Trigger: AI coach gives particularly good advice or generates a great workout
Mechanic: "This workout was so good, share it with a friend" button on AI output
Content: The actual AI-generated workout, viewable without account
Channels: Any messaging app
Incentive: Referrer gets 5 bonus AI generations, referred user gets 5 bonus
Technical: Create shareable workout page with AI attribution
PostHog Event: ai_workout_shared, ai_share_signup
K-factor contribution: 0.1-0.2
```

### Loop 4: Challenge Viral (Event-Driven)

```
Trigger: Circle starts a challenge (existing challengeMilestones infrastructure)
Mechanic: Challenge has a public leaderboard page
Content: "Join the 30-Day Strength Challenge -- 47 people already competing"
Channels: Social media, messaging
Incentive: Challenge completion badges visible on profile
Technical: Public challenge page at repcir.com/challenge/{id}
PostHog Event: challenge_shared, challenge_joined
K-factor contribution: 0.2-0.3 (high during active challenges)
```

### Viral Coefficient Target

Combined target: K-factor of 0.4-0.6 across all loops

| Loop | K-factor | % of total invites |
|------|----------|--------------------|
| Post-workout share | 0.05-0.1 | 15% |
| Circle invite | 0.3-0.5 | 50% |
| AI coach referral | 0.1-0.2 | 20% |
| Challenge viral | 0.2-0.3 | 15% |

With K=0.5, every 100 users bring 50 new users, who bring 25, etc. The viral series converges to 2x organic -- meaning paid acquisition effectively doubles in impact.

---

## 6. Upgrade Trigger Map

These are the specific in-product moments where an upgrade prompt should appear, what it says, and which tier it promotes.

### Tier: Free -> Plus ($6.99/mo)

| # | Trigger | Condition | Prompt Copy | PostHog Event |
|---|---------|-----------|-------------|---------------|
| 1 | AI workout limit hit | `currentWorkoutCount >= 3` | "You've used all 3 AI workouts this month. Upgrade to Plus for 15/month." | `paywall_shown` with `trigger: "workout_limit"` |
| 2 | AI chat limit hit | `currentChatCount >= 20` | "Your AI coach has more to say. Plus members get unlimited coaching." | `paywall_shown` with `trigger: "chat_limit"` |
| 3 | Try to join 2nd circle | User clicks "Join" on a circle while in 1 circle | "Free members can join 1 circle. Upgrade to Plus for up to 3." | `paywall_shown` with `trigger: "circle_limit"` |
| 4 | Try to save community workout | User clicks "Save" on a workout in discover | "Save workouts to your library with Plus." | `paywall_shown` with `trigger: "save_workout"` |
| 5 | 14-day engagement streak | User has been active 14+ of last 21 days | "You're on a roll. Plus would give you AI workouts every session." | `paywall_shown` with `trigger: "engagement_streak"` |

### Tier: Plus -> Pro ($12.99/mo)

| # | Trigger | Condition | Prompt Copy | PostHog Event |
|---|---------|-----------|-------------|---------------|
| 1 | Workout gen limit hit (15) | `currentWorkoutCount >= 15` | "Upgrade to Pro for unlimited AI workouts and coaching memory." | `paywall_shown` with `trigger: "plus_workout_limit"` |
| 2 | PR achieved | New personal record logged | "You hit a PR! Pro tracks all your records and plots your progression." | `paywall_shown` with `trigger: "pr_achieved"` |
| 3 | 30-day mark | User has been active for 30+ days | "Your coach has 30 days of data. Upgrade to Pro so it remembers everything." | `paywall_shown` with `trigger: "coaching_memory_upsell"` |
| 4 | Request advanced analytics | User taps analytics section | "See muscle group balance, volume trends, and AI-powered insights with Pro." | `paywall_shown` with `trigger: "analytics_upsell"` |
| 5 | Workout feedback submitted | User rates a workout | "Pro uses your feedback to improve every future workout. Your AI gets smarter." | `paywall_shown` with `trigger: "feedback_upsell"` |

### Tier: Pro -> Circle Leader ($19.99/mo)

| # | Trigger | Condition | Prompt Copy | PostHog Event |
|---|---------|-----------|-------------|---------------|
| 1 | Create 2nd circle | Pro user tries to create another circle | "Lead unlimited circles with Circle Leader. Generate group workouts for your whole crew." | `paywall_shown` with `trigger: "create_circle_limit"` |
| 2 | Circle hits 5 members | Circle owner has 5+ members | "Your circle is growing. Upgrade to see member analytics and create challenges." | `paywall_shown` with `trigger: "circle_growth"` |
| 3 | Generate group workout | User asks AI for workout for "the group" | "Group workout generation is a Circle Leader feature. Try it free for 14 days." | `paywall_shown` with `trigger: "group_workout"` |

---

## 7. Retention Hooks

Retention is the multiplier on everything else. A 5% improvement in monthly retention has more impact than a 20% improvement in acquisition.

### Hook 1: Coaching Memory (Pro+)

The `coaching_memory` table already exists with categories: insight, preference, pain_report, motivation, pr_mention, goal_update, behavioral_pattern.

**How it retains:**
- After 30 days, the AI has accumulated 15-30 memories about the user
- These memories make the AI feel like a real coach who knows you
- Switching cost: if you cancel, you lose a coach that "knows" you
- Implementation: show a "Your Coach Knows" card in profile:
  "Your AI coach has 23 memories about your training. It knows about your knee, your bench plateau, and your 5K goal."

### Hook 2: Streak and Consistency Data

**How it retains:**
- "You've been training for 47 consecutive weeks"
- This data is already captured via `workoutSessions`
- Cancellation warning: "You'll lose access to your 47-week training history"
- Not a lie -- free tier can't access historical analytics

### Hook 3: Circle Commitment

**How it retains:**
- "You're training with 8 people in your circle"
- Social accountability is the strongest retention lever in fitness
- If you cancel Circle Leader, your circle doesn't disappear but loses AI group workouts
- Members notice: "Why aren't we getting AI workouts anymore?"
- Social pressure keeps the leader subscribed

### Hook 4: Progressive AI Quality

**How it retains:**
- Month 1: AI gives good workouts
- Month 3: AI gives great workouts (has enough data for real periodization)
- Month 6: AI feels like it actually knows your body
- The AI genuinely gets better over time with more data
- This is real retention, not a dark pattern

### Hook 5: Goal Tracking with AI Milestones

**How it retains:**
- The `circleGoals` table already has priority-weighted goals
- AI generates milestones: "To hit your 315 deadlift, here's your 12-week plan"
- Cancelling mid-goal feels like quitting
- Show progress toward goals prominently in the UI

### Retention Metrics Targets

| Metric | Month 1 Target | Month 6 Target | Mature Target |
|--------|---------------|----------------|---------------|
| D1 retention | 60% | 70% | 75% |
| D7 retention | 40% | 50% | 55% |
| D30 retention | 25% | 35% | 40% |
| Monthly subscriber churn | 12% | 8% | 5% |
| Annual subscriber churn | 4%/mo | 2.5%/mo | 1.5%/mo |

---

## 8. PostHog Events (Full Funnel)

### Acquisition Events

```
Event: user_signed_up
Properties: {
  signup_source: "string - organic | invite | challenge | shared_workout | ad",
  referrer_user_id: "string | null - who referred them",
  invite_code: "string | null - circle invite code used",
  utm_source: "string | null",
  utm_medium: "string | null",
  utm_campaign: "string | null",
  device_type: "string - mobile | tablet | desktop",
  platform: "string - web | ios | android"
}
When Fired: Account creation completes (Neon Auth callback)
Used For: Attribution, channel ROI, viral coefficient calculation
```

```
Event: onboarding_started
Properties: {
  referral_source: "string - how they found Repcir"
}
When Fired: User enters onboarding flow
Used For: Signup-to-onboarding conversion rate
```

```
Event: onboarding_completed
Properties: {
  duration_seconds: "number - time to complete",
  fitness_level: "string - from extracted onboarding data",
  goals: "string[] - selected goals",
  equipment: "string[] - available equipment",
  skipped_steps: "string[] - any skipped onboarding phases"
}
When Fired: Onboarding marked complete (existing onboardingProgress.completedAt set)
Used For: Onboarding completion rate, cohort analysis by fitness level
```

### Activation Events

```
Event: first_workout_generated
Properties: {
  generation_method: "string - ai_chat | quick_generate | template",
  workout_type: "string - strength | cardio | hiit | flexibility",
  duration_minutes: "number",
  exercise_count: "number",
  time_since_signup_hours: "number"
}
When Fired: First AI workout generation for a new user
Used For: Time-to-activation, activation rate by method
```

```
Event: first_workout_completed
Properties: {
  workout_type: "string",
  duration_minutes: "number",
  exercises_completed: "number",
  time_since_signup_hours: "number",
  was_ai_generated: "boolean"
}
When Fired: First workout session marked complete
Used For: THE key activation metric. Users who complete 1 workout within 48 hours retain 3x better.
```

```
Event: first_circle_joined
Properties: {
  circle_id: "string",
  join_method: "string - invite_link | discover | created",
  circle_size: "number - members at time of join",
  time_since_signup_hours: "number"
}
When Fired: User joins their first non-system circle
Used For: Social activation rate, circle viral attribution
```

### Engagement Events

```
Event: workout_generated
Properties: {
  generation_method: "string - ai_chat | quick_generate | template | group",
  workout_type: "string",
  model_used: "string - fast | reasoning",
  is_group_workout: "boolean",
  circle_id: "string | null",
  plan: "string - free | plus | pro | leader",
  monthly_generation_count: "number - how many this month"
}
When Fired: Every AI workout generation
Used For: AI usage patterns, model cost analysis, quota proximity tracking
```

```
Event: workout_completed
Properties: {
  plan_id: "string",
  session_duration_minutes: "number",
  exercises_completed: "number",
  exercises_skipped: "number",
  total_volume_lbs: "number",
  prs_hit: "number",
  was_ai_generated: "boolean",
  circle_id: "string | null",
  day_of_week: "string",
  time_of_day: "string - morning | afternoon | evening"
}
When Fired: Workout session completed
Used For: Engagement depth, workout quality, scheduling patterns
```

```
Event: coach_message_sent
Properties: {
  message_length: "number",
  conversation_length: "number - messages in this session",
  topic_category: "string - workout | nutrition | injury | motivation | general",
  plan: "string",
  monthly_chat_count: "number"
}
When Fired: User sends a message to AI coach
Used For: AI engagement depth, chat quota proximity
```

```
Event: circle_activity
Properties: {
  circle_id: "string",
  activity_type: "string - post | workout_shared | challenge_started | goal_set | member_joined",
  member_count: "number",
  user_role: "string - owner | admin | member"
}
When Fired: Any significant circle activity
Used For: Circle health scoring, retention correlation
```

### Retention Events

```
Event: streak_milestone
Properties: {
  streak_days: "number",
  streak_type: "string - workout | login | circle_activity",
  plan: "string"
}
When Fired: User hits 7, 14, 30, 60, 90, 180, 365 day streaks
Used For: Retention milestone tracking, streak-to-retention correlation
```

```
Event: pr_achieved
Properties: {
  exercise_name: "string",
  pr_type: "string - weight | reps | volume | time",
  previous_value: "number",
  new_value: "number",
  plan: "string"
}
When Fired: New personal record detected
Used For: Product value delivery, upgrade trigger for analytics upsell
```

```
Event: goal_progress_updated
Properties: {
  goal_id: "string",
  goal_category: "string",
  progress_percentage: "number",
  plan: "string"
}
When Fired: Goal progress calculated (daily or on workout completion)
Used For: Goal-based retention, milestone notification triggers
```

### Referral Events

```
Event: invite_sent
Properties: {
  invite_method: "string - link | qr_code | email | sms",
  circle_id: "string | null",
  sender_plan: "string",
  is_circle_invite: "boolean"
}
When Fired: User generates or sends an invite
Used For: Viral coefficient numerator
```

```
Event: invite_accepted
Properties: {
  invite_code: "string",
  circle_id: "string | null",
  referrer_user_id: "string",
  referrer_plan: "string",
  time_to_accept_hours: "number"
}
When Fired: Invited user completes signup
Used For: Invite-to-signup conversion, viral loop completion rate
```

```
Event: workout_shared
Properties: {
  share_destination: "string - instagram | twitter | whatsapp | imessage | copy_link | other",
  workout_type: "string",
  included_prs: "boolean",
  plan: "string"
}
When Fired: User shares a workout externally
Used For: Organic viral reach, share-to-signup attribution
```

### Revenue Events

```
Event: paywall_shown
Properties: {
  trigger: "string - workout_limit | chat_limit | circle_limit | save_workout | engagement_streak | plus_workout_limit | pr_achieved | coaching_memory_upsell | analytics_upsell | feedback_upsell | create_circle_limit | circle_growth | group_workout",
  current_plan: "string",
  suggested_plan: "string",
  days_since_signup: "number",
  total_workouts_completed: "number",
  paywall_variant: "string - for A/B testing different paywall designs"
}
When Fired: Any upgrade prompt or paywall is displayed
Used For: Paywall conversion rate by trigger, paywall fatigue analysis
```

```
Event: trial_started
Properties: {
  plan: "string - plus | pro | leader",
  trial_duration_days: "number",
  trigger: "string - same triggers as paywall_shown",
  days_since_signup: "number"
}
When Fired: User starts a free trial
Used For: Trial start rate, trial-to-paid conversion by plan
```

```
Event: subscription_started
Properties: {
  plan: "string",
  interval: "string - monthly | yearly",
  price_usd: "number",
  trial_converted: "boolean - was this from a trial?",
  days_since_signup: "number",
  total_workouts_completed: "number",
  trigger: "string - what drove the upgrade"
}
When Fired: First successful subscription payment
Used For: Revenue, conversion rate, time-to-convert, LTV prediction
```

```
Event: subscription_upgraded
Properties: {
  from_plan: "string",
  to_plan: "string",
  new_price_usd: "number",
  new_interval: "string",
  days_on_previous_plan: "number"
}
When Fired: User upgrades to a higher tier
Used For: Upgrade velocity, tier migration patterns
```

```
Event: subscription_canceled
Properties: {
  plan: "string",
  interval: "string",
  months_subscribed: "number",
  total_workouts: "number",
  total_ai_generations: "number",
  circles_owned: "number",
  cancel_reason: "string | null - from cancellation survey",
  cancel_at_period_end: "boolean"
}
When Fired: User initiates cancellation
Used For: Churn analysis, cancellation reason patterns, save offer optimization
```

```
Event: subscription_reactivated
Properties: {
  plan: "string",
  days_since_cancel: "number",
  reactivation_trigger: "string - email | in_app | organic"
}
When Fired: Previously canceled user resubscribes
Used For: Win-back campaign effectiveness
```

### Key PostHog Funnels to Build

1. **Signup-to-Activation:** `user_signed_up` -> `onboarding_completed` -> `first_workout_generated` -> `first_workout_completed`
2. **Free-to-Paid:** `paywall_shown` -> `trial_started` -> `subscription_started`
3. **Circle Viral Loop:** `invite_sent` -> `invite_accepted` -> `first_workout_completed` -> `invite_sent` (by new user)
4. **AI Engagement Depth:** `coach_message_sent` (count per user per week) correlated with `subscription_started`
5. **Churn Prediction:** users where `workout_completed` frequency drops 50% week-over-week

### PostHog Cohorts to Create

- **Power Users:** 4+ workouts/week for 4+ weeks
- **At-Risk:** was active (2+/week) but dropped to 0-1/week for 2+ weeks
- **Viral Champions:** sent 3+ invites that converted
- **AI Addicts:** 50+ coach messages/month
- **Circle Leaders:** own a circle with 5+ active members
- **Price Sensitive:** viewed paywall 3+ times without converting

---

## 9. App Store Pricing Considerations

### The 30% Apple Tax Problem

When Repcir ships on Expo/React Native, Apple takes 30% of in-app purchases (15% for small businesses under $1M revenue/year).

**Impact on current pricing:**

| Tier | Web Price | Apple Takes (30%) | Your Revenue | Apple Takes (15%) | Your Revenue |
|------|-----------|-------------------|--------------|-------------------|--------------|
| Plus Monthly | $6.99 | $2.10 | $4.89 | $1.05 | $5.94 |
| Plus Yearly | $59.99 | $18.00 | $41.99 | $9.00 | $50.99 |
| Pro Monthly | $12.99 | $3.90 | $9.09 | $1.95 | $11.04 |
| Pro Yearly | $109.99 | $33.00 | $76.99 | $16.50 | $93.49 |
| Leader Monthly | $19.99 | $6.00 | $13.99 | $3.00 | $16.99 |
| Leader Yearly | $169.99 | $51.00 | $118.99 | $25.50 | $144.49 |

### Strategy: Web-First Pricing with App Store Parity

**Option A: Same price everywhere (recommended initially)**
- Keep prices identical on web and App Store
- Accept the margin hit on iOS
- Simpler to manage, avoids confusing users
- At early stage, volume matters more than margin
- You'll likely qualify for Apple's Small Business Program (15% cut) for the first year+

**Option B: Higher App Store prices (consider at scale)**
- Web: $12.99/mo for Pro
- iOS: $14.99/mo for Pro (15% higher to offset commission)
- Risk: users feel punished for using iOS, and Apple reviews this pattern carefully
- Some apps do this successfully (Spotify, YouTube Premium) but they have leverage

**Option C: Web checkout bypass (aggressive but legal)**
- In the iOS app, don't offer in-app purchase at all
- Users must subscribe via web (repcir.com/upgrade)
- Apple allows this as of 2024 (US court ruling) but limits how much you can promote it
- You cannot directly link to external payment from within the app
- You CAN say "Manage your subscription at repcir.com" in settings
- This preserves full margin but adds friction

**Recommended approach:**
1. **Launch Expo app with web checkout only** (Option C). Since you're already a web app with Stripe, this is zero additional work. The Expo app just authenticates and uses the existing subscription status from the `subscriptions` table.
2. **Add Apple IAP later** only if data shows significant drop-off at the web checkout step. At that point, raise iOS prices slightly (Option B) to offset the commission.
3. **Apply for Apple's Small Business Program** immediately when you launch -- you'll almost certainly qualify and pay 15% instead of 30%.

### Apple-Specific Price Points

If you do add IAP, Apple has specific allowed price points. Your prices map well:

| Tier | Web Price | Nearest Apple Price Point |
|------|-----------|--------------------------|
| Plus Monthly | $6.99 | $6.99 (exact match) |
| Plus Yearly | $59.99 | $59.99 (exact match) |
| Pro Monthly | $12.99 | $12.99 (exact match) |
| Pro Yearly | $109.99 | $109.99 (exact match) |
| Leader Monthly | $19.99 | $19.99 (exact match) |
| Leader Yearly | $169.99 | $169.99 (exact match) |

All these are valid Apple price points, so no adjustment needed if you choose Option A.

### Expo Implementation Notes

For the Expo/React Native app:
- Use `expo-in-app-purchases` or `react-native-iap` for Apple IAP
- Server-side receipt validation against Apple's API
- Sync IAP status with existing `subscriptions` table
- The webhook handler at `src/app/api/webhooks/stripe/route.ts` pattern can be replicated for Apple server notifications
- Store `apple_receipt` or `apple_transaction_id` in the subscriptions table (add columns when needed)

---

## 10. Channel Experiments

### Experiment 1: Gym Partner TikTok Content

```
Channel: TikTok organic + Spark Ads
Hypothesis: If we post 15 "AI builds my workout" videos showing real AI-generated
workouts being performed, then we'll get 50 signups at <$3 CAC because fitness
content featuring AI tools is novel and curiosity-driving on TikTok.
Success Metric: 50 signups with completed onboarding at <$3 CAC within 21 days
Budget: $500 (ad spend) + $0 (creator is founder or early user)
Runtime: 21 days
Key Activities:
  - Days 1-3: Film 5 videos. Format: "I asked AI to build me a [type] workout. Here's what happened."
  - Days 4-7: Post 1/day, track organic performance
  - Days 8-14: Boost top 2 performing videos with Spark Ads ($250 each)
  - Days 15-21: Analyze, iterate on top format, post 3 more
Kill Criteria: <10 signups after 14 days, or CAC >$8 on boosted content
Tools Needed: TikTok Business account, Repcir UTM links, phone for filming
```

### Experiment 2: Reddit Community Seeding

```
Channel: Reddit (r/fitness, r/homegym, r/bodyweightfitness, r/xxfitness)
Hypothesis: If we provide genuinely helpful AI-generated workout plans in weekly
"Programming" threads and link to Repcir as the tool, then we'll get 30 signups
at $0 CAC because Reddit values authentic contribution over promotion.
Success Metric: 30 signups via reddit UTM links in 30 days
Budget: $0 (time investment: ~5 hours/week)
Runtime: 30 days
Key Activities:
  - Week 1: Identify 5 recurring threads where people ask for workout plans
  - Week 1-4: Respond to 3-5 threads/week with genuinely great workout plans generated by Repcir
  - Format: "Here's a plan I put together using Repcir's AI coach: [plan]. Happy to generate
    one tailored to your goals if you want."
  - Never hard-sell. Be the helpful person who happens to use a cool tool.
Kill Criteria: <5 signups after 14 days, or getting flagged for self-promotion
Tools Needed: Reddit account with history, Repcir UTM links
```

### Experiment 3: Local Gym Partnership Pilot

```
Channel: Local gym bulletin boards + trainer partnerships
Hypothesis: If we partner with 3 local gyms/trainers to offer Repcir as a
free tool for their clients, we'll get 100 signups with 20% conversion to
Plus/Pro because trainer endorsement is the highest-trust acquisition channel.
Success Metric: 100 signups, 20 paid conversions within 60 days
Budget: $300 (printed QR code materials, 3 months free Circle Leader for each partner)
Runtime: 60 days
Key Activities:
  - Week 1: Identify 10 local gyms/trainers, pitch 3 with the best fit
  - Week 2: Set up Circle Leader accounts for partners, create their circles
  - Week 2: Print QR code materials: "Get your AI workout plan -- scan to join [Trainer]'s circle"
  - Week 3-8: Partners invite their clients, track conversion
  - Weekly: Check in with partners, gather feedback
Kill Criteria: <20 signups after 30 days, or partners stop engaging
Tools Needed: Canva for materials, QR code generator, Circle Leader comps
```

### Experiment 4: School/Family Group Pilot (Underpriced Channel)

```
Channel: Parent Facebook groups + Nextdoor
Hypothesis: If we position Repcir as "the app that makes family fitness easy"
in 5 parent-focused online communities, we'll get 40 family circle signups
because parents are desperately looking for screen-free family activities.
Success Metric: 40 circle signups (circles with 2+ family members) in 30 days
Budget: $200 (Facebook group promotion, small giveaway)
Runtime: 30 days
Key Activities:
  - Week 1: Join 10 parent Facebook groups, identify the active ones
  - Week 1: Create "Family Fitness Challenge" content: 7-day family workout plan
  - Week 2-3: Share the challenge in groups as a free resource, with Repcir as the tracking tool
  - Week 3-4: Follow up with participants, encourage circle creation
Kill Criteria: <10 circle signups after 14 days
Tools Needed: Facebook account, family-friendly workout templates pre-built in Repcir
```

### Experiment 5: ProductHunt Launch

```
Channel: ProductHunt
Hypothesis: If we launch on ProductHunt with a focus on "AI coach that trains
your whole group," we'll get 200 signups in 24 hours because PH loves AI tools
and the group/circle angle is differentiated from individual fitness apps.
Success Metric: 200 signups, Top 10 daily finish
Budget: $0
Runtime: 1 day (prep: 2 weeks)
Key Activities:
  - 2 weeks before: Build hunter network, prepare assets, create demo video
  - 1 week before: Tease on Twitter/X, line up early upvotes from network
  - Launch day: Post at 12:01 AM PT, respond to every comment within 15 minutes
  - Day after: Follow up with signups via email, offer extended trial
Kill Criteria: <50 upvotes in first 4 hours (indicates weak positioning, pull and relaunch later)
Tools Needed: ProductHunt account, demo video, launch assets, early supporter DM list
```

---

## 11. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

Priority: Get the multi-tier system working before doing anything else.

1. **Update Stripe products/prices in dashboard**
   - Create Product: "Repcir Subscription"
   - Create 6 Prices: Plus monthly/yearly, Pro monthly/yearly, Leader monthly/yearly
   - Update `src/lib/stripe/index.ts` with new PLANS object
   - Update `src/lib/ai/quota-check.ts` with new tier limits

2. **Update database schema**
   - Alter `subscriptions.plan` to accept new values
   - Alter `ai_quotas.plan` to accept new values
   - Add migration for new plan values

3. **Update webhook handler**
   - Map `stripePriceId` to plan name in `src/app/api/webhooks/stripe/route.ts`
   - Handle upgrade/downgrade transitions

4. **Implement PostHog core events**
   - Add `paywall_shown`, `trial_started`, `subscription_started`, `subscription_canceled`
   - Use existing `trackEvent` from `src/lib/posthog/client.tsx`
   - Use existing `trackServerEvent` from `src/lib/posthog/server.ts`

### Phase 2: Conversion (Weeks 3-4)

5. **Build upgrade modal/paywall component**
   - Mobile-first design (375px)
   - Tier comparison table
   - Triggered by quota check responses

6. **Build usage progress indicators**
   - "2 of 3 AI workouts used" bar in coach chat
   - "Upgrade to continue" state when quota depleted

7. **Implement "first 3 sessions on Pro" taste mechanic**
   - Modify quota check to use reasoning model for first 3 generations
   - Track `first_time_bonus_used` event

### Phase 3: Viral (Weeks 5-6)

8. **Build workout share card**
   - Shareable OG image generation for completed workouts
   - Deep link: `repcir.com/w/{id}` public page

9. **Enhance circle invite flow**
   - QR code generation for invite codes
   - Track invite attribution end-to-end
   - "7 days of Plus" for invited users joining a circle

10. **Build PostHog funnels**
    - Signup-to-Activation funnel
    - Free-to-Paid funnel
    - Circle Viral Loop funnel

### Phase 4: Retention (Weeks 7-8)

11. **Coaching memory visibility**
    - "Your Coach Knows" card showing accumulated memories
    - Cancellation warning showing what they'd lose

12. **Goal milestone notifications**
    - AI-generated milestones for active goals
    - Push notifications for goal progress

13. **Streak system**
    - Workout streak tracking and display
    - Streak milestone celebrations

### Phase 5: Optimization (Ongoing)

14. **A/B test paywall variants** using PostHog feature flags (infrastructure already in `src/lib/posthog/server.ts`)
15. **Iterate on pricing** based on conversion data
16. **Win-back email sequences** for churned users
17. **Annual plan promotion** campaigns at 3-month subscriber mark

---

## Summary: Key Numbers to Hit

| Metric | 90-Day Target | How to Measure |
|--------|---------------|----------------|
| Free to trial conversion | 10% | PostHog: `trial_started` / `user_signed_up` |
| Trial to paid conversion | 45% | PostHog: `subscription_started` / `trial_started` |
| Net free-to-paid | 4.5% | PostHog: `subscription_started` / `user_signed_up` |
| Monthly subscriber churn | 10% | PostHog: `subscription_canceled` / active subscribers |
| Viral K-factor | 0.3 | PostHog: `invite_accepted` / active users |
| Time to first workout | < 24 hours | PostHog: `first_workout_completed` timestamp - signup timestamp |
| ARPU (all users) | $1.50/mo | Stripe MRR / total registered users |
| ARPU (paid users) | $11/mo | Stripe MRR / paying subscribers |
| Circle creation rate | 15% of users create or join a circle in first 30 days | PostHog: `first_circle_joined` cohort |

These are achievable targets for a fitness app with genuine AI differentiation and social mechanics. The circle system is the moat -- no competitor has AI + social training groups at this price point.
