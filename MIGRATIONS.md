# DB migrations to run — Fjarlækningar admin

Run each SQL file **once** in the Supabase project's **SQL Editor** (Dashboard →
SQL Editor → New query → paste → Run), in order. All are idempotent. Some
modules also need a **Storage bucket** — noted inline.

| # | File | Phase / module | Status |
|---|------|----------------|--------|
| 1 | `supabase/schema.sql` | Phase 1 — staff auth + onboarding | ✅ done |
| 2 | `supabase/legal-schema.sql` | Phase 2 — Legal documents | ⬜ run this |
| 3 | `supabase/presentations-schema.sql` | Phase 2 — Presentations & printables | ⬜ run this |
| 4 | `supabase/data-requests-schema.sql` | Phase 3 — Privacy requests (GDPR) | ⬜ run this |
| 5 | `supabase/releases-schema.sql` | Phase 3 — Version history (releases) | ⬜ run this |
| 6 | `supabase/errors-schema.sql` | Phase 3 — Error logging | ⬜ run this |
| 7 | `supabase/communication-schema.sql` | Phase 3 — Communication (contact inbox) | ⬜ run this |
| 8 | `supabase/research-schema.sql` | Phase 3 — Research library | ⬜ run this |
| 9 | `supabase/surveys-schema.sql` | Phase 3 — Surveys | ⬜ run this |

> After running a migration, the matching admin module works immediately (no
> redeploy needed — the tables just start returning data).

Progress on later phases (presentations, research, communication, surveys,
privacy requests, error logging, version history) is appended here as each
ships.
