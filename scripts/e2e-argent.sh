#!/usr/bin/env bash
# End-to-end runner for the Argent flows in .argent/flows/ (iOS simulator).
#
# Usage:
#   scripts/e2e-argent.sh [flow-name ...] [--device <udid>] [--output <dir>] [--all]
#   bun run e2e -- create-habit --device <udid>
#
#   flow-name   Name of a flow under .argent/flows (without .yaml). Several may be
#               given; each is run on a freshly reset app. Default: every flow
#               under .argent/flows/ (same as --all).
#   --all       Run every .argent/flows/*.yaml. Redundant with the no-args
#               default, kept for explicitness.
#
# Flow set: create-habit.yaml is a shared seed fixture (composed via `run:`
# by the others) and also runs standalone as part of the default/--all sweep.
# The actual regression suite is qa-habit-{create,toggle,edit,delete}.yaml —
# each does its own baseline normalization, persistence-across-restart proof,
# and cleanup, so they're safe to run in any order or repeatedly.
#   --device    Simulator UDID (or set DEVICE_UDID). Default: auto-detect a booted
#               iOS simulator that has the app installed.
#   --output    Directory for failed-snapshot artifacts (default: e2e-artifacts;
#               or set E2E_OUTPUT_DIR). Handy for CI artifact upload.
#   --no-reset  Skip the app-state reset (debugging only).
#
# Env: DEVICE_UDID, BUNDLE_ID (default com.robbywh.habittracker), E2E_OUTPUT_DIR.
# Exits non-zero if any flow fails or setup fails.
#
# Prerequisites: the app (a dev-client build, from `bun expo run:ios`) is already
# installed on a booted simulator, and Metro is running (`bun run start`) so the
# dev client can load the JS bundle. We deliberately do NOT boot a simulator:
# a freshly booted device would not have the app installed, so the run could not
# succeed anyway. We fail fast with instructions instead.
#
# How app state is reset (why flows are repeatable):
#   The flows assume an empty habit list ("No habits yet"). The app persists
#   habits with @react-native-async-storage/async-storage, which on iOS stores
#   everything in <data container>/Library/Application Support/<bundleId>/
#   RCTAsyncLocalStorage_V1/ (small values inline in manifest.json, larger ones
#   in MD5-named sibling files). We terminate the app (AsyncStorage keeps an
#   in-memory cache, so a running app would write it back) and delete that
#   directory; on next launch the app sees no stored habits.
#   This was chosen over uninstall + reinstall because there is no prebuilt .app
#   in the repo (ios/build has none), so reinstalling would need a full native
#   rebuild each run, and uninstalling also wipes expo-dev-client state (the
#   remembered Metro URL), which would leave the flow stuck on the dev launcher.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

BUNDLE_ID="${BUNDLE_ID:-com.robbywh.habittracker}"
DEVICE="${DEVICE_UDID:-}"
OUTPUT_DIR="${E2E_OUTPUT_DIR:-e2e-artifacts}"
RESET=1
RUN_ALL=0
FLOWS=()

if [ -t 1 ]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; BOLD=$'\033[1m'; RESET_C=$'\033[0m'
else
  RED=""; GREEN=""; BOLD=""; RESET_C=""
fi

log()  { printf '%s[e2e]%s %s\n' "$BOLD" "$RESET_C" "$*"; }
die()  { printf '%s[e2e] ERROR:%s %s\n' "$RED" "$RESET_C" "$*" >&2; exit 2; }

while [ $# -gt 0 ]; do
  case "$1" in
    --device)   [ $# -ge 2 ] || die "--device needs a value"; DEVICE="$2"; shift 2 ;;
    --device=*) DEVICE="${1#*=}"; shift ;;
    --output)   [ $# -ge 2 ] || die "--output needs a value"; OUTPUT_DIR="$2"; shift 2 ;;
    --output=*) OUTPUT_DIR="${1#*=}"; shift ;;
    --all)      RUN_ALL=1; shift ;;
    --no-reset) RESET=0; shift ;;
    -h|--help)  sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    --)         shift; FLOWS+=("$@"); break ;;
    -*)         die "unknown option: $1" ;;
    *)          FLOWS+=("${1%.yaml}"); shift ;;
  esac
done

# --- resolve flows ----------------------------------------------------------
# No flow names given (and no --all) means "run everything" too, so a bare
# `bun run e2e` picks up new flows under .argent/flows/ without edits here.
if [ "$RUN_ALL" -eq 1 ] || [ "${#FLOWS[@]}" -eq 0 ]; then
  FLOWS=()
  for f in .argent/flows/*.yaml; do
    [ -e "$f" ] && FLOWS+=("$(basename "$f" .yaml)")
  done
  [ "${#FLOWS[@]}" -gt 0 ] || die "no flows found in .argent/flows/"
fi
for flow in "${FLOWS[@]}"; do
  [ -f ".argent/flows/$flow.yaml" ] || die "flow not found: .argent/flows/$flow.yaml"
done

# --- resolve argent CLI (project devDependency first, then global) ----------
if [ -x "$ROOT_DIR/node_modules/.bin/argent" ]; then
  ARGENT=("$ROOT_DIR/node_modules/.bin/argent")
elif command -v argent >/dev/null 2>&1; then
  ARGENT=(argent)
else
  die "argent CLI not found. Run 'bun install' (it is a devDependency) or 'npm i -g @swmansion/argent'."
fi

command -v xcrun >/dev/null 2>&1 || die "xcrun not found; this script needs macOS with Xcode."
command -v node  >/dev/null 2>&1 || die "node not found (needed to parse simctl JSON)."

app_installed() { xcrun simctl get_app_container "$1" "$BUNDLE_ID" app >/dev/null 2>&1; }

# --- resolve device -----------------------------------------------------------
BOOTED="$(xcrun simctl list devices booted -j | node -e '
  let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
    const devs = JSON.parse(s).devices;
    for (const [rt, list] of Object.entries(devs))
      if (rt.includes("SimRuntime.iOS"))
        for (const d of list) if (d.state === "Booted") console.log(d.udid + "\t" + d.name);
  });')"

if [ -n "$DEVICE" ]; then
  printf '%s\n' "$BOOTED" | cut -f1 | grep -qx "$DEVICE" \
    || die "simulator $DEVICE is not booted. Boot it first: xcrun simctl boot $DEVICE && open -a Simulator"
else
  [ -n "$BOOTED" ] || die "no booted iOS simulator found. Boot one (e.g. 'bun run ios' or 'xcrun simctl boot <udid>') with $BUNDLE_ID installed, or pass --device <udid>."
  while IFS=$'\t' read -r udid name; do
    if app_installed "$udid"; then DEVICE="$udid"; break; fi
  done <<< "$BOOTED"
  [ -n "$DEVICE" ] || die "no booted simulator has $BUNDLE_ID installed. Install it with 'bun expo run:ios'."
fi
DEVICE_NAME="$(printf '%s\n' "$BOOTED" | awk -F'\t' -v u="$DEVICE" '$1==u {print $2}')"
app_installed "$DEVICE" || die "$BUNDLE_ID is not installed on $DEVICE. Install it with 'bun expo run:ios'."

log "device:  $DEVICE_NAME ($DEVICE)"
log "app:     $BUNDLE_ID"
log "flows:   ${FLOWS[*]}"

# --- reset app state -------------------------------------------------------------
reset_app_state() {
  local data_dir storage_dir
  data_dir="$(xcrun simctl get_app_container "$DEVICE" "$BUNDLE_ID" data)" \
    || die "could not resolve the data container for $BUNDLE_ID"
  storage_dir="$data_dir/Library/Application Support/$BUNDLE_ID/RCTAsyncLocalStorage_V1"
  # Terminate first; ignore "not running".
  xcrun simctl terminate "$DEVICE" "$BUNDLE_ID" >/dev/null 2>&1 || true
  rm -rf "$storage_dir"
  [ ! -e "$storage_dir" ] || die "failed to clear $storage_dir"
  log "reset:   cleared AsyncStorage ($storage_dir)"
}

# --- run ----------------------------------------------------------------------
PASSED=(); FAILED=()
for flow in "${FLOWS[@]}"; do
  printf '\n'
  log "=== $flow ==="
  [ "$RESET" -eq 1 ] && reset_app_state
  set +e
  "${ARGENT[@]}" flow run "$flow" --platform ios --device "$DEVICE" --output "$OUTPUT_DIR"
  code=$?
  set -e
  if [ "$code" -eq 0 ]; then
    PASSED+=("$flow"); printf '%s[e2e] PASS%s %s\n' "$GREEN" "$RESET_C" "$flow"
  else
    FAILED+=("$flow"); printf '%s[e2e] FAIL%s %s (exit %s)\n' "$RED" "$RESET_C" "$flow" "$code"
  fi
done

printf '\n'
log "summary: ${#PASSED[@]} passed, ${#FAILED[@]} failed"
if [ "${#FAILED[@]}" -gt 0 ]; then
  printf '%s[e2e] FAILED:%s %s (artifacts: %s/)\n' "$RED" "$RESET_C" "${FAILED[*]}" "$OUTPUT_DIR"
  exit 1
fi
printf '%s[e2e] ALL PASSED%s\n' "$GREEN" "$RESET_C"
