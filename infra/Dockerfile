# Multi-stage build (build Rust binary)
FROM paritytech/ci-linux:latest as builder
WORKDIR /work
# copy your substrate node source (services/substrate-node-src)
COPY services/substrate-node-src/ . 
# build release
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates tzdata && rm -rf /var/lib/apt/lists/*
COPY --from=builder /work/target/release/node-template /usr/local/bin/node-template
EXPOSE 9933 9944 30333 9615
ENTRYPOINT ["/usr/local/bin/node-template"]
CMD ["--dev","--ws-external","--rpc-external"]
