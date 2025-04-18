#!/bin/bash
set -euo pipefail
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=12345

echo "Create users and databases"
psql -Atx "postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT" <<EOL
  CREATE DATABASE "mev_inspect";
  CREATE USER "mev_inspect" WITH PASSWORD '12345';
  CREATE USER "readonly" WITH PASSWORD '12345';
EOL

echo "Run mev_inspect database migration"
migrate -source file://packages/db-migration/migration -database "postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_HOST:$POSTGRES_PORT/mev_inspect?sslmode=disable" up