# CinePurr Droplet Auto-Deploy

This repo includes a droplet-side deploy script and `systemd` timer so production can update without GitHub-hosted Actions billing.

## What it does

- checks `origin/main` once per minute
- pulls new commits with `git pull --ff-only`
- runs `docker compose up -d --build --remove-orphans`
- skips if nothing changed
- refuses to deploy if the droplet repo has local uncommitted changes

## Install on the droplet

From `/root/CinePurr`:

```bash
chmod +x /root/CinePurr/scripts/deploy-prod.sh
cp /root/CinePurr/deploy/cinepurr-autodeploy.service /etc/systemd/system/
cp /root/CinePurr/deploy/cinepurr-autodeploy.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now cinepurr-autodeploy.timer
```

## Check status

```bash
systemctl status cinepurr-autodeploy.timer
systemctl status cinepurr-autodeploy.service
systemctl list-timers | grep cinepurr
journalctl -u cinepurr-autodeploy.service -f
```

## Manual deploy test

```bash
/bin/bash /root/CinePurr/scripts/deploy-prod.sh
```

## Notes

- The service assumes the repo lives at `/root/CinePurr`. If your path changes, update both systemd unit files.
- The GitHub Actions workflow was kept as `workflow_dispatch` only, so it no longer auto-fails on every push while billing is unresolved.
