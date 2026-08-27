-- ============================================================================
-- Leiðrétting: ógiltur reikningur mátti ekki loka mánuðinum.
--
-- Skilyrðið unique (staff_id, period_year, period_month) tók ekki tillit til
-- stöðu. Ógilti stjórnandi reikning — eina leiðin til að leiðrétta hann — sat
-- línan eftir og enginn nýr reikningur varð gefinn út fyrir þann mánuð. Aldrei.
--
-- Hlutaskilyrði leysir hvort tveggja: í mesta lagi EINN virkur reikningur á
-- mánuði, en ógiltir mega vera fleiri og lifa áfram. Það er ekki bara þægilegt
-- heldur rétt bókhald: útgefið reikningsnúmer þarf að standa fyrir sínu, líka
-- þegar það var ógilt.
-- ============================================================================

alter table public.contractor_invoices
  drop constraint if exists contractor_invoices_staff_id_period_year_period_month_key;

create unique index if not exists contractor_invoices_live_period_uidx
  on public.contractor_invoices (staff_id, period_year, period_month)
  where status <> 'void';
