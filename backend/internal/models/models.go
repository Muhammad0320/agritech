package models

import "time"

type Truck struct {
	ID          string `json:"id"`
	DriverName  string `json:"driver_name"`
	PlateNumber string `json:"plate_number"`
}

type LogisticsEvent struct {
	Time            time.Time `json:"time"`
	TruckID         string    `json:"truck_id" binding:"required"`
	ShipmentID      string    `json:"shipment_id" binding:"required"`
	Latitude        float64   `json:"latitude" binding:"required,latitude"`
	Longitude       float64   `json:"longitude" binding:"required,longitude"`
	EventType       string    `json:"event_type" binding:"required,oneof=moving stopped idle"`
	Speed           float64   `json:"speed" binding:"min=0"`
	NearDestination bool      `json:"near_destination"`
}

type Incident struct {
	ID           int       `json:"id"`
	Time         time.Time `json:"time"`
	TruckID      string    `json:"truck_id"`
	ShipmentID   string    `json:"shipment_id"`
	Latitude     float64   `json:"latitude"`
	Longitude    float64   `json:"longitude"`
	IncidentType string    `json:"incident_type"`
	Description  string    `json:"description"`
	Severity     int       `json:"severity"`
}

type IncidentRequest struct {
	TruckID      string  `json:"truck_id" binding:"required"`
	ShipmentID   string  `json:"shipment_id" binding:"required"`
	Latitude     float64 `json:"latitude" binding:"required,latitude"`
	Longitude    float64 `json:"longitude" binding:"required,longitude"`
	IncidentType string  `json:"incident_type" binding:"required,oneof=POLICE_CHECKPOINT BREAKDOWN ACCIDENT TRAFFIC"`
	Description  string  `json:"description" binding:"required"`
	Severity     int     `json:"severity" binding:"required,min=1,max=5"`
}

type TruckStatus struct {
	TruckID   string    `json:"truck_id"`
	LastSeen  time.Time `json:"last_seen"`
	Latitude  float64   `json:"latitude"`
	Longitude float64   `json:"longitude"`
	Speed     float64   `json:"speed"`
	EventType string    `json:"event_type"`
}

type User struct {
	ID       int    `json:"id"`
	Email string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type Shipment struct {
	ID          string     `json:"id"`
	TruckID     *string    `json:"truck_id"`
	OriginLat   float64    `json:"origin_lat"`
	OriginLon   float64    `json:"origin_lon"`
	DestLat     float64    `json:"dest_lat"`
	DestLon     float64    `json:"dest_lon"`
	Status      string     `json:"status"`
	PickupCode  string     `json:"pickup_code"`
	CreatedAt   time.Time  `json:"created_at"`
	CompletedAt *time.Time `json:"completed_at"`
}

type LoginRequest struct {
	Email string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
	Role     string `json:"role"` // Optional for login, required/used for register
}

type ShipmentRequest struct {
	TruckID   *string `json:"truck_id,omitempty"` // Optional, can be nil
	OriginLat float64 `json:"origin_lat" binding:"required,latitude"`
	OriginLon float64 `json:"origin_lon" binding:"required,longitude"`
	DestLat   float64 `json:"dest_lat" binding:"required,latitude"`
	DestLon   float64 `json:"dest_lon" binding:"required,longitude"`
}
