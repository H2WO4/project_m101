use std::time::Duration;

use rumqttc::{AsyncClient, Event, MqttOptions, Packet, QoS, SubscribeFilter};

#[tokio::main]
async fn main() {
    println!("hello");
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

    while let Ok(notification) = event_pool.poll().await {
        let Event::Incoming(Packet::Publish(data)) = notification else {
            continue;
        };

        // println!("Notification: {notification:?}");
        println!("Data: {data:?}");
        println!("Topic: {:?}", data.topic);
        println!("Payload: {:?}", data.payload.to_vec());
    }
}
