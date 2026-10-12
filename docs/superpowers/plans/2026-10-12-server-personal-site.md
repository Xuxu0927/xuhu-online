# 个人网站服务器改造 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有个人博客改造成支持浏览器管理、持久化内容和安全发布的服务器网站，并部署到阿里云公网 IP 的独立端口。

**Architecture:** `XHBlogs` 作为唯一生产 Next.js 应用，迁入 `/admin` 管理页面；FastAPI 仅通过内部网络提供受保护的内容接口。两者共享结构化公开内容，秘密目录仅供 FastAPI 使用；Nginx 区分公开 8080 入口和用于 SSH 隧道的环回管理入口。

**Tech Stack:** Next.js 16、React 19、TypeScript、Tiptap、Python/FastAPI、Markdown/YAML、Docker Compose、Nginx；pytest、Vitest、Playwright 用于关键验证。

**Spec:** `docs/superpowers/specs/2026-10-12-server-personal-site-design.md`

## Global Constraints

- 公网测试入口为 `http://8.133.165.170:8080`；保持现有 80、5000 端口服务及 `/var/www/training`。
- 服务器为 Ubuntu 24.04、2 核、约 1.6 GB RAM、2 GB Swap；构建任务串行执行。
- 使用现有 SSH 密钥与已核对的服务器指纹；不禁用主机验证。
- 本机后端验证使用 `.venv/Scripts/python.exe`；生产镜像使用 Python 3.12。
- Node.js 必须满足现有 Next.js 锁文件要求的 `>=20.9.0`；部署采用 Node 24。
- 保留原始内容，迁移不覆盖同名不同内容；不得调用危险的旧更新与任意目录同步接口。
- 管理后台在公网 HTTP 阶段通过 SSH 隧道访问；域名 HTTPS 是后续切换，不是第一阶段前提。
- 代码升级不得替换持久化数据目录；公开配置不含秘密。
- 根目录没有 Git 仓库：先创建工作区内容备份和变更清单；不擅自初始化仓库，任务完成以文件和验证结果记录，不执行 commit。

## Review Focus

1. 同名但内容不同的两端文章：两份均保留、差异可追踪，不以时间戳默默丢弃任何版本（Task 2）。
2. 浏览器刷新或网络中断后的发布重试：草稿可恢复，不重复创建已发布文章（Tasks 3、7）。
3. 伪造 Origin、Cookie 或转发头：不能取得管理员权限或绕过公网入口限制（Tasks 4、10）。
4. 文章中的 HTML、代码、引用和数学公式：危险结构清洗后合法内容不损坏（Tasks 3、6、8）。
5. 更新失败或容器重建：内容和密钥保留，已有 80 端口站点仍可用（Task 10）。

## 文件职责

- `my-blog-manager/cms_core/settings.py`：内容根目录、秘密目录及环境变量。
- `my-blog-manager/cms_core/models.py`：内容、配置、队列和响应模型。
- `my-blog-manager/cms_core/storage.py`：路径限制、原子写入、锁、回收与备份。
- `my-blog-manager/cms_core/migrate.py`：旧 Markdown/TS 数据导入与差异清单。
- `my-blog-manager/cms_core/content.py`：草稿、发布、说说、公开配置与集合业务。
- `my-blog-manager/cms_core/auth.py`：密码哈希、会话、登录限制及身份依赖。
- `my-blog-manager/cms_core/api/content.py`、`api/auth.py`、`api/uploads.py`：新版路由；`main.py` 仅装配新版生产路由。
- `my-blog-manager/cms_core/cli.py`：初始化管理员、迁移、备份、恢复。
- `XHBlogs/lib/content.ts`、`config-types.ts`：服务器运行时读取和公开类型。
- `XHBlogs/components/SiteConfigProvider.tsx`：向客户端传递白名单配置。
- `XHBlogs/lib/cms-proxy.ts`、`app/api/cms/[...path]/route.ts`：受限同源代理。
- `XHBlogs/components/admin/`、`app/admin/`：登录、编辑器、设置、列表和队列。
- `deploy/`：生产镜像、Compose、Nginx 与部署/备份/隧道脚本。
- `tests/backend/`、`XHBlogs/tests/`：行为测试与浏览器验收。

## Task 1：建立运行基线和可恢复的开发环境

**Files:** Create `my-blog-manager/requirements.txt`, `my-blog-manager/requirements-dev.txt`, `tests/backend/conftest.py`, `docs/server-validation.md`; modify `XHBlogs/package.json`, `my-blog-manager/Start.bat`。

**Interfaces:** 安装后支持 `python -m pytest tests/backend`；前端支持 `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e`。

- [ ] 对现有内容、配置和将修改的源文件建立工作区备份；排除 `.venv`、依赖目录及 SSH 私钥，记录校验和。
- [ ] 写启动脚本版本解析验证：Python 3.12 通过，3.9 返回明确错误；运行确认当前脚本失败。
- [ ] 修复 `Start.bat` 的版本字段和括号变量展开；保持服务器运行不依赖该脚本。
- [ ] 用项目虚拟环境安装后端运行及测试依赖；固定已验证版本。安装前端锁定依赖并阅读 `node_modules/next/dist/docs/` 的相关本地指南。
- [ ] 在 `tests/backend/conftest.py` 将 `my-blog-manager` 加入测试模块搜索路径，每个测试使用隔离临时内容/秘密目录，禁止落盘到真实文章目录。
- [ ] 记录原始类型检查、Lint、构建的错误；加入测试命令，不用忽略配置掩盖失败。
- [ ] 检查本机 Docker/WSL 构建能力，仅决定构建位置，不更改服务器配置。

## Task 2：安全存储与非破坏性迁移

**Files:** Create `cms_core/settings.py`, `storage.py`, `migrate.py`, `tests/backend/test_storage.py`, `test_migrate.py`。

**Interfaces:** `safe_path(root: Path, category: str, item_id: str, suffix: str) -> Path`; `atomic_write(path: Path, content: str) -> None`; `migrate_sources(manager: Path, blog: Path, target: Path) -> dict`。

- [ ] 写失败测试：`safe_path(root, 'posts', '../escape', '.md')` 和绝对路径被拒绝；符号链接逃逸被拒绝；合法中文内容往返一致；写入失败保留旧文件。
- [ ] 写失败测试：同名不同正文保留备份与差异记录；管理端优先成为公开初始版本；再迁移不覆盖已经编辑的目标文件。
- [ ] 运行 `python -m pytest tests/backend/test_storage.py tests/backend/test_migrate.py -q`，确认缺失实现导致失败。
- [ ] 实现目录边界、同文件系统原子替换和操作锁；从旧数据导入 Markdown 与公开 JSON，秘密另存；迁移器不 `eval` TS。
- [ ] 实现删除移入回收区及版本化迁移标记；输入无有效配置时明确失败，不返回空配置成功。
- [ ] 重跑测试通过，在隔离临时目录迁移真实样例，核对数量与校验和，不修改原内容。

## Task 3：结构化内容 API 与可靠发布

**Files:** Create `cms_core/models.py`, `content.py`, `api/content.py`, `tests/backend/test_content.py`；modify `cms_core/main.py`。

**Interfaces:** Pydantic 模型 `ArticleInput`, `MomentInput`, `PublicSiteConfig`, `OperationInput`；每项操作含 `operationId`, `kind`, `resourceId`, `payload`。接口为 `/api/config`, `/api/collections/{name}`, `/api/drafts`, `/api/articles`, `/api/moments`, `/api/operations`；响应含 `success` 与逐项结果。

- [ ] 写失败测试：配置中的数组、带引号字符串、布尔值、温度与 Token 数往返一致；未知字段和错误类型返回 422。
- [ ] 写失败测试：保存草稿不修改文章；重复提交相同 operationId 只发布一次；不同标题但同 ID 更新同一篇文章；相同标题不同 ID 不覆盖。
- [ ] 写失败测试：部分任务失败后成功项被标记完成；发布中断后重试不产生第二份文章。
- [ ] 写往返样例覆盖链接、引用、列表、代码语言、表格、数学公式和图片；正文规范为 Markdown，富文本转换只发生在明确边界。
- [ ] 运行 `python -m pytest tests/backend/test_content.py -q`，确认失败后实现模型、业务和新版路由。
- [ ] 将生产 `main.py` 与旧部署/目录同步路由隔离；保持 API 错误状态准确，不暴露物理路径或秘密。
- [ ] 重跑存储与内容测试，确认发布完成后持久化 JSON/Markdown 正确。

## Task 4：管理员身份与接口权限

**Files:** Create `cms_core/auth.py`, `api/auth.py`, `cli.py`, `tests/backend/test_auth.py`；modify `main.py`。

**Interfaces:** `hash_password(password: str) -> str`, `verify_password(password: str, encoded: str) -> bool`, `require_admin(request: Request) -> str`；`/api/auth/login`, `/session`, `/logout`；CLI `python -m cms_core.cli init-admin` 从交互提示读取密码。

- [ ] 写失败测试：未登录读写管理数据返回 401；错误密码失败；成功登录发 HttpOnly 会话；伪造、过期和注销的会话均失败。
- [ ] 写失败测试：跨 Origin 写请求拒绝；错误登录超过限制返回 429；无管理员初始化时服务不给默认密码。
- [ ] 写失败测试：公开配置和错误输出不含图床 Token、OAuth Secret 或密码哈希。
- [ ] 运行 `python -m pytest tests/backend/test_auth.py -q`，确认失败后实现加盐哈希、签名会话和服务端验证。
- [ ] 明确代理传递 Cookie/Set-Cookie 和受信来源；秘密目录只读写服务端文件。
- [ ] 验证登录/注销与所有新版管理路由的权限覆盖，删除通配 CORS。

## Task 5：公开网站的运行时内容与配置

**Files:** Create `XHBlogs/lib/content.ts`, `config-types.ts`, `components/SiteConfigProvider.tsx`, `tests/content.test.ts`；modify `app/layout.tsx`, `app/page.tsx`, `app/posts/[slug]/page.tsx`, `app/chatter/page.tsx`, `app/chatter/[slug]/page.tsx`, `app/moments/page.tsx`, `app/about/page.tsx`, `app/photowall/page.tsx`, `app/friends/page.tsx`, `app/projects/page.tsx`, `app/timeline/page.tsx`, `app/tree/page.tsx`。

**Interfaces:** `getContentRoot(): string`, `readPublicConfig(): PublicSiteConfig`, `readCollection<T>(name: 'albums'|'friends'|'projects'): T[]`, `readDocuments(category: 'posts'|'chatters'|'moments'): PublishedDocument[]`, `useSiteConfig(): PublicSiteConfig`。

- [ ] 写 Vitest 失败测试：改变磁盘 JSON 后下一次读取获得新值；秘密字段被丢弃；日期规范化；非法 slug 不逃逸；缺文件与损坏文件行为不同。
- [ ] 运行 `npm run test -- tests/content.test.ts`，确认失败后实现服务器运行时读取及白名单配置 Provider。
- [ ] 公共页面统一调用内容帮助函数，按 Next 本地文档明确动态/缓存行为；保留现有页面布局和交互。
- [ ] 客户端组件的 `siteConfig` 导入替换为 `useSiteConfig`，服务端组件使用 `readPublicConfig`；公开配置默认值从受控模块读取。
- [ ] 迁移相册、友链、项目到运行时集合；上传图片走受限公开读取端点。
- [ ] 重跑测试并验证无需重新构建即可更新文章与背景、歌单、友链配置。

## Task 6：同源代理、上传及第三方功能

**Files:** Create `XHBlogs/lib/cms-proxy.ts`, `app/api/cms/[...path]/route.ts`, `lib/markdown.ts`, `app/uploads/[...path]/route.ts`, `tests/proxy.test.ts`, `tests/markdown.test.ts`, `cms_core/api/uploads.py`, `tests/backend/test_uploads.py`；modify `app/api/chat/route.ts`, `app/api/github/route.ts`, `app/api/music/route.ts`, `app/api/weather/route.ts` 及三个评论组件。

**Interfaces:** `proxyCms(request: Request, segments: string[]): Promise<Response>`；`renderMarkdown(markdown: string): Promise<string>`；上传接口仅接受受限图片，文件名由服务端生成。

- [ ] 写失败测试：代理拒绝旧 `/deploy`、`/sync` 与非白名单路径；正确传播 401、422、Set-Cookie；超时返回 504；不信任客户端指定的内部目标。
- [ ] 写失败测试：Markdown 的事件属性、脚本和 javascript URL 被移除，代码/链接/引用/数学输出保留。
- [ ] 写失败测试：超限/伪装上传被拒绝，上传名不能覆盖已有文件，远程图床不能指向内网地址。
- [ ] 运行对应 Vitest 与 pytest，确认失败后实现代理、统一渲染和上传。
- [ ] 评论兑换请求由 Next 转发到 FastAPI 的专用 `/api/public/oauth`；该内部接口校验独立服务凭据并从秘密目录读取 Secret，公共网站不挂载秘密目录。配置缺失时展示禁用状态；校验 OAuth 回调来源与 state，不在客户端组装 Secret。
- [ ] 公共 AI/music 请求限制长度、ID 数和并发，设置超时；天气位置/服务地址可配置；外部服务异常提供降级。
- [ ] 重跑测试，扫描客户端源码和构建产物，确认无秘密字段值。

## Task 7：迁移浏览器管理后台

**Files:** Create `XHBlogs/app/admin/layout.tsx`, `page.tsx`, `login/page.tsx`, `editor/page.tsx`, `drafts/page.tsx`, `settings/page.tsx`, `components/admin/AdminShell.tsx`, `OperationProvider.tsx`, `cms-client.ts`；迁入 `my-blog-manager/components/editor/` 和可复用设置组件到 `XHBlogs/components/admin/`；create `tests/operations.test.ts`, `tests/e2e/admin.spec.ts`。

**Interfaces:** `cmsFetch<T>(path: string, init?: RequestInit): Promise<T>`；`Operation` 与 Task 3 字段一致；`enqueue(op)`, `removeCompleted(ids)`, `restoreQueue()`。

- [ ] 写失败测试：队列按资源 ID 去重；同标题不同文章保留；恢复队列后数据一致；成功项单独移除，失败项保留；无秘密字段持久化。
- [ ] 写浏览器验收：未登录跳转登录；保存草稿、刷新、打开编辑器、发布后访客页面可见；修改背景/配置后立即生效。
- [ ] 运行 `npm run test -- tests/operations.test.ts` 与管理端浏览器用例，确认缺失页面导致失败。
- [ ] 迁移现有 Tiptap 编辑器并实现 Markdown 往返，统一 `/api/cms` 相对地址；移除端口 JSON、pywebview 和 Git 部署按钮。
- [ ] 新后台覆盖文章、杂谈、说说、关于、相册、友链、项目和设置；公共导航没有编辑/删除按钮。
- [ ] 重跑测试，通过受保护管理入口完成完整操作流程，记录浏览器错误。

## Task 8：完成构建、SEO 和交互验证

**Files:** Modify `XHBlogs/next.config.ts`, `package.json`, `eslint.config.mjs`, `app/tree/CreativeWorkshopClient.tsx`；create `app/sitemap.ts`, `app/robots.ts`, `tests/e2e/public.spec.ts`；修复构建实际报告的其他生产入口文件。

**Interfaces:** standalone 生产镜像；后台 robots 不索引；文章独立 metadata；低性能效果开关从公开配置 Provider 读取。

- [ ] 编写公共页面浏览器用例：首页、文章、杂谈、说说、相册、项目、友链、音乐、关于和灵境；桌面与手机尺寸均无阻断主流程错误。
- [ ] 设置真实站点 URL 生成 sitemap，文章标题/摘要不共用全站默认值；后台 noindex。
- [ ] 根据实测将 3D 模块按需加载并提供效果降级开关；保留现有视觉风格。
- [ ] 关闭 `ignoreBuildErrors`，删除过期配置，修复实际类型、Lint 和生产构建错误。
- [ ] 串行运行 `npm run typecheck`、`npm run lint`、`npm run test`、`npm run build`、`npm run test:e2e`；全部通过才进入部署。
- [ ] 对 Python 3.12 生产镜像运行相同关键后端测试；不只依赖本机 Python 3.14 的结果。

## Task 9：生产部署包与备份工具

**Files:** Create `deploy/Dockerfile.web`, `Dockerfile.api`, `compose.yaml`, `nginx-xhblogs.conf`, `.env.example`, `deploy.sh`, `backup.sh`, `restore.sh`, `admin-tunnel.ps1`, `tests/backend/test_backup.py`, `docs/server-deployment.md`；modify `cms_core/cli.py`。

**Interfaces:** 服务端应用目录 `/opt/xhblogs`；web 环回 `127.0.0.1:18080`；管理 Nginx 入口 `127.0.0.1:18081`；公开 Nginx `8080`；API 仅 Compose 内部网络。

- [ ] 写备份恢复失败测试：恢复到独立目录后内容/秘密校验和一致；拒绝恶意归档路径；不覆盖非本项目目录。
- [ ] 配置容器持久化目录、非 root 运行、健康检查、日志轮换、自动重启；Next 只读公开内容，API 可写内容和秘密。
- [ ] 公开 Nginx 入口拒绝 `/admin` 和所有管理 `/api/cms` 路由；环回入口提供管理访问。入口身份由受控代理决定，客户端伪造转发头无效。
- [ ] 隧道工具将本机 `18081` 转发到服务器环回 `18081`，浏览器打开 `http://localhost:18081/admin`。
- [ ] 管理员初始化通过隧道或 SSH 交互完成，不把初始密码放入命令、日志或聊天；不在自动化输出中打印会话/秘密。
- [ ] 运行备份测试、`docker compose config --quiet`、镜像健康检查和隔离恢复演练。
- [ ] 文档写明构建位置、环境变量、阿里云安全组、管理员访问方式和 HTTPS 后续切换步骤。

## Task 10：服务器发布与最终验收

**Files:** Update `docs/server-validation.md`，服务器只新增 `/opt/xhblogs` 与独立 Nginx 配置；不覆盖已有 default 站点。

**Interfaces:** 公开 `http://8.133.165.170:8080`；管理经本机 SSH 隧道；保留上一版本镜像与数据备份。

- [ ] 只读重新检查应用目录、目标端口、磁盘、内存及旧网站响应；备份将涉及的 Nginx 配置并记录旧站点检查结果。
- [ ] 上传排除虚拟环境、node_modules、私钥与真实秘密的部署包；校验传输摘要，首次迁移内容到持久化目录。
- [ ] 按已确认构建方式串行构建，启动独立 Compose 服务；失败时保持旧站点服务，保存准确诊断。
- [ ] 新增 Nginx 8080 与环回管理入口，`nginx -t` 成功后 reload；原配置不替换。
- [ ] 本机/外部验证公网入口；若阿里云安全组拦截且无云权限，提供所需精确规则并报告公网验收未完成。
- [ ] 执行恶意转发头、无会话管理调用与公开秘密扫描；通过隧道完成登录、草稿、发布、配置及上传验收。
- [ ] 重启和重建容器，验证新内容保留；在独立目录恢复备份，并检查原 80 端口网站与 5000 API 可用性。
- [ ] 记录实际访问入口、资源占用、各项验收结果与第三方功能状态；失败项不得标为已完成。

## 执行与进度规则

任务按以上顺序执行；每个任务先运行目标行为测试确认失败，再实现并验证。
任务完成更新勾选与验证记录。仅在出现新修改、失败或未决风险时扩大测试。
建议由当前会话直接实施，保持接口和迁移决策连续；如用户选择分工，另启子代理工作流。
当前阶段仅编写与审阅计划，不安装产品依赖、不修改生产代码、不变更服务器服务。
