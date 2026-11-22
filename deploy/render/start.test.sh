#!/bin/bash
set -eu
test_dir=$(mktemp -d)
trap 'rm -rf "$test_dir"' EXIT
export TEST_DIR="$test_dir" DB_CA_CERTIFICATE=test-certificate
mkdir "$test_dir/bin"
export PATH="$test_dir/bin:$PATH"
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
mkdir "$test_dir/app"
sed -e 's/\r$//' -e 's@/app/@./app/@g' "$script_dir/start.sh" > "$test_dir/start.sh"
cd "$test_dir"
printf '#!/bin/bash\nexit 0\n' > "$test_dir/bin/keytool"
cat > "$test_dir/bin/java" <<'SCRIPT'
#!/bin/bash
if [[ "${JAVA_FAIL:-0}" == 1 ]]; then sleep 0.5; exit 7; fi
exec sleep 60
SCRIPT
cat > "$test_dir/bin/wget" <<'SCRIPT'
#!/bin/bash
exit 1
SCRIPT
cat > "$test_dir/bin/nginx" <<'SCRIPT'
#!/bin/bash
touch "$TEST_DIR/nginx-started"
exec sleep 60
SCRIPT
chmod +x "$test_dir/bin/"*

bash "$test_dir/start.sh" &
subject=$!
trap 'kill "$subject" 2>/dev/null || true; wait "$subject" 2>/dev/null || true; cd /; rm -rf "$test_dir"' EXIT
for attempt in {1..50}; do
  [[ -f "$test_dir/nginx-started" ]] && break
  sleep 0.1
done
if [[ ! -f "$test_dir/nginx-started" ]]; then
  echo 'FAIL Nginx did not start while the API was unavailable' >&2
  exit 1
fi
kill -TERM "$subject"
status=0
wait "$subject" || status=$?
[[ "$status" == 143 ]]
echo 'PASS Nginx starts while the API is unavailable and handles termination'

status=0
JAVA_FAIL=1 bash "$test_dir/start.sh" || status=$?
[[ "$status" == 7 ]]
echo 'PASS container exits with the Java failure status'
