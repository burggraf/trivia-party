# Private VPS test server

This setup is for the development copy at `/root/dev/trivia-party` on the VPS,
not production at `trivia.azabab.com`. It uses the imported test database and
PocketBase **0.40.5**, matching the source Mac. No default users or passwords are created.

## Everyday commands (on the VPS)

```bash
# Start both services
systemctl start trivia-test.target

# Stop both services (leaves all data intact)
systemctl stop trivia-test.target trivia-test-frontend.service trivia-test-pocketbase.service

# Restart both after configuration changes or a version bump
systemctl restart trivia-test.target

# Check both processes; a target's status alone isn't enough
systemctl status trivia-test-pocketbase.service trivia-test-frontend.service

# Follow logs; Ctrl+C stops viewing logs, not the services
journalctl -u trivia-test-pocketbase -u trivia-test-frontend -f
```

Open **http://100.75.212.39:15173/** from a device on the same Tailscale network.
Use an existing host login from the copied test database. Changes here do not sync
back to the Mac or to production. Use a private browser window after replacing a
database so an old authentication session does not cause confusion.

The stop command names all units so it waits for both processes to exit before
returning (important before copying a database).

The services are installed but **not enabled at boot**. They survive closing SSH
or the coding session; start the target again after reboot. They run as root
because the existing checkout and binary are under `/root`; do not expose this
development environment publicly.

## Network and port allocation

| Service | Binding | Purpose |
| --- | --- | --- |
| Vite | `100.75.212.39:15173` | Tailscale-only browser entry point |
| PocketBase | `127.0.0.1:18090` | Private backend, not directly reachable remotely |

The browser uses its own origin for `/api`, including file URLs and realtime
subscriptions. Vite proxies those requests to the loopback backend. Production
continues using its existing Nginx proxy. Ordinary local `pnpm dev` defaults to
PocketBase on loopback port 8090; set `TRIVIA_POCKETBASE_PORT` to override it.

Tailscale provides private routing, **not port allocation**: two projects cannot
bind the same address and port. This project reserves **15173 and 18090** on this
VPS. Give other projects different ports. Vite uses `--strictPort`, so a conflict
fails visibly rather than silently changing the URL; PocketBase also fails on a
conflicting bind. Never kill an unrelated listener to free a port.

```bash
ss -ltnp '( sport = :15173 or sport = :18090 )'
```

Configuration lives in `/etc/trivia-party-test.env`. To change ports, stop the
target, choose unused ports, edit that file, then start the target. Only the Vite
port appears in the browser URL. Set the host to the VPS's `tailscale ip -4`;
**never use `0.0.0.0` or its public address**. Tailscale ACLs still control which
peers can connect. No Tailscale Funnel or public firewall opening is needed.

## One-time installation

The service definitions in `ops/test-server/` intentionally describe this VPS's
paths. For another server, adjust the checkout, Node/pnpm and PocketBase paths
before installation. Prerequisites:

- Tailscale connected, with the client device on the same permitted network.
- Existing dependencies installed using `pnpm install --frozen-lockfile`.
- Node/pnpm at `/root/.local/share/pi-node/current/bin/`.
- Matching PocketBase executable at
  `/root/.local/share/trivia-party/pocketbase-0.40.5/pocketbase`.
- Imported database at `/root/dev/trivia-party/pb_data/data.db`.

PocketBase defaults to `pb_data` **beside its executable**, not its working
directory. The service passes explicit `--dir`, `--migrationsDir` and `--hooksDir`
paths and refuses to start if `data.db` is missing. Do not use `./dev.sh` for this
VPS setup: that legacy script kills the port-8090 listener and upserts a default
superuser.

```bash
cd /root/dev/trivia-party
# Preserve existing local configuration when reinstalling.
test -f /etc/trivia-party-test.env || \
  install -m 600 ops/test-server/test-server.env.example /etc/trivia-party-test.env
# Check the host and available ports before starting.
editor /etc/trivia-party-test.env
install -m 644 ops/test-server/trivia-test*.service ops/test-server/trivia-test.target /etc/systemd/system/
systemd-analyze verify /etc/systemd/system/trivia-test*.service /etc/systemd/system/trivia-test.target
systemctl daemon-reload
systemctl start trivia-test.target
```

After updating unit files, install them again and run `systemctl daemon-reload`
before restarting. After updating environment values, just restart the target.
When upgrading PocketBase, match the database's source version first and update
its executable path in the backend unit; keep a backup before migrations run.

## Copying test data from the Mac

Stop PocketBase on the Mac before archiving. Confirm `lsof -nP -iTCP:8090
-sTCP:LISTEN` has no listener. Copy the **whole `pb_data` directory**, not just
`data.db`, so uploaded files and SQLite auxiliary files travel with it.

On the Mac:

```bash
umask 077
TRANSFER_DIR="$(mktemp -d)"
tar -czf "$TRANSFER_DIR/trivia-party-test-data.tar.gz" \
  -C /Users/markb/dev/trivia-party pb_data &&
scp "$TRANSFER_DIR/trivia-party-test-data.tar.gz" \
  root@100.75.212.39:/root/trivia-party-transfer/
```

The destination directory must exist with mode 700. Treat the archive as sensitive:
it contains account data. Do not put it in Git or chat. Verify new SSH host keys
before trusting them. The Mac may restart PocketBase after the archive is made.

On the VPS, use the full stop command above before replacing data. Keep the previous
`pb_data` directory and uploaded archive as backups; extract into a separate
staging directory and inspect it before moving the new `pb_data` into place.
Do not extract over a running database. Keep database directories mode 700 and
files mode 600. macOS `._*` and `.DS_Store` entries are metadata, not app data.
Restart the target only after the complete directory is in place. Startup applies
any pending repository migrations to this **test copy**.

## Verify the active database, not just a healthy HTTP endpoint

```bash
curl --fail http://100.75.212.39:15173/api/health
PID=$(systemctl show -p MainPID --value trivia-test-pocketbase.service)
ls -l /proc/"$PID"/fd | grep '/root/dev/trivia-party/pb_data/data.db'
```

Then log in through the browser and confirm the expected games and questions.
A healthy endpoint alone does not prove the correct database is loaded. The
questions API requires authentication; an anonymous list can return zero items
even when the database is populated. Never weaken collection access rules to
make a test pass.

The initial imported database had 591,183 questions, 5 games, 15 rounds and 33
users. The accidentally created empty database beside the executable was retained
but is not used by these services. The original upload is retained at
`/root/trivia-party-transfer/trivia-party-test-data.tar.gz`.

## Automated checks

```bash
node --test scripts/test-dev-proxy.mjs
pnpm exec playwright test e2e/backend-origin.spec.ts e2e/question-replacement.spec.ts --project=chromium
```

The Node integration test checks actual API forwarding (including query strings
and file paths); the browser test checks same-origin API URLs. Playwright expects
a local frontend on port 5173. Start a loopback frontend separately with
`pnpm dev --host 127.0.0.1 --port 5173 --strictPort` when running the mocked tests
on this VPS, so Playwright reuses it rather than invoking legacy `dev.sh`.
