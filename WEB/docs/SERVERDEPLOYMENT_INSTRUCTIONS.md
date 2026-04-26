# 服务器部署指南 - RingNote 品牌迁移 (2026-03-27)

## 📌 当前状态
- ✅ **GitHub 推送完成** - 所有品牌元素更新已推送到 GitHub
- ✅ **本地提交完成** - 最新提交：`7b25387` 
- ✅ **部署脚本就位** - `scripts/server/apply_ringnote_branding.sh`
- ⏳ **服务器部署待执行**

---

## 🚀 服务器部署步骤

### 第一步：准备 SSH 连接

**服务器信息：**
- **IP 地址**：`47.108.170.112`
- **默认 SSH 密钥**：`~/.ssh/id_rsa`

### 第二步：上传部署脚本

在本地执行以下命令（Windows PowerShell）:

```powershell
# 设置服务器连接信息
$SERVER_IP = "47.108.170.112"
$SSH_USER = "root"  # 请根据实际情况修改用户名 (ubuntu, admin, 等)

# 上传脚本到服务器
scp scripts/server/apply_ringnote_branding.sh "${SSH_USER}@${SERVER_IP}:/tmp/"

# 或者直接使用 SSH 从 GitHub 下载（推荐）
ssh "${SSH_USER}@${SERVER_IP}" "cd /tmp && curl -fsSL https://raw.githubusercontent.com/1608kiy/ringnote/main/scripts/server/apply_ringnote_branding.sh -o apply_ringnote_branding.sh"
```

### 第三步：在服务器上执行迁移脚本

```bash
# SSH 连接到服务器
ssh [SSH_USER]@47.108.170.112

# 在服务器上执行以下命令
bash /tmp/apply_ringnote_branding.sh
```

**脚本执行内容：**
1. 准备新的目录结构 (`/opt/ringnote-app/current` 等)
2. 安装新的 systemd 服务 (`ringnote-backend`)
3. 配置 Nginx 站点 (`/etc/nginx/sites-available/ringnote`)
4. 重启相关服务
5. 验证迁移成功

---

## ✅ 验证部署

部署完成后，执行以下验证命令：

```bash
# 1. 检查 systemd 服务状态
systemctl status ringnote-backend

# 2. 检查后端服务健康
curl -s http://127.0.0.1:8080/actuator/health | jq

# 3. 检查 Nginx 配置
nginx -t

# 4. 查看主要域名响应
curl -s http://47.108.170.112 | head -20

# 5. 查看 Nginx 日志
tail -f /var/log/nginx/access.log
```

---

## 📋 完整部署清单

部署脚本 `apply_ringnote_branding.sh` 将执行以下操作：

| 步骤 | 操作 | 源 | 目标 |
|------|------|-----|------|
| 1 | 迁移应用目录 | `/opt/ringnote-app/current` | `/opt/ringnote-app/current` |
| 2 | 迁移配置目录 | `/etc/ringnote/backend.env` | `/etc/ringnote/backend.env` |
| 3 | 安装 systemd 服务 | - | `/etc/systemd/system/ringnote-backend.service` |
| 4 | 安装 Nginx 站点配置 | - | `/etc/nginx/sites-available/ringnote` |
| 5 | 启用 Nginx 站点 | - | `/etc/nginx/sites-enabled/ringnote` |
| 6 | 启用 systemd 服务 | - | systemd daemon-reload |
| 7 | 启动新服务 | systemd | `systemctl start ringnote-backend` |
| 8 | 验证端口 | - | `127.0.0.1:8080` |

---

## 🔍 常见问题排查

### 问题 1：Permission denied (publickey)
**解决**：确保 SSH 密钥在 `~/.ssh/id_rsa` 且权限为 600
```powershell
# 本地检查
ls ~/.ssh/id_rsa
```

### 问题 2：脚本执行失败
**解决**：确保是 root 或 sudo 用户且 systemd 服务存在
```bash
# 在服务器上检查权限
sudo bash apply_ringnote_branding.sh
```

### 问题 3：服务无法启动
**解决**：检查 Java 和依赖是否已安装
```bash
java -version
systemctl status ringnote-backend -l
journalctl -u ringnote-backend -n 50
```

---

## 📊 部署后验证

完成后运行 E2E 冒烟测试：

```powershell
# 在本地项目目录运行
node scripts/e2e/online_domain_brand_smoke.cjs
```

预期结果：
- ✅ 所有页面标题包含 "铃记" (RingNote)
- ✅ 不含旧品牌 "铃记"
- ✅ 管理员登录流程正常
- ✅ 两个域名都响应正确

---

## 🔄 回滚计划

如果需要恢复，保留的 ringnote-legacy 远程允许快速回滚：

```bash
# 本地查看原始分支
git remote -v

# 如需回滚，重置 origin 到 ringnote-legacy
git remote set-url origin git@github.com:1608kiy/ringnote-legacy.git
```

---

## 📝 后续步骤

1. **执行本部署指南中的 SSH 命令**
2. **验证服务器上的部署成功**
3. **运行 E2E 冒烟测试** - `node scripts/e2e/online_domain_brand_smoke.cjs`
4. **检查前端页面** - 访问 http://47.108.170.112 确认新品牌显示
5. **更新 DNS（如需）** - 将域名指向新服务器 IP

---

**最后更新**：2026-03-27  
**提交 ID**：7b25387  
**负责人**：部署员  
