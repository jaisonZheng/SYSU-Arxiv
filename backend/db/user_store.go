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
