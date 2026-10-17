# Read by `bash -s` from wsl.exe stdin. stdout belongs to the bridge protocol,
# so setup output goes to stderr. The final line must be the bridge `exec`:
# bash reads this script byte by byte, and the desktop's frames follow it.
set -eu
umask 077
exec 3>&1 1>&2
SOURCE=$(wslpath -u "$1")
BASE="$HOME/.monocode/remote"
DATA="$BASE/data"
SOCKET="$BASE/run/rpc.sock"
mkdir -p "$BASE/host" "$BASE/run"
chmod 700 "$BASE" "$BASE/host" "$BASE/run"
# Serialize installation, migration and pairing across desktop windows.
exec 9>"$BASE/run/setup.lock"
flock -w 60 9 || { echo 'Another WSL setup is still running. Retry shortly.'; exit 1; }

case "$(uname -m)" in
  x86_64|amd64) ARCH=x64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) echo 'Unsupported WSL architecture.'; exit 1 ;;
esac
[ "$(cat "$SOURCE/ARCH")" = "$ARCH" ] || { echo 'This MonoCode build does not match the WSL architecture.'; exit 1; }
# Version directories are immutable: a name is the release plus the hash of
# its checksum manifest, and only a fully verified copy is renamed into place.
VERSION=$(tr -cd '0-9A-Za-z.+-' < "$SOURCE/VERSION")
SUMS=$(sha256sum < "$SOURCE/SHA256SUMS" | cut -c1-12)
RUNTIME="$BASE/host/$VERSION-$SUMS"
if [ ! -f "$RUNTIME/SHA256SUMS" ]; then
  TMP=$(mktemp -d "$BASE/host/.copy.XXXXXXXX")
  trap 'chmod -R u+w "$TMP" 2>/dev/null; rm -rf "$TMP"' EXIT
  cp -R "$SOURCE/." "$TMP/"
  [ "$(sha256sum < "$TMP/SHA256SUMS" | cut -c1-12)" = "$SUMS" ] \
    || { echo 'The MonoCode installation changed during WSL setup. Retry the connection.'; exit 1; }
  (cd "$TMP" && sha256sum --quiet -c SHA256SUMS) \
    || { echo 'The WSL Host runtime failed verification. Reinstall MonoCode.'; exit 1; }
  chmod 755 "$TMP" "$TMP/bin" "$TMP/bin/node"
  chmod -R a-w "$TMP"
  mv "$TMP" "$RUNTIME"
  trap - EXIT
fi

# One-time move from the TCP-forwarded layout. Stopping the old Host lets the
# database move intact; its sessions, identity and credential are kept.
OLD="$HOME/.monocode-wsl"
if [ -f "$OLD/host/host.db" ] && [ ! -e "$DATA" ]; then
  PID=$(sed -n 's/.*"pid":\([0-9]*\).*/\1/p' "$OLD/host/running.json" 2>/dev/null || true)
  if [ -n "$PID" ] && tr '\0' '\n' < "/proc/$PID/cmdline" 2>/dev/null | grep -qxF "$OLD/host"; then
    kill -TERM "$PID"
    for _ in $(seq 150); do [ -d "/proc/$PID" ] || break; sleep 0.2; done
    [ ! -d "/proc/$PID" ] || { echo 'Could not stop the previous WSL Host. Retry the connection.'; exit 1; }
  fi
  mv "$OLD/host" "$DATA"
  rm -rf "$OLD"
fi

# Remove versions that no running process still uses. The path goes through
# the environment so the search process's own arguments never match it.
for DIR in "$BASE/host"/*; do
  [ -d "$DIR" ] && [ "$DIR" != "$RUNTIME" ] || continue
  if ! cat /proc/[0-9]*/cmdline 2>/dev/null | tr '\0' '\n' \
    | USED="$DIR/" awk 'index($0, ENVIRON["USED"]) == 1 { found = 1 } END { exit !found }'; then
    chmod -R u+w "$DIR" && rm -rf "$DIR"
  fi
done

export PATH="$RUNTIME/bin:$HOME/.local/bin:$PATH"
"$RUNTIME/bin/node" "$RUNTIME/wsl-bridge.mjs" prepare "$RUNTIME/host.mjs" "$DATA" "$SOCKET" 9>&-
exec 9>&- 1>&3 3>&-
exec "$RUNTIME/bin/node" "$RUNTIME/wsl-bridge.mjs" bridge "$RUNTIME/host.mjs" "$DATA" "$SOCKET"
