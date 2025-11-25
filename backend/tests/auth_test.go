package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAuthEndpoints(t *testing.T) {
	ClearDB(t)
	router := TestRouter

	t.Run("Register New User", func(t *testing.T) {
		payload := map[string]string{
			"username": "newuser",
			"password": "securepassword",
		}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "/register", bytes.NewBuffer(body))
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusCreated, w.Code)
		
		var resp map[string]interface{}
		json.Unmarshal(w.Body.Bytes(), &resp)
		assert.Equal(t, "newuser", resp["username"])
		assert.NotEmpty(t, resp["id"])
	})

	t.Run("Register Existing User", func(t *testing.T) {
		// Ensure user exists
		CreateTestUser(t, "existinguser")

		payload := map[string]string{
			"username": "existinguser",
			"password": "password",
		}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "/register", bytes.NewBuffer(body))
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusConflict, w.Code)
	})

	t.Run("Login Success", func(t *testing.T) {
		// Create user via helper (which hashes password as 'testpassword')
		CreateTestUser(t, "loginuser")

		payload := map[string]string{
			"username": "loginuser",
			"password": "testpassword",
		}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(body))
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		
		var resp map[string]string
		json.Unmarshal(w.Body.Bytes(), &resp)
		assert.NotEmpty(t, resp["token"])
	})

	t.Run("Login Invalid Credentials", func(t *testing.T) {
		CreateTestUser(t, "wrongpassuser")

		payload := map[string]string{
			"username": "wrongpassuser",
			"password": "wrongpassword",
		}
		body, _ := json.Marshal(payload)
		req, _ := http.NewRequest("POST", "/login", bytes.NewBuffer(body))
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}
