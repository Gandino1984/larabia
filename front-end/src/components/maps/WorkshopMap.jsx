// magazine-front/src/components/maps/WorkshopMap.jsx
//
// Read-only map (Leaflet + OpenStreetMap) with the workshop's place — its
// own position or, if its creator didn't set one, the default (Matiko,
// Uribarri). Full version (workshop page): zoomable, so people find their
// way on it — no link out of the magazine (to Google Maps or elsewhere).
// `compact` (cards): a small static preview that lets clicks reach the card.
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { mapPinIcon, OSM_TILES, OSM_ATTRIBUTION, workshopPosition } from './mapPin';
import './Maps.css';

function WorkshopMap({ lat, lng, label, compact = false }) {
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
    </div>
  );
}

export default WorkshopMap;
