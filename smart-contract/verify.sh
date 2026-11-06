#!/usr/bin/env bash
# Live end-to-end checks for MyFund on the real Fabric network (the "Verification" list in smart-contract/PLAN.md).
# Run inside WSL (Ubuntu) with the backend STOPPED:  ./verify.sh
#   1. rebuilds the chain from nothing and starts the backend (new console window), which seeds 10 records
#   2. writes through the API   3. contract rules, also via direct peer chaincode invoke
#   4. tampering with the Postgres copy   5. a stopped orderer / Auditor peer   6. network down + up
# Prints PASS/FAIL per check and exits non-zero if any fail. It leaves the backend running and its own check
# records on the chain; for a clean demo afterwards: ./network.sh reset, then restart the backend (it reseeds).
# HTTP and SQL go through throwaway containers: from WSL, Windows' localhost is only reachable as
# host.docker.internal inside Docker.
SC=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO=$(dirname "$SC")
# shellcheck source=network.sh
source "$SC/network.sh"   # Fabric helpers (peer_as, peer_targets, ORDERER_ARGS, ...); cds into network/
set +euo pipefail          # a failed check is reported, not fatal

API=http://host.docker.internal:8080/api
DB_USER=${DB_USERNAME:-postgres}
DB_PW=${DB_PASSWORD:-$(sed -n 's/^spring.datasource.password=//p' "$REPO/backend/src/main/resources/application-local.properties" 2>/dev/null | tr -d '\r')}
HTTP=myfund-verify-http
SQL=myfund-verify-sql
FAILS=0
CHECKS=0

check() { # check <label> <expected substring> <actual>
  CHECKS=$((CHECKS + 1))
  if [[ $3 == *"$2"* ]]; then
    echo "PASS  $1"
  else
    FAILS=$((FAILS + 1))
    printf 'FAIL  %s\n      expected: %s\n      got:      %s\n' "$1" "$2" "${3:0:400}"
  fi
}

api() { # api <METHOD> <path> [token] [json]: body, then the HTTP status as the last line (000 = no answer)
  local args=(-s -w '\n%{http_code}' --max-time 120 -X "$1" -H 'Content-Type: application/json')
  [[ -n ${3:-} ]] && args+=(-H "Authorization: Bearer $3")
  [[ -n ${4:-} ]] && args+=(-d "$4")
  docker exec "$HTTP" curl "${args[@]}" "$API$2"
}
code() { tail -n1 <<<"$1"; }
body() { sed '$d' <<<"$1"; }
js() { python3 -c "import json,sys; d=json.load(sys.stdin); print($1)"; }   # js <python expression over d>
sql() { docker exec "$SQL" psql -h host.docker.internal -U "$DB_USER" -d myfund -tAc "$1"; }
login() { body "$(api POST /auth/login "" "{\"identifier\":\"$1\",\"password\":\"1234\",\"role\":\"$2\"}")" | js 'd["token"]'; }

inv() { # inv <caller org:port:msp> <target orgs> <function> <args...>: direct invoke, bypassing the backend
  local caller=$1 targets=$2 fn=$3; shift 3
  local args; args=$(printf '"%s",' "$@"); args="{\"function\":\"$fn\",\"Args\":[${args%,}]}"
  # shellcheck disable=SC2046,SC2086
  peer_as "$caller" chaincode invoke "${ORDERER_ARGS[@]}" -C "$CHANNEL" -n "$CC_NAME" --waitForEvent \
    $(peer_targets $targets) -c "$args" 2>&1 |
    grep -oE "committed with status \([A-Z_]+\)|(FORBIDDEN|OVERSPEND|WRONG_AGENCY|NOT_FOUND|INVALID|DUPLICATE): [^\"]*" | head -1
}

wait_for() { # wait_for <seconds> <cmd...>: retry until the command succeeds
  local until=$((SECONDS + $1)); shift
  until "$@"; do (( SECONDS < until )) || return 1; sleep 3; done
}
api_answers() { [[ $(code "$(api GET /allocations)") != 000 ]]; }
seeded() { [[ $(body "$(api GET /transactions "$TOKEN_U")" | js 'len(d)' 2>/dev/null) == 10 ]]; }
reads_ok() { [[ $(code "$(api GET /allocations "$TOKEN_U")") == 200 ]]; }

cleanup() { docker rm -f "$HTTP" "$SQL" >/dev/null 2>&1; }
trap cleanup EXIT

# ---- preflight ----
[[ -n $DB_PW ]] || { echo "Set DB_PASSWORD, or put spring.datasource.password in backend application-local.properties." >&2; exit 2; }
docker run -d --rm --name "$HTTP" --entrypoint sleep curlimages/curl:8.11.1 infinity >/dev/null
docker run -d --rm --name "$SQL" -e PGPASSWORD="$DB_PW" postgres:18-alpine sleep infinity >/dev/null
if api_answers; then
  echo "The backend is running. Stop it first: verify.sh resets the chain and needs a fresh backend start to seed." >&2
  exit 2
fi

echo "== 1. From nothing: network up, backend start seeds 10 real records"
"$SC/network.sh" reset >/dev/null 2>&1
UP_LOG=$(mktemp)
"$SC/network.sh" up >"$UP_LOG" 2>&1
check "network.sh up from nothing" "Approvals: [AgencyMSP: true, AuditorMSP: true, MinistryMSP: true]" "$(cat "$UP_LOG")"
echo "      starting the backend in a new console window..."
# reset + up regenerate network/ from containers, which leaves this shell's working directory stale on drvfs;
# Windows interop (wslpath, powershell.exe) then fails silently until the directory is entered again.
cd "$NET_DIR"
# .\mvnw.cmd, not mvnw.cmd: cmd skips the current folder when NoDefaultCurrentDirectoryInExePath is set.
WIN_BACKEND=$(wslpath -w "$REPO/backend")
powershell.exe -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/k','title MyFund Backend && .\mvnw.cmd spring-boot:run' -WorkingDirectory '$WIN_BACKEND' -PassThru | ForEach-Object { '      backend console pid ' + \$_.Id }"
wait_for 300 api_answers || { echo "FAIL  backend did not start within 5 minutes" >&2; exit 1; }
TOKEN_M=$(login officer.mof@mof.gov.my ministry)
TOKEN_A=$(login director.nadma@nadma.gov.my agency)
TOKEN_U=$(login auditor.federal@audit.gov.my auditor)
wait_for 180 seeded
TXS=$(body "$(api GET /transactions "$TOKEN_U")")
check "10 seed transactions on the ledger" "10" "$(js 'len(d)' <<<"$TXS")"
check "every txId is a 64-hex Fabric id and equals txHash" "True" \
  "$(js 'all(len(t["blockchainRecord"]["txId"]) == 64 and t["txHash"] == t["blockchainRecord"]["txId"] for t in d)' <<<"$TXS")"
check "block numbers rise in business-date order" "True" \
  "$(js '(lambda b: all(x < y for x, y in zip(b, b[1:])))([t["blockchainRecord"]["blockNumber"] for t in reversed(d)])' <<<"$TXS")"
check "chaincode label from the ledger" "fund_cc:v1.0" "$(js 'set(t["blockchainRecord"]["chaincode"] for t in d)' <<<"$TXS")"
check "verification after seeding: copy matches" "10 []" \
  "$(body "$(api GET /verification "$TOKEN_U")" | js 'str(d["recordsChecked"]) + " " + str(d["discrepancies"])')"

echo "== 2. Ministry allocates, Agency distributes, balance updates"
R=$(api POST /allocations "$TOKEN_M" '{"programme":"verify.sh end-to-end check","receivingAgency":"National Disaster Management Agency (NADMA)","amount":1000}')
check "Ministry allocates RM 1,000.00 to NADMA" "201" "$(code "$R")"
ALC=$(body "$R" | js 'd["allocation"]["id"]')
R=$(api POST /distributions "$TOKEN_A" "{\"allocationId\":\"$ALC\",\"beneficiaryName\":\"verify.sh beneficiary\",\"amount\":400}")
check "NADMA distributes RM 400.00 from $ALC" "201" "$(code "$R")"
check "remaining balance is RM 600.00 on the ledger" "600.0" \
  "$(body "$(api GET /allocations "$TOKEN_U")" | js "[a['remainingAmount'] for a in d if a['id'] == '$ALC']")"

echo "== 3. Contract rules: overspend, wrong agency, wrong org (through the API and directly on the peers)"
R=$(api POST /distributions "$TOKEN_A" "{\"allocationId\":\"$ALC\",\"beneficiaryName\":\"x\",\"amount\":600.01}")
check "API: overspend by 1 sen is 409 with the remaining balance" "409" "$(code "$R")"
check "API: overspend message" "Amount exceeds remaining allocation balance (RM 600.00)." "$(body "$R")"
R=$(api POST /distributions "$TOKEN_A" '{"allocationId":"ALC-2026-004","beneficiaryName":"x","amount":1}')
check "API: NADMA spending YKK's allocation is 403" "403 This allocation belongs to another agency." \
  "$(code "$R") $(body "$R" | js 'd["message"]')"
check "API: Agency user cannot create allocations" "403" \
  "$(code "$(api POST /allocations "$TOKEN_A" '{"programme":"x","receivingAgency":"x","amount":1}')")"
M=${PEERS[0]} A=${PEERS[1]} U=${PEERS[2]} D=2026-11-01T00:00:00Z
check "direct: overspend refused by the contract" "OVERSPEND" "$(inv "$A" 'agency auditor' CreateDistribution DST-V1 "$ALC" 'National Disaster Management Agency (NADMA)' x 1 60001 d $D)"
check "direct: wrong agency refused by the contract" "WRONG_AGENCY" "$(inv "$A" 'agency auditor' CreateDistribution DST-V2 "$ALC" 'Yayasan Kebajikan Komuniti (YKK)' x 1 1 d $D)"
check "direct: Agency org calling CreateAllocation refused" "FORBIDDEN" "$(inv "$A" 'ministry auditor' CreateAllocation ALC-V1 P NADMA 1 d s r MOF $D)"
check "direct: Agency peer endorsing an allocation refused" "FORBIDDEN" "$(inv "$M" 'agency auditor' CreateAllocation ALC-V2 P NADMA 1 d s r MOF $D)"
check "direct: Ministry peer alone fails the endorsement policy" "ENDORSEMENT_POLICY_FAILURE" "$(inv "$M" 'ministry' CreateAllocation ALC-V3 P NADMA 1 d s r MOF $D)"
R=$(api POST /distributions "$TOKEN_A" "{\"allocationId\":\"$ALC\",\"beneficiaryName\":\"verify.sh beneficiary\",\"amount\":600}")
check "API: spending exactly the remaining RM 600.00 is allowed" "201 0.0" "$(code "$R") $(body "$R" | js 'd["allocation"]["remainingAmount"]')"

echo "== 4. Tampering with the Postgres copy is detected; the app keeps showing the ledger"
ORIG=$(sql "select distributed_amount from allocations where id = 'ALC-2026-001'")
sql "update allocations set distributed_amount = 1.00 where id = 'ALC-2026-001'" >/dev/null
check "app still shows the ledger figure (11,250,000) for ALC-2026-001" "[11250000.0]" \
  "$(body "$(api GET /allocations "$TOKEN_U")" | js "[a['distributedAmount'] for a in d if a['id'] == 'ALC-2026-001']")"
check "verification reports VALUE_MISMATCH on distributedAmount" "VALUE_MISMATCH distributedAmount 11250000.00 1.00" \
  "$(body "$(api GET /verification "$TOKEN_U")" | js "' '.join(f\"{x['type']} {x['field']} {x['chainValue']} {x['copyValue']}\" for x in d['discrepancies'] if x['recordId'] == 'ALC-2026-001')")"
sql "create table verify_backup as select * from distributions where id = 'DST-2026-006'; delete from distributions where id = 'DST-2026-006'" >/dev/null
check "verification reports DST-2026-006 MISSING_FROM_COPY" "DST-2026-006 MISSING_FROM_COPY" \
  "$(body "$(api GET /verification "$TOKEN_U")" | js "' '.join(f\"{x['recordId']} {x['type']}\" for x in d['discrepancies'] if x['type'] == 'MISSING_FROM_COPY')")"
sql "update allocations set distributed_amount = $ORIG where id = 'ALC-2026-001'; insert into distributions select * from verify_backup; drop table verify_backup" >/dev/null
check "copy restored: verification clean again" "[]" "$(body "$(api GET /verification "$TOKEN_U")" | js 'd["discrepancies"]')"

echo "== 5. Node failures: one orderer down, then the Auditor peer down"
docker stop orderer1.orderer.myfund.local >/dev/null
sleep 10   # Raft elects a new leader if orderer1 led
check "write succeeds with orderer1 stopped" "201" "$(code "$(api POST /allocations "$TOKEN_M" '{"programme":"verify.sh orderer failover check","receivingAgency":"National Disaster Management Agency (NADMA)","amount":1}')")"
docker start orderer1.orderer.myfund.local >/dev/null
docker stop peer0.auditor.myfund.local >/dev/null
R=$(api POST /allocations "$TOKEN_M" '{"programme":"verify.sh must not commit","receivingAgency":"National Disaster Management Agency (NADMA)","amount":1}')
check "write fails while the Auditor peer is down (503, clear message)" "503 The blockchain network is unavailable" \
  "$(code "$R") $(body "$R" | js 'd["message"]')"
check "reads still work with the Auditor peer down" "200" "$(code "$(api GET /allocations "$TOKEN_U")")"
docker start peer0.auditor.myfund.local >/dev/null

echo "== 6. network.sh down, then up: data intact"
BEFORE=$(body "$(api GET /transactions "$TOKEN_U")" | js 'json.dumps(d, sort_keys=True)')
"$SC/network.sh" down >/dev/null 2>&1
check "reads fail clearly while the network is down" "503" "$(code "$(api GET /allocations "$TOKEN_U")")"
"$SC/network.sh" up >/dev/null 2>&1
wait_for 180 reads_ok
AFTER=$(body "$(api GET /transactions "$TOKEN_U")" | js 'json.dumps(d, sort_keys=True)')
check "same transactions after down + up" "same" "$([[ -n $BEFORE && $BEFORE == "$AFTER" ]] && echo same || echo differs)"
check "verification clean after down + up" "[]" "$(body "$(api GET /verification "$TOKEN_U")" | js 'd["discrepancies"]')"

echo
echo "$((CHECKS - FAILS))/$CHECKS checks passed."
(( FAILS == 0 ))
