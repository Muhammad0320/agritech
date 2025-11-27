'use server';

import { fetchClient } from "@/lib/fetchClient";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function createShipmentAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  try {
    // 1. Create Shipment
    const createRes = await fetchClient<{ id: string, pickup_code: string }>("/api/shipments", {
      method: "POST",
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: JSON.stringify({
        // truck_id is now optional/omitted
        origin_lat: 6.5244,
        origin_lon: 3.3792,
        dest_lat: 9.0765,
        dest_lon: 7.3986
      })
    });

    const { id: newShipmentId, pickup_code } = createRes;

    cookieStore.set("active_shipment", newShipmentId);

    return { success: true, shipmentId: newShipmentId, pickupCode: pickup_code };

  } catch (error: any) {
    console.error("Failed to create shipment:", error);
    if (error.message) {
        console.error("Error Message:", error.message);
    }
    throw new Error(`Failed to create shipment: ${error.message || "Unknown error"}`);
  }
}

export async function joinShipmentAction(pickupCode: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  console.log("joinShipmentAction - Token from cookie:", token ? "FOUND" : "MISSING");
  if (token) console.log("Token sample:", token.substring(0, 10) + "...");

  
  try {
    const response = await fetchClient<{ success: boolean, shipment_id: string, origin_lat: number, origin_lon: number }>("/api/shipments/pickup", {
      method: "POST",
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: JSON.stringify({ 
        pickup_code: pickupCode
      }),
    });

    if (response.success) {
        cookieStore.set("active_shipment", response.shipment_id);
        cookieStore.set("active_truck", "ME"); 
        
        revalidatePath("/driver");
        return { success: true };
    }
    return { success: false, error: "Failed to join" };

  } catch (error: any) {
    console.error("Failed to join shipment:", error);
    return { success: false, error: error.message || "Failed to join shipment" };
  }
}

export async function reportIncidentAction(lat: number, lng: number, type: string, description: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const truckId = cookieStore.get("active_truck")?.value || "unknown_truck";
  const shipmentId = cookieStore.get("active_shipment")?.value || "unknown_shipment";

  console.log("reportIncidentAction - Truck ID ------------:", truckId);
  console.log("reportIncidentAction - Shipment ID -------------- :", shipmentId);

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
        severity: 3 // Default severity
      }),
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to report incident:", error);
    return { success: false, error: "Failed to report incident" };
  }
}

export async function getLivePositionsAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  try {
    // Fetch latest truck status
    const data = await fetchClient<any[]>("/status", {
      method: "GET",
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      cache: "no-store" // Ensure fresh data
    });
    return data;
  } catch (error) {
    console.error("Failed to get live positions:", error);
    return [];
  }
}

export async function getLiveTrucksAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  try {
    const data = await fetchClient<any[]>("/api/shipments/active", {
      method: "GET",
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      cache: "no-store"
    });
    return data;
  } catch (error) {
    console.error("Failed to get live trucks:", error);
    return [];
  }
}

export async function getDashboardSummaryAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  try {
    const data = await fetchClient<any>("/dashboard/summary?range=24h", {
      method: "GET",
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      cache: "no-store"
    });
    return data;
  } catch (error) {
    console.error("Failed to get dashboard summary:", error);
    return {
      total_active_trucks: 0,
      total_completed_today: 0,
      alerts_count: 0
    };
  }
}
