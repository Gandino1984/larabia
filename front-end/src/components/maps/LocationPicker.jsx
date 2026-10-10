// magazine-front/src/components/maps/LocationPicker.jsx
//
// Place a point on a map (Leaflet + OpenStreetMap): search an address
// (OpenStreetMap's Nominatim — one request per search, on demand), click the
// map, or drag the pin to fine-tune. Reports { lat, lng } (null = no place).
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { Search, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { mapPinIcon, DEFAULT_CENTER, OSM_TILES, OSM_ATTRIBUTION, toCoord } from './mapPin';
import './Maps.css';

// Click on the map → move the pin there.
function ClickToPlace({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// Re-center when the position changes from outside (search result, editing
// another workshop).
function FollowPosition({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, Math.max(map.getZoom(), 16));
  }, [position, map]);
  return null;
}

function LocationPicker({ lat, lng, onChange, initialQuery = '' }) {
  const la = toCoord(lat);
  const ln = toCoord(lng);
  const position = la !== null && ln !== null ? [la, ln] : null;
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const pick = (newLat, newLng) => onChange({ lat: Number(newLat.toFixed(6)), lng: Number(newLng.toFixed(6)) });

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=es&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
      if (!data?.length) setSearchError('No se encontró esa dirección. Prueba con otra o marca el sitio en el mapa.');
    } catch {
      setSearchError('No se pudo buscar ahora. Marca el sitio directamente en el mapa.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="location-picker">
      <div className="location-picker__search">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search(); } }}
          placeholder="Buscar dirección (calle, número, ciudad…)"
          aria-label="Buscar dirección"
        />
        <button type="button" onClick={search} disabled={searching || !query.trim()}>
          <Search size={16} />
          <span>{searching ? 'Buscando…' : 'Buscar'}</span>
        </button>
      </div>
      {searchError && <p className="location-picker__msg">{searchError}</p>}
      {results.length > 0 && (
        <ul className="location-picker__results">
          {results.map((r) => (
            <li key={r.place_id}>
              <button type="button" onClick={() => { pick(Number(r.lat), Number(r.lon)); setResults([]); }}>
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="map-frame">
        <MapContainer center={position || DEFAULT_CENTER} zoom={position ? 16 : 13} className="map-canvas">
          <TileLayer url={OSM_TILES} attribution={OSM_ATTRIBUTION} />
          <ClickToPlace onPick={pick} />
          <FollowPosition position={position} />
          {position && (
            <Marker
              position={position}
              icon={mapPinIcon}
              draggable
              eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); pick(p.lat, p.lng); } }}
            />
          )}
        </MapContainer>
      </div>

      <div className="location-picker__footer">
        <span>
          {position
            ? `Ubicación: ${la.toFixed(5)}, ${ln.toFixed(5)} — arrastra el marcador para ajustarla.`
            : 'Busca la dirección o haz clic en el mapa para marcar el sitio.'}
        </span>
        {position && (
          <button type="button" className="location-picker__clear" onClick={() => onChange({ lat: null, lng: null })}>
            <X size={14} />
            <span>Quitar ubicación</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default LocationPicker;
