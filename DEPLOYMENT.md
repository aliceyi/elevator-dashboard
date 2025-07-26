# 电梯仪表盘 - 部署指南

您的电梯仪表盘应用已经准备好部署到公网！以下是几种部署方式：

## 🚀 方式一：Vercel 部署（推荐）

### 1. 在线部署（最简单）
1. 访问 [vercel.com](https://vercel.com)
2. 使用 GitHub 账号登录
3. 点击 "New Project"
4. 导入您的 GitHub 仓库
5. Vercel 会自动检测配置并部署

### 2. 命令行部署
```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel
```

## 🌐 方式二：Netlify 部署

### 1. 在线部署
1. 访问 [netlify.com](https://netlify.com)
2. 点击 "New site from Git"
3. 连接您的 GitHub 仓库
4. 构建设置会自动从 `netlify.toml` 读取
5. 点击 "Deploy site"

### 2. 拖拽部署
```bash
# 本地构建
yarn build

# 将 dist 文件夹拖拽到 Netlify 部署页面
```

## 📁 方式三：GitHub Pages

1. 将代码推送到 GitHub
2. 在仓库设置中启用 GitHub Pages
3. 选择 "GitHub Actions" 作为源
4. 创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'yarn'
    - run: yarn install
    - run: yarn build
    - uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

## 🔧 本地构建测试

```bash
# 构建生产版本
yarn build

# 预览构建结果（可选）
npx serve dist
```

## 📝 注意事项

1. **域名配置**：部署后您会获得一个免费域名，也可以绑定自定义域名
2. **HTTPS**：所有平台都自动提供 HTTPS
3. **自动部署**：推送代码到 main 分支会自动触发重新部署
4. **环境变量**：如需要可在平台设置中添加环境变量

## 🎉 部署完成后

- Vercel: `https://your-project.vercel.app`
- Netlify: `https://your-project.netlify.app`
- GitHub Pages: `https://username.github.io/repository-name`

您的电梯仪表盘将在几分钟内在全球可访问！