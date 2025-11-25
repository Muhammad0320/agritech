package tests

import (
	"agri-track/internal/models"
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestTelemetryEndpoint(t *testing.T) {
	// Ensure clean state
	ClearDB(t)

	// Setup Fixtures
	token, _ := CreateTestUser(t, "telemetry_user")
	truckID := CreateTestTruck(t)
	shipmentID := CreateTestShipment(t, truckID, "IN_TRANSIT")

	router := TestRouter

	t.Run("Valid Payload with Auth", func(t *testing.T) {
		payload := models.LogisticsEvent{
			TruckID:    truckID,
			ShipmentID: shipmentID,
			Latitude:   10.0,
			Longitude:  20.0,
			EventType:  "moving",
			Speed:      50.0,
			Time:       time.Now(),
		}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "/api/telemetry", bytes.NewBuffer(body))
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Expect 202 Accepted as the shipment exists and is IN_TRANSIT
		assert.Equal(t, http.StatusAccepted, w.Code)
		
		var resp map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &resp)
		assert.Equal(t, "queued", resp["status"])
	})

	t.Run("Invalid Payload", func(t *testing.T) {
		payload := map[string]interface{}{
			"truck_id": truckID,
			// Missing ShipmentID and other fields
		}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "/api/telemetry", bytes.NewBuffer(body))
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Non-Existent Shipment", func(t *testing.T) {
		payload := models.LogisticsEvent{
			TruckID:    truckID,
			ShipmentID: "non-existent-shipment",
			Latitude:   10.0,
			Longitude:  20.0,
			EventType:  "moving",
			Speed:      50.0,
			Time:       time.Now(),
		}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "/api/telemetry", bytes.NewBuffer(body))
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Handler checks DB, should fail
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("No Auth", func(t *testing.T) {
		req, _ := http.NewRequest("POST", "/api/telemetry", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}
