// magazine-front/src/utils/visibility.js
//
// "The reader has reached this element": most of what CAN be on screen of it
// is on screen. What can be on screen is limited by the window AND by the
// scrolling boxes around it — a comic viewer is narrower than the phone (its
// arrows take room) and a panel can be wider than both.

export const VISIBILITY_THRESHOLDS = [0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

/** The boxes that clip `el` (overflow other than visible), innermost first. */
export function clippingAncestors(el) {
  const out = [];
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (/(auto|scroll|hidden|clip)/.test(cs.overflowX + cs.overflowY)) out.push(p);
  }
  return out;
}

/** The part of `el` on screen right now (viewport coordinates). */
export function visibleRect(el, clippers = clippingAncestors(el)) {
  const r = el.getBoundingClientRect();
  let left = Math.max(r.left, 0), top = Math.max(r.top, 0);
  let right = Math.min(r.right, window.innerWidth), bottom = Math.min(r.bottom, window.innerHeight);
  clippers.forEach((c) => {
    const cr = c.getBoundingClientRect();
    left = Math.max(left, cr.left); top = Math.max(top, cr.top);
    right = Math.min(right, cr.right); bottom = Math.min(bottom, cr.bottom);
  });
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

/** The same test as isMostlyVisible, measured now — for elements so wide
 *  (a long comic panel) that no IntersectionObserver threshold is crossed
 *  while they scroll by. */
export function isMostlyOnScreen(el, clippers = clippingAncestors(el), share = 0.6) {
  const r = el.getBoundingClientRect();
  let maxW = Math.min(r.width, window.innerWidth);
  let maxH = Math.min(r.height, window.innerHeight);
  clippers.forEach((c) => {
    const cr = c.getBoundingClientRect();
    maxW = Math.min(maxW, cr.width);
    maxH = Math.min(maxH, cr.height);
  });
  const seen = visibleRect(el, clippers);
  return maxW > 0 && maxH > 0 && seen.width >= maxW * share && seen.height >= maxH * share;
}

/**
 * `entry`: an IntersectionObserver entry with the implicit root (its
 * intersectionRect is already clipped by those boxes).
 */
export function isMostlyVisible(entry, share = 0.6) {
  if (!entry.isIntersecting) return false;
  let maxW = Math.min(entry.boundingClientRect.width, window.innerWidth);
  let maxH = Math.min(entry.boundingClientRect.height, window.innerHeight);
  clippingAncestors(entry.target).forEach((c) => {
    const cr = c.getBoundingClientRect();
    maxW = Math.min(maxW, cr.width);
    maxH = Math.min(maxH, cr.height);
  });
  const seen = entry.intersectionRect;
  return seen.width >= maxW * share && seen.height >= maxH * share;
}
