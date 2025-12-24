# Auth Service (NestJS)

This service validates OIDC/JWT issued by Keycloak and exposes a few auth endpoints.

## Required env vars

- `PORT` (default `8090`)
- `KEYCLOAK_ISSUER` (e.g. `http://localhost:8080/realms/provenance`)
- `KEYCLOAK_AUDIENCE` (client id expected in `aud` claim)
- `KEYCLOAK_JWKS_URI` (optional, falls back to `${KEYCLOAK_ISSUER}/protocol/openid-connect/certs`)

## Run locally

Install deps:
```bash
cd services/auth
npm install
