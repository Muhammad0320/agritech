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

	// 1. Authenticate Simulator User
	token := loginOrRegister("simulator_admin", "sim_password")
	if token == "" {
		log.Println("Skipping simulation due to auth failure")
		return
	}

	// Simulate 5 trucks
	for i := 0; i < 5; i++ {
		go runTruckScenario(fmt.Sprintf("TRUCK-%03d", i+1), token)
	}
}

func loginOrRegister(username, password string) string {
	// Try Login
	payload := map[string]string{"username": username, "password": password}
	body, _ := json.Marshal(payload)
	
	resp, err := http.Post(BaseURL+"/login", "application/json", bytes.NewBuffer(body))
	if err != nil {
		log.Printf("Simulator Login failed: %v", err)
		return ""
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		var res map[string]string
		json.NewDecoder(resp.Body).Decode(&res)
		return res["token"]
	}

	// If login failed, maybe user doesn't exist. Try Register.
	respReg, err := http.Post(BaseURL+"/register", "application/json", bytes.NewBuffer(body))
	if err != nil {
		log.Printf("Simulator Register failed: %v", err)
		return ""
	}
	defer respReg.Body.Close()

	if respReg.StatusCode == http.StatusCreated {
		// Login again to get token
		respLogin, err := http.Post(BaseURL+"/login", "application/json", bytes.NewBuffer(body))
		if err != nil {
			log.Printf("Simulator Re-Login failed: %v", err)
			return ""
		}
		defer respLogin.Body.Close()
		var res map[string]string
		json.NewDecoder(respLogin.Body).Decode(&res)
		return res["token"]
	}

	log.Printf("Simulator Auth failed. Status: %d", resp.StatusCode)
	return ""
}

func runTruckScenario(truckID, token string) {
	// b. Create Shipment
	shipmentID := createShipment(truckID, token)
	if shipmentID == "" {
		return
	}
	fmt.Printf("[%s] Shipment Created: %s\n", truckID, shipmentID)

	// b.1 Start Shipment (Driver accepts)
	startShipment(shipmentID, token)
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

		sendTelemetry(event, token)

		// Randomly trigger an incident (10% chance per step)
		if rand.Float64() < 0.1 {
			reportIncident(truckID, shipmentID, lat, lon, token)
		}

		time.Sleep(1 * time.Second)
	}

	// d. Handshake (Close Trip)
	handshake(shipmentID, token)
	fmt.Printf("[%s] Trip Completed\n", truckID)
}

func createShipment(truckID, token string) string {
	req := models.ShipmentRequest{
		TruckID:   &truckID,
		OriginLat: StartLat,
		OriginLon: StartLon,
		DestLat:   EndLat,
		DestLon:   EndLon,
	}
	payload, _ := json.Marshal(req)
	
	request, _ := http.NewRequest("POST", BaseURL+"/api/shipments", bytes.NewBuffer(payload))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(request)
	if err != nil {
		log.Printf("Failed to create shipment: %v", err)
		return ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		log.Printf("Create Shipment failed with status: %d", resp.StatusCode)
		return ""
	}

	var res map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		log.Printf("Failed to decode shipment response: %v", err)
		return ""
	}
	
	if id, ok := res["id"].(string); ok {
		return id
	}
	log.Printf("Shipment ID not found in response")
	return ""
}

func sendTelemetry(event models.LogisticsEvent, token string) {
	payload, _ := json.Marshal(event)
	request, _ := http.NewRequest("POST", BaseURL+"/api/telemetry", bytes.NewBuffer(payload))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(request)
	if err != nil {
		log.Printf("Failed to send telemetry: %v", err)
		return
	}
	defer resp.Body.Close()
}

func reportIncident(truckID, shipmentID string, lat, lon float64, token string) {
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
	request, _ := http.NewRequest("POST", BaseURL+"/api/telemetry/incident", bytes.NewBuffer(payload))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	resp, err := client.Do(request)
	if err != nil {
		log.Printf("Failed to report incident: %v", err)
		return
	}
	defer resp.Body.Close()
	fmt.Printf("[%s] Reported Incident: %s\n", truckID, incType)
}

func startShipment(shipmentID, token string) {
	req := map[string]string{"shipment_id": shipmentID}
	payload, _ := json.Marshal(req)
	
	request, _ := http.NewRequest("POST", BaseURL+"/api/shipments/start", bytes.NewBuffer(payload))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	client.Do(request)
}

func handshake(shipmentID, token string) {
	req := map[string]string{"shipment_id": shipmentID}
	payload, _ := json.Marshal(req)
	
	request, _ := http.NewRequest("POST", BaseURL+"/api/handshake", bytes.NewBuffer(payload))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	client.Do(request)
}
