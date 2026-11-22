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

# Render must not route visitors to the frontend before its API is ready.
until wget -q -T 5 -O /dev/null http://127.0.0.1:8080/api/v1/system-settings/status 2>/dev/null; do
  if ! kill -0 "$java_pid" 2>/dev/null; then
    wait "$java_pid"
    exit 1
  fi
  sleep 1
done

nginx -g 'daemon off;' &
pids+=("$!")
wait -n "${pids[@]}"
