// Extraído de src/demo/Wizard.tsx del repositorio original (paisaje-sonoro,
// commit 8a6cf7f) sin cambios en la lógica: el asistente de la demo no se
// integra (usa react-router); la revista tiene su propio editor.
import {
  FORMAT_NAME,
  type PaisajeDocument,
} from "../converter/format";
import type { StyleDocument } from "../styles/registry";

/**
 * Construye el .paisaje.json que validará el backend (esquema §1).
 * Unión discriminada: frames → v3 azimuthal; segments → v3 lineart;
 * capas → v3 posterized; points → v1 puntillista (las v1 siguen siendo
 * válidas tal cual: compatibilidad hacia atrás).
 */
export function buildPaisajeJson(doc: StyleDocument): Blob {
  const generator = { name: "paisaje-sonoro-converter", version: "0.1.0" };
  const image = {
    width: doc.width,
    height: doc.height,
    webp: doc.webpName,
    // JPEG posterizado (artefacto de trabajo del estilo posterizado).
    posterizedJpeg: doc.posterizedJpegName ?? null,
  };
  const params = {
    step: doc.params.step as number,
    maxRadius: doc.params.maxRadius as number,
    multiplicador: doc.params.multiplicador as number,
    seed: doc.seed,
    maxVisibleRatio: doc.maxVisibleRatio,
  };
  const json: PaisajeDocument = doc.frames
    ? {
        format: FORMAT_NAME,
        version: 3,
        style: "azimuthal",
        generator,
        image,
        // Medio de líneas de borde (AZ-3): sin seed ni radios.
        params: {
          step: doc.params.step as number,
          maxLength: doc.params.maxLength as number,
          strokeWidth: doc.params.strokeWidth as number,
          umbral: doc.params.umbral as number,
          maxVisibleRatio: doc.maxVisibleRatio,
          orbitMode: (doc.params.orbitMode as string) === "bounce" ? "bounce" : "clamp",
        },
        keyframes: doc.keyframes ?? [
          { longitudCentral: 0, paraleloEstandar: 0, roll: 0, pitch: 0, yaw: 0 },
          { longitudCentral: 0, paraleloEstandar: 0, roll: 0, pitch: 0, yaw: 0 },
          { longitudCentral: 0, paraleloEstandar: 0, roll: 0, pitch: 0, yaw: 0 },
        ],
        primitives: { frames: doc.frames },
      }
    : doc.segments
      ? {
          format: FORMAT_NAME,
          version: 3,
          style: "lineart",
          generator,
          image,
          params: {
            step: doc.params.step as number,
            maxLength: doc.params.maxLength as number,
            strokeWidth: doc.params.strokeWidth as number,
            seed: doc.seed,
            maxVisibleRatio: doc.maxVisibleRatio,
            mode: (doc.params.mode as string) === "bordes" ? "bordes" : "luz",
            umbral: (doc.params.umbral as number) ?? 0.15,
          },
          primitives: { segments: doc.segments },
        }
      : doc.layers
        ? {
            format: FORMAT_NAME,
            version: 3,
            style: "posterized",
            generator,
            image,
            // v3 (F2 2026-10-11): matiz GLOBAL + transparencia por capa +
            // quitar fondo; reemplaza al matiz individual (hueShift).
            params: {
              hueGlobal: (doc.params.hueGlobal as number | undefined) ?? 0,
              layerAlpha: (doc.params.layerAlpha as number[] | undefined) ?? [1, 1, 1, 1],
              bw: (doc.params.bw as boolean | undefined) ?? false,
              grayTone: (doc.params.grayTone as number[] | undefined) ?? [0, 85, 170, 255],
              minRegion: (doc.params.minRegion as number | undefined) ?? 12,
              removeBackground: (doc.params.removeBackground as boolean | undefined) ?? false,
            },
            layers: doc.layers,
          }
        : {
            format: FORMAT_NAME,
            version: 1,
            generator,
            image,
            params,
            points: doc.points,
          };
  return new Blob([JSON.stringify(json)], { type: "application/json" });
}
