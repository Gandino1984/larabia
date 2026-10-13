// front-end/src/paisaje/integration/exclusiveAudio.js
//
// One sound at a time on the page: when a soundscape (or a comic's audio)
// starts, every other source pauses.
const EVENT = 'larabia:audio-start';

export function announceAudioStart(source) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { source } }));
}

/** Call `pause` whenever ANOTHER source starts. Returns the unsubscribe. */
export function onOtherAudioStart(source, pause) {
  const handler = (e) => { if (e.detail?.source !== source) pause(); };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
