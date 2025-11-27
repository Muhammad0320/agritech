package handlers

import (
	"context"
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"agri-track/internal/db"
	"agri-track/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

const (
	BatchSize     = 50
	FlushInterval = 2 * time.Second
)

type ShipmentMetadata struct {
	Status string 
	DestLat float64
	DestLon float64
}

type TelemetryHandler struct {
	eventChan chan models.LogisticsEvent

	// Add a cache and a lock (Mutex) for thread safety
    shipmentCache map[string]ShipmentMetadata // Maps ShipmentID -> Status
    cacheMutex    sync.RWMutex
}

func NewTelemetryHandler() *TelemetryHandler {
	handler := &TelemetryHandler{
        eventChan:     make(chan models.LogisticsEvent, 1000),
        shipmentCache: make(map[string]ShipmentMetadata),
    }
    // Start a background routine to refresh cache every minute (optional but good)
    return handler
}

func (h *TelemetryHandler) StartBatchProcessor(ctx context.Context) {
	var batch []models.LogisticsEvent
	ticker := time.NewTicker(FlushInterval)
	defer ticker.Stop()

	for {
		select {
		case event := <-h.eventChan:
			batch = append(batch, event)
			if len(batch) >= BatchSize {
				h.flushBatch(batch)
				batch = batch[:0]
			}
		case <-ticker.C:
			if len(batch) > 0 {
				h.flushBatch(batch)
				batch = batch[:0]
			}
		case <-ctx.Done():
			if len(batch) > 0 {
				h.flushBatch(batch)
			}
			return
		}
	}
}

// CalculateDistance returns distance in meters between two coordinates
func CalculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371000 // Earth radius in meters
	phi1 := lat1 * math.Pi / 180
	phi2 := lat2 * math.Pi / 180
	deltaPhi := (lat2 - lat1) * math.Pi / 180
	deltaLambda := (lon2 - lon1) * math.Pi / 180

	a := math.Sin(deltaPhi/2)*math.Sin(deltaPhi/2) +
		math.Cos(phi1)*math.Cos(phi2)*
			math.Sin(deltaLambda/2)*math.Sin(deltaLambda/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c
}

func (h *TelemetryHandler) ReceiveTelemetry(c *gin.Context) {
	var event models.LogisticsEvent
	if err := c.ShouldBindJSON(&event); err != nil {
		c.JSON(http.StatusBadRequest, formatValidationError(err))
		return
	}

	//  FAST LOOKUP (NO DB)
	h.cacheMutex.RLock()
	meta, exists := h.shipmentCache[event.ShipmentID]
	h.cacheMutex.RUnlock()

	if !exists {

		err := db.Pool.QueryRow(c.Request.Context(), 
		"SELECT status, dest_lat, dest_lon FROM shipments WHERE id=$1", event.ShipmentID).Scan(&meta.Status, &meta.DestLat, &meta.DestLon)
		
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Shipment ID"})
			return
		}	

		h.cacheMutex.Lock()
		h.shipmentCache[event.ShipmentID] = meta
		h.cacheMutex.Unlock()
	}

	if meta.Status != "IN_TRANSIT" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Shipment is not IN_TRANSIT"})
		return
	}

	// Geofence Check
	dist := CalculateDistance(event.Latitude, event.Longitude, meta.DestLat, meta.DestLon)
	if dist < 500 {
		event.NearDestination = true
	}

	// Set time if missing
	if event.Time.IsZero() {
		event.Time = time.Now()
	}

	// Non-blocking send to channel
	select {
	case h.eventChan <- event:
		c.JSON(http.StatusAccepted, gin.H{"status": "queued", "near_destination": event.NearDestination})
	default:
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "queue full"})
	}
}

func (h *TelemetryHandler) ReportIncident(c *gin.Context) {
	var req models.IncidentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, formatValidationError(err))
		return
	}

	_, err := db.Pool.Exec(c.Request.Context(), `
		INSERT INTO logistics_incidents (truck_id, shipment_id, latitude, longitude, incident_type, description, severity, time)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
	`, req.TruckID, req.ShipmentID, req.Latitude, req.Longitude, req.IncidentType, req.Description, req.Severity)

	if err != nil {
		log.Printf("Failed to report incident: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to report incident"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "Incident Reported"})
}

// flushBatch needs to be updated to include ShipmentID and NearDestination
func (h *TelemetryHandler) flushBatch(batch []models.LogisticsEvent) {
	if len(batch) == 0 {
		return
	}

	rows := make([][]interface{}, len(batch))
	for i, event := range batch {
		rows[i] = []interface{}{
			event.Time,
			event.TruckID,
			event.ShipmentID,
			event.Latitude,
			event.Longitude,
			event.EventType,
			event.Speed,
		}
	}

	_, err := db.Pool.CopyFrom(
		context.Background(),
		pgx.Identifier{"logistics_events"},
		[]string{"time", "truck_id", "shipment_id", "latitude", "longitude", "event_type", "speed"},
		pgx.CopyFromRows(rows),
	)

	if err != nil {
		log.Printf("Error flushing batch: %v", err)
	} else {
		log.Printf("Successfully flushed %d events", len(batch))
	}
}

func (h *TelemetryHandler) GetRecentIncidents(c *gin.Context) {
	// Fetch incidents from the last 24 hours
	rows, err := db.Pool.Query(c.Request.Context(), `
		SELECT truck_id, incident_type, description, severity, time 
		FROM logistics_incidents 
		WHERE time > NOW() - INTERVAL '24 hours'
		ORDER BY time DESC
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch incidents"})
		return
	}
	defer rows.Close()

	// Let's use a custom struct or map for response.
	var result []gin.H

	for rows.Next() {
		var truckID, iType, desc string
		var severity int
		var t time.Time
		if err := rows.Scan(&truckID, &iType, &desc, &severity, &t); err != nil {
			continue
		}
		result = append(result, gin.H{
			"truck_id":      truckID,
			"incident_type": iType,
			"description":   desc,
			"severity":      severity,
			"time":          t,
		})
	}

	c.JSON(http.StatusOK, result)
}
func (h *TelemetryHandler) SimulateDemo(c *gin.Context) {
    // 1. Define Simulation Parameters
    numTrucks := 5
    // Ilorin
    startLat, startLon := 8.5000, 4.5500
    // Jebba
    endLat, endLon := 9.1333, 4.8333

    ctx := c.Request.Context()

    // 2. Loop to spawn trucks
    for i := 1; i <= numTrucks; i++ {
        truckID := fmt.Sprintf("DEMO-TRUCK-%02d", i)
        shipmentID := uuid.New().String()

        // ---------------------------------------------------------
        // STEP 1: Create the User (So it exists for Auth logic)
        // ---------------------------------------------------------
        _, err := db.Pool.Exec(ctx, `
            INSERT INTO users (id, email, password, role, name)
            VALUES ($1, $2, 'demo123', 'DRIVER', $3)
            ON CONFLICT (id) DO NOTHING
        `, truckID, fmt.Sprintf("demo%d@agritrack.com", i), fmt.Sprintf("AI Bot %d", i))

        if err != nil {
            log.Printf("Warning: Failed to create demo user %s: %v", truckID, err)
        }

        // ---------------------------------------------------------
        // STEP 2: Create the Truck (CRITICAL FOR FOREIGN KEY)
        // ---------------------------------------------------------
        _, err = db.Pool.Exec(ctx, `
            INSERT INTO trucks (id, driver_name, plate_number)
            VALUES ($1, $2, $3)
            ON CONFLICT (id) DO NOTHING
        `, truckID, fmt.Sprintf("AI Pilot %d", i), fmt.Sprintf("DEMO-KWARA-%02d", i))

        if err != nil {
            log.Printf("Failed to create demo truck %s: %v", truckID, err)
            continue // Skip this truck if creation fails
        }

        // ---------------------------------------------------------
        // STEP 3: Create Shipment
        // ---------------------------------------------------------
        _, err = db.Pool.Exec(ctx, `
            INSERT INTO shipments (id, truck_id, origin_lat, origin_lon, dest_lat, dest_lon, status, pickup_code, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, 'IN_TRANSIT', 'DEMO12', NOW())
        `, shipmentID, truckID, startLat, startLon, endLat, endLon)

        if err != nil {
            log.Printf("Failed to create demo shipment for %s: %v", truckID, err)
            continue
        }

        // ---------------------------------------------------------
        // STEP 4: The Async Movie Script (Concurrent)
        // ---------------------------------------------------------
        go func(tID, sID string, idx int) {
            // Stagger start times
            time.Sleep(time.Duration(rand.Intn(3000)) * time.Millisecond)

            steps := 30 // Longer simulation
            for step := 0; step <= steps; step++ {
                progress := float64(step) / float64(steps)
                lat := startLat + (endLat-startLat)*progress
                lon := startLon + (endLon-startLon)*progress

                // Send Telemetry
                event := models.LogisticsEvent{
                    TruckID:    tID,
                    ShipmentID: sID,
                    Time:       time.Now(),
                    Latitude:   lat,
                    Longitude:  lon,
                    EventType:  "moving",
                    Speed:      60.0 + rand.Float64()*20.0, // Vary speed
                }
                h.eventChan <- event

                // Random Incidents
                // Truck 1 gets POLICE at step 10
                if idx == 1 && step == 10 {
                    db.Pool.Exec(context.Background(), `
                        INSERT INTO logistics_incidents (truck_id, shipment_id, latitude, longitude, incident_type, description, severity, time)
                        VALUES ($1, $2, $3, $4, 'POLICE_CHECKPOINT', 'Simulated Checkpoint', 1, NOW())
                    `, tID, sID, lat, lon)
                }

                // Truck 3 gets BAD_ROAD at step 15
                if idx == 3 && step == 15 {
                    db.Pool.Exec(context.Background(), `
                        INSERT INTO logistics_incidents (truck_id, shipment_id, latitude, longitude, incident_type, description, severity, time)
                        VALUES ($1, $2, $3, $4, 'BAD_ROAD', 'Simulated Bad Road', 2, NOW())
                    `, tID, sID, lat, lon)
                }

                // Vary sleep for speed variance
                sleepTime := 800 + rand.Intn(400) // 800ms to 1200ms
                time.Sleep(time.Duration(sleepTime) * time.Millisecond)
            }

            // Completion
            db.Pool.Exec(context.Background(), `
                UPDATE shipments SET status='DELIVERED', completed_at=NOW() WHERE id=$1
            `, sID)
        }(truckID, shipmentID, i)
    }

    c.JSON(http.StatusOK, gin.H{"success": true, "message": "Fleet simulation started (5 Trucks)"})
}