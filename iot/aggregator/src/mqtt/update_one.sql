INSERT INTO
    nodes (id, avg_speed, time_)
VALUES
    ($1, $2, $3)
ON CONFLICT
    (id)
DO UPDATE SET
    avg_speed = excluded.avg_speed,
    time_ = excluded.time_
