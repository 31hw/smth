# Security policy

## Reporting a vulnerability

This is a local application, but if you find something worrying:

1. Do **not** open a public issue.
2. Describe it in a private message to the maintainer.
3. Allow reasonable time for a fix before disclosure.

## In scope

- Authentication & session handling
- Upload validation and storage
- SQL construction and input handling
- Headers and CSRF protection

## Out of scope

- Physical access to the machine (the DB is local by design)
- Compromised admin accounts (admins can do anything by design)

## Hardening checklist

See [docs/security.md](docs/security.md) for the full model.
Short version: scrypt hashing, parameterized SQL, CSRF tokens,
magic-byte upload validation, rate limiting, strict CSP, and a
complete audit log.
