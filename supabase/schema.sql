-- =============================================================================
-- CF RAG bot — Supabase schema
--
-- Run this once in the Supabase SQL editor (or via `supabase db push`) on a
-- new project. It is idempotent and safe to re-run.
--
-- Dimensions (1536) match OpenAI's `text-embedding-3-small` model used by
-- lib/ai/client.ts. If you swap models, update both places.
--
-- NOTE: `match_documents` takes a single `jsonb` payload so PostgREST always
-- resolves one unambiguous function. Multi-argument vector RPCs often fail
-- with: "Could not find the function ... in the schema cache".
-- =============================================================================

create extension if not exists vector;

-- Drop legacy overloads from earlier iterations / other projects.
do $$
declare
  r record;
begin
  for r in
    select pg_catalog.pg_get_function_identity_arguments(p.oid) as args
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'match_documents'
  loop
    execute format(
      'drop function if exists public.match_documents(%s) cascade',
      r.args
    );
  end loop;
end $$;

create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  project_id    text not null,
  section       text not null,
  category      text not null,
  tags          text[] not null default '{}',
  question      text not null,
  answer        text not null,
  plain_english text,
  content       text not null,
  embedding     vector(1536) not null,
  created_at    timestamptz not null default now()
);

create index if not exists documents_project_idx
  on public.documents (project_id);

-- IVFFlat index for fast cosine similarity search. `lists = 100` is a good
-- default; tune upward as the dataset grows (rule of thumb: sqrt(#rows)).
create index if not exists documents_embedding_idx
  on public.documents
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- -----------------------------------------------------------------------------
-- Row Level Security
--
-- We lock down writes entirely (the ingest script uses the service-role key
-- which bypasses RLS). We expose reads only via the `match_documents` RPC
-- below, which runs with SECURITY DEFINER so anon callers don't need a
-- direct select policy.
-- -----------------------------------------------------------------------------
alter table public.documents enable row level security;

-- No SELECT / INSERT / UPDATE / DELETE policies are created on purpose.
-- Anon / authenticated roles cannot touch the table directly.

-- -----------------------------------------------------------------------------
-- RPC: match_documents(p_match_args jsonb)
--
-- Expected JSON shape (keys inside p_match_args):
--   query_embedding: number[]  (length 1536)
--   match_count:     int
--   p_project_id:    string | null
--   min_similarity:  number (0..1 cosine similarity)
-- -----------------------------------------------------------------------------
create or replace function public.match_documents(p_match_args jsonb)
returns table (
  id uuid,
  project_id text,
  section text,
  category text,
  tags text[],
  question text,
  answer text,
  plain_english text,
  content text,
  similarity double precision
)
language sql
stable
security definer
-- Supabase often installs pgvector under `extensions`; without this, casts to
-- `vector` can fail with: type "public.vector" does not exist.
set search_path = public, extensions
as $$
  with args as (
    select
      (p_match_args->'query_embedding')::text::vector(1536) as qemb,
      greatest(coalesce((p_match_args->>'match_count')::int, 3), 1) as lim,
      nullif(p_match_args->>'p_project_id', '')::text as pid,
      coalesce((p_match_args->>'min_similarity')::double precision, 0.0) as simin
  )
  select
    d.id,
    d.project_id,
    d.section,
    d.category,
    d.tags,
    d.question,
    d.answer,
    d.plain_english,
    d.content,
    (1 - (d.embedding <=> args.qemb))::double precision as similarity
  from public.documents d, args
  where (args.pid is null or d.project_id = args.pid)
    and (1 - (d.embedding <=> args.qemb)) >= args.simin
  order by d.embedding <=> args.qemb asc
  limit (select lim from args);
$$;

grant execute on function public.match_documents(jsonb)
  to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Chat logging & dashboard (transcripts)
--
-- Inserts use the Supabase service-role key from /api/chat (bypasses RLS).
-- Dashboard users (rows in dashboard_users) may read/delete transcripts via
-- the anon key + logged-in JWT.
--
-- First-time setup: after Auth is enabled, invite Sarah (or create the user),
-- copy her uuid from auth.users, then:
--   insert into public.dashboard_users (user_id) values ('<uuid>');
--
-- App routes: /login, /auth/callback, /dashboard (see README § Chat dashboard).
-- -----------------------------------------------------------------------------

create table if not exists public.chat_sessions (
  id            uuid primary key,
  project_id    text not null,
  started_at    timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index if not exists chat_sessions_project_idx
  on public.chat_sessions (project_id);

create index if not exists chat_sessions_last_message_idx
  on public.chat_sessions (last_message_at desc);

create table if not exists public.chat_messages (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.chat_sessions (id) on delete cascade,
  project_id    text not null,
  role          text not null check (role in ('user', 'assistant')),
  content       text not null,
  created_at    timestamptz not null default now(),
  client_message_id text
);

create index if not exists chat_messages_session_idx
  on public.chat_messages (session_id, created_at);

create index if not exists chat_messages_project_idx
  on public.chat_messages (project_id, created_at desc);

create unique index if not exists chat_messages_session_client_id_unique
  on public.chat_messages (session_id, client_message_id)
  where client_message_id is not null;

create table if not exists public.dashboard_users (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now()
);

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.dashboard_users enable row level security;

-- Dashboard operators can see that their own uid is allowlisted.
create policy "dashboard_users_select_own"
  on public.dashboard_users
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "dashboard_select_sessions"
  on public.chat_sessions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.dashboard_users du
      where du.user_id = auth.uid()
    )
  );

create policy "dashboard_delete_sessions"
  on public.chat_sessions
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.dashboard_users du
      where du.user_id = auth.uid()
    )
  );

create policy "dashboard_select_messages"
  on public.chat_messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.dashboard_users du
      where du.user_id = auth.uid()
    )
  );

create policy "dashboard_delete_messages"
  on public.chat_messages
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.dashboard_users du
      where du.user_id = auth.uid()
    )
  );

grant select, delete on table public.chat_sessions to authenticated;
grant select, delete on table public.chat_messages to authenticated;
grant select on table public.dashboard_users to authenticated;

-- Called from Next.js with the service-role key only.
create or replace function public.upsert_chat_session(
  p_session_id uuid,
  p_project_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.chat_sessions (id, project_id, started_at, last_message_at)
  values (p_session_id, p_project_id, now(), now())
  on conflict (id) do update
    set last_message_at = excluded.last_message_at,
        project_id      = excluded.project_id;
end;
$$;

revoke all on function public.upsert_chat_session(uuid, text) from public;
grant execute on function public.upsert_chat_session(uuid, text) to service_role;
