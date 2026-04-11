# Fjarlækningar ehf.

Website for Fjarlækningar ehf. — telemedicine service in Iceland. Patient bookings and consultations are handled through the Medalia patient portal (same integration as lifeline-website).

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4 (PostCSS plugin)
- Medalia SDK loaded via `<Script>` in `layout.tsx`

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
    layout.tsx          # Root layout, Medalia SDK, Navbar, Footer
    page.tsx            # Home
    globals.css         # Tailwind v4 + theme tokens
    thjonusta/          # Services
    um-okkur/           # About us
    hafa-samband/       # Contact
    components/
      Navbar.tsx
      Footer.tsx
      Logo.tsx
      MedaliaButton.tsx
```

## Medalia integration

`MedaliaButton.tsx` renders a button with class `medalia-widget` and a `data-src` pointing to the patient portal URL. The Medalia SDK (`https://app.medalia.is/sdk.js`), loaded in `layout.tsx`, hydrates these buttons so clicks open the portal.

**TODO:** Replace `MEDALIA_PORTAL_URL` in `MedaliaButton.tsx` with the Fjarlækningar-specific portal instance once it has been provisioned.

## Deployment

Deployed via Vercel. The domain `www.fjarlaekningar.is` should be attached to the Vercel project once DNS is ready.
