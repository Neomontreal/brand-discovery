-- NEO · Brand Discovery — esquema de Supabase
-- Pegar completo en Supabase → SQL Editor → Run. Se puede correr de nuevo sin romper nada.

-- 1) Respuestas --------------------------------------------------------------
create table if not exists public.discovery_responses (
  id            uuid primary key,
  project       text not null check (project ~ '^[a-z0-9-]{1,60}$'),
  answers       jsonb not null default '{}'::jsonb,
  current_step  int not null default 0,
  completed     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  completed_at  timestamptz
);
create index if not exists discovery_responses_project_idx on public.discovery_responses (project, updated_at desc);

-- 2) Quién puede ver el panel (agrega tu correo aquí) -------------------------
create table if not exists public.discovery_admins (
  email text primary key
);
-- insert into public.discovery_admins (email) values ('tu-correo@ejemplo.com');

create or replace function public.is_discovery_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.discovery_admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

-- 3) Seguridad: nadie anónimo puede leer; solo los admins ---------------------
alter table public.discovery_responses enable row level security;
alter table public.discovery_admins   enable row level security;

drop policy if exists "admins leen respuestas"   on public.discovery_responses;
drop policy if exists "admins borran respuestas" on public.discovery_responses;
create policy "admins leen respuestas"   on public.discovery_responses for select to authenticated using (public.is_discovery_admin());
create policy "admins borran respuestas" on public.discovery_responses for delete to authenticated using (public.is_discovery_admin());

-- 4) El formulario guarda con esta función (no puede leer nada) ---------------
-- El id es un UUID aleatorio que solo conoce el navegador de quien responde.
create or replace function public.save_discovery(
  p_id uuid, p_project text, p_answers jsonb, p_step int, p_completed boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  if pg_column_size(p_answers) > 1000000 then
    raise exception 'Respuesta demasiado grande';
  end if;
  insert into public.discovery_responses (id, project, answers, current_step, completed, completed_at)
  values (p_id, p_project, p_answers, coalesce(p_step, 0), coalesce(p_completed, false),
          case when p_completed then now() end)
  on conflict (id) do update
    set answers      = excluded.answers,
        current_step = excluded.current_step,
        completed    = discovery_responses.completed or excluded.completed,
        completed_at = coalesce(discovery_responses.completed_at, excluded.completed_at),
        updated_at   = now()
    where discovery_responses.project = excluded.project;
end;
$$;
revoke all on function public.save_discovery(uuid, text, jsonb, int, boolean) from public;
grant execute on function public.save_discovery(uuid, text, jsonb, int, boolean) to anon, authenticated;

-- 5) Imágenes de referencia (Storage, privado, máx. 8 MB, solo imágenes) ------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('discovery', 'discovery', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "discovery subir"  on storage.objects;
drop policy if exists "discovery leer"   on storage.objects;
drop policy if exists "discovery borrar" on storage.objects;
create policy "discovery subir"  on storage.objects for insert to anon, authenticated with check (bucket_id = 'discovery');
create policy "discovery leer"   on storage.objects for select to authenticated using (bucket_id = 'discovery' and public.is_discovery_admin());
create policy "discovery borrar" on storage.objects for delete to authenticated using (bucket_id = 'discovery' and public.is_discovery_admin());
