#!/bin/bash
set -eu
test_dir=$(mktemp -d)
trap 'rm -rf "$test_dir"' EXIT
export TEST_DIR="$test_dir" DB_CA_CERTIFICATE=test-certificate
mkdir "$test_dir/bin"
export PATH="$test_dir/bin:$PATH"
sed 's/\r$//' /checks/start.sh > "$test_dir/start.sh"
printf '#!/bin/bash\nexit 0\n' > "$test_dir/bin/keytool"
cat > "$test_dir/bin/java" <<'SCRIPT'
#!/bin/bash
if [[ "${JAVA_FAIL:-0}" == 1 ]]; then exit 7; fi
exec sleep 60
SCRIPT
cat > "$test_dir/bin/wget" <<'SCRIPT'
#!/bin/bash
count=$(cat "$TEST_DIR/probes" 2>/dev/null || echo 0)
count=$((count + 1))
echo "$count" > "$TEST_DIR/probes"
[[ "$count" -ge 3 ]]
SCRIPT
cat > "$test_dir/bin/nginx" <<'SCRIPT'
#!/bin/bash
touch "$TEST_DIR/nginx-started"
exec sleep 60
SCRIPT
chmod +x "$test_dir/bin/"*

bash "$test_dir/start.sh" &
subject=$!
for attempt in {1..50}; do
  [[ -f "$test_dir/nginx-started" ]] && break
  sleep 0.1
done
[[ -f "$test_dir/nginx-started" ]]
[[ "$(cat "$test_dir/probes")" -ge 3 ]]
kill -TERM "$subject"
status=0
wait "$subject" || status=$?
[[ "$status" == 143 ]]
echo 'PASS frontend waits for a healthy API and handles termination'

rm -f "$test_dir/nginx-started" "$test_dir/probes"
status=0
JAVA_FAIL=1 bash "$test_dir/start.sh" || status=$?
[[ "$status" == 7 ]]
[[ ! -f "$test_dir/nginx-started" ]]
echo 'PASS failed Java startup never exposes the frontend'
