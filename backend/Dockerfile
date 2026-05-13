FROM python:3.11-slim

# Install gcsfuse
RUN apt-get update && apt-get install -y \
    gnupg \
    lsb-release \
    curl \
    fuse \
  && echo "deb http://packages.cloud.google.com/apt gcsfuse-$(lsb_release -c -s) main" \
     > /etc/apt/sources.list.d/gcsfuse.list \
  && curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - \
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
