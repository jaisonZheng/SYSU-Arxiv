package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/gin-gonic/gin"
	"sysu-arxiv/db"
	"sysu-arxiv/handlers"
	"sysu-arxiv/middleware"
	"sysu-arxiv/storage"
)

func main() {
	var (
		port    = flag.String("port", "8083", "Server port")
		dataDir = flag.String("data", "../data", "Data directory")
	)
	flag.Parse()

	dataPath := *dataDir
	if !filepath.IsAbs(dataPath) {
		wd, _ := os.Getwd()
		dataPath = filepath.Join(wd, *dataDir)
	}

	dbPath := filepath.Join(dataPath, "sysu-arxiv-new.db")
	uploadsPath := filepath.Join(dataPath, "uploads")
	packagesPath := filepath.Join(dataPath, "packages")

	_, err := db.InitDB(dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	store := db.NewMaterialStore()
	packageStore := db.NewPackageStore()
	userStore := db.NewUserStore()
	quotaStore := db.NewQuotaStore()
	recordStore := db.NewRecordStore()
	emailStore := db.NewEmailVerificationStore()
	searchLogStore := db.NewSearchLogStore()
	localStorage := storage.NewLocalStorage(uploadsPath)
	// Package storage uses data dir as base so it can resolve packages/ relative paths
	packageStorage := storage.NewLocalStorage(dataPath)
	cacheStorage := storage.NewLocalStorage(uploadsPath)

	// Clean up stale cached files on startup
	go cleanupCache(filepath.Join(uploadsPath, "cache"), 24*time.Hour)

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.MaxMultipartMemory = 200 << 20
	r.Use(gin.Recovery())
	r.Use(middleware.CORS())
	r.Use(gin.Logger())

	// Static file serving for uploads and packages
	r.Static("/uploads", uploadsPath)
	r.Static("/packages", packagesPath)

	materialHandler := handlers.NewMaterialHandler(store, localStorage)
	materialHandler.SetPackageStore(packageStore)
	materialHandler.SetQuotaStore(quotaStore)
	materialHandler.SetRecordStore(recordStore)
	materialHandler.RegisterRoutes(r)

	packageHandler := handlers.NewPackageHandler(packageStore, packageStorage)
	packageHandler.SetQuotaStore(quotaStore)
	packageHandler.SetRecordStore(recordStore)
	packageHandler.SetCacheStorage(cacheStorage)
	packageHandler.RegisterRoutes(r)

	uploadHandler := handlers.NewUploadHandler(cacheStorage)
	uploadHandler.RegisterRoutes(r)

	authHandler := handlers.NewAuthHandler(userStore, emailStore, quotaStore)
	authHandler.RegisterRoutes(r)

	userHandler := handlers.NewUserHandler(userStore, quotaStore, recordStore, emailStore, localStorage)
	userHandler.RegisterRoutes(r)

	adminHandler := handlers.NewAdminHandler(userStore, store, searchLogStore, recordStore)
	adminHandler.RegisterRoutes(r)

	searchLogHandler := handlers.NewSearchLogHandler(searchLogStore)
	searchLogHandler.RegisterRoutes(r)

	r.GET("/health", materialHandler.Health)

	addr := fmt.Sprintf(":%s", *port)
	log.Printf("Server starting on %s", addr)
	log.Printf("Data directory: %s", dataPath)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func cleanupCache(cachePath string, maxAge time.Duration) {
	if cachePath == "" {
		return
	}
	cutoff := time.Now().Add(-maxAge)
	removed := 0
	_ = filepath.Walk(cachePath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		if info.ModTime().Before(cutoff) {
			if err := os.Remove(path); err == nil {
				removed++
			}
		}
		return nil
	})
	if removed > 0 {
		log.Printf("Cleaned up %d stale cache files", removed)
	}
}
