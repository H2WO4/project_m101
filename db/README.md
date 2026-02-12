## Prérequis
- Docker installé

### 1) Créer un fichier `docker-compose.yml`
```yaml
services:
  postgres:
    image: postgres:16
    container_name: postgres_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: apppass
      POSTGRES_DB: appdb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```
## Démarrer
```yaml
docker compose up -d
```

## Vérifier que ça tourne
```yaml
docker ps
```
