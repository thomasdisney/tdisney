-- Table for storing per-user drawing sessions.
create table if not exists public.drawings (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  title text not null,
  elements jsonb not null default '[]',
  bg_image_path text,
  updated_at timestamptz not null default now(),
  unique (owner, title)
);

alter table public.drawings enable row level security;

create policy if not exists "owner select"
  on public.drawings for select
  using (owner = auth.uid());

create policy if not exists "owner insert"
  on public.drawings for insert
  with check (owner = auth.uid());

create policy if not exists "owner update"
  on public.drawings for update
  using (owner = auth.uid())
  with check (owner = auth.uid());

create policy if not exists "owner delete"
  on public.drawings for delete
  using (owner = auth.uid());

-- Trigger to enforce the three-session-per-user cap at the database level.
create or replace function public.enforce_drawing_limit()
returns trigger as $$
begin
  if (select count(*) from public.drawings where owner = new.owner) >= 3 then
    raise exception 'Limit 3 sessions per user. Delete or overwrite.' using errcode = 'P0001';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_enforce_drawing_limit on public.drawings;
create trigger trg_enforce_drawing_limit
  before insert on public.drawings
  for each row execute function public.enforce_drawing_limit();

-- Private bucket for persisted background images.
insert into storage.buckets (id, name, public) values ('drawing-images', 'drawing-images', false)
  on conflict (id) do nothing;

-- Storage policies: signed URLs only, owners can read/write their own assets.
create policy if not exists "owner can upload" on storage.objects for insert
  with check (
    bucket_id = 'drawing-images'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy if not exists "owner can update" on storage.objects for update
  using (
    bucket_id = 'drawing-images'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'drawing-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy if not exists "owner can delete" on storage.objects for delete
  using (
    bucket_id = 'drawing-images'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy if not exists "owner can read via signed url" on storage.objects for select
  using (
    bucket_id = 'drawing-images'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
  );
