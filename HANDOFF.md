# 焦点 Buir Point Studio OS — 交接文档

> 项目当前已冻结。任何下一步（包括排错、优化、部署、数据迁移或 UI 调整）开始前，**必须先向负责人说明计划与影响范围，并获得明确确认**。

## 1. 我们在做什么

这是「焦点 Buir Point」婚礼跟拍工作室的内部 Studio OS：管理订单、拍摄档期、制作流程、订单附件、操作日志与团队成员访问权限。

产品原则：

- `orders` 是唯一业务事实源；订单即档期。
- 不做 SaaS、ERP、CRM、独立排班、文件中心或项目管理系统。
- 视觉为 Studio OS：暖象牙白、深墨绿、细分隔线、低干扰的档案式工作台。

## 2. 已完成

- Next.js App Router + TypeScript + Tailwind + shadcn/ui + Supabase 自托管架构。
- 邮箱密码登录、登录状态保持、登出、profiles 角色与 JSON 权限体系。
- 订单完整 CRUD、搜索/日期/来源/人员/流程筛选、软删除与恢复。
- 订单字段：客户、电话、日期、地点、来源、总价、主/副摄、制作流程状态等。
- Dashboard：月度拍摄节奏、今日拍摄、近期订单、制作提醒、来源概览及移动端现场操作。
- Schedule：基于订单的只读档期视图；不含独立档期表。
- 订单私有附件、业务变更日志、电话与高德地图快捷操作。
- 成员管理：owner/camera 身份、显示名、状态与细粒度权限；人员唯一来源为 `public.profiles`。
- 双机拍摄：`order_camera_assignments`，保留 `orders.assigned_camera_id` 作为主摄兼容字段。
- 品牌已替换为「焦点 Buir Point」；浏览器标题为“焦点 Buir Point · Studio OS”。
- 本地与生产部署均已建立；生产站点为 https://os.buirpoint.top。

## 3. 尚未完成 / 不在当前范围

- 暂无进行中的开发任务；项目处于冻结状态。
- 未实现：PWA/离线、推送通知、独立排班、日历同步、CRM、财务/支付、设备/素材管理。
- 应定期确认数据库备份任务和异机备份是否真实运行；当前最优先保护订单数据。

## 4. 下一步机会（需确认后任选其一）

1. 上线后使用反馈驱动的小范围体验优化。
2. 备份演练：验证数据库备份可恢复，并配置异机/对象存储副本。
3. 针对实际团队工作流完善权限默认值或订单字段。
4. 做一次生产环境健康检查与依赖升级评估。

## 5. 必须避免的错误

- 不新增 `schedule`、`calendar_events`、`customers`、`tasks`、`reminders`、`cameras` 或 `staff` 等重复业务表。
- 不把人员名称存到订单；订单人员必须引用 `profiles.id`，显示名实时关联；历史日志保留当时文本即可。
- 不关闭 Supabase RLS，不把权限仅做成前端隐藏，不直接对所有 `authenticated` 用户开放。
- 不新增 SECURITY DEFINER 业务函数；如确有必要，必须设置安全 `search_path` 并收紧 execute 权限。
- 不泄露或提交 `.env`、`.env.local`、Supabase 密钥、服务器密码或备份文件。
- 不暴露 Postgres、Supabase Studio、Kong 等内部端口到公网；公网仅保留 22/80/443。
- 不把系统改回 SaaS/ERP 卡片墙、KPI 仪表盘、蓝紫科技风或 Google Calendar 式排班。
- 生产构建必须使用：`docker compose --env-file deploy/app.env -f docker-compose.production.yml up -d --build`；不要遗漏 `--env-file`。
- 自托管 Supabase 必须保持 `DISABLE_SIGNUP=true` 且 `ENABLE_EMAIL_SIGNUP=true`：前者关闭公开注册，后者允许已有账号邮箱密码登录。

## 6. 生产环境速览

- 网站：`https://os.buirpoint.top`
- Supabase API：`https://api.buirpoint.top`
- 服务器：香港 Ubuntu；通过 Docker Compose 运行。
- 服务器目录：
  - `/opt/buirpoint/app`：应用与部署脚本
  - `/opt/buirpoint/supabase-project`：自托管 Supabase
  - `/opt/buirpoint/proxy`：Caddy 反向代理
  - `/opt/buirpoint/backups`：数据库备份
- 应用只监听 `127.0.0.1:3100`；Caddy 统一处理 HTTPS。

## 7. 新会话工作方式

每次接手时先：

1. 阅读本文件、`PRODUCT.md`、`DESIGN.md` 与相关 migration。
2. 检查当前 Git 状态和生产/本地环境状态，只做只读诊断。
3. 先输出：目标理解、修改计划、文件/数据库/权限影响范围、验证方式。
4. **等待负责人明确确认后才修改代码、执行 migration、部署或操作服务器。**
