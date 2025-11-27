import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getLiveTrucksAction } from '@/actions/logistics';
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
  height: 600px; /* Forced height */
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid red; /* Temporary Debug Border */
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 0;
`;

type ActiveShipment = {
  id: string;
  truck_id: string | null;
  origin_lat: number;
  origin_lon: number;
  dest_lat: number;
  dest_lon: number;
  status: string;
  pickup_code: string;
};

export default function LiveMap() {
  const [shipments, setShipments] = useState<ActiveShipment[]>([]);

  useEffect(() => {
    const fetchShipments = async () => {
      const data = await getLiveTrucksAction();
      setShipments(data);
    };

    // Initial fetch
    fetchShipments();

    // Poll every 5 seconds
    const interval = setInterval(fetchShipments, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <MapWrapper>
      <MapContainer 
        center={[9.0820, 8.6753]} // Nigeria Center
        zoom={6} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {(shipments || []).map((shipment) => (
          <Marker 
            key={shipment.id} 
            position={[shipment.origin_lat, shipment.origin_lon]} 
            icon={icon}
          >
            <Popup>
              <strong>Truck: {shipment.truck_id || 'Unassigned'}</strong><br />
              Status: {shipment.status}<br />
              Code: {shipment.pickup_code}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </MapWrapper>
  );
}
