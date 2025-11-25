package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestDashboardEndpoint(t *testing.T) {
	// Ensure clean state
	ClearDB(t)

	// Setup Fixtures
	// 1. Active Truck (IN_TRANSIT)
	truck1 := CreateTestTruck(t)
	CreateTestShipment(t, truck1, "IN_TRANSIT")

	// 2. Another Active Truck (IN_TRANSIT)
	truck2 := CreateTestTruck(t)
	CreateTestShipment(t, truck2, "IN_TRANSIT")

	// 3. Completed Shipment (DELIVERED)
	truck3 := CreateTestTruck(t)
	CreateTestShipment(t, truck3, "DELIVERED")

	// 4. Idle Truck (No active shipment) - Should not count as active truck in dashboard logic
	CreateTestTruck(t)

	router := TestRouter

	t.Run("Get Summary", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/dashboard/summary?range=24h", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &resp)
		assert.NoError(t, err)

		// Assert exact counts
		// Active Trucks: truck1 and truck2 are in IN_TRANSIT shipments.
		assert.Equal(t, float64(2), resp["total_active_trucks"], "Should have 2 active trucks")
		
		// Completed Shipments: truck3's shipment is DELIVERED.
		assert.Equal(t, float64(1), resp["total_completed_today"], "Should have 1 completed shipment")
		
		// Alerts: We haven't seeded any events, so alerts should be 0.
		assert.Equal(t, float64(0), resp["alerts_count"], "Should have 0 alerts")
		
		assert.Equal(t, "24h", resp["time_range"])
	})
}
