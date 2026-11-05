# Cramameleon integration

The running source baseline is recorded in RUNTIME_BASELINE.md. This integration adds `/cramameleon`, a learning overview, and a narrow API under `/api/integrations/cramameleon`. It is disabled unless both CRAMAMELEON_APP_URL and CRAMAMELEON_CLIENT_SECRET are configured. See `.env.cramameleon.example`; use an ignored mode-0600 `.env.cramameleon` file. Never reuse the site's JWT secret.

Authorization uses the existing login, an exact callback address, short single-use codes, S256 PKCE and backend client authentication. Access credentials are opaque, stored hashed, user-bound, revocable and valid for eight hours. Codes, credentials and authorization headers must not enter access logs. Signed-in users continue automatically with their current account. The detail page submits directly to the app with the selected material or package and authorizes automatic import.

Metadata search, package catalogs, and content reads use a valid scoped integration credential. Cramameleon reads do not use download quota or write download records. The legacy access endpoints still issue short-lived idempotent receipts for compatibility. Ordinary site downloads use their existing quota policy.

Only database-selected regular files inside the legacy data directory are readable. ZIP directory size, entry count and selected member size are bounded. Selected members must belong to the package; traversal, symlinks, duplicates, encryption and unsupported formats are rejected before admission. Single-file imports are limited to 20 MiB; supported formats are TXT, Markdown, PDF, DOCX and PPTX. No extraction directory or public preview/download URL is used by the integration.

Before deployment, take a consistent SQLite backup. New integration tables are additive. On rollback restore the previous binary, frontend and configuration, retaining the live database and its download accounting. Preserve JWT_SECRET and source private SMTP configuration when starting the new binary so existing logins and mail continue to work.

Validation: `cd backend && go test ./... && go vet ./...`; `cd frontend && npm ci && npm run build`. Integration tests use temporary databases and fixture files; they do not consume production user quotas.
