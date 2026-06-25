package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"sysu-arxiv/db"
)

type SearchLogHandler struct {
	store *db.SearchLogStore
}

func NewSearchLogHandler(store *db.SearchLogStore) *SearchLogHandler {
	return &SearchLogHandler{store: store}
}

func (h *SearchLogHandler) RegisterRoutes(r *gin.Engine) {
	r.POST("/api/search/log", h.LogSearch)
}

func (h *SearchLogHandler) LogSearch(c *gin.Context) {
	var req struct {
		Query        string `json:"query" binding:"required"`
		ResultCount  int    `json:"result_count"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if len(req.Query) > 200 {
		req.Query = req.Query[:200]
	}
	if err := h.store.Log(req.Query, req.ResultCount); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
