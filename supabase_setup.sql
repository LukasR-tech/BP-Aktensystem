-- Im Supabase SQL Editor ausführen. Ausschließlich für fiktive RP-Daten.
create table if not exists public.bp_akten_state (
  id integer primary key check (id = 1),
  payload jsonb not null default '{"cases":[],"persons":[],"evidence":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.bp_akten_state enable row level security;
-- RP-Demo: Jeder Besucher mit Website-Konfiguration kann lesen/schreiben.
-- Das gemeinsame Passwort und die Ersteller-Namen sind KEINE echte Sicherheit.
drop policy if exists "RP demo read state" on public.bp_akten_state;
drop policy if exists "RP demo insert state" on public.bp_akten_state;
drop policy if exists "RP demo update state" on public.bp_akten_state;
create policy "RP demo read state" on public.bp_akten_state for select to anon using (true);
create policy "RP demo insert state" on public.bp_akten_state for insert to anon with check (id = 1);
create policy "RP demo update state" on public.bp_akten_state for update to anon using (id = 1) with check (id = 1);

grant select, insert, update on public.bp_akten_state to anon;
insert into public.bp_akten_state (id, payload) values (1, '{"cases":[],"persons":[],"evidence":[]}'::jsonb) on conflict (id) do nothing;
