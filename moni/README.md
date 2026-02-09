#  Monitoring simple avec Prometheus et Grafana (Docker)

Stack de monitoring minimale prête à l’emploi :

- **Prometheus** → collecte des métriques
- **Grafana** → visualisation des métriques

---

##  Prérequis

- Docker
- Docker Compose

Vérification :


docker --version
docker compose version


---

## Structure du projet


`moni/`
- `docker-compose.yml`
- `prometheus/`
  - `prometheus.yml`


---


##  Lancer la stack

Dans le dossier `moni` :


docker compose up -d

Vérifier que les conteneurs tournent :


docker ps


---

##  Accès aux interfaces

| Service     | URL                   | Identifiants      |
|-------------|-----------------------|-------------------|
| Prometheus  | http://localhost:9090 | —                 |
| Grafana     | http://localhost:3000 | admin / admin     |

Au premier démarrage, Grafana demandera de changer le mot de passe.

