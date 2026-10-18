# Paisaje sonoro — motor integrado en La Rabia

**Autoría de la herramienta: Cristian Vergara, 2026.** Integrada en la revista
con su permiso.

Origen: <https://github.com/zuriai-org/paisaje-sonoro-public>, commit
`8a6cf7f` (2026-10-11). La especificación de referencia es su `docs/DISENO.md`.

Convierte una imagen y un audio en una pieza que se dibuja y respira con el
sonido. Cuatro estilos (puntillista, line art, posterizado 4 capas, azimutal);
la imagen se procesa en el navegador y el servidor solo normaliza el audio.

## Qué hay aquí

Copiado del original **sin cambios en la lógica**, con su misma estructura
(para poder traer versiones nuevas del autor comparando carpeta a carpeta):

| Carpeta | Contenido |
|---|---|
| `converter/` | Conversores de los 4 estilos, formato de datos v3 (`format.ts`, validador compartido con el servidor), utilidades de imagen, tests y fixtures sintéticas |
| `player/` | `PaisajePlayer` (reproductor audio-reactivo, Web Audio) y su lógica, con tests |
| `styles/registry.ts` | Catálogo de estilos |
| `wizard/` | Máquinas de estado del asistente (`wizardState`, `audioUploadState`) y `buildPaisajeJson` |

**Código de la revista** (no es del original): `integration/` —
`PaisajeEditor` (sustituye al asistente de la demo; se usa como formato de
artículo y en el modal «Panel paisaje sonoro» del creador de cómics),
`PaisajePiece` (lo que ve el lector: el círculo, en el artículo y en una
viñeta cuadrada del cómic; un solo audio a la vez), la API de subidas (`paisajeApi.js`) y las
utilidades de la pieza guardada en el bloque (`soundscape.js`). El servidor
está en `back-end/controllers/paisaje/`.

No se trajeron: el asistente y la vista publicada de la demo (`src/demo/Wizard.tsx`,
`App`, `PublishedView`: usan react-router; la revista tiene su propio editor y
lector), su CSS de demo, los stubs vacíos y el servidor de demo (`server/`: la
revista lo reimplementa en su back-end con sus permisos, MySQL y rutas).

## Cambios respecto al original

**Regla (Cristian Vergara, 2026-10-18): el motor no se toca.** Conversores,
formato, estilos y lógica del reproductor son idénticos al commit `8a6cf7f`
(verificable con `diff -r` contra `src/converter`, `src/styles`,
`src/player` del original). Versiones anteriores de la integración
cambiaron `converter/image.ts` (sin límite de imagen, decodificación reducida
a 900 px: alteraba el puntillista, que trabaja a 2048 px, y el remuestreo del
posterizado) y añadieron una variante `'panel'` al reproductor; las dos se
revirtieron. Los únicos cambios que quedan:

- `wizard/buildPaisajeJson.ts`: extraída de `src/demo/Wizard.tsx` tal cual
  (el test importa ahora de este módulo).
- `player/PaisajePlayer.tsx` (marcados con `[La Rabia]`, aditivos: con las
  props por defecto se comporta igual que el original):
  - `crossOrigin="anonymous"` en el `<audio>`: la revista sirve el audio desde
    otro origen (la API) y, sin CORS, Web Audio entrega silencio.
  - prop `labels` (`PlayerLabels`): textos que ve el lector, para traducirlos;
    por defecto los originales en castellano.

Artículos y viñetas de cómic usan la presentación `'minimal'` del original
(el círculo, con el encuadre del paso 3). En la viñeta, `integration/` solo la
recorta con CSS al cuadrado central de la imagen (el círculo y su aire, sin
las franjas vacías de los lados).

Todo lo demás que haga falta va en `integration/` (código de la revista),
nunca en estos archivos.

Nota de comportamiento (del original, no es un fallo): con
`prefers-reduced-motion` activado en el dispositivo, el reproductor usa su
modo `'fade'` (R5): todo el dibujo a la vez, sin trazado, con la opacidad del
conjunto siguiendo el volumen. Y en modo **Amplitud** el posterizado hace
responder sus 4 capas juntas al volumen global; en **Espectro**, cada capa a
su banda.

## Tests

`npm test` (en `front-end/`) ejecuta su suite con vitest: **274 tests** del motor
(más 3 de los añadidos de la revista en `player/PaisajePlayer.larabia.test.tsx`)
(el original tiene 284; los 10 restantes son de su servidor de demo y de la
vista previa del asistente, que no se integran). Regla del autor: deben
quedar en verde, incluido el validador de invariante del trazador
(`converter/trace-invariant.test.ts`). El formato de datos es JSON v3:
cualquier cambio requiere entrada en `MIGRATIONS` (`converter/format.ts`) y tests.
