use chrono::NaiveDateTime;
use serde::Serialize;
use sqlx::prelude::*;

/// A node as found in the DB
#[derive(FromRow, Serialize, Clone)]
pub struct Node {
    pub id: i32,
    pub avg_speed: i32,
    pub timestamp: NaiveDateTime,
}
