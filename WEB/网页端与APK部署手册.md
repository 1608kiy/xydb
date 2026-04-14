# 网页端 + 后端 + APK 发布部署手册（isleepring.cn）

更新时间：2026-04-14

## 1. 目标与域名规划

- 官网域名：`www.isleepring.cn`（默认落地到 `官网.html`）
- Web 登录域名：`ringnote.isleepring.cn`（默认落地到 `登录页面.html`）
- 后端 API：统一走同域 `/api/*` 反向代理到 `127.0.0.1:8080`
- APK 下载与升级信息：
  - `https://ringnote.isleepring.cn/download/android/`（APK 文件）
  - `https://ringnote.isleepring.cn/api/app/version`（版本 JSON）

## 2. 当前服务器信息（你已提供）

- 公网 IP：`47.108.170.112`
- 系统：Ubuntu
- 已开放端口：`80, 443, 22, 7833`（以及其他自定义端口）
- 域名解析：
  - `www.isleepring.cn` -> `47.108.170.112`
  - `ringnote.isleepring.cn` -> `47.108.170.112`

## 3. 本地发布准备

在本机项目根目录执行（Windows PowerShell）：

```powershell
cd "E:\computer science\xydb"

# 1) 构建后端 jar
cd .\WEB\backend
.\mvnw.cmd clean package -DskipTests

# 2) 回到项目根目录
cd ..\..
```

确认产物：

- 后端 Jar：`WEB/backend/target/backend-0.0.1-SNAPSHOT.jar`
- 前端静态页：`WEB/frontend/*.html`

## 4. 首次服务器初始化（仅首次）

登录服务器：

```bash
ssh root@47.108.170.112
```

安装依赖（如未安装）：

```bash
apt update
apt install -y nginx openjdk-21-jre mysql-server
```

创建目录：

```bash
mkdir -p /opt/ringnote-app/current/backend
mkdir -p /opt/ringnote-app/current/frontend
mkdir -p /opt/ringnote-app/releases/android
mkdir -p /etc/ringnote
```

> 注意：服务器上若有 Docker 业务运行，不要执行任何 `docker stop` / `docker rm` / `docker compose down`。

## 5. 删除老网站并重新部署（本次按此执行）

如果服务器上已经有老版本站点，本次按“先删旧版，再全量重装”执行。

### 5.1 先停止旧服务

在服务器执行：

```bash
systemctl stop ringnote-backend 2>/dev/null || true
systemctl stop xydb-backend 2>/dev/null || true
```

### 5.2 备份后删除旧网站文件

```bash
BACKUP_DIR=/opt/backup/ringnote-$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"
cp -a /opt/ringnote-app/current "$BACKUP_DIR"/current 2>/dev/null || true
cp -a /var/www/ringnote "$BACKUP_DIR"/var_www_ringnote 2>/dev/null || true

rm -rf /opt/ringnote-app/current
rm -rf /var/www/ringnote
```

### 5.3 删除旧 Nginx 配置并重建软链接

```bash
rm -f /etc/nginx/sites-enabled/ringnote
rm -f /etc/nginx/sites-available/ringnote
rm -f /etc/nginx/conf.d/ringnote_7833.conf
rm -f /etc/nginx/conf.d/xydb_7833.conf
```

### 5.4 重新创建部署目录

```bash
mkdir -p /opt/ringnote-app/current/backend
mkdir -p /opt/ringnote-app/current/frontend
mkdir -p /opt/ringnote-app/releases/android
mkdir -p /etc/ringnote
```

### 5.5 清理完成确认

```bash
test -d /opt/ringnote-app/current/backend && echo "backend dir ready"
test -d /opt/ringnote-app/current/frontend && echo "frontend dir ready"
```

## 6. 上传发布文件

在本地执行：

```powershell
cd "E:\computer science\xydb"

# 上传后端 jar
scp .\WEB\backend\target\backend-0.0.1-SNAPSHOT.jar root@47.108.170.112:/opt/ringnote-app/current/backend/

# 上传前端静态资源（示例：整包覆盖）
scp -r .\WEB\frontend\* root@47.108.170.112:/opt/ringnote-app/current/frontend/
```

## 7. 后端环境变量与 systemd

### 6.1 创建环境变量

在服务器执行：

```bash
cat >/etc/ringnote/backend.env <<'EOF'
SPRING_DATASOURCE_URL=jdbc:mysql://127.0.0.1:3306/ringnote?serverTimezone=Asia/Shanghai&useSSL=false&allowPublicKeyRetrieval=true
SPRING_DATASOURCE_USERNAME=ringnote
SPRING_DATASOURCE_PASSWORD=请替换为数据库密码
JWT_SECRET=请替换为长度至少32位的生产密钥
AI_PROVIDER_API_TOKEN=
AI_PROVIDER_BACKUP_API_TOKEN=
EOF
```

### 6.2 创建服务文件

```bash
cat >/etc/systemd/system/ringnote-backend.service <<'EOF'
[Unit]
Description=RingNote Backend Service
After=network.target mysql.service

[Service]
Type=simple
WorkingDirectory=/opt/ringnote-app/current/backend
EnvironmentFile=/etc/ringnote/backend.env
ExecStart=/usr/bin/java -jar /opt/ringnote-app/current/backend/backend-0.0.1-SNAPSHOT.jar --server.port=8080
SuccessExitStatus=143
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF
```

### 6.3 启动后端

```bash
systemctl daemon-reload
systemctl enable ringnote-backend
systemctl restart ringnote-backend
systemctl status ringnote-backend --no-pager
```

## 8. Nginx 域名分流（官网与登录页分离）

仓库已准备模板：`WEB/tmp/ringnote_split_domains.conf`

在服务器执行：

```bash
cp /etc/nginx/sites-available/ringnote /etc/nginx/sites-available/ringnote.bak.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
cat >/etc/nginx/sites-available/ringnote <<'EOF'
server {
    listen 80;
    server_name isleepring.cn www.isleepring.cn;

    root /opt/ringnote-app/current/frontend;
    index 官网.html;
    charset utf-8;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /官网.html;
    }
}

server {
    listen 80;
    server_name ringnote.isleepring.cn;

    root /opt/ringnote-app/current/frontend;
    index 登录页面.html;
    charset utf-8;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /download/android/ {
        alias /opt/ringnote-app/releases/android/;
        autoindex off;
        add_header Cache-Control "no-store";
    }

    location = /api/app/version {
        alias /opt/ringnote-app/releases/android/version.json;
        default_type application/json;
        add_header Cache-Control "no-store";
    }

    location / {
        try_files $uri $uri/ /登录页面.html;
    }
}
EOF

ln -sf /etc/nginx/sites-available/ringnote /etc/nginx/sites-enabled/ringnote
nginx -t
systemctl reload nginx
```

## 9. HTTPS（建议）

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d www.isleepring.cn -d isleepring.cn -d ringnote.isleepring.cn
```

## 10. 部署后验收

服务器本机检查：

```bash
systemctl is-active ringnote-backend
curl -fsS http://127.0.0.1:8080/actuator/health
curl -I http://www.isleepring.cn/
curl -I http://ringnote.isleepring.cn/
curl -I http://ringnote.isleepring.cn/api/me
```

浏览器验收：

- 打开 `http://www.isleepring.cn`，应显示官网页面
- 打开 `http://ringnote.isleepring.cn`，应显示登录页面

## 11. APK 打包与升级准备

## 11.1 你现在可先完成的准备工作（已在仓库完成）

- 已添加版本发布脚本：`WEB/scripts/publish_apk_release.ps1`
- 已添加 Nginx 下载与版本接口路由：见 `WEB/tmp/ringnote_split_domains.conf`
- 已添加版本样例文件：`WEB/releases/android/version.sample.json`

## 11.2 APK 发布流程（每次发版）

假设你已经从 Android Studio/HBuilderX 打包出 APK 文件（如 `app-release.apk`）：

```powershell
cd "E:\computer science\xydb"
powershell -ExecutionPolicy Bypass -File .\WEB\scripts\publish_apk_release.ps1 `
  -ApkPath "D:\builds\app-release.apk" `
  -VersionName "1.0.0" `
  -VersionCode 100
```

脚本会自动：

- 复制 APK 到 `WEB/releases/android/`
- 生成 `WEB/releases/android/version.json`
- 计算并写入 SHA256

上传到服务器：

```powershell
scp .\WEB\releases\android\ringnote-v1.0.0-100.apk root@47.108.170.112:/opt/ringnote-app/releases/android/
scp .\WEB\releases\android\version.json root@47.108.170.112:/opt/ringnote-app/releases/android/
```

## 11.3 安卓端升级对接约定

安卓 App 在启动或“检查更新”时请求：

- `GET https://ringnote.isleepring.cn/api/app/version`

返回结构示例：

```json
{
  "appName": "RingNote",
  "packageName": "com.ringnote.app",
  "channel": "stable",
  "versionName": "1.0.0",
  "versionCode": 100,
  "minSupportedCode": 1,
  "apk": {
    "fileName": "ringnote-v1.0.0-100.apk",
    "url": "https://ringnote.isleepring.cn/download/android/ringnote-v1.0.0-100.apk",
    "sha256": "...",
    "size": 12345678
  },
  "releaseNotes": [
    "Fixes and performance improvements"
  ],
  "publishedAt": "2026-04-14T12:00:00Z",
  "forceUpdate": false
}
```

升级策略建议：

- 当服务端 `versionCode > 当前版本` 时提示升级
- 当 `forceUpdate=true` 时强制升级
- 下载后使用系统安装器执行 APK 覆盖安装

## 12. 回滚

- Nginx 回滚：恢复 `/etc/nginx/sites-available/ringnote.bak.*` 并 `nginx -t && systemctl reload nginx`
- 后端回滚：替换为上一个 Jar 后 `systemctl restart ringnote-backend`
- 前端回滚：把 `/opt/ringnote-app/current/frontend` 回滚到上一版静态文件
