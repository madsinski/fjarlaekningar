# DB migrations to run — Fjarlækningar admin

Run each SQL file **once** in the Supabase project's **SQL Editor** (Dashboard →
SQL Editor → New query → paste → Run), in order. All are idempotent. Some
modules also need a **Storage bucket** — noted inline.

| # | File | Phase / module | Status |
|---|------|----------------|--------|
| 1 | `supabase/schema.sql` | Phase 1 — staff auth + onboarding | ✅ done |
| 2 | `supabase/legal-schema.sql` | Phase 2 — Legal documents | ✅ done |
| 3 | `supabase/presentations-schema.sql` | Phase 2 — Presentations & printables | ✅ done |
| 4 | `supabase/data-requests-schema.sql` | Phase 3 — Privacy requests (GDPR) | ✅ done |
| 5 | `supabase/releases-schema.sql` | Phase 3 — Version history (releases) | ✅ done |
| 6 | `supabase/errors-schema.sql` | Phase 3 — Error logging | ✅ done |
| 7 | `supabase/communication-schema.sql` | Phase 3 — Communication (contact inbox) | ✅ done |
| 8 | `supabase/research-schema.sql` | Phase 3 — Research library | ✅ done |
| 9 | `supabase/surveys-schema.sql` | Phase 3 — Surveys | ✅ done |
| 10 | `supabase/legal-approval-schema.sql` | Legal approval workflow + green tick | ✅ done |
| 11 | `supabase/clinical-protocols-schema.sql` | Clinical algorithm change log (medical-device) | ✅ done |
| 12 | `supabase/presentations-studio-schema.sql` | Presentation deck studio + A4 collateral (ported from Lifeline) — also creates the `presentation-assets` storage bucket | ✅ done |
| 13 | `supabase/signatures-schema.sql` | Email signatures | ✅ done |
| 14 | `supabase/site-content-schema.sql` | Website CMS (site content, draft/publish) | ✅ done |
| 15 | `supabase/site-settings-schema.sql` | Coming-soon gate toggle (site_settings) | ✅ done |
| 16 | `supabase/outreach-schema.sql` | Fréttabréf — subscribers + campaigns. `outreach-seed-campaigns.sql` (tvö drög að herferðum) keyrt líka. | ✅ done (staðfest 2026-09-20 — hafði verið keyrt fyrr en var rangt merkt hér) |
| 17 | `supabase/admin-read-lockdown.sql` | Admin-module reads restricted to `admin` via RLS (legal stays admin + lawyer). Doctor data is unaffected — it goes through service-role APIs. | ✅ done |
| 18 | `supabase/hsu-schema.sql` | HSU vaktakerfi (Vestmannaeyjar) — eigin innskráning, óskir, vaktaplan, vaktamarkaður. Allar `hsu_*` töflur lokaðar vöfrum. Sjá `docs/hsu-vaktakerfi.md`. Síðari viðbætur í sömu skrá (forvakt/bakvakt, beiðnir, takmörkun innskráninga) keyrðar líka. | ✅ done (2026-09-15) |

| 19 | `supabase/sms-schema.sql` | SMS til sjúklinga — `sms_messages` skráir hverja sendingu (hver sendi, á hvaða númer, staða frá Twilio). Lokuð vöfrum. | ✅ done (2026-09-16) |

| 20 | `supabase/vinnustod-schema.sql` | Vinnustöð — notendur (eigin innskráning eins og vaktakerfið), lotur, traust tæki, spurningar/svör, tilkynningar, stillingar; `sms_messages.sent_by_gatt`. Allar `gatt_*` töflur lokaðar vöfrum. Viðbót sama dag: `gatt_threads.owner_*` (spurningar frá starfsfólki og læknum) og `gatt_messages.author_hsu`; `gatt_push_subscriptions` (tilkynningar í tæki); `gatt_presence` (hver er við). Sjá `docs/vinnustod.md`. | ✅ done (2026-09-16, viðbót líka) |

| 21 | `supabase/hsu-schema.sql` (viðbót) | Tungumál og innleiðing: `hsu_doctors.lang` (`is`/`en`, viðmót og tölvupóstar) og `hsu_doctors.onboarding` (hvað notandinn hefur séð — kynning og leiðarvísir). Sjá `docs/hsu-i18n.md`. | ✅ done (2026-09-17) |

| 22 | `supabase/hsu-schema.sql` (viðbót) | Tilkynningar í tölvupósti: `hsu_settings.email_prefs` (flokkur → strax/samantekt/slökkt) og `hsu_notifications.category`. Sjá „Tilkynningar“ í `docs/hsu-vaktakerfi.md`. | ✅ done (2026-09-17) |

| 23 | `supabase/hsu-schema.sql` (viðbót) | Tölvupóstval hvers læknis: `hsu_doctors.email_prefs` (Mín síða → Stillingar); `hsu_settings.email_prefs` ekki lengur notað. | ✅ done (2026-09-18) |

| 24 | `supabase/evaluation-schema.sql` | Service evaluation — `evaluation_months` (one row per station per month, aggregates only: every column is a count, nothing traceable to a person), `evaluation_documents` and the private `research-docs` storage bucket. Drops the short-lived Icelandic `arangur_manudir`, guarded by a row check that raises rather than destroys. See `docs/evaluation.md`. | ✅ done (2026-09-20) |
| 25 | `supabase/evaluation-modules-2.sql` | Columns for the second wave of research modules — clinician effort, home tests, image adequacy, reach and equity, demand pattern, out-of-hours, did-not-attend, diagnostic concordance, follow-up adherence, implementation cost. All nullable. | ✅ done (2026-09-20) |
| 26 | `supabase/evaluation-exclusions.sql` | Turning away separated from referring onward — `excluded_by_doctor` (subset of `cases_referred`) and `exclusion_reasons` jsonb covering both gates. Drops the unused `screening_reasons`. Reason ids are fixed in `src/lib/evaluation/exclusions.ts` and derive from the service's own triage rules. | ✅ done (2026-09-20) |
| 27 | `supabase/evaluation-template-v2.sql` | Match the export Medalia can actually produce — drops `referred_primary_care/specialist/other/urgent` and the entry-route detail, renames `entry_nurse` to `entry_via_staff`. Urgency is recovered from the exclusion-reasons file (gate=clinician, reason=acute), which is reason-coded rather than a bare flag. | ✅ done (2026-09-20) |

| 37 | `supabase/roster-schema.sql` | Vaktakerfi Fjarlækninga — `roster_doctors`, `roster_settings`, `roster_shifts`, `roster_swaps`. Undir *Starfsfólk* → Vaktakerfi (`/admin/roster`). Athugið: þetta er mönnun **okkar** þjónustu; `hsu_*` er gæsluvaktakerfi HSU-lækna og óskylt. | ✅ done (staðfest 2026-09-20) |
| 37 | `supabase/roster-preferences-schema.sql` | Vaktaóskir, fyrri hluti — `roster_doctors.max_shifts_per_month`, `allowed_weekdays`, `shift_note`, `prefs_updated_at`. | ✅ done (staðfest 2026-09-20) |
| 37 | `supabase/roster-absences-schema.sql` | Vaktaóskir, seinni hluti — `roster_doctor_absences` (frí) og `roster_doctors.preferred_run_length`. Fimm API-leiðir fyrir `/vaktir` óskir og stjórnborð vaktakerfisins reiða sig á töfluna. | ✅ done (2026-09-20) |
| 37 | `supabase/google-calendar-schema.sql` | Google-dagatalssamstilling fyrir vaktir. Sjá `docs/google-dagatal.md`. | ✅ done (staðfest 2026-09-20) |
| 37 | `supabase/staff-billing-schema.sql` | Reikningar starfsfólks (`/admin/invoices`). | ✅ done (staðfest 2026-09-20) |
| 37 | `supabase/contractor-invoice-void-fix.sql` | Lagfæring á ógildingu verktakareikninga. | ✅ done (staðfest 2026-09-20) |
| 37 | `supabase/staff-contracts-schema.sql` | Ráðningarsamningar starfsfólks. | ✅ done (staðfest 2026-09-20) |
| 37 | `supabase/staff-documents-schema.sql` | Skjöl starfsfólks. | ✅ done (staðfest 2026-09-20) |
| 37 | `supabase/stofnanir-schema.sql` | Samstarfsstofnanir — `partner_pages`, deilt um `/samstarf/<slug>`. | ✅ done (staðfest 2026-09-20) |
| 37 | `supabase/thjonustukonnun.sql` | AI-samantekt á þjónustukönnunum — `survey_ai_summaries`. | ✅ done (staðfest 2026-09-20) |

> After running a migration, the matching admin module works immediately (no
> redeploy needed — the tables just start returning data).

Progress on later phases (presentations, research, communication, surveys,
privacy requests, error logging, version history) is appended here as each
ships.

## Staða — staðfest 2026-09-20

**Engin ókeyrð migration.** Allar schema-skrár eru keyrðar: hver tafla úr
`create table if not exists` og hver dálkur úr `add column if not exists` er til
í grunninum.

Ef listinn skolast til aftur, staðfestu svona frekar en að treysta hökunum:

```sql
select table_name from information_schema.tables where table_schema = 'public';
select table_name, column_name from information_schema.columns where table_schema = 'public';
```

og berðu saman við `create table if not exists public.<nafn>` og
`alter table public.<tafla> add column if not exists <dálkur>` í `supabase/*.sql`.
**Athugaðu dálkana líka, ekki bara töflurnar** — skrá getur verið hálfkeyrð, og
töflusamanburður einn gefur þá ranglega grænt.
