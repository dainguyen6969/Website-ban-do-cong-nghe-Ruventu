#!/bin/bash
set -eu

: "${DB_CA_CERTIFICATE:?Set the Aiven project CA certificate before starting}"
printf '%s\n' "$DB_CA_CERTIFICATE" > /app/db-ca.pem
rm -f /app/db-truststore.p12
keytool -importcert -noprompt -alias aiven -file /app/db-ca.pem \
  -keystore /app/db-truststore.p12 -storetype PKCS12 -storepass changeit

java -jar /app/app.jar &
java_pid=$!
pids=("$java_pid")
trap 'kill "${pids[@]}" 2>/dev/null || true' EXIT
trap 'exit 143' TERM
trap 'exit 130' INT

# Bind the HTTP port while Java starts. Render checks the proxied API before routing traffic.
nginx -g 'daemon off;' &
pids+=("$!")
wait -n "${pids[@]}"
