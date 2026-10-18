// @vitest-environment jsdom
/**
 * [La Rabia] Tests de los cambios de la revista sobre el reproductor (ver
 * README): crossOrigin del <audio> y textos traducibles (`labels`). Mismos
 * stubs que PaisajePlayer.test.tsx.
 */
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import PaisajePlayer from "./PaisajePlayer";

// Dos puntos v1 planos [x, y, r, rgbPacked] — solo importa que el SVG monte.
const POINTS: number[] = [
  10, 10, 5, (200 << 16) | (30 << 8) | 30,
  40, 40, 5, (30 << 16) | (160 << 8) | 60,
];

beforeAll(() => {
  // matchMedia (prefers-reduced-motion): jsdom no lo implementa.
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;

  // AudioContext mínimo: ensureGraph() se llama en el gesto de play.
  const node = { connect: () => {}, disconnect: () => {} };
  class FakeAudioContext {
    state = "running";
    sampleRate = 48000;
    destination = {};
    resume() {
      return Promise.resolve();
    }
    close() {
      return Promise.resolve();
    }
    createMediaElementSource() {
      return { ...node };
    }
    createGain() {
      return { gain: { value: 1 }, ...node };
    }
    createAnalyser() {
      return {
        fftSize: 2048,
        frequencyBinCount: 1024,
        ...node,
        getByteTimeDomainData: () => {},
        getByteFrequencyData: () => {},
      };
    }
  }
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;

  // play/pause: jsdom no los implementa. El componente sincroniza `playing`
  // con los eventos onPlay/onPause del <audio> y decide la rama por la
  // propiedad `paused`, así que simulamos ambas cosas.
  window.HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
    Object.defineProperty(this, "paused", { configurable: true, get: () => false });
    this.dispatchEvent(new Event("play", { bubbles: true }));
    return Promise.resolve();
  };
  window.HTMLMediaElement.prototype.pause = function (this: HTMLMediaElement) {
    Object.defineProperty(this, "paused", { configurable: true, get: () => true });
    this.dispatchEvent(new Event("pause", { bubbles: true }));
  };
});

afterEach(() => cleanup());

describe("PaisajePlayer · cambios de La Rabia", () => {
  it("el <audio> pide CORS (crossOrigin anonymous) en todas las variantes", () => {
    for (const variant of ["full", "minimal"] as const) {
      const { container } = render(<PaisajePlayer points={POINTS} audioUrl="https://api.example/a.m4a" variant={variant} />);
      expect(container.querySelector("audio")?.getAttribute("crossorigin")).toBe("anonymous");
      cleanup();
    }
  });

  it("variant='minimal' sigue teniendo círculo y título", () => {
    const { container } = render(
      <PaisajePlayer points={POINTS} audioUrl="a.m4a" variant="minimal" title="Título" />
    );
    expect(container.querySelector("clipPath")).not.toBeNull();
    expect(container.querySelector(".paisaje-minimal-title")?.textContent).toBe("Título");
  });

  it("labels: traducen lo que ve el lector; sin labels, el castellano original", () => {
    render(<PaisajePlayer points={POINTS} audioUrl="a.m4a" variant="minimal" labels={{ playPiece: "Play soundscape" }} />);
    expect(screen.getByRole("button").getAttribute("aria-label")).toBe("Play soundscape");
    cleanup();
    render(<PaisajePlayer points={POINTS} audioUrl="a.m4a" variant="full" />);
    expect(screen.getByRole("button", { name: "Reproducir" })).not.toBeNull();
    expect(screen.getByRole("slider", { name: "Progreso" })).not.toBeNull();
  });
});
