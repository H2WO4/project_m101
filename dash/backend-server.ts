// CityFlow Analytics - WebSocket Server Backend
// Node.js + WebSocket pour données temps réel - TypeScript Version

import WebSocket from 'ws';
import http from 'http';
import express, { Request, Response } from 'express';
import path from 'path';

// =========================
// TYPES & INTERFACES
// =========================

interface Coordinates {
    lat: number;
    lng: number;
}

interface VehicleData {
    id: number;
    lat: number;
    lng: number;
    speed: number;
    status: VehicleStatus;
    direction: number;
    directionName: string;
}

interface Route {
    name: string;
    start: [number, number];
    end: [number, number];
}

interface TrafficSegment {
    id: number;
    name: string;
    coordinates: [number, number][];
    density: number;
    avgSpeed: number;
    vehicleCount: number;
    status: VehicleStatus;
    color: string;
}

interface Stats {
    totalVehicles: number;
    avgSpeed: number;
    emissions: number;
    emissionsReduction: number;
    timeSaved: number;
    timestamp: string;
}

interface Prediction {
    type: 'congestion' | 'clear';
    severity?: 'high' | 'medium';
    location: string;
    coordinates: [number, number];
    predictedTime: string;
    minutesAhead: number;
    confidence: number;
    affectedVehicles?: number;
}

interface Alert {
    id: number;
    type: AlertType;
    severity: 'high' | 'medium' | 'low';
    message: string;
    timestamp: string;
}

interface SensorData {
    sensorId: number;
    location: Coordinates;
    vehicleCount: number;
    avgSpeed: number;
    timestamp: string;
}

interface WebSocketMessage {
    type: string;
    data?: any;
}

type VehicleStatus = 'fluide' | 'dense' | 'embouteillage';
type AlertType = 'congestion' | 'accident' | 'roadwork' | 'reroute' | 'optimization';

// =========================
// CONFIGURATION
// =========================

const PORT: number = 8080;
const UPDATE_INTERVAL: number = 30000; // Mise à jour toutes les 30 secondes

// Simulation de capteurs IoT
const PARIS_CENTER: Coordinates = { lat: 48.8566, lng: 2.3522 };
const SENSOR_COUNT: number = 50;

// =========================
// EXPRESS & WEBSOCKET SETUP
// =========================

// Express app pour servir le dashboard
const app = express();

// Servir les fichiers statiques (CSS, JS, etc.)
// En dev: __dirname pointe vers la racine du projet
// En prod: __dirname pointe vers dist/
const isProduction = __dirname.includes('dist');
const staticPath = isProduction ? path.join(__dirname, '..') : __dirname;

app.use(express.static(staticPath));
app.use('/dist', express.static(path.join(staticPath, 'dist')));

// Servir le dashboard principal
app.get('/', (_req: Request, res: Response) => {
    res.sendFile(path.join(staticPath, 'cityflow-dashboard.html'));
});

// Créer serveur HTTP
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server });

// =========================
// STOCKAGE DES DONNÉES
// =========================

let vehicles: Vehicle[] = [];
let stats: Stats = {
    totalVehicles: 0,
    avgSpeed: 0,
    emissions: 0,
    emissionsReduction: 0,
    timeSaved: 0,
    timestamp: new Date().toISOString()
};

// =========================
// CLASSE VEHICLE
// =========================

class Vehicle {
    id: number;
    lat: number;
    lng: number;
    speed: number;
    direction: number;
    status: VehicleStatus;

    constructor(id: number) {
        this.id = id;
        this.lat = PARIS_CENTER.lat + (Math.random() - 0.5) * 0.05;
        this.lng = PARIS_CENTER.lng + (Math.random() - 0.5) * 0.05;
        this.speed = 20 + Math.random() * 60;
        this.direction = Math.random() * 360;
        this.status = this.getStatus();
    }

    getStatus(): VehicleStatus {
        if (this.speed < 30) return 'fluide';
        if (this.speed < 50) return 'dense';
        return 'embouteillage';
    }

    update(): void {
        // Déplacement aléatoire
        const moveSpeed = 0.0001 * (this.speed / 50);
        const radians = (this.direction * Math.PI) / 180;
        
        this.lat += Math.cos(radians) * moveSpeed;
        this.lng += Math.sin(radians) * moveSpeed;
        
        // Variation de vitesse
        this.speed += (Math.random() - 0.5) * 5;
        this.speed = Math.max(5, Math.min(80, this.speed));
        
        // Changement de direction occasionnel
        if (Math.random() > 0.95) {
            this.direction += (Math.random() - 0.5) * 90;
        }
        
        this.status = this.getStatus();
        
        // Rebond aux limites
        if (Math.abs(this.lat - PARIS_CENTER.lat) > 0.025) {
            this.direction = 180 - this.direction;
        }
        if (Math.abs(this.lng - PARIS_CENTER.lng) > 0.025) {
            this.direction = -this.direction;
        }
    }

    getDirectionName(): string {
        let dir = this.direction % 360;
        if (dir < 0) dir += 360;
        if (dir >= 337.5 || dir < 22.5) return '↑ N';
        if (dir >= 22.5 && dir < 67.5) return '↗ NE';
        if (dir >= 67.5 && dir < 112.5) return '→ E';
        if (dir >= 112.5 && dir < 157.5) return '↘ SE';
        if (dir >= 157.5 && dir < 202.5) return '↓ S';
        if (dir >= 202.5 && dir < 247.5) return '↙ SO';
        if (dir >= 247.5 && dir < 292.5) return '← O';
        return '↖ NO';
    }

    toJSON(): VehicleData {
        return {
            id: this.id,
            lat: this.lat,
            lng: this.lng,
            speed: Math.round(this.speed * 10) / 10,
            status: this.status,
            direction: Math.round(this.direction),
            directionName: this.getDirectionName()
        };
    }
}

// =========================
// FONCTIONS DE SIMULATION
// =========================

// Initialisation des véhicules
function initVehicles(): void {
    vehicles = [];
    for (let i = 0; i < 50; i++) {
        vehicles.push(new Vehicle(i));
    }
}

// Génération de segments de trafic
function generateTrafficSegments(): TrafficSegment[] {
    const segments: TrafficSegment[] = [];
    const routes: Route[] = [
        { name: 'Rue de Rivoli', start: [48.8606, 2.3376], end: [48.8566, 2.3522] },
        { name: 'Champs-Élysées', start: [48.8698, 2.3075], end: [48.8738, 2.2950] },
        { name: 'Boulevard Haussmann', start: [48.8738, 2.3329], end: [48.8698, 2.3488] },
        { name: 'Rue Lafayette', start: [48.8755, 2.3487], end: [48.8796, 2.3543] },
    ];

    routes.forEach((route, idx) => {
        const density = 20 + Math.random() * 70;
        const avgSpeed = 80 - density * 0.8;
        
        segments.push({
            id: idx,
            name: route.name,
            coordinates: [route.start, route.end],
            density: Math.round(density),
            avgSpeed: Math.round(avgSpeed * 10) / 10,
            vehicleCount: Math.floor(density / 5),
            status: avgSpeed < 30 ? 'embouteillage' : avgSpeed < 50 ? 'dense' : 'fluide',
            color: avgSpeed < 30 ? '#ef4444' : avgSpeed < 50 ? '#fbbf24' : '#22c55e'
        });
    });

    return segments;
}

// Calcul des statistiques globales
function calculateStats(): Stats {
    const totalVehicles = vehicles.length;
    const avgSpeed = vehicles.reduce((sum, v) => sum + v.speed, 0) / totalVehicles;
    
    // Calcul des émissions (simplifié)
    const baseEmissions = 2500;
    const speedFactor = avgSpeed / 50; // Optimal à 50 km/h
    const emissions = baseEmissions * (2 - speedFactor);
    
    // Réduction grâce au reroutage (23% objectif)
    const emissionsReduction = baseEmissions * 0.23;
    
    // Temps gagné
    const timeSaved = 5 + Math.random() * 8;

    stats = {
        totalVehicles,
        avgSpeed: Math.round(avgSpeed * 10) / 10,
        emissions: Math.round(emissions - emissionsReduction),
        emissionsReduction: Math.round((emissionsReduction / baseEmissions) * 100),
        timeSaved: Math.round(timeSaved * 10) / 10,
        timestamp: new Date().toISOString()
    };

    return stats;
}

// Génération de prédictions
function generatePredictions(): Prediction[] {
    const predictions: Prediction[] = [];
    const now = new Date();
    
    // Prédictions d'embouteillage
    if (Math.random() > 0.3) {
        predictions.push({
            type: 'congestion',
            severity: Math.random() > 0.5 ? 'high' : 'medium',
            location: 'Rue de Rivoli',
            coordinates: [48.8606, 2.3376],
            predictedTime: new Date(now.getTime() + 25 * 60000).toISOString(),
            minutesAhead: 25,
            confidence: 0.85 + Math.random() * 0.1,
            affectedVehicles: Math.floor(30 + Math.random() * 50)
        });
    }

    // Prédictions de zones fluides
    if (Math.random() > 0.5) {
        predictions.push({
            type: 'clear',
            location: 'Boulevard Périphérique',
            coordinates: [48.8798, 2.3765],
            predictedTime: new Date(now.getTime() + 15 * 60000).toISOString(),
            minutesAhead: 15,
            confidence: 0.92
        });
    }

    return predictions;
}

// Génération d'alertes
function generateAlerts(): Alert[] {
    const alerts: Alert[] = [];
    const types: AlertType[] = ['congestion', 'accident', 'roadwork', 'reroute', 'optimization'];
    const messages: Record<AlertType, string[]> = {
        congestion: [
            'Embouteillage détecté sur Boulevard Haussmann',
            'Trafic dense sur Champs-Élysées',
            'Congestion croissante Rue de Rivoli'
        ],
        accident: [
            'Accident signalé Avenue Foch',
            'Incident mineur Place de la Concorde',
            'Véhicule en panne Pont Neuf'
        ],
        roadwork: [
            'Travaux programmés Rue du Louvre',
            'Maintenance voirie Boulevard Saint-Germain'
        ],
        reroute: [
            'Route alternative proposée: -12 minutes',
            'Optimisation itinéraire: gain de 8 minutes',
            'Nouveau trajet suggéré via Quai de la Seine'
        ],
        optimization: [
            'Réduction d\'émissions: objectif 23% atteint',
            'Efficacité du trafic: +15% ce mois',
            'Temps d\'attente moyen réduit de 7 minutes'
        ]
    };

    if (Math.random() > 0.7) {
        const type = types[Math.floor(Math.random() * types.length)];
        const messageList = messages[type];
        const message = messageList[Math.floor(Math.random() * messageList.length)];
        
        alerts.push({
            id: Date.now(),
            type,
            severity: type === 'accident' ? 'high' : type === 'congestion' ? 'medium' : 'low',
            message,
            timestamp: new Date().toISOString()
        });
    }

    return alerts;
}

// =========================
// WEBSOCKET MANAGEMENT
// =========================

// Connexion d'un nouveau client
wss.on('connection', (ws: WebSocket) => {
    console.log('✅ Nouveau client connecté');
    
    // Envoyer les données initiales
    ws.send(JSON.stringify({
        type: 'init',
        data: {
            vehicles: vehicles.map(v => v.toJSON()),
            trafficSegments: generateTrafficSegments(),
            stats: calculateStats(),
            predictions: generatePredictions()
        }
    }));

    // Gérer les messages du client
    ws.on('message', (message: WebSocket.Data) => {
        try {
            const data: WebSocketMessage = JSON.parse(message.toString());
            console.log('📨 Message reçu:', data);
            
            // Traiter les requêtes du client
            if (data.type === 'request_update') {
                sendUpdate(ws);
            }
        } catch (error) {
            console.error('❌ Erreur parsing message:', error);
        }
    });

    ws.on('close', () => {
        console.log('❌ Client déconnecté');
    });

    ws.on('error', (error: Error) => {
        console.error('❌ WebSocket erreur:', error);
    });
});

// Envoyer une mise à jour à un client
function sendUpdate(ws: WebSocket): void {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'update',
            data: {
                vehicles: vehicles.map(v => v.toJSON()),
                trafficSegments: generateTrafficSegments(),
                stats: calculateStats(),
                timestamp: new Date().toISOString()
            }
        }));
    }
}

// Diffuser à tous les clients
function broadcast(data: WebSocketMessage): void {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// =========================
// SIMULATION LOOP
// =========================

function simulationLoop(): void {
    // Mise à jour des véhicules
    vehicles.forEach(v => v.update());
    
    // Ajout/suppression dynamique de véhicules pour varier le nombre
    if (Math.random() > 0.85 && vehicles.length < 100) {
        // Ajouter un véhicule
        vehicles.push(new Vehicle(vehicles.length));
    } else if (Math.random() > 0.95 && vehicles.length > 30) {
        // Retirer un véhicule
        vehicles.pop();
    }
    
    // Calcul des nouvelles données
    const newStats = calculateStats();
    const newSegments = generateTrafficSegments();
    const newPredictions = generatePredictions();
    const newAlerts = generateAlerts();

    // Diffuser les mises à jour
    broadcast({
        type: 'update',
        data: {
            vehicles: vehicles.map(v => v.toJSON()),
            trafficSegments: newSegments,
            stats: newStats,
            timestamp: new Date().toISOString()
        }
    });

    // Envoyer les prédictions
    if (newPredictions.length > 0) {
        broadcast({
            type: 'predictions',
            data: newPredictions
        });
    }

    // Envoyer les alertes
    if (newAlerts.length > 0) {
        broadcast({
            type: 'alerts',
            data: newAlerts
        });
    }
}

// =========================
// MQTT SIMULATION
// =========================

// Simuler la réception de messages MQTT des capteurs
function simulateMQTTMessages(): void {
    // Dans un vrai système, on recevrait des messages via MQTT
    // Exemple: mqtt.on('message', (topic, message) => { ... })
    
    setInterval(() => {
        const sensorData: SensorData = {
            sensorId: Math.floor(Math.random() * SENSOR_COUNT),
            location: {
                lat: PARIS_CENTER.lat + (Math.random() - 0.5) * 0.05,
                lng: PARIS_CENTER.lng + (Math.random() - 0.5) * 0.05
            },
            vehicleCount: Math.floor(Math.random() * 50),
            avgSpeed: 20 + Math.random() * 60,
            timestamp: new Date().toISOString()
        };

        // Traiter les données du capteur
        console.log(`📡 Capteur #${sensorData.sensorId}: ${sensorData.vehicleCount} véhicules @ ${sensorData.avgSpeed.toFixed(1)} km/h`);
    }, 5000);
}

// =========================
// API REST
// =========================

app.get('/api/stats', (_req: Request, res: Response) => {
    res.json(calculateStats());
});

app.get('/api/vehicles', (_req: Request, res: Response) => {
    res.json(vehicles.map(v => v.toJSON()));
});

app.get('/api/traffic', (_req: Request, res: Response) => {
    res.json(generateTrafficSegments());
});

app.get('/api/predictions', (_req: Request, res: Response) => {
    res.json(generatePredictions());
});

app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        connections: wss.clients.size,
        vehicles: vehicles.length,
        timestamp: new Date().toISOString()
    });
});

// =========================
// DÉMARRAGE DU SERVEUR
// =========================

server.listen(PORT, () => {
    console.log(`
🚦 ====================================
   CityFlow Analytics - Backend Server
   ====================================
   
   📡 WebSocket Server: ws://localhost:${PORT}/ws
   🌐 HTTP Server: http://localhost:${PORT}
   📊 API Health: http://localhost:${PORT}/api/health
   
   ✅ Serveur démarré avec succès!
   📍 Simulation: Paris (${vehicles.length} véhicules)
   🔄 Mise à jour: toutes les ${UPDATE_INTERVAL}ms
    `);

    // Initialiser la simulation
    initVehicles();
    
    // Démarrer la boucle de simulation
    setInterval(simulationLoop, UPDATE_INTERVAL);
    
    // Démarrer la simulation MQTT
    simulateMQTTMessages();
});

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du serveur...');
    wss.clients.forEach(client => client.close());
    server.close(() => {
        console.log('✅ Serveur arrêté proprement');
        process.exit(0);
    });
});

export { app, server, wss };
