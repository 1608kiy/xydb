# 铃记项目 - 用户体验版发布说明

## 📦 安装包下载

### 系统要求
- **Java版本**：Java 21 或更高版本
- **操作系统**：Windows / macOS / Linux
- **磁盘空间**：最少 100 MB
- **内存**：最少 512 MB

### 快速开始

#### 方式1：直接运行JAR包（推荐）

1. **下载安装包**
   ```
   backend-0.0.1-SNAPSHOT.jar (61.9 MB)
   ```

2. **安装Java**（如未安装）
   ```bash
   # 检查Java版本
   java -version
   ```

3. **启动应用**
   ```bash
   java -jar backend-0.0.1-SNAPSHOT.jar
   ```

4. **访问应用**
   - 打开浏览器访问：http://localhost:8080
   - 默认用户名：user
   - 默认密码：查看启动日志

#### 方式2：Docker部署

```dockerfile
FROM openjdk:21-slim

WORKDIR /app

COPY backend-0.0.1-SNAPSHOT.jar .

EXPOSE 8080

CMD ["java", "-jar", "backend-0.0.1-SNAPSHOT.jar"]
```

启动命令：
```bash
docker build -t ringnote:latest .
docker run -p 8080:8080 ringnote:latest
```

#### 方式3：指定端口启动

```bash
# 在9090端口启动
java -jar backend-0.0.1-SNAPSHOT.jar --server.port=9090
```

访问地址：http://localhost:9090

## 📱 功能体验

应用提供以下核心功能：

| 页面 | 功能描述 |
|-----|--------|
| **登录** | 用户身份认证 |
| **待办** | 任务列表管理、增删改查 |
| **日历** | 按日期查看任务 |
| **番茄钟** | 番茄工作法计时 |
| **打卡** | 每日打卡记录、连续天数统计 |
| **个人中心** | 用户资料编辑、偏好设置 |
| **数据周报** | 每周数据统计分析 |

## 🔧 技术栈

**前端**
- Vue 3.4
- Vite 5.4
- TypeScript 5.6
- Tailwind CSS 3.4

**后端**
- Spring Boot 3.5.12
- Spring Data JPA
- H2 Database (内存数据库)
- Java 21+

## 📝 常见问题

### Q: 启动时提示"端口已被占用"怎么办？
A: 使用其他端口启动：
```bash
java -jar backend-0.0.1-SNAPSHOT.jar --server.port=9090
```

### Q: 忘记密码了怎么办？
A: 本版本使用内存数据库，重启应用会重置所有数据。重新启动后会生成新的临时密码，查看启动日志获取。

### Q: 数据会保存吗？  
A: 体验版使用H2内存数据库，应用关闭后数据会丢失。生产环境可配置MySQL/PostgreSQL进行持久化存储。

### Q: 能否在服务器上部署？
A: 完全可以！将JAR包上传到服务器，使用相同命令启动即可。建议配合Nginx进行反向代理。

## 🚀 服务器部署示例

### Nginx反向代理配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### systemd服务配置（Linux）

创建文件 `/etc/systemd/system/ringnote.service`：

```ini
[Unit]
Description=RingNote Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/ringnote
ExecStart=/usr/bin/java -jar backend-0.0.1-SNAPSHOT.jar
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl enable ringnote
sudo systemctl start ringnote
```

## 📞 技术支持

如遇到任何问题，请检查：
1. Java版本是否满足21+
2. 默认端口8080是否被占用
3. 防火墙是否允许8080端口访问
4. 应用启动日志中的错误信息

## 📖 更新日志

### v1.0.0 (2026-04-15)
- ✨ 首次发布，包含完整功能
- 🎨 全新Vue 3 + Vite前端架构
- 📱 响应式设计，适配各种屏幕
- 🔒 安全认证机制
- 📊 数据统计和分析功能

---

**祝你使用愉快！** 🎉

如有反馈或建议，欢迎提交Issue或PR。
