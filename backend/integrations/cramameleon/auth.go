// Package cramameleon provides the old site's narrow, user-bound integration API.
package cramameleon

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"sysu-arxiv/db"
	"sysu-arxiv/middleware"
)

const prefix = "/api/integrations/cramameleon"
const scope = "entry materials:read"

type config struct{ appURL, issuer, clientID, secret string }
type handler struct {
	cfg      config
	dataRoot string
}

func origin(raw string) (string, error) {
	u, err := url.Parse(strings.TrimRight(raw, "/"))
	if err != nil || u.Hostname() == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" || u.Path != "" {
		return "", errors.New("integration address must be a fixed origin")
	}
	local := u.Hostname() == "127.0.0.1" || u.Hostname() == "localhost" || u.Hostname() == "::1"
	if u.Scheme != "https" && !(u.Scheme == "http" && local) {
		return "", errors.New("integration origin requires HTTPS")
	}
	return u.String(), nil
}

func Register(r *gin.Engine, dataRoot string) error {
	cfg := config{appURL: os.Getenv("CRAMAMELEON_APP_URL"), issuer: os.Getenv("ARXIV_PUBLIC_URL"), clientID: os.Getenv("CRAMAMELEON_CLIENT_ID"), secret: os.Getenv("CRAMAMELEON_CLIENT_SECRET")}
	if cfg.appURL == "" && cfg.secret == "" {
		r.GET(prefix+"/config", func(c *gin.Context) { c.Header("Cache-Control", "no-store"); c.JSON(200, gin.H{"enabled": false}) })
		return nil
	}
	var err error
	if cfg.appURL, err = origin(cfg.appURL); err != nil {
		return fmt.Errorf("CRAMAMELEON_APP_URL: %w", err)
	}
	if cfg.issuer, err = origin(cfg.issuer); err != nil {
		return fmt.Errorf("ARXIV_PUBLIC_URL: %w", err)
	}
	if cfg.clientID == "" {
		cfg.clientID = "cramameleon"
	}
	if cfg.clientID != "cramameleon" || len(cfg.secret) < 32 || strings.Contains(strings.ToLower(cfg.secret), "replace") {
		return errors.New("a dedicated Cramameleon client secret is required")
	}
	return register(r, dataRoot, cfg)
}

func register(r *gin.Engine, dataRoot string, cfg config) error {
	if _, err := db.DB.Exec(`
CREATE TABLE IF NOT EXISTS cram_auth_codes(code_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL,client_id TEXT NOT NULL,redirect_uri TEXT NOT NULL,challenge TEXT NOT NULL,context TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS cram_code_expiry ON cram_auth_codes(expires);
CREATE TABLE IF NOT EXISTS cram_credentials(token_hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL,client_id TEXT NOT NULL,scope TEXT NOT NULL,expires INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS cram_credential_expiry ON cram_credentials(expires);
CREATE TABLE IF NOT EXISTS cram_read_access(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL,kind TEXT NOT NULL,resource_id INTEGER NOT NULL,cycle_start INTEGER,expires INTEGER NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS cram_package_cycle ON cram_read_access(user_id,resource_id,cycle_start) WHERE kind='package';
CREATE TABLE IF NOT EXISTS cram_request_receipts(user_id INTEGER NOT NULL,request_id TEXT NOT NULL,fingerprint TEXT NOT NULL,grant_id TEXT NOT NULL,charged INTEGER NOT NULL,PRIMARY KEY(user_id,request_id));`); err != nil {
		return err
	}
	h := &handler{cfg: cfg, dataRoot: dataRoot}
	api := r.Group(prefix)
	api.Use(func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		c.Header("X-Content-Type-Options", "nosniff")
		c.Next()
	})
	api.GET("/config", func(c *gin.Context) {
		c.JSON(200, gin.H{"enabled": true, "appStartUrl": cfg.appURL + "/api/auth/old-site/start"})
	})
	api.POST("/authorize", middleware.AuthRequired(), h.authorize)
	api.POST("/token", h.clientAuth, h.token)
	api.POST("/revoke", h.clientAuth, h.revoke)
	protected := api.Group("")
	protected.Use(h.credentialAuth)
	h.registerMaterials(protected)
	return nil
}

func fail(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
}
func digest(s string) string { v := sha256.Sum256([]byte(s)); return hex.EncodeToString(v[:]) }
func randomToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
func positiveID(s string) bool {
	n, err := strconv.ParseInt(s, 10, 64)
	return err == nil && n > 0 && strconv.FormatInt(n, 10) == s
}

var proof = regexp.MustCompile(`^[A-Za-z0-9_-]{43}$`)
var verifierPattern = regexp.MustCompile(`^[A-Za-z0-9._~-]{43,128}$`)

type resourceContext struct {
	MaterialID string `json:"materialId,omitempty"`
	PackageID  string `json:"packageId,omitempty"`
	ItemID     string `json:"itemId,omitempty"`
}
type authorizeRequest struct {
	ClientID     string          `json:"client_id"`
	RedirectURI  string          `json:"redirect_uri"`
	ResponseType string          `json:"response_type"`
	State        string          `json:"state"`
	Challenge    string          `json:"code_challenge"`
	Method       string          `json:"code_challenge_method"`
	Scope        string          `json:"scope"`
	Context      resourceContext `json:"context"`
}

func (h *handler) authorize(c *gin.Context) {
	if c.GetHeader("Origin") != h.cfg.issuer {
		fail(c, 403, "ORIGIN_REJECTED", "请从破壁计划的授权页面进入")
		return
	}
	var v authorizeRequest
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 8192)
	d := json.NewDecoder(c.Request.Body)
	d.DisallowUnknownFields()
	if d.Decode(&v) != nil || d.Decode(&struct{}{}) != io.EOF || v.ClientID != h.cfg.clientID || v.RedirectURI != h.cfg.appURL+"/api/auth/old-site/callback" || v.ResponseType != "code" || v.Scope != scope || v.Method != "S256" || !proof.MatchString(v.State) || !proof.MatchString(v.Challenge) {
		fail(c, 400, "INVALID_AUTH_REQUEST", "授权请求无效，请重新进入")
		return
	}
	ctx := v.Context
	for _, id := range []string{ctx.MaterialID, ctx.PackageID, ctx.ItemID} {
		if id != "" && !positiveID(id) {
			fail(c, 400, "INVALID_REQUEST", "资料入口参数不正确")
			return
		}
	}
	if ctx.MaterialID != "" && (ctx.PackageID != "" || ctx.ItemID != "") || ctx.ItemID != "" && ctx.PackageID == "" {
		fail(c, 400, "INVALID_REQUEST", "资料入口参数不正确")
		return
	}
	if !h.validResourceContext(ctx) {
		fail(c, 404, "MATERIAL_NOT_FOUND", "入口资料不存在")
		return
	}
	userID := c.GetInt64("userID")
	if _, err := db.NewUserStore().GetByID(userID); err != nil {
		fail(c, 401, "AUTH_REQUIRED", "登录已过期，请重新登录破壁计划")
		return
	}
	code, err := randomToken()
	if err != nil {
		fail(c, 500, "AUTH_FAILED", "无法创建进入授权")
		return
	}
	contextJSON, _ := json.Marshal(ctx)
	now := time.Now().Unix()
	if _, err = db.DB.ExecContext(c.Request.Context(), "DELETE FROM cram_auth_codes WHERE expires<=?", now); err != nil {
		fail(c, 503, "STORAGE_FAILED", "授权暂不可用")
		return
	}
	result, err := db.DB.ExecContext(c.Request.Context(), `INSERT INTO cram_auth_codes SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM cram_auth_codes WHERE user_id=? AND expires>?)<12`, digest(code), userID, h.cfg.clientID, v.RedirectURI, v.Challenge, string(contextJSON), now+60, userID, now)
	if err != nil {
		fail(c, 503, "STORAGE_FAILED", "授权暂不可用")
		return
	}
	if n, _ := result.RowsAffected(); n != 1 {
		fail(c, 429, "AUTH_FLOW_LIMIT", "授权请求过多，请稍后再试")
		return
	}
	u, _ := url.Parse(v.RedirectURI)
	q := u.Query()
	q.Set("code", code)
	q.Set("state", v.State)
	u.RawQuery = q.Encode()
	c.JSON(200, gin.H{"redirect_url": u.String()})
}

func (h *handler) validResourceContext(v resourceContext) bool {
	if v.MaterialID != "" {
		var n int
		return db.DB.QueryRow("SELECT COUNT(*) FROM materials WHERE id=?", v.MaterialID).Scan(&n) == nil && n == 1
	}
	if v.PackageID != "" {
		var n int
		query := "SELECT COUNT(*) FROM course_packages WHERE id=?"
		args := []any{v.PackageID}
		if v.ItemID != "" {
			query = "SELECT COUNT(*) FROM package_items WHERE package_id=? AND id=?"
			args = append(args, v.ItemID)
		}
		return db.DB.QueryRow(query, args...).Scan(&n) == nil && n == 1
	}
	return true
}

func (h *handler) clientAuth(c *gin.Context) {
	id, secret, ok := c.Request.BasicAuth()
	if !ok || subtle.ConstantTimeCompare([]byte(id), []byte(h.cfg.clientID)) != 1 || subtle.ConstantTimeCompare([]byte(secret), []byte(h.cfg.secret)) != 1 {
		fail(c, 401, "INVALID_CLIENT", "客户端认证失败")
		return
	}
	c.Next()
}

func parseForm(c *gin.Context) bool {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 8192)
	if c.Request.ParseForm() != nil {
		fail(c, 400, "INVALID_REQUEST", "请求格式不正确")
		return false
	}
	return true
}

func (h *handler) token(c *gin.Context) {
	if !parseForm(c) {
		return
	}
	v := c.Request.PostForm
	if v.Get("grant_type") != "authorization_code" || v.Get("client_id") != h.cfg.clientID || v.Get("redirect_uri") != h.cfg.appURL+"/api/auth/old-site/callback" || !proof.MatchString(v.Get("code")) || !verifierPattern.MatchString(v.Get("code_verifier")) {
		fail(c, 400, "INVALID_GRANT", "授权码无效或已过期")
		return
	}
	challenge := sha256.Sum256([]byte(v.Get("code_verifier")))
	tx, err := db.DB.BeginTx(c.Request.Context(), nil)
	if err != nil {
		fail(c, 503, "STORAGE_FAILED", "授权暂不可用")
		return
	}
	defer tx.Rollback()
	var userID int64
	err = tx.QueryRowContext(c.Request.Context(), `DELETE FROM cram_auth_codes WHERE code_hash=? AND client_id=? AND redirect_uri=? AND challenge=? AND expires>? RETURNING user_id`, digest(v.Get("code")), h.cfg.clientID, v.Get("redirect_uri"), base64.RawURLEncoding.EncodeToString(challenge[:]), time.Now().Unix()).Scan(&userID)
	if errors.Is(err, sql.ErrNoRows) {
		fail(c, 400, "INVALID_GRANT", "授权码无效或已过期")
		return
	}
	if err != nil {
		fail(c, 503, "STORAGE_FAILED", "授权暂不可用")
		return
	}
	var name string
	if err = tx.QueryRowContext(c.Request.Context(), "SELECT COALESCE(nickname,'') FROM users WHERE id=?", userID).Scan(&name); err != nil {
		fail(c, 400, "INVALID_GRANT", "账号已不可用")
		return
	}
	access, err := randomToken()
	if err != nil {
		fail(c, 500, "AUTH_FAILED", "无法创建资料访问授权")
		return
	}
	if _, err = tx.ExecContext(c.Request.Context(), "INSERT INTO cram_credentials(token_hash,user_id,client_id,scope,expires) VALUES(?,?,?,?,?)", digest(access), userID, h.cfg.clientID, scope, time.Now().Add(8*time.Hour).Unix()); err != nil {
		fail(c, 503, "STORAGE_FAILED", "授权暂不可用")
		return
	}
	if err = tx.Commit(); err != nil {
		fail(c, 503, "STORAGE_FAILED", "授权暂不可用")
		return
	}
	c.JSON(200, gin.H{"issuer": h.cfg.issuer, "subject": strconv.FormatInt(userID, 10), "name": name, "access_token": access, "expires_in": 8 * 3600, "scope": scope})
}

func (h *handler) revoke(c *gin.Context) {
	if !parseForm(c) {
		return
	}
	token := c.Request.PostForm.Get("token")
	if len(token) > 4096 {
		fail(c, 400, "INVALID_REQUEST", "凭据格式不正确")
		return
	}
	if _, err := db.DB.ExecContext(c.Request.Context(), "UPDATE cram_credentials SET revoked=1 WHERE token_hash=? AND client_id=?", digest(token), h.cfg.clientID); err != nil {
		fail(c, 503, "STORAGE_FAILED", "授权暂不可用")
		return
	}
	c.Status(204)
}

func (h *handler) credentialAuth(c *gin.Context) {
	authorization := c.GetHeader("Authorization")
	if !strings.HasPrefix(authorization, "Bearer ") || len(authorization) > 4103 {
		fail(c, 401, "MATERIAL_AUTH_EXPIRED", "资料访问授权已失效")
		return
	}
	var userID int64
	var grantedScope string
	err := db.DB.QueryRowContext(c.Request.Context(), `SELECT t.user_id,t.scope FROM cram_credentials t JOIN users u ON u.id=t.user_id WHERE t.token_hash=? AND t.client_id=? AND t.expires>? AND t.revoked=0`, digest(strings.TrimPrefix(authorization, "Bearer ")), h.cfg.clientID, time.Now().Unix()).Scan(&userID, &grantedScope)
	if errors.Is(err, sql.ErrNoRows) {
		fail(c, 401, "MATERIAL_AUTH_EXPIRED", "资料访问授权已失效，请从旧站重新进入")
		return
	}
	if err != nil {
		fail(c, 503, "STORAGE_FAILED", "授权暂不可用")
		return
	}
	if grantedScope != scope {
		fail(c, 403, "ACCESS_DENIED", "当前授权无法读取课程资料")
		return
	}
	c.Set("userID", userID)
	c.Next()
}
