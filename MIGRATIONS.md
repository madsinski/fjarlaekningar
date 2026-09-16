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
| 16 | `supabase/outreach-schema.sql` | Fréttabréf — subscribers + campaigns | ⬜ run this |
| 17 | `supabase/admin-read-lockdown.sql` | Admin-module reads restricted to `admin` via RLS (legal stays admin + lawyer). Doctor data is unaffected — it goes through service-role APIs. | ✅ done |
| 18 | `supabase/hsu-schema.sql` | HSU vaktakerfi (Vestmannaeyjar) — eigin innskráning, óskir, vaktaplan, vaktamarkaður. Allar `hsu_*` töflur lokaðar vöfrum. Sjá `docs/hsu-vaktakerfi.md`. Síðari viðbætur í sömu skrá (forvakt/bakvakt, beiðnir, takmörkun innskráninga) keyrðar líka. | ✅ done (2026-09-15) |

| 19 | `supabase/sms-schema.sql` | SMS til sjúklinga — `sms_messages` skráir hverja sendingu (hver sendi, á hvaða númer, staða frá Twilio). Lokuð vöfrum. | ✅ done (2026-09-16) |

| 20 | `supabase/vinnustod-schema.sql` | Vinnustöð — notendur (eigin innskráning eins og vaktakerfið), lotur, traust tæki, spurningar/svör, tilkynningar, stillingar; `sms_messages.sent_by_gatt`. Allar `gatt_*` töflur lokaðar vöfrum. Viðbót sama dag: `gatt_threads.owner_*` (spurningar frá starfsfólki og læknum) og `gatt_messages.author_hsu`; `gatt_push_subscriptions` (tilkynningar í tæki). Sjá `docs/vinnustod.md`. | ✅ done (2026-09-16, viðbót líka) |

> After running a migration, the matching admin module works immediately (no
> redeploy needed — the tables just start returning data).

Progress on later phases (presentations, research, communication, surveys,
privacy requests, error logging, version history) is appended here as each
ships.
