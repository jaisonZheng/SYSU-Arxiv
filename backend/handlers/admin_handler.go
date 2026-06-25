package handlers

import (
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"sysu-arxiv/db"
	"sysu-arxiv/middleware"
)

type AdminHandler struct {
	userStore     *db.UserStore
	materialStore *db.MaterialStore
	searchStore   *db.SearchLogStore
	recordStore   *db.RecordStore
}

func NewAdminHandler(userStore *db.UserStore, materialStore *db.MaterialStore, searchStore *db.SearchLogStore, recordStore *db.RecordStore) *AdminHandler {
	return &AdminHandler{
		userStore:     userStore,
		materialStore: materialStore,
		searchStore:   searchStore,
		recordStore:   recordStore,
	}
}

func (h *AdminHandler) RegisterRoutes(r *gin.Engine) {
	admin := r.Group("/api/admin")
	admin.Use(middleware.AdminAuthRequired())
	{
		admin.GET("/overview", h.GetOverview)
		admin.GET("/search-top", h.GetTopSearches)
		admin.GET("/search-empty", h.GetEmptySearches)
		admin.GET("/downloads-top", h.GetTopDownloads)
		admin.GET("/trends", h.GetTrends)
		admin.GET("/inviters-top", h.GetTopInviters)
	}

	r.POST("/api/admin/login", h.Login)
}

func (h *AdminHandler) Login(c *gin.Context) {
	var req struct {
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "password required"})
		return
	}
	if req.Password != middleware.AdminPassword() {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid password"})
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"role": "admin",
		"exp":  time.Now().Add(24 * time.Hour).Unix(),
	})

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "sysu-arxiv-dev-secret-change-in-production"
	}
	tokenStr, err := token.SignedString([]byte(secret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to sign token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": tokenStr})
}

func (h *AdminHandler) GetOverview(c *gin.Context) {
	stats, err := h.userStore.GetOverviewStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	totalDownloads := db.GetSiteStat("total_downloads")
	totalUploads := db.GetSiteStat("total_uploads")

	c.JSON(http.StatusOK, gin.H{
		"total_users":         stats.TotalUsers,
		"new_users_today":     stats.NewUsersToday,
		"new_users_this_week": stats.NewUsersWeek,
		"invited_users":       stats.InvitedUsers,
		"total_downloads":     totalDownloads,
		"total_uploads":       totalUploads,
	})
}

func (h *AdminHandler) GetTopSearches(c *gin.Context) {
	since := time.Now().AddDate(0, 0, -30)
	items, err := h.searchStore.TopSearches(50, since)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *AdminHandler) GetEmptySearches(c *gin.Context) {
	since := time.Now().AddDate(0, 0, -30)
	items, err := h.searchStore.TopEmptySearches(50, since)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *AdminHandler) GetTopDownloads(c *gin.Context) {
	items, err := h.materialStore.GetTopDownloadsMerged(50)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}

func (h *AdminHandler) GetTrends(c *gin.Context) {
	trends, err := h.recordStore.GetDailyTrends(30)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": trends})
}

func (h *AdminHandler) GetTopInviters(c *gin.Context) {
	items, err := h.userStore.GetTopInviters(50)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": items})
}
