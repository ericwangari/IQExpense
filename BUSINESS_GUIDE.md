# ExpenseIQ Business

ExpenseIQ Business is a SaaS-style expense management platform for companies. It supports platform administration, business workspaces, role-based access control, manager approvals, expense categories, team member dashboards, and internal virtual wallet balances.

The app is now prepared for Vercel hosting with Supabase Auth and Supabase Postgres as the backend.

## Roles and workflow

- Platform admin: create companies, inspect company activity, suspend or reactivate accounts.
- Business admin: manage members and categories, allocate internal budget, submit expenses, review other members' expenses, and control access.
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

Use the anon key only for the browser. Keep the service role key server-side in Vercel environment variables and never expose it in client code.

Deploy the GitHub repo to Vercel with the standard Next.js settings:

- Install command: `npm install`
- Build command: `npm run build`
- Output: Next.js default

After deployment, sign up through `/signup`. The first signed-in user provisions the initial platform workspace. Business admins can then create member login accounts by adding each member's exact Supabase Auth email in the Team area. Those users sign in through `/login` and receive a role-scoped dashboard.

## Authentication and access control

Supabase Auth handles signup and login. The browser sends the current Supabase access token to `/api/workspace`, and the server verifies the token with Supabase before returning data or applying a mutation.

Role and membership checks still run server-side for every action. Team members cannot see company wallet or team management screens. Managers can control team member accounts and approvals. Business admins can manage company-level settings and wallet allocations. Platform admin access is reserved for the owner account that created the platform state.

## Persistence and current scale

Supabase Postgres stores the workspace state in one JSON row with an optimistic version check. Each mutation commits the updated expense state, wallet movement, and audit event in one conditional update; concurrent conflicts return `409` and the user can refresh and retry.

This compact MVP is suitable for early SaaS validation. Before a high-volume launch, normalize per-tenant tables, add row-level tenant tables, pagination, archive policies, operational monitoring, billing, and backup procedures.

## Verification

- `node scripts/test-business.mjs`: role and tenant checks, approval/rejection, balances, duplicate protection, validation, and audit.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`
- `npm run build`

Local development without Supabase variables still opens a clearly labeled demo workspace on localhost. Production requires the Supabase variables above.
