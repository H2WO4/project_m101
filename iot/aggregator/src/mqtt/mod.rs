use std::time::Duration;

use chrono::{Local, NaiveDateTime};
use rumqttc::{AsyncClient, Event, MqttOptions, Packet, QoS, SubscribeFilter};
use sqlx::query_file;

use crate::{db::POOL, load_var};

/// Handle the entire communication process with the MQTT broker
/// Data is gathered from all the sensors' topics, and sent to the DB
pub async fn aggregate() {
    // Configure and launch the MQTT client
    let mqtt_options = {
        let mut mqtt_options = MqttOptions::new("aggregator", "mqtt", 1883);
        mqtt_options
            .set_keep_alive(Duration::from_secs(15))
            .set_clean_session(false)
            .set_inflight(64)
            .set_request_channel_capacity(64);
        mqtt_options
    };
    let (client, mut event_pool) = AsyncClient::new(mqtt_options, 10);

    // Subscribe to the topic of every sensor
    let sensor_number = load_var!("SENSOR_NUMBER" => uint);
    client
        .subscribe_many((0u8..sensor_number).map(|i| SubscribeFilter::new(format!("traffic/{i}"), QoS::AtMostOnce)))
        .await
        .unwrap();

    // Acquire a DB connection from the pool, for reuse
    let mut connection = POOL
        .acquire()
        .await
        .expect("DB should be accessible")
        .detach();

    // Handle messages from the MQTT broker
    while let Ok(event) = event_pool.poll().await {
        let Event::Incoming(Packet::Publish(data)) = event else {
            continue;
        };

        log::trace!("MQTT: {} = {:?}", data.topic, data.payload);

        let id = data.payload[0] as i32;
        let avg_speed = data.payload[1] as i32;

        let timestamp: NaiveDateTime = Local::now().naive_local();

        let result = query_file!("src/mqtt/update_one.sql", id, avg_speed, timestamp)
            .execute(&mut connection)
            .await;

        if let Err(error) = &result {
            log::error!("MQTT error: {error}");
        }
    }
}
