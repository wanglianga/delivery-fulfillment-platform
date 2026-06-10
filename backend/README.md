# 配送履约平台 - 后端服务

## 原始需求

> Build the complete NestJS backend for a delivery fulfillment platform in d:\code\solocode-wl\wl-288\backend. The backend already has NestJS scaffolded with package.json updated. You need to create ALL the following files. DO NOT modify package.json or tsconfig.json.

## 项目简介

配送履约平台后端服务，基于 NestJS 框架，使用 Better-SQLite3 数据库，支持 JWT 认证、WebSocket 实时推送、文件上传等功能。

## 技术栈

- **框架**: NestJS 11 + TypeScript
- **数据库**: Better-SQLite3 (SQLite)
- **认证**: JWT + bcryptjs
- **实时通信**: @nestjs/websockets + ws
- **文件上传**: Multer

## 目录结构

```
backend/src/
  main.ts                    应用入口 (CORS, 全局前缀 'api', 静态文件服务)
  app.module.ts              根模块 (导入所有功能模块)
  database/
    database.module.ts       全局数据库模块 (BetterSqlite3)
    database.service.ts      数据库服务 (建表, 查询辅助)
  auth/
    auth.module.ts           全局认证模块
    auth.controller.ts       POST /auth/login, GET /auth/profile
    auth.service.ts          JWT 认证, bcryptjs 密码
    jwt.strategy.ts          JWT 验证策略
    jwt.guard.ts             JWT 认证守卫
    roles.guard.ts           角色权限守卫
    decorators.ts            @CurrentUser, @Roles 装饰器
  shifts/
    shifts.module.ts
    shifts.controller.ts     CRUD /shifts
    shifts.service.ts
  orders/
    orders.module.ts
    orders.controller.ts     CRUD + 状态转换
    orders.service.ts        订单状态机 + WebSocket 事件
  exceptions/
    exceptions.module.ts
    exceptions.controller.ts CRUD /exceptions
    exceptions.service.ts
  tickets/
    tickets.module.ts
    tickets.controller.ts    CRUD /tickets + 判责 + 发起赔付
    tickets.service.ts
  compensations/
    compensations.module.ts
    compensations.controller.ts GET /compensations + 审批/驳回
    compensations.service.ts
  station/
    station.module.ts
    station.controller.ts    GET /station/capacity, /station/heatmap
    station.service.ts
  peak-plans/
    peak-plans.module.ts
    peak-plans.controller.ts CRUD + 激活/停用
    peak-plans.service.ts
  weather/
    weather.module.ts
    weather.controller.ts    GET /weather/alerts + CRUD
    weather.service.ts
  seed/
    seed.service.ts          初始化种子数据
  gateway/
    gateway.module.ts
    events.gateway.ts        WebSocket 网关 (order:updated 事件)
```

## API 概览

| 路径前缀 | 模块 | 说明 |
|---------|------|------|
| `/api/auth` | 认证 | 登录、获取用户信息 |
| `/api/shifts` | 班次 | 骑手班次管理 |
| `/api/orders` | 订单 | 订单 CRUD + 状态流转 |
| `/api/exceptions` | 异常 | 异常记录管理 |
| `/api/tickets` | 工单 | 异常工单 + 责任判定 |
| `/api/compensations` | 赔付 | 赔付审批 |
| `/api/station` | 站点 | 运力监控、热力图 |
| `/api/peak-plans` | 高峰预案 | 预案管理 |
| `/api/weather` | 天气 | 天气预警管理 |
| `/api/ws` | WebSocket | 实时订单更新推送 |

## 启动方式

### 前置要求

- Node.js >= 22
- pnpm >= 9

### 启动步骤

#### 1. 安装依赖

```bash
cd backend
pnpm install --ignore-workspace
pnpm approve-builds better-sqlite3
```

#### 2. 启动服务

```bash
# 开发模式
pnpm run start:dev

# 或构建后启动
.\node_modules\.bin\nest build
node -r tsconfig-paths/register dist/main
```

访问地址: http://localhost:3001/api

### Docker 一键启动

#### 前置要求

- Docker
- Docker Compose

#### 启动步骤

```bash
# 构建并启动
docker compose up --build

# 后台运行
docker compose up --build -d

# 停止和清理
docker compose down
```

访问地址: http://localhost:3001/api

## 种子数据

首次启动时自动初始化以下数据:

- 2 个配送站 (朝阳/海淀)
- 8 个商户 (每站 4 个)
- 16 名骑手 (每站 8 名)
- 4 名站点调度员
- 4 名客服专员
- 1 名管理员
- 8 名商户用户
- 20 条示例订单 (各状态均有)
- 5 条班次记录
- 2 条天气预警
- 2 条高峰预案
- 3 条异常记录 (含工单和赔付)

所有用户密码均为 `123456`。

### 测试账号示例

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 骑手 | rider_zhangming | 123456 |
| 站点调度 | station_a | 123456 |
| 客服 | cs_a | 123456 |
| 商户 | merchant_1 | 123456 |
| 管理员 | admin | 123456 |
