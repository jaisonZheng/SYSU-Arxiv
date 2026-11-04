package cramameleon

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"sysu-arxiv/db"
)

type fixture struct {
	router     *gin.Engine
	root       string
	cfg        config
	token, jwt string
}

func setup(t *testing.T) *fixture {
	t.Helper()
	gin.SetMode(gin.TestMode)
	root := t.TempDir()
	database, err := db.InitDB(filepath.Join(root, "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { database.Close() })
	for _, statement := range []string{
		`INSERT INTO users(id,email,nickname,created_at) VALUES(1,'test@example.test','测试同学','2026-01-01 10:00:00'),(2,'other@example.test','另一位','2026-01-01 10:00:00')`,
		`INSERT INTO materials(id,title,category,file_name,file_path,file_size) VALUES(1,'课程讲义','study_material','lecture.txt','lecture.txt',12),(2,'其他讲义','study_material','lecture.txt','lecture.txt',12),(3,'第三份','study_material','lecture.txt','lecture.txt',12)`,
		`INSERT INTO course_packages(id,title,course_name,source_type,file_name,file_path,file_size) VALUES(1,'数学课程包','高等数学','upload','math.zip','math.zip',100)`,
		`INSERT INTO package_items(id,package_id,path,file_name,file_size) VALUES(1,1,'chapter/one.txt','one.txt',12),(2,1,'chapter/two.txt','two.txt',12),(3,1,'../escape.txt','escape.txt',12),(4,1,'chapter/bad.exe','bad.exe',12)`,
		`UPDATE users SET password_hash=''`,
		`UPDATE materials SET description=''`,
		`UPDATE course_packages SET description='',total_files=4`,
	} {
		if _, err = database.Exec(statement); err != nil {
			t.Fatal(err)
		}
	}
	if err = os.WriteFile(filepath.Join(root, "lecture.txt"), []byte("lecture text"), 0600); err != nil {
		t.Fatal(err)
	}
	f, err := os.Create(filepath.Join(root, "math.zip"))
	if err != nil {
		t.Fatal(err)
	}
	z := zip.NewWriter(f)
	for _, name := range []string{"chapter/one.txt", "chapter/two.txt", "../escape.txt", "chapter/bad.exe"} {
		w, err := z.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		_, _ = w.Write([]byte("lecture text"))
	}
	if err = z.Close(); err != nil {
		t.Fatal(err)
	}
	f.Close()
	cfg := config{appURL: "http://localhost:18085", issuer: "http://localhost:8084", clientID: "cramameleon", secret: strings.Repeat("s", 40)}
	r := gin.New()
	if err = register(r, root, cfg); err != nil {
		t.Fatal(err)
	}
	t.Setenv("JWT_SECRET", "fixture-jwt-secret")
	oldJWT, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"user_id": 1, "exp": time.Now().Add(time.Hour).Unix()}).SignedString([]byte("fixture-jwt-secret"))
	if err != nil {
		t.Fatal(err)
	}
	token := strings.Repeat("a", 43)
	_, err = database.Exec("INSERT INTO cram_credentials(token_hash,user_id,client_id,scope,expires) VALUES(?,?,?,?,?)", digest(token), 1, cfg.clientID, scope, time.Now().Add(time.Hour).Unix())
	if err != nil {
		t.Fatal(err)
	}
	return &fixture{r, root, cfg, token, oldJWT}
}
func (f *fixture) call(method, path, body, token string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, prefix+path, strings.NewReader(body))
	r.Header.Set("Authorization", "Bearer "+token)
	r.Header.Set("Origin", f.cfg.issuer)
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	f.router.ServeHTTP(w, r)
	return w
}
func used(t *testing.T) int {
	t.Helper()
	var n int
	if err := db.DB.QueryRow("SELECT COALESCE(SUM(used_quota),0) FROM download_quota WHERE user_id=1").Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}
func readGrant(t *testing.T, w *httptest.ResponseRecorder) string {
	t.Helper()
	if w.Code != 200 {
		t.Fatalf("access %d: %s", w.Code, w.Body)
	}
	var v struct {
		ReadID string `json:"readId"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &v); err != nil {
		t.Fatal(err)
	}
	return v.ReadID
}

func TestAuthorizationBindsCodeAndSingleUse(t *testing.T) {
	f := setup(t)
	verifier := strings.Repeat("v", 43)
	hash := sha256.Sum256([]byte(verifier))
	v := authorizeRequest{ClientID: f.cfg.clientID, RedirectURI: f.cfg.appURL + "/api/auth/old-site/callback", ResponseType: "code", State: strings.Repeat("q", 43), Challenge: base64.RawURLEncoding.EncodeToString(hash[:]), Method: "S256", Scope: scope}
	body, _ := json.Marshal(v)
	w := f.call("POST", "/authorize", string(body), f.jwt)
	if w.Code != 200 {
		t.Fatalf("authorize %d %s", w.Code, w.Body)
	}
	var response map[string]string
	_ = json.Unmarshal(w.Body.Bytes(), &response)
	redirect, _ := url.Parse(response["redirect_url"])
	code := redirect.Query().Get("code")
	exchange := func(verifier string) *httptest.ResponseRecorder {
		form := url.Values{"grant_type": {"authorization_code"}, "client_id": {f.cfg.clientID}, "redirect_uri": {v.RedirectURI}, "code": {code}, "code_verifier": {verifier}}
		r := httptest.NewRequest("POST", prefix+"/token", strings.NewReader(form.Encode()))
		r.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		r.SetBasicAuth(f.cfg.clientID, f.cfg.secret)
		w := httptest.NewRecorder()
		f.router.ServeHTTP(w, r)
		return w
	}
	if w = exchange(strings.Repeat("x", 43)); w.Code != 400 {
		t.Fatal("wrong verifier accepted")
	}
	w = exchange(verifier)
	if w.Code != 200 || !strings.Contains(w.Body.String(), `"subject":"1"`) {
		t.Fatalf("token %d %s", w.Code, w.Body)
	}
	if w = exchange(verifier); w.Code != 400 {
		t.Fatal("replayed authorization code accepted")
	}
	v.RedirectURI = "https://evil.example/callback"
	body, _ = json.Marshal(v)
	if w = f.call("POST", "/authorize", string(body), f.jwt); w.Code != 400 {
		t.Fatal("foreign redirect accepted")
	}
	if n := used(t); n != 0 {
		t.Fatal("authorization consumed quota")
	}
}

func TestReadAccessAndHistoricalQuota(t *testing.T) {
	f := setup(t)
	if w := f.call("GET", "/materials/1/content", "", f.token); w.Code != 403 {
		t.Fatal("read without grant")
	}
	request := `{"requestId":"request_package_0001","itemIds":["1","2"]}`
	grant := readGrant(t, f.call("POST", "/packages/1/access", request, f.token))
	if n := used(t); n != 1 {
		t.Fatalf("used %d", n)
	}
	if replay := readGrant(t, f.call("POST", "/packages/1/access", request, f.token)); replay != grant {
		t.Fatal("retry created another grant")
	}
	if w := f.call("POST", "/packages/1/access", `{"requestId":"request_package_0001","itemIds":["1"]}`, f.token); w.Code != 409 {
		t.Fatal("request collision not rejected")
	}
	if _, err := db.DB.Exec("UPDATE download_quota SET used_quota=total_quota"); err != nil {
		t.Fatal(err)
	}
	if again := readGrant(t, f.call("POST", "/packages/1/access", `{"requestId":"request_package_0002","itemIds":["2"]}`, f.token)); again != grant {
		t.Fatal("current package grant not reused at zero quota")
	}
	for _, item := range []string{"1", "2"} {
		w := f.call("GET", "/packages/1/items/"+item+"/content?readId="+grant, "", f.token)
		if w.Code != 200 || w.Body.String() != "lecture text" {
			t.Fatalf("content %d %s", w.Code, w.Body)
		}
	}
	for _, item := range []string{"3", "4", "999"} {
		w := f.call("POST", "/packages/1/access", fmt.Sprintf(`{"requestId":"invalid_item_%s_0000","itemIds":["%s"]}`, item, item), f.token)
		if w.Code != 422 {
			t.Fatalf("invalid item %s accepted: %d", item, w.Code)
		}
	}
	other := strings.Repeat("b", 43)
	_, _ = db.DB.Exec("INSERT INTO cram_credentials(token_hash,user_id,client_id,scope,expires) VALUES(?,?,?,?,?)", digest(other), 2, f.cfg.clientID, scope, time.Now().Add(time.Hour).Unix())
	if w := f.call("GET", "/packages/1/items/1/content?readId="+grant, "", other); w.Code != 403 {
		t.Fatal("another user read grant")
	}
	_, _ = db.DB.Exec("UPDATE cram_read_access SET expires=? WHERE id=?", time.Now().Add(-time.Second).Unix(), grant)
	if w := f.call("POST", "/packages/1/access", request, f.token); w.Code != 410 {
		t.Fatal("expired retry created a new grant")
	}
	_, _ = db.DB.Exec("DELETE FROM cram_read_access WHERE id=?", grant)
	w := f.call("POST", "/packages/1/access", `{"requestId":"next_cycle_history_01","itemIds":["1"]}`, f.token)
	readGrant(t, w)
	if !strings.Contains(w.Body.String(), `"charged":0`) {
		t.Fatal("historical download charged again")
	}
}

func TestConcurrentFinalQuotaAndDailyLimit(t *testing.T) {
	f := setup(t)
	err := db.WithDownloadTransaction(context.Background(), func(conn *sql.Conn) error {
		q, err := db.DownloadQuotaInTransaction(context.Background(), conn, 1, time.Now())
		if err != nil {
			return err
		}
		_, err = conn.ExecContext(context.Background(), "UPDATE download_quota SET used_quota=total_quota-1 WHERE user_id=1 AND week_start=?", q.CycleStart)
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
	var winners atomic.Int32
	var group sync.WaitGroup
	for i := 0; i < 12; i++ {
		group.Add(1)
		go func(i int) {
			defer group.Done()
			if i%2 == 0 {
				_, err := db.ConsumeDownload(context.Background(), 1, 1, "material")
				if err == nil {
					winners.Add(1)
				}
			} else {
				w := f.call("POST", "/packages/1/access", fmt.Sprintf(`{"requestId":"concurrent_request_%02d","itemIds":["1"]}`, i), f.token)
				if w.Code == 200 {
					winners.Add(1)
				}
			}
		}(i)
	}
	group.Wait()
	if n := used(t); n != 3 {
		t.Fatalf("concurrent quota overdraw: %d; accepted %d", n, winners.Load())
	}
	var records int
	_ = db.DB.QueryRow("SELECT COUNT(*) FROM download_records WHERE user_id=1").Scan(&records)
	if records != 1 {
		t.Fatalf("last quota admitted %d new resources", records)
	}
	var kind string
	var id int64
	_ = db.DB.QueryRow("SELECT resource_type,resource_id FROM download_records WHERE user_id=1").Scan(&kind, &id)
	for i := 0; i < 12; i++ {
		_, _ = db.ConsumeDownload(context.Background(), 1, id, kind)
	}
	if _, err = db.ConsumeDownload(context.Background(), 1, id, kind); err != db.ErrDailyDownloadLimit {
		t.Fatalf("daily limit: %v", err)
	}
	var daily int
	_ = db.DB.QueryRow("SELECT COUNT(*) FROM download_repeat_records WHERE user_id=1").Scan(&daily)
	if daily != 10 {
		t.Fatalf("daily count %d", daily)
	}
}

func TestScopeRevocationAndFilesystemBoundary(t *testing.T) {
	f := setup(t)
	for _, token := range []string{"", f.jwt} {
		if w := f.call("GET", "/materials", "", token); w.Code != 401 {
			t.Fatal("legacy JWT accepted as integration credential")
		}
	}
	outside := filepath.Join(t.TempDir(), "secret.txt")
	_ = os.WriteFile(outside, []byte("private"), 0600)
	_, _ = db.DB.Exec("UPDATE materials SET file_path=? WHERE id=1", outside)
	if w := f.call("POST", "/materials/1/access", `{"requestId":"outside_root_request"}`, f.token); w.Code != 422 {
		t.Fatal("outside file allowed")
	}
	if used(t) != 0 {
		t.Fatal("failed file charged quota")
	}
	w := f.call("GET", "/materials?search=课程", "", f.token)
	if w.Code != 200 || bytes.Contains(w.Body.Bytes(), []byte("file_path")) || bytes.Contains(w.Body.Bytes(), []byte(f.root)) {
		t.Fatal("search leaked filesystem path")
	}
	_, _ = db.DB.Exec("UPDATE cram_credentials SET revoked=1")
	if w = f.call("GET", "/quota", "", f.token); w.Code != 401 {
		t.Fatal("revoked credential accepted")
	}
}
