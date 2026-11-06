#!/usr/bin/env bash
# MyFund Fabric network. Run inside WSL (Ubuntu):
#   ./network.sh up      create crypto + channel if missing, start containers, join every node,
#                        deploy fund_cc as a service (safe to re-run)
#   ./network.sh down    stop containers, keep ledger data
#   ./network.sh reset   stop containers and wipe ledger data, crypto and channel files
#   ./network.sh status  show channel membership and heights
# Sourcing this file (verify.sh does) loads the helpers without running a command.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/network"
NET_DIR=$PWD
TOOLS_IMAGE=hyperledger/fabric-tools:2.5.16   # keep in step with compose.yaml
CHANNEL=myfund-channel
ORDERERS=(orderer1:7053 orderer2:8053 orderer3:9053)
PEERS=(ministry:7051:MinistryMSP agency:9051:AgencyMSP auditor:11051:AuditorMSP)
OORG=organizations/ordererOrganizations/orderer.myfund.local
OADMIN_TLS=$OORG/users/Admin@orderer.myfund.local/tls

CC_NAME=fund_cc
CC_VERSION=1.0
CC_SEQUENCE=1
CC_LABEL=${CC_NAME}_$CC_VERSION
CC_IMAGE=myfund/fund-cc:$CC_VERSION   # keep in step with compose.yaml
# One policy per contract; FundContract's guards pick the right peers per function (see smart-contract/PLAN.md).
CC_POLICY="AND('AuditorMSP.peer',OR('MinistryMSP.peer','AgencyMSP.peer'))"
ORDERER_ARGS=(-o orderer1.orderer.myfund.local:7050 --tls --cafile "/work/$OORG/tlsca/tlsca.orderer.myfund.local-cert.pem")

# Fabric CLI tools in a throwaway container, writing files as the WSL user. Extra docker args go before "--".
tools() {
  local args=()
  while [[ $1 != -- ]]; do args+=("$1"); shift; done; shift
  docker run --rm --user "$(id -u):$(id -g)" -v "$NET_DIR:/work" -w /work "${args[@]}" "$TOOLS_IMAGE" "$@"
}

retry() { # retry <attempts> <cmd...>: nodes need a few seconds after start
  local n=$1; shift
  for ((i = 1; i <= n; i++)); do "$@" && return 0; sleep 2; done
  return 1
}

osn() { # osn <orderer:adminport> <osnadmin channel subcommand and args>
  local host=${1%%:*}.orderer.myfund.local port=${1##*:}; shift
  tools --network myfund -- osnadmin channel "$@" -o "$host:$port" \
    --ca-file "$OORG/tlsca/tlsca.orderer.myfund.local-cert.pem" \
    --client-cert "$OADMIN_TLS/client.crt" --client-key "$OADMIN_TLS/client.key"
}

peer_tls() { # peer_tls <org>: TLS root cert of that org's peer0, as seen inside the tools container
  echo "/work/organizations/peerOrganizations/$1.myfund.local/peers/peer0.$1.myfund.local/tls/ca.crt"
}

peer_as() { # peer_as <org:port:msp> <peer CLI args>: runs as that org's admin against its peer0
  local org port msp
  IFS=: read -r org port msp <<<"$1"; shift
  tools --network myfund \
    -e CORE_PEER_TLS_ENABLED=true -e CORE_PEER_LOCALMSPID="$msp" \
    -e CORE_PEER_ADDRESS="peer0.$org.myfund.local:$port" \
    -e CORE_PEER_TLS_ROOTCERT_FILE="$(peer_tls "$org")" \
    -e CORE_PEER_MSPCONFIGPATH="/work/organizations/peerOrganizations/$org.myfund.local/users/Admin@$org.myfund.local/msp" \
    -- peer "$@"
}

peer_targets() { # peer_targets <org>...: --peerAddresses/--tlsRootCertFiles args for those orgs' peers
  local org p
  for org in "$@"; do
    for p in "${PEERS[@]}"; do
      if [[ ${p%%:*} == "$org" ]]; then
        echo "--peerAddresses peer0.$org.myfund.local:$(cut -d: -f2 <<<"$p") --tlsRootCertFiles $(peer_tls "$org")"
      fi
    done
  done
}

# Writes one chaincode-as-a-service package per org (connection.json points at that org's fund_cc container)
# and the env file holding its package ID. Tarred deterministically, so the ID only changes with the TLS CA.
package_cc() {
  local p org tls dir id
  for p in "${PEERS[@]}"; do
    org=${p%%:*}
    tls=organizations/peerOrganizations/$org.myfund.local/peers/fundcc.$org.myfund.local/tls
    base64 -w0 "$tls/server.crt" >"$tls/server.crt.b64"   # see CORE_TLS_CLIENT_*_PATH in compose.yaml
    base64 -w0 "$tls/server.key" >"$tls/server.key.b64"
    dir=channel-artifacts/cc/$org
    mkdir -p "$dir"
    printf '{"address":"fundcc.%s.myfund.local:9999","dial_timeout":"10s","tls_required":true,"client_auth_required":false,"root_cert":"%s"}\n' \
      "$org" "$(awk 'NF {printf "%s\\n", $0}' "organizations/peerOrganizations/$org.myfund.local/tlsca/tlsca.$org.myfund.local-cert.pem")" \
      >"$dir/connection.json"
    printf '{"type":"ccaas","label":"%s"}\n' "$CC_LABEL" >"$dir/metadata.json"
    tar --sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner -C "$dir" -cf - connection.json | gzip -n >"$dir/code.tar.gz"
    tar --sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner -C "$dir" -cf - code.tar.gz metadata.json | gzip -n >"$dir/$CC_NAME.tar.gz"
    id=$CC_LABEL:$(sha256sum "$dir/$CC_NAME.tar.gz" | cut -d' ' -f1)
    echo "CORE_CHAINCODE_ID_NAME=$id" >"channel-artifacts/fundcc-$org.env"
  done
}

cc_id() { cut -d= -f2 "channel-artifacts/fundcc-$1.env"; }

deploy_cc() {
  if peer_as "${PEERS[0]}" lifecycle chaincode querycommitted -C "$CHANNEL" -n "$CC_NAME" >/dev/null 2>&1; then
    echo "$CC_NAME: already committed"; return
  fi
  local p org
  for p in "${PEERS[@]}"; do
    org=${p%%:*}
    if peer_as "$p" lifecycle chaincode queryinstalled 2>/dev/null | grep -qF "$(cc_id "$org")"; then
      echo "peer0.$org: $CC_NAME already installed"
    else
      echo "peer0.$org: installing $CC_NAME"
      peer_as "$p" lifecycle chaincode install "/work/channel-artifacts/cc/$org/$CC_NAME.tar.gz"
    fi
    if peer_as "$p" lifecycle chaincode queryapproved -C "$CHANNEL" -n "$CC_NAME" --sequence "$CC_SEQUENCE" >/dev/null 2>&1; then
      echo "${p##*:}: already approved"
    else
      echo "${p##*:}: approving $CC_NAME"
      peer_as "$p" lifecycle chaincode approveformyorg "${ORDERER_ARGS[@]}" -C "$CHANNEL" -n "$CC_NAME" \
        -v "$CC_VERSION" --sequence "$CC_SEQUENCE" --package-id "$(cc_id "$org")" --signature-policy "$CC_POLICY"
    fi
  done
  echo "Committing $CC_NAME definition"
  # shellcheck disable=SC2046 # peer_targets output is meant to split into args
  peer_as "${PEERS[0]}" lifecycle chaincode commit "${ORDERER_ARGS[@]}" -C "$CHANNEL" -n "$CC_NAME" \
    -v "$CC_VERSION" --sequence "$CC_SEQUENCE" --signature-policy "$CC_POLICY" \
    $(peer_targets ministry agency auditor)
}

up() {
  if [[ ! -d organizations ]]; then
    if docker volume inspect myfund_orderer1 >/dev/null 2>&1; then
      echo "Crypto material is missing but ledger volumes exist. Run ./network.sh reset first." >&2; exit 1
    fi
    echo "Generating crypto material..."
    tools -- cryptogen generate --config=crypto-config.yaml --output=organizations
  fi
  if [[ ! -f channel-artifacts/$CHANNEL.block ]]; then
    echo "Generating channel genesis block..."
    mkdir -p channel-artifacts
    tools -- configtxgen -configPath /work -profile MyFundChannel -channelID "$CHANNEL" \
      -outputBlock "channel-artifacts/$CHANNEL.block"
  fi
  # shortcut: rebuilds in place under the same version; a changed contract needs a version + sequence bump.
  echo "Building $CC_IMAGE (runs the contract unit tests)..."
  docker build -q -t "$CC_IMAGE" ../chaincode >/dev/null
  package_cc

  docker compose up -d

  local o p
  for o in "${ORDERERS[@]}"; do
    if retry 15 osn "$o" list 2>/dev/null | grep -q "\"$CHANNEL\""; then
      echo "${o%%:*}: already joined"
    else
      echo "${o%%:*}: joining $CHANNEL"
      osn "$o" join --channelID "$CHANNEL" --config-block "channel-artifacts/$CHANNEL.block"
    fi
  done
  for p in "${PEERS[@]}"; do
    if retry 15 peer_as "$p" channel list 2>/dev/null | grep -qx "$CHANNEL"; then
      echo "peer0.${p%%:*}: already joined"
    else
      echo "peer0.${p%%:*}: joining $CHANNEL"
      retry 5 peer_as "$p" channel join -b "/work/channel-artifacts/$CHANNEL.block"
    fi
  done
  deploy_cc
  status
}

status() {
  local o p
  echo; echo "== Orderers =="
  for o in "${ORDERERS[@]}"; do echo "${o%%:*}: $(retry 10 osn "$o" list --channelID "$CHANNEL" 2>/dev/null | tr -d '\n\t ')"; done
  echo "== Peers =="
  for p in "${PEERS[@]}"; do echo "peer0.${p%%:*}: $(retry 10 peer_as "$p" channel getinfo -c "$CHANNEL" 2>/dev/null | grep -o '{.*}')"; done
  echo "== Contract =="
  peer_as "${PEERS[0]}" lifecycle chaincode querycommitted -C "$CHANNEL" -n "$CC_NAME" 2>/dev/null || echo "$CC_NAME: not committed"
}

main() {
  case "${1:-}" in
    up) up ;;
    status) status ;;
    down) docker compose down ;;
    reset)
      docker compose down -v --remove-orphans
      tools -- rm -rf organizations channel-artifacts   # same user that created them
      ;;
    *) echo "usage: $0 up|down|reset|status" >&2; exit 1 ;;
  esac
}

if [[ ${BASH_SOURCE[0]} == "$0" ]]; then main "$@"; fi
