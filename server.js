/**
 * 豌豆益智 终极考核 AI 代理服务
 *
 * 职责：
 *   - 学员浏览器 → 本服务 → DeepSeek API
 *   - 公司统一持有 API Key，学员无感
 *   - 内置限频、防滥用、错误降级
 *
 * 部署：
 *   1. 在公司任意服务器/平台运行：node server.js
 *   2. 配置环境变量 DEEPSEEK_KEY=你的Key
 *   3. 开放端口 3000
 *   4. 前端把 endpoint 改为 https://你的域名/api/chat
 *
 * 平台推荐（最简单）：
 *   - Railway.app：免费额度够用，一键部署
 *   - Vercel：serverless 部署
 *   - 自建：node + pm2 + nginx
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());                      // 允许跨域
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));   // 可选：托管前端

// ============================================================
// 简易限频（按 IP，每 IP 每小时 100 次）
// ============================================================
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 100;          // 每小时最多 100 次
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + RATE_LIMIT_WINDOW;
  }
  if (record.count >= RATE_LIMIT_MAX) {
    return { ok: false, resetAt: record.resetAt };
  }
  record.count++;
  rateLimitMap.set(ip, record);
  return { ok: true, remaining: RATE_LIMIT_MAX - record.count };
}

// 每小时清理过期记录
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) rateLimitMap.delete(ip);
  }
}, 10 * 60 * 1000);

// ============================================================
// 健康检查
// ============================================================
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'wandou-roleplay-ai-proxy',
    hasKey: !!process.env.DEEPSEEK_KEY,
    time: new Date().toISOString()
  });
});

// ============================================================
// 核心：转发到 DeepSeek
// ============================================================
app.post('/api/chat', async (req, res) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress;

  // 1. 限频检查
  const limit = checkRateLimit(ip);
  if (!limit.ok) {
    return res.status(429).json({
      error: 'rate_limited',
      message: '请求过于频繁，请稍后再试',
      resetAt: new Date(limit.resetAt).toISOString()
    });
  }

  // 2. 校验请求体
  const { messages, model, max_tokens, temperature } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'invalid_request', message: 'messages 必填且为数组' });
  }

  // 3. 检查 API Key
  const apiKey = process.env.DEEPSEEK_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'no_api_key',
      message: '服务端未配置 DEEPSEEK_KEY，请联系管理员'
    });
  }

  // 4. 转发到 DeepSeek
  try {
    const upstream = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages,
        max_tokens: max_tokens || 150,
        temperature: temperature || 0.8,
        stream: false
      })
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); }
    catch (e) { data = { error: { message: text } }; }

    if (!upstream.ok) {
      console.error(`[DeepSeek Error] ${upstream.status}:`, data);
      return res.status(upstream.status).json({
        error: 'upstream_error',
        message: data.error?.message || 'AI 服务异常',
        upstream: data
      });
    }

    // 5. 返回结果给学员浏览器
    res.json(data);
  } catch (err) {
    console.error('[Proxy Error]', err);
    res.status(500).json({
      error: 'proxy_error',
      message: '代理服务异常：' + err.message
    });
  }
});

// ============================================================
// 启动
// ============================================================
app.listen(PORT, () => {
  console.log(`\n🥜 豌豆益智 AI 代理服务已启动`);
  console.log(`   端口: ${PORT}`);
  console.log(`   API Key 配置: ${process.env.DEEPSEEK_KEY ? '✓ 已配置' : '✗ 未配置（请设置 DEEPSEEK_KEY 环境变量）'}`);
  console.log(`   健康检查: http://localhost:${PORT}/health\n`);
});
