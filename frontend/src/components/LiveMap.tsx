'use client';

import { useEffect, useState, useRef, Fragment } from 'react';
import { getLiveTrucksAction } from '@/actions/logistics';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

export default function LiveMap() {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  
  // Keep track of previous trucks to detect arrivals
  const prevTrucksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setIsMounted(true);
    // Fix Leaflet Icon issue
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  }, []);

  useEffect(() => {
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
    };

    fetchTrucks();
    const interval = setInterval(fetchTrucks, 2000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="h-full w-full min-h-[500px] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl relative z-0">
       <MapContainer 
        center={[8.9, 4.6]} 
        zoom={7} 
        scrollWheelZoom={false} // Stops annoying zoom on scroll
        style={{ height: "100%", width: "100%", minHeight: "500px" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {trucks.map((truck) => {
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
                  weight: 2, 
                  dashArray: '5, 10', 
                  opacity: 0.6 
                }} 
              />
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}