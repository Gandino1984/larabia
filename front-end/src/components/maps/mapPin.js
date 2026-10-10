// magazine-front/src/components/maps/mapPin.js
// Leaflet marker drawn in CSS/SVG (red pin) — avoids Leaflet's default PNG
// icons, whose URLs break once bundled.
import L from 'leaflet';

export const mapPinIcon = L.divIcon({
  className: 'map-pin',
  html: '<svg viewBox="0 0 24 32" width="30" height="40" aria-hidden="true"><path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.8 12 32 12 32s12-11.2 12-20.1C24 5.3 18.6 0 12 0z" fill="#dc2626"/><circle cx="12" cy="12" r="4.6" fill="#ffffff"/></svg>',
  iconSize: [30, 40],
  iconAnchor: [15, 40]
});

// Default workshop location (and the picker's starting view): Matiko
// (Uribarri, Bilbao). A workshop whose creator didn't place it is shown here.
export const DEFAULT_CENTER = [43.269, -2.9255];

export const OSM_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/** [lat, lng] of a workshop — its own position, or the default (Matiko). */
export const workshopPosition = (lat, lng) => {
  const la = toCoord(lat);
  const ln = toCoord(lng);
  return la !== null && ln !== null ? [la, ln] : DEFAULT_CENTER;
};

/** Number from a stored coordinate (MySQL DECIMAL arrives as a string). */
export const toCoord = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
