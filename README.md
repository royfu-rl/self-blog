# self-blog

个人主页，纯静态，无构建步骤。版式参考 wenhaochai.com，内容、封面和代码都是自己的。

## 目录

```
index.html            Home：简介、Background、Experience 小窗、Research、Contact
experience.html       Experience：滚动驱动的粒子页
research.html         Research：论文列表
blog.html             Blog：飞书技术博客列表（生成文件，别手改）
assets/
  css/site.css        全站样式
  js/site.js          共用的顶栏和页脚
  js/swarm.js         粒子引擎和五个场景
  js/experience.js    滚动驱动粒子（experience.html）
  js/film.js          定时驱动粒子（首页小窗）
  js/blog.js          Blog 的分类筛选（状态存在 URL hash，如 blog.html#algorithm/agentic-rl）
  fonts/              Hanken Grotesk、JetBrains Mono（自托管）
  img/avatar.webp     占位头像
  img/logos/          机构 logo
  img/research/       论文封面，由脚本生成
scripts/
  make_covers.py      生成论文封面和占位头像
```

## 怎么改

- 加一篇论文
  - `scripts/make_covers.py`：写一个封面函数，加进 `covers`，然后运行
    `python3 scripts/make_covers.py`
  - `research.html`：加一个 `.exp-row`
  - `index.html`：在 Research 区加一个 `.post-card`
- 加一条经历
  - `index.html`：在 Background 的 `.log` 里加一行
- 换头像
  - 照片放到 `assets/img/avatar.jpg`
  - 改 `index.html` 里 `.avatar-frame` 的 `src`
- 加一个 Experience 章节
  - `swarm.js`：写场景函数 `(i, t) => put(...)`，加进 `ALL`
  - `experience.js`：`order` 加一项
  - `experience.html`：加 `<article class="chapter">`、`.rail` 链接、`.exp-anchor`
  - `site.css`：`.exp.live` 的高度系数和 `.exp-anchor` 位置各加一项
  - 首页小窗要同步的话，改 `film.js` 的 `order` 和 `index.html` 的 `.film-bar`

- 改 Blog 列表
  - 数据和脚本都在 `../interview/blog/`（见那里的 README）
  - 在 `feishu/readme.md` 的「主页」列标 `1` → `build_select.py` → `build_site_blog.py`
  - 会重写 `blog.html`；一句话简介和 Paper / Code 链接在 `feishu/blurbs.json`，分类、标签、改名规则在 `build_site_blog.py` 顶部

## 博客链接

- 本地博客用相对路径，依赖 `self-blog` 和它们是同级目录
  - `../kat-coder-rl-blog/index.html`
  - `../critic-blog/index.html`
  - `../final-visual-code-blog/output/total.html`
- 单独部署主页时，把这三个链接换成线上地址

## 降级

没有 WebGL，或系统开了"减少动态效果"时，Experience 退化成静态的纵向列表，内容和链接不变。

