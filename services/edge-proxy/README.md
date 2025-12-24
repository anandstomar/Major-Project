# Edge Proxy (Envoy)

Single ingress gateway for the supply-chain platform.

## Routes
| Path | Service |
|----|----|
| /api/ingest | ingest-service |
| /api/query | query-service |
| /graphql | query-service |
| /api/notify | notification-service |

## Run (Docker)
docker build -t edge-proxy .
docker run -p 8085:80805 edge-proxy
