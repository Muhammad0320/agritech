-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, -- In production, hash this!
    role TEXT NOT NULL -- 'farmer', 'driver'
);

-- Trucks metadata table
CREATE TABLE IF NOT EXISTS trucks (
    id TEXT PRIMARY KEY,
    driver_name TEXT NOT NULL,
    plate_number TEXT NOT NULL
);

-- Shipments table
CREATE TABLE IF NOT EXISTS shipments (
    id TEXT PRIMARY KEY,
    truck_id TEXT REFERENCES trucks(id),
    origin_lat DOUBLE PRECISION NOT NULL,
    origin_lon DOUBLE PRECISION NOT NULL,
    dest_lat DOUBLE PRECISION NOT NULL,
    dest_lon DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL, -- 'CREATED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Logistics events table (Hypertable)
CREATE TABLE IF NOT EXISTS logistics_events (
    time TIMESTAMPTZ NOT NULL,
    truck_id TEXT NOT NULL REFERENCES trucks(id),
    shipment_id TEXT REFERENCES shipments(id), -- Nullable for now, but good to link
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    event_type TEXT NOT NULL, -- 'moving', 'stopped', 'idle'
    cargo_temp DOUBLE PRECISION,
    speed DOUBLE PRECISION
);

-- Convert to Hypertable
SELECT create_hypertable('logistics_events', 'time', if_not_exists => TRUE);

-- Materialized View for Average Speed per Hour
CREATE MATERIALIZED VIEW IF NOT EXISTS avg_speed_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    truck_id,
    AVG(speed) AS avg_speed
FROM
    logistics_events
GROUP BY
    bucket,
    truck_id;
