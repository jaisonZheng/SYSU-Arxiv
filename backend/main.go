package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"sysu-arxiv/db"
	"sysu-arxiv/handlers"
	"sysu-arxiv/middleware"
	"sysu-arxiv/storage"
)

func main() {
	var (
		port     = flag.String("port", "8083", "Server port")
		dataDir  = flag.String("data", "../data", "Data directory")
	)
	flag.Parse()

	wd, _ := os.Getwd()
	dataPath := filepath.Join(wd, *dataDir)

	dbPath := filepath.Join(dataPath, "sysu-arxiv.db")
	uploadsPath := filepath.Join(dataPath, "uploads")

	_, err := db.InitDB(dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	store := db.NewMaterialStore()
	localStorage := storage.NewLocalStorage(uploadsPath)

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.CORS())
	r.Use(gin.Logger())

	// Static file serving for uploads
	r.Static("/uploads", uploadsPath)

	materialHandler := handlers.NewMaterialHandler(store, localStorage)
	materialHandler.RegisterRoutes(r)

	r.GET("/health", materialHandler.Health)

	addr := fmt.Sprintf(":%s", *port)
	log.Printf("Server starting on %s", addr)
	log.Printf("Data directory: %s", dataPath)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
