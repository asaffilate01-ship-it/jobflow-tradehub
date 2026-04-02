
# TraderOS: Agent Portal + Accounting Features

## Phase 1: Database Setup
- Add `agent` to `app_role` enum
- Create `agents` table (profile_id, commission_rate, commission_type, status, referral_code)
- Create `agent_referrals` table (agent_id, referred_user_id, referral_type, status, commission_earned, paid_at)
- Create `agent_commissions` table (agent_id, referral_id, amount, status, period)
- RLS: agents can only see their own data, admins see all
- Update profiles view policies for agent role

## Phase 2: Agent Portal UI
- **AgentLayout** — sidebar nav (Dashboard, Referrals, Commission, Profile)
- **AgentDashboard** — KPIs: total referrals, active traders, pending commission, paid commission, conversion rate
- **AgentReferralsPage** — list of referred traders/customers with status
- **AgentCommissionPage** — commission history, payouts, earnings chart
- Unique referral link generation per agent
- Secure route gating via `agent` role

## Phase 3: Accounting Features (Trader Dashboard)
- **AccountingPage** — tabs for:
  - **Bookkeeping** — income/expenses ledger, P&L summary, VAT tracking
  - **Tax Returns** — self-employed (SA), partnership, ltd company views
  - **Payroll** (existing, link to existing payroll features)
  - **CIS** (existing, link to existing CIS features)
- Business type selector (self-employed / partnership / ltd)
- Integrate with existing `gl_entries`, `gl_lines`, `chart_of_accounts` tables

## Phase 4: Dev Mode
- Add `agent@traderos.dev` / `agent123!` to dev login panel

## Security
- Agent routes gated by `app_role = 'agent'`
- RLS on all agent tables
- No cross-agent data leakage
