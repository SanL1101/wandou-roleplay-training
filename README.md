# 豌豆益智 终极考核 AI 代理服务

学员做 Role-play 时，对手戏的"家长"会真正"听懂"学员说了什么并做出个性化回应（由 DeepSeek 大模型驱动）。**学员无需自己掏钱买 API Key、无需任何配置。**

## 架构

```
学员浏览器  ──POST /api/chat──>  本服务 (Node.js)  ──POST──>  DeepSeek API
  (无 Key)                       (公司持有统一 Key)            (公司付费)
```

## 文件

- `server.js` — 后端代理服务（Node.js + Express）
- `package.json` — 依赖
- `.env.example` — 环境变量模板
- `index.html` — 改造后的前端（已移除学员 API Key 输入面板）

## 部署步骤

### A. 一键部署到 Railway.app（推荐 ⭐ 5 分钟）

1. 把这 3 个文件 push 到 GitHub：
   ```
   server.js
   package.json
   .env.example
   ```

2. 打开 https://railway.app → New Project → Deploy from GitHub Repo

3. 选你的仓库，Railway 会自动识别 `package.json` 并安装

4. 添加环境变量：
   - 进入 Service → Variables → New Variable
   - Key: `DEEPSEEK_KEY`  Value: `sk-xxxxx你的Key`

5. 部署完成后 Railway 会给你一个 URL，如 `https://xxx.railway.app`

6. 打开 `index.html` 改一行：
   ```js
   const BACKEND_URL = 'https://xxx.railway.app/api/chat';
   ```

7. 把 `index.html` 部署到任意静态网站（Vercel / Netlify / 你的服务器）

### B. 部署到 Vercel（也很快）

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 部署
cd 此目录
vercel --prod

# 3. 在 Vercel Dashboard 设置环境变量 DEEPSEEK_KEY

# 4. 会得到 https://your-app.vercel.app，配置同上
```

### C. 自建服务器（完全控制）

```bash
# 1. 复制 3 个文件到服务器
scp server.js package.json .env.example user@server:/app/

# 2. SSH 到服务器
ssh user@server
cd /app
cp .env.example .env
nano .env   # 填入 DEEPSEEK_KEY
npm install
npm install -g pm2

# 3. 用 PM2 守护
pm2 start server.js --name wandou-ai
pm2 save
pm2 startup

# 4. 配 nginx 反代（可选）
server {
  listen 80;
  server_name ai.your-domain.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

## 配置项

### 后端（环境变量）

| 变量 | 必填 | 说明 |
|---|---|---|
| `DEEPSEEK_KEY` | ✓ | DeepSeek API Key，在 https://platform.deepseek.com/api_keys 申请 |
| `PORT` | ✗ | 监听端口，默认 3000 |

### 前端（`index.html` 第 1158 行附近）

```js
const BACKEND_URL = 'https://你的后端地址/api/chat';
```

## 限流策略

- **后端**：每 IP 每小时 100 次（可改 `RATE_LIMIT_MAX`）
- **前端**：每浏览器每小时 50 次（防学员脚本刷接口）

## 成本估算

DeepSeek 价格（截至 2026-06）：
- 输入：¥1 / 百万 tokens
- 输出：¥2 / 百万 tokens

一次完整 8 轮练习大约消耗：
- 输入 ~2500 tokens
- 输出 ~800 tokens
- 成本约 **¥0.004 / 次**

**1000 学员每人练习 3 次 = ¥12**，非常便宜。

## 失败降级

- 后端不可用 → 自动用预设话术
- DeepSeek 限流/余额不足 → 自动用预设话术
- 网络超时 → 自动用预设话术

**学员体验不会中断**。

## 健康检查

部署后访问 `https://你的后端/health`：

```json
{
  "ok": true,
  "service": "wandou-roleplay-ai-proxy",
  "hasKey": true,
  "time": "2026-06-26T16:50:00.000Z"
}
```

`hasKey: true` 表示 Key 配置成功。

## 监控建议

- 简单：看 DeepSeek 后台用量
- 推荐：用 Sentry 之类的工具给后端加 error 监控
- 高级：把 `/api/chat` 的调用日志落到数据库，用于分析学员练习数据

## 常见问题

**Q: 学员会不会绕过前端直接打我们后端？**
A: 后端只接受 `/api/chat` POST，限流 100次/小时/IP。恶意刷的话可以加 Cloudflare 防护。

**Q: 学员数据安全吗？**
A: 学员的输入会发给 DeepSeek，但 DeepSeek 不会用于训练（默认条款）。建议在公司合同中确认。

**Q: 可以换其他大模型吗？**
A: 可以。改 `server.js` 第 73 行的 URL 和 model 字段即可。OpenAI、Claude、Qwen 都支持 OpenAI 兼容协议。

**Q: 学员完全没网怎么办？**
A: 仍然可以用预设话术（每轮有 `parentReply` 兜底），只是"家长"不会智能回应。
