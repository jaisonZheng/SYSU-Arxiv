package handlers

import (
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"sysu-arxiv/db"
	"sysu-arxiv/mail"
	"sysu-arxiv/middleware"
	"sysu-arxiv/models"
	"sysu-arxiv/storage"
)

type UserHandler struct {
	userStore     *db.UserStore
	quotaStore    *db.QuotaStore
	recordStore   *db.RecordStore
	emailStore    *db.EmailVerificationStore
	mailSender    *mail.Sender
	storage       *storage.LocalStorage
	avatarStorage *storage.LocalStorage
}

func NewUserHandler(userStore *db.UserStore, quotaStore *db.QuotaStore, recordStore *db.RecordStore, emailStore *db.EmailVerificationStore, storage *storage.LocalStorage) *UserHandler {
	return &UserHandler{
		userStore:     userStore,
		quotaStore:    quotaStore,
		recordStore:   recordStore,
		emailStore:    emailStore,
		mailSender:    mail.NewSender(),
		storage:       storage,
		avatarStorage: storage,
	}
}

func (h *UserHandler) RegisterRoutes(r *gin.Engine) {
	me := r.Group("/api/me")
	me.Use(middleware.AuthRequired())
	{
		me.GET("", h.GetMe)
		me.GET("/downloads", h.GetDownloads)
		me.GET("/uploads", h.GetUploads)
		me.GET("/quota", h.GetQuota)
		me.POST("/profile", h.UpdateProfile)
		me.POST("/avatar", h.UpdateAvatar)
		me.POST("/password", h.UpdatePassword)
		me.POST("/email", h.UpdateEmail)
	}
}

func (h *UserHandler) GetMe(c *gin.Context) {
	userID := c.GetInt64("userID")
	user, err := h.userStore.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Get current quota
	weekStart := h.quotaStore.CurrentWeekStart(user.CreatedAt)
	quota, _ := h.quotaStore.GetOrCreateQuota(userID, weekStart)

	c.JSON(http.StatusOK, gin.H{
		"id":          user.ID,
		"email":       user.Email,
		"nickname":    user.Nickname,
		"avatar_url":  user.AvatarURL,
		"invite_code": user.InviteCode,
		"created_at":  user.CreatedAt,
		"quota": gin.H{
			"week_start":  weekStart.Format("2006-01-02"),
			"total_quota": quota.TotalQuota,
			"used_quota":  quota.UsedQuota,
			"remaining":   quota.TotalQuota - quota.UsedQuota,
		},
	})
}

func (h *UserHandler) GetDownloads(c *gin.Context) {
	userID := c.GetInt64("userID")
	records, err := h.recordStore.ListDownloadsByUserWithResource(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"downloads": records})
}

func (h *UserHandler) GetUploads(c *gin.Context) {
	userID := c.GetInt64("userID")
	records, err := h.recordStore.ListUploadsByUserWithResource(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"uploads": records})
}

func (h *UserHandler) GetQuota(c *gin.Context) {
	userID := c.GetInt64("userID")
	user, err := h.userStore.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	weekStart := h.quotaStore.CurrentWeekStart(user.CreatedAt)
	quota, err := h.quotaStore.GetOrCreateQuota(userID, weekStart)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, models.QuotaResponse{
		WeekStart:  weekStart.Format("2006-01-02"),
		TotalQuota: quota.TotalQuota,
		UsedQuota:  quota.UsedQuota,
		Remaining:  quota.TotalQuota - quota.UsedQuota,
	})
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	var req models.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID := c.GetInt64("userID")
	if err := h.userStore.UpdateNickname(userID, req.Nickname); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "profile updated"})
}

func (h *UserHandler) UpdateAvatar(c *gin.Context) {
	file, header, err := c.Request.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "avatar file required"})
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" && ext != ".gif" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unsupported image format"})
		return
	}

	filePath, _, err := h.avatarStorage.SaveFile(file, header, "avatars")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save avatar: " + err.Error()})
		return
	}

	userID := c.GetInt64("userID")
	if err := h.userStore.UpdateAvatar(userID, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"avatar_url": filePath})
}

func (h *UserHandler) UpdatePassword(c *gin.Context) {
	var req models.UpdatePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	userID := c.GetInt64("userID")
	user, err := h.userStore.GetByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Verify old password if set
	if user.PasswordHash != "" && req.OldPassword != "" {
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.OldPassword)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "incorrect old password"})
			return
		}
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	if err := h.userStore.UpdatePassword(userID, string(hash)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "password updated"})
}

func (h *UserHandler) UpdateEmail(c *gin.Context) {
	var req models.UpdateEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify code
	storedCode, expiresAt, err := h.emailStore.GetLatest(req.NewEmail)
	if err != nil || storedCode != req.Code || time.Now().After(expiresAt) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid or expired code"})
		return
	}

	userID := c.GetInt64("userID")
	if err := h.userStore.UpdateEmail(userID, req.NewEmail); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "email updated"})
}
