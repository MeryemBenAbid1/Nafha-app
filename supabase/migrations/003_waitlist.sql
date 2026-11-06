-- Waitlist for demand validation: people who want Nafha (buyers, sellers, perfume houses).
-- Written only by the app server (server account or service key); no public read or write.
create table waitlist (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text,
  contact text not null,
  role text not null check (role in ('buyer', 'seller', 'perfume_house', 'other')),
  source text,
  note text
);
alter table waitlist enable row level security;
create policy "server all" on waitlist for all to authenticated using (is_server()) with check (is_server());
create policy "admin read" on waitlist for select to authenticated
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
