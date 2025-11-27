'use client';

import { useEffect, useState, useRef, Fragment } from 'react';
import { getLiveTrucksAction, getAllIncidentsAction } from '@/actions/logistics';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import styled from 'styled-components';

// --- Styled Components ---

const MapWrapper = styled.div`
  position: relative;
  height: 100%;
  min-height: 600px;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid #334155;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  isolation: isolate;
  background-color: #0f172a; /* Fallback background */
`;

const ToggleContainer = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  gap: 4px;
  padding: 4px;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid #334155;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const ToggleButton = styled.button<{ $active: boolean; $color: string }>`
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
  color: ${props => props.$active ? '#ffffff' : '#94a3b8'};
  background-color: ${props => props.$active ? props.$color : 'transparent'};
  box-shadow: ${props => props.$active ? `0 4px 6px -1px ${props.$color}40` : 'none'};

  &:hover {
    color: #ffffff;
    background-color: ${props => props.$active ? props.$color : 'rgba(255, 255, 255, 0.05)'};
  }
`;

const LegendContainer = styled.div`
  position: absolute;
  bottom: 30px;
  right: 20px;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(8px);
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
  min-width: 160px;
`;

const LegendTitle = styled.div`
  font-weight: 700;
  color: #f1f5f9;
  font-size: 0.875rem;
  margin-bottom: 4px;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  color: #cbd5e1;
`;

const Dot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => props.$color};
  box-shadow: 0 0 8px ${props => props.$color}80;
`;

// --- Helper Component ---

function ChangeView({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

// --- Main Component ---

export default function LiveMap() {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'FLEET' | 'HEATMAP'>('FLEET');
  const [isMounted, setIsMounted] = useState(false);
  const [bounds, setBounds] = useState<L.LatLngBoundsExpression | null>(null);
  
  const prevTrucksRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    setIsMounted(true);
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  // Fetch Trucks (Fleet Mode)
  useEffect(() => {
    if (viewMode !== 'FLEET') return;

    const fetchTrucks = async () => {
      const data = await getLiveTrucksAction() || [];
      
      const currentIds = new Set(data.map((t: any) => t.truck_id));
      const prevIds = prevTrucksRef.current;

      prevIds.forEach(id => {
        if (!currentIds.has(id)) {
          toast.success(`Truck ${id} has arrived at destination!`, {
            icon: '🏁',
            duration: 5000,
            style: { background: '#10b981', color: '#fff' }
          });
        }
      });

      prevTrucksRef.current = currentIds;
      setTrucks(data);

      if (data.length > 0) {
        const points: L.LatLngExpression[] = [];
        data.forEach((t: any) => {
           const lat = t.lat ?? t.origin_lat;
           const lon = t.lon ?? t.origin_lon;
           if (lat !== undefined && lon !== undefined) {
             points.push([lat, lon]);
             points.push([t.dest_lat, t.dest_lon]);
           }
        });
        if (points.length > 0) {
          setBounds(L.latLngBounds(points));
        }
      }
    };

    fetchTrucks();
    const interval = setInterval(fetchTrucks, 2000);
    return () => clearInterval(interval);
  }, [viewMode]);

  // Fetch Incidents (Heatmap Mode)
  useEffect(() => {
    if (viewMode === 'HEATMAP') {
      const fetchIncidents = async () => {
        const data = await getAllIncidentsAction();
        const safeData = data || []; // Ensure it's an array
        setIncidents(safeData);
         if (safeData.length > 0) {
            const points: L.LatLngExpression[] = safeData.map((i: any) => [i.latitude, i.longitude]);
            setBounds(L.latLngBounds(points));
         }
      };
      fetchIncidents();
    }
  }, [viewMode]);

  if (!isMounted) return <div style={{ height: '600px', width: '100%', background: '#0f172a', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading Map...</div>;

  const truckIcon = L.divIcon({
    className: 'custom-icon',
    html: `<div style="
      background-color: #10b981; 
      width: 14px; 
      height: 14px; 
      border-radius: 50%; 
      box-shadow: 0 0 15px #10b981; 
      border: 2px solid white;">
    </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  const getIncidentColor = (type: string) => {
    switch (type) {
      case 'POLICE_CHECKPOINT': return '#ef4444';
      case 'BAD_ROAD': return '#a855f7';
      case 'TRAFFIC': return '#f59e0b';
      case 'ACCIDENT': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  return (
    <MapWrapper>
       
       {/* Toggle Controls */}
       <ToggleContainer>
          <ToggleButton 
            $active={viewMode === 'FLEET'} 
            $color="#10b981"
            onClick={() => setViewMode('FLEET')}
          >
            <span>🚛</span> Fleet
          </ToggleButton>
          <ToggleButton 
            $active={viewMode === 'HEATMAP'} 
            $color="#f97316"
            onClick={() => setViewMode('HEATMAP')}
          >
            <span>⚠️</span> Risk Zones
          </ToggleButton>
       </ToggleContainer>
              <span>Bad Road / Pothole</span>
            </LegendItem>
            <LegendItem>
              <Dot $color="#f97316" />
              <span>Heavy Traffic</span>
            </LegendItem>
         </LegendContainer>
       )}

       <MapContainer 
        center={[8.9, 4.6]} 
        zoom={7} 
        scrollWheelZoom={false} 
        style={{ height: "100%", width: "100%", zIndex: 0 }}
      >
        <ChangeView bounds={bounds} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          zIndex={0}
        />

        {viewMode === 'FLEET' && trucks.map((truck) => {
          const currentLat = truck.lat ?? truck.origin_lat;
          const currentLon = truck.lon ?? truck.origin_lon;

          if (currentLat === undefined || currentLon === undefined) return null;

          return (
            <Fragment key={truck.shipment_id || truck.truck_id || Math.random()}>
              <Marker position={[currentLat, currentLon]} icon={truckIcon}>
                <Popup className="font-sans">
                  <div style={{ color: '#0f172a' }}>
                    <strong>{truck.truck_id}</strong><br/>
                    Speed: {Math.round(truck.speed || 60)} km/h<br/>
                    Dest: {truck.dest_lat.toFixed(2)}, {truck.dest_lon.toFixed(2)}
                  </div>
                </Popup>
              </Marker>

              <Polyline 
                positions={[
                  [currentLat, currentLon], 
                  [truck.dest_lat, truck.dest_lon]
                ]}
                pathOptions={{ 
                  color: '#3b82f6', 
                  weight: 3, 
                  dashArray: '5, 10', 
                  opacity: 0.8 
                }} 
              />
            </Fragment>
          );
        })}

        {viewMode === 'HEATMAP' && Array.isArray(incidents) && incidents.map((incident, idx) => (
           <CircleMarker
              key={idx}
              center={[incident.latitude, incident.longitude]}
              pathOptions={{ 
                color: getIncidentColor(incident.incident_type),
                fillColor: getIncidentColor(incident.incident_type),
                fillOpacity: 0.6,
                weight: 0
              }}
              radius={12} 
           >
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                <div style={{ color: '#0f172a', fontSize: '0.875rem' }}>
                  <b style={{ textTransform: 'uppercase', fontSize: '0.75rem', display: 'block', marginBottom: '4px' }}>
                    {incident.incident_type.replace('_', ' ')}
                  </b>
                  <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                    Severity: {incident.severity || 1}/5
                  </span>
                </div>
              </Tooltip>
           </CircleMarker>
        ))}

      </MapContainer>
    </MapWrapper>
  );
}