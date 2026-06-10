# 配送履约平台

配送履约平台是面向配送站点、骑手、商户和客服的全链路配送管理系统，覆盖从排班调度到签收赔付的完整闭环。系统将排班、接单、到店、取货、配送、签收、异常申诉和赔付串联成闭环流程，实现配送全流程可追踪、责任可归属、异常可处理。

## 原始需求

> 搭建一个给配送站点、骑手、商户和客服使用的履约平台，Vue3 页面展开配送站点运力、订单热区、骑手排班和异常工单，NestJS 保存班次、接单、取货、送达和赔付记录。站点调度维护骑手班次、服务区域、天气风险和高峰预案；商户确认出餐时间、缺货和包装异常；骑手记录到店、取货、途中异常和送达照片；客服处理超时、丢餐、错送和顾客拒收。系统要把排班、接单、到店、取货、配送、签收、异常申诉和赔付连成闭环。暴雨、商户出餐慢、骑手摔车、顾客地址错误要对应不同责任和补偿。

## 技术栈

### 前端
- Vue 3 + TypeScript + Vite
- TailwindCSS 3
- Vue Router 4（角色路由守卫）
- Pinia（状态管理）
- Axios（HTTP 请求，JWT 拦截器）
- lucide-vue-next（图标）

### 后端
- NestJS + TypeScript
- Better-SQLite3（零依赖数据库）
- JWT 认证 + 角色权限控制
- WebSocket 实时推送
- Multer 文件上传

## 测试账号

| 角色 | 用户名 | 密码 | 首页 |
|------|--------|------|------|
| 站点调度（朝阳站） | station_a | 123456 | /station |
| 站点调度（海淀站） | station_c | 123456 | /station |
| 骑手 | rider_zhangming | 123456 | /rider |
| 骑手 | rider_wuyong | 123456 | /rider |
| 商户 | merchant_1 | 123456 | /merchant |
| 商户 | merchant_5 | 123456 | /merchant |
| 客服 | cs_a | 123456 | /cs |
| 管理员 | admin | 123456 | /station |

## 启动方式

### 前置要求

- Node.js 22+
- pnpm（可通过 `corepack enable && corepack prepare pnpm@latest --activate` 安装）
- Docker & Docker Compose（用于 Docker 一键启动）

### 启动步骤

#### 1. 安装前端依赖

```bash
pnpm install
```

#### 2. 安装后端依赖并启动后端

```bash
cd backend
pnpm install
pnpm run build
pnpm run start:prod
```

后端 API 地址：http://localhost:3001/api

#### 3. 启动前端开发服务器

```bash
pnpm dev
```

访问地址：http://localhost:5173

### Docker 一键启动

```bash
docker compose up --build
```

后台运行：

```bash
docker compose up --build -d
```

停止服务：

```bash
docker compose down
```

访问地址：http://localhost:80

## 项目结构

```
├── src/                        # 前端源码
│   ├── api/                    # Axios 实例与拦截器
│   ├── components/             # 通用组件
│   │   ├── layout/             # 布局组件（AppLayout, Sidebar, Header）
│   │   ├── StatusBadge.vue     # 状态标签
│   │   ├── StatCard.vue        # 统计卡片
│   │   ├── DataTable.vue       # 数据表格
│   │   ├── Modal.vue           # 弹窗
│   │   └── StepProgress.vue    # 步骤进度
│   ├── pages/                  # 页面
│   │   ├── LoginPage.vue       # 登录页
│   │   ├── station/            # 站点调度页面
│   │   ├── rider/              # 骑手页面
│   │   ├── merchant/           # 商户页面
│   │   ├── cs/                 # 客服页面
│   │   └── HeatmapPage.vue     # 订单热区
│   ├── stores/                 # Pinia 状态管理
│   ├── router/                 # 路由配置
│   └── lib/                    # 工具函数
├── backend/                    # 后端源码
│   ├── src/
│   │   ├── auth/               # 认证模块（JWT）
│   │   ├── database/           # 数据库模块（SQLite）
│   │   ├── orders/             # 订单模块（状态机）
│   │   ├── shifts/             # 班次模块
│   │   ├── exceptions/         # 异常记录模块
│   │   ├── tickets/            # 工单模块
│   │   ├── compensations/      # 赔付模块
│   │   ├── station/            # 站点模块（运力监控）
│   │   ├── peak-plans/         # 高峰预案模块
│   │   ├── weather/            # 天气预警模块
│   │   ├── gateway/            # WebSocket 网关
│   │   └── seed/               # 种子数据
│   ├── data/                   # SQLite 数据库文件
│   └── uploads/                # 上传文件存储
├── nginx.conf                  # Nginx 配置（Docker 使用）
├── docker-compose.yml          # Docker Compose 编排
└── Dockerfile                  # 前端 Docker 构建
```

## 异常责任归属规则

| 异常类型 | 责任归属 | 处理方式 |
|----------|----------|----------|
| 暴雨等恶劣天气 | 平台承担 | 自动延长配送时效，不扣骑手超时分，顾客部分退款 |
| 商户出餐慢 | 商户承担 | 补偿骑手等待费用，顾客延迟部分退款 |
| 骑手摔车/交通事故 | 平台保险承担 | 启动骑手意外险赔付，重新分配订单 |
| 顾客地址错误 | 顾客承担 | 补偿骑手额外配送费，重新配送或退回商户 |
