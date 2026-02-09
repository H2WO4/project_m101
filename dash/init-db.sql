-- CityFlow Analytics - TimescaleDB Initialization Script
-- Schéma pour stockage des données de trafic en séries temporelles

-- Activer l'extension TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Table principale: données de trafic
CREATE TABLE traffic_data (
    time TIMESTAMPTZ NOT NULL,
    sensor_id INTEGER NOT NULL,
    location_lat DOUBLE PRECISION NOT NULL,
    location_lng DOUBLE PRECISION NOT NULL,
    vehicle_count INTEGER NOT NULL,
    avg_speed DOUBLE PRECISION NOT NULL,
    density DOUBLE PRECISION NOT NULL,
    status VARCHAR(20) NOT NULL,
    PRIMARY KEY (time, sensor_id)
);

-- Convertir en hypertable pour optimisation séries temporelles
SELECT create_hypertable('traffic_data', 'time');

-- Table: véhicules individuels
CREATE TABLE vehicles (
    time TIMESTAMPTZ NOT NULL,
    vehicle_id VARCHAR(50) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION NOT NULL,
    direction DOUBLE PRECISION,
    status VARCHAR(20),
    PRIMARY KEY (time, vehicle_id)
);

SELECT create_hypertable('vehicles', 'time');

-- Table: prédictions d'embouteillages
CREATE TABLE predictions (
    time TIMESTAMPTZ NOT NULL,
    prediction_id SERIAL,
    prediction_type VARCHAR(50) NOT NULL,
    location_name VARCHAR(200),
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    predicted_time TIMESTAMPTZ NOT NULL,
    confidence DOUBLE PRECISION,
    severity VARCHAR(20),
    affected_vehicles INTEGER,
    PRIMARY KEY (time, prediction_id)
);

SELECT create_hypertable('predictions', 'time');

-- Table: métriques de performance
CREATE TABLE performance_metrics (
    time TIMESTAMPTZ NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    unit VARCHAR(20),
    metadata JSONB,
    PRIMARY KEY (time, metric_name)
);

SELECT create_hypertable('performance_metrics', 'time');

-- Table: alertes système
CREATE TABLE alerts (
    time TIMESTAMPTZ NOT NULL,
    alert_id SERIAL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    location_name VARCHAR(200),
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    resolved BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (time, alert_id)
);

SELECT create_hypertable('alerts', 'time');

-- Table: routes optimisées
CREATE TABLE optimized_routes (
    time TIMESTAMPTZ NOT NULL,
    route_id VARCHAR(100) NOT NULL,
    origin_lat DOUBLE PRECISION NOT NULL,
    origin_lng DOUBLE PRECISION NOT NULL,
    destination_lat DOUBLE PRECISION NOT NULL,
    destination_lng DOUBLE PRECISION NOT NULL,
    route_coordinates JSONB NOT NULL,
    estimated_time INTEGER,
    time_saved INTEGER,
    emissions_saved DOUBLE PRECISION,
    PRIMARY KEY (time, route_id)
);

SELECT create_hypertable('optimized_routes', 'time');

-- =====================================
-- INDEX POUR PERFORMANCES
-- =====================================

-- Index géospatiaux
CREATE INDEX idx_traffic_location ON traffic_data (location_lat, location_lng);
CREATE INDEX idx_vehicles_location ON vehicles (lat, lng);
CREATE INDEX idx_predictions_location ON predictions (location_lat, location_lng);

-- Index temporels
CREATE INDEX idx_traffic_time ON traffic_data (time DESC);
CREATE INDEX idx_vehicles_time ON vehicles (time DESC);
CREATE INDEX idx_predictions_time ON predictions (time DESC);

-- Index sur statuts
CREATE INDEX idx_traffic_status ON traffic_data (status);
CREATE INDEX idx_vehicles_status ON vehicles (status);

-- =====================================
-- VUES MATÉRIALISÉES
-- =====================================

-- Vue: statistiques horaires
CREATE MATERIALIZED VIEW hourly_traffic_stats AS
SELECT 
    time_bucket('1 hour', time) AS hour,
    AVG(vehicle_count) AS avg_vehicles,
    AVG(avg_speed) AS avg_speed,
    AVG(density) AS avg_density,
    COUNT(*) AS sample_count
FROM traffic_data
GROUP BY hour
ORDER BY hour DESC;

-- Rafraîchir automatiquement toutes les heures
CREATE UNIQUE INDEX ON hourly_traffic_stats (hour);

-- Vue: statistiques par zone
CREATE MATERIALIZED VIEW zone_statistics AS
SELECT 
    time_bucket('15 minutes', time) AS period,
    sensor_id,
    AVG(vehicle_count) AS avg_vehicles,
    AVG(avg_speed) AS avg_speed,
    MAX(vehicle_count) AS max_vehicles,
    MIN(avg_speed) AS min_speed
FROM traffic_data
GROUP BY period, sensor_id
ORDER BY period DESC, sensor_id;

CREATE UNIQUE INDEX ON zone_statistics (period, sensor_id);

-- =====================================
-- FONCTIONS UTILITAIRES
-- =====================================

-- Fonction: calculer distance entre deux points (Haversine)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DOUBLE PRECISION,
    lng1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
    R CONSTANT DOUBLE PRECISION := 6371; -- Rayon terre en km
    dLat DOUBLE PRECISION;
    dLng DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    dLat := RADIANS(lat2 - lat1);
    dLng := RADIANS(lng2 - lng1);
    
    a := SIN(dLat/2) * SIN(dLat/2) +
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
         SIN(dLng/2) * SIN(dLng/2);
    
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    
    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction: obtenir trafic en temps réel dans un rayon
CREATE OR REPLACE FUNCTION get_traffic_in_radius(
    center_lat DOUBLE PRECISION,
    center_lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION,
    minutes_ago INTEGER DEFAULT 5
) RETURNS TABLE (
    sensor_id INTEGER,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    vehicle_count INTEGER,
    avg_speed DOUBLE PRECISION,
    status VARCHAR(20),
    distance_km DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.sensor_id,
        t.location_lat,
        t.location_lng,
        t.vehicle_count,
        t.avg_speed,
        t.status,
        calculate_distance(center_lat, center_lng, t.location_lat, t.location_lng) AS distance_km
    FROM traffic_data t
    WHERE t.time > NOW() - INTERVAL '1 minute' * minutes_ago
        AND calculate_distance(center_lat, center_lng, t.location_lat, t.location_lng) <= radius_km
    ORDER BY t.time DESC, distance_km;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- POLITIQUES DE RÉTENTION
-- =====================================

-- Garder les données brutes pendant 7 jours
SELECT add_retention_policy('traffic_data', INTERVAL '7 days');
SELECT add_retention_policy('vehicles', INTERVAL '7 days');

-- Garder les prédictions pendant 30 jours
SELECT add_retention_policy('predictions', INTERVAL '30 days');

-- Garder les alertes pendant 90 jours
SELECT add_retention_policy('alerts', INTERVAL '90 days');

-- Garder les routes optimisées pendant 180 jours
SELECT add_retention_policy('optimized_routes', INTERVAL '180 days');

-- =====================================
-- POLITIQUES D'AGRÉGATION
-- =====================================

-- Créer des agrégations continues pour statistiques
CREATE MATERIALIZED VIEW traffic_5min_agg
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('5 minutes', time) AS bucket,
    sensor_id,
    AVG(vehicle_count) AS avg_vehicles,
    AVG(avg_speed) AS avg_speed,
    AVG(density) AS avg_density,
    COUNT(*) AS sample_count
FROM traffic_data
GROUP BY bucket, sensor_id;

-- Rafraîchir automatiquement
SELECT add_continuous_aggregate_policy('traffic_5min_agg',
    start_offset => INTERVAL '1 hour',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '5 minutes');

-- =====================================
-- DONNÉES DE TEST
-- =====================================

-- Insérer quelques données de test
INSERT INTO traffic_data (time, sensor_id, location_lat, location_lng, vehicle_count, avg_speed, density, status)
VALUES 
    (NOW(), 1, 48.8566, 2.3522, 45, 35.5, 0.65, 'dense'),
    (NOW(), 2, 48.8606, 2.3376, 28, 52.3, 0.42, 'fluide'),
    (NOW(), 3, 48.8738, 2.2950, 67, 18.7, 0.88, 'embouteillage');

INSERT INTO performance_metrics (time, metric_name, metric_value, unit)
VALUES 
    (NOW(), 'total_vehicles', 342, 'count'),
    (NOW(), 'avg_speed', 42.3, 'km/h'),
    (NOW(), 'co2_emissions', 1250, 'kg'),
    (NOW(), 'emissions_reduction', 23, 'percent'),
    (NOW(), 'time_saved', 8.5, 'minutes');

-- =====================================
-- PERMISSIONS
-- =====================================

-- Accorder les permissions nécessaires
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO cityflow;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cityflow;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO cityflow;

-- =====================================
-- COMMENTAIRES
-- =====================================

COMMENT ON TABLE traffic_data IS 'Données brutes de trafic collectées par les capteurs IoT';
COMMENT ON TABLE vehicles IS 'Suivi individuel des véhicules en temps réel';
COMMENT ON TABLE predictions IS 'Prédictions d''embouteillages générées par l''IA';
COMMENT ON TABLE performance_metrics IS 'Métriques de performance du système';
COMMENT ON TABLE alerts IS 'Alertes et notifications du système';
COMMENT ON TABLE optimized_routes IS 'Routes optimisées calculées pour réduire les émissions';

-- Finalisation
VACUUM ANALYZE;

SELECT 'CityFlow Analytics - Base de données initialisée avec succès!' AS status;
