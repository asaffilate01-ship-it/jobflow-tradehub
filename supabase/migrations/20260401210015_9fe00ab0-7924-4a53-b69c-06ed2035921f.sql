
-- Enable RLS on all remaining tables
alter table public.quote_lines enable row level security;
alter table public.job_awards enable row level security;
alter table public.order_items enable row level security;
alter table public.delivery_events enable row level security;
alter table public.customer_invoices enable row level security;
alter table public.customer_invoice_lines enable row level security;
alter table public.subcontractors enable row level security;
alter table public.subcontractor_invoices enable row level security;
alter table public.cis_returns enable row level security;
alter table public.employees enable row level security;
alter table public.timesheets enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_entries enable row level security;
alter table public.gl_entries enable row level security;
alter table public.gl_lines enable row level security;
alter table public.merchant_catalog_items enable row level security;
alter table public.integration_credentials enable row level security;
alter table public.webhooks_log enable row level security;
alter table public.marketplace_memberships enable row level security;
alter table public.trade_accounts enable row level security;

-- Quote lines: accessible via quote ownership
create policy "quote lines via quote owner" on public.quote_lines for all using (
  exists(select 1 from public.quotes q join public.trade_companies tc on tc.id = q.trade_company_id where q.id = quote_lines.quote_id and tc.owner_profile_id = auth.uid())
) with check (
  exists(select 1 from public.quotes q join public.trade_companies tc on tc.id = q.trade_company_id where q.id = quote_lines.quote_id and tc.owner_profile_id = auth.uid())
);
create policy "customers view quote lines" on public.quote_lines for select using (
  exists(select 1 from public.quotes q join public.jobs j on j.id = q.job_id where q.id = quote_lines.quote_id and j.customer_profile_id = auth.uid())
);

-- Job awards: visible to job owner and awarded trade
create policy "job awards visible to related" on public.job_awards for select using (
  exists(select 1 from public.jobs j where j.id = job_awards.job_id and j.customer_profile_id = auth.uid())
  or exists(select 1 from public.trade_companies tc where tc.id = job_awards.trade_company_id and tc.owner_profile_id = auth.uid())
);

-- Order items: via material order ownership
create policy "order items via order owner" on public.order_items for all using (
  exists(select 1 from public.material_orders mo join public.trade_companies tc on tc.id = mo.trade_company_id where mo.id = order_items.material_order_id and tc.owner_profile_id = auth.uid())
) with check (
  exists(select 1 from public.material_orders mo join public.trade_companies tc on tc.id = mo.trade_company_id where mo.id = order_items.material_order_id and tc.owner_profile_id = auth.uid())
);

-- Delivery events: via delivery driver or trade
create policy "delivery events visible" on public.delivery_events for select using (
  exists(select 1 from public.deliveries d where d.id = delivery_events.delivery_id and d.driver_profile_id = auth.uid())
  or exists(
    select 1 from public.deliveries d join public.material_orders mo on mo.id = d.material_order_id
    join public.trade_companies tc on tc.id = mo.trade_company_id
    where d.id = delivery_events.delivery_id and tc.owner_profile_id = auth.uid()
  )
);

-- Customer invoices: via trade company owner or job customer
create policy "trades manage own invoices" on public.customer_invoices for all using (
  exists(select 1 from public.trade_companies tc where tc.id = customer_invoices.trade_company_id and tc.owner_profile_id = auth.uid())
) with check (
  exists(select 1 from public.trade_companies tc where tc.id = customer_invoices.trade_company_id and tc.owner_profile_id = auth.uid())
);
create policy "customers view own invoices" on public.customer_invoices for select using (
  exists(select 1 from public.jobs j where j.id = customer_invoices.job_id and j.customer_profile_id = auth.uid())
);

-- Customer invoice lines: via invoice ownership
create policy "invoice lines via invoice owner" on public.customer_invoice_lines for all using (
  exists(select 1 from public.customer_invoices ci join public.trade_companies tc on tc.id = ci.trade_company_id where ci.id = customer_invoice_lines.invoice_id and tc.owner_profile_id = auth.uid())
) with check (
  exists(select 1 from public.customer_invoices ci join public.trade_companies tc on tc.id = ci.trade_company_id where ci.id = customer_invoice_lines.invoice_id and tc.owner_profile_id = auth.uid())
);

-- Subcontractors: via trade company
create policy "trades manage own subcontractors" on public.subcontractors for all using (
  exists(select 1 from public.trade_companies tc where tc.id = subcontractors.trade_company_id and tc.owner_profile_id = auth.uid())
) with check (
  exists(select 1 from public.trade_companies tc where tc.id = subcontractors.trade_company_id and tc.owner_profile_id = auth.uid())
);

-- Subcontractor invoices: via subcontractor's trade company
create policy "trades manage sub invoices" on public.subcontractor_invoices for all using (
  exists(select 1 from public.subcontractors s join public.trade_companies tc on tc.id = s.trade_company_id where s.id = subcontractor_invoices.subcontractor_id and tc.owner_profile_id = auth.uid())
) with check (
  exists(select 1 from public.subcontractors s join public.trade_companies tc on tc.id = s.trade_company_id where s.id = subcontractor_invoices.subcontractor_id and tc.owner_profile_id = auth.uid())
);

-- CIS returns: via trade company
create policy "trades manage own cis returns" on public.cis_returns for all using (
  exists(select 1 from public.trade_companies tc where tc.id = cis_returns.trade_company_id and tc.owner_profile_id = auth.uid())
) with check (
  exists(select 1 from public.trade_companies tc where tc.id = cis_returns.trade_company_id and tc.owner_profile_id = auth.uid())
);

-- Employees: via trade company
create policy "trades manage own employees" on public.employees for all using (
  exists(select 1 from public.trade_companies tc where tc.id = employees.trade_company_id and tc.owner_profile_id = auth.uid())
) with check (
  exists(select 1 from public.trade_companies tc where tc.id = employees.trade_company_id and tc.owner_profile_id = auth.uid())
);

-- Timesheets: via employee's trade company
create policy "trades manage timesheets" on public.timesheets for all using (
  exists(select 1 from public.employees e join public.trade_companies tc on tc.id = e.trade_company_id where e.id = timesheets.employee_id and tc.owner_profile_id = auth.uid())
) with check (
  exists(select 1 from public.employees e join public.trade_companies tc on tc.id = e.trade_company_id where e.id = timesheets.employee_id and tc.owner_profile_id = auth.uid())
);

-- Payroll runs: via trade company
create policy "trades manage own payroll" on public.payroll_runs for all using (
  exists(select 1 from public.trade_companies tc where tc.id = payroll_runs.trade_company_id and tc.owner_profile_id = auth.uid())
) with check (
  exists(select 1 from public.trade_companies tc where tc.id = payroll_runs.trade_company_id and tc.owner_profile_id = auth.uid())
);

-- Payroll entries: via payroll run's trade company
create policy "trades manage payroll entries" on public.payroll_entries for all using (
  exists(select 1 from public.payroll_runs pr join public.trade_companies tc on tc.id = pr.trade_company_id where pr.id = payroll_entries.payroll_run_id and tc.owner_profile_id = auth.uid())
) with check (
  exists(select 1 from public.payroll_runs pr join public.trade_companies tc on tc.id = pr.trade_company_id where pr.id = payroll_entries.payroll_run_id and tc.owner_profile_id = auth.uid())
);

-- GL entries: via trade company
create policy "trades manage own gl entries" on public.gl_entries for all using (
  trade_company_id is null or exists(select 1 from public.trade_companies tc where tc.id = gl_entries.trade_company_id and tc.owner_profile_id = auth.uid())
) with check (
  exists(select 1 from public.trade_companies tc where tc.id = gl_entries.trade_company_id and tc.owner_profile_id = auth.uid())
);

-- GL lines: via gl entry's trade company
create policy "trades manage gl lines" on public.gl_lines for all using (
  exists(select 1 from public.gl_entries ge join public.trade_companies tc on tc.id = ge.trade_company_id where ge.id = gl_lines.gl_entry_id and tc.owner_profile_id = auth.uid())
) with check (
  exists(select 1 from public.gl_entries ge join public.trade_companies tc on tc.id = ge.trade_company_id where ge.id = gl_lines.gl_entry_id and tc.owner_profile_id = auth.uid())
);

-- Merchant catalog: publicly readable
create policy "catalog publicly readable" on public.merchant_catalog_items for select using (true);

-- Integration credentials: admin only
create policy "admins manage credentials" on public.integration_credentials for all using (public.has_role(auth.uid(), 'admin'));

-- Webhooks log: admin only
create policy "admins view webhooks" on public.webhooks_log for select using (public.has_role(auth.uid(), 'admin'));

-- Marketplace memberships: via trade company
create policy "trades view own memberships" on public.marketplace_memberships for select using (
  exists(select 1 from public.trade_companies tc where tc.id = marketplace_memberships.trade_company_id and tc.owner_profile_id = auth.uid())
);

-- Trade accounts: via trade company
create policy "trades manage own accounts" on public.trade_accounts for all using (
  exists(select 1 from public.trade_companies tc where tc.id = trade_accounts.trade_company_id and tc.owner_profile_id = auth.uid())
) with check (
  exists(select 1 from public.trade_companies tc where tc.id = trade_accounts.trade_company_id and tc.owner_profile_id = auth.uid())
);

-- Fix search_path on set_updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
