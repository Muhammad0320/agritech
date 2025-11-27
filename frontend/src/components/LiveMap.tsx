import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getLiveTrucksAction } from '@/actions/logistics';
import styled from 'styled-components';

// Custom Truck Icon (Green Dot with Pulse)
const truckIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #10b981; width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 10px #10b981; border: 2px solid white;"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const MapWrapper = styled.div`
  height: 100%;
  min-height: 500px;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(59, 130, 246, 0.3); /* Blue Glow */
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 0;
`;

type TruckData = {
  id: string;
  truck_id: string | null;
  lat: number;
  lon: number;
  dest_lat: number;
  dest_lon: number;
  status: string;
  pickup_code: string;
  speed?: number;
};

export default function LiveMap() {
  const [trucks, setTrucks] = useState<TruckData[]>([]);
  const trucksRef = useRef<TruckData[]>([]);

  useEffect(() => {
    const fetchTrucks = async () => {
      try {
        const data = await getLiveTrucksAction();
        const safeData = data || [];

        // Compare new data with old data to force re-render only if changed
        if (JSON.stringify(safeData) !== JSON.stringify(trucksRef.current)) {
          setTrucks(safeData);
          trucksRef.current = safeData;
        }
      } catch (error) {
        console.error("Error fetching live trucks:", error);
      }
    };

    // Initial fetch
    fetchTrucks();

    // Poll every 2 seconds
    const interval = setInterval(fetchTrucks, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <MapWrapper>
      <MapContainer 
        center={[9.0820, 8.6753]} // Nigeria Center
        zoom={6} 
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {trucks.map((truck) => (
          <React.Fragment key={truck.id}>
            <Polyline 
              positions={[[truck.lat, truck.lon], [truck.dest_lat, truck.dest_lon]]}
              pathOptions={{ color: '#3b82f6', dashArray: '5, 10', weight: 2 }}
            />
            <Marker 
              position={[truck.lat, truck.lon]} 
              icon={truckIcon}
            >
              <Popup>
                <div style={{ minWidth: '150px' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: '#0f172a' }}>
                    Truck: {truck.truck_id || 'Unassigned'}
                  </strong>
                  <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                    <div>Status: <span style={{ fontWeight: 600, color: truck.status === 'IN_TRANSIT' ? '#059669' : '#475569' }}>{truck.status}</span></div>
                    <div>Speed: {truck.speed ? `${truck.speed.toFixed(1)} km/h` : 'N/A'}</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}
      </MapContainer>
    </MapWrapper>
  );
}
