package db

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool

func ConnectDB() error {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		// Default fallback for development - CHANGE THIS IN PRODUCTION
		dbURL = "postgres://postgres:password@localhost:5432/agritrack?sslmode=disable"
	}

	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		return fmt.Errorf("unable to parse database config: %v", err)
	}

	config.MaxConns = 10
	config.MinConns = 2
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = 30 * time.Minute

	Pool, err = pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return fmt.Errorf("unable to create connection pool: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := Pool.Ping(ctx); err != nil {
		return fmt.Errorf("unable to ping database: %v", err)
	}
	
	fmt.Println("Successfully connected to TimescaleDB/PostgreSQL ✅")
	return nil
}

func InitDB(pool *pgxpool.Pool) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// --- Code-First Schema Initialization ---
	
	// 1. Enable TimescaleDB Extension
	_, err := pool.Exec(ctx, "CREATE EXTENSION IF NOT EXISTS timescaledb;")
	if err != nil {
		return fmt.Errorf("failed to create timescaledb extension: %v", err)
	}

	// 2. Create Tables
	queries := []string{
		// Users table
		`CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			username TEXT UNIQUE NOT NULL,
			password TEXT NOT NULL, -- In production, hash this!
			role TEXT NOT NULL -- 'farmer', 'driver'
		);`,
		// Trucks metadata table
		`CREATE TABLE IF NOT EXISTS trucks (
			id TEXT PRIMARY KEY,
			driver_name TEXT NOT NULL,
			plate_number TEXT NOT NULL
		);`,
		// Shipments table
		`CREATE TABLE IF NOT EXISTS shipments (
			id TEXT PRIMARY KEY,
			truck_id TEXT REFERENCES trucks(id),
			origin_lat DOUBLE PRECISION NOT NULL,
			origin_lon DOUBLE PRECISION NOT NULL,
			dest_lat DOUBLE PRECISION NOT NULL,
			dest_lon DOUBLE PRECISION NOT NULL,
			status TEXT NOT NULL, -- 'CREATED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'
			created_at TIMESTAMPTZ DEFAULT NOW(),
			completed_at TIMESTAMPTZ
		);`,
		// Logistics events table (Hypertable candidate)
		`CREATE TABLE IF NOT EXISTS logistics_events (
			time TIMESTAMPTZ NOT NULL,
			truck_id TEXT NOT NULL REFERENCES trucks(id),
			shipment_id TEXT REFERENCES shipments(id),
			latitude DOUBLE PRECISION NOT NULL,
			longitude DOUBLE PRECISION NOT NULL,
			event_type TEXT NOT NULL, -- 'moving', 'stopped', 'idle'
			speed DOUBLE PRECISION
		);`,
		// Incidents Table
		`CREATE TABLE IF NOT EXISTS logistics_incidents (
			id SERIAL PRIMARY KEY,
			time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			truck_id TEXT NOT NULL REFERENCES trucks(id),
			shipment_id TEXT REFERENCES shipments(id),
			latitude DOUBLE PRECISION NOT NULL,
			longitude DOUBLE PRECISION NOT NULL,
			incident_type TEXT NOT NULL, -- 'POLICE_CHECKPOINT', 'BREAKDOWN', 'ACCIDENT', 'TRAFFIC'
			description TEXT,
			severity INT CHECK (severity >= 1 AND severity <= 5)
		);`,
	}

	for _, query := range queries {
		if _, err := pool.Exec(ctx, query); err != nil {
			return fmt.Errorf("failed to execute query %q: %v", query, err)
		}
	}

	// 3. Convert to Hypertable (Conditional)
	// Check if hypertable exists to avoid error
	var exists bool
	err = pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM timescaledb_information.hypertables 
			WHERE hypertable_name = 'logistics_events'
		);
	`).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to check hypertable existence: %v", err)
	}

	if !exists {
		_, err = pool.Exec(ctx, "SELECT create_hypertable('logistics_events', 'time');")
		if err != nil {
			return fmt.Errorf("failed to create hypertable: %v", err)
		}
		fmt.Println("Converted logistics_events to hypertable")
	}

	// 4. Materialized View
	_, err = pool.Exec(ctx, `
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
	`)
	if err != nil {
		return fmt.Errorf("failed to create materialized view: %v", err)
	}

	fmt.Println("Database schema initialized successfully ✅")
	return nil
}

func CloseDB() {
	if Pool != nil {
		Pool.Close()
	}
}
