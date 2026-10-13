/**
 * Utilidades de carga/preparación de imagen (DISENO.md §2.1 y §2.4).
 * [La Rabia] SIN límite de peso ni de tamaño: la imagen se decodifica ya
 * reducida a 900 px de alto (createImageBitmap con resizeHeight), así una
 * foto de móvil de 8000 px no se materializa entera en un canvas. Nunca se
 * sube ni se guarda el original: solo el dibujo y su referencia (900 px).
 * (El original bloqueaba > 15 MB y > 4096×4096.)
 */

/** Todas las imágenes se normalizan a 900 px de alto (ancho proporcional). */
export const TARGET_HEIGHT = 900;


export interface DimensionCheck {
  /** Mensaje de bloqueo (null si la imagen es aceptable). */
  blocked: string | null;
  /** Advertencia no bloqueante (null si no aplica). */
  warning: string | null;
}

/**
 * [La Rabia] Ya no bloquea ni avisa: cualquier tamaño se acepta y se reduce
 * a TARGET_HEIGHT al decodificar (decodeImageFile). Se conserva la firma
 * para no tocar a los conversores.
 */
export function checkDimensions(_width: number, _height: number): DimensionCheck {
  return { blocked: null, warning: null };
}

/**
 * Decodifica un archivo de imagen. [La Rabia] Sin límite de peso: se pide al
 * navegador la imagen ya reducida a TARGET_HEIGHT de alto (ancho
 * proporcional); si no admite la opción, se decodifica entera y
 * normalizeHeight la reduce después (como en el original).
 */
export async function decodeImageFile(file: File): Promise<ImageBitmap> {
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo no es una imagen.");
  }
  try {
    return await createImageBitmap(file, { resizeHeight: TARGET_HEIGHT, resizeQuality: "high" });
  } catch {
    try {
      return await createImageBitmap(file);
    } catch {
      throw new Error("No se pudo decodificar la imagen (formato no soportado por el navegador).");
    }
  }
}

export interface ResizedCanvas {
  canvas: HTMLCanvasElement;
  imageData: ImageData;
  /** true si se redimensionó (alto original ≠ targetHeight). */
  resized: boolean;
}

/**
 * Normaliza la altura de la imagen a targetHeight px (ancho proporcional,
 * sin recortar). Corrección fase 5: altura fija de 900 px para todo el
 * pipeline; el JSON guarda las dimensiones ya normalizadas.
 */
export function normalizeHeight(
  bitmap: ImageBitmap,
  targetHeight: number = TARGET_HEIGHT
): ResizedCanvas {
  const scale = targetHeight / bitmap.height;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D no disponible en este navegador.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return {
    canvas,
    imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
    resized: bitmap.height !== canvas.height,
  };
}

/**
 * Dibuja los puntos en un canvas 2D (preview, DISENO.md §2.2).
 * El canvas se escala para que su lado mayor no supere maxDisplayDim px.
 */
export function drawPointsOnCanvas(
  canvas: HTMLCanvasElement,
  imgWidth: number,
  imgHeight: number,
  points: number[],
  maxDisplayDim = 720
): void {
  const scale = Math.min(1, maxDisplayDim / Math.max(imgWidth, imgHeight));
  canvas.width = Math.max(1, Math.round(imgWidth * scale));
  canvas.height = Math.max(1, Math.round(imgHeight * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);

  for (let i = 0; i < points.length; i += 4) {
    const packed = points[i + 3];
    const r = (packed >> 16) & 0xff;
    const g = (packed >> 8) & 0xff;
    const b = packed & 0xff;
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.arc(points[i], points[i + 1], points[i + 2], 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Dibuja los segmentos Line Art en un canvas 2D (preview del editor LA-2).
 * Misma escala que drawPointsOnCanvas; los extremos se calculan desde
 * (x, y, angle, len) — ángulo desde el eje horizontal, convención y-down.
 * `background` rellena el canvas (BLANCO en los previews del editor para
 * ver bien los trazos negros; la pieza publicada sigue transparente).
 */
export function drawSegmentsOnCanvas(
  canvas: HTMLCanvasElement,
  imgWidth: number,
  imgHeight: number,
  segments: number[],
  strokeWidth: number,
  maxDisplayDim = 720,
  background?: string
): void {
  const scale = Math.min(1, maxDisplayDim / Math.max(imgWidth, imgHeight));
  canvas.width = Math.max(1, Math.round(imgWidth * scale));
  canvas.height = Math.max(1, Math.round(imgHeight * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  if (background) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  ctx.lineWidth = strokeWidth;
  ctx.lineCap = "round";
  for (let i = 0; i < segments.length; i += 5) {
    const x = segments[i];
    const y = segments[i + 1];
    const angle = (segments[i + 2] * Math.PI) / 180;
    const half = segments[i + 3] / 2;
    const packed = segments[i + 4];
    ctx.strokeStyle = `rgb(${(packed >> 16) & 0xff},${(packed >> 8) & 0xff},${packed & 0xff})`;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * half, y + Math.sin(angle) * half);
    ctx.lineTo(x - Math.cos(angle) * half, y - Math.sin(angle) * half);
    ctx.stroke();
  }
}
