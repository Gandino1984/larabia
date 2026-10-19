# Paisaje sonoro — the soundscape engine in La Rabia

**English** · [Español](README.md)

**The tool is by Cristian Vergara, 2026.** It is integrated into the magazine
with his permission.

Origin: <https://github.com/zuriai-org/paisaje-sonoro-public>, commit
`8a6cf7f` (2026-10-11). The reference specification is its `docs/DISENO.md`.

It turns an image and an audio into a piece that draws itself and breathes
with the sound. There are four styles: pointillist, line art, posterised
(4 layers) and azimuthal. The image is processed in the browser; the server
only normalises the audio.

## What is here

The engine is copied from the original **with no changes to its logic** and
the same folder structure, so new versions from the author can be brought in
by comparing folder by folder:

| Folder | Contents |
|---|---|
| `converter/` | The 4 style converters, the v3 data format (`format.ts`, a validator shared with the server), image utilities, tests and synthetic fixtures |
| `player/` | `PaisajePlayer` (the audio-reactive player, Web Audio) and its logic, with tests |
| `styles/registry.ts` | The style catalogue |
| `wizard/` | The wizard's state machines (`wizardState`, `audioUploadState`) and `buildPaisajeJson` |

**The magazine's code** (not part of the original) is in `integration/`:

- **`PaisajeEditor`:** replaces the demo's wizard with a three-step wizard of its own (image and style → sound and player → framing and summary). It is used as an article format and in the comic creator's «Panel paisaje sonoro» modal.
- **`PaisajePiece`:** what the reader sees — the circle, in an article or in a square comic panel; only one audio plays at a time.
- **The upload API** (`paisajeApi.js`) and the utilities for the piece stored in a block (`soundscape.js`).

The server side is in `back-end/controllers/paisaje/`.

Not brought over:

- the demo's wizard and published view (`src/demo/Wizard.tsx`, `App`, `PublishedView`): they use react-router, and the magazine has its own editor and reader;
- its demo CSS and the empty stubs;
- the demo server (`server/`): the magazine reimplements it in its back-end, with its permissions, MySQL and routes.

## Changes from the original

**Rule (Cristian Vergara, 2026-10-18): the engine is not touched.**

Converters, format, styles and the player's logic are identical to commit
`8a6cf7f`. You can check it with `diff -r` against the original's
`src/converter`, `src/styles` and `src/player`.

Earlier versions of the integration changed two things, and both were reverted:

- `converter/image.ts`: no image limit, and decoding reduced to 900 px. This altered the pointillist style, which works at 2048 px, and the posterised resampling.
- A `'panel'` variant added to the player.

The only changes left:

- `wizard/buildPaisajeJson.ts`: extracted unchanged from `src/demo/Wizard.tsx`. Its test now imports it from this module.
- `player/PaisajePlayer.tsx`: additive changes, marked `[La Rabia]`. With the default props it behaves exactly like the original.
  - `crossOrigin="anonymous"` on the `<audio>`: the magazine serves the audio from another origin (the API), and without CORS Web Audio receives silence.
  - a `labels` prop (`PlayerLabels`): the texts the reader sees, so they can be translated. The defaults are the original Spanish ones.

Articles and comic panels use the original's `'minimal'` presentation (the
circle, framed as in step 3). In a comic panel, `integration/` only crops it
with CSS to the image's central square (the circle and its margin, without the
empty bands at the sides).

Anything else that's needed goes in `integration/` (the magazine's code),
never in these files.

**Behaviour notes** (from the original, not bugs):

- With `prefers-reduced-motion` on, the player uses its `'fade'` mode (R5): the whole drawing at once, with no tracing, its opacity following the volume.
- In **Amplitude** mode, the posterised style's 4 layers respond together to the overall volume. In **Spectrum** mode, each layer follows its own band.

## Tests

`npm test` (in `front-end/`) runs the suite with Vitest:

- **274 engine tests**, plus 3 for the magazine's additions in `player/PaisajePlayer.larabia.test.tsx`.
- The original has 284; the other 10 cover its demo server and the wizard's preview, which aren't integrated.

The author's rules:

- The tests must stay green, including the tracer's invariant check (`converter/trace-invariant.test.ts`).
- The data format is JSON v3: any change needs an entry in `MIGRATIONS` (`converter/format.ts`) and tests.
