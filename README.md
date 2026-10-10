# smth revival

A localhost-first revival using the copied ZekoroV2 frontend with a small, seedless local API.

## Current capabilities

- ZekoroV2 page layouts and copied sources are retained; avatar behavior is integrated through the existing editor component instead of a bespoke redesign. `/admin` is the new feature route required by the existing staff navigation.
- A fresh database contains no seeded/demo users or content. The first account registered gets ID `1` and is treated as the local owner with wildcard permissions. Later users are regular members.
- Avatar settings (body colors, scale, rig type, and worn asset metadata) and saved outfits persist per user. The Avatar Editor uses **RoAvatar-Renderer** with the local avatar model; Roblox-hosted renderer assets are loaded on demand. No RCCService is used.
- `/admin` → **Web** → **Icons** lists public web images and lets administrators replace an existing image. Uploads are normalized to the target file format, preserving the existing URL while keeping the on-disk bytes, extension, and MIME type consistent (for example, a JPEG upload replacing a `.png` is converted to PNG).
- The default connection mode is localhost. Set `REVIVAL_CONNECTION_MODE` in `frontend/.env.local` to `localhost` or `tunnel`; the tunnel transport is reserved and intentionally not enabled in this initial release, so only localhost is supported. The API binds only to loopback.

## Requirements

- Node.js `>=22.5.0` (the backend uses the built-in `node:sqlite` module).

## Run locally

```sh
npm install --prefix frontend
npm run dev
```

On first launch, the root dev script creates `frontend/.env.local`, starts the API on `127.0.0.1:3001`, and starts Next.js on `127.0.0.1:3000`. The API is loopback-only; do not expose its port directly to the network. The `PREVIEW=1` option binds only the frontend to `0.0.0.0` for an isolated proxied preview; API requests still pass through the frontend proxy.

If you need to regenerate local settings, stop the server and remove `frontend/.env.local` first. The generated file is ignored by Git.

## Checks

```sh
npm run test:api
npm run build:web
```

The API tests use in-memory SQLite, so they do not create users in the local database. Tests cover empty database/owner permissions, avatar settings and BrickColor palette persistence, and image-format conversion for icon uploads.

## Frontend attribution

The frontend subtree is copied from [Blue7366/ZekoroV2](https://github.com/Blue7366/ZekoroV2), commit `5497af160daac6b913e5a28c3b09ee3b9f9cd178`, under its included MIT license (`frontend/LICENSE`).
