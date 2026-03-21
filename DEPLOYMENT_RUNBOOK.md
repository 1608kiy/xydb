# XYDB Deployment Runbook

## Current Online Topology
- Frontend entry: http://47.108.170.112/
- Fallback entry: http://47.108.170.112:7833/
- Backend service: systemd unit `xydb-backend`
- Backend local port: 8080
- Reverse proxy: nginx (80 and 7833)
- Database: MySQL 8 local instance
- Existing Docker workload kept running: container `astrbot`

## Server Paths
- App root: /opt/xydb-app/current
- Backend JAR: /opt/xydb-app/current/backend/target/backend-0.0.1-SNAPSHOT.jar
- Backend env: /etc/xydb/backend.env
- Nginx site(80): /etc/nginx/sites-available/xydb
- Nginx site(7833): /etc/nginx/conf.d/xydb_7833.conf

## Health Check Commands
```bash
systemctl is-active xydb-backend
ss -lntp | grep 8080
wget -S -O /dev/null http://127.0.0.1:8080/actuator/health 2>&1 | head -n 12
wget -S -O /dev/null http://127.0.0.1/ 2>&1 | head -n 12
wget -S -O - http://127.0.0.1/api/me 2>&1 | head -n 20
mysql -uxydb -p -D xydb -e 'SHOW TABLES;'
docker ps
```

## Service Operations
```bash
systemctl restart xydb-backend
systemctl status xydb-backend --no-pager
journalctl -u xydb-backend -n 120 --no-pager
nginx -t
systemctl reload nginx
```

## 80 Port Rollback
1. Check available backups:
```bash
ls -la /etc/nginx/sites-available/xydb.bak*
```
2. Restore one backup and reload nginx:
```bash
cp /etc/nginx/sites-available/xydb.bak.20260321_195546 /etc/nginx/sites-available/xydb
nginx -t
systemctl reload nginx
```

## MySQL Notes
- Database name: xydb
- App user: xydb
- Password is stored in /etc/xydb/backend.env (SPRING_DATASOURCE_PASSWORD)
- Root/local admin check:
```bash
mysql -uroot -e "SHOW DATABASES LIKE 'xydb';"
mysql -uroot -e "SELECT user,host FROM mysql.user WHERE user='xydb';"
```

## Smoke Test Script
- Uploaded script: /tmp/remote_smoke_xydb.sh
- Last smoke result: register/login/me/create task passed on production endpoint.

## Safety Rules
- Do not run `docker stop`, `docker rm`, or `docker compose down` on this host unless explicitly planned.
- Always run `nginx -t` before reloading nginx.
- Keep a fresh backup file before modifying nginx site config.
