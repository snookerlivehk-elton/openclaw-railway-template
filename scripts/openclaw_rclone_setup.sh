#!/bin/bash
set -euo pipefail
WORKSPACE="${WORKSPACE:-/data/workspace}"
EMAIL="${EMAIL:-info.j18.hk@gmail.com}"
APP_PASSWORD="${APP_PASSWORD:-lmwovcqjosaqians}"
CLIENT_ID="${CLIENT_ID:-855956380197-bokefikbhf7mhe808ie2idqopu0k6mt7.apps.googleusercontent.com}"
if [ -x "$WORKSPACE/rclone" ]; then
  RCLONE_BIN="$WORKSPACE/rclone"
elif [ -x "$WORKSPACE/rclone/rclone" ]; then
  RCLONE_BIN="$WORKSPACE/rclone/rclone"
elif command -v rclone >/dev/null 2>&1; then
  RCLONE_BIN="$(command -v rclone)"
else
  echo "rclone not found"; exit 1
fi
mkdir -p "$WORKSPACE/.rclone"
CONF_REAL="$WORKSPACE/.rclone/.rclone.conf"
CONF_LINK="$HOME/.rclone.conf"
touch "$CONF_REAL"
ln -sf "$CONF_REAL" "$CONF_LINK"
if ! "$RCLONE_BIN" listremotes --config "$CONF_LINK" 2>/dev/null | grep -q '^gdrive:$'; then
  "$RCLONE_BIN" config create gdrive drive scope drive client_id "$CLIENT_ID" --config "$CONF_LINK"
fi
"$RCLONE_BIN" config reconnect gdrive: --config "$CONF_LINK" --headless
MSG_FILE="$(mktemp)"
printf "From: %s\nTo: %s\nSubject: Railway rclone Test 📈\nDate: %s\nMIME-Version: 1.0\nContent-Type: text/plain; charset=UTF-8\nContent-Transfer-Encoding: 8bit\n\nSMTP test from Railway OpenClaw.\n" "$EMAIL" "$EMAIL" "$(date -R)" > "$MSG_FILE"
curl -fsS --url "smtps://smtp.gmail.com:465" --ssl-reqd --user "$EMAIL:$APP_PASSWORD" --mail-from "$EMAIL" --mail-rcpt "$EMAIL" --upload-file "$MSG_FILE" >/dev/null
echo "smtp_send=ok"
IMAP_SEARCH_OUT="$(curl -fsS --user "$EMAIL:$APP_PASSWORD" "imaps://imap.gmail.com/INBOX" -X "UID SEARCH ALL")"
UIDS="$(printf "%s\n" "$IMAP_SEARCH_OUT" | tr -cd '0-9 \n' | tr ' ' '\n' | grep -E '^[0-9]+$' | tail -n 5)"
for uid in $UIDS; do
  curl -fsS --user "$EMAIL:$APP_PASSWORD" "imaps://imap.gmail.com/INBOX;UID=$uid" -X "FETCH $uid BODY[HEADER.FIELDS (From Subject Date)]" || true
  echo "---"
done
echo "imap_fetch=ok"
"$RCLONE_BIN" ls gdrive: --config "$CONF_LINK" >/dev/null && echo "rclone_ls=ok" || echo "rclone_ls=unauthorized"
echo "demo at $(date -u +%FT%TZ)" > "$WORKSPACE/demo.txt"
"$RCLONE_BIN" copyto "$WORKSPACE/demo.txt" "gdrive:demo.txt" --config "$CONF_LINK"
echo "rclone_upload=ok"
echo "config_path=$CONF_REAL"
