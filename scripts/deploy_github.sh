#!/usr/bin/env bash
# 把主页发布到 GitHub Pages：https://royfu-rl.github.io
#   GH_TOKEN=ghp_xxx bash scripts/deploy_github.sh
#
# - 只上传网站本身：*.html + assets/（不传 README、scripts）
# - 上传的是临时副本，本地文件不改；副本里把公网打不开的链接处理掉（见下面 python 段）
# - token 只通过环境变量传给 git 的请求头，不写进任何文件
set -euo pipefail
USER=royfu-rl
REPO=$USER.github.io
PROXY=${PROXY:-http://127.0.0.1:41997}
SITE=$(cd "$(dirname "$0")/.." && pwd)
: "${GH_TOKEN:?先 export GH_TOKEN=ghp_xxx}"

api() { curl -sf -x "$PROXY" -H "Authorization: token $GH_TOKEN" -H "Accept: application/vnd.github+json" "$@"; }
git_() { git -c http.proxy="$PROXY" -c credential.helper= \
             -c http.extraHeader="Authorization: Basic $(printf 'x-access-token:%s' "$GH_TOKEN" | base64 -w0)" "$@"; }

# 1. 仓库不存在就建（公开）
api "https://api.github.com/repos/$USER/$REPO" >/dev/null \
  || api -X POST https://api.github.com/user/repos -d "{\"name\":\"$REPO\",\"description\":\"Roy's homepage\"}" >/dev/null
ID=$(api https://api.github.com/user | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')

# 2. 拉仓库，换成本地最新的网站文件
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
git_ clone -q "https://github.com/$USER/$REPO.git" "$TMP/repo" 2>/dev/null
find "$TMP/repo" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp "$SITE"/*.html "$TMP/repo/" && cp -r "$SITE/assets" "$TMP/repo/" && touch "$TMP/repo/.nojekyll"

# 3. 公网打不开的链接：已上线的博客换成线上地址，没公开的换成 Opening Soon，内网文档整篇去掉
python3 - "$TMP/repo" <<'EOF'
import hashlib, re, sys
from pathlib import Path
root = Path(sys.argv[1])
ver = lambda m: f'{m[1]}?v={hashlib.md5((root / m[1]).read_bytes()).hexdigest()[:8]}"'   # 改了 CSS / JS 不吃旧缓存
for p in root.glob('*.html'):
    s = p.read_text()
    s = re.sub(r'(assets/(?:css|js)/[\w.-]+\.(?:css|js))(?:\?v=\w+)?"', ver, s)
    s = s.replace('../kat-coder-rl-blog/index.html', 'https://royfu-rl.github.io/kat-coder-rl-blog/')
    hidden = r'\.\./(?:critic-blog/index\.html|final-visual-code-blog/output/total\.html)'
    s = re.sub(rf'<a class="cta" href="{hidden}"[^>]*>.*?</a>', '<span class="cta soon">Opening Soon</span>', s)   # Experience
    s = re.sub(rf'<h3 class="post-title"><a href="{hidden}"[^>]*>(.*?)</a></h3>(\s*<p class="post-desc">.*?</p>)',
               r'<h3 class="post-title">\1</h3>\2\n        <span class="soon">Opening Soon</span>', s)            # 首页项目卡片
    s = re.sub(rf'<a href="{hidden}"[^>]*>(.*?)</a>', r'\1', s)                           # 其余：只留文字
    s = re.sub(r'\s*<article class="post-row"[^>]*>(?:(?!</article>).)*?docs\.corp\.kuaishou\.com.*?</article>', '', s, flags=re.S)
    p.write_text(s)
EOF

# 4. 有改动才提交推送
cd "$TMP/repo"
git add -A
if git diff --cached --quiet; then echo '没有改动，跳过'; exit 0; fi
git -c user.name="$USER" -c user.email="$ID+$USER@users.noreply.github.com" commit -qm "Update homepage

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git_ push -q origin HEAD:main
echo "已推送 → https://$REPO （GitHub 构建约 1 分钟）"

