# 配送履约平台

配送履约平台是面向配送站点、骑手、商户和客服的全链路配送管理系统，覆盖从排班调度到签收赔付的完整闭环。系统将排班、接单、到店、取货、配送、签收、异常申诉和赔付串联成闭环流程，实现配送全流程可追踪、责任可归属、异常可处理。

## 原始需求

> 搭建一个给配送站点、骑手、商户和客服使用的履约平台，Vue3 页面展开配送站点运力、订单热区、骑手排班和异常工单，NestJS 保存班次、接单、取货、送达和赔付记录。站点调度维护骑手班次、服务区域、天气风险和高峰预案；商户确认出餐时间、缺货和包装异常；骑手记录到店、取货、途中异常和送达照片；客服处理超时、丢餐、错送和顾客拒收。系统要把排班、接单、到店、取货、配送、签收、异常申诉和赔付连成闭环。暴雨、商户出餐慢、骑手摔车、顾客地址错误要对应不同责任和补偿。

> 完成3项工作：1) 在 src/pages/station/ 下新建 MerchantPerformancePage.vue：展示商户履约评分列表，使用DataTable组件，列包括ID、商户名、分数(score带颜色样式95+绿/85-94黄/85以下红)、总订单数、出餐慢次数、准时率、平均出餐秒数；支持按站点筛选(stationId)；顶部增加tab切换"履约评分"/"出餐慢记录"；出餐慢记录表格显示订单ID、商户名、到店时间、商户确认时间、取货时间、等待秒数、阈值秒数、是否超标、影响分数、状态(confirmed绿色/pending黄色/appealed橙色/ignored灰色)、操作按钮(确认/申诉)。调用 /merchant-performance 相关接口。2) 在 src/pages/merchant/ 下修改 MerchantExceptionPage.vue 或新增 SlowPreparePage.vue：商户视角展示本商户出餐慢记录列表（调用接口时带merchantId筛选），允许对pending状态的记录发起申诉。3) 修改 src/router/index.ts：新增路由 /station/merchant-performance（station角色）指向MerchantPerformancePage.vue，新增路由 /merchant/slow-prepare（merchant角色）指向SlowPreparePage.vue。代码风格与现有页面一致。

> 增加恶劣天气运力调整。暴雨或高温时，站点可以缩小配送范围、提高预计送达时间并调整骑手班次；已接订单要显示受影响原因，客服不能把全部超时算到骑手身上。
> 加入商户出餐慢认定。骑手到店后等待超过阈值时，系统记录到店时间、商户确认时间和取货照片；超时责任会影响商户履约评分和顾客补偿口径。

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

#### 前置要求

- Docker 20.10+
- Docker Compose v2+

#### 启动命令

```bash
docker compose up --build
```

后台运行：

```bash
docker compose up --build -d
```

查看日志：

```bash
docker compose logs -f
```

停止服务：

```bash
docker compose down
```

停止并删除数据卷（清空数据库）：

```bash
docker compose down -v
```

访问地址：http://localhost:80

## 项目结构

```
├── src/                        # 前端源码
│   ├── api/                    # Axios 实例与拦截器
│   ├── components/             # 通用组件
│   │   ├── layout/             # 布局组件（AppLayout, Sidebar, Header）
│   │   ├── StatusBadge.vue       # 状态标签（新增 weather-affected / slow-prepare）
│   │   ├── StatCard.vue         # 统计卡片
│   │   ├── DataTable.vue       # 数据表格
│   │   ├── Modal.vue           # 弹窗
│   │   └── StepProgress.vue  # 步骤进度
│   ├── pages/                  # 页面
│   │   ├── LoginPage.vue       # 登录页
│   │   ├── HomePage.vue       # 首页（角色首页）
│   │   ├── station/            # 站点调度页面
│   │   │   ├── CapacityPage.vue       # 运力监控
│   │   │   ├── ShiftsPage.vue         # 骑手排班
│   │   │   ├── AreasPage.vue           # 服务区域
│   │   │   ├── WeatherPage.vue      # 天气预警+运力调整（新增）
│   │   │   ├── PeakPlanPage.vue   # 高峰预案
│   │   │   └── MerchantPerformancePage.vue  # 商户履约评分（新增）
│   │   ├── rider/              # 骑手页面
│   │   │   ├── MyShiftsPage.vue    # 我的班次
│   │   │   ├── OrdersPage.vue        # 订单列表
│   │   │   ├── DeliveryPage.vue      # 配送详情+出餐慢（新增）
│   │   │   └── ExceptionReportPage.vue  # 异常上报
│   │   ├── merchant/           # 商户页面
│   │   │   ├── PreparePage.vue       # 备餐管理+出餐慢（新增）
│   │   │   ├── OrderTrackPage.vue    # 订单追踪+影响因素（新增）
│   │   │   ├── MerchantExceptionPage.vue  # 异常管理
│   │   │   └── SlowPreparePage.vue   # 出餐慢记录（新增）
│   │   ├── cs/                 # 客服页面
│   │   │   ├── TicketListPage.vue      # 工单列表
│   │   │   ├── TicketDetailPage.vue   # 工单详情+责任判定建议（新增）
│   │   │   └── CompensationPage.vue   # 赔付管理
│   │   └── HeatmapPage.vue     # 订单热区
│   ├── stores/                 # Pinia 状态管理
│   ├── router/                 # 路由配置
│   └── lib/                    # 工具函数
├── backend/                    # 后端源码
│   ├── src/
│   │   ├── auth/               # 认证模块（JWT）
│   │   ├── database/           # 数据库模块（SQLite，新增表）
│   │   ├── orders/             # 订单模块（出餐慢检测/取货照片/天气影响）
│   │   ├── shifts/             # 班次模块
│   │   ├── exceptions/         # 异常记录模块
│   │   ├── tickets/            # 工单模块（补偿规则/责任建议）
│   │   ├── compensations/      # 赔付模块
│   │   ├── station/            # 站点模块（运力监控）
│   │   ├── peak-plans/         # 高峰预案模块
│   │   ├── weather/          # 天气预警模块（运力调整API）
│   │   ├── merchant-performance/  # 商户履约评分模块（新增）
│   │   ├── gateway/            # WebSocket 网关
│   │   └── seed/               # 种子数据（新增补偿规则）
│   ├── data/                   # SQLite 数据库文件
│   └── uploads/                # 上传文件存储
│   ├── Dockerfile           # 后端 Docker 构建
│   └── .dockerignore        # 后端 Docker 忽略文件
├── nginx.conf                  # Nginx 配置（Docker 使用）
├── docker-compose.yml          # Docker Compose 编排
├── Dockerfile                  # 前端 Docker 构建
└── .dockerignore             # 前端 Docker 忽略文件
```

## 功能模块说明

### 恶劣天气运力调整

| 功能 | 说明 |
|------|------|
| 天气预警发布 | 站点可发布暴雨/高温等预警，设置黄色/橙色/红色级别 |
| 配送范围缩小 | 预警可配置配送范围缩小比例（0-100%） |
| 预计送达延长 | 预警可配置 ETA 延长分钟数，自动应用到活动订单 |
| 骑手班次调整 | 支持延迟/减少/取消班次策略，可配置延迟分钟数 |
| 一键应用运力调整 | 预警卡片点击一键应用，批量修改订单 ETA 和骑手班次 |
| 订单影响因素展示 | 订单列表/详情页显示天气影响标签和说明 |
| 客服责任判定保护 | 恶劣天气自动建议平台责任，禁止判定骑手责任 |

### 商户出餐慢认定

| 功能 | 说明 |
|------|------|
| 到店时间记录 | 骑手到店自动记录时间戳 |
| 商户确认出餐 | 商户端/骑手端确认出餐时间 |
| 取货照片上传 | 取货时上传照片凭证 |
| 超时阈值检测 | 默认 10 分钟阈值，超时自动记录 |
| 等待计时器 | 骑手端实时显示等待时长，超阈值变红警告 |
| 商户履约评分 | 出餐慢自动扣分，按影响分数扣减 |
| 出餐慢申诉 | 商户可对出餐慢记录发起申诉 |
| 顾客补偿口径 | 根据补偿规则自动计算顾客补偿金额 |

## 异常责任归属规则

| 异常类型 | 责任归属 | 处理方式 |
|----------|----------|----------|
| 暴雨等恶劣天气（橙/红色预警） | 平台承担 | 自动延长配送时效，不扣骑手超时分，顾客按规则部分退款 |
| 商户出餐慢（>10分钟） | 商户承担 | 补偿骑手等待费用+顾客退款，扣商户履约评分 |
| 骑手摔车/交通事故 | 平台保险承担 | 启动骑手意外险赔付，重新分配订单 |
| 顾客地址错误 | 顾客承担 | 补偿骑手额外配送费，重新配送或退回商户 |

## 顾客补偿规则

| 责任方 | 规则类型 | 计算方式 | 金额区间 |
|--------|----------|----------|----------|
| platform 平台 | 按比例 | 订单金额 × 30% | 5-50元 |
| merchant 商户 | 混合模式 | 订单金额 × 20% | 5-30元 |
| rider 骑手 | 按比例 | 订单金额 × 50% | 10-100元 |
| rider_wait 骑手等待 | 固定金额 | 每单 15元 | 10-25元 |
