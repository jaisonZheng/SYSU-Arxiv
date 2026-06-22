package mail

import (
	"crypto/tls"
	"fmt"
	"math/rand"
	"net/smtp"
	"time"
)

const (
	smtpHost     = "smtp.163.com"
	smtpAddr     = "smtp.163.com:587"
	smtpAddrAlt  = "smtp.163.com:25"
	smtpUsername = "pobiplan@163.com"
	smtpPassword = "JHy9k5hguq3CS7Fz"
)

type Sender struct{}

func NewSender() *Sender { return &Sender{} }

func (s *Sender) SendVerificationCode(email, code string) error {
	subject := "SYSU-Arxiv 验证码"
	body := fmt.Sprintf("您的验证码是：%s\n\n验证码 10 分钟内有效，请勿泄露给他人。\n\nSYSU-Arxiv", code)
	msg := []byte(fmt.Sprintf("To: %s\r\nSubject: %s\r\n\r\n%s", email, subject, body))

	auth := smtp.PlainAuth("", smtpUsername, smtpPassword, smtpHost)

	// Try STARTTLS on 587 first
	err := s.sendWithSTARTTLS(email, msg, auth)
	if err != nil {
		// Fallback to port 25
		err = s.sendWithSTARTTLSAlt(email, msg, auth)
	}
	return err
}

func (s *Sender) sendWithSTARTTLS(to string, msg []byte, auth smtp.Auth) error {
	conn, err := tls.Dial("tcp", smtpAddr, &tls.Config{ServerName: smtpHost, InsecureSkipVerify: true})
	if err != nil {
		return err
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, smtpHost)
	if err != nil {
		return err
	}
	defer client.Close()

	if err := client.Auth(auth); err != nil {
		return err
	}
	if err := client.Mail(smtpUsername); err != nil {
		return err
	}
	if err := client.Rcpt(to); err != nil {
		return err
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	_, err = w.Write(msg)
	if err != nil {
		return err
	}
	w.Close()
	return client.Quit()
}

func (s *Sender) sendWithSTARTTLSAlt(to string, msg []byte, auth smtp.Auth) error {
	client, err := smtp.Dial(smtpAddrAlt)
	if err != nil {
		return err
	}
	defer client.Close()

	if err := client.StartTLS(&tls.Config{ServerName: smtpHost, InsecureSkipVerify: true}); err != nil {
		return err
	}
	if err := client.Auth(auth); err != nil {
		return err
	}
	if err := client.Mail(smtpUsername); err != nil {
		return err
	}
	if err := client.Rcpt(to); err != nil {
		return err
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	_, err = w.Write(msg)
	if err != nil {
		return err
	}
	w.Close()
	return client.Quit()
}

func GenerateCode() string {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	return fmt.Sprintf("%06d", r.Intn(1000000))
}
