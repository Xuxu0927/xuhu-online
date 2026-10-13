# Xuhu Online

A personal blog with articles, short updates, projects, music, a photo wall, friends and an about page. Based on XingHuiSamaBlogs, retaining the original author attribution and [CC BY-NC 4.0 license](LICENSE).

[中文使用说明](README.md) · [Repository](https://github.com/Xuxu0927/xuhu-online)

## Stack and features

Next.js 16, React 19, TypeScript, Tailwind CSS 4, FastAPI, Python 3.12, Pillow, Docker Compose and Nginx.

- Browser administration: collapsible entries, Markdown import, drafts, rich-text editing, code highlighting, KaTeX and Beijing-time date editing.
- Reading controls: text sizing, article reading mode, back to top, local Source Han Sans Chinese fonts and unchanged monospace code fonts.
- Shared background album: compressed WebP photos, responsive previews, deduplication, image/ZIP import and random image selection.
- Audio upload: MP3 embedded-cover extraction, LRC/plain-text lyrics and editable playlists.
- giscus comments: independent page/article switches, articles enabled by default.
- Visual and JSON configuration, light/dark themes and hidden empty contact fields.

## Windows local setup

Install Node.js 24 and Python 3.12:

```powershell
py -3.12 -m venv .venv-local
.\.venv-local\Scripts\python.exe -m pip install -r my-blog-manager\requirements.txt
cd XHBlogs
npm ci
cd ..
```

Run `Start-Local.bat`, follow the first-run administrator setup, and open http://localhost:18082. Admin login: http://localhost:18082/admin/login. `Stop-Local.bat` stops local processes. Cloud connectivity is not required.

## Structure and media

`XHBlogs/`: website/admin UI; `my-blog-manager/cms_core/`: active API; `legacy/seed/`: initial migration content; `scripts/`, `deploy/`, `tests/`, `docs/`: operations, infrastructure, tests and documentation. Local content and secrets live in ignored `runtime/`; old sources and backups live in ignored `.backups/`.

Photo-wall management imports pictures or ZIP archives into the background album. Images become max-1920px WebP plus 960px/640px previews. Online limits: 8 MB/16 megapixels per image; 24 MB, 80 entries, 64 MB expanded data per ZIP. Prepare larger collections locally. Original photo files remain untouched.

Enable GitHub Discussions, install giscus and configure repository/category IDs. Global comment settings override page/article switches. Hiding comments preserves existing discussions.

## Deployment and verification

Configure `deploy/.env.example`, then run `python3 deploy/deploy.py` on the server. Deployment backs up runtime, builds candidate images and promotes the healthy pair. Use resource limits on small instances. Rollback: `python3 deploy/deploy.py --rollback`.

Local and cloud content are independent. Source deployments preserve cloud articles, uploads, configuration and credentials. New photos are merged separately. Public management routes are hidden; the configured `Open-Cloud-Admin.bat` opens an authorized SSH tunnel to http://localhost:18081/admin/login.

Backend checks: install `my-blog-manager/requirements-dev.txt`, then run `python -m pytest tests/backend -q`. Frontend checks from `XHBlogs`: `npm run typecheck`, `npm test`, `npm run build`. Browser write tests must use isolated storage.

Source Han Sans uses the SIL Open Font License; license/provenance are bundled under `XHBlogs/public/fonts/source-han-sans/`. Photos remain subject to their source licenses.
