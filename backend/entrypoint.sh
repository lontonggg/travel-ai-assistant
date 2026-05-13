#!/bin/bash
set -e

echo "Mounting GCS bucket: $GCS_BUCKET_NAME"
gcsfuse --implicit-dirs "$GCS_BUCKET_NAME" /mnt/gcs-db
echo "Mounted at /mnt/gcs-db"

exec uvicorn app.main:app --host 0.0.0.0 --port 8080
