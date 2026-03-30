# ringnote Deployment Runbook

## Current Online Topology
- Frontend entry: http://47.108.170.112/
- Fallback entry: http://47.108.170.112:7833/
- Backend service: systemd unit `ringnote-backend`
- Backend local port: 8080
- Reverse proxy: nginx (80 and 7833)
- Database: MySQL 8 local instance
- Existing Docker workload kept running: container `astrbot`

## Server Paths
- App root: /opt/ringnote-app/current
- Backend JAR: /opt/ringnote-app/current/backend/target/backend-0.0.1-SNAPSHOT.jar
- Backend env: /etc/ringnote/backend.env
- Nginx site(80): /etc/nginx/sites-available/ringnote
- Nginx site(7833): /etc/nginx/conf.d/ringnote_7833.conf

## Health Check Commands
```bash
systemctl is-active ringnote-backend
ss -lntp | grep 8080
wget -S -O /dev/null http://127.0.0.1:8080/actuator/health 2>&1 | head -n 12
wget -S -O /dev/null http://127.0.0.1/ 2>&1 | head -n 12
wget -S -O - http://127.0.0.1/api/me 2>&1 | head -n 20
mysql -uringnote -p -D ringnote -e 'SHOW TABLES;'
docker ps
```

## Service Operations
```bash
systemctl restart ringnote-backend
systemctl status ringnote-backend --no-pager
journalctl -u ringnote-backend -n 120 --no-pager
nginx -t
systemctl reload nginx
```

## 80 Port Rollback
1. Check available backups:
```bash
ls -la /etc/nginx/sites-available/ringnote.bak*
```
2. Restore one backup and reload nginx:
```bash
cp /etc/nginx/sites-available/ringnote.bak.20260321_195546 /etc/nginx/sites-available/ringnote
nginx -t
systemctl reload nginx
```

## MySQL Notes
- Database name: ringnote
- App user: ringnote
- Password is stored in /etc/ringnote/backend.env (SPRING_DATASOURCE_PASSWORD)
- Root/local admin check:
```bash
mysql -uroot -e "SHOW DATABASES LIKE 'ringnote';"
mysql -uroot -e "SELECT user,host FROM mysql.user WHERE user='ringnote';"
```

## Smoke Test Script
- Uploaded script: /tmp/remote_smoke_ringnote.sh
- Last smoke result: register/login/me/create task passed on production endpoint.

## Safety Rules
- Do not run `docker stop`, `docker rm`, or `docker compose down` on this host unless explicitly planned.
- Always run `nginx -t` before reloading nginx.
- Keep a fresh backup file before modifying nginx site config.
