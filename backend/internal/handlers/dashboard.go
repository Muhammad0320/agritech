package handlers

import (
	"fmt"
	"net/http"

	"agri-track/internal/db"

	"github.com/gin-gonic/gin"
)

type DashboardHandler struct{}

func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{}
}

func (h *DashboardHandler) GetSummary(c *gin.Context) {
	var totalActive int
	var totalCompleted int
	var alertsCount int

	// 1. Dynamic Time Filtering
	timeRange := c.DefaultQuery("range", "24h")
	var startTime string

	switch timeRange {
	case "24h":
		startTime = "NOW() - INTERVAL '24 hours'"
	case "7d":
		startTime = "NOW() - INTERVAL '7 days'"
	case "30d":
		startTime = "NOW() - INTERVAL '30 days'"
	case "all":
		startTime = "'1970-01-01'" // Effectively all time
	default:
		startTime = "NOW() - INTERVAL '24 hours'"
		timeRange = "24h"
	}

	// Active Trucks (Unique trucks in IN_TRANSIT shipments)
	// This metric is usually real-time, so time range might not apply directly,
	// but let's keep it as is for "current active trucks".
	err := db.Pool.QueryRow(c.Request.Context(), "SELECT COUNT(DISTINCT truck_id) FROM shipments WHERE status='IN_TRANSIT'").Scan(&totalActive)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch active trucks"})
		return
	}

	// Completed (Filtered by time range)
	// We use the calculated startTime here.
	queryCompleted := fmt.Sprintf("SELECT COUNT(*) FROM shipments WHERE status='DELIVERED' AND completed_at > %s", startTime)
	err = db.Pool.QueryRow(c.Request.Context(), queryCompleted).Scan(&totalCompleted)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch completed shipments"})
		return
	}

	// 2. Smart Stoppage Alert Logic
	// Logic:
	// a. Get latest position of every active truck (IN_TRANSIT).
	// b. Get position of that same truck 30 minutes ago (approx).
	// c. Calculate distance.
	// d. Alert if distance < 200m.

	// Note: We use a CTE to get the latest event and the event ~30 mins ago.
	// Since we don't have PostGIS, we use a simplified Euclidean distance approximation for lat/lon.
	// 1 degree lat ~= 111km. 1 degree lon ~= 111km * cos(lat).
	// For small distances, sqrt((dLat*111000)^2 + (dLon*111000*cos(avgLat))^2) is sufficient.
	// 200 meters = 0.2 km.

	alertQuery := `
		WITH latest_events AS (
			SELECT DISTINCT ON (truck_id)
				truck_id,
				time as last_time,
				latitude as last_lat,
				longitude as last_lon
			FROM logistics_events
			ORDER BY truck_id, time DESC
		),
		past_events AS (
			SELECT DISTINCT ON (truck_id)
				truck_id,
				time as past_time,
				latitude as past_lat,
				longitude as past_lon
			FROM logistics_events
			WHERE time < NOW() - INTERVAL '30 minutes'
			ORDER BY truck_id, time DESC
		),
		active_trucks AS (
			SELECT truck_id FROM shipments WHERE status = 'IN_TRANSIT'
		)
		SELECT COUNT(*)
		FROM latest_events le
		JOIN past_events pe ON le.truck_id = pe.truck_id
		JOIN active_trucks at ON le.truck_id = at.truck_id
		WHERE
			-- Check if the latest event is recent (e.g., within last 2 hours) to ensure we aren't alerting on stale data
			le.last_time > NOW() - INTERVAL '2 hours'
			AND
			-- Euclidean distance approximation (in degrees, roughly)
			-- 0.0018 degrees is approx 200m (very rough, but sufficient for "hasn't moved")
			SQRT(POWER(le.last_lat - pe.past_lat, 2) + POWER(le.last_lon - pe.past_lon, 2)) < 0.0018
	`

	err = db.Pool.QueryRow(c.Request.Context(), alertQuery).Scan(&alertsCount)
	if err != nil {
		// If no rows or error, just default to 0 for now, or log error
		// In a real app, we might want to handle this better.
		// For now, assume 0 if query fails (e.g. no events).
		alertsCount = 0
		// Log the error for debugging (fmt.Println is fine for this task)
		fmt.Printf("Error calculating alerts: %v\n", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"total_active_trucks":   totalActive,
		"total_completed_today": totalCompleted, // Kept key name for compatibility, but now dynamic
		"alerts_count":          alertsCount,
		"time_range":            timeRange,
	})
}
