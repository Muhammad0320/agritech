package handlers

import (
	"errors"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

func formatValidationError(err error) gin.H {
	var ve validator.ValidationErrors
	if errors.As(err, &ve) {
		out := make([]string, len(ve))
		for i, fe := range ve {
			out[i] = fmt.Sprintf("Field '%s' failed on the '%s' tag", fe.Field(), fe.Tag())
		}
		return gin.H{"errors": out}
	}
	return gin.H{"error": err.Error()}
}
