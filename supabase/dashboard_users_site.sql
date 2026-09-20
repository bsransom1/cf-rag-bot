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
