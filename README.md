# Fjarlækningar ehf.

Website for Fjarlækningar ehf. — telemedicine service in Iceland. Patient bookings and consultations are handled through the sjúklingagátt (patient portal).

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4 (PostCSS plugin)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Structure

```
src/
  app/
    layout.tsx          # Root layout, Navbar, Footer
    page.tsx            # Home
    globals.css         # Tailwind v4 + theme tokens
    thjonusta/          # Services
    um-okkur/           # About us
    hafa-samband/       # Contact
    components/
      Navbar.tsx
      Footer.tsx
      Logo.tsx
      PortalButton.tsx
```

## Patient portal (sjúklingagátt)

`PortalButton.tsx` is a plain link to the portal URL — there is no SDK and no
widget hydration (the previous README described the lifeline setup, which this
repo never actually used).

**Naming:** user-facing copy says "sjúklingagátt Fjarlækninga", or plainly
"sjúklingagátt". The vendor name is not used anywhere a patient can see. The one
place it survives is the `PORTAL_URL` value itself, because that is the real
address patients are sent to and cannot be renamed from here.

## Deployment

Deployed via Vercel — project `madsinskis-projects/fjarlaekningar`.

- Production: https://fjarlaekningar.vercel.app
- Auto-deploy: pushes to `main` deploy to production; other branches and PRs get preview URLs (GitHub → Vercel integration).
- Custom domain: `www.fjarlaekningar.is` — not yet attached. Once DNS is ready:
  `vercel domains add www.fjarlaekningar.is fjarlaekningar`
