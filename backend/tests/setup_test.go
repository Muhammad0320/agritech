package tests

import (
	"agri-track/internal/db"
	"agri-track/internal/handlers"
	"agri-track/internal/middleware"
	"agri-track/internal/utils"
	"context"
	"log"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
)

var TestRouter *gin.Engine

func TestMain(m *testing.M) {
	// 1. Load Environment
	_ = godotenv.Load("../.env")

	// 2. Setup Test Database Connection
	// Force a test database if possible, or warn user.
	// For this hackathon context, we assume the user might be running locally.
	// Ideally: os.Setenv("DATABASE_URL", "postgres://user:pass@localhost:5432/agritrack_test")
	if os.Getenv("DATABASE_URL") == "" {
		os.Setenv("DATABASE_URL", "postgres://postgres:password@localhost:5432/agritrack?sslmode=disable")
	}

	if err := db.ConnectDB(); err != nil {
		log.Fatalf("Failed to connect to test database: %v", err)
	}
	defer db.CloseDB()

	// 3. Initialize Schema
	if err := db.InitDB(db.Pool); err != nil {
		log.Fatalf("Failed to initialize test database schema: %v", err)
	}

	// 4. Setup Router (Global)
	TestRouter = setupRouter()

	// 5. Run Tests
	code := m.Run()

	os.Exit(code)
}

func setupRouter() *gin.Engine {
	// Initialize Handlers
	telemetryHandler := handlers.NewTelemetryHandler()
	queryHandler := handlers.NewQueryHandler()
	authHandler := handlers.NewAuthHandler()
	shipmentHandler := handlers.NewShipmentHandler()
	dashboardHandler := handlers.NewDashboardHandler()

	// Start Batch Processor (background)
	// Note: In tests, this might run forever. We can cancel it if we had a context control here.
	// For now, it's fine as it will die with the process.
	go telemetryHandler.StartBatchProcessor(context.Background())

	// Setup Router
	gin.SetMode(gin.TestMode)
	r := gin.Default()
	r.Use(middleware.CORSMiddleware())

	// Public Routes
	r.POST("/login", authHandler.Login)
	r.POST("/register", authHandler.Register)
	r.GET("/status", queryHandler.GetTruckStatus)
	r.GET("/dashboard/summary", dashboardHandler.GetSummary)

	// Protected Routes
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware())
	{
		api.POST("/shipments", shipmentHandler.CreateShipment)
		api.POST("/shipments/start", shipmentHandler.StartShipment)
		api.POST("/handshake", shipmentHandler.Handshake)
		api.POST("/telemetry", telemetryHandler.ReceiveTelemetry)
		api.POST("/telemetry/incident", telemetryHandler.ReportIncident)
	}

	return r
}

// --- Helper Functions ---

// ClearDB truncates all tables to ensure a clean state between tests.
func ClearDB(t *testing.T) {
	ctx := context.Background()
	queries := []string{
		"TRUNCATE TABLE logistics_incidents RESTART IDENTITY CASCADE",
		"TRUNCATE TABLE logistics_events CASCADE", // Hypertable truncation might be slower but necessary
		"TRUNCATE TABLE shipments RESTART IDENTITY CASCADE",
		"TRUNCATE TABLE trucks RESTART IDENTITY CASCADE",
		"TRUNCATE TABLE users RESTART IDENTITY CASCADE",
	}

	for _, q := range queries {
		_, err := db.Pool.Exec(ctx, q)
		if err != nil {
			t.Logf("Failed to truncate table with query %q: %v", q, err)
			// Don't fail immediately, some tables might be empty or hypertable constraints
		}
	}
}

// CreateTestUser registers a user and returns a valid JWT token and user ID.
func CreateTestUser(t *testing.T, username string) (string, int) {
	ctx := context.Background()
	password := "testpassword"
	hashedPassword, _ := utils.HashPassword(password)
	role := "farmer"

	var id int
	err := db.Pool.QueryRow(ctx, "INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id", username, hashedPassword, role).Scan(&id)
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Generate Token manually to avoid hitting the login endpoint overhead
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": id,
		"role":    role,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		t.Fatalf("Failed to sign token: %v", err)
	}

	return tokenString, id
}

// CreateTestTruck creates a truck and returns its ID.
func CreateTestTruck(t *testing.T) string {
	ctx := context.Background()
	id := "truck-" + uuid.New().String()[:8]
	_, err := db.Pool.Exec(ctx, "INSERT INTO trucks (id, driver_name, plate_number) VALUES ($1, $2, $3)", id, "Test Driver", "TEST-123")
	if err != nil {
		t.Fatalf("Failed to create test truck: %v", err)
	}
	return id
}

// CreateTestShipment creates a shipment for a truck and returns its ID.
func CreateTestShipment(t *testing.T, truckID string, status string) string {
	ctx := context.Background()
	id := uuid.New().String()
	
	var completedAt *time.Time
	if status == "DELIVERED" {
		now := time.Now()
		completedAt = &now
	}

	_, err := db.Pool.Exec(ctx, `
		INSERT INTO shipments (id, truck_id, origin_lat, origin_lon, dest_lat, dest_lon, status, completed_at)
		VALUES ($1, $2, 0, 0, 10, 10, $3, $4)
	`, id, truckID, status, completedAt)
	if err != nil {
		t.Fatalf("Failed to create test shipment: %v", err)
	}
	return id
}
