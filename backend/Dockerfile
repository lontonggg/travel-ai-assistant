FROM python:3.11-slim

# Install WeasyPrint system deps + gcsfuse
RUN apt-get update && apt-get install -y \
    curl gnupg fuse \
    libpango-1.0-0 libpangoft2-1.0-0 libpangocairo-1.0-0 \
    libcairo2 libgdk-pixbuf2.0-0 libffi-dev \
    shared-mime-info fonts-liberation \
  && curl https://packages.cloud.google.com/apt/doc/apt-key.gpg \
     | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg \
  && echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt gcsfuse-bookworm main" \
     > /etc/apt/sources.list.d/gcsfuse.list \
  && apt-get update && apt-get install -y gcsfuse \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /mnt/gcs-db

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
