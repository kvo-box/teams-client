#!/bin/bash
# rpm: 0 on uninstall, 1 on upgrade.
# deb: remove/purge on uninstall, upgrade while the new package is installed.
case "$1" in
  0|remove|purge)
    rm -f /usr/bin/teams-client
    ;;
esac
