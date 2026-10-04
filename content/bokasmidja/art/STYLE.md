# Illustration brief — Bókasmiðjan picture books

These pictures go into a real picture book that a family reads on a tablet and
prints. They are hand-written SVG. Aim for the quality of a published modern
picture book: confident shapes, clear staging, warmth and humour.

## The look
- Flat colour with soft gradients; no outlines around shapes. Big, simple,
  rounded forms. Faces are large and readable: big eyes, clear eyebrows, a
  mouth that shows the feeling. Emotion is the point of every picture.
- Every picture fills the whole canvas with a painted setting (sea, cave,
  forest, sky). No empty white space. Depth comes from layers: background,
  far scenery, middle ground, the hero, foreground details.
- The hero is large — roughly a third to half of the picture width — and is the
  first thing the eye lands on. One clear moment per picture; pose and
  expression tell what is happening without the text.
- Add two or three small lively details a child will point at (a startled
  crab, a snail, bubbles, a bird losing a feather). Not clutter.
- The funny parts (farts, sneezes, a poop tornado) are drawn with joy and
  cartoon exaggeration — swirls, puffs, stars, speed lines — never gross or
  realistic. A poop tornado is a cheerful brown swirl with a few flying toilet
  rolls, not anything a parent would wince at.
- No text, letters or numbers anywhere in a picture. Sound effects live in the
  story text.
- The last picture of each story is calm and sleepy: night colours, soft light.

## The heroes — must be identical on every page
Read the two character sheets and reuse their shapes and exact colours. Change
pose, direction and expression; do not change the design.

- **The White Whale** (`art/whale-sheet.svg`): a round, chubby white whale.
  Body gradient white `#ffffff` to pale blue `#c9dcec`; belly shade `#b9cfe3`
  with two curved grooves; fins `#eef5fb` to `#bcd2e6`; a two-lobed tail; one
  flipper; small grey blowhole; one large eye (white, dark pupil `#1d2b3a`,
  white highlight); a pink cheek `#f8b9c6`; a small eyebrow; a curved smile.
- **Teddy the bear** (`art/bear-sheet.svg`): a round teddy-bear of a bear. Fur
  `#b9783f` to `#8f5626`; cream muzzle, belly, inner ears and paw pads
  `#e9c79b`; dark nose and mouth `#2b1d14`; pink cheeks `#f2a08a`; round ears;
  a short stumpy round tail; and always his red neckerchief `#e63946`.

## Technical rules (the app enforces these)
- Root element exactly: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">`
- Allowed elements only: svg, g, defs, path, rect, circle, ellipse, line,
  polyline, polygon, linearGradient, radialGradient, stop, clipPath, use.
  No style, class, image, text, filter, script or animation elements.
- Colours as hex. Gradients in `<defs>` with ids; ids only need to be unique
  within the file.
- Keep each file under about 40 KB. Round coordinates to whole numbers.

## Animation tags
The reader animates tagged groups and reacts when a child taps them.
- `data-anim` — a gentle idle motion: float, swim, bob, sway, wiggle, spin,
  pulse, twinkle, blink, drift.
  swim: sea creatures · float/drift: clouds, bubbles, boats · sway: plants,
  seaweed, tails, trees · bob: things on water · twinkle: stars, sparkles ·
  blink: eyes · pulse: glowing things, lava · wiggle: small lively things ·
  spin: tornado swirls, wheels, suns.
- `data-tap` — what happens on a tap: jump, spin, wiggle, grow, splash, hide.
- 6 to 9 `data-anim` groups and 3 to 5 `data-tap` groups per picture. The hero
  always has both. Give the eyes a `blink` group of their own inside the hero.
- Put tags on a `<g>` wrapping one whole object, never on a single shape inside
  it and never on the background. A tagged `<g>` has no `transform` attribute of
  its own: draw the object where it belongs, or put the transform on a parent
  `<g>` around the tagged one.
- Leave room around tagged objects so movement does not clip at the edge.

## Checking your work
`python3 tools/check.py art/<folder>/p01.svg` validates a file the way the app
will and writes `p01.png` beside it. Look at the PNG. Judge it as a picture
book editor would: Is the hero recognisable and the same as on the sheet? Is
the moment clear? Is anything misshapen, floating, cut off or muddy? Fix and
re-check until it is right. A page that merely passes the checker is not done.
