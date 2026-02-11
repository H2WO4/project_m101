use std::{sync::LazyLock, time::Duration};

use chrono::{Local, NaiveDateTime};
use regex::Regex;
use rumqttc::{AsyncClient, Event, MqttOptions, Packet, QoS, SubscribeFilter};
use sqlx::query_file;

use crate::db::POOL;

static TOPIC_REGEX: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^traffic/(\d+)$").expect("RegEx should be valid"));

pub async fn aggregate() {
    LazyLock::force(&POOL);

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

    client
        .subscribe_many((0..31).map(|i| SubscribeFilter::new(format!("traffic/{i}"), QoS::AtMostOnce)))
        .await
        .unwrap();

    let mut connection = POOL
        .acquire()
        .await
        .expect("DB should be accessible")
        .detach();

    while let Ok(event) = event_pool.poll().await {
        let Event::Incoming(Packet::Publish(data)) = event else {
            continue;
        };

        dbg!(&data.topic);
        let id: i32 = TOPIC_REGEX
            .captures(&data.topic)
            .expect("RegEx should match")[1]
            .parse()
            .expect("should be a number");

        let avg_speed = data.payload[0] as i32;

        let timestamp: NaiveDateTime = Local::now().naive_local();

        dbg!(data);
        let result = query_file!("src/mqtt/update_one.sql", id, avg_speed, timestamp)
            .execute(&mut connection)
            .await;

        if let Err(error) = &result {
            dbg!(&error);
        }
    }
}
