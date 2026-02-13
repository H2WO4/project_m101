const WS_URL = 'ws://localhost:8080/ws';
const MAP_CENTER = [48.8566, 2.3522];
const MAP_ZOOM = 13;
let ws;
let reconnectInterval;
function connectWebSocket() {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => {
        console.log('WebSocket connecté');
        updateConnectionStatus(true);
    };
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Message reçu:', data);
        handleIncomingData(data);
    };
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus(false);
    };
    ws.onclose = () => {
        console.log('WebSocket déconnecté');
        updateConnectionStatus(false);
        reconnectInterval = window.setTimeout(connectWebSocket, 5000);
    };
}
function handleIncomingData(data) {
    const { type, data: msgData } = data;
    if (type === 'init') {
        console.log('Données initiales reçues');
        msgData.vehicles.forEach((v) => addOrUpdateVehicle(v));
        updateStats(msgData.stats);
        if (msgData.trafficSegments) {
            msgData.trafficSegments.forEach((segment) => {
                updateTrafficChart(segment.density);
            });
        }
    }
    else if (type === 'update') {
        msgData.vehicles.forEach((v) => addOrUpdateVehicle(v));
        updateStats(msgData.stats);
        if (msgData.trafficSegments) {
            msgData.trafficSegments.forEach((segment) => {
                updateTrafficChart(segment.density);
            });
        }
    }
    else if (type === 'alerts') {
        msgData.forEach((alert) => addAlert(alert.message, alert.severity));
    }
    else if (type === 'predictions') {
        console.log('Prédictions:', msgData);
    }
}
function updateConnectionStatus(connected) {
    const indicator = document.getElementById('statusIndicator');
    const text = document.getElementById('statusText');
    if (indicator && text) {
        if (connected) {
            indicator.classList.remove('disconnected');
            text.textContent = 'Connecté au serveur';
        }
        else {
            indicator.classList.add('disconnected');
            text.textContent = 'Déconnecté - Reconnexion...';
        }
    }
}
const map = L.map('map').setView(MAP_CENTER, MAP_ZOOM);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);
const vehicleMarkers = new Map();
const routeLines = new Map();
const trafficSegments = [];
let trafficData = [];
let emissionsData = [];
function initCharts() {
    createTrafficChart();
    createEmissionsChart();
}
function createTrafficChart() {
    const svg = d3.select('#trafficChart');
    const width = svg.node().getBoundingClientRect().width || 400;
    const height = 200;
    const margin = { top: 10, right: 20, bottom: 30, left: 50 };
    svg.attr('width', width).attr('height', height);
    const xScale = d3.scaleTime()
        .domain([new Date(Date.now() - 30 * 60000), new Date()])
        .range([margin.left, width - margin.right]);
    const yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([height - margin.bottom, margin.top]);
    const line = d3.line()
        .x((d) => xScale(d.time))
        .y((d) => yScale(d.value))
        .curve(d3.curveMonotoneX);
    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.timeFormat('%H:%M')));
    svg.append('g')
        .attr('class', 'y-axis')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale).ticks(5));
    svg.append('path')
        .attr('class', 'traffic-line');
}
function updateTrafficChart(newValue) {
    trafficData.push({
        time: new Date(),
        value: newValue
    });
    const thirtyMinutesAgo = Date.now() - 30 * 60000;
    trafficData = trafficData.filter(d => d.time.getTime() > thirtyMinutesAgo);
    const svg = d3.select('#trafficChart');
    const width = parseInt(svg.attr('width')) || 400;
    const height = 200;
    const margin = { top: 10, right: 20, bottom: 30, left: 50 };
    const xScale = d3.scaleTime()
        .domain([new Date(Date.now() - 30 * 60000), new Date()])
        .range([margin.left, width - margin.right]);
    const yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([height - margin.bottom, margin.top]);
    const line = d3.line()
        .x((d) => xScale(d.time))
        .y((d) => yScale(d.value))
        .curve(d3.curveMonotoneX);
    svg.select('.traffic-line')
        .datum(trafficData)
        .attr('d', line);
    svg.select('.x-axis')
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.timeFormat('%H:%M')));
    svg.select('.y-axis')
        .call(d3.axisLeft(yScale).ticks(5));
}
function createEmissionsChart() {
    const svg = d3.select('#emissionsChart');
    const width = svg.node().getBoundingClientRect().width;
    const height = 200;
    const margin = { top: 10, right: 10, bottom: 30, left: 40 };
    svg.attr('width', width).attr('height', height);
    const data = [
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
    svg.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', (d) => xScale(d.label))
        .attr('y', height - margin.bottom)
        .attr('width', xScale.bandwidth())
        .attr('height', 0)
        .attr('fill', (d) => d.color)
        .attr('rx', 5)
        .transition()
        .duration(1000)
        .attr('y', (d) => yScale(d.value))
        .attr('height', (d) => height - margin.bottom - yScale(d.value));
    svg.selectAll('.label')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('x', (d) => xScale(d.label) + xScale.bandwidth() / 2)
        .attr('y', (d) => yScale(d.value) - 5)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .text((d) => d.value + '%');
    svg.append('g')
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(xScale))
        .attr('color', '#fff');
    svg.append('g')
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale).ticks(5))
        .attr('color', '#fff');
}
function addAlert(message, type = 'warning') {
    const alertsList = document.getElementById('alertsList');
    if (!alertsList)
        return;
    const alertItem = document.createElement('div');
    alertItem.className = `alert-item ${type}`;
    const now = new Date();
    const timeString = now.toLocaleTimeString('fr-FR');
    alertItem.innerHTML = `
        <div>${message}</div>
        <div class="alert-time">${timeString}</div>
    `;
    alertsList.insertBefore(alertItem, alertsList.firstChild);
    while (alertsList.children.length > 10) {
        if (alertsList.lastChild) {
            alertsList.removeChild(alertsList.lastChild);
        }
    }
}
function getColorByDirection(direction) {
    const dir = direction % 360;
    if (dir >= 337.5 || dir < 22.5)
        return '#ef4444';
    if (dir >= 22.5 && dir < 67.5)
        return '#f97316';
    if (dir >= 67.5 && dir < 112.5)
        return '#fbbf24';
    if (dir >= 112.5 && dir < 157.5)
        return '#84cc16';
    if (dir >= 157.5 && dir < 202.5)
        return '#22c55e';
    if (dir >= 202.5 && dir < 247.5)
        return '#06b6d4';
    if (dir >= 247.5 && dir < 292.5)
        return '#3b82f6';
    return '#8b5cf6';
}
function addOrUpdateVehicle(vehicleData) {
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
    }
    else {
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
function drawRoute(routeData) {
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
function startSimulation() {
    updateStats({
        vehicleCount: 342,
        avgSpeed: 42.3,
        emissions: 1250,
        timeSaved: 8.5
    });
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
    const routeCoords = [
        [48.8566, 2.3522],
        [48.8606, 2.3376],
        [48.8738, 2.2950]
    ];
    drawRoute({ id: 'route1', coordinates: routeCoords, color: '#8b5cf6' });
    addAlert('Embouteillage prévu Rue de Rivoli dans 25 minutes', 'warning');
    addAlert('Route alternative proposée: -12 minutes estimé', 'info');
    addAlert('Réduction d\'émissions: 23% atteint', 'info');
    setInterval(() => {
        const trafficDensity = 30 + Math.random() * 50;
        updateTrafficChart(trafficDensity);
        updateStats({
            vehicleCount: 300 + Math.floor(Math.random() * 100),
            avgSpeed: 35 + Math.random() * 20,
            emissions: 1200 + Math.random() * 200,
            timeSaved: 7 + Math.random() * 4
        });
        if (Math.random() > 0.95) {
            const alerts = [
                'Congestion détectée Boulevard Haussmann',
                'Accident signalé Avenue des Champs-Élysées',
                'Optimisation de route effectuée: +5% efficacité',
                'Capteur #42 déconnecté - Zone non couverte'
            ];
            addAlert(alerts[Math.floor(Math.random() * alerts.length)], Math.random() > 0.5 ? 'warning' : 'info');
        }
    }, 3000);
}
function updateStats(stats) {
    const vehicleCountEl = document.getElementById('vehicleCount');
    const avgSpeedEl = document.getElementById('avgSpeed');
    const emissionsEl = document.getElementById('emissions');
    const timeSavedEl = document.getElementById('timeSaved');
    if (vehicleCountEl)
        vehicleCountEl.textContent = String(stats.vehicleCount || stats.totalVehicles || 0);
    if (avgSpeedEl)
        avgSpeedEl.textContent = (stats.avgSpeed || 0).toFixed(1);
    if (emissionsEl)
        emissionsEl.textContent = (stats.emissions || 0).toFixed(0);
    if (timeSavedEl)
        timeSavedEl.textContent = (stats.timeSaved || 0).toFixed(1);
}
window.addEventListener('DOMContentLoaded', () => {
    initCharts();
    connectWebSocket();
});
//# sourceMappingURL=dashboard.js.map