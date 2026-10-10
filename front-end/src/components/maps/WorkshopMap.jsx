// magazine-front/src/components/maps/WorkshopMap.jsx
//
// Read-only map (Leaflet + OpenStreetMap) with the workshop's place — its
// own position or, if its creator didn't set one, the default (Matiko,
// Uribarri). Full version (workshop page): zoomable + "Cómo llegar" link.
// `compact` (cards): a small static preview that lets clicks reach the card.
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import { Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { mapPinIcon, OSM_TILES, OSM_ATTRIBUTION, workshopPosition } from './mapPin';
import './Maps.css';

function WorkshopMap({ lat, lng, label, compact = false }) {
  const { t } = useTranslation();
  const [la, ln] = workshopPosition(lat, lng);

  if (compact) {
    return (
      <div className="workshop-map workshop-map--compact" aria-hidden="true">
        <div className="map-frame">
          <MapContainer
            center={[la, ln]}
            zoom={15}
            className="map-canvas"
            zoomControl={false}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            touchZoom={false}
            boxZoom={false}
            keyboard={false}
          >
            <TileLayer url={OSM_TILES} attribution={OSM_ATTRIBUTION} />
            <Marker position={[la, ln]} icon={mapPinIcon} interactive={false} />
          </MapContainer>
        </div>
      </div>
    );
  }

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
