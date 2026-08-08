# 摄像工作室订单档期管理系统

Phase 1 / 1.5：Next.js App Router、Supabase Auth、profiles 权限基础与内部工作台框架。

## 日常运行

```bash
pnpm install
pnpm dev
```

访问 `http://localhost:3000`。远程 Supabase 环境需在 `.env.local` 配置：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

不要提交 `.env.local` 或任何真实密钥。

## 一键本地开发环境

前置条件：Docker Desktop 正在运行，并已按 [Supabase CLI 安装说明](https://supabase.com/docs/guides/local-development/cli/getting-started) 将 `supabase` 命令加入 PATH。

```bash
pnpm supabase:local
pnpm dev
```

该命令仅连接 `127.0.0.1` / `localhost`，会启动本地 Supabase、重置本地数据库、应用所有 migration，并创建或更新两个本地测试账号：

| 角色 | 邮箱 | 默认密码 |
| --- | --- | --- |
| owner | `owner@studio.local` | `StudioLocal!2026` |
| camera | `camera@studio.local` | `StudioLocal!2026` |

初始化脚本会验证两个账号可登录，并验证其 profile 的角色和 RLS 自读取权限。它只会在 `.env.local` 不存在或由脚本生成时写入本地公钥配置；若检测到现有的远程配置，会中止而不会覆盖。

如需更换本地测试密码，在 PowerShell 中执行：

```powershell
$env:LOCAL_TEST_PASSWORD = "a-local-development-password"
pnpm supabase:local
```

本地重置会清除本地 Docker 数据库，不影响托管 Supabase 项目。

## 质量检查

```bash
pnpm lint
pnpm build
```
