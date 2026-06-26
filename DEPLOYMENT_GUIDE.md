# 部署指引 — 前后端一体化部署

## 项目结构

```
项目目录/
├── server.js          # Node.js 后端（托管前端 + AI 代理）
├── package.json       # 后端依赖配置
├── .env               # 环境变量（DEEPSEEK_KEY 等，不要提交到 Git）
├── .env.example       # 环境变量示例
├── public/
│   └── index.html     # 前端页面（学员使用的微课页面）
└── README.md          # 项目说明
```

## 一键部署到 Railway（推荐）

Railway 是最简单的部署平台，有免费额度，支持 Node.js 项目自动检测。

### 步骤：

1. **注册 Railway**：https://railway.app （用 GitHub 登录）

2. **创建新项目**：
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 授权并选择你的仓库

3. **配置环境变量**：
   - 在项目 Dashboard 点击 "Variables"
   - 添加变量：`DEEPSEEK_KEY=sk-你的Key`
   - （可选）`PORT=3001`（Railway 会自动分配，不需要设置）

4. **部署**：
   - Railway 会自动检测 `package.json` 和 `start` 脚本
   - 自动安装依赖并启动服务
   - 部署完成后会给出一个 `*.railway.app` 的域名

5. **访问**：
   - 打开 `https://你的项目.railway.app`
   - 学员即可使用微课，AI 对练功能自动可用

---

## 部署到 Render（免费）

Render 也提供免费额度，适合小型项目。

### 步骤：

1. **注册 Render**：https://render.com
2. **创建 Web Service**：
   - 连接 GitHub 仓库
   - 选择 Node.js 环境
   - Build Command: `npm install`
   - Start Command: `node server.js`
3. **配置环境变量**：
   - 在 Environment 中添加 `DEEPSEEK_KEY`
4. **部署**：
   - Render 会自动构建并部署
   - 部署完成后会给出 `*.onrender.com` 的域名

---

## 自建服务器部署

如果你有自己的服务器（阿里云/腾讯云/AWS），可以用 pm2 管理 Node.js 进程。

### 步骤：

1. **安装 Node.js**（建议 v18+）

2. **上传项目文件**：
   ```bash
   scp -r 项目目录 user@your-server:/var/www/wandou-roleplay/
   ```

3. **安装依赖**：
   ```bash
   cd /var/www/wandou-roleplay
   npm install --production
   ```

4. **配置环境变量**：
   ```bash
   # 创建 .env 文件
   cat > .env << EOF
   DEEPSEEK_KEY=sk-你的Key
   PORT=3001
   EOF
   ```

5. **用 pm2 启动服务**：
   ```bash
   npm install -g pm2
   pm2 start server.js --name wandou-roleplay
   pm2 save
   pm2 startup  # 开机自启
   ```

6. **配置 Nginx 反向代理**（可选，如果想用 80 端口）：
   ```nginx
   server {
       listen 80;
       server_name 你的域名.com;

       location / {
           proxy_pass http://localhost:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

7. **访问**：
   - `http://你的服务器IP:3001`
   - 或 `http://你的域名.com`（如果配置了 Nginx）

---

## 测试 AI 对练功能

部署完成后，测试 AI 对练功能是否正常：

1. **健康检查**：
   ```bash
   curl https://你的域名/health
   # 应该返回：{"ok":true,"service":"wandou-roleplay-ai-proxy","hasKey":true}
   ```

2. **前端访问**：
   - 打开 `https://你的域名`
   - 进入"终极考核"环节
   - 输入一段话，看 AI 家长是否自然回应

3. **后端挂了的情况**：
   - 如果 DeepSeek Key 余额不足或服务异常
   - 前端会自动降级到预设话术
   - 学员仍能完成考核，只是 AI 不是真人效果

---

## 常见问题

### Q: 部署后 AI 对练功能不能用？
**A**: 检查：
1. `DEEPSEEK_KEY` 环境变量是否正确配置
2. 访问 `/health` 端点，看 `hasKey` 是否为 `true`
3. 检查 DeepSeek 账户余额是否充足

### Q: 学员访问速度慢？
**A**: 
- Railway/Render 的免费版会在闲置后休眠，第一次访问可能慢
- 升级到付费版可避免休眠
- 自建服务器无此问题

### Q: 如何更新部署？
**A**:
- Railway/Render：推送代码到 GitHub，自动重新部署
- 自建服务器：`pm2 restart wandou-roleplay`

---

## 安全提示

1. **不要提交 `.env` 到 Git**：
   - 已包含在 `.gitignore` 中
   - 部署时通过平台的环境变量配置

2. **限制 API 调用频率**：
   - `server.js` 内置限频（默认每 IP 每小时 200 次）
   - 可通过环境变量 `RATE_LIMIT_MAX` 调整

3. **监控 DeepSeek 费用**：
   - 定期登录 DeepSeek 控制台查看费用
   - 如发现异常调用，检查日志或更换 Key

---

## 项目修改记录

### 2026-06-26：前后端一体化改造
- 前端 `BACKEND_URL` 改为相对路径 `/api/chat`
- `healthUrl` 改为相对路径 `/health`
- `index.html` 移到 `public/` 目录
- `server.js` 托管前端 + 后端 API，一键部署
- AI 对练功能部署后完全可用，学员无需配置任何东西
