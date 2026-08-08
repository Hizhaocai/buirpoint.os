# 摄像工作室订单档期管理系统

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js App Router、TypeScript、Tailwind CSS、shadcn/ui 与 Supabase。由项目需求确认。

## Users

工作室负责人负责全局协调、订单与档期管理。摄像师通过 PC 或手机浏览器查看已分配的工作。

## Product Purpose

为单个摄像工作室提供长期使用的订单与拍摄档期工作台，减少排期遗漏并保留可追溯的操作记录。

## Positioning

系统围绕一间摄像工作室的拍摄节奏组织信息，而不是通用 ERP 或多租户 SaaS。

## Operating Context

负责人通常在 PC 上进行日常协调，摄像师会在拍摄现场通过手机查看任务。每年约数百笔订单，只记录订单总价，不处理支付或财务。

## Capabilities and Constraints

- 使用邮箱和密码登录，账号由管理员在 Supabase 中创建。
- 两种角色：owner 与 camera。
- 后续范围包括订单、档期、附件、操作日志和冲突提醒。
- 本阶段仅完成身份、权限、基础布局与受保护页面。

## Evidence on Hand

暂无品牌素材、真实订单、团队名单或历史数据。界面中的工作台内容使用不构成业务记录的基础引导文案。

## Product Principles

1. 拍摄前的协调信息应一眼可读。
2. 权限和操作记录必须由服务端保证。
3. 复杂业务功能应建立在稳定、克制的工作台基础上。
4. 桌面端效率与移动端现场可读性同等重要。
