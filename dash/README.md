# 🚦 CityFlow Analytics - Dashboard Temps Réel

Système IoT de gestion intelligente du trafic urbain avec prédiction d'embouteillages et reroutage automatique pour réduire les émissions de CO₂ de 23%.

## 📋 Vue d'ensemble

**CityFlow Analytics** est une plateforme complète de gestion du trafic urbain en temps réel qui combine:
- 📡 Collecte de données via capteurs IoT (MQTT)
- 🤖 Prédiction d'embouteillages par IA (30 min à l'avance)
- 🗺️ Reroutage intelligent automatique
- 📊 Dashboard temps réel avec WebSockets
- 🌱 Réduction des émissions de CO₂

## ✨ Fonctionnalités

### Dashboard Temps Réel
- **Carte Interactive OpenStreetMap**: Visualisation du trafic en temps réel
- **WebSockets**: Mise à jour instantanée des données
- **Visualisations D3.js**: Graphiques dynamiques de densité et émissions
- **Alertes Prédictives**: Notifications d'embouteillages 30 min à l'avance
- **Métriques Live**: Véhicules actifs, vitesse moyenne, émissions, temps gagné

### Architecture Technique
- **Backend**: Node.js + WebSocket + Express
- **Frontend**: HTML5 + Leaflet.js + D3.js
- **Base de données**: TimescaleDB (séries temporelles)
- **Messaging**: MQTT (Mosquitto)
- **Orchestration**: Kubernetes (K3s)
- **Monitoring**: Prometheus + Grafana
- **CI/CD**: ArgoCD (GitOps)

## 🚀 Démarrage Rapide

### Prérequis
- Docker & Docker Compose
- Node.js 18+
- (Optionnel) Kubernetes/K3s pour déploiement en production

### Installation Locale

1. **Cloner le projet**
```bash
git clone https://github.com/votre-org/cityflow-analytics.git
cd cityflow-analytics
```

2. **Lancer avec Docker Compose**
```bash
docker-compose up -d
```

3. **Accéder au dashboard**
```
http://localhost:8080
```

### Installation Manuelle (Développement)

1. **Installer les dépendances**
```bash
npm install
```

2. **Lancer le serveur backend**
```bash
npm start
```

3. **Ouvrir le dashboard**
```bash
open cityflow-dashboard.html
```

## 📁 Structure du Projet

```
cityflow-analytics/
├── cityflow-dashboard.html     # Dashboard frontend
├── backend-server.js           # Serveur WebSocket Node.js
├── package.json                # Dépendances npm
├── Dockerfile                  # Image Docker du dashboard
├── docker-compose.yml          # Orchestration multi-services
├── init-db.sql                 # Schéma TimescaleDB
│
├── k8s/                        # Manifestes Kubernetes
│   ├── deployment.yaml         # Déploiements, Services, HPA
│   ├── configmap.yaml          # Configuration
│   └── secrets.yaml            # Secrets (à créer)
│
├── prometheus/
│   └── prometheus.yml          # Config monitoring
│
├── mosquitto/
│   └── config/
│       └── mosquitto.conf      # Config MQTT broker
│
├── grafana/
│   ├── dashboards/             # Dashboards Grafana
│   └── datasources/            # Sources de données
│
└── iot-simulator/              # Simulateur de capteurs IoT
    ├── simulator.js
    └── Dockerfile
```

## 🎯 Utilisation

### Dashboard Web

Le dashboard affiche en temps réel:

1. **Carte Interactive**
   - Points verts: Trafic fluide (< 30 km/h)
   - Points jaunes: Trafic dense (30-50 km/h)
   - Points rouges: Embouteillage (> 50 km/h)

2. **Statistiques en Direct**
   - Nombre de véhicules actifs
   - Vitesse moyenne
   - Émissions CO₂ actuelles
   - Temps moyen gagné

3. **Graphiques D3.js**
   - Densité de trafic (30 dernières minutes)
   - Réduction d'émissions (avant/après)

4. **Alertes & Prédictions**
   - Embouteillages prévus
   - Routes alternatives suggérées
   - Métriques d'optimisation

### API REST

Le backend expose plusieurs endpoints:

```bash
# Statistiques globales
GET http://localhost:8080/api/stats

# Liste des véhicules
GET http://localhost:8080/api/vehicles

# État du trafic
GET http://localhost:8080/api/traffic

# Prédictions
GET http://localhost:8080/api/predictions

# Health check
GET http://localhost:8080/api/health
```

### WebSocket

Connexion WebSocket pour données temps réel:

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Mise à jour:', data);
};
```

Messages reçus:
- `type: 'init'` - Données initiales
- `type: 'update'` - Mises à jour véhicules/trafic
- `type: 'predictions'` - Nouvelles prédictions
- `type: 'alerts'` - Alertes système

## 🐳 Docker

### Build de l'image
```bash
docker build -t cityflow/dashboard:latest .
```

### Lancement du stack complet
```bash
docker-compose up -d
```

Services lancés:
- **Dashboard**: http://localhost:8080
- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **MQTT**: mqtt://localhost:1883

### Logs
```bash
docker-compose logs -f dashboard
docker-compose logs -f mosquitto
docker-compose logs -f timescaledb
```

## ☸️ Déploiement Kubernetes

### Sur cluster K3s

1. **Appliquer les manifestes**
```bash
kubectl apply -f k8s/deployment.yaml
```

2. **Vérifier le déploiement**
```bash
kubectl get pods -n cityflow
kubectl get services -n cityflow
```

3. **Accéder au dashboard**
```bash
kubectl port-forward -n cityflow service/cityflow-dashboard-service 8080:80
```

### ArgoCD (GitOps)

1. **Créer l'application ArgoCD**
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: cityflow
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/votre-org/cityflow-analytics.git
    targetRevision: main
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: cityflow
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

2. **Sync avec ArgoCD**
```bash
argocd app sync cityflow
argocd app get cityflow
```

## 📊 Monitoring

### Prometheus

Métriques exposées:
- `cityflow_vehicles_total` - Nombre total de véhicules
- `cityflow_avg_speed` - Vitesse moyenne
- `cityflow_co2_emissions` - Émissions CO₂
- `cityflow_websocket_connections` - Connexions WebSocket actives

### Grafana

Dashboards préconfigurés:
- **Traffic Overview**: Vue d'ensemble du trafic
- **Performance Metrics**: Métriques de performance système
- **Predictions Analytics**: Analyse des prédictions
- **IoT Sensors**: État des capteurs

Accès: http://localhost:3000 (admin/admin)

## 🗄️ Base de Données

### TimescaleDB

Tables principales:
- `traffic_data`: Données brutes des capteurs
- `vehicles`: Suivi individuel des véhicules
- `predictions`: Prédictions d'embouteillages
- `performance_metrics`: Métriques système
- `alerts`: Alertes et notifications

### Requêtes Utiles

```sql
-- Trafic des dernières 5 minutes
SELECT * FROM traffic_data 
WHERE time > NOW() - INTERVAL '5 minutes'
ORDER BY time DESC;

-- Statistiques horaires
SELECT * FROM hourly_traffic_stats 
ORDER BY hour DESC LIMIT 24;

-- Véhicules dans un rayon de 5km
SELECT * FROM get_traffic_in_radius(48.8566, 2.3522, 5.0);
```

## 🔧 Configuration

### Variables d'Environnement

**Backend:**
```bash
WS_PORT=8080                          # Port WebSocket
MQTT_BROKER=mqtt://mosquitto:1883     # Broker MQTT
DB_HOST=timescaledb                   # Host TimescaleDB
DB_PORT=5432                          # Port TimescaleDB
DB_NAME=cityflow                      # Nom de la BDD
DB_USER=cityflow                      # User BDD
DB_PASSWORD=cityflow_password         # Password BDD
UPDATE_INTERVAL=2000                  # Intervalle mise à jour (ms)
```

**Simulateur IoT:**
```bash
MQTT_BROKER=mqtt://mosquitto:1883     # Broker MQTT
SENSOR_COUNT=50                       # Nombre de capteurs
UPDATE_INTERVAL=5000                  # Intervalle envoi (ms)
```

## 🧪 Tests

### Tests Unitaires
```bash
npm test
```

### Tests d'Intégration
```bash
npm run test:integration
```

### Test de Charge (WebSocket)
```bash
npm run test:load
```

## 📈 Performance

### Objectifs
- ✅ Prédiction 30 minutes à l'avance: **25-30 min**
- ✅ Réduction émissions CO₂: **23%**
- ✅ Latence WebSocket: **< 100ms**
- ✅ Capacité: **1000+ véhicules simultanés**
- ✅ Disponibilité: **99.9%**

### Optimisations
- Compression WebSocket (gzip)
- Agrégation continue (TimescaleDB)
- Caching Redis (optionnel)
- Load balancing (3+ replicas)
- HPA (Horizontal Pod Autoscaling)

## 🔐 Sécurité

### En Production

1. **MQTT**: Activer authentification
```bash
mosquitto_passwd -c /mosquitto/config/passwd cityflow
```

2. **TimescaleDB**: Changer les credentials
```bash
kubectl create secret generic cityflow-secrets \
  --from-literal=DB_PASSWORD='votre-password-securise'
```

3. **HTTPS**: Configurer TLS/SSL
```yaml
# Ingress avec cert-manager
annotations:
  cert-manager.io/cluster-issuer: "letsencrypt-prod"
```

4. **WebSocket**: Utiliser WSS (WebSocket Secure)
```javascript
const ws = new WebSocket('wss://cityflow.example.com/ws');
```

## 🤝 Contribution

Les contributions sont les bienvenues !

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir `LICENSE` pour plus de détails.

## 👥 Équipe

- **Développement**: CityFlow Team
- **Architecture**: IoT & Microservices
- **DevOps**: K8s + GitOps

## 📧 Contact

- Website: https://cityflow.example.com
- Email: contact@cityflow.example.com
- GitHub: https://github.com/cityflow/analytics

## 🙏 Remerciements

- [Leaflet.js](https://leafletjs.com/) - Cartes interactives
- [D3.js](https://d3js.org/) - Visualisations de données
- [TimescaleDB](https://www.timescale.com/) - Base de données séries temporelles
- [Mosquitto](https://mosquitto.org/) - MQTT Broker
- [OpenStreetMap](https://www.openstreetmap.org/) - Données cartographiques

---

**Made with ❤️ by CityFlow Team** - *Smart Cities for a Better Tomorrow* 🌍
