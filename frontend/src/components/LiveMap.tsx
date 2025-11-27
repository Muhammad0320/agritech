'use client';

import { useEffect, useState, useRef, Fragment } from 'react';
import { getLiveTrucksAction, getAllIncidentsAction } from '@/actions/logistics';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';

// Helper component for auto-zoom
function ChangeView({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

export default function LiveMap() {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'FLEET' | 'HEATMAP'>('FLEET');
  const [isMounted, setIsMounted] = useState(false);
  const [bounds, setBounds] = useState<L.LatLngBoundsExpression | null>(null);
  
  // Keep track of previous trucks to detect arrivals
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
      
      // 1. Detect Arrivals
      const currentIds = new Set(data.map((t: any) => t.truck_id));
      const prevIds = prevTrucksRef.current;

      // If an ID was in prev but NOT in current, it arrived/finished
      prevIds.forEach(id => {
        if (!currentIds.has(id)) {
          toast.success(`Truck ${id} has arrived at destination!`, {
            icon: '🏁',
            duration: 5000,
            style: { background: '#10b981', color: '#fff' }
          });
        }
      });

      // Update Ref
      prevTrucksRef.current = currentIds;
      setTrucks(data);

      // Calculate Bounds
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
        setIncidents(data);
         if (data.length > 0) {
            const points: L.LatLngExpression[] = data.map((i: any) => [i.latitude, i.longitude]);
            setBounds(L.latLngBounds(points));
         }
      };
      fetchIncidents();
    }
  }, [viewMode]);

  if (!isMounted) return <div className="h-full w-full min-h-[500px] bg-slate-900 animate-pulse rounded-xl flex items-center justify-center text-slate-500">Loading Map...</div>;

  // Custom Green Pulse Icon
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
      case 'POLICE_CHECKPOINT': return '#ef4444'; // Red
      case 'BAD_ROAD': return '#a855f7'; // Purple
      case 'TRAFFIC': return '#f59e0b'; // Orange
      case 'ACCIDENT': return '#ef4444'; // Red
      default: return '#3b82f6'; // Blue
    }
  };

  return (
    <div 
      className="relative w-full rounded-2xl overflow-hidden border border-slate-700 shadow-2xl isolate"
      style={{ height: '100%', minHeight: '600px' }}
    >
       
       {/* Task 3: Floating Controls (The HUD) */}
       
       {/* Top Right Toggle */}
       <div 
         className="absolute top-5 right-5 z-[1000] flex gap-1 p-1 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-lg shadow-xl"
       >
          <button
            onClick={() => setViewMode('FLEET')}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
              viewMode === 'FLEET' 
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>🚛</span> Fleet
          </button>
          <button
            onClick={() => setViewMode('HEATMAP')}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
              viewMode === 'HEATMAP' 
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span>⚠️</span> Risk Zones
          </button>
       </div>

       {/* Bottom Right Legend */}
       <div 
         className="absolute bottom-8 right-5 z-[1000] flex flex-col gap-2 p-4 rounded-xl border border-slate-700 shadow-xl backdrop-blur-md"
         style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
       >
          <div className="font-bold text-slate-100 mb-1 text-sm">Map Legend</div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
            <span>Active Truck Route</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span>Police Checkpoint</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span>Bad Road / Pothole</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            <span>Heavy Traffic</span>
          </div>
       </div>

       {/* Task 2: The Map Layer */}
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

          // Skip if no valid coordinates
          if (currentLat === undefined || currentLon === undefined) return null;

          return (
            <Fragment key={truck.shipment_id || truck.truck_id || Math.random()}>
              {/* The Dot */}
              <Marker position={[currentLat, currentLon]} icon={truckIcon}>
                <Popup className="font-sans">
                  <div className="text-slate-900">
                    <strong>{truck.truck_id}</strong><br/>
                    Speed: {Math.round(truck.speed || 60)} km/h<br/>
                    Dest: {truck.dest_lat.toFixed(2)}, {truck.dest_lon.toFixed(2)}
                  </div>
                </Popup>
              </Marker>

              {/* The Line to Destination */}
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

        {viewMode === 'HEATMAP' && incidents.map((incident, idx) => (
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
              <Tooltip direction="top" offset={[0, -10]} opacity={1} className="custom-tooltip">
                <div className="text-slate-900 text-sm font-sans">
                  <b className="uppercase text-xs tracking-wider block mb-1">{incident.incident_type.replace('_', ' ')}</b>
                  <span className="text-xs text-slate-600">Severity: {incident.severity || 1}/5</span>
                </div>
              </Tooltip>
           </CircleMarker>
        ))}

      </MapContainer>
    </div>
  );
}