package cramameleon

import (
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"sysu-arxiv/db"
)

var requestPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{16,100}$`)
var errConflict = errors.New("request conflict")
var errExpired = errors.New("read access expired")

type accessRequest struct {
	RequestID string   `json:"requestId"`
	ItemIDs   []string `json:"itemIds,omitempty"`
}

func quotaJSON(q db.DownloadDecision) gin.H {
	remaining := q.Total - q.Used
	if remaining < 0 {
		remaining = 0
	}
	return gin.H{"total": q.Total, "used": q.Used, "remaining": remaining, "cycleStart": q.CycleStart, "cycleEnd": q.CycleEnd}
}

func (h *handler) access(c *gin.Context, kind string) {
	id, ok := number(c, "id")
	if !ok {
		return
	}
	var v accessRequest
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 8192)
	decoder := json.NewDecoder(c.Request.Body)
	decoder.DisallowUnknownFields()
	if decoder.Decode(&v) != nil || decoder.Decode(&struct{}{}) != io.EOF || !requestPattern.MatchString(v.RequestID) || kind == "material" && len(v.ItemIDs) > 0 || kind == "package" && (len(v.ItemIDs) == 0 || len(v.ItemIDs) > 20) {
		fail(c, 400, "INVALID_REQUEST", "请选择最多 20 份资料并重新确认")
		return
	}
	if kind == "package" {
		seen := map[string]bool{}
		for _, s := range v.ItemIDs {
			if !positiveID(s) || seen[s] {
				fail(c, 400, "INVALID_REQUEST", "目录条目不正确")
				return
			}
			seen[s] = true
			n, _ := strconv.ParseInt(s, 10, 64)
			f, err := h.openResource(kind, id, n)
			if err != nil {
				fail(c, 422, "FILE_UNAVAILABLE", "所选文件无法读取")
				return
			}
			f.Close()
		}
	} else {
		f, err := h.openResource(kind, id, 0)
		if err != nil {
			fail(c, 422, "FILE_UNAVAILABLE", "文件不存在、格式不支持或超过 20 MB")
			return
		}
		f.Close()
	}
	sort.Strings(v.ItemIDs)
	fingerprint := digest(kind + ":" + strconv.FormatInt(id, 10) + ":" + strings.Join(v.ItemIDs, ","))
	userID := c.GetInt64("userID")
	now := time.Now()
	var grantID string
	var expires int64
	var replayed bool
	err := db.WithDownloadTransaction(c.Request.Context(), func(conn *sql.Conn) error {
		ctx := c.Request.Context()
		var oldFingerprint string
		err := conn.QueryRowContext(ctx, `SELECT r.fingerprint,r.grant_id,a.expires FROM cram_request_receipts r JOIN cram_read_access a ON a.id=r.grant_id WHERE r.user_id=? AND r.request_id=?`, userID, v.RequestID).Scan(&oldFingerprint, &grantID, &expires)
		if err == nil {
			if oldFingerprint != fingerprint {
				return errConflict
			}
			if expires <= now.Unix() {
				return errExpired
			}
			replayed = true
			return nil
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		grantID, err = randomToken()
		if err != nil {
			return err
		}
		expires = now.Add(30 * time.Minute).Unix()
		if _, err = conn.ExecContext(ctx, "INSERT INTO cram_read_access(id,user_id,kind,resource_id,expires) VALUES(?,?,?,?,?)", grantID, userID, kind, id, expires); err != nil {
			return err
		}
		_, err = conn.ExecContext(ctx, "INSERT INTO cram_request_receipts(user_id,request_id,fingerprint,grant_id,charged) VALUES(?,?,?,?,0)", userID, v.RequestID, fingerprint, grantID)
		return err
	})
	if err != nil {
		switch {
		case errors.Is(err, errConflict):
			fail(c, 409, "IDEMPOTENCY_CONFLICT", "请求编号已用于其他资料，请重新确认")
		case errors.Is(err, errExpired):
			fail(c, 410, "ACCESS_EXPIRED", "此前的读取授权已到期，请重新确认")
		default:
			fail(c, 503, "STORAGE_FAILED", "读取授权暂不可用，请使用同一请求重试")
		}
		return
	}
	c.JSON(200, gin.H{"readId": grantID, "expires": time.Unix(expires, 0).UTC(), "charged": 0, "replayed": replayed})
}

func (h *handler) content(c *gin.Context, kind string) {
	id, ok := number(c, "id")
	if !ok {
		return
	}
	var itemID int64
	if kind == "package" {
		itemID, ok = number(c, "itemId")
		if !ok {
			return
		}
	}
	// The authenticated integration credential authorizes free reads. Keep validating
	// explicit legacy grants for clients already holding a readId.
	if readID, supplied := c.GetQuery("readId"); supplied && !validateReadGrant(c, readID, kind, id) {
		return
	}
	f, err := h.openResource(kind, id, itemID)
	if err != nil {
		fail(c, 422, "FILE_UNAVAILABLE", "文件目前无法读取")
		return
	}
	defer f.Close()
	types := map[string]string{"pdf": "application/pdf", "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "txt": "text/plain; charset=utf-8", "md": "text/plain; charset=utf-8", "markdown": "text/plain; charset=utf-8"}
	c.Header("Content-Type", types[format(f.name)])
	if f.category == "past_exam" {
		c.Header("X-Cram-Material-Category", f.category)
	}
	c.Header("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": f.name}))
	c.Header("Content-Length", strconv.FormatInt(f.size, 10))
	c.Status(200)
	// Reads stay bounded even if the underlying file changes after admission.
	_, _ = io.Copy(c.Writer, io.LimitReader(f, fileLimit))
}

func validateReadGrant(c *gin.Context, readID, kind string, id int64) bool {
	if !proof.MatchString(readID) {
		fail(c, 403, "READ_ACCESS_REQUIRED", "请先确认读取资料")
		return false
	}
	var expires int64
	err := db.DB.QueryRowContext(c.Request.Context(), "SELECT expires FROM cram_read_access WHERE id=? AND user_id=? AND kind=? AND resource_id=?", readID, c.GetInt64("userID"), kind, id).Scan(&expires)
	if errors.Is(err, sql.ErrNoRows) {
		fail(c, 403, "READ_ACCESS_REQUIRED", "没有该资料的读取授权")
		return false
	}
	if err != nil {
		fail(c, 503, "STORAGE_FAILED", "读取授权暂不可用")
		return false
	}
	if expires <= time.Now().Unix() {
		fail(c, 410, "ACCESS_EXPIRED", "读取授权已到期，请重新确认")
		return false
	}
	return true
}
