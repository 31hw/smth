# API reference

Base URL: `http://localhost:5000`

## Public

| Method | Endpoint            | Description                     |
| ------ | ------------------- | ------------------------------- |
| GET    | `/`                 | Home page (HTML)                |
| GET    | `/api/tracks`       | Approved tracks (JSON)          |
| GET    | `/api/tracks/<slug>`| Single approved track           |
| GET    | `/music/<slug>/stream` | Audio stream (Range-aware)   |

Query params for `/api/tracks`: `q` (search), `genre`.

## Auth

| Method | Endpoint   | Body (form)                              |
| ------ | ---------- | ---------------------------------------- |
| GET    | `/register`| —                                        |
| POST   | `/register`| `username`, `password`, `confirm_password`, `csrf_token` |
| GET    | `/login`   | —                                        |
| POST   | `/login`   | `username`, `password`, `csrf_token`     |
| POST   | `/logout`  | `csrf_token`                             |

## Account (auth required)

| Method | Endpoint              | Description              |
| ------ | --------------------- | ------------------------ |
| GET    | `/account?tab=`       | Account page             |
| POST   | `/api/upload`         | Upload an MP3 (multipart)|
| POST   | `/api/tracks/<slug>/delete` | Delete own upload   |
| POST   | `/api/account/password`   | Change password      |
| POST   | `/api/account/delete`     | Delete account         |
| POST   | `/api/sessions/<hash>/revoke` | Revoke a session  |

## Admin (admin required)

| Method | Endpoint                        | Description            |
| ------ | ------------------------------- | ---------------------- |
| GET    | `/admin`                        | Console (HTML)         |
| GET    | `/api/admin/stats`              | Queue counters         |
| POST   | `/api/admin/moderate`           | `slug`, `action`, `reason`, `csrf_token` |
| POST   | `/api/admin/tracks/<slug>/delete` | Remove any track    |
| POST   | `/api/admin/users/<id>/toggle-admin` | Promote/demote   |
| POST   | `/api/admin/settings`           | `registration_open`    |
| POST   | `/api/admin/sessions/<hash>/revoke` | Kill a session    |

## Errors

| Code | Meaning                                        |
| ---- | ---------------------------------------------- |
| 400  | Bad request / CSRF failure / validation error  |
| 401  | Not authenticated                              |
| 403  | Not enough privileges / registration disabled  |
| 404  | Not found (or hidden until approved)           |
| 413  | Upload too large                               |
| 429  | Rate limited                                   |
