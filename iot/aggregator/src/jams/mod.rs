use actix_web::{
    HttpResponse, Responder, get,
    web::{ServiceConfig, scope},
};
use sqlx::query_file_as;

use crate::{db::POOL, or_fail};
use crate::{graph::ADJACENCIES, models::Node};

/// Register services relating to traffic jams
pub fn configure(cfg: &mut ServiceConfig) {
    let service = scope("jams").service(get);

    cfg.service(service);
}

/// Check all nodes to detect all traffic jams
#[get("")]
async fn get() -> impl Responder {
    // Get all nodes
    let nodes = or_fail!(
        query_file_as!(Node, "src/nodes/get.sql")
            .fetch_all(&*POOL)
            .await
    );

    let jams: Vec<_> = nodes
        .iter()
        .filter(|node| {
            // For each of them, check the adjacent nodes
            let adjacencies = &ADJACENCIES[node.id as usize];

            let adjacent_avg = adjacencies
                .iter()
                .map(|i| &nodes[*i].avg_speed)
                .sum::<i32>()
                / adjacencies.len() as i32;

            // If their average speed is lower than half the average of their neighbors
            // Then there is a traffic jam
            node.avg_speed * 2 < adjacent_avg
        })
        .cloned()
        .collect();

    HttpResponse::Ok().json(jams)
}
