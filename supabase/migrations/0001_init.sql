-- 0001_init.sql — Medinfo / HealthVault: базовая схема
-- Personal health record. RLS: каждый видит только свои данные.

-- ---------- ПРОФИЛИ ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'ru',
  created_at timestamptz not null default now()
);

-- авто-создание профиля при регистрации
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- ДОКУМЕНТЫ ----------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text,
  doc_type text not null default 'lab_numeric'
    check (doc_type in ('lab_numeric','unknown')),
  taken_at date,
  uploaded_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending','processed','failed'))
);

-- ---------- РЕЗУЛЬТАТЫ АНАЛИЗОВ ----------
create table if not exists public.lab_results (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  analyte_name text not null,
  analyte_code text,
  value numeric,
  value_text text,
  unit text,
  ref_low numeric,
  ref_high numeric,
  flag text not null default 'unknown'
    check (flag in ('normal','low','high','critical_low','critical_high','unknown')),
  explanation text,
  measured_at date
);

-- ---------- КРАСНЫЕ ФЛАГИ ----------
create table if not exists public.red_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  severity text not null check (severity in ('warn','urgent')),
  message text not null,
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- НАПОМИНАНИЯ ----------
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('retest','medication','appointment')),
  title text not null,
  notes text,
  due_at timestamptz not null,
  repeat_rule text,
  notification_id text,
  done boolean not null default false
);

-- ---------- ИНДЕКСЫ ----------
create index if not exists idx_documents_user_taken
  on public.documents (user_id, taken_at desc);
create index if not exists idx_lab_results_user_analyte_measured
  on public.lab_results (user_id, analyte_name, measured_at);
create index if not exists idx_lab_results_document
  on public.lab_results (document_id);
create index if not exists idx_red_flags_user_ack
  on public.red_flags (user_id, acknowledged);
create index if not exists idx_reminders_user_due
  on public.reminders (user_id, due_at);

-- ---------- RLS ----------
alter table public.profiles    enable row level security;
alter table public.documents   enable row level security;
alter table public.lab_results enable row level security;
alter table public.red_flags   enable row level security;
alter table public.reminders   enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid());

drop policy if exists documents_all_own on public.documents;
create policy documents_all_own on public.documents
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists lab_results_all_own on public.lab_results;
create policy lab_results_all_own on public.lab_results
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists red_flags_all_own on public.red_flags;
create policy red_flags_all_own on public.red_flags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists reminders_all_own on public.reminders;
create policy reminders_all_own on public.reminders
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- STORAGE: приватный бакет для фото документов ----------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists documents_storage_select_own on storage.objects;
create policy documents_storage_select_own on storage.objects
  for select using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists documents_storage_insert_own on storage.objects;
create policy documents_storage_insert_own on storage.objects
  for insert with check (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists documents_storage_update_own on storage.objects;
create policy documents_storage_update_own on storage.objects
  for update using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists documents_storage_delete_own on storage.objects;
create policy documents_storage_delete_own on storage.objects
  for delete using (
    bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text
  );
