# Contributing

Thanks for wanting to help! This is a personal local-first project,
so keep changes small and focused.

## Setup

```bash
python -m pip install -r requirements-dev.txt
make test
```

## Conventions

- Python: PEP 8, type hints on new functions, docstrings on modules.
- SQL: **always** bound parameters — never f-strings.
- Templates: Jinja auto-escaping is on; do not disable it.
- JS: plain ES2020, no build step, no external CDNs (offline first).
- Every user-facing string stays in templates; every state change
  goes through the audit log.

## Pull request checklist

- [ ] Tests added or updated (`make test`)
- [ ] `make lint` clean
- [ ] Docs touched if behaviour changed
