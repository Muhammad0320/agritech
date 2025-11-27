'use server';

import { fetchClient } from "@/lib/fetchClient";
import { cookies } from "next/headers";
import { CreateShipmentSchema, JoinShipmentSchema, IncidentSchema } from "@/lib/schemas";

// Mock Destination Mapping (Hackathon Trick)
const DESTINATIONS: Record<string, { lat: number, lon: number }> = {
  'Ilorin Market': { lat: 8.4799, lon: 4.5418 },
  'Lagos Port': { lat: 6.4541, lon: 3.3947 },
  'Abuja Depot': { lat: 9.0765, lon: 7.3986 },
  'Kano Distribution': { lat: 12.0022, lon: 8.5920 },
};

export async function createShipmentAction(produceType: string, destination: string, originLat: number, originLon: number) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  // 1. Validation
  const validation = CreateShipmentSchema.safeParse({ produceType, destination, originLat, originLon });
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  // 2. Map Destination to Coords
  const destCoords = DESTINATIONS[destination] || DESTINATIONS['Lagos Port']; // Default to Lagos

  try {
    const response = await fetchClient<{ id: string, pickup_code: string }>("/api/shipments", {
      method: "POST",
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: JSON.stringify({
        origin_lat: originLat,
        origin_lon: originLon,
        dest_lat: destCoords.lat,
        dest_lon: destCoords.lon,
        // Backend doesn't store produceType yet, but we validate it. 
      }),
    });

    return { success: true, pickup_code: response.pickup_code };
  } catch (error: any) {
    console.error("Create shipment failed:", error);
    return { success: false, error: "Failed to create shipment" };
  }
}

export async function joinShipmentAction(pickupCode: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  // 1. Validation
  const validation = JoinShipmentSchema.safeParse({ pickupCode });
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  try {
    const result = await fetchClient<{ success: boolean, shipment_id: string, truck_id: string, origin_lat: number, origin_lon: number }>("/api/shipments/pickup", {
      method: "POST",
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: JSON.stringify({ pickup_code: pickupCode }),
    });

    if (result.success) {
      // Save Truck ID and Shipment ID from Backend Response
      cookieStore.set("active_shipment", result.shipment_id);
      cookieStore.set("active_truck", result.truck_id); // No longer "ME"
      
      return { success: true };
    }
    return { success: false, error: "Invalid pickup code" };
  } catch (error: any) {
    console.error("Pickup failed:", error);
    return { success: false, error: error.message || "Failed to pickup shipment" };
  }
}

export async function reportIncidentAction(lat: number, lng: number, type: string, description: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const truckId = cookieStore.get("active_truck")?.value;
  const shipmentId = cookieStore.get("active_shipment")?.value;

  if (!truckId || !shipmentId) {
    return { success: false, error: "No active trip found" };
  }

  // 1. Validation
  const validation = IncidentSchema.safeParse({ latitude: lat, longitude: lng, incidentType: type, description });
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  try {
    await fetchClient("/api/telemetry/incident", {
      method: "POST",
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: JSON.stringify({
        truck_id: truckId,
        shipment_id: shipmentId,
        latitude: lat,
        longitude: lng,
        incident_type: type,
        description: description,
        severity: type === 'ACCIDENT' ? 3 : 1
      }),
    });

    return { success: true };
  } catch (error: any) {
    console.error("Report incident failed:", error);
    return { success: false, error: "Failed to report incident" };
  }
}

export async function getLiveTrucksAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  try {
    const trucks = await fetchClient<any[]>("/api/shipments/active", {
      method: "GET",
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      cache: "no-store" 
    });
    return trucks;
  } catch (error) {
    console.error("Failed to fetch live trucks:", error);
    return [];
  }
}

export async function getDashboardSummaryAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  try {
    const summary = await fetchClient<any>("/api/dashboard/summary", {
      method: "GET",
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      cache: "no-store"
    });
    return summary;
  } catch (error) {
    console.error("Failed to fetch dashboard summary:", error);
    return null;
  }
}
