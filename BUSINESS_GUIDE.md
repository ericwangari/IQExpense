# ExpenseIQ Business

ExpenseIQ Business is a SaaS-style expense management platform for companies. It supports platform administration, business workspaces, role-based access control, manager approvals, expense categories, team member dashboards, and internal virtual wallet balances.

The app is now prepared for Vercel hosting with Supabase Auth and Supabase Postgres as the backend.

## Roles and workflow

- Platform admin: the single owner account for the deployment; approve or reject registered businesses, inspect company activity, suspend or reactivate accounts.
- Business admin: register a business, then after platform approval manage members and categories, allocate internal budget, submit expenses, review other members' expenses, and control access.
- Manager: review pending approvals, manage team member accounts, and control team member wallet limits.
- Team member: use a personal dashboard to submit expenses and track their own allowance, pending requests, and decisions.

Each business has one currency and an internal wallet. Budget allocation creates a credit. Expense submission creates a pending request without moving real money. Approval checks funds and records one debit with the approval decision. Rejection requires a reason and does not affect the wallet. Nobody can approve their own submission.

## Vercel + Supabase setup

Create a Supabase project, then run the SQL in `supabase/migrations/0001_workspace.sql` in the Supabase SQL editor. The migration creates the `expenseiq_workspace` table and limits direct table access to the service role used by the server API.

Add these environment variables in Vercel before deploying:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

If Supabase shows the newer key names, the app also supports this set:

```env
SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
SUPABASE_SECRET_KEY=your-supabase-secret-key
```

Use the anon or publishable key only for the browser. Keep the service role or secret key server-side in Vercel environment variables and never expose it in client code.

Deploy the GitHub repo to Vercel with the standard Next.js settings:

- Install command: `npm install`
- Build command: `npm run build`
- Output: Next.js default

After deployment, sign up through `/signup`. The first signed-in user provisions the platform owner account and becomes the only platform admin. Production starts with no mock business data. Business admins sign in and register their own business from the workspace entry screen. The platform admin opens `/platform` to approve or reject each registration. After approval, the business admin can add managers and team members by exact Supabase Auth email in the Team area. Those users sign in through `/login` and receive a role-scoped dashboard.

## Authentication and access control

Supabase Auth handles signup and login. Email/password and Google OAuth are supported in the app. The browser sends the current Supabase access token to `/api/workspace`, and the server verifies the token with Supabase before returning data or applying a mutation.

To enable Google sign-in, configure Google in Supabase under Authentication > Sign In / Providers > Google. Add the Google OAuth client ID and client secret, then allow these redirect URLs in Supabase:

```text
https://iq-expense.vercel.app/**
https://iq-expense.vercel.app/
```

If you add a custom domain later, add that domain to the Supabase redirect allow list too. In Google Cloud Console, add the Supabase callback URL shown in the Supabase Google provider settings as an authorized redirect URI.

Role and membership checks still run server-side for every action. Business admins and managers cannot access the platform dashboard unless they are also the platform owner. A registered business cannot use wallet, team, category, or expense functions until the platform admin approves it. Team members cannot see company wallet or team management screens. Managers can control team member accounts and approvals. Business admins can manage company-level settings and wallet allocations after approval. Platform admin access is reserved for the one owner account that created the platform state.

## Persistence and current scale

Supabase Postgres stores the workspace state in one JSON row with an optimistic version check. Each mutation commits the updated expense state, wallet movement, and audit event in one conditional update; concurrent conflicts return `409` and the user can refresh and retry.

This compact MVP is suitable for early SaaS validation. Before a high-volume launch, normalize per-tenant tables, add row-level tenant tables, pagination, archive policies, operational monitoring, billing, and backup procedures.

## Verification

- `node scripts/test-business.mjs`: role and tenant checks, approval/rejection, balances, duplicate protection, validation, and audit.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`
- `npm run build`

Local development without Supabase variables still opens a clearly labeled demo workspace on localhost. Production requires the Supabase variables above.
