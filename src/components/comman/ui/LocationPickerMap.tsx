import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import { Crosshair, Loader2 } from 'lucide-react';

// Vite serves these as hashed asset URLs rather than the relative paths
// leaflet's default icon config expects — without this the pin renders as
// a broken image.
const markerIconInstance = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const DEFAULT_CENTER: [number, number] = [24.8607, 67.0011]; // Karachi — sensible default when no coordinates exist yet

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationPickerMap({ latitude, longitude, onChange, height = 220 }: {
  latitude:  number | null;
  longitude: number | null;
  onChange:  (lat: number, lng: number) => void;
  height?:   number;
}) {
  const [locating, setLocating] = useState(false);
  const hasPin = latitude != null && longitude != null;
  const center: [number, number] = hasPin ? [latitude, longitude] : DEFAULT_CENTER;

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { onChange(pos.coords.latitude, pos.coords.longitude); setLocating(false); },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-[6px]">
        <label className="text-[12px] font-medium text-graphite">Pin your location on the map (optional)</label>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex items-center gap-[4px] text-[12px] font-semibold text-brand-orange bg-transparent border-none cursor-pointer hover:text-brand-deep-orange transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {locating ? <Loader2 size={11} className="animate-spin" /> : <Crosshair size={11} />}
          Use my current location
        </button>
      </div>
      <div className="relative isolate z-0 rounded-[9px] overflow-hidden border border-bone" style={{ height }}>
        <MapContainer center={center} zoom={hasPin ? 15 : 12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <ClickHandler onPick={onChange} />
          {hasPin && (
            <Marker
              position={[latitude, longitude]}
              icon={markerIconInstance}
              draggable
              eventHandlers={{
                dragend: e => {
                  const { lat, lng } = e.target.getLatLng();
                  onChange(lat, lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <p className="text-[12px] text-slate mt-[6px]">
        {hasPin ? 'Tap or drag the pin to adjust — this helps couriers find you faster.' : 'Tap anywhere on the map to drop a pin.'}
      </p>
    </div>
  );
}
