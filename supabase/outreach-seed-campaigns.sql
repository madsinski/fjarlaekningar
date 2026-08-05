-- ============================================================================
-- Fjarlækningar — two starter fréttabréf drafts (herferðir)
--
-- Creates two DRAFT campaigns in the Fjarlækningar look, ready to review, edit
-- and send from /admin/outreach → Herferðir:
--   1) "Ný þjónusta"           — announcement design (NÝTT badge)
--   2) "Ný heilbrigðisstofnun" — hero design (blue header band)
--
-- The bracketed [...] parts are placeholders — swap in the real service /
-- institution name and details in the composer before sending. Nothing is
-- sent by running this; both are drafts.
--
-- Run once in the Supabase SQL editor. Requires the template column from
-- outreach-schema.sql. Safe to re-run: it won't duplicate (guarded on subject).
-- ============================================================================

insert into public.outreach_campaigns (subject, preheader, template, body)
select
  'Ný þjónusta hjá Fjarlækningum',
  'Nú getur þú leyst enn fleiri erindi í gegnum sjúklingagáttina.',
  'announcement',
  'Við hjá Fjarlækningum bætum stöðugt við þjónustuna okkar til að gera aðgengi að læknisþjónustu einfaldara og fljótlegra — óháð staðsetningu.

## [Nafn nýju þjónustunnar]

[Stutt lýsing á þjónustunni: hvað hún er og hvaða afmarkaða erindi hún leysir. T.d. „Nú getur þú sótt um endurnýjun á lyfseðli beint í gegnum sjúklingagáttina og fengið svar frá lækni innan skamms.“]

**Svona virkar það:**

- Skráðu þig inn í örugga sjúklingagátt
- Lýstu erindinu í fáeinum einföldum skrefum
- Læknir fer yfir málið og hefur samband með niðurstöðu

Þjónustan er hluti af áframhaldandi vinnu okkar við að gera heilbrigðisþjónustu aðgengilegri og skilvirkari fyrir alla.

[Opna sjúklingagátt](https://app.medalia.is/fjarlaekningar-hsu)'
where not exists (
  select 1 from public.outreach_campaigns where subject = 'Ný þjónusta hjá Fjarlækningum'
);

insert into public.outreach_campaigns (subject, preheader, template, body)
select
  'Ný heilbrigðisstofnun í samstarfi við Fjarlækningar',
  'Enn fleiri fá nú aðgang að öruggri fjarþjónustu í heimabyggð.',
  'hero',
  'Við erum stolt að tilkynna nýtt samstarf sem færir örugga fjarþjónustu til enn fleiri landsmanna.

## [Nafn heilbrigðisstofnunar]

[Stutt kynning: hvaða svæði stofnunin þjónar og hvað samstarfið þýðir fyrir íbúa. T.d. „Íbúar á [svæði] geta nú leyst einföld og afmörkuð erindi í gegnum sjúklingagátt Fjarlækninga, í samstarfi við [Nafn stofnunar].“]

**Hvað þýðir þetta fyrir þig?**

- Aðgengi að læknisþjónustu óháð staðsetningu
- Einföld og örugg samskipti í gegnum sjúklingagáttina
- Skilvirk úrlausn afmarkaðra erinda

Við höldum áfram að byggja upp aðgengilegra heilbrigðiskerfi — í samstarfi við sterkar heilbrigðisstofnanir um land allt.

[Opna sjúklingagátt](https://app.medalia.is/fjarlaekningar-hsu)'
where not exists (
  select 1 from public.outreach_campaigns where subject = 'Ný heilbrigðisstofnun í samstarfi við Fjarlækningar'
);
