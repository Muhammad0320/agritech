-- Remove cargo_temp from logistics_events
ALTER TABLE logistics_events DROP COLUMN IF EXISTS cargo_temp;

-- Create Incidents Table
CREATE TABLE IF NOT EXISTS logistics_incidents (
    id SERIAL PRIMARY KEY,
    time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    truck_id TEXT NOT NULL REFERENCES trucks(id),
    shipment_id TEXT REFERENCES shipments(id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    incident_type TEXT NOT NULL, -- 'POLICE_CHECKPOINT', 'BREAKDOWN', 'ACCIDENT', 'TRAFFIC'
    description TEXT,
    severity INT CHECK (severity >= 1 AND severity <= 5)
);
