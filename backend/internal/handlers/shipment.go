package handlers

import (
	"fmt"
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

	fmt.Println("Reached here? ------------------------")

	id := uuid.New().String()
	// Generate 6-digit pickup code
	pickupCode := fmt.Sprintf("AG-%06d", rand.Intn(1000000))
	fmt.Println(pickupCode, "---------------------")
	
	_, err := db.Pool.Exec(c.Request.Context(), `
		INSERT INTO shipments (id, truck_id, origin_lat, origin_lon, dest_lat, dest_lon, status, pickup_code)
		VALUES ($1, $2, $3, $4, $5, $6, 'CREATED', $7)
	`, id, req.TruckID, req.OriginLat, req.OriginLon, req.DestLat, req.DestLon, pickupCode)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create shipment"})
		fmt.Println(err, "-----------------------------")
		return
	}	
	fmt.Println("Reached here 2222? ------------------------")
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
		TruckID    string `json:"truck_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, formatValidationError(err))
		return
	}

	var shipmentID string
	err := db.Pool.QueryRow(c.Request.Context(), `
		UPDATE shipments 
		SET status='IN_TRANSIT', truck_id=$1 
		WHERE pickup_code=$2 AND status='CREATED'
		RETURNING id
	`, req.TruckID, req.PickupCode).Scan(&shipmentID)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid pickup code or shipment not available"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "IN_TRANSIT", "shipment_id": shipmentID})
}
