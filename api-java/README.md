This is a minimal Spring Boot backend that exposes POST /api/search and queries Elasticsearch.

Build with Docker Compose (repo root):

```bash
docker compose up --build
```

The service reads `ES_URL` from environment; docker-compose sets that to `http://elasticsearch:9200`.
