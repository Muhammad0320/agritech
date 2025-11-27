package handlers

import (
	"fmt"
	"math"
	"math/rand"
	"net/http"
	"time"

	"agri-track/internal/db"
	"agri-track/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type ShipmentHandler struct{}

func NewShipmentHandler() *ShipmentHandler {
	return &ShipmentHandler{}
}

func (h *ShipmentHandler) CreateShipment(c *gin.Context) {
	var req models.ShipmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		
		c.JSON(http.StatusBadRequest, formatValidationError(err))
		return
	}

	id := uuid.New().String()
	// Generate 6-digit pickup code
	pickupCode := fmt.Sprintf("AG-%06d", rand.Intn(1000000))
	
	_, err := db.Pool.Exec(c.Request.Context(), `
		INSERT INTO shipments (id, truck_id, origin_lat, origin_lon, dest_lat, dest_lon, status, pickup_code)
		VALUES ($1, $2, $3, $4, $5, $6, 'CREATED', $7)
	`, id, req.TruckID, req.OriginLat, req.OriginLon, req.DestLat, req.DestLon, pickupCode)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create shipment"})
		return
	}	
	c.JSON(http.StatusCreated, gin.H{"id": id, "status": "CREATED", "pickup_code": pickupCode})
}

func (h *ShipmentHandler) StartShipment(c *gin.Context) {
	var req struct {
		ShipmentID string `json:"shipment_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := db.Pool.Exec(c.Request.Context(), `
		UPDATE shipments SET status='IN_TRANSIT' WHERE id=$1 AND status='CREATED'
	`, req.ShipmentID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start shipment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "IN_TRANSIT"})
}

func (h *ShipmentHandler) Handshake(c *gin.Context) {
	var req struct {
		ShipmentID string `json:"shipment_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := db.Pool.Exec(c.Request.Context(), `
		UPDATE shipments SET status='DELIVERED', completed_at=$1 WHERE id=$2
	`, time.Now(), req.ShipmentID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update shipment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "DELIVERED"})
}

func (h *ShipmentHandler) PickupShipment(c *gin.Context) {
	var req struct {
		PickupCode string `json:"pickup_code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, formatValidationError(err))
		return
	}


	// Get Truck ID from authenticated context
	truckID := c.GetString("user_id")
	if truckID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	
	// Ensure the truck exists in the trucks table (Auto-register if missing to prevent FK error)
	// In a real app, we would have a separate registration flow for trucks.
	// For this demo, we assume the user ID is the truck ID.
	_, err := db.Pool.Exec(c.Request.Context(), `
		INSERT INTO trucks (id, driver_name, plate_number) 
		VALUES ($1, 'Driver ' || $1, 'LAG-' || SUBSTRING($1, 1, 4))
		ON CONFLICT (id) DO NOTHING
	`, truckID)
	if err != nil {
		fmt.Println("Failed to auto-register truck:", err)
		// Continue anyway, maybe it exists?
	}

	var shipmentID string
	var originLat, originLon float64
	err = db.Pool.QueryRow(c.Request.Context(), `
		UPDATE shipments 
		SET status='IN_TRANSIT', truck_id=$1, started_at=NOW()
		WHERE pickup_code=$2 AND status='CREATED'
		RETURNING id, origin_lat, origin_lon
	`, truckID, req.PickupCode).Scan(&shipmentID, &originLat, &originLon)

	if err != nil {
		// Check if it was a "not found" or "conflict" (already taken)
		// Simple check: query if code exists at all
		var status string
		checkErr := db.Pool.QueryRow(c.Request.Context(), "SELECT status FROM shipments WHERE pickup_code=$1", req.PickupCode).Scan(&status)
		
		if checkErr != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Invalid pickup code"})
		} else if status != "CREATED" {
			c.JSON(http.StatusConflict, gin.H{"error": "Shipment already taken or completed"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to pickup shipment"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true, 
		"shipment_id": shipmentID,
		"truck_id": truckID,
		"origin_lat": originLat,
		"origin_lon": originLon,
	})
}

func (h *ShipmentHandler) GetActiveShipments(c *gin.Context) {
	rows, err := db.Pool.Query(c.Request.Context(), `
		SELECT s.id, s.truck_id, 
		       COALESCE(le.latitude, s.origin_lat) as lat, 
		       COALESCE(le.longitude, s.origin_lon) as lon, 
		       s.dest_lat, s.dest_lon, s.status, s.pickup_code,
		       COALESCE(le.speed, 0) as speed
		FROM shipments s
		LEFT JOIN LATERAL (
			SELECT latitude, longitude, speed
			FROM logistics_events
			WHERE shipment_id = s.id
			ORDER BY time DESC
			LIMIT 1
		) le ON true
		WHERE s.status = 'IN_TRANSIT'
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch active shipments"})
		return
	}
	defer rows.Close()

	shipments := []gin.H{}
	for rows.Next() {
		var id, status, pickupCode string
		var truckID *string
		var lat, lon, destLat, destLon, speed float64
		
		err := rows.Scan(&id, &truckID, &lat, &lon, &destLat, &destLon, &status, &pickupCode, &speed)
		if err != nil {
			continue
		}
		
		shipments = append(shipments, gin.H{
			"id": id,
			"truck_id": truckID,
			"lat": lat,
			"lon": lon,
			"dest_lat": destLat,
			"dest_lon": destLon,
			"status": status,
			"pickup_code": pickupCode,
			"speed": speed,
		})
	}

	c.JSON(http.StatusOK, shipments)
}

func (h *ShipmentHandler) CompleteShipment(c *gin.Context) {
	var req struct {
		ShipmentID string `json:"shipment_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var currentStatus string
	err := db.Pool.QueryRow(c.Request.Context(), "SELECT status FROM shipments WHERE id=$1", req.ShipmentID).Scan(&currentStatus)
	
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Shipment not found"})
		return
	}

	if currentStatus == "DELIVERED" {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Shipment already verified"})
		return
	}

	if currentStatus == "CREATED" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Shipment has not started yet"})
		return
	}

	if currentStatus != "IN_TRANSIT" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid shipment status"})
		return
	}

	_, err = db.Pool.Exec(c.Request.Context(), `
		UPDATE shipments SET status='DELIVERED', completed_at=$1 
		WHERE id=$2
	`, time.Now(), req.ShipmentID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete shipment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (h *ShipmentHandler) VerifyArrival(c *gin.Context) {
	var req struct {
		ShipmentID string  `json:"shipment_id"`
		Lat        float64 `json:"lat"`
		Lon        float64 `json:"lon"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var destLat, destLon float64
	err := db.Pool.QueryRow(c.Request.Context(), `
		SELECT dest_lat, dest_lon FROM shipments WHERE id=$1
	`, req.ShipmentID).Scan(&destLat, &destLon)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Shipment not found"})
		return
	}

	// Calculate distance
	dist := haversine(req.Lat, req.Lon, destLat, destLon)

	if dist > 1000 { // 1km
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("You are too far from destination (%.2fm away)", dist)})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Arrival verified"})
}

// Haversine formula to calculate distance in meters
func haversine(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371000 // Earth radius in meters
	phi1 := lat1 * (math.Pi / 180)
	phi2 := lat2 * (math.Pi / 180)
	deltaPhi := (lat2 - lat1) * (math.Pi / 180)
	deltaLambda := (lon2 - lon1) * (math.Pi / 180)

	a := math.Sin(deltaPhi/2)*math.Sin(deltaPhi/2) +
		math.Cos(phi1)*math.Cos(phi2)*
			math.Sin(deltaLambda/2)*math.Sin(deltaLambda/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c
}
