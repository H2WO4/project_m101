"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wss = exports.server = exports.app = void 0;
const ws_1 = __importDefault(require("ws"));
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const PORT = 8080;
const UPDATE_INTERVAL = 30000;
const PARIS_CENTER = { lat: 48.8566, lng: 2.3522 };
const SENSOR_COUNT = 50;
const app = (0, express_1.default)();
exports.app = app;
const isProduction = __dirname.includes('dist');
const staticPath = isProduction ? path_1.default.join(__dirname, '..') : __dirname;
app.use(express_1.default.static(staticPath));
app.use('/dist', express_1.default.static(path_1.default.join(staticPath, 'dist')));
app.get('/', (_req, res) => {
    res.sendFile(path_1.default.join(staticPath, 'cityflow-dashboard.html'));
});
const server = http_1.default.createServer(app);
exports.server = server;
const wss = new ws_1.default.Server({ server });
exports.wss = wss;
let vehicles = [];
let stats = {
    totalVehicles: 0,
    avgSpeed: 0,
    emissions: 0,
    emissionsReduction: 0,
    timeSaved: 0,
    timestamp: new Date().toISOString()
};
class Vehicle {
    constructor(id) {
        this.id = id;
        this.lat = PARIS_CENTER.lat + (Math.random() - 0.5) * 0.05;
        this.lng = PARIS_CENTER.lng + (Math.random() - 0.5) * 0.05;
        this.speed = 20 + Math.random() * 60;
        this.direction = Math.random() * 360;
        this.status = this.getStatus();
    }
    getStatus() {
        if (this.speed < 30)
            return 'fluide';
        if (this.speed < 50)
            return 'dense';
        return 'embouteillage';
    }
    update() {
        const moveSpeed = 0.0001 * (this.speed / 50);
        const radians = (this.direction * Math.PI) / 180;
        this.lat += Math.cos(radians) * moveSpeed;
        this.lng += Math.sin(radians) * moveSpeed;
        this.speed += (Math.random() - 0.5) * 5;
        this.speed = Math.max(5, Math.min(80, this.speed));
        if (Math.random() > 0.95) {
            this.direction += (Math.random() - 0.5) * 90;
        }
        this.status = this.getStatus();
        if (Math.abs(this.lat - PARIS_CENTER.lat) > 0.025) {
            this.direction = 180 - this.direction;
        }
        if (Math.abs(this.lng - PARIS_CENTER.lng) > 0.025) {
            this.direction = -this.direction;
        }
    }
    getDirectionName() {
        let dir = this.direction % 360;
        if (dir < 0)
            dir += 360;
        if (dir >= 337.5 || dir < 22.5)
            return '↑ N';
        if (dir >= 22.5 && dir < 67.5)
            return '↗ NE';
        if (dir >= 67.5 && dir < 112.5)
            return '→ E';
        if (dir >= 112.5 && dir < 157.5)
            return '↘ SE';
        if (dir >= 157.5 && dir < 202.5)
            return '↓ S';
        if (dir >= 202.5 && dir < 247.5)
            return '↙ SO';
        if (dir >= 247.5 && dir < 292.5)
            return '← O';
        return '↖ NO';
    }
    toJSON() {
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
function initVehicles() {
    vehicles = [];
    for (let i = 0; i < 50; i++) {
        vehicles.push(new Vehicle(i));
    }
}
function generateTrafficSegments() {
    const segments = [];
    const routes = [
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
function calculateStats() {
    const totalVehicles = vehicles.length;
    const avgSpeed = vehicles.reduce((sum, v) => sum + v.speed, 0) / totalVehicles;
    const baseEmissions = 2500;
    const speedFactor = avgSpeed / 50;
    const emissions = baseEmissions * (2 - speedFactor);
    const emissionsReduction = baseEmissions * 0.23;
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
function generatePredictions() {
    const predictions = [];
    const now = new Date();
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
function generateAlerts() {
    const alerts = [];
    const types = ['congestion', 'accident', 'roadwork', 'reroute', 'optimization'];
    const messages = {
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
wss.on('connection', (ws) => {
    console.log('✅ Nouveau client connecté');
    ws.send(JSON.stringify({
        type: 'init',
        data: {
            vehicles: vehicles.map(v => v.toJSON()),
            trafficSegments: generateTrafficSegments(),
            stats: calculateStats(),
            predictions: generatePredictions()
        }
    }));
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            console.log('📨 Message reçu:', data);
            if (data.type === 'request_update') {
                sendUpdate(ws);
            }
        }
        catch (error) {
            console.error('❌ Erreur parsing message:', error);
        }
    });
    ws.on('close', () => {
        console.log('❌ Client déconnecté');
    });
    ws.on('error', (error) => {
        console.error('❌ WebSocket erreur:', error);
    });
});
function sendUpdate(ws) {
    if (ws.readyState === ws_1.default.OPEN) {
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
function broadcast(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.default.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}
function simulationLoop() {
    vehicles.forEach(v => v.update());
    if (Math.random() > 0.85 && vehicles.length < 100) {
        vehicles.push(new Vehicle(vehicles.length));
    }
    else if (Math.random() > 0.95 && vehicles.length > 30) {
        vehicles.pop();
    }
    const newStats = calculateStats();
    const newSegments = generateTrafficSegments();
    const newPredictions = generatePredictions();
    const newAlerts = generateAlerts();
    broadcast({
        type: 'update',
        data: {
            vehicles: vehicles.map(v => v.toJSON()),
            trafficSegments: newSegments,
            stats: newStats,
            timestamp: new Date().toISOString()
        }
    });
    if (newPredictions.length > 0) {
        broadcast({
            type: 'predictions',
            data: newPredictions
        });
    }
    if (newAlerts.length > 0) {
        broadcast({
            type: 'alerts',
            data: newAlerts
        });
    }
}
function simulateMQTTMessages() {
    setInterval(() => {
        const sensorData = {
            sensorId: Math.floor(Math.random() * SENSOR_COUNT),
            location: {
                lat: PARIS_CENTER.lat + (Math.random() - 0.5) * 0.05,
                lng: PARIS_CENTER.lng + (Math.random() - 0.5) * 0.05
            },
            vehicleCount: Math.floor(Math.random() * 50),
            avgSpeed: 20 + Math.random() * 60,
            timestamp: new Date().toISOString()
        };
        console.log(`📡 Capteur #${sensorData.sensorId}: ${sensorData.vehicleCount} véhicules @ ${sensorData.avgSpeed.toFixed(1)} km/h`);
    }, 5000);
}
app.get('/api/stats', (_req, res) => {
    res.json(calculateStats());
});
app.get('/api/vehicles', (_req, res) => {
    res.json(vehicles.map(v => v.toJSON()));
});
app.get('/api/traffic', (_req, res) => {
    res.json(generateTrafficSegments());
});
app.get('/api/predictions', (_req, res) => {
    res.json(generatePredictions());
});
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        connections: wss.clients.size,
        vehicles: vehicles.length,
        timestamp: new Date().toISOString()
    });
});
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
    initVehicles();
    setInterval(simulationLoop, UPDATE_INTERVAL);
    simulateMQTTMessages();
});
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du serveur...');
    wss.clients.forEach(client => client.close());
    server.close(() => {
        console.log('✅ Serveur arrêté proprement');
        process.exit(0);
    });
});
//# sourceMappingURL=backend-server.js.map