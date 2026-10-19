# Security model

Threat-by-threat breakdown of how SMTH Music protects itself.

## Authentication & sessions

- Passwords are hashed with **scrypt** (Werkzeug's implementation,
  salt + stretching).
- Session tokens are 256-bit CSPRNG values; only their **SHA-256
  hash** is stored in the database, so a database leak does not
  hand over live sessions.
- Cookies are `HttpOnly`, `SameSite=Lax`; `Secure` is opt-in
  (`SMTH_SECURE_COOKIES=1`) for deployments behind TLS.
- Sessions expire after 30 days and can be revoked individually
  from *Account → Security*.
- The **first account** created is automatically the administrator
  — bootstrap trust without default passwords.

## Injection

- Every SQL statement is a parameterized query (`sqlite3` `?`
  placeholders). No f-string SQL anywhere.
- Track folder names are generated server-side from a strict
  `[a-z0-9-]` slug; user input never becomes a filesystem path.

## Cross-site

- **CSRF**: every state-changing request must carry a per-session
  token (form field or `X-CSRF-Token` header), compared with
  `hmac.compare_digest`.
- **XSS**: Jinja auto-escapes everything; the CSP forbids inline
  scripts (`script-src 'self'`).

## Uploads

- `.mp3` extension **and** magic-byte validation (ID3 tag or MPEG
  frame sync word `0xFF Ex`).
- Size capped (`SMTH_MAX_UPLOAD_MB`, default 50; Flask enforces a
  hard `MAX_CONTENT_LENGTH`).
- Files are served through a controller that checks moderation
  status — never exposed as static files.
- Only admins can move a track from `pending` to `approved`.

## Abuse resistance

- Per-IP login throttling (6 attempts / 5 min).
- Per-user upload throttling (10 uploads / hour).
- Global per-IP request limiter.

## Headers

```
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
X-Robots-Tag: noindex, nofollow
```

## Audit trail

Registrations, logins, uploads, moderation decisions, admin
changes and setting updates are appended to `audit_log` with the
acting user and IP address, viewable in the admin console.

## Scope note

This is a **local application**. It is hardened against the usual
web vulnerabilities, but it is not a hardened public service: run
it behind a reverse proxy with TLS if you expose it, and keep the
host OS patched.
