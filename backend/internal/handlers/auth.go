package handlers

import (
	"agri-track/internal/db"
	"agri-track/internal/models"
	"agri-track/internal/utils"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type AuthHandler struct{}

func NewAuthHandler() *AuthHandler {
	return &AuthHandler{}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, formatValidationError(err))
		return
	}

	// Verify password
	var user models.User
	err := db.Pool.QueryRow(c.Request.Context(), "SELECT id, username, password, role FROM users WHERE username=$1", req.Username).Scan(&user.ID, &user.Username, &user.Password, &user.Role)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if !utils.CheckPasswordHash(req.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// Generate JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"role":    user.Role,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
	})

	tokenString, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": tokenString})
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, formatValidationError(err))
		return
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not hash password"})
		return
	}

	role := "farmer"
	var id int
	err = db.Pool.QueryRow(c.Request.Context(), "INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id", req.Username, hashedPassword, role).Scan(&id)

	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User already exists or database error"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"id": id, "username": req.Username, "role": role})
}
