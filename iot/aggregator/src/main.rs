mod db;
mod graph;
mod macros;
mod models;
mod mqtt;
mod nodes;

use std::io;

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
    let _ = dotenv::dotenv();

    let env = Env::new().filter_or("LOG_LEVEL", "info");
    env_logger::builder()
        .parse_env(env)
        .format_timestamp(None)
        .init();

    task::spawn(mqtt::aggregate());

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
    .bind(("127.0.0.1", 8080))?
    .run()
    .await
}

fn configure(cfg: &mut ServiceConfig) {
    let service = scope("api").configure(nodes::configure);
    cfg.service(service);
}
