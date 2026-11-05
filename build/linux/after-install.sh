#!/bin/bash
ln -sfn /opt/teams-client/teams-client /usr/bin/teams-client
chmod 644 /usr/share/icons/hicolor/256x256/apps/teams-client.png
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f /usr/share/icons/hicolor >/dev/null 2>&1 || true
fi
