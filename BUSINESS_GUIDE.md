# ExpenseIQ Business

An original business expense management MVP inspired by the category, budget and analytics ideas in Carlm832/expenseiq. No reference code or visual assets were reused; that repository restricts public redistribution.

## Roles and workflow

- Platform admin: create companies, inspect company activity, suspend or reactivate accounts.
- Business admin: manage members and categories, allocate internal budget, submit expenses, review other members' expenses.
- Manager: submit expenses and review other members' expenses.
- Employee: submit and view their own expenses and decisions.

Each business has one currency and an internal wallet. Budget allocation creates a credit. Expense submission creates a pending request without reserving funds. Approval checks funds and records one debit atomically with the decision. Rejection requires a reason and does not affect the wallet. Self-approval is prohibited. Currency values are integer minor units. Allocations do not transfer real funds.

## First use

The hosted site starts owner-private. Its first authenticated visitor becomes the platform admin and receives a clearly marked sample workspace. Create your own company from Platform admin; new companies contain no sample transactions. Allocate a budget, add members by their exact sign-in email, and start submitting expenses.

Authentication uses trusted identity headers supplied by Sites. The application checks membership and role server-side for every mutation and scopes responses by company and role. Before real team onboarding, the owner must enable appropriate site access through Sites sharing controls. An email membership alone does not grant access to an owner-private site. Invitation email delivery, public self-service registration, SaaS billing and payment processing are not implemented.

## Persistence and current scale

Cloudflare D1 stores the platform state with an optimistic version check. Each mutation commits expense status, wallet entry and audit event in one conditional database update; concurrent conflicts return 409. Clients preserve form input on failure. This compact MVP uses a single state row and is intended for small deployments. Before a high-volume launch, normalize per-tenant tables, add pagination and archival, operational monitoring and backup procedures. Site identity headers must only be accepted behind the trusted Sites dispatcher; do not expose this worker directly through an untrusted proxy.

The development preview uses clearly labeled, session-only sample state when identity headers are absent. Hosted data is persisted in D1, never browser storage. A platform admin who is not a member may inspect a business but cannot perform business-level mutations.

## Verification

- `node scripts/test-business.mjs`: role and tenant checks, approval/rejection, balances, duplicate protection, validation and audit.
- `node scripts/test-api.mjs`: local API and D1 integration including simultaneous approvals. Run only against a local database. It creates isolated test companies and uses synthetic identity headers solely on localhost.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`
- `node scripts/run-framework.mjs build`

Use the starter README for local D1 migration and development commands. Generated SQL under `drizzle/` is schema-only and applied by Sites at publication.
