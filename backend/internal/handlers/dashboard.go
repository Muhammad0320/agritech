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

	// 2. Simplified Incident Count (Last 24h)
	err = db.Pool.QueryRow(c.Request.Context(), "SELECT COUNT(*) FROM logistics_incidents WHERE time > NOW() - INTERVAL '24 hours'").Scan(&alertsCount)
	if err != nil {
		alertsCount = 0
		fmt.Printf("Error counting incidents: %v\n", err)
	}

	// 3. Average Speed (Last 24h)
	var avgSpeed float64
	// 4. Avg Speed (Real-time: Last 5 minutes only)
	// COALESCE(..., 0) ensures we get 0 instead of NULL if no data exists
	err = db.Pool.QueryRow(c.Request.Context(), `
		SELECT COALESCE(AVG(speed), 0) 
		FROM logistics_events 
		WHERE time > NOW() - INTERVAL '5 minutes'
	`).Scan(&avgSpeed)

	if err != nil {
		avgSpeed = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"total_active_trucks":   totalActive,
		"total_completed_today": totalCompleted,
		"alerts_count":          alertsCount,
		"avg_speed":             int(avgSpeed), // Return as integer
		"time_range":            timeRange,
	})
}
