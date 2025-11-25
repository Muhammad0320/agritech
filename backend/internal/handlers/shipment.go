package handlers

import (
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
	_, err := db.Pool.Exec(c.Request.Context(), `
		INSERT INTO shipments (id, truck_id, origin_lat, origin_lon, dest_lat, dest_lon, status)
		VALUES ($1, $2, $3, $4, $5, $6, 'CREATED')
	`, id, req.TruckID, req.OriginLat, req.OriginLon, req.DestLat, req.DestLon)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create shipment"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": id, "status": "CREATED"})
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
