FROM dhi.io/rust:1-debian13-sfw-dev AS build

WORKDIR /sensor
RUN cargo init --bin

# Build dependencies
COPY ./Cargo.lock ./Cargo.lock
COPY ./Cargo.toml ./Cargo.toml

RUN cargo build --release
RUN rm src/*.rs

# Build application
COPY ./src ./src

RUN rm ./target/release/deps/sensor*
RUN cargo build --release


FROM dhi.io/rust:1-debian13-sfw-dev AS app

# Run application
COPY --from=build /sensor/target/release/sensor .

CMD ["./sensor"]
