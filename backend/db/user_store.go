package db

import (
	"database/sql"

	"sysu-arxiv/models"
)

type UserStore struct{}

func NewUserStore() *UserStore { return &UserStore{} }

func (s *UserStore) Create(email, nickname, passwordHash string, invitedBy *int64) (int64, error) {
	result, err := DB.Exec(
		`INSERT INTO users (email, nickname, password_hash, invited_by) VALUES (?, ?, ?, ?)`,
		email, nickname, passwordHash, invitedBy,
	)
	if err != nil {
		return 0, err
	}
	return result.LastInsertId()
}

func (s *UserStore) GetByID(id int64) (*models.User, error) {
	u := &models.User{}
	var invitedBy sql.NullInt64
	err := DB.QueryRow(
		`SELECT id, email, nickname, password_hash, COALESCE(invite_code, ''), COALESCE(avatar_url, ''), invited_by, created_at, updated_at FROM users WHERE id = ?`,
		id,
	).Scan(&u.ID, &u.Email, &u.Nickname, &u.PasswordHash, &u.InviteCode, &u.AvatarURL, &invitedBy, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if invitedBy.Valid {
		u.InvitedBy = &invitedBy.Int64
	}
	return u, nil
}

func (s *UserStore) GetByEmail(email string) (*models.User, error) {
	u := &models.User{}
	var invitedBy sql.NullInt64
	err := DB.QueryRow(
		`SELECT id, email, nickname, password_hash, COALESCE(invite_code, ''), COALESCE(avatar_url, ''), invited_by, created_at, updated_at FROM users WHERE email = ?`,
		email,
	).Scan(&u.ID, &u.Email, &u.Nickname, &u.PasswordHash, &u.InviteCode, &u.AvatarURL, &invitedBy, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if invitedBy.Valid {
		u.InvitedBy = &invitedBy.Int64
	}
	return u, nil
}

func (s *UserStore) GetByInviteCode(code string) (*models.User, error) {
	u := &models.User{}
	var invitedBy sql.NullInt64
	err := DB.QueryRow(
		`SELECT id, email, nickname, password_hash, COALESCE(invite_code, ''), COALESCE(avatar_url, ''), invited_by, created_at, updated_at FROM users WHERE invite_code = ?`,
		code,
	).Scan(&u.ID, &u.Email, &u.Nickname, &u.PasswordHash, &u.InviteCode, &u.AvatarURL, &invitedBy, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if invitedBy.Valid {
		u.InvitedBy = &invitedBy.Int64
	}
	return u, nil
}

func (s *UserStore) UpdateNickname(id int64, nickname string) error {
	_, err := DB.Exec(`UPDATE users SET nickname = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, nickname, id)
	return err
}

func (s *UserStore) UpdateAvatar(id int64, avatarURL string) error {
	_, err := DB.Exec(`UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, avatarURL, id)
	return err
}

func (s *UserStore) UpdatePassword(id int64, hash string) error {
	_, err := DB.Exec(`UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, hash, id)
	return err
}

func (s *UserStore) UpdateEmail(id int64, email string) error {
	_, err := DB.Exec(`UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, email, id)
	return err
}

func (s *UserStore) SetInviteCode(id int64, code string) error {
	_, err := DB.Exec(`UPDATE users SET invite_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, code, id)
	return err
}

type UserOverviewStats struct {
	TotalUsers      int64 `json:"total_users"`
	NewUsersToday   int64 `json:"new_users_today"`
	NewUsersWeek    int64 `json:"new_users_this_week"`
	InvitedUsers    int64 `json:"invited_users"`
}

func (s *UserStore) GetOverviewStats() (*UserOverviewStats, error) {
	stats := &UserOverviewStats{}
	queries := []struct {
		sql string
		dest *int64
	}{
		{"SELECT COUNT(*) FROM users", &stats.TotalUsers},
		{"SELECT COUNT(*) FROM users WHERE date(created_at) = date('now')", &stats.NewUsersToday},
		{"SELECT COUNT(*) FROM users WHERE created_at >= datetime('now', '-7 days')", &stats.NewUsersWeek},
		{"SELECT COUNT(*) FROM users WHERE invited_by IS NOT NULL", &stats.InvitedUsers},
	}
	for _, q := range queries {
		if err := DB.QueryRow(q.sql).Scan(q.dest); err != nil {
			return nil, err
		}
	}
	return stats, nil
}

type InviterRank struct {
	InviterID    int64  `json:"inviter_id"`
	InviterEmail string `json:"inviter_email"`
	InviteCount  int64  `json:"invite_count"`
}

func (s *UserStore) GetTopInviters(limit int) ([]InviterRank, error) {
	rows, err := DB.Query(`
		SELECT u.id, u.email, COUNT(*) as invite_count
		FROM users u
		JOIN users i ON i.invited_by = u.id
		GROUP BY u.id
		ORDER BY invite_count DESC, u.email ASC
		LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []InviterRank{}
	for rows.Next() {
		var item InviterRank
		if err := rows.Scan(&item.InviterID, &item.InviterEmail, &item.InviteCount); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}
