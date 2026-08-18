-- ============================================================================
-- Admin read-lockdown: only stjórnandi (admin) may read admin-module tables via
-- the browser (RLS) client. Previously any active staff could. The doctor
-- account/roster reads all go through the service-role API (which bypasses RLS),
-- so doctors keep their own data. Public/anon read policies (published surveys,
-- published partner pages, site content) are left untouched.
--
-- Legal stays readable by admins AND lawyers via is_legal_staff().
-- Run once in the Supabase SQL editor. Requires is_admin_staff() (schema.sql).
-- ============================================================================

create or replace function public.is_legal_staff() returns boolean
  language sql security definer stable set search_path = public as $fn$
  select exists (select 1 from public.staff where id = auth.uid() and active and role in ('admin', 'lawyer'))
$fn$;

-- Admin-only reads
alter policy clinical_protocols_staff_read        on public.clinical_protocols        using (public.is_admin_staff());
alter policy clinical_protocol_changes_staff_read on public.clinical_protocol_changes using (public.is_admin_staff());
alter policy data_requests_staff_read             on public.data_requests             using (public.is_admin_staff());
alter policy email_signatures_staff_read          on public.email_signatures          using (public.is_admin_staff());
alter policy presentations_staff_read_all         on public.presentations             using (public.is_admin_staff());
alter policy app_errors_staff_read                on public.app_errors                using (public.is_admin_staff());
alter policy research_notes_staff_read            on public.research_notes            using (public.is_admin_staff());
alter policy contact_messages_staff_read          on public.contact_messages          using (public.is_admin_staff());
alter policy site_content_staff_read              on public.site_content              using (public.is_admin_staff());
alter policy partner_pages_staff_read_all         on public.partner_pages             using (public.is_admin_staff());
alter policy presentation_decks_staff_read        on public.presentation_decks        using (public.is_admin_staff());
alter policy presentation_collateral_staff_read   on public.presentation_collateral   using (public.is_admin_staff());
alter policy roster_doctors_staff_read            on public.roster_doctors            using (public.is_admin_staff());
alter policy roster_settings_staff_read           on public.roster_settings           using (public.is_admin_staff());
alter policy roster_shifts_staff_read             on public.roster_shifts             using (public.is_admin_staff());
alter policy roster_swaps_staff_read              on public.roster_swaps              using (public.is_admin_staff());
alter policy surveys_staff_read_all               on public.surveys                   using (public.is_admin_staff());
alter policy survey_responses_staff_read          on public.survey_responses          using (public.is_admin_staff());
alter policy subscribers_staff_read               on public.subscribers               using (public.is_admin_staff());
alter policy outreach_campaigns_staff_read        on public.outreach_campaigns        using (public.is_admin_staff());

-- Legal: admins + lawyers
alter policy legal_docs_staff_read_all            on public.legal_documents           using (public.is_legal_staff());
alter policy legal_versions_staff_read            on public.legal_document_versions   using (public.is_legal_staff());
