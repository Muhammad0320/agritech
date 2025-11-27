package simulator

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
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
	fmt.Println("Starting DEMO traffic simulation (Ilorin -> Jebba)...")

	// 1. Authenticate Simulator User
	token := loginOrRegister("simulator_admin", "sim_password")
	if token == "" {
		log.Println("Skipping simulation due to auth failure")
		return
	}

	// Run single demo truck
	go runDemoTruck("TRUCK-DEMO-01", token)
}

func runDemoTruck(truckID, token string) {
	// b. Create Shipment (Ilorin -> Jebba)
	// Note: In real flow, Farmer creates, Driver picks up.
	// Here we simulate the whole flow or just the driving part if shipment exists.
	// Let's create a fresh shipment.
	shipmentID, pickupCode := createShipment(truckID, token)
	if shipmentID == "" {
		return
	}
	fmt.Printf("[%s] Shipment Created: %s (Code: %s)\n", truckID, shipmentID, pickupCode)

	// b.1 Pickup Shipment (Driver joins)
	// We need to simulate the driver picking up.
	// The 'createShipment' function currently assigns truck_id directly (which is fine for sim).
	// But let's follow the 'Pickup' flow if we want to be realistic?
	// Actually, the current createShipment in simulator sets truck_id.
	// Let's stick to that for simplicity, or update createShipment to NOT set truck_id and then call Pickup.
	// The user prompt says: "Create: Call CreateShipment... Join: Have dummy driver 'join' using that code."
	
	// So we should Create (no truck_id) -> Pickup (with code).
	// But `createShipment` helper below sets truck_id. Let's modify it or just use it as is if it works.
	// The prompt says "Create: Call internal CreateShipment logic... Get Code. Join: Have dummy driver join".
	
	// Let's assume createShipment returns code.
	
	// b.2 Start Shipment
	startShipment(shipmentID, token)
	fmt.Printf("[%s] Shipment Started (En Route to Jebba)\n", truckID)

	// c. The Drive (Ilorin -> Jebba)
	// 20 steps
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
			Speed:      60.0, // km/h
		}

		sendTelemetry(event, token)
		fmt.Printf("[%s] Step %d/%d: %.4f, %.4f\n", truckID, i, steps, lat, lon)

		// Forced Incident at Step 10
		if i == 10 {
			reportIncident(truckID, shipmentID, lat, lon, token, "POLICE_CHECKPOINT")
		}

		time.Sleep(2 * time.Second)
	}

	fmt.Printf("[%s] Arrived at Jebba. Waiting for manual verification...\n", truckID)
	// We do NOT complete it automatically here, because the user wants to test the "Arrived" button and Verification flow.
}

func createShipment(truckID, token string) (string, string) {
	// We intentionally leave TruckID empty to simulate "Farmer created, waiting for driver"
	// But wait, the simulator helper `createShipment` was using truckID.
	// Let's pass nil for TruckID.
	req := models.ShipmentRequest{
		TruckID:   nil, // Open shipment
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
		return "", ""
	}
	defer resp.Body.Close()

	var res map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&res)
	
	id, _ := res["id"].(string)
	code, _ := res["pickup_code"].(string)
	
	if id != "" && code != "" {
		// Now "Join" / Pickup
		pickupReq := map[string]string{"pickup_code": code}
		pickupBody, _ := json.Marshal(pickupReq)
		pRequest, _ := http.NewRequest("POST", BaseURL+"/api/shipments/pickup", bytes.NewBuffer(pickupBody))
		pRequest.Header.Set("Content-Type", "application/json")
		pRequest.Header.Set("Authorization", "Bearer "+token) // Simulating driver
		
		pResp, pErr := client.Do(pRequest)
		if pErr == nil {
			defer pResp.Body.Close()
			// We assume success
		}
		return id, code
	}
	return "", ""
}

func reportIncident(truckID, shipmentID string, lat, lon float64, token string, incType string) {
	req := models.IncidentRequest{
		TruckID:      truckID,
		ShipmentID:   shipmentID,
		Latitude:     lat,
		Longitude:    lon,
		IncidentType: incType,
		Description:  fmt.Sprintf("Simulated %s at %f, %f", incType, lat, lon),
		Severity:     3,
	}

	payload, _ := json.Marshal(req)
	request, _ := http.NewRequest("POST", BaseURL+"/api/telemetry/incident", bytes.NewBuffer(payload))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{}
	client.Do(request)
	fmt.Printf("[%s] !!! REPORTED INCIDENT: %s !!!\n", truckID, incType)
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
