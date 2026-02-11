# consumer_analytics.py
import json
from kafka import KafkaConsumer

BOOTSTRAP = "127.0.0.1:29092"
TOPIC = "analytics.anchors.hourly"

print(f"Listening to {TOPIC} on {BOOTSTRAP}...")

consumer = KafkaConsumer(
    TOPIC,
    bootstrap_servers=BOOTSTRAP,
    auto_offset_reset="earliest", # Read from the beginning
    value_deserializer=lambda v: json.loads(v.decode("utf-8")),
    # Stop if no message after 10 seconds (optional, good for testing)
    consumer_timeout_ms=10000, 
    api_version=(0, 10, 1) # Force version to skip handshake issues
)

try:
    for msg in consumer:
        print("Received Aggregate:", msg.value)
except Exception as e:
    print(f"Error: {e}")

print("Done listening.")