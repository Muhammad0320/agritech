'use server';

import { fetchClient } from "@/lib/fetchClient";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export async function createShipmentAction() {
  try {
    // 1. Create Shipment
    // Using dummy coordinates for demo purposes (Lagos to Abuja approx)
    const createRes = await fetchClient<{ id: string, pickup_code: string }>("/api/shipments", {
      method: "POST",
      body: JSON.stringify({
        // truck_id is now optional/omitted
        origin_lat: 6.5244,
        origin_lon: 3.3792,
        dest_lat: 9.0765,
        dest_lon: 7.3986
      })
    });

    const { id: newShipmentId, pickup_code } = createRes;

    // Save state to cookie for persistence (Optional)
    const cookieStore = await cookies();
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
  // truck_id is now handled by the backend via the auth token
  
  try {
    const response = await fetchClient<{ success: boolean, shipment_id: string, origin_lat: number, origin_lon: number }>("/api/shipments/pickup", {
      method: "POST",
      body: JSON.stringify({ 
        pickup_code: pickupCode
      }),
    });

    if (response.success) {
        cookieStore.set("active_shipment", response.shipment_id);
        cookieStore.set("active_truck", "ME"); 
        
        // We could store the starting coordinates if needed, but for now just success
        
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
  const truckId = cookieStore.get("active_truck")?.value || "unknown_truck";
  const shipmentId = cookieStore.get("active_shipment")?.value || "unknown_shipment";

  try {
    await fetchClient("/api/telemetry/incident", {
      method: "POST",
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
  try {
    // Fetch latest truck status
    const data = await fetchClient<any[]>("/status", {
      method: "GET",
      cache: "no-store" // Ensure fresh data
    });
    return data;
  } catch (error) {
    console.error("Failed to get live positions:", error);
    return [];
  }
}

export async function getLiveTrucksAction() {
  try {
    // User requested: SELECT * FROM shipments WHERE status = 'IN_TRANSIT'
    // We will use the existing /status endpoint if it fits, OR create a new one?
    // The user said "Query the DB...". Since we are in a Server Action, we can't query DB directly (unless we use the DB pool directly, but we are in frontend).
    // We must call the backend.
    // The backend doesn't have an endpoint for "active shipments" specifically, but /status returns truck status.
    // BUT the user asked for "SELECT * FROM shipments".
    // I should probably add a backend endpoint for this or use /status if it's close enough.
    // However, the user's prompt "Query the DB: SELECT * FROM shipments..." suggests I should modify the backend or use a raw query if I was in backend.
    // Since I am in frontend, I need an endpoint.
    // I will assume I should add a new endpoint `GET /shipments?status=IN_TRANSIT` or similar.
    // OR, I can use the existing `getLivePositionsAction` which calls `/status`.
    // Let's look at the user request again: "Create a getLiveTrucks Server Action. Query the DB... Pass this data to the LiveMap".
    // This implies the Server Action *is* the place where the query happens? No, Server Actions in Next.js run on server, but my DB is accessed via Go Backend.
    // So I need a Go Backend endpoint.
    // I will add `GET /shipments/active` to Go Backend.
    
    const data = await fetchClient<any[]>("/api/shipments/active", {
      method: "GET",
      cache: "no-store"
    });
    return data;
  } catch (error) {
    console.error("Failed to get live trucks:", error);
    return [];
  }
}

export async function getDashboardSummaryAction() {
  try {
    const data = await fetchClient<any>("/dashboard/summary?range=24h", {
      method: "GET",
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
