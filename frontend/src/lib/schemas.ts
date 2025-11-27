import { z } from 'zod';

export const CreateShipmentSchema = z.object({
  produceType: z.string().min(2, "Produce type is required"),
  destination: z.string().min(2, "Destination is required"),
  originLat: z.number().min(-90).max(90),
  originLon: z.number().min(-180).max(180),
});

export const JoinShipmentSchema = z.object({
  pickupCode: z.string().length(9, "Pickup code must be 9 characters (AG-XXXXXX)").regex(/^AG-\d{6}$/, "Invalid format (AG-XXXXXX)"),
});

export const IncidentSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  incidentType: z.string().min(1, "Incident type is required"),
  description: z.string().min(1, "Description is required"),
});
