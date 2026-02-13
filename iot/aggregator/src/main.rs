mod db;
mod graph;
mod jams;
mod macros;
mod models;
mod mqtt;
mod nodes;

use std::{env, io, net::Ipv4Addr};

use actix_cors::Cors;
use actix_web::{
    App, HttpServer,
    middleware::{Logger, NormalizePath},
    web::{ServiceConfig, scope},
};
use env_logger::Env;
use tokio::task;

#[actix_web::main]
async fn main() -> io::Result<()> {
    // We don't care about loading an `.env` file when in a container
    // As environement variables are passed through the `docker-compose.yaml`
    if env::var("DOCKER").is_err() && dotenv::dotenv().is_err() {
        eprintln!("No `.env` file found");
    };

    // Instantiation of the global logger
    let env = Env::new().filter_or("LOG_LEVEL", "info");
    env_logger::builder()
        .parse_env(env)
        .format_timestamp(None)
        .init();

    // Launch the MQTT receiver
    task::spawn(mqtt::aggregate());

    // Configure and launch the server
    HttpServer::new(|| {
        App::new()
            .wrap(Logger::default())
            .wrap(NormalizePath::trim())
            .wrap(
                Cors::default()
                    .allow_any_origin()
                    .allow_any_method()
                    .allow_any_header()
                    .supports_credentials()
                    .max_age(3600 * 8),
            )
            .configure(configure)
    })
    .bind((Ipv4Addr::new(0, 0, 0, 0), 8080))?
    .run()
    .await
}

/// Register top-level services
fn configure(cfg: &mut ServiceConfig) {
    let service = scope("api")
        .configure(jams::configure)
        .configure(nodes::configure);

    cfg.service(service);
}
