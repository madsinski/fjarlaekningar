# public/sounds/cheer.mp3

Plays when an admin puts the site live from `/admin/website`
(`src/app/admin/website/celebrate.ts`).

## Source

| | |
|---|---|
| Recording | "applause-I" by *thore* |
| Via | [File:Applause i.ogg](https://commons.wikimedia.org/wiki/File:Applause_i.ogg) on Wikimedia Commons, originally from pdsounds.org |
| Licence | **Public domain** — Commons reports `Copyrighted: False`, `AttributionRequired: false` |

No attribution is required. The credit above is kept for provenance only.

## Processing

From the 17.3 s stereo 44.1 kHz original:

1. Mixed to mono.
2. Picked the loudest 2.8 s window by 100 ms RMS envelope (starts 1.8 s into the source).
3. Resampled to 22.05 kHz.
4. 40 ms fade-in, 600 ms fade-out.
5. Normalised to −1 dBFS.
6. Encoded mono MP3 at 96 kbps → 34 KB.

Verified after encoding: decodes to 2.87 s, peak 0.856 (no clipping), and an
`<audio>` element reaches `playing`.

## Replacing it

Drop a new `public/sounds/cheer.mp3` in place. Nothing else needs to change —
if the file is ever missing or unplayable, `celebrate.ts` falls back to a
synthesised cheer, so the button still celebrates.
