package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"sysu-arxiv/db"
	"sysu-arxiv/mail"
	"sysu-arxiv/middleware"
	"sysu-arxiv/models"
)

type AuthHandler struct {
	userStore     *db.UserStore
	emailStore    *db.EmailVerificationStore
	quotaStore    *db.QuotaStore
	mailSender    *mail.Sender
}

func NewAuthHandler(userStore *db.UserStore, emailStore *db.EmailVerificationStore, quotaStore *db.QuotaStore) *AuthHandler {
	return &AuthHandler{
		userStore:  userStore,
		emailStore: emailStore,
		quotaStore: quotaStore,
		mailSender: mail.NewSender(),
	}
}

func (h *AuthHandler) RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api/auth")
	{
		api.POST("/send-code", h.SendCode)
		api.POST("/register", h.Register)
		api.POST("/login", h.Login)
		api.GET("/me", middleware.AuthRequired(), h.GetMe)
	}
}

func (h *AuthHandler) SendCode(c *gin.Context) {
	var req models.SendCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid email"})
		return
	}

	// Check email registration status according to purpose
	existingUser, err := h.userStore.GetByEmail(req.Email)
	if req.Purpose == "login" {
		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusBadRequest, gin.H{"error": "该邮箱未注册"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "query failed"})
			return
		}
	} else {
		// default/register: do not send code if already registered
		if err == nil && existingUser != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "该邮箱已注册"})
			return
		}
	}

	// Rate limit: max 10 per day per email
	count, err := h.emailStore.CountToday(req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "rate check failed"})
		return
	}
	if count >= 10 {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "daily limit exceeded"})
		return
	}

	// Rate limit: 60 seconds between sends for same email
	if count > 0 {
		_, expiresAt, err := h.emailStore.GetLatest(req.Email)
		if err == nil && time.Since(expiresAt.Add(-10*time.Minute)) < 60*time.Second {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "please wait 60 seconds before requesting another code"})
			return
		}
	}

	code := mail.GenerateCode()
	expiresAt := time.Now().Add(10 * time.Minute)
	if err := h.emailStore.Create(req.Email, code, expiresAt); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save code"})
		return
	}

	if err := h.mailSender.SendVerificationCode(req.Email, code, req.Purpose); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to send email: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "code sent"})
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify code
	storedCode, expiresAt, err := h.emailStore.GetLatest(req.Email)
	if err != nil || storedCode != req.Code || time.Now().After(expiresAt) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or expired code"})
		return
	}

	// Check if email already exists
	existing, _ := h.userStore.GetByEmail(req.Email)
	if existing != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "email already registered"})
		return
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	// Handle invite code
	var invitedBy *int64
	if req.InviteCode != "" {
		inviter, err := h.userStore.GetByInviteCode(req.InviteCode)
		if err == nil && inviter != nil {
			invitedBy = &inviter.ID
		}
	}

	// Create user
	userID, err := h.userStore.Create(req.Email, "", string(hash), invitedBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user: " + err.Error()})
		return
	}

	// Generate invite code
	inviteCode := fmt.Sprintf("%06d", userID)
	if err := h.userStore.SetInviteCode(userID, inviteCode); err != nil {
		// Non-fatal
		fmt.Printf("failed to set invite code: %v\n", err)
	}

	// If invited, give inviter +3 quota for current week
	if invitedBy != nil {
		inviter, _ := h.userStore.GetByID(*invitedBy)
		if inviter != nil {
			weekStart := h.quotaStore.CurrentWeekStart(inviter.CreatedAt)
			if err := h.quotaStore.AddBonus(*invitedBy, weekStart, 3); err != nil {
				fmt.Printf("failed to add bonus to inviter: %v\n", err)
			}
		}
	}

	// Generate token
	token, err := generateToken(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":       token,
		"user_id":     userID,
		"invite_code": inviteCode,
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userStore.GetByEmail(req.Email)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "该邮箱未注册"})
			return
		}
		c.JSON(http.StatusUnauthorized, gin.H{"error": "查询用户失败"})
		return
	}

	// Password login
	if req.Password != "" {
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "密码错误"})
			return
		}
	} else if req.Code != "" {
		// Code login
		storedCode, expiresAt, err := h.emailStore.GetLatest(req.Email)
		if err != nil || storedCode != req.Code || time.Now().After(expiresAt) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired code"})
			return
		}
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "password or code required"})
		return
	}

	token, err := generateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":   token,
		"user_id": user.ID,
	})
}

func (h *AuthHandler) GetMe(c *gin.Context) {
	userID := c.GetInt64("userID")
	user, err := h.userStore.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"id":          user.ID,
		"email":       user.Email,
		"nickname":    user.Nickname,
		"avatar_url":  user.AvatarURL,
		"invite_code": user.InviteCode,
		"created_at":  user.CreatedAt,
	})
}

func generateToken(userID int64) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(7 * 24 * time.Hour).Unix(),
	})
	return token.SignedString([]byte(middleware.JWTSecret()))
}
