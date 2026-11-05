-- Nafha database. Paste this whole file into Supabase > SQL Editor > New query, then press Run.
-- It is safe to run on a fresh project. Running it twice will fail on "already exists"; that's fine.

-- People and roles ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  role text not null default 'technician' check (role in ('technician', 'expert', 'brand', 'admin')),
  created_at timestamptz not null default now()
);

-- When someone signs up, give them a profile. They may pick technician, expert or brand on the
-- sign-up form (fine for a capstone demo). Nobody can make themselves admin: set that in the table editor.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, role)
  values (
    new.id,
    new.email,
    case when new.raw_user_meta_data->>'role' in ('technician', 'expert', 'brand')
         then new.raw_user_meta_data->>'role' else 'technician' end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Products ---------------------------------------------------------------------------------

create table lots (
  code text primary key,                 -- e.g. LOT-0042, printed on the label
  product text not null,                 -- e.g. "Cambodian oud oil, 3 ml"
  brand text not null,
  origin text,
  created_by uuid references profiles,
  created_at timestamptz not null default now()
);

-- Devices ----------------------------------------------------------------------------------

create table devices (
  id text primary key,                   -- matches deviceId in the record, e.g. NFH-01
  name text,
  public_key text not null,              -- P-256 public key, hex. From the ATECC608, or make-device-key.mjs
  last_counter integer not null default -1,  -- the highest counter seen, so an old record can't be replayed
  active_lot_code text references lots,  -- the lot the technician is testing right now
  created_at timestamptz not null default now()
);

-- One-time nonces: the device asks for one before each sniff and puts it in the signed record,
-- so an old recording can't be passed off as a new sniff (report FR-FW-03).
create table nonces (
  nonce text primary key,
  device_id text not null references devices,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Sniffs and results -----------------------------------------------------------------------

create table readings (
  id uuid primary key default gen_random_uuid(),
  test_id text unique not null,
  device_id text not null references devices,
  lot_code text references lots,
  counter integer not null,
  captured_at timestamptz not null,
  record jsonb not null,                 -- the whole signed record, exactly as the device sent it
  record_hash text not null,             -- SHA-256 of the record without sig; this goes in the Merkle tree
  created_at timestamptz not null default now()
);

create table verdicts (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null references readings on delete cascade,
  label text not null check (label in ('GENUINE', 'DILUTED', 'SYNTHETIC', 'UNKNOWN')),
  confidence real,
  model_version text,
  details jsonb,                         -- what the model service returned (neighbours, distance, qc...)
  status text not null default 'auto' check (status in ('auto', 'needs_review', 'confirmed')),
  reviewed_by uuid references profiles,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table certificates (
  id text primary key,                   -- short code in the QR link: /c/<id>
  verdict_id uuid not null references verdicts on delete cascade,
  lot_code text references lots,
  batch_root text,                       -- filled in when the batch is anchored on chain
  anchor_tx text,                        -- the transaction hash of that anchor
  created_at timestamptz not null default now()
);

create table reference_library (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null references readings,
  class text not null,                   -- G-A, G-B, D50, D25, SYN, ... (the ML class IDs)
  added_by uuid references profiles,
  created_at timestamptz not null default now()
);

-- Security ---------------------------------------------------------------------------------
-- Logged-in staff can read everything. All writes go through the server (ingest route and server
-- actions), which checks the role first and uses the service key. The public buyer page also reads
-- through the server, so anonymous visitors get nothing straight from the database.

alter table profiles enable row level security;
alter table lots enable row level security;
alter table devices enable row level security;
alter table nonces enable row level security;
alter table readings enable row level security;
alter table verdicts enable row level security;
alter table certificates enable row level security;
alter table reference_library enable row level security;

create policy "staff read" on profiles for select to authenticated using (true);
create policy "staff read" on lots for select to authenticated using (true);
create policy "staff read" on devices for select to authenticated using (true);
create policy "staff read" on readings for select to authenticated using (true);
create policy "staff read" on verdicts for select to authenticated using (true);
create policy "staff read" on certificates for select to authenticated using (true);
create policy "staff read" on reference_library for select to authenticated using (true);

-- Live updates on the technician screen.
alter publication supabase_realtime add table readings, verdicts;
