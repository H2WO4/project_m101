use std::env;
use std::time::Duration;

use rumqttc::{AsyncClient, MqttOptions, QoS};
use tokio::{task, time};

#[tokio::main]
async fn main() {
    let unique_id: u8 = env::var("UNIQUE_ID")
        .expect("Sensor should be given an ID")
        .parse()
        .expect("ID should be a number");

    let mqtt_options = {
        let mut mqtt_options = MqttOptions::new(format!("sensor-{unique_id}"), "mqtt", 1883);
        mqtt_options.set_keep_alive(Duration::from_secs(120));
        mqtt_options
    };

    let (client, mut event_poll) = AsyncClient::new(mqtt_options, 10);

    let topic = format!("traffic/{unique_id}");

    task::spawn(async move {
        let wait_time = 24;

        loop {
            let avg_speed: u32 = ((unique_id as u32) * 17 % 43) + 10;
            let data = vec![avg_speed as u8];

            let result = client
                .publish(topic.clone(), QoS::AtLeastOnce, true, data)
                .await;
            if let Err(error) = result {
                println!("Error: {error}");
            }

            time::sleep(Duration::from_secs(wait_time as u64)).await;
        }
    });

    while event_poll.poll().await.is_ok() {}
}
