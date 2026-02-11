# Use slim python for production
FROM python:3.11-slim

WORKDIR /app

# system deps
RUN apt-get update && apt-get install -y build-essential gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ /app/app
RUN mkdir -p /app/models
COPY model.pkl /app/models/model.pkl  
COPY start_server.sh /app/start_server.sh
RUN chmod +x /app/start_server.sh

EXPOSE 8080

CMD ["/app/start_server.sh"]
