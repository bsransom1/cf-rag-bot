-- Add site scoping for dashboard reviewers (CodiceFiscale Auth project).
-- Safe to re-run.

alter table public.dashboard_users
  add column if not exists site text;

update public.dashboard_users
set site = 'CF'
where site is null or site = '';

alter table public.dashboard_users
  alter column site set default 'CF';

alter table public.dashboard_users
  alter column site set not null;

alter table public.dashboard_users
  drop constraint if exists dashboard_users_site_check;

alter table public.dashboard_users
  add constraint dashboard_users_site_check
  check (site in ('CF', 'italian-notary'));

-- Allow one login to open both dashboards (one row per site).
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.dashboard_users'::regclass
      and contype = 'p'
      and pg_get_constraintdef(oid) not like '%site%'
  ) then
    alter table public.dashboard_users drop constraint dashboard_users_pkey;
    alter table public.dashboard_users add primary key (user_id, site);
  end if;
end $$;

drop policy if exists "dashboard_select_sessions" on public.chat_sessions;
create policy "dashboard_select_sessions"
  on public.chat_sessions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.dashboard_users du
      where du.user_id = auth.uid()
        and du.site = 'CF'
    )
  );

drop policy if exists "dashboard_delete_sessions" on public.chat_sessions;
create policy "dashboard_delete_sessions"
  on public.chat_sessions
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.dashboard_users du
      where du.user_id = auth.uid()
        and du.site = 'CF'
    )
  );

drop policy if exists "dashboard_select_messages" on public.chat_messages;
create policy "dashboard_select_messages"
  on public.chat_messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.dashboard_users du
      where du.user_id = auth.uid()
        and du.site = 'CF'
    )
  );

drop policy if exists "dashboard_delete_messages" on public.chat_messages;
create policy "dashboard_delete_messages"
  on public.chat_messages
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.dashboard_users du
      where du.user_id = auth.uid()
        and du.site = 'CF'
    )
  );
