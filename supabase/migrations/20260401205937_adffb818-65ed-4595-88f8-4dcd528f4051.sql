
-- TradeFlow MVP schema — Part 1: Enums + Core tables

create type public.app_role as enum ('customer', 'trade', 'driver', 'admin');
create type public.trade_type as enum ('builder','plumber','electrician','gas_engineer','tiler','carpenter','bricklayer','mason','roofer','plasterer','painter','landscaper','other');
create type public.job_status as enum ('posted','quoted','awarded','active','paused','completed','cancelled');
create type public.quote_status as enum ('submitted','accepted','rejected','withdrawn');
create type public.order_status as enum ('draft','submitted','confirmed','ready_for_pickup','collected','delivered','cancelled');
create type public.delivery_status as enum ('unassigned','broadcast','assigned','arrived_at_pickup','collected','en_route','delivered','failed','cancelled');
create type public.vehicle_type as enum ('car','small_van','medium_van','large_van','luton','flatbed');
create type public.urgency_level as enum ('standard','priority','emergency');
create type public.invoice_status as enum ('draft','issued','part_paid','paid','void');
create type public.cis_status as enum ('not_applicable','pending_verification','verified','deducted','filed');
create type public.accounting_entry_type as enum ('invoice','bill','payment','payroll','journal','cis','driver_payout');
create type public.payroll_status as enum ('draft','approved','paid');
create type public.merchant_delivery_mode as enum ('merchant_delivery','trade_collect','platform_driver');

-- User roles (separate table for security)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users can view own roles" on public.user_roles for select using (auth.uid() = user_id);
create policy "Admins can manage roles" on public.user_roles for all using (public.has_role(auth.uid(), 'admin'));

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  company_name text,
  trade_specialism public.trade_type,
  rating numeric(3,2) default 5.00,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles self read" on public.profiles for select using (auth.uid() = id);
create policy "profiles self write" on public.profiles for update using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Trade companies
create table public.trade_companies (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  legal_name text not null,
  trading_name text, utr text, company_number text, vat_number text,
  cis_registered boolean not null default false,
  address_line1 text, city text, postcode text,
  created_at timestamptz not null default now()
);
alter table public.trade_companies enable row level security;
create policy "trades manage own companies" on public.trade_companies for all using (owner_profile_id = auth.uid()) with check (owner_profile_id = auth.uid());

-- Driver profiles
create table public.driver_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  vehicle_type public.vehicle_type not null,
  vehicle_reg text, max_payload_kg integer,
  can_two_man_lift boolean not null default false,
  verified boolean not null default false,
  available boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.driver_profiles enable row level security;
create policy "drivers manage own profile" on public.driver_profiles for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Jobs
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  customer_profile_id uuid not null references public.profiles(id) on delete cascade,
  trade_company_id uuid references public.trade_companies(id),
  requested_trade public.trade_type not null,
  title text not null, description text,
  address_line1 text not null, city text not null, postcode text not null,
  budget_min numeric(12,2), budget_max numeric(12,2),
  target_start_date date,
  status public.job_status not null default 'posted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_jobs_status_trade on public.jobs(status, requested_trade);
alter table public.jobs enable row level security;
create policy "customers manage own jobs" on public.jobs for all using (customer_profile_id = auth.uid()) with check (customer_profile_id = auth.uid());
create policy "trades view posted jobs" on public.jobs for select using (status in ('posted','quoted','awarded','active','completed'));

-- Quotes
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  trade_company_id uuid not null references public.trade_companies(id) on delete cascade,
  labour_amount numeric(12,2) not null default 0,
  materials_estimate numeric(12,2) not null default 0,
  delivery_estimate numeric(12,2) not null default 0,
  total_amount numeric(12,2) generated always as (labour_amount + materials_estimate + delivery_estimate) stored,
  notes text,
  status public.quote_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, trade_company_id)
);
alter table public.quotes enable row level security;
create policy "trades manage own quotes" on public.quotes for all using (
  exists(select 1 from public.trade_companies tc where tc.id = quotes.trade_company_id and tc.owner_profile_id = auth.uid())
) with check (
  exists(select 1 from public.trade_companies tc where tc.id = quotes.trade_company_id and tc.owner_profile_id = auth.uid())
);
create policy "customers view quotes on own jobs" on public.quotes for select using (
  exists(select 1 from public.jobs j where j.id = quotes.job_id and j.customer_profile_id = auth.uid())
);

-- Quote lines
create table public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  line_type text not null check (line_type in ('labour','materials','delivery','other')),
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) generated always as (quantity * unit_price) stored
);

-- Job awards (BEFORE job_media so policies can reference it)
create table public.job_awards (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.jobs(id) on delete cascade,
  accepted_quote_id uuid not null references public.quotes(id) on delete restrict,
  trade_company_id uuid not null references public.trade_companies(id) on delete restrict,
  awarded_at timestamptz not null default now()
);

-- Job media
create table public.job_media (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image','video','drawing','document')),
  captured_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.job_media enable row level security;
create policy "job media visible to related users" on public.job_media for select using (
  exists (select 1 from public.jobs j where j.id = job_media.job_id and j.customer_profile_id = auth.uid())
  or exists (
    select 1 from public.job_awards a
    join public.trade_companies tc on tc.id = a.trade_company_id
    where a.job_id = job_media.job_id and tc.owner_profile_id = auth.uid()
  )
);
create policy "users upload own media" on public.job_media for insert with check (auth.uid() = uploaded_by);

-- Merchants
create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, slug text not null unique,
  supports_trade_account boolean not null default true,
  supports_click_collect boolean not null default false,
  supports_delivery boolean not null default false,
  integration_mode text not null default 'manual',
  website_url text,
  created_at timestamptz not null default now()
);
alter table public.merchants enable row level security;
create policy "merchants publicly readable" on public.merchants for select using (true);

-- Merchant branches
create table public.merchant_branches (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  branch_name text, address_line1 text, city text, postcode text, phone text,
  branch_metadata jsonb not null default '{}'::jsonb
);
alter table public.merchant_branches enable row level security;
create policy "branches publicly readable" on public.merchant_branches for select using (true);

-- Trade accounts
create table public.trade_accounts (
  id uuid primary key default gen_random_uuid(),
  trade_company_id uuid not null references public.trade_companies(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  account_reference text not null, account_name text,
  verified boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (trade_company_id, merchant_id, account_reference)
);

-- Material orders
create table public.material_orders (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  trade_company_id uuid not null references public.trade_companies(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete restrict,
  merchant_branch_id uuid references public.merchant_branches(id) on delete set null,
  delivery_mode public.merchant_delivery_mode not null,
  order_status public.order_status not null default 'draft',
  merchant_order_reference text,
  trade_account_id uuid references public.trade_accounts(id) on delete set null,
  goods_total numeric(12,2) not null default 0,
  merchant_delivery_fee numeric(12,2) not null default 0,
  platform_delivery_fee numeric(12,2) not null default 0,
  pickup_address text, delivery_address text not null,
  required_vehicle public.vehicle_type,
  urgency public.urgency_level not null default 'standard',
  manpower_required integer not null default 1,
  notes text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.material_orders enable row level security;
create policy "related users see material orders" on public.material_orders for select using (
  created_by = auth.uid()
  or exists(select 1 from public.jobs j where j.id = material_orders.job_id and j.customer_profile_id = auth.uid())
  or exists(select 1 from public.trade_companies tc where tc.id = material_orders.trade_company_id and tc.owner_profile_id = auth.uid())
);
create policy "trades manage own material orders" on public.material_orders for all using (
  exists(select 1 from public.trade_companies tc where tc.id = material_orders.trade_company_id and tc.owner_profile_id = auth.uid())
) with check (
  exists(select 1 from public.trade_companies tc where tc.id = material_orders.trade_company_id and tc.owner_profile_id = auth.uid())
);

-- Order items
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  material_order_id uuid not null references public.material_orders(id) on delete cascade,
  sku text, item_name text not null, category text,
  quantity numeric(12,2) not null default 1, unit text,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) generated always as (quantity * unit_price) stored,
  item_metadata jsonb not null default '{}'::jsonb
);

-- Delivery rate cards (admin CSV upload)
create table public.delivery_rate_cards (
  id uuid primary key default gen_random_uuid(),
  name text not null, active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.delivery_rate_cards enable row level security;
create policy "rate cards publicly readable" on public.delivery_rate_cards for select using (true);
create policy "admins manage rate cards" on public.delivery_rate_cards for all using (public.has_role(auth.uid(), 'admin'));

-- Delivery rate card rows
create table public.delivery_rate_card_rows (
  id uuid primary key default gen_random_uuid(),
  rate_card_id uuid not null references public.delivery_rate_cards(id) on delete cascade,
  vehicle_type public.vehicle_type not null,
  urgency public.urgency_level not null,
  min_miles numeric(12,2) not null default 0, max_miles numeric(12,2),
  base_fee numeric(12,2) not null, per_mile_fee numeric(12,2) not null,
  manpower_fee numeric(12,2) not null default 0,
  percentage_markup numeric(5,2) not null default 0,
  created_at timestamptz not null default now()
);
alter table public.delivery_rate_card_rows enable row level security;
create policy "rate card rows publicly readable" on public.delivery_rate_card_rows for select using (true);
create policy "admins manage rate card rows" on public.delivery_rate_card_rows for all using (public.has_role(auth.uid(), 'admin'));

-- Deliveries
create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  material_order_id uuid not null unique references public.material_orders(id) on delete cascade,
  status public.delivery_status not null default 'unassigned',
  driver_profile_id uuid references public.driver_profiles(profile_id) on delete set null,
  price_charged numeric(12,2) not null default 0,
  driver_payout numeric(12,2) not null default 0,
  platform_margin numeric(12,2) not null default 0,
  estimated_distance_miles numeric(12,2), actual_distance_miles numeric(12,2),
  assigned_at timestamptz, delivered_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.deliveries enable row level security;
create policy "drivers see assigned deliveries" on public.deliveries for select using (
  driver_profile_id = auth.uid()
);
create policy "related trades see deliveries" on public.deliveries for select using (
  exists(
    select 1 from public.material_orders mo
    join public.trade_companies tc on tc.id = mo.trade_company_id
    where mo.id = deliveries.material_order_id and tc.owner_profile_id = auth.uid()
  )
);

-- Delivery events
create table public.delivery_events (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  event_type text not null, notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- Customer invoices
create table public.customer_invoices (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  trade_company_id uuid not null references public.trade_companies(id) on delete cascade,
  invoice_number text not null unique,
  issue_date date not null default current_date, due_date date,
  subtotal numeric(12,2) not null default 0,
  vat_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  status public.invoice_status not null default 'draft',
  created_at timestamptz not null default now()
);

-- Customer invoice lines
create table public.customer_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.customer_invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  vat_rate numeric(5,2) not null default 20,
  total_ex_vat numeric(12,2) generated always as (quantity * unit_price) stored
);

-- Subcontractors
create table public.subcontractors (
  id uuid primary key default gen_random_uuid(),
  trade_company_id uuid not null references public.trade_companies(id) on delete cascade,
  full_name text not null, company_name text, utr text, ni_number text,
  verification_number text, cis_rate numeric(5,2),
  status public.cis_status not null default 'pending_verification',
  created_at timestamptz not null default now()
);

-- Subcontractor invoices
create table public.subcontractor_invoices (
  id uuid primary key default gen_random_uuid(),
  subcontractor_id uuid not null references public.subcontractors(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  invoice_reference text not null, invoice_date date not null,
  labour_amount numeric(12,2) not null default 0,
  materials_amount numeric(12,2) not null default 0,
  vat_amount numeric(12,2) not null default 0,
  gross_amount numeric(12,2) generated always as (labour_amount + materials_amount + vat_amount) stored,
  cis_labour_basis numeric(12,2) not null default 0,
  cis_deduction_amount numeric(12,2) not null default 0,
  net_payable numeric(12,2) not null default 0,
  status public.invoice_status not null default 'draft',
  created_at timestamptz not null default now()
);

-- CIS returns
create table public.cis_returns (
  id uuid primary key default gen_random_uuid(),
  trade_company_id uuid not null references public.trade_companies(id) on delete cascade,
  tax_month date not null,
  status public.cis_status not null default 'pending_verification',
  totals jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (trade_company_id, tax_month)
);

-- Employees
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  trade_company_id uuid not null references public.trade_companies(id) on delete cascade,
  full_name text not null, email text, payroll_number text,
  ni_number text, tax_code text,
  pay_frequency text not null default 'weekly',
  employment_type text not null default 'employee',
  hourly_rate numeric(12,2), annual_salary numeric(12,2),
  pension_percent numeric(5,2) default 0,
  student_loan_plan text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Timesheets
create table public.timesheets (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  check_in_at timestamptz, check_out_at timestamptz,
  approved boolean not null default false, notes text,
  created_at timestamptz not null default now()
);

-- Payroll
create table public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  trade_company_id uuid not null references public.trade_companies(id) on delete cascade,
  period_start date not null, period_end date not null,
  status public.payroll_status not null default 'draft',
  gross_pay numeric(12,2) not null default 0,
  employer_cost numeric(12,2) not null default 0,
  net_pay numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (trade_company_id, period_start, period_end)
);

create table public.payroll_entries (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  hours_worked numeric(12,2) not null default 0,
  gross_pay numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  employee_ni numeric(12,2) not null default 0,
  employer_ni numeric(12,2) not null default 0,
  pension numeric(12,2) not null default 0,
  net_pay numeric(12,2) not null default 0
);

-- Chart of accounts
create table public.chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, name text not null,
  category text not null,
  normal_balance text not null check (normal_balance in ('debit','credit')),
  system_account boolean not null default false
);
alter table public.chart_of_accounts enable row level security;
create policy "chart of accounts publicly readable" on public.chart_of_accounts for select using (true);

-- GL
create table public.gl_entries (
  id uuid primary key default gen_random_uuid(),
  trade_company_id uuid references public.trade_companies(id) on delete cascade,
  entry_type public.accounting_entry_type not null,
  reference_table text, reference_id uuid,
  entry_date date not null default current_date,
  description text not null,
  created_at timestamptz not null default now()
);

create table public.gl_lines (
  id uuid primary key default gen_random_uuid(),
  gl_entry_id uuid not null references public.gl_entries(id) on delete cascade,
  account_id uuid not null references public.chart_of_accounts(id) on delete restrict,
  debit numeric(12,2) not null default 0,
  credit numeric(12,2) not null default 0,
  contact_name text, tax_code text
);

-- Merchant catalog
create table public.merchant_catalog_items (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  merchant_branch_id uuid references public.merchant_branches(id) on delete cascade,
  external_sku text, item_name text not null, category text,
  price numeric(12,2), unit text, stock_status text,
  source_type text not null default 'manual',
  raw_payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz
);

create table public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references public.merchants(id) on delete cascade,
  credential_name text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.webhooks_log (
  id uuid primary key default gen_random_uuid(),
  source text not null, event_name text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

-- Marketplace memberships
create table public.marketplace_memberships (
  id uuid primary key default gen_random_uuid(),
  trade_company_id uuid not null references public.trade_companies(id) on delete cascade,
  plan_code text not null,
  monthly_fee numeric(12,2) not null,
  status text not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz
);

-- Seed chart of accounts
insert into public.chart_of_accounts (code, name, category, normal_balance, system_account) values
  ('1000','Bank','asset','debit',true),
  ('1100','Trade Debtors','asset','debit',true),
  ('1200','VAT Control','liability','credit',true),
  ('2000','Trade Creditors','liability','credit',true),
  ('2100','PAYE/NI Control','liability','credit',true),
  ('2200','CIS Control','liability','credit',true),
  ('3000','Sales','income','credit',true),
  ('3100','Delivery Income','income','credit',true),
  ('4000','Direct Labour','expense','debit',true),
  ('4100','Driver Costs','expense','debit',true),
  ('4200','Payroll Taxes','expense','debit',true),
  ('4300','Software Income','income','credit',true),
  ('4400','Materials Recharged','income','credit',true)
on conflict (code) do nothing;

-- Triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_jobs_updated before update on public.jobs for each row execute function public.set_updated_at();
create trigger trg_quotes_updated before update on public.quotes for each row execute function public.set_updated_at();
create trigger trg_material_orders_updated before update on public.material_orders for each row execute function public.set_updated_at();
