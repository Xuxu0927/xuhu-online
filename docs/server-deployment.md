# 阿里云个人网站部署

## 入口

- 公开网站：`http://8.133.165.170:8080`。
- 管理后台：运行 `deploy/admin-tunnel.ps1`，然后打开 `http://localhost:18081/admin`。
- 公网 HTTP 入口不开放后台与管理 API。内部内容服务没有公开端口。
- 现有 80 端口网站和 5000 API 保持原样。

## 本地开发

使用 `.venv/Scripts/python.exe -m pip install -r my-blog-manager/requirements-dev.txt` 安装 API 依赖。
进入 `XHBlogs`，运行 `npm ci`。Node 24、生产 Python 3.12；本机 Python 3.14 通过后端测试。

在根目录执行（设置 `PYTHONPATH=my-blog-manager`）：

```text
python -m cms_core.cli migrate
python -m cms_core.cli init-admin --username admin
```

设置 `CONTENT_ROOT` 和 `SECRETS_ROOT` 指向根目录 `runtime` 下的对应目录。
以 `uvicorn cms_core.main:app --host 127.0.0.1 --port 8000` 启动 API。
网站在 18081 端口开发时设置 `ADMIN_ORIGIN=http://localhost:18081`，在 `XHBlogs` 运行 `npm run dev -- --port 18081`。

## 首次部署

1. 将源码上传到独立目录 `/opt/xhblogs`，排除虚拟环境、依赖、`.git`、备份和运行时秘密。
2. 确保目录由部署用户所有。将 `deploy/.env.example` 复制为 `deploy/.env`，按需配置 AI 与天气密钥，不提交真实 `.env`。
3. 运行 `sh deploy/deploy.sh`，顺序构建 API 和网站。初始化内容由 API 容器首次启动导入，之后不会覆盖编辑内容。
4. 使用 SSH 交互执行 `docker compose -f deploy/compose.yaml exec api python -m cms_core.cli init-admin --username admin` 设置管理员密码；不要在命令中写密码。
5. 将 `deploy/nginx-xhblogs.conf` 安装为独立站点配置，先 `sudo nginx -t`，成功后 `sudo systemctl reload nginx`。
6. 阿里云安全组按需允许 TCP 8080；不开放 8000、18080、18081。检查已有主机防火墙，保留 SSH 规则。
7. 核对公网访问、SSH 隧道后台、日志与既有网站。

## 更新与回退

上传新源码时不覆盖 `/opt/xhblogs/runtime`、`backups` 和真实 `.env`。
再次运行 `deploy/deploy.sh`，会先备份正在运行的数据，并保留上一版镜像。
应用更新失败后运行 `deploy/rollback.sh`，内容目录不回退或删除。

## 备份与恢复

`sh deploy/backup.sh` 生成权限为 600 的内容和秘密备份，位于 `/opt/xhblogs/backups`。
`sh deploy/restore.sh site-日期.tar.gz restored-日期` 恢复到新的隔离目录；它不会覆盖线上数据。
先核对恢复结果，再在维护窗口中切换数据。备份含密码哈希与服务端密钥，不上传公开仓库。

## 内容和设置

后台支持文章、杂谈、草稿、关于、说说、相册、项目与友链。
正文以 Markdown 为规范格式，可切换富文本编辑；保存草稿不公开，发布队列执行后直接更新网站。
相册、友链和项目暂用结构化 JSON 编辑，格式与原数据字段一致，后端校验结构。
修改管理员密码后全部现有会话退出。当前版本为单管理员。

公开配置在 `runtime/content/site.json`，密码哈希和会话在 `runtime/secrets`。
原始文章与配置保留在源码中；首次迁移冲突会保存到 `.migration-conflicts` 并在 `.migration.json` 记录。

## 可选外部功能

- AI：在 `deploy/.env` 填写 `GEMINI_API_KEY` 后重建容器环境，模型与提示词在后台设置。
- 天气：配置 `QWEATHER_KEY`，外部账号还需匹配对应 API Host 与认证方式。
- 评论：目前使用配置的 GitHub Issues 仓库作为安全留言入口。旧 Gitalk 已移除；OAuth 在线评论尚未接入，不在浏览器保存 Secret。
- 音乐：依赖网易云外链及版权可用性，失败不会阻止网站运行。
- 图片：后台直接上传到持久化本地图片目录，不依赖图床账号。

## 验证

后端 `python -m pytest tests/backend -q`；前端 `npm run test`、`npm run typecheck`、`npm run lint`、`npm run build`。
浏览器测试仅使用 `scripts/test-api-server.py` 的隔离目录和测试账号；不得把测试账号初始化到生产数据中。
使用域名 HTTPS 后调整 Nginx 和 `ADMIN_ORIGIN`，启用公开 HTTPS 管理入口；HTTP IP 阶段继续使用 SSH 隧道。
