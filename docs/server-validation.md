# 实施记录

设计与计划见 `docs/superpowers`。部署目标为独立 8080 入口，已有站点保留。

## 决策记录

- Ruling: 用户提供 GitHub 仓库后，允许在工作区初始化版本管理并设置远程；替代原计划“无 Git 时不初始化”的限制。首次推送前检查秘密和运行数据。
- Ruling: 生产服务只装配新版内容路由，旧部署与镜像同步代码不用于线上服务。
- Task 1: in progress — 备份、依赖与基线验证。

- Backend: 13 passed, 1 Windows symlink test skipped; sandbox temp-directory errors require elevated test runs, not application fixes.
- Frontend: initial 5 type defects fixed; runtime content, Markdown sanitization and operation queue tests passed.
- Ruling: old Gitalk pulls vulnerable dependencies and exposes secrets; remove it. Until OAuth credentials exist, provide a safe GitHub Issues link and report OAuth integration as not configured.
- Ruling: co-locate initial API routes in cms_core/server.py for the first verified service, then split when endpoint size warrants it.

- Backend: 17 passed, one Windows symlink test skipped; production Linux image will run this same suite.
- Frontend: six behavior tests, typecheck and production build passed; 11 browser cases passed including draft restore and publication.
- Ruling: use ESLint recommended TS rules and hooks correctness; old display components retain explicit-any warnings, while new admin/API code retains error severity. No production TS check is skipped.
- Ruling: initial production password is randomly generated and stored only in an ignored local access file; only its hash/signing configuration transfers over SSH. The admin can change it from settings.
- Ruling: migration bootstrap uses public-only seeds; no original secret setting migrates automatically.
- Deployment: isolated /opt/xhblogs created; existing site still returns 200 during image downloads.

## 独立审查与修复

- Fresh reviewer reported six important issues, no confirmed authentication bypass.
- Fixed: old publish retry preserves newer draft; response applies to latest queue; drafts include content type; rich editor syncs uploaded content; candidate images preserve verified rollback pair; about/config/collection conflicts are archived without secrets.
- Regression evidence: 21 backend tests pass, one Windows-only symlink capability skip; rich upload/math browser case passes. Candidate build failure/retry test passes.
- Deployment cannot be accepted yet: after interruption SSH banner and existing public 80 endpoint time out. Console status requested; no Nginx public entry has been installed.
- GitHub deploy key authorization is now valid (remote repository is empty).

- Ruling: after the server reboot, use sequential legacy Docker builds with hard cgroup limits (1024 MB RAM, 1536 MB RAM+swap, one CPU), Node heap 512 MB and Webpack. Server confirmed memory/swap enforcement support. Prefer protecting existing service responsiveness over maximum build speed.
