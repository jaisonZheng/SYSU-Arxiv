package mail

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"math/rand"
	"mime/multipart"
	"net/smtp"
	"net/textproto"
	"time"
)

const (
	smtpHost     = "smtp.163.com"
	smtpAddr     = "smtp.163.com:587"
	smtpAddrAlt  = "smtp.163.com:25"
	smtpUsername = "pobiplan@163.com"
	smtpPassword = "JHy9k5hguq3CS7Fz"
)

// 破壁计划设计系统 · 与前端主站统一
const (
	cream50  = "#FFFBF5"
	cream100 = "#FAF6EE"
	cream200 = "#F2EADC"
	cream300 = "#E7DAC4"
	line     = "#ECE3D2"
	ink900   = "#1B1A18"
	ink700   = "#3F3A33"
	ink500   = "#6E665B"
	ink400   = "#908577"
	camphor  = "#2D6A4F"
	honey400 = "#FF9A48"
	kapok400 = "#EE5A3E"
	kapok500 = "#C8412B"
	white    = "#FFFFFF"
)

type Sender struct{}

func NewSender() *Sender { return &Sender{} }

func (s *Sender) SendVerificationCode(email, code, purpose string) error {
	msg := buildVerificationEmail(email, code, purpose)
	auth := smtp.PlainAuth("", smtpUsername, smtpPassword, smtpHost)

	// Try STARTTLS on 587 first
	err := s.sendWithSTARTTLS(email, msg, auth)
	if err != nil {
		// Fallback to port 25
		err = s.sendWithSTARTTLSAlt(email, msg, auth)
	}
	return err
}

func buildVerificationEmail(to, code, purpose string) []byte {
	var subject string
	var plainBody string
	var htmlBody string

	if purpose == "login" {
		subject = fmt.Sprintf("欢迎回来 · 破壁计划登录验证码 %s", code)
		plainBody = fmt.Sprintf(`欢迎回到破壁计划，

一份笔记，少熬一夜。

你正在登录破壁计划，请使用下方验证码完成验证。

登录验证码：%s
10 分钟内有效，请勿泄露给他人。

破壁计划团队 · 由中大同学共同维护
联系：zhengzsh5@mail2.sysu.edu.cn`, code)
		htmlBody = renderWrapper(
			"🔐", "欢迎回来", "中大人的资料共享社区",
			fmt.Sprintf(`<p style="margin:0 0 22px;font-size:18px;font-weight:800;color:%s;letter-spacing:-0.02em;">一份笔记，<span style="color:%s;">少熬一夜</span></p>
      <p style="margin:0 0 28px;font-size:15px;line-height:1.75;color:%s;">你正在登录破壁计划，请使用下方验证码完成验证。</p>`, ink900, camphor, ink500),
			code,
			"",
		)
	} else if purpose == "register" {
		subject = fmt.Sprintf("欢迎加入破壁计划 · 你的验证码是 %s", code)
		plainBody = fmt.Sprintf(`欢迎加入破壁计划，

一份笔记，少熬一夜。

我们相信：笔记、试卷、课程包只要流动起来，就能帮更多人拆掉信息差。
谢谢你愿意成为这个共同体的一员。

你的验证码是：%s
10 分钟内有效，请勿泄露给他人。

注册成功后，把破壁计划分享给需要的同学，双方本周都能多 3 次下载额度。

破壁计划团队 · 由中大同学共同维护
联系：zhengzsh5@mail2.sysu.edu.cn`, code)
		htmlBody = renderWrapper(
			"🤝", "欢迎加入破壁计划", "中大人的资料共享社区",
			fmt.Sprintf(`<p style="margin:0 0 22px;font-size:18px;font-weight:800;color:%s;letter-spacing:-0.02em;">一份笔记，<span style="color:%s;">少熬一夜</span></p>
      <p style="margin:0 0 28px;font-size:15px;line-height:1.75;color:%s;">
        我们相信：笔记、试卷、课程包只要流动起来，就能帮更多人拆掉信息差。<br>
        谢谢你愿意成为这个共同体的一员。
      </p>`, ink900, camphor, ink500),
			code,
			fmt.Sprintf(`<a href="https://arxiv.jaison.ink/login" style="display:inline-block;background:linear-gradient(135deg,%s,%s);color:%s;text-decoration:none;padding:12px 28px;border-radius:999px;font-size:14px;font-weight:700;box-shadow:0 8px 20px -10px rgba(244,125,44,0.5);">去完善资料</a>
      <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:%s;">注册成功后，把破壁计划分享给需要的同学，双方本周都能多 3 次下载额度。</p>`, honey400, kapok400, white, ink500),
		)
	} else {
		subject = fmt.Sprintf("破壁计划 · 你的验证码 %s", code)
		plainBody = fmt.Sprintf(`你好，

一份笔记，少熬一夜。

你正在修改破壁计划的相关信息，请使用下方验证码完成验证。

你的验证码是：%s
10 分钟内有效，请勿泄露给他人。

破壁计划团队 · 由中大同学共同维护
联系：zhengzsh5@mail2.sysu.edu.cn`, code)
		htmlBody = renderWrapper(
			"✨", "破壁计划", "中大人的资料共享社区",
			fmt.Sprintf(`<p style="margin:0 0 22px;font-size:18px;font-weight:800;color:%s;letter-spacing:-0.02em;">一份笔记，<span style="color:%s;">少熬一夜</span></p>
      <p style="margin:0 0 28px;font-size:15px;line-height:1.75;color:%s;">你正在进行账号相关操作，请使用下方验证码完成验证。</p>`, ink900, camphor, ink500),
			code,
			"",
		)
	}

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	defer writer.Close()

	header := fmt.Sprintf(
		"To: %s\r\nFrom: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: multipart/alternative; boundary=%s\r\n\r\n",
		to, smtpUsername, subject, writer.Boundary(),
	)

	plainHeader := textproto.MIMEHeader{}
	plainHeader.Set("Content-Type", "text/plain; charset=UTF-8")
	plainPart, _ := writer.CreatePart(plainHeader)
	plainPart.Write([]byte(plainBody))

	htmlHeader := textproto.MIMEHeader{}
	htmlHeader.Set("Content-Type", "text/html; charset=UTF-8")
	htmlPart, _ := writer.CreatePart(htmlHeader)
	htmlPart.Write([]byte(htmlBody))

	return []byte(header + buf.String())
}

// baseWrapper 参数：emoji、标题、副标题、introHTML、code、extraHTML
const baseWrapper = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:%s;font-family:'Inter','Noto Sans SC',system-ui,sans-serif;color:%s;">
  <table width="100%%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:40px 16px;">
    <div style="max-width:480px;background:%s;border:1px solid %s;border-radius:20px;overflow:hidden;box-shadow:0 4px 12px -4px rgba(34,26,12,0.08),0 8px 28px -10px rgba(34,26,12,0.08);">
      <div style="background:linear-gradient(135deg,#FFF6EC,#FFEFE9);padding:36px 24px 28px;text-align:center;">
        <div style="font-size:40px;line-height:1;margin-bottom:12px;">%s</div>
        <h1 style="margin:0;font-size:24px;font-weight:800;color:%s;letter-spacing:-0.02em;">%s</h1>
        <p style="margin:10px 0 0;font-size:14px;color:%s;">%s</p>
      </div>
      <div style="padding:32px 28px;text-align:center;">
        %s
        <div style="display:inline-block;background:%s;border:1px dashed %s;border-radius:16px;padding:20px 32px;margin-bottom:20px;">
          <p style="margin:0 0 8px;font-size:12px;color:%s;letter-spacing:0.12em;text-transform:uppercase;">验证码</p>
          <p style="margin:0;font-size:36px;font-weight:800;color:%s;letter-spacing:0.18em;">%s</p>
        </div>
        <p style="margin:0 0 28px;font-size:13px;color:%s;">10 分钟内有效，请勿泄露给他人。</p>
        %s
      </div>
      <div style="background:%s;padding:20px 24px;text-align:center;border-top:1px solid %s;">
        <p style="margin:0;font-size:12px;line-height:1.6;color:%s;">
          来自破壁计划团队 · 由中大同学共同维护<br>
          联系 Jaison：<a href="mailto:zhengzsh5@mail2.sysu.edu.cn" style="color:%s;text-decoration:none;">zhengzsh5@mail2.sysu.edu.cn</a>
        </p>
      </div>
    </div>
  </td></tr></table>
</body></html>`

func renderWrapper(emoji, title, subtitle, introHTML, code, extraHTML string) string {
	return fmt.Sprintf(baseWrapper,
		cream50, ink900, white, line,
		emoji, ink900, title, ink500, subtitle,
		introHTML,
		cream50, cream300, ink400, kapok500, code,
		ink400, extraHTML,
		cream100, line, ink400, camphor,
	)
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
