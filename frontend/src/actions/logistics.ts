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
    const response = await fetchClient<{ success: boolean, shipment_id: string }>("/api/shipments/pickup", {
      method: "POST",
      body: JSON.stringify({ 
        pickup_code: pickupCode
      }),
    });

    if (response.success) {
        cookieStore.set("active_shipment", response.shipment_id);
        // We assume the backend used the authenticated user's ID as the truck ID
        // We can't easily get it back here without another call, but for the UI state:
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
