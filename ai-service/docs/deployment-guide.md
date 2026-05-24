# Production Deployment Guide

This guide describes how to configure, validate, and deploy the hardened AI Assessment Maker orchestration backend.

---

## 1. Environment Configurations

Before launching the service, configure the following environment variables in `ai-service/.env`.

| Key | Type | Default | Description / Value |
| :--- | :--- | :--- | :--- |
| `GROQ_API_KEY` | String | *Required* | API key for the primary Groq provider. |
| `GEMINI_API_KEY` | String | *Required* | API key for the Gemini fallback provider. |
| `CACHE_ENABLED` | Boolean | `true` | Set to `true` to enable caching, `false` to disable it completely. |
| `AI_SERVICE_TOKEN` | String | *Optional* | If set, incoming request headers must match `X-Internal-Service-Token`. |
| `PORT` | Integer | `8000` | Port for the FastAPI server to bind to. |

---

## 2. Startup Validation (Fail-Fast Checks)

The service implements strict startup checks in `server.py` to prevent partially initialized deployments.

On launch, the server checks:
1. **API Keys**: Verifies both `GROQ_API_KEY` and `GEMINI_API_KEY` are populated in the environment. If either is missing, a `RuntimeError` is raised, causing the startup process to immediately crash with a critical log message.
2. **Directory Structures**: Checks if the required directories `output/` and `templates/` exist. If missing, it automatically creates them.
3. **Template Validation**: Verifies that standard templates are present in the `templates/` folder.

If any validation check fails, the deployment container or Uvicorn process fails to boot, ensuring that broken environments are caught immediately in the deployment pipeline.

---

## 3. Deployment Configuration

### 3.1 Dockerized Environments
Ensure the `Dockerfile` exposes port `8000` and passes environment variables down securely (never hardcode keys in the Dockerfile).

Example build and run commands:
```bash
docker build -t ai-service -f Dockerfile.ai-service .
docker run -p 8000:8000 --env-file .env ai-service
```

### 3.2 Production Server Execution (Uvicorn)
To run the server in a high-concurrency production setting, start Uvicorn with multiple workers and limit request timeout:
```bash
uvicorn server:app --host 0.0.0.0 --port 8000 --workers 4 --timeout-keep-alive 65
```

---

## 4. Monitoring & Maintenance

### Uptime and Health
- Query `/health` periodically for uptime stats and general system health.
- Query `/providers/health` to monitor if the primary provider is degraded or if the circuit breaker has tripped.
- Query `/providers/stats` to aggregate metrics on success rates, average latencies, fallback frequencies, cache hit ratios, and timeout events.
