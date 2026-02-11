use actix_web::web::{ServiceConfig, scope};

pub fn configure(cfg: &mut ServiceConfig) {
    let service = scope("nodes")/*.service()*/;

    cfg.service(service);
}
