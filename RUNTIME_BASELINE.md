# Runtime source baseline

Aligned on 2026-11-05 from the mini working tree at `/Users/mac/foo/sysu-arxiv`.

The original working tree at commit `ce9015488e46fd6ec6a843b4e347f13654c9be65`, including its uncommitted changes, reproduced the deployed Linux executable byte for byte with Go 1.26.2:

```sh
cd backend
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -mod=readonly -o /tmp/sysu-arxiv-baseline .
```

Original binary SHA-256: `4a497f52a22fc43534ef1a4473282d43472d1e58307b3873894841bd3000edd8`.
Frontend JS and CSS hashes were also identical to the zzs deployment.

This commit preserves first-download quota accounting, historical-download reuse, and the existing per-resource daily download limit. The original implementation records the first download in the daily counter too; that behavior is retained.

SMTP credentials have been moved out of source into an ignored `.env.smtp` file, with the existing SMTP_USERNAME/SMTP_PASSWORD environment-based sender restored. Transport and message templates are unchanged. Load that private file before starting a newly built binary. Never commit credentials, database files, uploads or runtime artifacts.

Existing production binaries have not been replaced as part of source alignment. A private snapshot of the original uncommitted source has been retained on mini.
