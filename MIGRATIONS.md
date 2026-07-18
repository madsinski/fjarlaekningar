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
| 10 | `supabase/legal-approval-schema.sql` | Legal approval workflow + green tick | ⬜ run this |
| 11 | `supabase/clinical-protocols-schema.sql` | Clinical algorithm change log (medical-device) | ⬜ run this |
| 12 | `supabase/presentations-studio-schema.sql` | Presentation deck studio + A4 collateral (ported from Lifeline) — also creates the `presentation-assets` storage bucket | ⬜ run this |

> After running a migration, the matching admin module works immediately (no
> redeploy needed — the tables just start returning data).

Progress on later phases (presentations, research, communication, surveys,
privacy requests, error logging, version history) is appended here as each
ships.
