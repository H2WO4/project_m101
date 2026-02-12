// CityFlow Analytics - Dashboard Client
// TypeScript WebSocket Client

// =========================
// TYPES & INTERFACES
// =========================

interface VehicleData {
    id: number;
    lat: number;
    lng: number;
    speed: number;
    status: string;
    direction: number;
    directionName?: string;
}

interface RouteData {
    id: string;
    coordinates: [number, number][];
    color?: string;
}

interface StatsData {
    vehicleCount?: number;
    totalVehicles?: number;
    avgSpeed?: number;
    emissions?: number;
    timeSaved?: number;
}

interface TrafficPoint {
    time: Date;
    value: number;
}

interface ChartData {
    label: string;
    value: number;
    color: string;
}

interface WebSocketMessage {
    type: string;
    data?: any;
}

// Déclaration des types Leaflet et D3 (pour éviter les erreurs TypeScript)
declare const L: any;
declare const d3: any;

// =========================
// CONFIGURATION
// =========================
const WS_URL: string = 'ws://localhost:8080/ws';
const MAP_CENTER: [number, number] = [48.8566, 2.3522]; // Paris coordinates
const MAP_ZOOM: number = 13;

// =========================
// WEBSOCKET CONNECTION
// =========================
let ws: WebSocket;
let reconnectInterval: number;

function connectWebSocket(): void {
    ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
        console.log('WebSocket connecté');
        updateConnectionStatus(true);
    };
    
    ws.onmessage = (event: MessageEvent) => {
        const data: WebSocketMessage = JSON.parse(event.data);
        console.log('Message reçu:', data);
        handleIncomingData(data);
    };
    
    ws.onerror = (error: Event) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus(false);
    };
    
    ws.onclose = () => {
        console.log('WebSocket déconnecté');
        updateConnectionStatus(false);
        reconnectInterval = window.setTimeout(connectWebSocket, 5000);
    };
}

function handleIncomingData(data: WebSocketMessage): void {
    const { type, data: msgData } = data;
    
    if (type === 'init') {
        console.log('Données initiales reçues');
        msgData.vehicles.forEach((v: VehicleData) => addOrUpdateVehicle(v));
        updateStats(msgData.stats);
        if (msgData.trafficSegments) {
            msgData.trafficSegments.forEach((segment: any) => {
                updateTrafficChart(segment.density);
            });
        }
    } else if (type === 'update') {
        msgData.vehicles.forEach((v: VehicleData) => addOrUpdateVehicle(v));
        updateStats(msgData.stats);
        if (msgData.trafficSegments) {
            msgData.trafficSegments.forEach((segment: any) => {
                updateTrafficChart(segment.density);
            });
        }
    } else if (type === 'alerts') {
        msgData.forEach((alert: any) => addAlert(alert.message, alert.severity));
    } else if (type === 'predictions') {
        console.log('Prédictions:', msgData);
    }
}

function updateConnectionStatus(connected: boolean): void {
    const indicator = document.getElementById('statusIndicator');
    const text = document.getElementById('statusText');
    
    if (indicator && text) {
        if (connected) {
            indicator.classList.remove('disconnected');
            text.textContent = 'Connecté au serveur';
        } else {
            indicator.classList.add('disconnected');
            text.textContent = 'Déconnecté - Reconnexion...';
        }
    }
}

// =========================
// MAP INITIALIZATION
// =========================
const map = L.map('map').setView(MAP_CENTER, MAP_ZOOM);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

// Stockage des marqueurs et routes
const vehicleMarkers = new Map<number, any>();
const routeLines = new Map<string, any>();
const trafficSegments: any[] = [];

// =========================
// DATA VISUALIZATION
// =========================
let trafficData: TrafficPoint[] = [];
let emissionsData: any[] = [];

function initCharts(): void {
    createTrafficChart();
    createEmissionsChart();
}

function createTrafficChart(): void {
    const svg = d3.select('#trafficChart');
    const width: number = svg.node().getBoundingClientRect().width || 400;
    const height: number = 200;
    const margin = { top: 10, right: 20, bottom: 30, left: 50 };

    svg.attr('width', width).attr('height', height);

    // Axes
    const xScale = d3.scaleTime()
        .domain([new Date(Date.now() - 30 * 60000), new Date()])
        .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([height - margin.bottom, margin.top]);

    // Ligne
    const line = d3.line()
        .x((d: any) => xScale(d.time))
        .y((d: any) => yScale(d.value))
        .curve(d3.curveMonotoneX);

    // Axes
    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.timeFormat('%H:%M')));

    svg.append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale).ticks(5));

    // Path pour la ligne
    svg.append('path')
        .attr('class', 'traffic-line');
}

function updateTrafficChart(newValue: number): void {
    trafficData.push({
        time: new Date(),
        value: newValue
    });

    // Garde seulement les 30 dernières minutes
    const thirtyMinutesAgo = Date.now() - 30 * 60000;
    trafficData = trafficData.filter(d => d.time.getTime() > thirtyMinutesAgo);

    const svg = d3.select('#trafficChart');
    const width: number = parseInt(svg.attr('width')) || 400;
    const height: number = 200;
    const margin = { top: 10, right: 20, bottom: 30, left: 50 };

    const xScale = d3.scaleTime()
        .domain([new Date(Date.now() - 30 * 60000), new Date()])
        .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([height - margin.bottom, margin.top]);

    const line = d3.line()
        .x((d: any) => xScale(d.time))
        .y((d: any) => yScale(d.value))
        .curve(d3.curveMonotoneX);

    svg.select('.traffic-line')
        .datum(trafficData)
        .attr('d', line);

    // Update axes
    svg.select('.x-axis')
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.timeFormat('%H:%M')));
    
    svg.select('.y-axis')
        .call(d3.axisLeft(yScale).ticks(5));
}

function createEmissionsChart(): void {
    const svg = d3.select('#emissionsChart');
    const width: number = svg.node().getBoundingClientRect().width;
    const height: number = 200;
    const margin = { top: 10, right: 10, bottom: 30, left: 40 };

    svg.attr('width', width).attr('height', height);

    const data: ChartData[] = [
        { label: 'Avant', value: 100, color: '#ef4444' },
        { label: 'Après', value: 77, color: '#4ade80' }
    ];

    const xScale = d3.scaleBand()
        .domain(data.map(d => d.label))
        .range([margin.left, width - margin.right])
        .padding(0.3);

    const yScale = d3.scaleLinear()
        .domain([0, 120])
        .range([height - margin.bottom, margin.top]);

    // Barres
    svg.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', (d: ChartData) => xScale(d.label))
        .attr('y', height - margin.bottom)
        .attr('width', xScale.bandwidth())
        .attr('height', 0)
        .attr('fill', (d: ChartData) => d.color)
        .attr('rx', 5)
        .transition()
        .duration(1000)
        .attr('y', (d: ChartData) => yScale(d.value))
        .attr('height', (d: ChartData) => height - margin.bottom - yScale(d.value));

    // Labels
    svg.selectAll('.label')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('x', (d: ChartData) => xScale(d.label)! + xScale.bandwidth() / 2)
        .attr('y', (d: ChartData) => yScale(d.value) - 5)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .text((d: ChartData) => d.value + '%');

    // Axes
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale))
        .attr('color', '#fff');

    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale).ticks(5))
        .attr('color', '#fff');
}

// =========================
// ALERTS MANAGEMENT
// =========================
function addAlert(message: string, type: string = 'warning'): void {
    const alertsList = document.getElementById('alertsList');
    if (!alertsList) return;
    
    const alertItem = document.createElement('div');
    alertItem.className = `alert-item ${type}`;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('fr-FR');
    
    alertItem.innerHTML = `
        <div>${message}</div>
        <div class="alert-time">${timeString}</div>
    `;
    
    alertsList.insertBefore(alertItem, alertsList.firstChild);
    
    // Limite à 10 alertes
    while (alertsList.children.length > 10) {
        if (alertsList.lastChild) {
            alertsList.removeChild(alertsList.lastChild);
        }
    }
}

// =========================
// VEHICLE MANAGEMENT
// =========================
function getColorByDirection(direction: number): string {
    const dir = direction % 360;
    if (dir >= 337.5 || dir < 22.5) return '#ef4444';      // N - Rouge
    if (dir >= 22.5 && dir < 67.5) return '#f97316';       // NE - Orange
    if (dir >= 67.5 && dir < 112.5) return '#fbbf24';      // E - Jaune
    if (dir >= 112.5 && dir < 157.5) return '#84cc16';     // SE - Vert clair
    if (dir >= 157.5 && dir < 202.5) return '#22c55e';     // S - Vert
    if (dir >= 202.5 && dir < 247.5) return '#06b6d4';     // SO - Cyan
    if (dir >= 247.5 && dir < 292.5) return '#3b82f6';     // O - Bleu
    return '#8b5cf6';                                        // NO - Violet
}

function addOrUpdateVehicle(vehicleData: VehicleData): void {
    const { id, lat, lng, speed, status, direction, directionName = '? UNK' } = vehicleData;
    
    const color = getColorByDirection(direction);

    const icon = L.divIcon({
        html: `<div style="background: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.4);"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    });

    if (vehicleMarkers.has(id)) {
        const marker = vehicleMarkers.get(id);
        marker.setLatLng([lat, lng]);
        marker.setIcon(icon);
    } else {
        const marker = L.marker([lat, lng], { icon })
            .bindPopup(`
                <b>Véhicule #${id}</b><br>
                Vitesse: ${speed.toFixed(1)} km/h<br>
                Statut: ${status}<br>
                Direction: ${directionName} (${direction}°)
            `)
            .addTo(map);
        vehicleMarkers.set(id, marker);
    }
}

function drawRoute(routeData: RouteData): void {
    const { id, coordinates, color = '#3b82f6' } = routeData;
    
    if (routeLines.has(id)) {
        map.removeLayer(routeLines.get(id));
    }

    const polyline = L.polyline(coordinates, {
        color: color,
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 5'
    }).addTo(map);

    routeLines.set(id, polyline);
}

// =========================
// SIMULATION MODE
// =========================
function startSimulation(): void {
    // Statistiques initiales
    updateStats({
        vehicleCount: 342,
        avgSpeed: 42.3,
        emissions: 1250,
        timeSaved: 8.5
    });

    // Génère des véhicules simulés
    for (let i = 0; i < 20; i++) {
        const lat = MAP_CENTER[0] + (Math.random() - 0.5) * 0.05;
        const lng = MAP_CENTER[1] + (Math.random() - 0.5) * 0.05;
        const speed = 20 + Math.random() * 60;
        
        addOrUpdateVehicle({
            id: i,
            lat,
            lng,
            speed,
            status: speed < 30 ? 'Fluide' : speed < 50 ? 'Dense' : 'Embouteillé',
            direction: Math.random() * 360
        });
    }

    // Route simulée
    const routeCoords: [number, number][] = [
        [48.8566, 2.3522],
        [48.8606, 2.3376],
        [48.8738, 2.2950]
    ];
    drawRoute({ id: 'route1', coordinates: routeCoords, color: '#8b5cf6' });

    // Alertes initiales
    addAlert('Embouteillage prévu Rue de Rivoli dans 25 minutes', 'warning');
    addAlert('Route alternative proposée: -12 minutes estimé', 'info');
    addAlert('Réduction d\'émissions: 23% atteint', 'info');

    // Mise à jour continue
    setInterval(() => {
        const trafficDensity = 30 + Math.random() * 50;
        updateTrafficChart(trafficDensity);
        
        // Mise à jour aléatoire des stats
        updateStats({
            vehicleCount: 300 + Math.floor(Math.random() * 100),
            avgSpeed: 35 + Math.random() * 20,
            emissions: 1200 + Math.random() * 200,
            timeSaved: 7 + Math.random() * 4
        });

        // Alerte aléatoire
        if (Math.random() > 0.95) {
            const alerts = [
                'Congestion détectée Boulevard Haussmann',
                'Accident signalé Avenue des Champs-Élysées',
                'Optimisation de route effectuée: +5% efficacité',
                'Capteur #42 déconnecté - Zone non couverte'
            ];
            addAlert(alerts[Math.floor(Math.random() * alerts.length)], 
                    Math.random() > 0.5 ? 'warning' : 'info');
        }
    }, 3000);
}

function updateStats(stats: StatsData): void {
    const vehicleCountEl = document.getElementById('vehicleCount');
    const avgSpeedEl = document.getElementById('avgSpeed');
    const emissionsEl = document.getElementById('emissions');
    const timeSavedEl = document.getElementById('timeSaved');
    
    if (vehicleCountEl) vehicleCountEl.textContent = String(stats.vehicleCount || stats.totalVehicles || 0);
    if (avgSpeedEl) avgSpeedEl.textContent = (stats.avgSpeed || 0).toFixed(1);
    if (emissionsEl) emissionsEl.textContent = (stats.emissions || 0).toFixed(0);
    if (timeSavedEl) timeSavedEl.textContent = (stats.timeSaved || 0).toFixed(1);
}

// =========================
// INITIALIZATION
// =========================
window.addEventListener('DOMContentLoaded', () => {
    initCharts();
    connectWebSocket();
});
