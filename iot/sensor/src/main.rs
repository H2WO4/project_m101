use std::env;
use std::time::Duration;

use env_logger::Env;
use rumqttc::{AsyncClient, MqttOptions, QoS};
use tokio::{task, time};

#[tokio::main]
async fn main() {
    // Instantiation of the global logger
    let env = Env::new().filter_or("LOG_LEVEL", "info");
    env_logger::builder()
        .parse_env(env)
        .format_timestamp(None)
        .init();

    // Load the sensor's ID from the environement
    let unique_id: u8 = env::var("UNIQUE_ID")
        .expect("sensor should be given an ID")
        .parse()
        .expect("ID should be a number");

    // Configure and launch the MQTT client
    let mqtt_options = {
        let mut mqtt_options = MqttOptions::new(format!("sensor-{unique_id}"), "mqtt", 1883);
        mqtt_options.set_keep_alive(Duration::from_secs(120));
        mqtt_options
    };
    let (client, mut event_poll) = AsyncClient::new(mqtt_options, 10);

    // Start a loop; sending new data to the MQTT broker
    task::spawn(async move { send_loop(client, unique_id).await });

    // The client's event loop must be polled in order to progress
    // Even if we are not subscribed to any topic
    while event_poll.poll().await.is_ok() {}
}

/// Report the sensor's information to the MQTT broker
async fn send_loop(client: AsyncClient, unique_id: u8) {
    let wait_time = 24;
    let topic = format!("traffic/{unique_id}");

    loop {
        let avg_speed: u32 = ((unique_id as u32) * 17 % 43) + 10;
        let data = vec![avg_speed as u8];

        // While a performance loss, data must be cloned to be able to be logged afterwards
        let result = client
            .publish(&topic, QoS::AtLeastOnce, true, data.clone())
            .await;
        if let Err(error) = result {
            log::error!("Error: {error}");
        }
        log::trace!("Data sent: {data:?}");

        // Wait before sending new data
        time::sleep(Duration::from_secs(wait_time as u64)).await;
    }
}
