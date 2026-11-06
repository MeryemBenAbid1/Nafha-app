-- Optional: lets the app server sign in as a 'server' account instead of using the service_role key.
-- Create the account (Authentication > Users > Add user), then: update profiles set role = 'server' where email = '...';
alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('technician', 'expert', 'brand', 'admin', 'server'));

create function is_server() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'server');
$$;

create policy "server all" on profiles for all to authenticated using (is_server()) with check (is_server());
create policy "server all" on lots for all to authenticated using (is_server()) with check (is_server());
create policy "server all" on devices for all to authenticated using (is_server()) with check (is_server());
create policy "server all" on nonces for all to authenticated using (is_server()) with check (is_server());
create policy "server all" on readings for all to authenticated using (is_server()) with check (is_server());
create policy "server all" on verdicts for all to authenticated using (is_server()) with check (is_server());
create policy "server all" on certificates for all to authenticated using (is_server()) with check (is_server());
create policy "server all" on batches for all to authenticated using (is_server()) with check (is_server());
create policy "server all" on nfc_tags for all to authenticated using (is_server()) with check (is_server());
create policy "server all" on seal_taps for all to authenticated using (is_server()) with check (is_server());
create policy "server all" on reference_library for all to authenticated using (is_server()) with check (is_server());
