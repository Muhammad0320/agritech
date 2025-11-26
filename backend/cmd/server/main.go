package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"agri-track/internal/db"
	"agri-track/internal/handlers"
	"agri-track/internal/middleware"

	// "agri-track/internal/simulator"

	"math/rand"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func init() {
	rand.Seed(time.Now().UnixNano())
}

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Initialize Database
	if err := db.ConnectDB(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.CloseDB()

	if err := db.InitDB(db.Pool); err != nil {
		log.Fatalf("Failed to initialize database schema: %v", err)
	}

	// Initialize Handlers
	telemetryHandler := handlers.NewTelemetryHandler()
	queryHandler := handlers.NewQueryHandler()
	authHandler := handlers.NewAuthHandler()
	shipmentHandler := handlers.NewShipmentHandler()
	dashboardHandler := handlers.NewDashboardHandler()

	// Start Batch Processor
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go telemetryHandler.StartBatchProcessor(ctx)

	// Setup Router
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
		api.POST("/shipments/pickup", shipmentHandler.PickupShipment)
		api.POST("/shipments/start", shipmentHandler.StartShipment)
		api.POST("/handshake", shipmentHandler.Handshake)
		api.POST("/telemetry", telemetryHandler.ReceiveTelemetry)
		api.POST("/telemetry/incident", telemetryHandler.ReportIncident)
	}

	// Start Simulation (in a separate goroutine)
	// go simulator.StartSimulation()

	// Server Setup
	srv := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	// Graceful Shutdown
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	log.Println("Server started on :8080")

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exiting")
}
