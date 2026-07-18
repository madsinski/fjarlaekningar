# Fjarlækningar admin — setup (Phase 1)

The `/admin` area is a **staff-only** control panel (admin + team members — no
patient/public accounts). Phase 1 ships the foundation: footer link → login →
MFA → staff onboarding → dashboard, team management, settings. Later phases add
legal docs, presentations/printables, research, communication, surveys, privacy
requests, error logging, and version history.

It runs on its **own dedicated Supabase project** (separate login + data from
lifeline). You provision that project once; everything else is already wired.

## 1. Create the Supabase project

1. In the Supabase dashboard, create a **new project** — ideally in the **same
   organization** as lifeline so it shares the plan (marginal cost only; see
   supabase.com/pricing).
2. Project Settings → **API**, copy: Project URL, `anon` public key,
   `service_role` secret key.

## 2. Set env vars

Add these in **Vercel** (project `fjarlaekningar`, all environments) and in a
local `.env.local` (copy from `.env.local.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...          # public anon key
SUPABASE_SERVICE_ROLE_KEY=...              # SECRET, server only
NEXT_PUBLIC_SITE_URL=https://www.fjarlaekningar.is
```

## 3. Create the schema

In the Supabase project's **SQL editor**, paste and run
[`supabase/schema.sql`](supabase/schema.sql). Idempotent — safe to re-run.

## 4. Enable MFA (TOTP) in Supabase

Dashboard → **Authentication → Providers / MFA** → enable **TOTP**. The admin
gate requires AAL2, so every staff member enrolls an authenticator app on first
login.

## 5. Seed the first admin (mads@fjarlaekningar.is)

There's no admin yet to invite the first one, so run the bootstrap script once
(reads `.env.local`):

```bash
node scripts/seed-admin.mjs
```

It sends an invite email to `mads@fjarlaekningar.is` and inserts the matching
`staff` row (role=admin). Override with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_NAME`.

## 6. First login

1. Open the invite email → land on `/admin/login` → set a password.
2. Enroll MFA (scan the QR in Google Authenticator / Authy / 1Password).
3. Accept the onboarding agreements.
4. You're in. Invite the rest of the team from **Starfsfólk** (Team).

## Notes

- The footer of fjarlaekningar.is has a **Stjórnborð** link → `/admin`.
- `/admin` bypasses the `COMING_SOON` wall (its own auth gate protects it).
- Adding staff: **Starfsfólk → Bjóða nýjum starfsmanni** (admins only). Each
  invitee gets an email, sets a password, enrolls MFA, and onboards.
- Required onboarding agreements live in `src/lib/staff-agreements.ts` — bump a
  `version` there to force re-acceptance.
