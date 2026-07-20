-- ============================================================================
-- Fjarlækningar admin — Website content (CMS)
--
-- One row per page. `draft` is what the editor autosaves; `published` is what
-- the public site renders. Both are shaped { "is": {field:val,...}, "en":{...} }.
-- The public page reads `published` via the service role (server-side), so no
-- anon policy is needed. All writes go through /api/admin/site-content/*.
--
-- Run once in the Supabase SQL editor. Idempotent. Requires Phase 1 helpers.
-- ============================================================================

create table if not exists public.site_content (
  page          text        primary key,
  draft         jsonb       not null default '{}'::jsonb,
  published     jsonb,
  updated_at    timestamptz not null default now(),
  published_at  timestamptz,
  updated_by    uuid        references public.staff(id) on delete set null
);

alter table public.site_content enable row level security;

drop policy if exists site_content_staff_read on public.site_content;
create policy site_content_staff_read on public.site_content
  for select to authenticated
  using (public.is_active_staff());

drop policy if exists site_content_block_writes on public.site_content;
create policy site_content_block_writes on public.site_content
  for all using (false) with check (false);
