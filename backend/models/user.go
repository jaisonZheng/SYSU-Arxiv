package models

import "time"

type User struct {
	ID           int64     `json:"id"`
	Email        string    `json:"email"`
	Nickname     string    `json:"nickname"`
	PasswordHash string    `json:"-"`
	InviteCode   string    `json:"invite_code"`
	AvatarURL    string    `json:"avatar_url"`
	InvitedBy    *int64    `json:"invited_by,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type RegisterRequest struct {
	Email      string `json:"email" binding:"required,email"`
	Code       string `json:"code" binding:"required"`
	Password   string `json:"password" binding:"required,min=6"`
	InviteCode string `json:"invite_code"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password"`
	Code     string `json:"code"`
}

type SendCodeRequest struct {
	Email   string `json:"email" binding:"required,email"`
	Purpose string `json:"purpose"`
}

type UpdateProfileRequest struct {
	Nickname string `json:"nickname"`
}

type UpdatePasswordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password" binding:"required,min=6"`
}

type UpdateEmailRequest struct {
	NewEmail string `json:"new_email" binding:"required,email"`
	Code     string `json:"code" binding:"required"`
}

type DownloadQuota struct {
	ID         int64     `json:"id"`
	UserID     int64     `json:"user_id"`
	WeekStart  time.Time `json:"week_start"`
	TotalQuota int64     `json:"total_quota"`
	UsedQuota  int64     `json:"used_quota"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type QuotaResponse struct {
	WeekStart  string `json:"week_start"`
	TotalQuota int64  `json:"total_quota"`
	UsedQuota  int64  `json:"used_quota"`
	Remaining  int64  `json:"remaining"`
}

type DownloadRecord struct {
	ID           int64     `json:"id"`
	UserID       int64     `json:"user_id"`
	ResourceID   int64     `json:"resource_id"`
	ResourceType string    `json:"resource_type"`
	CreatedAt    time.Time `json:"created_at"`
}

type UploadRecord struct {
	ID           int64     `json:"id"`
	UserID       int64     `json:"user_id"`
	ResourceID   int64     `json:"resource_id"`
	ResourceType string    `json:"resource_type"`
	CreatedAt    time.Time `json:"created_at"`
}

type EmailVerification struct {
	ID        int64     `json:"id"`
	Email     string    `json:"email"`
	Code      string    `json:"code"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

type DownloadRecordWithResource struct {
	ID           int64     `json:"id"`
	UserID       int64     `json:"user_id"`
	ResourceID   int64     `json:"resource_id"`
	ResourceType string    `json:"resource_type"`
	ResourceTitle string   `json:"resource_title"`
	CreatedAt    time.Time `json:"created_at"`
}

type UploadRecordWithResource struct {
	ID           int64     `json:"id"`
	UserID       int64     `json:"user_id"`
	ResourceID   int64     `json:"resource_id"`
	ResourceType string    `json:"resource_type"`
	ResourceTitle string   `json:"resource_title"`
	CreatedAt    time.Time `json:"created_at"`
}
