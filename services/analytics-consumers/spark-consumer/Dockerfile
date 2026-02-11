# Use Eclipse Temurin (The official replacement for OpenJDK images)
FROM eclipse-temurin:17-jdk-jammy

# Install Python 3 and dependencies
# Ubuntu Jammy includes Python 3.10, which is perfectly stable for Spark
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PySpark and dependencies
COPY requirements.txt /tmp/requirements.txt
RUN python3 -m pip install --no-cache-dir -r /tmp/requirements.txt

# Copy application code
WORKDIR /app
COPY app.py /app/
COPY entrypoint.sh /app/entrypoint.sh

# Make the entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Set environment variables for Spark to find Python
ENV PYSPARK_PYTHON=python3
ENV PYSPARK_DRIVER_PYTHON=python3

ENTRYPOINT ["/app/entrypoint.sh"]