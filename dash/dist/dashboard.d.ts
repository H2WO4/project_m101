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
declare const L: any;
declare const d3: any;
declare const WS_URL: string;
declare const MAP_CENTER: [number, number];
declare const MAP_ZOOM: number;
declare let ws: WebSocket;
declare let reconnectInterval: number;
declare function connectWebSocket(): void;
declare function handleIncomingData(data: WebSocketMessage): void;
declare function updateConnectionStatus(connected: boolean): void;
declare const map: any;
declare const vehicleMarkers: Map<number, any>;
declare const routeLines: Map<string, any>;
declare const trafficSegments: any[];
declare let trafficData: TrafficPoint[];
declare let emissionsData: any[];
declare function initCharts(): void;
declare function createTrafficChart(): void;
declare function updateTrafficChart(newValue: number): void;
declare function createEmissionsChart(): void;
declare function addAlert(message: string, type?: string): void;
declare function getColorByDirection(direction: number): string;
declare function addOrUpdateVehicle(vehicleData: VehicleData): void;
declare function drawRoute(routeData: RouteData): void;
declare function startSimulation(): void;
declare function updateStats(stats: StatsData): void;
//# sourceMappingURL=dashboard.d.ts.map