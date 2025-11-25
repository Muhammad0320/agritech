import DriverInterface from "@/components/DriverInterface";
import { cookies } from "next/headers";

export default async function DriverLivePage() {
  const cookieStore = await cookies();
  const activeShipment = cookieStore.get("active_shipment");
  const isTripActive = !!activeShipment?.value;

  // In a real production app, we should verify this shipment ID with the backend
  // to ensure it's still valid and belongs to the driver.
  // For now, we trust the cookie as per the "Perceived Performance" focus,
  // but we could add a fetch here if needed.

  return (
    <main>
      <DriverInterface isTripActive={isTripActive} />
    </main>
  );
}
