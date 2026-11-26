#!/usr/bin/env bash
# Runs the compiled artifact (dist/) and checks the endpoints over real HTTP.
# The test suite exercises the TypeScript sources; this is the only check that
# the build output actually boots and resolves the CSV path.
set -euo pipefail

PORT="${PORT:-3001}"
BASE_URL="http://127.0.0.1:${PORT}"

node dist/main.js &
API_PID=$!
trap 'kill "${API_PID}" 2>/dev/null || true' EXIT

for _ in $(seq 1 30); do
  if curl -sf "${BASE_URL}/health" >/dev/null; then
    break
  fi
  sleep 1
done

curl -sf "${BASE_URL}/health" | grep -q '"status":"ok"'
curl -sf "${BASE_URL}/producers/intervals" | grep -q '"min"'
curl -sf "${BASE_URL}/movies?limit=1" | grep -q '"pagination"'
test "$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/movies?limit=0")" = "400"
test "$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/unknown")" = "404"

# A signal must drain the server and exit 0; a non-zero status here means the
# shutdown path is broken, which no unit or integration test can observe.
kill -TERM "${API_PID}"
wait "${API_PID}"

echo "smoke: ok"
