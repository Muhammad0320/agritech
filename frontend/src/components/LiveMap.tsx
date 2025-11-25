import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getLivePositionsAction } from '@/actions/logistics';
import styled from 'styled-components';

// Fix Leaflet icon issue in Next.js
let icon: L.Icon | undefined;

if (typeof window !== 'undefined') {
  icon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
}

const MapWrapper = styled.div`
  height: 100%;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
`;

type TruckPosition = {
  truck_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  event_type: string;
  last_seen: string;
};

export default function LiveMap() {
  const [positions, setPositions] = useState<TruckPosition[]>([]);

  useEffect(() => {
    const fetchPositions = async () => {
      const data = await getLivePositionsAction();
      setPositions(data);
    };

    // Initial fetch
    fetchPositions();

    // Poll every 5 seconds as requested
    const interval = setInterval(fetchPositions, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <MapWrapper>
      <MapContainer 
        center={[10.0, 10.0]} 
        zoom={6} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {positions.map((pos) => (
          <Marker 
            key={pos.truck_id} 
            position={[pos.latitude, pos.longitude]} 
            icon={icon}
          >
            <Popup>
              <strong>Truck: {pos.truck_id}</strong><br />
              Speed: {pos.speed.toFixed(1)} km/h<br />
              Status: {pos.event_type}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </MapWrapper>
  );
}
