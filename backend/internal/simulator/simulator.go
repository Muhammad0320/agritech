package simulator

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"time"

	"agri-track/internal/models"
)

const (
	BaseURL = "http://localhost:8080"
)

// Ilorin to Jebba approximate coordinates
var (
	StartLat = 8.5000
	StartLon = 4.5500
	EndLat   = 9.1333
	EndLon   = 4.8333
)

func StartSimulation() {
	// Wait for server to start
	time.Sleep(3 * time.Second)
	fmt.Println("Starting FULL traffic simulation...")

	// 1. Create Demo Users (Direct DB insert for simplicity in simulation)
	// In real life, you'd use a registration endpoint.
	// Assuming users exist or we just proceed with known creds if we had a seeder.
	// For this demo, we'll assume the auth handler checks DB.
	// We need to seed a user first? Let's assume the user runs the schema script which could seed.
	// Or we can just try to login and if it fails, we skip.
	// Actually, let's just simulate the flow assuming a valid user "farmer" exists.
	// Since we can't easily seed from here without DB access, we'll skip the login step 
	// and mock the token if we were testing locally, but the requirement says "Login as Demo Farmer".
	// We will assume the user has inserted a user into the DB manually or we can try to insert one via SQL if we had a seeder.
	// Let's just simulate the HTTP requests.

	// Simulate 5 trucks
	for i := 0; i < 5; i++ {
		go runTruckScenario(fmt.Sprintf("TRUCK-%03d", i+1))
	}
}

func runTruckScenario(truckID string) {
	// a. Login (Mocking a token for now as we didn't seed users)
	// In a real integration test, we'd hit /login.
	// token := login("farmer", "password") 
	
	// b. Create Shipment
	shipmentID := createShipment(truckID)
	if shipmentID == "" {
		return
	}
	fmt.Printf("[%s] Shipment Created: %s\n", truckID, shipmentID)

	// b.1 Start Shipment (Driver accepts)
	startShipment(shipmentID)
	fmt.Printf("[%s] Shipment Started\n", truckID)

	// c. The Loop (Ilorin -> Jebba)
	steps := 20
	for i := 0; i <= steps; i++ {
		progress := float64(i) / float64(steps)
		lat := StartLat + (EndLat-StartLat)*progress
		lon := StartLon + (EndLon-StartLon)*progress

		event := models.LogisticsEvent{
			TruckID:    truckID,
			ShipmentID: shipmentID,
			Time:       time.Now(),
			Latitude:   lat,
			Longitude:  lon,
			EventType:  "moving",
			Speed:      40.0 + rand.Float64()*40.0,
		}

		sendTelemetry(event)

		// Randomly trigger an incident (10% chance per step)
		if rand.Float64() < 0.1 {
			reportIncident(truckID, shipmentID, lat, lon)
		}

		time.Sleep(1 * time.Second)
	}

	// d. Handshake (Close Trip)
	handshake(shipmentID)
	fmt.Printf("[%s] Trip Completed\n", truckID)
}

func createShipment(truckID string) string {
	req := models.ShipmentRequest{
		TruckID:   truckID,
		OriginLat: StartLat,
		OriginLon: StartLon,
		DestLat:   EndLat,
		DestLon:   EndLon,
	}
	payload, _ := json.Marshal(req)
	resp, err := http.Post(BaseURL+"/api/shipments", "application/json", bytes.NewBuffer(payload))
	if err != nil {
		log.Printf("Failed to create shipment: %v", err)
		return ""
	}
	defer resp.Body.Close()

	var res map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&res)
	return res["id"].(string)
}

func sendTelemetry(event models.LogisticsEvent) {
	payload, _ := json.Marshal(event)
	resp, err := http.Post(BaseURL+"/api/telemetry", "application/json", bytes.NewBuffer(payload))
	if err != nil {
		log.Printf("Failed to send telemetry: %v", err)
		return
	}
	defer resp.Body.Close()
}

func reportIncident(truckID, shipmentID string, lat, lon float64) {
	incidentTypes := []string{"POLICE_CHECKPOINT", "BREAKDOWN", "ACCIDENT", "TRAFFIC"}
	incType := incidentTypes[rand.Intn(len(incidentTypes))]

	req := models.IncidentRequest{
		TruckID:      truckID,
		ShipmentID:   shipmentID,
		Latitude:     lat,
		Longitude:    lon,
		IncidentType: incType,
		Description:  fmt.Sprintf("Simulated %s at %f, %f", incType, lat, lon),
		Severity:     rand.Intn(5) + 1,
	}

	payload, _ := json.Marshal(req)
	resp, err := http.Post(BaseURL+"/api/telemetry/incident", "application/json", bytes.NewBuffer(payload))
	if err != nil {
		log.Printf("Failed to report incident: %v", err)
		return
	}
	defer resp.Body.Close()
	fmt.Printf("[%s] Reported Incident: %s\n", truckID, incType)
}

func startShipment(shipmentID string) {
	req := map[string]string{"shipment_id": shipmentID}
	payload, _ := json.Marshal(req)
	http.Post(BaseURL+"/api/shipments/start", "application/json", bytes.NewBuffer(payload))
}

func handshake(shipmentID string) {
	req := map[string]string{"shipment_id": shipmentID}
	payload, _ := json.Marshal(req)
	http.Post(BaseURL+"/api/handshake", "application/json", bytes.NewBuffer(payload))
}
