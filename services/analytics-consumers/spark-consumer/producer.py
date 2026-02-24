# producer.py
from kafka import KafkaProducer
import json, time, datetime

BOOTSTRAP = "127.0.0.1:9092"
TOPIC = "anchors.completed"

producer = KafkaProducer(
    bootstrap_servers=BOOTSTRAP,
    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
)

for i in range(10):
    msg = {
        "request_id": f"test-req-{int(time.time())}-{i}",
        "merkle_root": "0x" + "a"*64,
        "tx_hash": None,
        "block_number": i,
        "submitted_at": datetime.datetime.utcnow().isoformat(),   # ISO8601 string
        "submitter": "tester",
        "status": "OK" if i % 2 == 0 else "FAILED",
        "preview_ids": [],
        "events": [f"evt-{i}"]
    }
    producer.send(TOPIC, msg)
    producer.flush()
    print("sent", msg["request_id"])
    time.sleep(1)
