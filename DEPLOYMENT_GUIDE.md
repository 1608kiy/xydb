# 项目部署指南

## 概述
本项目已完成前端Vue 3重构，所有核心业务页面采用原生页面iframe承载方案，实现1:1视觉与动画复刻。

## 部署物料

### 前端
- **编译方式**：Vite 5 + Vue 3 + TypeScript
- **构建输出**：`SFOTWARE/frontend-vue/dist/`（92个文件）
- **主包大小**：134.74 KB (gzip: 52.53 KB)
- **构建命令**：`npm run build`

### 后端
- **框架**：Spring Boot 3.5.12
- **构建工具**：Maven 3.9.7
- **Java版本**：21+（已支持Java 24/25）
- **JAR包**：`WEB/backend/target/backend-0.0.1-SNAPSHOT.jar`（61.9 MB）
- **构建命令**：`./mvnw clean package -DskipTests`

### 集成部署
前端静态资源已复制到后端的 `src/main/resources/static` 目录。
因此后端JAR包是完整的一体化部署包，包含了所有前端资源。

## 本地开发运行

### 开发模式
```bash
# 终端1：启动后端
cd WEB/backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=local -Dspring-boot.run.arguments=--server.port=8082

# 终端2：启动前端
cd SFOTWARE/frontend-vue
npm run dev
```

访问地址：
- 前端开发服务器：http://localhost:5173
- 后端API：http://localhost:8082

### 生产部署
```bash
# 直接运行JAR包
java -jar WEB/backend/target/backend-0.0.1-SNAPSHOT.jar

# 或指定端口
java -jar WEB/backend/target/backend-0.0.1-SNAPSHOT.jar --server.port=8080
```

访问地址：http://localhost:8080（或指定的端口）

## 验证检查清单

- ✅ 前端构建成功（`npm run build` 完成）
- ✅ 后端构建成功（Maven clean package 完成）  
- ✅ 所有业务路由可正常响应 HTTP 200：
  - /login - 登录页
  - /register - 注册页
  - /todo - 待办页
  - /calendar - 日历页
  - /pomodoro - 番茄钟页
  - /checkin - 打卡页
  - /profile - 个人中心页
  - /report - 数据周报页
- ✅ 后端API服务正常启动（localhost:8082 可连接）
- ✅ 前端静态资源已整合到后端部署包

## 页面实现方案

所有核心业务页面采用 **LegacyPageFrame** 组件统一承载原生HTML页面，通过iframe方式加载：

```vue
<template>
  <LegacyPageFrame page="待办页面.html" title="铃记 - 待办" />
</template>
```

**优势**：
- 100% 保留原生页面的视觉效果和动画
- 最小化集成风险
- 降低重构代码的维护成本

**原生资源位置**：
- 前端开发：`public/SFOTWARE/frontend/` 和 `public/SHARE/`
- 生产部署：打包进JAR包中

## 后续优化方向

1. **数据绑定**：逐步将业务逻辑从原生页面迁移到Vue组件
2. **权限控制**：完善路由守卫和API认证机制
3. **性能优化**：分析关键路径，优化加载时间
4. **测试覆盖**：补充端到端自动化测试用例

## 技术栈版本

| 组件 | 版本 |
|-----|------|
| Vue | 3.4.x |
| Vite | 5.4.21 |
| TypeScript | 5.6.x |
| Tailwind CSS | 3.4.x |
| Spring Boot | 3.5.12 |
| Java | 21+ (支持24/25) |
| Maven | 3.9.7 |

## 联系支持

如遇到任何部署问题，请检查：
1. Java版本要求（最低Java 21）
2. 端口占用情况
3. 数据库连接配置（生产环境）

---
文档生成时间：2026-04-15
