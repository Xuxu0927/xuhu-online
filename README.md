# Xuhu Online · 个人博客

以文章、说说、项目、音乐和照片墙为核心的个人网站。前台采用明暗两套毛玻璃界面，后台支持 Markdown、数学公式、图片导入和音乐上传。

[English](README_en.md) · [项目仓库](https://github.com/Xuxu0927/xuhu-online)

## 功能

- 写作：折叠式文章管理、草稿、MD 导入、富文本和预览、北京时间编辑、代码高亮与 KaTeX。
- 阅读：二级目录、字号调节、阅读模式、回到顶部；中文使用本地思源黑体，代码字体保持系统等宽字体。
- 照片墙：相册、搜索、预览；共享背景图库，图片自动压缩、重命名、去重，支持随机选图及图片/ZIP 导入。
- 音乐：MP3/WAV/OGG/M4A/FLAC 上传、识别 MP3 内嵌封面、编辑曲目、导入 LRC/文本歌词。
- 评论：giscus/GitHub Discussions，栏目与文章独立开关，文章默认开启。
- 配置：可视化与 JSON 编辑同一份配置，未填的联系方式隐藏。
- 运维：本地和云端数据独立，候选镜像、健康检查、备份和回滚。

## 技术与目录

Next.js 16 / React 19 / TypeScript / Tailwind CSS 4；FastAPI / Python 3.12 / Pillow；Docker Compose / Nginx。

```text
XHBlogs/                 网站和浏览器后台
  app/                   页面、路由、样式
  components/            按功能分组的界面组件
  lib/                   内容、日期、评论等共享逻辑
  public/                图片、字体及许可
my-blog-manager/
  cms_core/              当前 FastAPI 内容服务
  requirements.txt       后端依赖
legacy/seed/             首次启动的历史内容种子
scripts/                 本地启动与素材处理脚本
deploy/                  Docker、Nginx、部署和回滚
tests/backend/           后端测试
docs/                    设计和使用说明
runtime/content/         本机内容及上传文件（不提交）
runtime/secrets/         本机管理员凭据和会话（不提交）
.backups/                本机备份和旧源码归档（不提交）
```

旧桌面管理器已退出运行流程，使用网站 `/admin` 管理即可。

## 本地运行

安装 Node.js 24、Python 3.12，在仓库根目录使用 PowerShell：

```powershell
py -3.12 -m venv .venv-local
.\.venv-local\Scripts\python.exe -m pip install -r my-blog-manager\requirements.txt
cd XHBlogs
npm ci
cd ..
```

双击 **Start-Local.bat** 启动，首次按提示设置本地管理员密码；**Stop-Local.bat** 停止本地服务。

- 本地网站：http://localhost:18082
- 本地后台：http://localhost:18082/admin/login
- 内容服务：本机 18084 端口

本地启动不依赖云端 SSH，服务器离线也能使用。本地账号和云端账号分别管理，密码不写入源码。

## 写作、图片和评论

文章时间选择框按北京时间显示；保存草稿、确认预览后加入发布队列并发布。

照片墙管理的“导入图片 / ZIP”将图片加入“背景”相册，所有随机按钮共用这个图库。生成最长边不超过 1920px 的 WebP 和 960px/640px 缩略图；重复文件不重复加入。在线单图上限 8 MB、1600 万像素；ZIP 上限 24 MB、80 个条目、展开体积 64 MB。大型素材先在本地处理，原文件保留。

本地准备好的素材可运行 `.\.venv-local\Scripts\python.exe scripts\register-prepared-scenery.py`，读取 `.backups/scenery-prepared/manifest.json`，复制压缩图并合并背景相册。素材准备脚本与样例见 `scripts/`，后续不同来源应单独建立清单。

评论需要仓库开启 GitHub Discussions 并安装 giscus 应用，在网站设置填写仓库及分类 ID。全局开关优先，各栏目和文章可独立控制；关闭不删除历史留言。

## 云端部署与后台

参考 `deploy/.env.example` 配置环境，在服务器应用目录运行 `python3 deploy/deploy.py`。部署先备份运行数据，构建候选镜像，通过健康检查后更新当前版本；小内存实例使用现有资源限制并避免并行构建。回滚命令：`python3 deploy/deploy.py --rollback`。

公开入口隐藏 `/admin` 和 `/api/cms`。当前机器双击 **Open-Cloud-Admin.bat**，通过已配置 SSH 密钥建立隧道，访问 http://localhost:18081/admin/login。其他机器需先配置自己的授权 SSH 密钥。

**本地文件不会自动同步云端。** 源码部署与内容迁移分别处理：云端后台保存到云端 `runtime/content`，本地后台保存到本机目录。部署保留云端文章、音乐、配置及密钥；新增图片和相册记录增量合并，不用本地内容目录覆盖云端。

## 验证

```powershell
.\.venv-local\Scripts\python.exe -m pip install -r my-blog-manager\requirements-dev.txt
.\.venv-local\Scripts\python.exe -m pytest tests\backend -q
cd XHBlogs
npm run typecheck
npm test
npm run build
```

浏览器写入测试使用隔离内容服务与测试账号，参考 `scripts/test-api-server.py`、`XHBlogs/tests/e2e/`，不要对生产文章执行测试写入。

## 许可与致谢

基于 XingHuiSamaBlogs 改造，保留原作者 XingHuiSama 署名及 [CC BY-NC 4.0 许可](LICENSE)。思源黑体由 Adobe 与 Google 合作开发，采用 SIL Open Font License，许可与来源位于 `XHBlogs/public/fonts/source-han-sans/`。背景照片以素材提供方许可为准。
