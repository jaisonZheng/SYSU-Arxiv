package db

import "time"

type EmailVerificationStore struct{}

func NewEmailVerificationStore() *EmailVerificationStore { return &EmailVerificationStore{} }

func (s *EmailVerificationStore) Create(email, code string, expiresAt time.Time) error {
	_, err := DB.Exec(
		`INSERT INTO email_verifications (email, code, expires_at) VALUES (?, ?, ?)`,
		email, code, expiresAt,
	)
	return err
}

func (s *EmailVerificationStore) GetLatest(email string) (string, time.Time, error) {
	var code string
	var expiresAt time.Time
	err := DB.QueryRow(
		`SELECT code, expires_at FROM email_verifications WHERE email = ? ORDER BY created_at DESC LIMIT 1`,
		email,
	).Scan(&code, &expiresAt)
	if err != nil {
		return "", time.Time{}, err
	}
	return code, expiresAt, nil
}

func (s *EmailVerificationStore) CountToday(email string) (int, error) {
	var count int
	err := DB.QueryRow(
		`SELECT COUNT(*) FROM email_verifications WHERE email = ? AND created_at >= datetime('now', 'start of day')`,
		email,
	).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}
