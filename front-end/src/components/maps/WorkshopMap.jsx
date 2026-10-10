// magazine-front/src/components/maps/WorkshopMap.jsx
//
// Read-only map (Leaflet + OpenStreetMap) with the workshop's place, plus a
// "Cómo llegar" link to directions.
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import { Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { mapPinIcon, OSM_TILES, OSM_ATTRIBUTION, toCoord } from './mapPin';
import './Maps.css';

function WorkshopMap({ lat, lng, label }) {
  const { t } = useTranslation();
  const la = toCoord(lat);
  const ln = toCoord(lng);
  if (la === null || ln === null) return null;

  const directions = `https://www.google.com/maps/dir/?api=1&destination=${la},${ln}`;
  return (
    <div className="workshop-map">
      <div className="map-frame">
        <MapContainer center={[la, ln]} zoom={16} scrollWheelZoom={false} className="map-canvas">
          <TileLayer url={OSM_TILES} attribution={OSM_ATTRIBUTION} />
          <Marker position={[la, ln]} icon={mapPinIcon}>
            {label && <Popup>{label}</Popup>}
          </Marker>
        </MapContainer>
      </div>
      <a className="map-directions" href={directions} target="_blank" rel="noopener noreferrer">
        <Navigation size={16} />
        <span>{t('workshops.map.directions', 'Cómo llegar')}</span>
      </a>
    </div>
  );
}

export default WorkshopMap;
