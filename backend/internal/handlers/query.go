package handlers

import (
	"context"
	"net/http"
	"time"

	"agri-track/internal/db"
	"agri-track/internal/models"

	"github.com/gin-gonic/gin"
)

type QueryHandler struct{}

func NewQueryHandler() *QueryHandler {
	return &QueryHandler{}
}

func (h *QueryHandler) GetTruckStatus(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	// DISTINCT ON (truck_id) to get the latest event per truck
	query := `
		SELECT DISTINCT ON (truck_id)
			truck_id, time, latitude, longitude, speed, event_type
		FROM logistics_events
		ORDER BY truck_id, time DESC
	`

	rows, err := db.Pool.Query(ctx, query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch truck status"})
		return
	}
	defer rows.Close()

	var statuses []models.TruckStatus
	for rows.Next() {
		var s models.TruckStatus
		err := rows.Scan(&s.TruckID, &s.LastSeen, &s.Latitude, &s.Longitude, &s.Speed, &s.EventType)
		if err != nil {
			continue
		}
		statuses = append(statuses, s)
	}

	c.JSON(http.StatusOK, statuses)
}
